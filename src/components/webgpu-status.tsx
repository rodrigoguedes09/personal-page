'use client';

import { useWebGPU } from '@/hooks/use-webgpu';
import { cn } from '@/lib/utils';

export function WebGPUStatus() {
  const { status, isChecking, isAvailable, recommended, gpuName, error } = useWebGPU();

  if (isChecking) {
    return (
      <div className="animate-pulse rounded-sm border-2 border-manga-gray-300 bg-manga-gray-100 p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-manga-gray-300" />
          <span className="text-sm text-manga-gray-500">Detecting WebGPU capabilities...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-sm border-2 p-4 transition-all',
        isAvailable
          ? 'border-green-600 bg-green-50'
          : status.supported
            ? 'border-yellow-500 bg-yellow-50'
            : 'border-red-500 bg-red-50',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div
            className={cn(
              'mt-0.5 h-3 w-3 flex-shrink-0 rounded-full',
              isAvailable
                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                : status.supported
                  ? 'bg-yellow-500'
                  : 'bg-red-500',
            )}
          />

          <div>
            <h3 className="text-sm font-bold text-manga-black">
              {isAvailable
                ? 'WebGPU Ready'
                : status.supported
                  ? 'WebGPU Limited'
                  : 'WebGPU Not Available'}
            </h3>

            {gpuName && (
              <p className="mt-0.5 text-xs text-manga-gray-600">
                GPU: {gpuName}
                {status.adapterVendor ? ` (${status.adapterVendor})` : ''}
              </p>
            )}

            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}

            {isAvailable && recommended && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-sm bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                  Max Res: {recommended.maxResolution}px
                </span>
                <span className="inline-flex items-center rounded-sm bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                  Steps: {recommended.recommendedSteps}
                </span>
                <span className="inline-flex items-center rounded-sm bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                  Quant: {recommended.quantization}
                </span>
              </div>
            )}

            {!isAvailable && (
              <p className="mt-2 text-xs text-manga-gray-500">
                {status.supported
                  ? 'Your GPU has limited capabilities. You can still try with reduced settings.'
                  : 'Use Chrome 113+, Edge 113+, or enable WebGPU in browser flags. The app will use WASM fallback (slower).'}
              </p>
            )}
          </div>
        </div>

        {/* Device description badge */}
        {status.deviceDescription && isAvailable && (
          <span className="flex-shrink-0 rounded-sm bg-manga-black px-2 py-1 text-[10px] font-bold uppercase text-manga-white">
            {status.architecture || 'GPU'}
          </span>
        )}
      </div>
    </div>
  );
}
