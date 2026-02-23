'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { exportAsPng, downloadMangaPng, generateMarkdownWithExternalImage } from '@/lib/export';
import { copyToClipboard } from '@/lib/utils';
import { EXPORT_SIZES, type ExportSizeKey } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ExportConfig } from '@/types';

export function ExportOptions() {
  const { panels, userProfile, setCurrentStep } = useAppStore();
  const [selectedSize, setSelectedSize] = useState<ExportSizeKey>('github-readme');
  const [includeCredits, setIncludeCredits] = useState(true);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLImageElement>(null);

  const sizeConfig = EXPORT_SIZES[selectedSize];

  const exportConfig: ExportConfig = useMemo(() => ({
    format: 'both',
    width: sizeConfig.width,
    height: sizeConfig.height,
    quality: 1.0,
    includeCredits,
    fileName: 'manga-readme.png',
  }), [sizeConfig.width, sizeConfig.height, includeCredits]);

  // ---- Preview ----
  const generatePreview = useCallback(() => {
    if (panels.length === 0) return;
    const result = exportAsPng(panels, exportConfig);
    if (result.dataUrl) {
      setPreviewUrl(result.dataUrl);
    }
  }, [panels, exportConfig]);

  // ---- Download PNG ----
  const handleDownloadPng = useCallback(() => {
    if (panels.length === 0) return;
    downloadMangaPng(panels, exportConfig, 'manga-readme.png');
  }, [panels, exportConfig]);

  // ---- Copy Markdown ----
  const handleCopyMarkdown = useCallback(async () => {
    const markdown = generateMarkdownWithExternalImage(
      './manga-readme.png',
      userProfile.name,
      includeCredits,
    );
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  }, [userProfile.name, includeCredits]);

  // ---- Markdown preview ----
  const markdownPreview = generateMarkdownWithExternalImage(
    './manga-readme.png',
    userProfile.name,
    includeCredits,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-manga text-lg tracking-wide text-manga-black">
          📤 Export
        </h3>
        <button
          onClick={() => setCurrentStep('generate')}
          className="text-xs font-bold text-manga-gray-400 hover:text-manga-black"
        >
          ← Back to Generate
        </button>
      </div>

      {/* Size Selection */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
          Export Size
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(EXPORT_SIZES) as [ExportSizeKey, typeof EXPORT_SIZES[ExportSizeKey]][]).map(
            ([key, size]) => (
              <button
                key={key}
                onClick={() => setSelectedSize(key)}
                className={cn(
                  'rounded-sm border-2 px-3 py-2 text-left transition-all',
                  selectedSize === key
                    ? 'border-manga-black bg-manga-black text-white'
                    : 'border-manga-gray-300 hover:border-manga-black',
                )}
              >
                <div className="text-xs font-bold">{size.label}</div>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={includeCredits}
            onChange={(e) => setIncludeCredits(e.target.checked)}
            className="h-4 w-4 rounded border-manga-gray-300 text-manga-black focus:ring-manga-black"
          />
          <span className="text-xs text-manga-gray-600">Include credits in Markdown</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Preview */}
        <button
          onClick={generatePreview}
          disabled={panels.length === 0}
          className={cn(
            'rounded-sm border-2 border-manga-black px-4 py-3',
            'font-manga text-sm tracking-wider text-manga-black',
            'bg-white transition-all',
            'shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none',
          )}
        >
          👁 Preview
        </button>

        {/* Download PNG */}
        <button
          onClick={handleDownloadPng}
          disabled={panels.length === 0}
          className={cn(
            'rounded-sm border-2 border-manga-black px-4 py-3',
            'font-manga text-sm tracking-wider text-white',
            'bg-manga-accent transition-all',
            'shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none',
          )}
        >
          ⬇ Download PNG
        </button>

        {/* Copy Markdown */}
        <button
          onClick={handleCopyMarkdown}
          className={cn(
            'rounded-sm border-2 border-manga-black px-4 py-3',
            'font-manga text-sm tracking-wider',
            'transition-all',
            copiedMarkdown
              ? 'bg-green-500 text-white'
              : 'bg-manga-gold text-manga-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
          )}
        >
          {copiedMarkdown ? '✓ Copied!' : '📋 Copy Markdown'}
        </button>
      </div>

      {/* Preview Image */}
      {previewUrl && (
        <div className="overflow-hidden rounded-sm border-2 border-manga-gray-200">
          <div className="border-b border-manga-gray-200 bg-manga-gray-100 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
              Preview — {sizeConfig.label}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={previewRef}
            src={previewUrl}
            alt="Export preview"
            className="w-full"
          />
        </div>
      )}

      {/* Markdown Preview */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
            Markdown Code
          </label>
          <button
            onClick={handleCopyMarkdown}
            className="text-[10px] font-bold text-manga-blue hover:underline"
          >
            {copiedMarkdown ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-sm border-2 border-manga-gray-200 bg-manga-gray-100 p-3">
          <code className="text-[11px] leading-relaxed text-manga-gray-700">
            {markdownPreview}
          </code>
        </pre>
      </div>

      {/* Instructions */}
      <div className="rounded-sm border-2 border-manga-gray-200 bg-manga-gray-100/50 p-4">
        <h4 className="mb-2 text-xs font-bold text-manga-black">How to use:</h4>
        <ol className="space-y-1.5 text-[11px] text-manga-gray-600">
          <li>1. Download the PNG image above</li>
          <li>2. Add it to your GitHub repository (root or <code className="rounded bg-manga-gray-200 px-1 py-0.5 text-manga-black">.github/</code> folder)</li>
          <li>3. Copy the Markdown code and paste it at the top of your <code className="rounded bg-manga-gray-200 px-1 py-0.5 text-manga-black">README.md</code></li>
          <li>4. Update the image path if needed</li>
          <li>5. Commit and push — enjoy your manga README! 🎉</li>
        </ol>
      </div>
    </div>
  );
}
