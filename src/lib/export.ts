import type { ExportConfig, ExportResult, MangaPanel } from '@/types';
import { renderMangaPage } from './canvas-renderer';
import { CANVAS_DEFAULTS } from './constants';
import { dataUrlToBlob, downloadBlob } from './utils';

// ============================================================
// Export System — PNG download & Markdown generation
// ============================================================

/**
 * Export the manga page as PNG.
 */
export function exportAsPng(
  panels: MangaPanel[],
  config: ExportConfig,
): ExportResult {
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;

  // Scale panels to export dimensions
  const scaleX = config.width / CANVAS_DEFAULTS.width;
  const scaleY = config.height / CANVAS_DEFAULTS.height;

  const scaledPanels: MangaPanel[] = panels.map((p) => ({
    ...p,
    x: p.x * scaleX,
    y: p.y * scaleY,
    width: p.width * scaleX,
    height: p.height * scaleY,
    speechBubble: p.speechBubble
      ? {
          ...p.speechBubble,
          fontSize: (p.speechBubble.fontSize ?? CANVAS_DEFAULTS.bubbleFontSize) * Math.min(scaleX, scaleY),
        }
      : undefined,
  }));

  renderMangaPage(canvas, scaledPanels, {
    showBorders: true,
    showEffects: true,
    showBubbles: true,
  });

  const dataUrl = canvas.toDataURL('image/png', config.quality);

  return {
    dataUrl,
    blob: dataUrlToBlob(dataUrl),
  };
}

/**
 * Download the manga page as a PNG file.
 */
export function downloadMangaPng(
  panels: MangaPanel[],
  config: ExportConfig,
  filename?: string,
): void {
  const result = exportAsPng(panels, config);
  if (result.blob) {
    downloadBlob(result.blob, filename ?? 'manga-readme.png');
  }
}

/**
 * Generate Markdown code for embedding the manga image in a GitHub README.
 */
export function generateMarkdown(
  imageUrl: string,
  options: {
    altText?: string;
    title?: string;
    align?: 'left' | 'center' | 'right';
    width?: number;
    includeCredits?: boolean;
    profileName?: string;
  } = {},
): string {
  const {
    altText = 'Manga README',
    title,
    align = 'center',
    width,
    includeCredits = true,
    profileName,
  } = options;

  const lines: string[] = [];

  // Opening alignment div
  lines.push(`<div align="${align}">`);
  lines.push('');

  // Image tag (using HTML for better control in GitHub)
  if (width) {
    lines.push(
      `<img src="${imageUrl}" alt="${altText}"${title ? ` title="${title}"` : ''} width="${width}" />`,
    );
  } else {
    lines.push(
      `<img src="${imageUrl}" alt="${altText}"${title ? ` title="${title}"` : ''} />`,
    );
  }

  lines.push('');

  // Optional title
  if (profileName) {
    lines.push(`### ${profileName}`);
    lines.push('');
  }

  // Credits
  if (includeCredits) {
    lines.push(
      '<sub>Generated with <a href="https://github.com/manga-readme-generator">MangaREADME Generator</a> — 100% client-side AI</sub>',
    );
    lines.push('');
  }

  lines.push('</div>');

  return lines.join('\n');
}

/**
 * Generate a complete Markdown snippet with image as base64 data URL.
 * Useful for quick copy-paste without needing to host the image.
 */
export function generateMarkdownWithInlineImage(
  panels: MangaPanel[],
  config: ExportConfig,
  profileName?: string,
): string {
  const result = exportAsPng(panels, config);
  if (!result.dataUrl) return '<!-- Error: could not generate image -->';

  return generateMarkdown(result.dataUrl, {
    altText: `${profileName ?? 'Developer'}'s Manga README`,
    title: 'Made with MangaREADME Generator',
    includeCredits: config.includeCredits,
    profileName,
  });
}

/**
 * Generate Markdown that references an external image URL.
 * User uploads the image to their repo and uses the path.
 */
export function generateMarkdownWithExternalImage(
  imagePath: string,
  profileName?: string,
  includeCredits?: boolean,
): string {
  return generateMarkdown(imagePath, {
    altText: `${profileName ?? 'Developer'}'s Manga README`,
    title: 'Made with MangaREADME Generator',
    align: 'center',
    includeCredits: includeCredits ?? true,
    profileName,
  });
}

/**
 * Copy markdown to clipboard.
 */
export async function copyMarkdownToClipboard(markdown: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Export both PNG and Markdown at once.
 */
export function exportAll(
  panels: MangaPanel[],
  config: ExportConfig,
  profileName?: string,
): ExportResult {
  const pngResult = exportAsPng(panels, config);

  const markdown = generateMarkdown(
    config.fileName ? `./${config.fileName}` : './manga-readme.png',
    {
      altText: `${profileName ?? 'Developer'}'s Manga README`,
      includeCredits: config.includeCredits,
      profileName,
    },
  );

  return {
    ...pngResult,
    markdown,
  };
}
