'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { getModelsForMode } from '@/lib/constants';
import { getStoredToken, setStoredToken } from '@/lib/hf-inference';
import { useGeneration } from '@/hooks/use-generation';
import { cn } from '@/lib/utils';
import { ProgressBar } from './progress-bar';

/**
 * Model configuration panel — supports both local (private) and API modes.
 *
 * Local mode:  Download once, run in-browser. Max privacy.
 * API mode:    HuggingFace Inference API. No downloads.
 */
export function ModelLoader() {
  const {
    generationMode,
    setGenerationMode,
    selectedModel,
    setSelectedModel,
    modelStatus,
  } = useAppStore();

  const {
    initWorker,
    isWorkerReady,
    isModelReady,
    loadModel,
  } = useGeneration();

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Load stored token on mount
  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const models = getModelsForMode(generationMode);
  const currentModel = models.find((m) => m.id === selectedModel);

  const handleTokenChange = (value: string) => {
    setToken(value);
    setStoredToken(value);
  };

  /** Start the local pipeline: init worker -> load model */
  const handleLoadLocalModel = () => {
    if (!isWorkerReady) {
      initWorker();
      // The worker will fire init-complete, then we load the model
      // We use a small delay to chain the calls (worker init is fast)
      const check = setInterval(() => {
        // Check if worker ready via store
        const status = useAppStore.getState().modelStatus;
        if (status.status !== 'initializing') {
          clearInterval(check);
          loadModel();
        }
      }, 500);
      return;
    }
    loadModel();
  };

  const isLocalMode = generationMode === 'local';
  const isLoading = modelStatus.status === 'downloading' || modelStatus.status === 'loading' || modelStatus.status === 'initializing';

  return (
    <div className="rounded-sm border-2 border-manga-black bg-white p-4">
      <h3 className="mb-3 font-manga text-base tracking-wide text-manga-black">
        AI Model
      </h3>

      {/* Mode Toggle */}
      <div className="mb-4">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
          Generation Mode
        </label>
        <div className="flex rounded-sm border-2 border-manga-black overflow-hidden">
          <button
            onClick={() => setGenerationMode('local')}
            className={cn(
              'flex-1 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all',
              isLocalMode
                ? 'bg-manga-black text-white'
                : 'bg-white text-manga-gray-500 hover:bg-manga-gray-100',
            )}
          >
            Local (Private)
          </button>
          <button
            onClick={() => setGenerationMode('api')}
            className={cn(
              'flex-1 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all',
              !isLocalMode
                ? 'bg-manga-black text-white'
                : 'bg-white text-manga-gray-500 hover:bg-manga-gray-100',
            )}
          >
            API (Fast)
          </button>
        </div>
        <p className="mt-1 text-[9px] text-manga-gray-400">
          {isLocalMode
            ? 'Download once, then everything runs locally. Maximum privacy — no data leaves your browser.'
            : 'No downloads required. Images generated on HuggingFace servers.'}
        </p>
      </div>

      {/* Model Selector */}
      <div className="mb-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
          Select Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className={cn(
            'w-full rounded-sm border-2 border-manga-black bg-white px-3 py-2',
            'text-sm font-medium text-manga-black',
            'focus:outline-none focus:ring-2 focus:ring-manga-blue',
          )}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}{model.size ? ` (${model.size})` : ''}
            </option>
          ))}
        </select>
        {currentModel && (
          <p className="mt-1 text-[10px] text-manga-gray-400">
            {currentModel.description}
          </p>
        )}
      </div>

      {/* ── Local Mode UI ── */}
      {isLocalMode && (
        <div className="space-y-3">
          {/* Model download / load button */}
          {!isModelReady && !isLoading && (
            <button
              onClick={handleLoadLocalModel}
              className={cn(
                'w-full rounded-sm border-2 border-manga-black px-4 py-2.5',
                'font-manga text-sm tracking-wider',
                'bg-manga-accent text-white',
                'shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none',
                'hover:translate-x-[3px] hover:translate-y-[3px]',
                'transition-all',
              )}
            >
              Download & Load Model
            </button>
          )}

          {/* Progress bar during download/loading */}
          {isLoading && (
            <div className="space-y-2">
              <ProgressBar
                progress={modelStatus.progress}
                label={modelStatus.message ?? 'Loading...'}
                variant="manga"
              />
              {modelStatus.file && (
                <p className="text-[9px] font-mono text-manga-gray-400 truncate">
                  {modelStatus.file}
                </p>
              )}
            </div>
          )}

          {/* Model ready indicator */}
          {isModelReady && (
            <div className="flex items-center gap-2 rounded-sm bg-green-50 border border-green-200 p-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-[11px] font-medium text-green-700">
                Model loaded and ready
              </p>
            </div>
          )}

          {/* Error state */}
          {modelStatus.status === 'error' && (
            <div className="rounded-sm bg-red-50 border border-red-200 p-2">
              <p className="text-[10px] text-red-600">
                {modelStatus.error || 'An error occurred while loading the model.'}
              </p>
              <button
                onClick={handleLoadLocalModel}
                className="mt-1 text-[10px] font-bold text-red-700 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Info */}
          <div className="rounded-sm bg-manga-gray-100 p-2">
            <p className="text-[10px] text-manga-gray-500">
              The model is downloaded once and cached in your browser.
              After that, all generation runs locally — no internet needed.
              {currentModel?.size && ` Initial download: ${currentModel.size}.`}
            </p>
          </div>
        </div>
      )}

      {/* ── API Mode UI ── */}
      {!isLocalMode && (
        <div className="space-y-3">
          {/* API Token (optional) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
                HuggingFace Token (optional)
              </label>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-[10px] text-manga-gray-400 hover:text-manga-black"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>

            {showToken && (
              <div>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="hf_..."
                  className={cn(
                    'w-full rounded-sm border border-manga-gray-300 bg-white px-3 py-1.5',
                    'text-xs text-manga-gray-700 placeholder:text-manga-gray-300',
                    'focus:border-manga-black focus:outline-none',
                  )}
                />
                <p className="mt-1 text-[9px] text-manga-gray-400">
                  Adding a token increases rate limits. Get one free at{' '}
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-manga-black"
                  >
                    huggingface.co/settings/tokens
                  </a>
                </p>
              </div>
            )}

            {!showToken && token && (
              <p className="text-[10px] text-green-600">Token saved</p>
            )}
          </div>

          {/* Info */}
          <div className="rounded-sm bg-manga-gray-100 p-2">
            <p className="text-[10px] text-manga-gray-500">
              Images are generated via HuggingFace Inference API. No downloads required.
              First request may take 20-60s while the model warms up.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
