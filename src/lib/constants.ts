import type { ModelConfig, GenerationConfig, MangaStyle, GenerationMode } from '@/types';

// ============================================================
// Application Constants
// ============================================================

export const APP_NAME = 'MangaREADME Generator';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION =
  'Generate manga-style README images for GitHub using AI';

// ============================================================
// Generation Mode Defaults
// ============================================================

export const DEFAULT_GENERATION_MODE: GenerationMode = 'local';

// ============================================================
// Model Registry
// ============================================================

/**
 * Local models — downloaded once, run entirely in-browser via Transformers.js.
 * Maximum privacy: no data leaves the user's machine after the initial download.
 */
export const LOCAL_MODELS: ModelConfig[] = [
  {
    id: 'onnx-community/stable-diffusion-3.5-medium',
    name: 'SD 3.5 Medium (Local)',
    description: 'Community ONNX model for in-browser generation (~2.8 GB download)',
    isDefault: true,
    mode: 'local',
    size: '~2.8 GB',
  },
  {
    id: 'Xenova/stable-diffusion-v1-5',
    name: 'SD 1.5 (Local)',
    description: 'Classic SD 1.5 converted to ONNX (~1.7 GB download)',
    isDefault: false,
    mode: 'local',
    size: '~1.7 GB',
  },
];

/**
 * API models — no downloads, runs on HuggingFace Inference API servers.
 * Requires internet; optional token for higher rate limits.
 */
export const API_MODELS: ModelConfig[] = [
  {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    name: 'SDXL 1.0 (API)',
    description: 'High quality, detailed images (recommended)',
    isDefault: true,
    mode: 'api',
    defaultSteps: 30,
    defaultCfg: 7.5,
    maxResolution: 1024,
  },
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5 (API)',
    description: 'Classic model, fast and reliable',
    isDefault: false,
    mode: 'api',
    defaultSteps: 25,
    defaultCfg: 7.5,
    maxResolution: 768,
  },
  {
    id: 'stabilityai/stable-diffusion-2-1',
    name: 'Stable Diffusion 2.1 (API)',
    description: 'Improved quality over 1.5, good for detailed scenes',
    isDefault: false,
    mode: 'api',
    defaultSteps: 30,
    defaultCfg: 7.5,
    maxResolution: 768,
  },
];

/** All models combined */
export const AVAILABLE_MODELS: ModelConfig[] = [...LOCAL_MODELS, ...API_MODELS];

/** Get the default model ID for a given mode */
export function getDefaultModelId(mode: GenerationMode): string {
  const models = mode === 'local' ? LOCAL_MODELS : API_MODELS;
  return models.find((m) => m.isDefault)?.id ?? models[0].id;
}

/** Get models filtered by generation mode */
export function getModelsForMode(mode: GenerationMode): ModelConfig[] {
  return mode === 'local' ? LOCAL_MODELS : API_MODELS;
}

export const DEFAULT_MODEL_ID = getDefaultModelId(DEFAULT_GENERATION_MODE);

// ============================================================
// Generation Defaults
// ============================================================

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  steps: 30,
  guidanceScale: 7.5,
  width: 512,
  height: 512,
  style: 'shonen',
  negativePrompt:
    'blurry, bad anatomy, bad hands, text, watermark, low quality, deformed, disfigured, jpeg artifacts, ugly, duplicate, morbid, mutilated',
};

export const GENERATION_PRESETS: Record<string, Partial<GenerationConfig>> = {
  fast: { steps: 15, width: 512, height: 512, guidanceScale: 7.0 },
  balanced: { steps: 30, width: 512, height: 512, guidanceScale: 7.5 },
  quality: { steps: 40, width: 768, height: 768, guidanceScale: 8.0 },
};

// ============================================================
// Manga Style Prompts & Tokens
// ============================================================

/**
 * Base prompt modifiers for each manga style.
 * These are prepended/appended to user-generated prompts.
 */
export const MANGA_STYLE_PROMPTS: Record<MangaStyle, { prefix: string; suffix: string; negative: string }> = {
  shonen: {
    prefix: 'manga style, shonen manga, bold linework, dynamic composition, action pose,',
    suffix: ', high contrast, screentone shading, Japanese manga, black and white manga, detailed manga art, ink drawing',
    negative: 'photorealistic, 3d render, western comic style, watercolor',
  },
  shojo: {
    prefix: 'manga style, shojo manga, delicate linework, sparkling eyes, flowers,',
    suffix: ', soft shading, beautiful, elegant, Japanese manga, screentone, flowery background, bishoujo style',
    negative: 'dark, gritty, horror, violence, masculine',
  },
  seinen: {
    prefix: 'manga style, seinen manga, highly detailed, realistic proportions, mature,',
    suffix: ', intricate linework, crosshatching, Japanese manga, detailed background, dramatic lighting, pen and ink',
    negative: 'cute, childish, simple, cartoony, chibi',
  },
  chibi: {
    prefix: 'chibi manga style, super deformed, cute, big head, small body,',
    suffix: ', adorable, kawaii, simple background, manga screentone, Japanese manga style, clean lines',
    negative: 'realistic proportions, detailed, horror, dark, mature',
  },
  cyberpunk: {
    prefix: 'cyberpunk manga style, futuristic, neon accents, tech aesthetic,',
    suffix: ', circuit patterns, holographic, Japanese manga, detailed linework, sci-fi manga, Akira style, Ghost in the Shell style',
    negative: 'medieval, fantasy, nature, pastoral, vintage',
  },
};

