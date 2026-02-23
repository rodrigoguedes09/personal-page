'use client';

import { useAppStore } from '@/store/app-store';
import { useGeneration } from '@/hooks/use-generation';
import { cn } from '@/lib/utils';
import { GENERATION_PRESETS } from '@/lib/constants';
import { ProgressBar } from './progress-bar';

/**
 * Generation controls — trigger, monitor, and cancel AI image generation.
 */
export function GenerationView() {
  const {
    panels,
    isGenerating,
    modelStatus,
    generationConfig,
    jobs,
    setGenerationConfig,
    setCurrentStep,
    showAdvanced,
    setShowAdvanced,
  } = useAppStore();

  const { generateAllPanels, cancelGeneration, isModelReady } = useGeneration();

  const canGenerate = isModelReady && panels.length > 0 && !isGenerating;

  // Overall progress
  const completedJobs = jobs.filter((j) => j.status === 'complete').length;
  const totalJobs = jobs.length;
  const overallProgress = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Generation Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-manga text-lg tracking-wide text-manga-black">
          ⚡ Generate Panels
        </h3>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] font-bold uppercase tracking-widest text-manga-gray-400 hover:text-manga-black"
        >
          {showAdvanced ? '▾ Hide' : '▸ Advanced'} Settings
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(GENERATION_PRESETS).map(([name, preset]) => (
          <button
            key={name}
            onClick={() => setGenerationConfig(preset)}
            className={cn(
              'rounded-sm border-2 px-3 py-1',
              'text-[10px] font-bold uppercase tracking-wider',
              'transition-all',
              generationConfig.steps === preset.steps &&
                generationConfig.width === preset.width
                ? 'border-manga-black bg-manga-black text-white'
                : 'border-manga-gray-300 text-manga-gray-600 hover:border-manga-black',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="rounded-sm border-2 border-manga-gray-200 bg-manga-gray-100/50 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
                Steps
              </label>
              <input
                type="number"
                value={generationConfig.steps}
                onChange={(e) => setGenerationConfig({ steps: parseInt(e.target.value) || 4 })}
                min={1}
                max={50}
                className="w-full rounded-sm border border-manga-gray-300 px-2 py-1 text-sm focus:border-manga-black focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
                CFG Scale
              </label>
              <input
                type="number"
                value={generationConfig.guidanceScale}
                onChange={(e) => setGenerationConfig({ guidanceScale: parseFloat(e.target.value) || 0 })}
                min={0}
                max={20}
                step={0.5}
                className="w-full rounded-sm border border-manga-gray-300 px-2 py-1 text-sm focus:border-manga-black focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
                Width
              </label>
              <select
                value={generationConfig.width}
                onChange={(e) => setGenerationConfig({ width: parseInt(e.target.value) })}
                className="w-full rounded-sm border border-manga-gray-300 px-2 py-1 text-sm focus:border-manga-black focus:outline-none"
              >
                <option value={256}>256</option>
                <option value={384}>384</option>
                <option value={512}>512</option>
                <option value={768}>768</option>
                <option value={1024}>1024</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
                Seed
              </label>
              <input
                type="number"
                value={generationConfig.seed ?? -1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setGenerationConfig({ seed: v >= 0 ? v : undefined });
                }}
                min={-1}
                className="w-full rounded-sm border border-manga-gray-300 px-2 py-1 text-sm focus:border-manga-black focus:outline-none"
              />
              <p className="mt-0.5 text-[9px] text-manga-gray-400">-1 = random</p>
            </div>
          </div>
        </div>
      )}

      {/* Generate / Cancel Buttons */}
      <div className="flex gap-3">
        {!isGenerating ? (
          <button
            onClick={generateAllPanels}
            disabled={!canGenerate}
            className={cn(
              'flex-1 rounded-sm border-2 border-manga-black px-6 py-3',
              'font-manga text-base tracking-wider',
              'transition-all',
              canGenerate
                ? 'bg-manga-accent text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'
                : 'bg-manga-gray-200 text-manga-gray-400 cursor-not-allowed',
            )}
          >
            {!isModelReady
              ? '⬆ Load Model First'
              : panels.length === 0
                ? 'Set Up Panels First'
                : `⚡ Generate ${panels.length} Panel${panels.length !== 1 ? 's' : ''}`}
          </button>
        ) : (
          <button
            onClick={() => cancelGeneration()}
            className={cn(
              'flex-1 rounded-sm border-2 border-red-500 px-6 py-3',
              'font-manga text-base tracking-wider text-red-500',
              'transition-all hover:bg-red-50',
            )}
          >
            ✕ Cancel Generation
          </button>
        )}

        <button
          onClick={() => setCurrentStep('export')}
          disabled={panels.length === 0}
          className={cn(
            'rounded-sm border-2 border-manga-black px-4 py-3',
            'font-manga text-sm tracking-wider text-manga-black',
            'transition-all hover:bg-manga-gray-100',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          Export →
        </button>
      </div>

      {/* Job Progress */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <ProgressBar
            progress={overallProgress}
            label={`Overall: ${completedJobs}/${totalJobs}`}
            variant={overallProgress === 100 ? 'success' : 'manga'}
          />

          <div className="max-h-40 space-y-1 overflow-y-auto">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-2 rounded-sm border border-manga-gray-200 px-2 py-1"
              >
                <div
                  className={cn(
                    'h-2 w-2 flex-shrink-0 rounded-full',
                    job.status === 'complete' && 'bg-green-500',
                    job.status === 'running' && 'bg-blue-500 animate-pulse',
                    job.status === 'queued' && 'bg-manga-gray-300',
                    job.status === 'error' && 'bg-red-500',
                    job.status === 'cancelled' && 'bg-yellow-500',
                  )}
                />
                <span className="flex-1 truncate text-[10px] text-manga-gray-600">
                  {job.prompt.slice(0, 60)}...
                </span>
                <span className="text-[10px] font-mono text-manga-gray-400">
                  {job.status === 'running' ? `${job.progress}%` : job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model not ready warning */}
      {modelStatus.status !== 'ready' && (
        <p className="text-center text-xs text-manga-gray-400">
          ⚠ Load the AI model first to enable image generation
        </p>
      )}
    </div>
  );
}
