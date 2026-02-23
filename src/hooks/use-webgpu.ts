'use client';

import { useState, useEffect } from 'react';
import type { WebGPUStatus } from '@/types';
import { detectWebGPU, getRecommendedSettings } from '@/lib/webgpu';
import { useAppStore } from '@/store/app-store';

/**
 * Hook for WebGPU detection and capability assessment.
 * Runs once on mount and caches the result.
 */
export function useWebGPU() {
  const [status, setStatus] = useState<WebGPUStatus>({
    supported: false,
    available: false,
  });
  const [isChecking, setIsChecking] = useState(true);
  const setWebGPUStatus = useAppStore((s) => s.setWebGPUStatus);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const result = await detectWebGPU();
        if (mounted) {
          setStatus(result);
          setWebGPUStatus(result);
        }
      } catch {
        if (mounted) {
          const errorStatus: WebGPUStatus = {
            supported: false,
            available: false,
            error: 'Failed to detect WebGPU',
          };
          setStatus(errorStatus);
          setWebGPUStatus(errorStatus);
        }
      } finally {
        if (mounted) setIsChecking(false);
      }
    }

    check();
    return () => { mounted = false; };
  }, [setWebGPUStatus]);

  const recommended = status.available ? getRecommendedSettings(status) : null;

  return {
    status,
    isChecking,
    isSupported: status.supported,
    isAvailable: status.available,
    recommended,
    gpuName: status.adapterName,
    error: status.error,
  };
}
