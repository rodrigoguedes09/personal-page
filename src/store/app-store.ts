import { create } from 'zustand';
import type {
  AppState,
  UserProfile,
  MangaStyle,
  PanelLayoutType,
  MangaPanel,
  GenerationConfig,
  GenerationJob,
  ModelLoadProgress,
  WebGPUStatus,
} from '@/types';
import { DEFAULT_GENERATION_CONFIG, DEFAULT_MODEL_ID } from '@/lib/constants';

// ============================================================
// Application Store (Zustand)
// ============================================================

interface AppActions {
  // User profile
  setUserProfile: (profile: Partial<UserProfile>) => void;
  resetUserProfile: () => void;

  // Style & Layout
  setStyle: (style: MangaStyle) => void;
  setLayoutType: (layout: PanelLayoutType) => void;

  // Panels
  setPanels: (panels: MangaPanel[]) => void;
  updatePanel: (panelId: string, updates: Partial<MangaPanel>) => void;
  updatePanelImage: (panelId: string, imageUrl: string) => void;

  // Generation
  setGenerationConfig: (config: Partial<GenerationConfig>) => void;
  addJob: (job: GenerationJob) => void;
  updateJob: (jobId: string, updates: Partial<GenerationJob>) => void;
  removeJob: (jobId: string) => void;
  clearJobs: () => void;

  // Model
  setModelStatus: (status: ModelLoadProgress) => void;
  setSelectedModel: (modelId: string) => void;

  // WebGPU
  setWebGPUStatus: (status: WebGPUStatus) => void;

  // UI navigation
  setCurrentStep: (step: AppState['currentStep']) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setShowAdvanced: (show: boolean) => void;

  // Batch
  reset: () => void;
}

const DEFAULT_USER_PROFILE: UserProfile = {
  name: '',
  title: '',
  bio: '',
  techStack: [],
  projects: [],
  socialLinks: {},
};

const INITIAL_STATE: AppState = {
  userProfile: DEFAULT_USER_PROFILE,
  style: 'shonen',
  layoutType: '2x2',
  panels: [],
  generationConfig: DEFAULT_GENERATION_CONFIG,
  jobs: [],
  modelStatus: {
    status: 'idle',
    progress: 0,
    loadedFiles: 0,
    totalFiles: 4,
  },
  selectedModel: DEFAULT_MODEL_ID,
  webgpuStatus: {
    supported: false,
    available: false,
  },
  currentStep: 'input',
  isGenerating: false,
  showAdvanced: false,
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...INITIAL_STATE,

  // ---- User Profile ----
  setUserProfile: (profile) =>
    set((state) => ({
      userProfile: { ...state.userProfile, ...profile },
    })),

  resetUserProfile: () =>
    set({ userProfile: DEFAULT_USER_PROFILE }),

  // ---- Style ----
  setStyle: (style) =>
    set({ style }),

  setLayoutType: (layoutType) =>
    set({ layoutType }),

  // ---- Panels ----
  setPanels: (panels) =>
    set({ panels }),

  updatePanel: (panelId, updates) =>
    set((state) => ({
      panels: state.panels.map((p) =>
        p.id === panelId ? { ...p, ...updates } : p,
      ),
    })),

  updatePanelImage: (panelId, imageUrl) =>
    set((state) => ({
      panels: state.panels.map((p) =>
        p.id === panelId ? { ...p, imageUrl } : p,
      ),
    })),

  // ---- Generation ----
  setGenerationConfig: (config) =>
    set((state) => ({
      generationConfig: { ...state.generationConfig, ...config },
    })),

  addJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, job],
    })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, ...updates } : j,
      ),
    })),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
    })),

  clearJobs: () =>
    set({ jobs: [] }),

  // ---- Model ----
  setModelStatus: (modelStatus) =>
    set({ modelStatus }),

  setSelectedModel: (selectedModel) =>
    set({ selectedModel }),

  // ---- WebGPU ----
  setWebGPUStatus: (webgpuStatus) =>
    set({ webgpuStatus }),

  // ---- UI ----
  setCurrentStep: (currentStep) =>
    set({ currentStep }),

  setIsGenerating: (isGenerating) =>
    set({ isGenerating }),

  setShowAdvanced: (showAdvanced) =>
    set({ showAdvanced }),

  // ---- Reset ----
  reset: () =>
    set(INITIAL_STATE),
}));
