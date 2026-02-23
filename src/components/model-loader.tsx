'use client';

import { useAppStore } from '@/store/app-store';
import { useGeneration } from '@/hooks/use-generation';
import { AVAILABLE_MODELS } from '@/lib/constants';
import { formatBytes, cn } from '@/lib/utils';
import { ProgressBar } from './progress-bar';

export function ModelLoader() {
  const { modelStatus, selectedModel, setSelectedModel } = useAppStore();
  const { loadModel, isModelReady } = useGeneration();

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  const isLoading = modelStatus.status === 'downloading' || modelStatus.status === 'loading';

  return (
    <div className="rounded-sm border-2 border-manga-black bg-white p-4">
      <h3 className="mb-3 font-manga text-base tracking-wide text-manga-black">
        🤖 AI Model
      </h3>

      {/* Model Selector */}
      <div className="mb-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
          Select Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isLoading}
          className={cn(
            'w-full rounded-sm border-2 border-manga-black bg-white px-3 py-2',
            'text-sm font-medium text-manga-black',
            'focus:outline-none focus:ring-2 focus:ring-manga-blue',
            'disabled:opacity-50',
          )}
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} — {model.size} ({model.quantization})
            </option>
          ))}
        </select>
        {currentModel && (
          <p className="mt-1 text-[10px] text-manga-gray-400">
            {currentModel.description}
          </p>
        )}
      </div>

      {/* Load Button */}
      {!isModelReady && !isLoading && (
        <button
          onClick={() => loadModel()}
          className={cn(
            'w-full rounded-sm border-2 border-manga-black px-4 py-2.5',
            'font-manga text-sm tracking-wider text-manga-black',
            'bg-manga-gold transition-all',
            'shadow-[3px_3px_0_0_rgba(0,0,0,1)]',
            'hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
            'active:bg-yellow-500',
          )}
        >
          ⬇ Download &amp; Load Model
        </button>
      )}

      {/* Loading Progress */}
      {isLoading && (
        <div className="space-y-2">
          <ProgressBar
            progress={modelStatus.progress}
            label="Downloading Model"
            sublabel={modelStatus.currentFile ?? 'Preparing...'}
            variant="manga"
          />

          {modelStatus.totalFiles > 0 && (
            <p className="text-[10px] text-manga-gray-400">
              Components: {modelStatus.loadedFiles}/{modelStatus.totalFiles}
              {modelStatus.downloadedBytes && modelStatus.totalSizeBytes
                ? ` • ${formatBytes(modelStatus.downloadedBytes)} / ${formatBytes(modelStatus.totalSizeBytes)}`
                : ''}
            </p>
          )}

          <p className="text-[10px] italic text-manga-gray-400">
            First download may take a few minutes. Models are cached locally for future use.
          </p>
        </div>
      )}

      {/* Ready State */}
      {isModelReady && (
        <div className="flex items-center gap-2 rounded-sm bg-green-50 p-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-xs font-bold text-green-700">
            Model Ready — {currentModel?.name}
          </span>
          {modelStatus.cached && (
            <span className="ml-auto text-[10px] text-green-600">(cached)</span>
          )}
        </div>
      )}

      {/* Error State */}
      {modelStatus.status === 'error' && (
        <div className="rounded-sm bg-red-50 p-3">
          <p className="text-xs font-bold text-red-700">Failed to load model</p>
          <p className="mt-1 text-[10px] text-red-600">{modelStatus.error}</p>
          <button
            onClick={() => loadModel()}
            className="mt-2 text-xs font-bold text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
