/**
 * Stable Diffusion Web Worker — runs entirely in the browser.
 *
 * Imports Transformers.js from CDN to avoid all webpack/Next.js bundling issues.
 * The model is downloaded once and cached in the browser (IndexedDB / Cache API).
 *
 * Message protocol:
 *   IN:  init | load-model | generate | cancel
 *   OUT: init-complete | model-progress | model-ready | generation-progress |
 *        generation-complete | error | log
 */

// ============================================================
// State
// ============================================================

let transformers = null;
let pipe = null;
let currentModelId = null;
let cancelled = false;

// ============================================================
// Helpers
// ============================================================

function send(message) {
  self.postMessage(message);
}

function log(level, message) {
  send({ type: 'log', level, message });
}

/**
 * Convert a RawImage (from Transformers.js) to a data URL using OffscreenCanvas.
 * Works in Worker context where HTMLCanvasElement is not available.
 */
async function imageToDataUrl(image) {
  // Try the built-in method first (works if transformers.js supports OffscreenCanvas)
  if (typeof image.toDataURL === 'function') {
    try {
      return await image.toDataURL('image/png');
    } catch {
      // Fall through to manual conversion
    }
  }

  // Fallback: manual conversion via OffscreenCanvas
  const width = image.width;
  const height = image.height;
  const channels = image.channels || 4;
  const src = image.data || image.rgba?.data;

  if (!src) {
    throw new Error('Cannot extract pixel data from generated image');
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const pixelData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixelData[i * 4]     = src[i * channels];       // R
    pixelData[i * 4 + 1] = src[i * channels + 1];   // G
    pixelData[i * 4 + 2] = src[i * channels + 2];   // B
    pixelData[i * 4 + 3] = channels === 4 ? src[i * channels + 3] : 255; // A
  }

  const imageData = new ImageData(pixelData, width, height);
  ctx.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to convert image blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

// ============================================================
// Message Handler
// ============================================================

self.onmessage = async (event) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'init':
        await handleInit();
        break;

      case 'load-model':
        await handleLoadModel(msg.modelId, msg.device);
        break;

      case 'generate':
        await handleGenerate(msg.prompt, msg.negativePrompt, msg.config);
        break;

      case 'cancel':
        cancelled = true;
        log('info', 'Cancellation requested');
        break;

      default:
        log('warn', `Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    send({ type: 'error', error: errorMessage, context: msg.type });
    log('error', `Error in ${msg.type}: ${errorMessage}`);
  }
};

// ============================================================
// Handlers
// ============================================================

/**
 * Initialize Transformers.js by importing it from CDN.
 * This avoids all webpack/Next.js bundling complexity.
 */
async function handleInit() {
  log('info', 'Initializing Transformers.js from CDN...');

  send({
    type: 'model-progress',
    progress: {
      status: 'initializing',
      progress: 0,
      message: 'Loading AI engine...',
    },
  });

  try {
    transformers = await import(
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3'
    );

    // Configure environment
    transformers.env.allowLocalModels = false;
    transformers.env.useBrowserCache = true;

    log('info', 'Transformers.js loaded successfully');
    send({ type: 'init-complete' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load Transformers.js: ${message}`);
  }
}

/**
 * Download and load a Stable Diffusion model.
 * Progress callbacks inform the main thread of download status.
 */
async function handleLoadModel(modelId, device) {
  if (!transformers) {
    throw new Error('Transformers.js not initialized. Send "init" first.');
  }

  // If already loaded, skip
  if (pipe && currentModelId === modelId) {
    log('info', `Model ${modelId} already loaded`);
    send({ type: 'model-ready', modelId });
    return;
  }

  log('info', `Loading model: ${modelId} (device: ${device || 'auto'})`);

  send({
    type: 'model-progress',
    progress: {
      status: 'downloading',
      progress: 0,
      message: `Downloading model: ${modelId}...`,
    },
  });

  // Progress callback for model download
  const progressCallback = (progressInfo) => {
    if (progressInfo.status === 'progress') {
      const pct = progressInfo.progress ?? 0;
      send({
        type: 'model-progress',
        progress: {
          status: 'downloading',
          progress: Math.round(pct),
          message: `Downloading: ${progressInfo.file || modelId}`,
          file: progressInfo.file,
          loaded: progressInfo.loaded,
          total: progressInfo.total,
        },
      });
    } else if (progressInfo.status === 'done') {
      log('info', `Downloaded: ${progressInfo.file || 'component'}`);
    } else if (progressInfo.status === 'initiate') {
      log('info', `Starting download: ${progressInfo.file || 'component'}`);
    }
  };

  try {
    // Determine device — prefer WebGPU, fall back to WASM
    const selectedDevice = device || (
      typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm'
    );

    log('info', `Using device: ${selectedDevice}`);

    send({
      type: 'model-progress',
      progress: {
        status: 'loading',
        progress: 50,
        message: `Loading model onto ${selectedDevice}...`,
      },
    });

    // Create the text-to-image pipeline
    pipe = await transformers.pipeline('text-to-image', modelId, {
      device: selectedDevice,
      dtype: selectedDevice === 'webgpu' ? 'fp32' : 'fp32',
      progress_callback: progressCallback,
    });

    currentModelId = modelId;

    send({
      type: 'model-progress',
      progress: {
        status: 'ready',
        progress: 100,
        message: 'Model loaded and ready',
      },
    });

    send({ type: 'model-ready', modelId });
    log('info', `Model ${modelId} ready on ${selectedDevice}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send({
      type: 'model-progress',
      progress: {
        status: 'error',
        progress: 0,
        message: `Failed to load model: ${message}`,
        error: message,
      },
    });
    throw new Error(`Model load failed: ${message}`);
  }
}

/**
 * Generate an image using the loaded pipeline.
 */
async function handleGenerate(prompt, negativePrompt, config) {
  if (!pipe) {
    throw new Error('No model loaded. Send "load-model" first.');
  }

  cancelled = false;

  const steps = config?.steps || 25;
  const guidanceScale = config?.guidanceScale || 7.5;
  const width = config?.width || 512;
  const height = config?.height || 512;

  log('info', `Generating: "${prompt.slice(0, 80)}..." (${steps} steps, ${width}x${height})`);

  send({
    type: 'generation-progress',
    step: 0,
    totalSteps: steps,
  });

  // Run the pipeline
  const result = await pipe(prompt, {
    negative_prompt: negativePrompt || '',
    num_inference_steps: steps,
    guidance_scale: guidanceScale,
    width,
    height,
    callback_function: (info) => {
      if (cancelled) {
        throw new Error('Generation cancelled');
      }

      // Report step progress
      if (info.step !== undefined) {
        send({
          type: 'generation-progress',
          step: info.step,
          totalSteps: steps,
        });
      }
    },
  });

  if (cancelled) {
    log('info', 'Generation was cancelled');
    return;
  }

  // Convert result to data URL
  // Transformers.js text-to-image returns an array of RawImage
  const image = Array.isArray(result) ? result[0] : result;
  const dataUrl = await imageToDataUrl(image);

  send({ type: 'generation-complete', imageDataUrl: dataUrl });
  log('info', 'Generation complete');
}

log('info', 'SD Worker initialized — waiting for messages');
