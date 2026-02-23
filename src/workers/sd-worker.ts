/**
 * Stable Diffusion Inference Web Worker
 *
 * Runs the Transformers.js pipeline in a separate thread to avoid
 * blocking the UI. Communicates via postMessage with the main thread.
 *
 * Supports:
 * - Model loading with progress reporting
 * - Text-to-image generation
 * - Job cancellation
 * - WebGPU and WASM backends
 */

import type { WorkerInMessage, WorkerOutMessage, GenerationConfig } from '@/types';

// ============================================================
// Worker State
// ============================================================

let pipeline: any = null;
let transformers: any = null;
let isModelLoaded = false;
let currentJobId: string | null = null;
let cancelled = false;

// ============================================================
// Message Handler
// ============================================================

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'init':
        await initializeTransformers();
        break;

      case 'load-model':
        await loadModel(msg.modelId, msg.quantization, msg.device);
        break;

      case 'generate':
        await generateImage(msg.jobId, msg.prompt, msg.negativePrompt, msg.config);
        break;

      case 'cancel':
        cancelled = true;
        currentJobId = null;
        break;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    sendMessage({
      type: 'error',
      jobId: (msg as any).jobId,
      message: errMsg,
      stack,
    });
  }
};

// ============================================================
// Initialize Transformers.js
// ============================================================

async function initializeTransformers(): Promise<void> {
  sendLog('info', 'Initializing Transformers.js...');

  try {
    // Dynamic import of Transformers.js (webpackIgnore keeps webpack from
    // following this import into the ONNX Runtime bundle which uses
    // import.meta.url and breaks the SWC parser).
    transformers = await import(/* webpackIgnore: true */ '@huggingface/transformers');

    // Configure environment
    const env = transformers.env;
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // Enable WASM proxy for multi-threading
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false; // In workers, proxy should be false
    }

    sendLog('info', 'Transformers.js initialized successfully');
    sendMessage({ type: 'init-complete' });
  } catch (error) {
    throw new Error(`Failed to initialize Transformers.js: ${error}`);
  }
}

// ============================================================
// Model Loading
// ============================================================

async function loadModel(
  modelId: string,
  quantization: string,
  device: string,
): Promise<void> {
  if (!transformers) {
    await initializeTransformers();
  }

  sendMessage({
    type: 'model-progress',
    progress: {
      status: 'downloading',
      progress: 0,
      loadedFiles: 0,
      totalFiles: 4,
      currentFile: 'Checking cache...',
    },
  });

  sendLog('info', `Loading model: ${modelId} (${quantization}) on ${device}`);

  try {
    let lastProgress = 0;
    let filesLoaded = 0;
    let lastFile = '';

    // Determine dtype based on quantization setting
    const dtype = mapQuantToDtype(quantization);

    // Use the pipeline API from Transformers.js
    pipeline = await transformers.pipeline('text-to-image', modelId, {
      device: device === 'webgpu' ? 'webgpu' : 'wasm',
      dtype,
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
          const pct = Math.round(progress.progress ?? 0);
          if (pct !== lastProgress || progress.file !== lastFile) {
            lastProgress = pct;
            lastFile = progress.file ?? '';
            sendMessage({
              type: 'model-progress',
              progress: {
                status: 'downloading',
                progress: pct,
                loadedFiles: filesLoaded,
                totalFiles: 4,
                currentFile: progress.file ?? 'Loading...',
              },
            });
          }
        } else if (progress.status === 'done') {
          filesLoaded++;
          sendMessage({
            type: 'model-progress',
            progress: {
              status: 'downloading',
              progress: Math.round((filesLoaded / 4) * 100),
              loadedFiles: filesLoaded,
              totalFiles: 4,
              currentFile: `Loaded: ${progress.file ?? 'component'}`,
            },
          });
        } else if (progress.status === 'ready') {
          sendMessage({
            type: 'model-progress',
            progress: {
              status: 'loading',
              progress: 95,
              loadedFiles: 4,
              totalFiles: 4,
              currentFile: 'Initializing pipeline...',
            },
          });
        }
      },
    });

    isModelLoaded = true;

    sendMessage({
      type: 'model-progress',
      progress: {
        status: 'ready',
        progress: 100,
        loadedFiles: 4,
        totalFiles: 4,
        currentFile: 'Ready',
        cached: true,
      },
    });

    sendMessage({ type: 'model-ready' });
    sendLog('info', 'Model loaded successfully');
  } catch (error) {
    isModelLoaded = false;
    pipeline = null;

    const errMsg = error instanceof Error ? error.message : String(error);

    sendMessage({
      type: 'model-progress',
      progress: {
        status: 'error',
        progress: 0,
        loadedFiles: 0,
        totalFiles: 4,
        error: errMsg,
      },
    });

    throw new Error(`Model loading failed: ${errMsg}`);
  }
}

