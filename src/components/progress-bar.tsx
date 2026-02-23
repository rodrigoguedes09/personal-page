'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number;
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'success' | 'error' | 'manga';
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  label,
  sublabel,
  variant = 'default',
  showPercentage = true,
  animated = true,
  className,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const barColors = {
    default: 'bg-manga-blue',
    success: 'bg-green-500',
    error: 'bg-red-500',
    manga: 'bg-manga-black',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-xs font-bold uppercase tracking-wider text-manga-gray-600">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="font-mono text-xs font-bold text-manga-black">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      <div className="relative h-3 w-full overflow-hidden rounded-sm border-2 border-manga-black bg-manga-gray-100">
        {/* Progress fill */}
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            barColors[variant],
            animated && clampedProgress < 100 && 'animate-pulse-slow',
          )}
          style={{ width: `${clampedProgress}%` }}
        />

        {/* Manga-style hatching overlay on progress bar */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
            width: `${clampedProgress}%`,
          }}
        />
      </div>

      {sublabel && (
        <p className="mt-1 truncate text-[10px] text-manga-gray-400">{sublabel}</p>
      )}
    </div>
  );
}
