'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationConfig, WorkerOutMessage, ModelLoadProgress } from '@/types';
import { useAppStore } from '@/store/app-store';
import { uid } from '@/lib/utils';
import { MANGA_STYLE_PROMPTS } from '@/lib/constants';

// ============================================================
// Local Generation Hook — Web Worker + Transformers.js
// ============================================================

/**
 * Manages the Stable Diffusion Web Worker for in-browser inference.
 * The worker loads Transformers.js from CDN and runs the model locally.
 * All data stays on the user's machine after the initial model download.
 */
export function useLocalGeneration() {
  const workerRef = useRef<Worker | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);

  // Pending generation callback (resolved when worker finishes generating)
  const pendingGenRef = useRef<{
    resolve: (dataUrl: string | null) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const {
    selectedModel,
    generationConfig,
    modelStatus,
    setModelStatus,
    setGenerationStatus,
    setIsGenerating,
    addJob,
    updateJob,
    updatePanelImage,
  } = useAppStore();

  const log = useCallback((level: string, message: string) => {
    setLogs((prev) => [...prev, `[${level.toUpperCase()}] ${message}`]);
  }, []);

  // ---- Worker lifecycle ----

  /** Create and initialize the Web Worker */
  const initWorker = useCallback(() => {
    if (workerRef.current) return; // Already created

    try {
      const worker = new Worker('/workers/sd-worker.mjs', { type: 'module' });

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;

        switch (msg.type) {
          case 'init-complete':
            setIsWorkerReady(true);
            log('info', 'Transformers.js engine ready');
            break;

          case 'model-progress':
            setModelStatus(msg.progress);
            break;

          case 'model-ready':
            setIsModelReady(true);
            setModelStatus({
              status: 'ready',
              progress: 100,
              message: `Model ${msg.modelId} ready`,
            });
            log('info', `Model loaded: ${msg.modelId}`);
            break;

          case 'generation-progress': {
            const pct = msg.totalSteps > 0
              ? Math.round((msg.step / msg.totalSteps) * 100)
              : 0;
            setGenerationStatus({
              status: 'generating',
              currentPanel: useAppStore.getState().generationStatus.currentPanel,
              totalPanels: useAppStore.getState().generationStatus.totalPanels,
              currentStatus: `Step ${msg.step}/${msg.totalSteps} (${pct}%)`,
            });
            break;
          }

          case 'generation-complete':
            pendingGenRef.current?.resolve(msg.imageDataUrl);
            pendingGenRef.current = null;
            break;

          case 'error':
            log('error', `Worker error [${msg.context ?? 'unknown'}]: ${msg.error}`);
            // If model loading failed, update status
            if (msg.context === 'load-model') {
              setModelStatus({
                status: 'error',
                progress: 0,
                error: msg.error,
                message: `Failed: ${msg.error}`,
              });
            }
            // If generation failed, reject the pending promise
            if (msg.context === 'generate') {
              pendingGenRef.current?.reject(new Error(msg.error));
              pendingGenRef.current = null;
            }
            break;

          case 'log':
            log(msg.level, msg.message);
            break;
        }
      };

      worker.onerror = (e) => {
        log('error', `Worker crashed: ${e.message}`);
        setModelStatus({
          status: 'error',
          progress: 0,
          error: e.message,
          message: 'Worker crashed unexpectedly',
        });
      };

      workerRef.current = worker;

      // Send init message to load Transformers.js
      worker.postMessage({ type: 'init' });
      log('info', 'Worker created, initializing...');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log('error', `Failed to create worker: ${msg}`);
      setModelStatus({
        status: 'error',
        progress: 0,
        error: msg,
        message: 'Failed to create Web Worker',
      });
    }
  }, [log, setModelStatus, setGenerationStatus]);

  /** Terminate the worker and clean up */
  const destroyWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsWorkerReady(false);
      setIsModelReady(false);
      pendingGenRef.current?.reject(new Error('Worker terminated'));
      pendingGenRef.current = null;
      log('info', 'Worker terminated');
    }
  }, [log]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // ---- Model loading ----

  /** Load the currently selected model in the worker */
  const loadModel = useCallback((modelId?: string) => {
    const worker = workerRef.current;
    if (!worker) {
      log('warn', 'Worker not initialized — call initWorker first');
      return;
    }

    const id = modelId ?? selectedModel;
    setIsModelReady(false);
    setModelStatus({
      status: 'downloading',
      progress: 0,
      message: `Preparing to download ${id}...`,
    });

    // Detect WebGPU availability
    const device = typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm';

    worker.postMessage({ type: 'load-model', modelId: id, device });
    log('info', `Requesting model load: ${id} (${device})`);
  }, [selectedModel, log, setModelStatus]);

  // ---- Generation ----

  /** Generate an image for a single panel (returns a Promise) */
  const generateForPanel = useCallback(
    async (
      panelId: string,
      prompt: string,
      negativePrompt?: string,
      configOverrides?: Partial<GenerationConfig>,
    ): Promise<string | null> => {
      const worker = workerRef.current;
      if (!worker || !isModelReady) {
        log('error', 'Cannot generate — model not ready');
        return null;
      }

      const config: GenerationConfig = { ...generationConfig, ...configOverrides };
      const jobId = uid();

      // Build full prompt with style modifiers
      const stylePrompts = MANGA_STYLE_PROMPTS[config.style];
      const fullPrompt = `${stylePrompts.prefix} ${prompt} ${stylePrompts.suffix}`;
      const fullNegative = [
        negativePrompt ?? config.negativePrompt ?? '',
        stylePrompts.negative,
      ]
        .filter(Boolean)
        .join(', ');

      // Create job entry
      addJob({
        id: jobId,
        panelId,
        prompt: fullPrompt,
        config,
        status: 'running',
        progress: 0,
      });

      try {
        // Wait for generation
        const imageDataUrl = await new Promise<string | null>((resolve, reject) => {
          pendingGenRef.current = { resolve, reject };
          worker.postMessage({
            type: 'generate',
            prompt: fullPrompt,
            negativePrompt: fullNegative,
            config: {
              steps: config.steps,
              guidanceScale: config.guidanceScale,
              width: config.width,
              height: config.height,
              seed: config.seed,
            },
          });
        });

        if (!imageDataUrl) {
          updateJob(jobId, { status: 'cancelled' });
          return null;
        }

        // Update job and panel
        updateJob(jobId, {
          status: 'complete',
          progress: 100,
          result: {
            panelId,
            imageDataUrl,
            width: config.width,
            height: config.height,
            prompt: fullPrompt,
            seed: config.seed ?? -1,
            timestamp: Date.now(),
          },
        });

        updatePanelImage(panelId, imageDataUrl);
        log('info', `Panel ${panelId} generated successfully`);
        return jobId;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        updateJob(jobId, { status: 'error', error: errMsg });
        log('error', `Panel ${panelId} failed: ${errMsg}`);
        return null;
      }
    },
    [isModelReady, generationConfig, addJob, updateJob, updatePanelImage, log],
  );

  /** Generate all panels sequentially */
  const generateAllPanels = useCallback(async () => {
    const panels = useAppStore.getState().panels;
    if (panels.length === 0) return;

    setIsGenerating(true);
    setGenerationStatus({
      status: 'generating',
      currentPanel: 0,
      totalPanels: panels.length,
      currentStatus: 'Starting local generation...',
    });

    log('info', `Generating ${panels.length} panels locally...`);

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];

      setGenerationStatus({
        status: 'generating',
        currentPanel: i + 1,
        totalPanels: panels.length,
        currentStatus: `Generating panel ${i + 1} of ${panels.length}...`,
      });

      await generateForPanel(panel.id, panel.prompt);
    }

    setIsGenerating(false);
    setGenerationStatus({
      status: 'idle',
      currentPanel: panels.length,
      totalPanels: panels.length,
      currentStatus: 'Generation complete',
    });

    log('info', 'All panels processed (local)');
  }, [generateForPanel, setIsGenerating, setGenerationStatus, log]);

  /** Cancel the current generation */
  const cancelGeneration = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' });
    pendingGenRef.current?.resolve(null);
    pendingGenRef.current = null;

    // Mark running jobs as cancelled
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

    log('info', 'Local generation cancelled');
  }, [updateJob, setIsGenerating, setGenerationStatus, log]);

  return {
    // Worker lifecycle
    initWorker,
    destroyWorker,
    isWorkerReady,
    isModelReady,

    // Model
    loadModel,
    modelStatus,

    // Generation
    generateForPanel,
    generateAllPanels,
    cancelGeneration,
    logs,
  };
}
