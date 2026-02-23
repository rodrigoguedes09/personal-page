import type { MangaPanel, PanelLayoutType } from '@/types';
import { CANVAS_DEFAULTS } from './constants';

// ============================================================
// Manga Panel Layout Engine
// ============================================================

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
}

/**
 * Calculate panel positions for a given layout type.
 * All values are in pixels relative to the canvas dimensions.
 */
export function calculatePanelLayout(
  layoutType: PanelLayoutType,
  canvasWidth: number = CANVAS_DEFAULTS.width,
  canvasHeight: number = CANVAS_DEFAULTS.height,
  gap: number = CANVAS_DEFAULTS.panelGap,
): LayoutRect[] {
  const layoutFn = LAYOUT_CALCULATORS[layoutType];
  if (!layoutFn) {
    console.warn(`Unknown layout type: ${layoutType}, falling back to 2x2`);
    return LAYOUT_CALCULATORS['2x2'](canvasWidth, canvasHeight, gap);
  }
  return layoutFn(canvasWidth, canvasHeight, gap);
}

/**
 * Merge layout positions with panel data.
 */
export function applyLayoutToPanels(
  panels: Omit<MangaPanel, 'x' | 'y' | 'width' | 'height'>[],
  layoutType: PanelLayoutType,
  canvasWidth?: number,
  canvasHeight?: number,
): MangaPanel[] {
  const rects = calculatePanelLayout(layoutType, canvasWidth, canvasHeight);

  return panels.map((panel, i) => ({
    ...panel,
    x: rects[i]?.x ?? 0,
    y: rects[i]?.y ?? 0,
    width: rects[i]?.width ?? canvasWidth ?? CANVAS_DEFAULTS.width,
    height: rects[i]?.height ?? canvasHeight ?? CANVAS_DEFAULTS.height,
    rotation: rects[i]?.rotation,
    zIndex: rects[i]?.zIndex ?? i,
  }));
}

// ============================================================
// Layout Calculators
// ============================================================

const LAYOUT_CALCULATORS: Record<
  PanelLayoutType,
  (w: number, h: number, gap: number) => LayoutRect[]
