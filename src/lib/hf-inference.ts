/**
 * HuggingFace Inference API client for text-to-image generation.
 *
 * Uses the serverless Inference API — no model downloads required.
 * Optional API token for higher rate limits (free tier available).
 *
 * @see https://huggingface.co/docs/api-inference
 */

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

// ============================================================
// Types
// ============================================================

export interface HFGenerateParams {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  guidanceScale?: number;
  steps?: number;
  seed?: number;
  token?: string;
  signal?: AbortSignal;
}

export interface HFGenerateResult {
  imageBlob: Blob;
  imageDataUrl: string;
}

export interface HFError {
  error: string;
  estimated_time?: number;
  warnings?: string[];
}

// ============================================================
// Token Management (localStorage)
// ============================================================

const TOKEN_KEY = 'manga-readme-hf-token';

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token.trim()) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ============================================================
// API Client
// ============================================================

/**
 * Generate an image using the HuggingFace Inference API.
 *
 * Handles model warm-up (503 → automatic retry) and rate limiting.
 * Returns a data URL of the generated image.
 */
export async function generateImage(
  params: HFGenerateParams,
  onStatus?: (status: string) => void,
): Promise<HFGenerateResult> {
  const {
    modelId,
    prompt,
    negativePrompt,
    width = 512,
    height = 512,
    guidanceScale = 7.5,
    steps = 30,
    seed,
    token,
    signal,
  } = params;

  const url = `${HF_API_BASE}/${modelId}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use provided token, or fall back to stored token
  const apiToken = token ?? getStoredToken();
  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  // Build request body
  const body: Record<string, unknown> = {
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt ?? '',
      guidance_scale: guidanceScale,
      num_inference_steps: steps,
      width,
      height,
      ...(seed !== undefined && seed >= 0 ? { seed } : {}),
    },
  };

  // Retry loop for model warm-up (503) and transient errors
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Generation cancelled', 'AbortError');
    }

    try {
      onStatus?.(attempt === 0 ? 'Sending request...' : `Retrying (attempt ${attempt + 1})...`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });

      // Success — response is an image blob
      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? '';

        if (contentType.startsWith('image/')) {
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          return { imageBlob: blob, imageDataUrl: dataUrl };
        }

        // Some models return JSON with a base64 image
        const json = await response.json();
        if (Array.isArray(json) && json[0]?.image) {
          const dataUrl = `data:image/png;base64,${json[0].image}`;
          const blob = dataUrlToBlob(dataUrl);
          return { imageBlob: blob, imageDataUrl: dataUrl };
        }

        throw new Error('Unexpected response format from HuggingFace API');
      }

      // Model is loading (cold start) — wait and retry
      if (response.status === 503) {
        const json = (await response.json().catch(() => ({}))) as HFError;
        const waitTime = Math.min(json.estimated_time ?? 20, 60);
        lastError = json.error ?? 'Model is loading';

        onStatus?.(`Model is warming up... (estimated ${Math.ceil(waitTime)}s)`);
        await sleep(waitTime * 1000, signal);
        continue;
      }

      // Rate limited
      if (response.status === 429) {
        lastError = 'Rate limited. Please wait a moment or add an API token.';
        onStatus?.('Rate limited, waiting...');
        await sleep(10_000, signal);
        continue;
      }

      // Auth error
      if (response.status === 401) {
        throw new Error(
          'Invalid API token. Remove the token to use the free tier, or provide a valid HuggingFace token.',
        );
      }

      // Other errors
      const errBody = await response.text().catch(() => '');
      throw new Error(`HuggingFace API error (${response.status}): ${errBody || response.statusText}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }
      lastError = error instanceof Error ? error.message : String(error);
      onStatus?.(`Error: ${lastError}. Retrying...`);
      await sleep(3000, signal);
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError}`);
}

/**
 * Check if a model is available on the HuggingFace Inference API.
 * Returns the model status without generating an image.
 */
export async function checkModelStatus(
  modelId: string,
  token?: string,
): Promise<{ loaded: boolean; estimated_time?: number }> {
  const apiToken = token ?? getStoredToken();
  const headers: Record<string, string> = {};
  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  try {
    const response = await fetch(`${HF_API_BASE}/${modelId}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: 'test', parameters: { num_inference_steps: 1, width: 64, height: 64 } }),
    });

    if (response.ok) {
      return { loaded: true };
    }

    if (response.status === 503) {
      const json = (await response.json().catch(() => ({}))) as HFError;
      return { loaded: false, estimated_time: json.estimated_time };
    }

    return { loaded: true }; // Assume loaded for other statuses
  } catch {
    return { loaded: true }; // Assume available, will fail on actual generation
  }
}

// ============================================================
// Helpers
// ============================================================

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}