// ============================================================
// Panel Scene Templates
// ============================================================

/**
 * Templates for generating prompts based on user profile data.
 * Each template maps a "scene" type to a prompt pattern.
 * `{{name}}`, `{{tech}}`, `{{project}}`, `{{bio}}` are interpolated.
 */
export const PANEL_SCENE_TEMPLATES = {
  hero: {
    label: 'Hero Introduction',
    template:
      'a manga protagonist standing confidently, name tag reading "{{name}}", dramatic entrance pose, full body shot, wind blowing',
  },
  coding: {
    label: 'Coding Scene',
    template:
      'a manga character coding intensely at a computer, multiple monitors showing code, {{tech}} logos floating around, concentrated expression, dramatic lighting',
  },
  techStack: {
    label: 'Tech Arsenal',
    template:
      'manga action scene, character surrounded by floating technology icons: {{tech}}, power-up aura, dramatic panel composition',
  },
  project: {
    label: 'Project Showcase',
    template:
      'a manga character proudly presenting a glowing project hologram labeled "{{project}}", excited expression, sparkle effects',
  },
  bio: {
    label: 'Character Bio',
    template:
      'manga character portrait, thoughtful expression, text overlay area, {{bio}}, clean composition for text overlay',
  },
  battleReady: {
    label: 'Battle Ready',
    template:
      'manga character in battle stance surrounded by weapons made of programming languages: {{tech}}, energy aura, intense eyes, action lines',
  },
  teamwork: {
    label: 'Open Source',
    template:
      'manga scene of multiple characters collaborating, open source community, hands joining together, motivational, teamwork panel',
  },
  finale: {
    label: 'Grand Finale',
    template:
      'manga final panel, {{name}} with confident smile and thumbs up, "Follow me!" speech bubble area, dramatic background, concluding shot',
  },
} as const;

export type PanelSceneType = keyof typeof PANEL_SCENE_TEMPLATES;

// ============================================================
// Canvas & Export
// ============================================================

export const CANVAS_DEFAULTS = {
  width: 1200,
  height: 630, // GitHub README social preview size
  panelBorderWidth: 3,
  panelBorderColor: '#1a1a1a',
  panelGap: 6,
  panelBorderRadius: 2,
  backgroundColor: '#ffffff',
  fontFamily: 'Bangers, Impact, sans-serif',
  bubbleFontFamily: 'Comic Sans MS, Bangers, sans-serif',
  bubbleFontSize: 14,
  bubblePadding: 12,
};

export const EXPORT_SIZES = {
  'github-social': { width: 1280, height: 640, label: 'GitHub Social Preview (1280x640)' },
  'github-readme': { width: 1200, height: 630, label: 'README Banner (1200x630)' },
  'wide': { width: 1920, height: 640, label: 'Wide Banner (1920x640)' },
  'square': { width: 1024, height: 1024, label: 'Square (1024x1024)' },
  'manga-page': { width: 800, height: 1200, label: 'Manga Page (800x1200)' },
} as const;

export type ExportSizeKey = keyof typeof EXPORT_SIZES;

// ============================================================
// Speech Bubble Presets
// ============================================================

export const SPEECH_BUBBLE_PRESETS = {
  greeting: ['Hello World!', "I'm {{name}}!", 'Welcome to my profile!', 'Yoroshiku!'],
  coding: ['Time to code!', 'npm install...', 'git push!', 'Bug found!', 'Pull request merged!'],
  excitement: ['SUGOI!', 'NANI?!', 'Incredible!', 'Let\'s GO!', 'YATTA!'],
  thought: ['Hmm...', 'I wonder...', 'What if...', 'Let me think...'],
  techStack: ['My weapons of choice!', 'Power level: MAXIMUM!', 'Tech Arsenal: Ready!'],
};

// ============================================================
// WebGPU Requirements
// ============================================================

export const WEBGPU_MIN_REQUIREMENTS = {
  minBufferSize: 256 * 1024 * 1024, // 256 MB
  requiredFeatures: [] as string[],
  recommendedVRAM: 2048, // 2 GB
};