> = {
  /**
   * Classic 2×2 grid — 4 equal panels
   * ┌───┬───┐
   * │ 1 │ 2 │
   * ├───┼───┤
   * │ 3 │ 4 │
   * └───┴───┘
   */
  '2x2': (w, h, gap) => {
    const pw = (w - gap * 3) / 2;
    const ph = (h - gap * 3) / 2;
    return [
      { x: gap, y: gap, width: pw, height: ph },
      { x: pw + gap * 2, y: gap, width: pw, height: ph },
      { x: gap, y: ph + gap * 2, width: pw, height: ph },
      { x: pw + gap * 2, y: ph + gap * 2, width: pw, height: ph },
    ];
  },

  /**
   * Three horizontal panels
   * ┌─────┐
   * │  1  │
   * ├─────┤
   * │  2  │
   * ├─────┤
   * │  3  │
   * └─────┘
   */
  '3x1': (w, h, gap) => {
    const pw = w - gap * 2;
    const ph = (h - gap * 4) / 3;
    return [
      { x: gap, y: gap, width: pw, height: ph },
      { x: gap, y: ph + gap * 2, width: pw, height: ph },
      { x: gap, y: (ph + gap) * 2 + gap, width: pw, height: ph },
    ];
  },

  /**
   * Hero + 2 side + bottom
   * ┌─────────┐
   * │    1    │
   * ├────┬────┤
   * │ 2  │ 3  │
   * ├────┴────┤
   * │    4    │
   * └─────────┘
   */
  '1-2-1': (w, h, gap) => {
    const fullW = w - gap * 2;
    const halfW = (w - gap * 3) / 2;
    const topH = h * 0.35 - gap;
    const midH = h * 0.35 - gap;
    const botH = h * 0.3 - gap;
    return [
      { x: gap, y: gap, width: fullW, height: topH },
      { x: gap, y: topH + gap * 2, width: halfW, height: midH },
      { x: halfW + gap * 2, y: topH + gap * 2, width: halfW, height: midH },
      { x: gap, y: topH + midH + gap * 3, width: fullW, height: botH },
    ];
  },

  /**
   * Single hero panel — full canvas
   * ┌───────────┐
   * │           │
   * │   HERO    │
   * │           │
   * └───────────┘
   */
  hero: (w, h, gap) => [
    { x: gap, y: gap, width: w - gap * 2, height: h - gap * 2 },
  ],

  /**
   * Dynamic action layout — irregular panels with slight rotation
   * ┌────┬──────┐
   * │ 1  │  2   │
   * ├──┬─┴──┬───┤
   * │3 │  4  │ 5│
   * └──┴────┴───┘
   */
  action: (w, h, gap) => {
    const topH = h * 0.48 - gap;
    const botH = h * 0.52 - gap;
    return [
      { x: gap, y: gap, width: w * 0.38 - gap, height: topH, rotation: -0.5, zIndex: 1 },
      { x: w * 0.38 + gap, y: gap, width: w * 0.62 - gap * 2, height: topH, rotation: 0.3, zIndex: 0 },
      { x: gap, y: topH + gap * 2, width: w * 0.25 - gap, height: botH, rotation: 0.5, zIndex: 2 },
      { x: w * 0.25 + gap, y: topH + gap * 2, width: w * 0.42 - gap, height: botH, rotation: -0.3, zIndex: 3 },
      { x: w * 0.67 + gap, y: topH + gap * 2, width: w * 0.33 - gap * 2, height: botH, rotation: 0.4, zIndex: 1 },
    ];
  },

  /**
   * Horizontal comic strip — 4 panels in a row
   * ┌──┬──┬──┬──┐
   * │1 │2 │3 │4 │
   * └──┴──┴──┴──┘
   */
  'comic-strip': (w, h, gap) => {
    const pw = (w - gap * 5) / 4;
    const ph = h - gap * 2;
    return [
      { x: gap, y: gap, width: pw, height: ph },
      { x: pw + gap * 2, y: gap, width: pw, height: ph },
      { x: (pw + gap) * 2 + gap, y: gap, width: pw, height: ph },
      { x: (pw + gap) * 3 + gap, y: gap, width: pw, height: ph },
    ];
  },

  /**
   * Profile-focused layout — large left portrait + right info panels
   * ┌──────┬─────┐
   * │      │  2  │
   * │  1   ├─────┤
   * │      │  3  │
   * └──────┴─────┘
   */
  profile: (w, h, gap) => {
    const leftW = w * 0.55 - gap;
    const rightW = w * 0.45 - gap * 2;
    const halfH = (h - gap * 3) / 2;
    return [
      { x: gap, y: gap, width: leftW, height: h - gap * 2 },
      { x: leftW + gap * 2, y: gap, width: rightW, height: halfH },
      { x: leftW + gap * 2, y: halfH + gap * 2, width: rightW, height: halfH },
    ];
  },
};

/**
 * Get the panel count for a layout type.
 */
export function getPanelCount(layoutType: PanelLayoutType): number {
  const rects = calculatePanelLayout(layoutType, 1200, 630);
  return rects.length;
}

/**
 * Get layout display name and description.
 */
export function getLayoutInfo(layoutType: PanelLayoutType): { name: string; description: string; icon: string } {
  const info: Record<PanelLayoutType, { name: string; description: string; icon: string }> = {
    '2x2': { name: '2×2 Grid', description: 'Classic 4-panel grid', icon: '⊞' },
    '3x1': { name: '3 Rows', description: 'Three horizontal panels', icon: '☰' },
    '1-2-1': { name: 'Hero Split', description: 'Hero + 2 side panels + footer', icon: '⊟' },
    hero: { name: 'Hero', description: 'Single full-canvas panel', icon: '□' },
    action: { name: 'Action', description: 'Dynamic irregular panels', icon: '⚡' },
    'comic-strip': { name: 'Strip', description: 'Horizontal 4-panel strip', icon: '▬' },
    profile: { name: 'Profile', description: 'Portrait + info panels', icon: '👤' },
  };
  return info[layoutType] ?? { name: layoutType, description: '', icon: '?' };
}