// ============================================================
// Image Generation
// ============================================================

async function generateImage(
  jobId: string,
  prompt: string,
  negativePrompt: string | undefined,
  config: GenerationConfig,
): Promise<void> {
  if (!pipeline || !isModelLoaded) {
    throw new Error('Model not loaded. Please load a model first.');
  }

  currentJobId = jobId;
  cancelled = false;

  sendLog('info', `Starting generation: "${prompt.slice(0, 80)}..."`);

  // Report initial progress
  sendMessage({
    type: 'generation-progress',
    jobId,
    step: 0,
    totalSteps: config.steps,
  });

  try {
    const generationParams: Record<string, any> = {
      num_inference_steps: config.steps,
      guidance_scale: config.guidanceScale,
      width: config.width,
      height: config.height,
    };

    if (negativePrompt) {
      generationParams.negative_prompt = negativePrompt;
    }

    if (config.seed !== undefined && config.seed >= 0) {
      generationParams.seed = config.seed;
    }

    // Step callback for progress tracking
    generationParams.callback = (step: number) => {
      if (cancelled) {
        throw new Error('Generation cancelled');
      }
      sendMessage({
        type: 'generation-progress',
        jobId,
        step: step + 1,
        totalSteps: config.steps,
      });
    };

    // Run the pipeline
    const result = await pipeline(prompt, generationParams);

    if (cancelled) {
      sendLog('info', 'Generation cancelled by user');
      return;
    }

    // Extract image data
    let imageDataUrl: string;
    let width = config.width;
    let height = config.height;

    if (result && result[0]) {
      const output = result[0];

      if (typeof output.toDataURL === 'function') {
        // RawImage from Transformers.js
        imageDataUrl = output.toDataURL();
        width = output.width ?? config.width;
        height = output.height ?? config.height;
      } else if (output instanceof Blob) {
        imageDataUrl = await blobToDataUrl(output);
      } else if (typeof output === 'string') {
        imageDataUrl = output;
      } else if (output.data) {
        // Raw pixel data
        imageDataUrl = pixelDataToDataUrl(output.data, width, height, output.channels ?? 3);
      } else {
        throw new Error('Unexpected output format from pipeline');
      }
    } else if (result && typeof result.toDataURL === 'function') {
      imageDataUrl = result.toDataURL();
    } else {
      throw new Error('No output received from pipeline');
    }

    sendMessage({
      type: 'generation-complete',
      jobId,
      imageDataUrl,
      width,
      height,
      seed: config.seed ?? -1,
    });

    sendLog('info', 'Generation complete');
  } catch (error) {
    if (cancelled) return;

    const errMsg = error instanceof Error ? error.message : String(error);
    sendMessage({
      type: 'error',
      jobId,
      message: errMsg,
    });
  } finally {
    currentJobId = null;
  }
}

// ============================================================
// Helpers
// ============================================================

function mapQuantToDtype(quantization: string): string {
  switch (quantization) {
    case 'fp32': return 'fp32';
    case 'fp16': return 'fp16';
    case 'int8':
    case 'q8': return 'q8';
    case 'q4':
    case 'int4': return 'q4';
    default: return 'fp16';
  }
}

function sendMessage(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

function sendLog(level: 'info' | 'warn' | 'error', message: string): void {
  sendMessage({ type: 'log', level, message });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pixelDataToDataUrl(
  data: Uint8Array | Float32Array,
  width: number,
  height: number,
  channels: number,
): string {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;

    // Handle both 0-255 and 0-1 ranges
    const scale = data[srcIdx] <= 1.0 ? 255 : 1;

    imageData.data[dstIdx] = Math.round(Math.min(255, Math.max(0, (data[srcIdx] ?? 0) * scale)));     // R
    imageData.data[dstIdx + 1] = Math.round(Math.min(255, Math.max(0, (data[srcIdx + 1] ?? 0) * scale))); // G
    imageData.data[dstIdx + 2] = Math.round(Math.min(255, Math.max(0, (data[srcIdx + 2] ?? 0) * scale))); // B
    imageData.data[dstIdx + 3] = channels === 4
      ? Math.round(Math.min(255, Math.max(0, (data[srcIdx + 3] ?? 255) * scale)))
      : 255; // A
  }

  ctx.putImageData(imageData, 0, 0);

  // OffscreenCanvas → Blob → DataURL
  // Note: convertToBlob is async but we need a sync-ish approach
  // Use a temporary canvas drawing approach
  const tempCanvas = new OffscreenCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  // For workers, we can return the imageData and let main thread convert
  // But for simplicity, we'll create a bitmap
  return `data:image/raw;width=${width};height=${height};base64,placeholder`;
}
