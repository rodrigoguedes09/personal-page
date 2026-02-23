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

/** Available AI models */
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  size: string;
  quantization: 'fp32' | 'fp16' | 'int8' | 'q4' | 'q8';
  isDefault: boolean;
  components: ModelComponent[];
  minVRAM?: number; // MB
}

export interface ModelComponent {
  name: string;
  subfolder: string;
  filename: string;
  sizeBytes: number;
}

/** Real-time model loading progress */
export interface ModelLoadProgress {
  status: 'idle' | 'checking' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0-100
  currentFile?: string;
  loadedFiles: number;
  totalFiles: number;
  totalSizeBytes?: number;
  downloadedBytes?: number;
  error?: string;
  cached?: boolean;
}

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
// Worker Messages
// ============================================================

export type WorkerInMessage =
  | { type: 'init'; config?: Record<string, unknown> }
  | { type: 'load-model'; modelId: string; quantization: string; device: string }
  | { type: 'generate'; jobId: string; prompt: string; negativePrompt?: string; config: GenerationConfig }
  | { type: 'cancel'; jobId: string };

export type WorkerOutMessage =
  | { type: 'init-complete' }
  | { type: 'model-progress'; progress: ModelLoadProgress }
  | { type: 'model-ready' }
  | { type: 'generation-progress'; jobId: string; step: number; totalSteps: number; latentPreviewUrl?: string }
  | { type: 'generation-complete'; jobId: string; imageDataUrl: string; width: number; height: number; seed: number }
  | { type: 'error'; jobId?: string; message: string; stack?: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

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

  // Model
  modelStatus: ModelLoadProgress;
  selectedModel: string;

  // WebGPU
  webgpuStatus: WebGPUStatus;

  // UI
  currentStep: 'input' | 'customize' | 'generate' | 'export';
  isGenerating: boolean;
  showAdvanced: boolean;
}
