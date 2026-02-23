'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationConfig, ModelLoadProgress, WorkerInMessage, WorkerOutMessage } from '@/types';
import { useAppStore } from '@/store/app-store';
import { uid } from '@/lib/utils';

/**
 * Hook for managing the SD inference worker.
 * Handles model loading, image generation, and job tracking.
 */
export function useGeneration() {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const {
    selectedModel,
    generationConfig,
    webgpuStatus,
    modelStatus,
    setModelStatus,
    setIsGenerating,
    addJob,
    updateJob,
    updatePanelImage,
  } = useAppStore();

  // ---- Initialize Worker ----
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/sd-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      handleWorkerMessage(event.data);
    };

    worker.onerror = (error) => {
      console.error('[Worker Error]', error);
      setLogs((prev) => [...prev, `[ERROR] Worker: ${error.message}`]);
    };

    workerRef.current = worker;

    // Send init message
    sendToWorker({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Message Handler ----
  const handleWorkerMessage = useCallback(
    (msg: WorkerOutMessage) => {
      switch (msg.type) {
        case 'init-complete':
          setIsWorkerReady(true);
          setLogs((prev) => [...prev, '[INFO] Worker initialized']);
          break;

        case 'model-progress':
          setModelStatus(msg.progress);
          break;

        case 'model-ready':
          setModelStatus({
            status: 'ready',
            progress: 100,
            loadedFiles: 4,
            totalFiles: 4,
          });
          setLogs((prev) => [...prev, '[INFO] Model ready']);
          break;

        case 'generation-progress':
          updateJob(msg.jobId, {
            status: 'running',
            progress: Math.round((msg.step / msg.totalSteps) * 100),
          });
          break;

        case 'generation-complete':
          updateJob(msg.jobId, {
            status: 'complete',
            progress: 100,
            result: {
              panelId: '', // Will be set from the job
              imageDataUrl: msg.imageDataUrl,
              width: msg.width,
              height: msg.height,
              prompt: '',
              seed: msg.seed,
              timestamp: Date.now(),
            },
          });

          // Find the job and update the panel image
          const job = useAppStore.getState().jobs.find((j) => j.id === msg.jobId);
          if (job) {
            updatePanelImage(job.panelId, msg.imageDataUrl);
          }

          // Check if all jobs are done
          const allDone = useAppStore
            .getState()
            .jobs.every(
              (j) => j.id === msg.jobId || j.status === 'complete' || j.status === 'error',
            );
          if (allDone) {
            setIsGenerating(false);
          }
          break;

        case 'error':
          console.error('[Worker]', msg.message);
          setLogs((prev) => [...prev, `[ERROR] ${msg.message}`]);
          if (msg.jobId) {
            updateJob(msg.jobId, {
              status: 'error',
              error: msg.message,
            });
          }
          break;

        case 'log':
          setLogs((prev) => [...prev, `[${msg.level.toUpperCase()}] ${msg.message}`]);
          break;
      }
    },
    [setModelStatus, updateJob, updatePanelImage, setIsGenerating],
  );

  // ---- Send to Worker ----
  const sendToWorker = useCallback((msg: WorkerInMessage) => {
    workerRef.current?.postMessage(msg);
  }, []);

  // ---- Load Model ----
  const loadModel = useCallback(
    (modelId?: string) => {
      const id = modelId ?? selectedModel;
      const device = webgpuStatus.available ? 'webgpu' : 'wasm';

      setModelStatus({
        status: 'checking',
        progress: 0,
        loadedFiles: 0,
        totalFiles: 4,
      });

      sendToWorker({
        type: 'load-model',
        modelId: id,
        quantization: 'fp16',
        device,
      });
    },
    [selectedModel, webgpuStatus.available, setModelStatus, sendToWorker],
  );

  // ---- Generate Image for a Panel ----
  const generateForPanel = useCallback(
    (panelId: string, prompt: string, negativePrompt?: string, configOverrides?: Partial<GenerationConfig>) => {
      if (modelStatus.status !== 'ready') {
        console.warn('Model not ready');
        return null;
      }

      const jobId = uid();
      const config: GenerationConfig = { ...generationConfig, ...configOverrides };

      // Create job
      const job = {
        id: jobId,
        panelId,
        prompt,
        config,
        status: 'queued' as const,
        progress: 0,
      };

      addJob(job);

      // Send to worker
      sendToWorker({
        type: 'generate',
        jobId,
        prompt,
        negativePrompt,
        config,
      });

      return jobId;
    },
    [modelStatus.status, generationConfig, addJob, sendToWorker],
  );

  // ---- Generate All Panels ----
  const generateAllPanels = useCallback(() => {
    const panels = useAppStore.getState().panels;
    if (panels.length === 0) return;

    setIsGenerating(true);

    // Generate sequentially (one at a time to manage GPU memory)
    for (const panel of panels) {
      generateForPanel(panel.id, panel.prompt);
    }
  }, [generateForPanel, setIsGenerating]);

  // ---- Cancel Generation ----
  const cancelGeneration = useCallback(
    (jobId?: string) => {
      if (jobId) {
        sendToWorker({ type: 'cancel', jobId });
        updateJob(jobId, { status: 'cancelled' });
      } else {
        // Cancel all running jobs
        const jobs = useAppStore.getState().jobs;
        for (const job of jobs) {
          if (job.status === 'queued' || job.status === 'running') {
            sendToWorker({ type: 'cancel', jobId: job.id });
            updateJob(job.id, { status: 'cancelled' });
          }
        }
      }
      setIsGenerating(false);
    },
    [sendToWorker, updateJob, setIsGenerating],
  );

  return {
    isWorkerReady,
    loadModel,
    generateForPanel,
    generateAllPanels,
    cancelGeneration,
    logs,
    isModelReady: modelStatus.status === 'ready',
  };
}
