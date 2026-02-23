import type { MangaPanel, PanelEffect, SpeechBubble } from '@/types';
import { CANVAS_DEFAULTS } from './constants';
import { seededRandom } from './utils';

// ============================================================
// Canvas Renderer — Draw manga panels, effects, and bubbles
// ============================================================

/**
 * Render the complete manga page to a canvas.
 */
export function renderMangaPage(
  canvas: HTMLCanvasElement,
  panels: MangaPanel[],
  options: {
    backgroundColor?: string;
    showBorders?: boolean;
    showEffects?: boolean;
    showBubbles?: boolean;
  } = {},
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    backgroundColor = CANVAS_DEFAULTS.backgroundColor,
    showBorders = true,
    showEffects = true,
    showBubbles = true,
  } = options;

  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sort panels by zIndex
  const sortedPanels = [...panels].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Render each panel
  for (const panel of sortedPanels) {
    ctx.save();

    // Apply rotation if any
    if (panel.rotation) {
      const cx = panel.x + panel.width / 2;
      const cy = panel.y + panel.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((panel.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Draw panel background
    drawPanelBackground(ctx, panel);

    // Draw panel image if available
    if (panel.imageUrl) {
      drawPanelImage(ctx, panel);
    } else {
      // Draw placeholder with manga-style pattern
      drawPanelPlaceholder(ctx, panel);
    }

    // Draw effects
    if (showEffects && panel.effects) {
      for (const effect of panel.effects) {
        drawEffect(ctx, panel, effect);
      }
    }

    // Draw border
    if (showBorders) {
      drawPanelBorder(ctx, panel);
    }

    // Draw speech bubble
    if (showBubbles && panel.speechBubble) {
      drawSpeechBubble(ctx, panel, panel.speechBubble);
    }

    ctx.restore();
  }
}

// ============================================================
// Panel Drawing
// ============================================================

function drawPanelBackground(ctx: CanvasRenderingContext2D, panel: MangaPanel): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
}

function drawPanelBorder(ctx: CanvasRenderingContext2D, panel: MangaPanel): void {
  ctx.strokeStyle = CANVAS_DEFAULTS.panelBorderColor;
  ctx.lineWidth = CANVAS_DEFAULTS.panelBorderWidth;
  ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
}

function drawPanelImage(ctx: CanvasRenderingContext2D, panel: MangaPanel): void {
  if (!panel.imageUrl) return;

  const img = new Image();
  img.src = panel.imageUrl;

  // If image is already loaded (cached), draw it
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.width, panel.height);
    ctx.clip();

    // Cover-fit the image
    const scale = Math.max(
      panel.width / img.naturalWidth,
      panel.height / img.naturalHeight,
    );
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = panel.x + (panel.width - drawW) / 2;
    const drawY = panel.y + (panel.height - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }
}

/**
 * Draw a manga-style placeholder when no AI image is generated yet.
 * Uses screentone patterns and geometric shapes for a manga feel.
 */
