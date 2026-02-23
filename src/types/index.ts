// ============================================================
// MangaREADME Generator — Core Type Definitions
// ============================================================

/** User profile data used to generate manga panels */
export interface UserProfile {
  name: string;
  title?: string;
  bio: string;
  avatar?: string;
  techStack: string[];
  projects: Project[];
  socialLinks?: SocialLinks;
}

export interface Project {
  name: string;
  description: string;
  url?: string;
  techStack?: string[];
}

export interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

// ============================================================
// Manga Style & Layout
// ============================================================

/** Available manga visual styles */
export type MangaStyle =
  | 'shonen'   // Bold, action-oriented (Naruto, One Piece)
  | 'shojo'    // Soft, decorative (Sailor Moon)
  | 'seinen'   // Detailed, realistic (Berserk, Vagabond)
  | 'chibi'    // Cute, super-deformed
  | 'cyberpunk'; // Futuristic tech style (Akira, Ghost in the Shell)

/** Panel layout presets */
export type PanelLayoutType =
  | '2x2'         // Classic 2x2 grid
  | '3x1'         // 3 horizontal panels
  | '1-2-1'       // Hero + 2 side + bottom
  | 'hero'        // One large hero panel
  | 'action'      // Dynamic irregular panels
  | 'comic-strip' // Horizontal strip (3-4 panels)
  | 'profile';    // Profile-focused layout

/** A single manga panel with position, content, and effects */
export interface MangaPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  prompt: string;
  imageData?: ImageData;
  imageUrl?: string;
  speechBubble?: SpeechBubble;
  effects?: PanelEffect[];
  label?: string;
  zIndex?: number;
}

/** Speech bubble types and configuration */
export interface SpeechBubble {
  text: string;
  type: 'speech' | 'thought' | 'shout' | 'narration' | 'whisper';
  position: { x: number; y: number };
  tailDirection?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  fontSize?: number;
  maxWidth?: number;
}

/** Visual effects that can be applied to panels */
export interface PanelEffect {
  type: 'speedlines' | 'screentone' | 'sparkle' | 'impact' | 'halftone' | 'radial-blur' | 'vignette';
  intensity: number; // 0-1
  direction?: number; // degrees
}

// ============================================================
// AI Generation Configuration
// ============================================================

/** Generation mode — local (private, in-browser) or API (fast, server-side) */
export type GenerationMode = 'local' | 'api';

/** Parameters for the Stable Diffusion generation */
export interface GenerationConfig {
  steps: number;
  guidanceScale: number;
  width: number;
  height: number;
  seed?: number;
  style: MangaStyle;
  negativePrompt?: string;
  strength?: number; // For img2img
  batchSize?: number;
}

/** Available AI model (works for both local ONNX and API models) */
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  mode: GenerationMode;
  // Local-specific
  size?: string;
  // API-specific
  defaultSteps?: number;
  defaultCfg?: number;
  maxResolution?: number;
}

/** Generation status for tracking API calls */
export interface GenerationStatus {
  status: 'idle' | 'generating' | 'error';
  currentPanel: number;
  totalPanels: number;
  currentStatus?: string;
  error?: string;
}

// ============================================================
// Local Model (Worker-based)
// ============================================================

/** Progress updates while downloading/loading a local model */
export interface ModelLoadProgress {
  status: 'idle' | 'initializing' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
  file?: string;
  loaded?: number;
  total?: number;
}

/** Messages sent TO the Stable Diffusion Web Worker */
export type WorkerInMessage =
  | { type: 'init' }
  | { type: 'load-model'; modelId: string; device?: 'webgpu' | 'wasm' }
  | { type: 'generate'; prompt: string; negativePrompt?: string; config: GenerationConfig }
  | { type: 'cancel' };

/** Messages sent FROM the Stable Diffusion Web Worker */
export type WorkerOutMessage =
  | { type: 'init-complete' }
  | { type: 'model-progress'; progress: ModelLoadProgress }
  | { type: 'model-ready'; modelId: string }
  | { type: 'generation-progress'; step: number; totalSteps: number; imagePreview?: string }
  | { type: 'generation-complete'; imageDataUrl: string }
  | { type: 'error'; error: string; context?: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

// ============================================================
// WebGPU
// ============================================================

export interface WebGPUStatus {
  supported: boolean;
  available: boolean;
  adapterName?: string;
  adapterVendor?: string;
  architecture?: string;
  deviceDescription?: string;
  maxBufferSize?: number;
  maxComputeWorkgroupSize?: number[];
  features?: string[];
  error?: string;
}

// ============================================================
// Generation Pipeline
// ============================================================

export interface GenerationResult {
  panelId: string;
  imageDataUrl: string;
  width: number;
  height: number;
  prompt: string;
  seed: number;
  timestamp: number;
}

export interface GenerationJob {
  id: string;
  panelId: string;
  prompt: string;
  config: GenerationConfig;
  status: 'queued' | 'running' | 'complete' | 'error' | 'cancelled';
  progress: number;
  result?: GenerationResult;
  error?: string;
}

// ============================================================
// Export
// ============================================================

export interface ExportConfig {
  format: 'png' | 'markdown' | 'both';
  width: number;
  height: number;
  quality: number;
  includeCredits: boolean;
  fileName?: string;
}

export interface ExportResult {
  dataUrl?: string;
  markdown?: string;
  blob?: Blob;
}

// ============================================================
// App State
// ============================================================

export interface AppState {
  // User data
  userProfile: UserProfile;

  // Generation
  style: MangaStyle;
  layoutType: PanelLayoutType;
  panels: MangaPanel[];
  generationConfig: GenerationConfig;
  jobs: GenerationJob[];

  // Model / Generation Mode
  generationMode: GenerationMode;
  selectedModel: string;
  generationStatus: GenerationStatus;
  modelStatus: ModelLoadProgress;

  // WebGPU (informational)
  webgpuStatus: WebGPUStatus;

  // UI
  currentStep: 'input' | 'customize' | 'generate' | 'export';
  isGenerating: boolean;
  showAdvanced: boolean;
}
