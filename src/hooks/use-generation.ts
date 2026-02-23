'use client';

import { useCallback, useRef, useState } from 'react';
import type { GenerationConfig } from '@/types';
import { useAppStore } from '@/store/app-store';
import { uid } from '@/lib/utils';
import { generateImage, getStoredToken } from '@/lib/hf-inference';
import { MANGA_STYLE_PROMPTS } from '@/lib/constants';
import { useLocalGeneration } from './use-local-generation';

/**
 * Facade hook — delegates to either local (Web Worker) or API (HuggingFace)
 * generation depending on the current `generationMode` in the store.
 *
 * Local mode: maximum privacy, runs 100 % in-browser after initial download.
 * API mode:   no downloads needed, sends prompts to HuggingFace servers.
 */
export function useGeneration() {
  // ---- Local generation (worker-based) ----
  const local = useLocalGeneration();

  // ---- API generation state ----
  const abortRef = useRef<AbortController | null>(null);
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  const {
    generationMode,
    selectedModel,
    generationConfig,
    generationStatus,
    setGenerationStatus,
    setIsGenerating,
    addJob,
    updateJob,
    updatePanelImage,
  } = useAppStore();

  const apiLog = useCallback((level: string, message: string) => {
    setApiLogs((prev) => [...prev, `[${level.toUpperCase()}] ${message}`]);
  }, []);

  // ============================================================
  // API-mode generation (unchanged from current implementation)
  // ============================================================

  const apiGenerateForPanel = useCallback(
    async (
      panelId: string,
      prompt: string,
      negativePrompt?: string,
      configOverrides?: Partial<GenerationConfig>,
    ): Promise<string | null> => {
      const config: GenerationConfig = { ...generationConfig, ...configOverrides };
      const jobId = uid();

      const stylePrompts = MANGA_STYLE_PROMPTS[config.style];
      const fullPrompt = `${stylePrompts.prefix} ${prompt} ${stylePrompts.suffix}`;
      const fullNegative = [
        negativePrompt ?? config.negativePrompt ?? '',
        stylePrompts.negative,
      ]
        .filter(Boolean)
        .join(', ');

      addJob({
        id: jobId,
        panelId,
        prompt: fullPrompt,
        config,
        status: 'running',
        progress: 0,
      });

      try {
        const result = await generateImage(
          {
            modelId: selectedModel,
            prompt: fullPrompt,
            negativePrompt: fullNegative,
            width: config.width,
            height: config.height,
            guidanceScale: config.guidanceScale,
            steps: config.steps,
            seed: config.seed,
            token: getStoredToken() || undefined,
            signal: abortRef.current?.signal,
          },
          (status) => {
            setGenerationStatus({
              ...useAppStore.getState().generationStatus,
              currentStatus: status,
            });
          },
        );

        updateJob(jobId, {
          status: 'complete',
          progress: 100,
          result: {
            panelId,
            imageDataUrl: result.imageDataUrl,
            width: config.width,
            height: config.height,
            prompt: fullPrompt,
            seed: config.seed ?? -1,
            timestamp: Date.now(),
          },
        });

        updatePanelImage(panelId, result.imageDataUrl);
        apiLog('info', `Panel ${panelId} generated (API)`);
        return jobId;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          updateJob(jobId, { status: 'cancelled' });
          return null;
        }
        const errMsg = error instanceof Error ? error.message : String(error);
        updateJob(jobId, { status: 'error', error: errMsg });
        apiLog('error', `Panel ${panelId} failed: ${errMsg}`);
        return null;
      }
    },
    [selectedModel, generationConfig, addJob, updateJob, updatePanelImage, setGenerationStatus, apiLog],
  );

  const apiGenerateAllPanels = useCallback(async () => {
    const panels = useAppStore.getState().panels;
    if (panels.length === 0) return;

    abortRef.current = new AbortController();
    setIsGenerating(true);
    setGenerationStatus({
      status: 'generating',
      currentPanel: 0,
      totalPanels: panels.length,
      currentStatus: 'Starting API generation...',
    });

    apiLog('info', `Generating ${panels.length} panels via API...`);

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      if (abortRef.current?.signal.aborted) break;

      setGenerationStatus({
        status: 'generating',
        currentPanel: i + 1,
        totalPanels: panels.length,
        currentStatus: `Generating panel ${i + 1} of ${panels.length}...`,
      });

      await apiGenerateForPanel(panel.id, panel.prompt);
    }

    setIsGenerating(false);
    setGenerationStatus({
      status: 'idle',
      currentPanel: panels.length,
      totalPanels: panels.length,
      currentStatus: 'Generation complete',
    });
    apiLog('info', 'All panels processed (API)');
  }, [apiGenerateForPanel, setIsGenerating, setGenerationStatus, apiLog]);

  const apiCancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const jobs = useAppStore.getState().jobs;
    for (const job of jobs) {
      if (job.status === 'queued' || job.status === 'running') {
        updateJob(job.id, { status: 'cancelled' });
      }
    }

    setIsGenerating(false);
    setGenerationStatus({
      status: 'idle',
      currentPanel: 0,
      totalPanels: 0,
      currentStatus: 'Cancelled',
    });
    apiLog('info', 'API generation cancelled');
  }, [updateJob, setIsGenerating, setGenerationStatus, apiLog]);

  // ============================================================
  // Facade — delegate based on generationMode
  // ============================================================

  const isLocal = generationMode === 'local';

  const generateForPanel = useCallback(
    (panelId: string, prompt: string, negativePrompt?: string, configOverrides?: Partial<GenerationConfig>) => {
      return isLocal
        ? local.generateForPanel(panelId, prompt, negativePrompt, configOverrides)
        : apiGenerateForPanel(panelId, prompt, negativePrompt, configOverrides);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLocal, local, apiGenerateForPanel],
  );

  const generateAllPanels = useCallback(() => {
    return isLocal ? local.generateAllPanels() : apiGenerateAllPanels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, local, apiGenerateAllPanels]);

  const cancelGeneration = useCallback(() => {
    return isLocal ? local.cancelGeneration() : apiCancelGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, local, apiCancelGeneration]);

  return {
    // Shared
    generateForPanel,
    generateAllPanels,
    cancelGeneration,
    logs: isLocal ? local.logs : apiLogs,
    generationStatus,

    // Local-specific (exposed for model-loader)
    initWorker: local.initWorker,
    destroyWorker: local.destroyWorker,
    isWorkerReady: local.isWorkerReady,
    isModelReady: local.isModelReady,
    loadModel: local.loadModel,
    modelStatus: local.modelStatus,
  };
}