function drawPanelPlaceholder(ctx: CanvasRenderingContext2D, panel: MangaPanel): void {
  const rng = seededRandom(panel.id.charCodeAt(0) * 1000 + panel.id.charCodeAt(1));

  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.width, panel.height);
  ctx.clip();

  // Light screentone background
  const dotSize = 2;
  const dotSpacing = 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let dx = 0; dx < panel.width; dx += dotSpacing) {
    for (let dy = 0; dy < panel.height; dy += dotSpacing) {
      if (rng() > 0.5) {
        ctx.beginPath();
        ctx.arc(panel.x + dx, panel.y + dy, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Diagonal speed lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const startX = panel.x + rng() * panel.width;
    const startY = panel.y;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX - panel.height * 0.3, panel.y + panel.height);
    ctx.stroke();
  }

  // Center icon placeholder
  const centerX = panel.x + panel.width / 2;
  const centerY = panel.y + panel.height / 2;
  const iconSize = Math.min(panel.width, panel.height) * 0.15;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label text
  if (panel.label) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.font = `${Math.min(14, panel.width / 15)}px ${CANVAS_DEFAULTS.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(panel.label, centerX, centerY + iconSize + 16);
  }

  // "Click to generate" hint
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.font = `${Math.min(11, panel.width / 20)}px sans-serif`;
  ctx.fillText('⚡ Generate', centerX, centerY);

  ctx.restore();
}

// ============================================================
// Visual Effects
// ============================================================

function drawEffect(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  effect: PanelEffect,
): void {
  const effectRenderers: Record<string, () => void> = {
    speedlines: () => drawSpeedLines(ctx, panel, effect.intensity, effect.direction),
    screentone: () => drawScreentone(ctx, panel, effect.intensity),
    sparkle: () => drawSparkles(ctx, panel, effect.intensity),
    impact: () => drawImpactLines(ctx, panel, effect.intensity),
    halftone: () => drawHalftone(ctx, panel, effect.intensity),
    'radial-blur': () => drawRadialBlur(ctx, panel, effect.intensity),
    vignette: () => drawVignette(ctx, panel, effect.intensity),
  };

  const renderer = effectRenderers[effect.type];
  if (renderer) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.width, panel.height);
    ctx.clip();
    renderer();
    ctx.restore();
  }
}

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
  direction?: number,
): void {
  const cx = panel.x + panel.width * 0.3;
  const cy = panel.y + panel.height * 0.5;
  const maxLen = Math.max(panel.width, panel.height) * 1.5;
  const lineCount = Math.floor(40 * intensity);
  const angle = direction ?? 0;

  ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 * intensity})`;
  ctx.lineWidth = 1;

  const rng = seededRandom(42);
  for (let i = 0; i < lineCount; i++) {
    const a = ((i / lineCount) * Math.PI * 2 + (angle * Math.PI) / 180) + (rng() - 0.5) * 0.1;
    const len = maxLen * (0.5 + rng() * 0.5);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
}

function drawScreentone(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
): void {
  const dotRadius = 1.5;
  const spacing = 4;
  ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * intensity})`;

  for (let x = panel.x; x < panel.x + panel.width; x += spacing) {
    for (let y = panel.y; y < panel.y + panel.height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSparkles(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
): void {
  const count = Math.floor(8 * intensity);
  const rng = seededRandom(123);

  for (let i = 0; i < count; i++) {
    const x = panel.x + rng() * panel.width;
    const y = panel.y + rng() * panel.height;
    const size = 4 + rng() * 8;

    ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 * intensity})`;
    ctx.lineWidth = 1.5;

    // Draw 4-point star
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
      ctx.stroke();
    }
  }
}

