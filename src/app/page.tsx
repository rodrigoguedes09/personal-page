'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { generatePanelPrompts } from '@/lib/prompt-engine';
import { applyLayoutToPanels } from '@/lib/manga-layout';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { WebGPUStatus } from '@/components/webgpu-status';
import { ModelLoader } from '@/components/model-loader';
import { UserInputForm } from '@/components/user-input-form';
import { MangaCanvas } from '@/components/manga-canvas';
import { GenerationView } from '@/components/generation-view';
import { ExportOptions } from '@/components/export-options';
import { cn } from '@/lib/utils';

// ============================================================
// Step navigation configuration
// ============================================================

const STEPS = [
  { id: 'input' as const, label: '1. Your Info', icon: '01' },
  { id: 'customize' as const, label: '2. Customize', icon: '02' },
  { id: 'generate' as const, label: '3. Generate', icon: '03' },
  { id: 'export' as const, label: '4. Export', icon: '04' },
] as const;

// ============================================================
// Main Page
// ============================================================

export default function HomePage() {
  const {
    currentStep,
    setCurrentStep,
    userProfile,
    style,
    layoutType,
    panels,
    setPanels,
  } = useAppStore();

  // ---- Build panels when user moves to customize step ----
  const buildPanels = useCallback(() => {
    const panelData = generatePanelPrompts(userProfile, style, layoutType);
    const positioned = applyLayoutToPanels(panelData, layoutType);
    setPanels(positioned);
  }, [userProfile, style, layoutType, setPanels]);

  // Auto-rebuild panels when entering customize or generate step
  useEffect(() => {
    if (currentStep === 'customize' || currentStep === 'generate') {
      buildPanels();
    }
  }, [currentStep, buildPanels]);

  // Also rebuild on step 1 when layout or style changes so the preview updates live
  useEffect(() => {
    if (currentStep === 'input' && userProfile.name.trim().length > 0) {
      buildPanels();
    }
  }, [currentStep, layoutType, style, buildPanels, userProfile.name]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* ---- Step Navigation ---- */}
          <nav className="mb-8">
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {STEPS.map((step, i) => {
                const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
                const isActive = step.id === currentStep;
                const isCompleted = STEPS.findIndex((s) => s.id === step.id) < stepIndex;
                const isClickable = STEPS.findIndex((s) => s.id === step.id) <= stepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => isClickable && setCurrentStep(step.id)}
                      disabled={!isClickable}
                      className={cn(
                        'flex items-center gap-1.5 rounded-sm border-2 px-3 py-1.5 transition-all',
                        isActive
                          ? 'border-manga-black bg-manga-black text-white font-bold'
                          : isCompleted
                            ? 'border-manga-black bg-manga-gray-100 text-manga-black'
                            : 'border-manga-gray-300 text-manga-gray-400',
                        isClickable && !isActive && 'hover:border-manga-black cursor-pointer',
                        !isClickable && 'cursor-not-allowed',
                      )}
                    >
                      <span className="text-sm">{step.icon}</span>
                      <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline">
                        {step.label}
                      </span>
                    </button>

                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'mx-1 h-0.5 w-4 sm:w-8',
                          isCompleted ? 'bg-manga-black' : 'bg-manga-gray-300',
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* ---- Main Content ---- */}
          <div className="grid gap-6 lg:grid-cols-[1fr,minmax(400px,500px)]">
            {/* Left: Canvas Preview */}
            <div className="order-2 lg:order-1">
              <div className="sticky top-6">
                <MangaCanvas className="animate-manga-entrance" />
              </div>
            </div>

            {/* Right: Controls */}
            <div className="order-1 space-y-6 lg:order-2">
              {/* WebGPU Status — always visible */}
              <WebGPUStatus />

              {/* Step Content */}
              <div className="animate-fade-in">
                {currentStep === 'input' && (
                  <div className="manga-card transition-none hover:translate-x-0 hover:translate-y-0 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <UserInputForm />
                  </div>
                )}

                {currentStep === 'customize' && (
                  <div className="space-y-6">
                    <div className="manga-card transition-none hover:translate-x-0 hover:translate-y-0 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      <h3 className="mb-4 font-manga text-lg tracking-wide text-manga-black">
                        Panel Prompts
                      </h3>
                      <p className="mb-3 text-xs text-manga-gray-500">
                        Review and edit the AI prompts for each panel. These are auto-generated from your profile data.
                      </p>

                      <div className="space-y-3">
                        {panels.map((panel, index) => (
                          <PanelPromptEditor key={panel.id} panel={panel} index={index} />
                        ))}
                      </div>

                      <div className="mt-4 flex justify-between">
                        <button
                          onClick={() => setCurrentStep('input')}
                          className="text-xs font-bold text-manga-gray-400 hover:text-manga-black"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setCurrentStep('generate')}
                          className={cn(
                            'rounded-sm border-2 border-manga-black px-6 py-2',
                            'font-manga text-sm tracking-wider text-white',
                            'bg-manga-accent transition-all',
                            'shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
                          )}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'generate' && (
                  <div className="space-y-4">
                    <ModelLoader />
                    <div className="manga-card transition-none hover:translate-x-0 hover:translate-y-0 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      <GenerationView />
                    </div>
                  </div>
                )}

                {currentStep === 'export' && (
                  <div className="manga-card transition-none hover:translate-x-0 hover:translate-y-0 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <ExportOptions />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================
// Panel Prompt Editor (inline component)
// ============================================================

function PanelPromptEditor({
  panel,
  index,
}: {
  panel: import('@/types').MangaPanel;
  index: number;
}) {
  const updatePanel = useAppStore((s) => s.updatePanel);

  return (
    <div className="rounded-sm border border-manga-gray-200 bg-manga-gray-100/50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-manga-gray-400">
          Panel {index + 1} — {panel.label ?? 'Scene'}
        </span>
        {panel.speechBubble && (
          <span className="text-[10px] text-manga-gray-400">
            [{panel.speechBubble.type}]
          </span>
        )}
      </div>

      <textarea
        value={panel.prompt}
        onChange={(e) => updatePanel(panel.id, { prompt: e.target.value })}
        rows={3}
        className={cn(
          'w-full resize-none rounded-sm border border-manga-gray-300 bg-white px-2 py-1.5',
          'text-[11px] leading-relaxed text-manga-gray-700',
          'focus:border-manga-black focus:outline-none',
        )}
      />

      {panel.speechBubble && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[9px] text-manga-gray-400">Bubble:</span>
          <input
            type="text"
            value={panel.speechBubble.text}
            onChange={(e) =>
              updatePanel(panel.id, {
                speechBubble: { ...panel.speechBubble!, text: e.target.value },
              })
            }
            className="flex-1 rounded-sm border border-manga-gray-300 px-2 py-0.5 text-[10px] focus:border-manga-black focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
