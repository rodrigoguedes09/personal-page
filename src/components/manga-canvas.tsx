'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { renderMangaPage } from '@/lib/canvas-renderer';
import { CANVAS_DEFAULTS } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Main manga canvas component — renders panels, effects, and speech bubbles.
 * Uses HTML5 Canvas for high-performance rendering.
 */
export function MangaCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { panels } = useAppStore();

  // ---- Render ----
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_DEFAULTS.width;
    canvas.height = CANVAS_DEFAULTS.height;

    renderMangaPage(canvas, panels, {
      showBorders: true,
      showEffects: true,
      showBubbles: true,
    });
  }, [panels]);

  // Re-render when panels change
  useEffect(() => {
    render();
  }, [render]);

  // Re-render on image load (when panel images are async loaded)
  useEffect(() => {
    const imagePromises = panels
      .filter((p) => p.imageUrl)
      .map((p) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            render();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = p.imageUrl!;
        });
      });

    Promise.all(imagePromises);
  }, [panels, render]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Canvas wrapper with manga page styling */}
      <div
        className={cn(
          'relative mx-auto overflow-hidden rounded-sm',
          'border-4 border-manga-black',
          'shadow-[6px_6px_0_0_rgba(0,0,0,0.3)]',
          'bg-white',
        )}
        style={{ maxWidth: CANVAS_DEFAULTS.width, aspectRatio: `${CANVAS_DEFAULTS.width}/${CANVAS_DEFAULTS.height}` }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_DEFAULTS.width}
          height={CANVAS_DEFAULTS.height}
          className="h-full w-full"
          style={{ imageRendering: 'auto' }}
        />

        {/* Empty state overlay */}
        {panels.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center">
              <p className="font-manga text-2xl text-manga-gray-300">
                漫画
              </p>
              <p className="mt-2 text-sm text-manga-gray-400">
                Fill in your info and choose a layout to see the preview
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Panel count indicator */}
      {panels.length > 0 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-manga-gray-400">
            {panels.length} Panel{panels.length !== 1 ? 's' : ''}
          </span>
          <span className="text-manga-gray-300">•</span>
          <span className="text-[10px] text-manga-gray-400">
            {CANVAS_DEFAULTS.width}×{CANVAS_DEFAULTS.height}px
          </span>
        </div>
      )}
    </div>
  );
}