function drawImpactLines(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
): void {
  const cx = panel.x + panel.width / 2;
  const cy = panel.y + panel.height / 2;
  const maxLen = Math.max(panel.width, panel.height);
  const lineCount = Math.floor(60 * intensity);

  const rng = seededRandom(99);

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + (rng() - 0.5) * 0.05;
    const innerR = maxLen * 0.2;
    const outerR = maxLen * (0.5 + rng() * 0.5);
    const width = 0.5 + rng() * 2;

    ctx.strokeStyle = `rgba(0, 0, 0, ${(0.1 + rng() * 0.15) * intensity})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();
  }
}

function drawHalftone(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
): void {
  const spacing = 5;
  const maxRadius = 2.5 * intensity;
  const cx = panel.x + panel.width / 2;
  const cy = panel.y + panel.height / 2;
  const maxDist = Math.sqrt(panel.width ** 2 + panel.height ** 2) / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';

  for (let x = panel.x; x < panel.x + panel.width; x += spacing) {
    for (let y = panel.y; y < panel.y + panel.height; y += spacing) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = (dist / maxDist) * maxRadius;
      if (radius > 0.3) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawRadialBlur(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
): void {
  const cx = panel.x + panel.width / 2;
  const cy = panel.y + panel.height / 2;
  const maxR = Math.max(panel.width, panel.height) / 2;

  const gradient = ctx.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, `rgba(255, 255, 255, ${0.6 * intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  intensity: number,
): void {
  const cx = panel.x + panel.width / 2;
  const cy = panel.y + panel.height / 2;
  const maxR = Math.max(panel.width, panel.height) * 0.7;

  const gradient = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${0.5 * intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
}

// ============================================================
// Speech Bubbles
// ============================================================

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  panel: MangaPanel,
  bubble: SpeechBubble,
): void {
  const absX = panel.x + bubble.position.x * panel.width;
  const absY = panel.y + bubble.position.y * panel.height;
  const maxW = bubble.maxWidth ?? panel.width * 0.4;
  const fontSize = bubble.fontSize ?? CANVAS_DEFAULTS.bubbleFontSize;
  const padding = CANVAS_DEFAULTS.bubblePadding;

  // Measure text
  ctx.font = `${bubble.type === 'shout' ? 'bold ' : ''}${fontSize}px ${CANVAS_DEFAULTS.bubbleFontFamily}`;
  const lines = wrapText(ctx, bubble.text, maxW - padding * 2);
  const textW = Math.min(
    maxW,
    Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2,
  );
  const textH = lines.length * (fontSize * 1.3) + padding * 2;

  const bx = absX - textW / 2;
  const by = absY - textH / 2;

  ctx.save();

  switch (bubble.type) {
    case 'speech':
      drawRoundBubble(ctx, bx, by, textW, textH, bubble.tailDirection);
      break;
    case 'thought':
      drawThoughtBubble(ctx, bx, by, textW, textH);
      break;
    case 'shout':
      drawShoutBubble(ctx, bx, by, textW, textH);
      break;
    case 'narration':
      drawNarrationBox(ctx, bx, by, textW, textH);
      break;
    case 'whisper':
      drawWhisperBubble(ctx, bx, by, textW, textH);
      break;
  }

  // Draw text
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `${bubble.type === 'shout' ? 'bold ' : ''}${fontSize}px ${CANVAS_DEFAULTS.bubbleFontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    ctx.fillText(line, bx + textW / 2, by + padding + i * fontSize * 1.3);
  });

  ctx.restore();
}

function drawRoundBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tailDir?: string,
): void {
  const r = Math.min(12, w / 4, h / 4);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;

  // Bubble body
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Tail
  if (tailDir) {
    const tailX = tailDir.includes('left') ? x + w * 0.3 : x + w * 0.7;
    const tailY = tailDir.includes('bottom') ? y + h : y;
    const tipY = tailDir.includes('bottom') ? y + h + 15 : y - 15;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tailX - 8, tailY);
    ctx.lineTo(tailX + 8, tailY);
    ctx.lineTo(tailX + 2, tipY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cover the stroke where tail meets bubble
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tailX - 7, tailDir.includes('bottom') ? tailY - 2 : tailY, 14, 4);
  }
}

function drawThoughtBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;

  // Main ellipse
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Small trailing bubbles
  const dots = [
    { cx: x + w * 0.3, cy: y + h + 8, r: 5 },
    { cx: x + w * 0.2, cy: y + h + 18, r: 3 },
  ];
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.cx, dot.cy, dot.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawShoutBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2.5;

  const cx = x + w / 2;
  const cy = y + h / 2;
  const points = 12;
  const outerRx = w / 2 + 8;
  const outerRy = h / 2 + 8;
  const innerRx = w / 2 - 2;
  const innerRy = h / 2 - 2;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rx = i % 2 === 0 ? outerRx : innerRx;
    const ry = i % 2 === 0 ? outerRy : innerRy;
    const px = cx + Math.cos(angle) * rx;
    const py = cy + Math.sin(angle) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawNarrationBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;

  ctx.fillRect(x, y, w, h);

  // White text for narration
  ctx.fillStyle = '#ffffff';
}

function drawWhisperBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.setLineDash([]);
}

// ============================================================
// Text Utilities
// ============================================================

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length === 0 ? [text] : lines;
}

/**
 * Render a pre-generated image onto a specific panel.
 * Used after AI generation completes.
 */
export function renderImageToPanel(
  canvas: HTMLCanvasElement,
  panel: MangaPanel,
  imageDataUrl: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('No canvas context'));

    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(panel.x, panel.y, panel.width, panel.height);
      ctx.clip();

      // Cover-fit
      const scale = Math.max(panel.width / img.width, panel.height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = panel.x + (panel.width - drawW) / 2;
      const drawY = panel.y + (panel.height - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
      resolve();
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}
