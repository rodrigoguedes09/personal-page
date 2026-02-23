import type { WebGPUStatus } from '@/types';
import { WEBGPU_MIN_REQUIREMENTS } from './constants';

// WebGPU type shim (the full @webgpu/types package is large; we only need navigator.gpu)
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(options?: { powerPreference?: string }): Promise<GPUAdapterShim | null>;
    };
  }
}
interface GPUAdapterShim {
  requestAdapterInfo(): Promise<{ device?: string; vendor?: string; architecture?: string }>;
  features: Set<string>;
  limits: { maxBufferSize: number; [k: string]: any };
  requestDevice(desc?: any): Promise<{ destroy(): void }>;
}

/**
 * Comprehensive WebGPU detection and capability assessment.
 * Returns detailed information about the user's GPU capabilities.
 */
export async function detectWebGPU(): Promise<WebGPUStatus> {
  // Step 1: Check if WebGPU API exists
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return {
      supported: false,
      available: false,
      error: 'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or another WebGPU-enabled browser.',
    };
  }

  try {
    // Step 2: Request adapter
    const adapter = await navigator.gpu!.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      return {
        supported: true,
        available: false,
        error: 'No WebGPU adapter found. Your GPU may not support WebGPU, or it may be disabled in browser flags.',
      };
    }

    // Step 3: Get adapter info
    const adapterInfo = await adapter.requestAdapterInfo();
    const features: string[] = Array.from(adapter.features) as string[];

    // Step 4: Check minimum requirements
    const { maxBufferSize } = adapter.limits;
    const meetsMinRequirements = maxBufferSize >= WEBGPU_MIN_REQUIREMENTS.minBufferSize;

    // Step 5: Try to get device to confirm full availability
    let deviceDescription = 'Available';
    try {
      const device = await adapter.requestDevice({
        requiredLimits: {
          maxBufferSize: Math.min(maxBufferSize, 1024 * 1024 * 1024), // Up to 1GB
        },
      });
      deviceDescription = `Ready (max buffer: ${Math.round(maxBufferSize / (1024 * 1024))} MB)`;
      device.destroy();
    } catch {
      deviceDescription = 'Limited (could not create device with required limits)';
    }

    return {
      supported: true,
      available: meetsMinRequirements,
      adapterName: adapterInfo.device || 'Unknown GPU',
      adapterVendor: adapterInfo.vendor || 'Unknown',
      architecture: adapterInfo.architecture || 'Unknown',
      deviceDescription,
      maxBufferSize,
      features,
      error: meetsMinRequirements
        ? undefined
        : `GPU buffer size (${Math.round(maxBufferSize / (1024 * 1024))} MB) is below minimum requirement (${Math.round(WEBGPU_MIN_REQUIREMENTS.minBufferSize / (1024 * 1024))} MB).`,
    };
  } catch (err) {
    return {
      supported: true,
      available: false,
      error: `WebGPU detection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Check if the current environment can run ONNX Runtime with WebGPU.
 * This is a lighter check than full model loading.
 */
export async function checkONNXWebGPUSupport(): Promise<boolean> {
  try {
    if (!('gpu' in navigator)) return false;
    const adapter = await navigator.gpu!.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return false;
    const device = await adapter.requestDevice();
    device.destroy();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recommended generation settings based on GPU capabilities.
 */
export function getRecommendedSettings(status: WebGPUStatus): {
  maxResolution: number;
  recommendedSteps: number;
  quantization: string;
} {
  const bufferMB = (status.maxBufferSize ?? 0) / (1024 * 1024);

  if (bufferMB >= 4096) {
    return { maxResolution: 1024, recommendedSteps: 8, quantization: 'fp16' };
  } else if (bufferMB >= 2048) {
    return { maxResolution: 768, recommendedSteps: 4, quantization: 'fp16' };
  } else if (bufferMB >= 512) {
    return { maxResolution: 512, recommendedSteps: 4, quantization: 'q8' };
  } else {
    return { maxResolution: 512, recommendedSteps: 2, quantization: 'q4' };
  }
}
