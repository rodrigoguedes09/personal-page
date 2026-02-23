import type { UserProfile, MangaStyle, MangaPanel, PanelLayoutType, SpeechBubble } from '@/types';
import { MANGA_STYLE_PROMPTS, PANEL_SCENE_TEMPLATES, type PanelSceneType } from './constants';
import { uid } from './utils';

// ============================================================
// Prompt Engineering — Convert user data into manga prompts
// ============================================================

/**
 * Build the full prompt for a manga panel, combining:
 * - Style prefix/suffix from MANGA_STYLE_PROMPTS
 * - Scene template from PANEL_SCENE_TEMPLATES
 * - User-specific data interpolation
 */
export function buildPanelPrompt(
  scene: PanelSceneType,
  userProfile: UserProfile,
  style: MangaStyle,
  customModifier?: string,
): string {
  const styleConfig = MANGA_STYLE_PROMPTS[style];
  const sceneTemplate = PANEL_SCENE_TEMPLATES[scene];

  // Interpolate user data into template
  let prompt = sceneTemplate.template
    .replace(/\{\{name\}\}/g, userProfile.name || 'Developer')
    .replace(/\{\{bio\}\}/g, userProfile.bio || 'A passionate developer')
    .replace(/\{\{tech\}\}/g, userProfile.techStack.slice(0, 5).join(', ') || 'code')
    .replace(
      /\{\{project\}\}/g,
      userProfile.projects[0]?.name || 'My Awesome Project',
    );

  // Combine: style prefix + scene prompt + custom modifier + style suffix
  const parts = [styleConfig.prefix, prompt];
  if (customModifier) parts.push(customModifier);
  parts.push(styleConfig.suffix);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build the negative prompt for a style.
 */
export function buildNegativePrompt(style: MangaStyle, customNegative?: string): string {
  const base = MANGA_STYLE_PROMPTS[style].negative;
  const common =
    'blurry, bad anatomy, bad hands, text, watermark, low quality, deformed, disfigured, jpeg artifacts, ugly, duplicate, morbid, mutilated, poorly drawn face, extra fingers';
  return [common, base, customNegative].filter(Boolean).join(', ');
}

/**
 * Auto-select scenes based on the user profile content.
 * Returns an ordered list of scene types appropriate for the data.
 */
export function autoSelectScenes(
  userProfile: UserProfile,
  layoutType: PanelLayoutType,
): PanelSceneType[] {
  const panelCount = getPanelCountForLayout(layoutType);

  // Priority-ordered scene selection
  const scenes: PanelSceneType[] = ['hero'];

  if (userProfile.bio) scenes.push('bio');
  if (userProfile.techStack.length > 0) scenes.push('techStack');
  if (userProfile.projects.length > 0) scenes.push('project');

  // Fill remaining panels
  const extras: PanelSceneType[] = ['coding', 'battleReady', 'teamwork', 'finale'];
  for (const extra of extras) {
    if (scenes.length >= panelCount) break;
    if (!scenes.includes(extra)) scenes.push(extra);
  }

  // Ensure we have exactly the right number
  return scenes.slice(0, panelCount);
}

/**
 * Generate speech bubble content for a panel based on scene type and user data.
 */
export function generateBubbleText(
  scene: PanelSceneType,
  userProfile: UserProfile,
): SpeechBubble | undefined {
  const bubbleMap: Partial<Record<PanelSceneType, () => SpeechBubble>> = {
    hero: () => ({
      text: `I'm ${userProfile.name || 'Developer'}!`,
      type: 'shout',
      position: { x: 0.7, y: 0.15 },
      tailDirection: 'bottom-left',
    }),
    bio: () => ({
      text: userProfile.bio.length > 60 ? userProfile.bio.slice(0, 57) + '...' : userProfile.bio,
      type: 'narration',
      position: { x: 0.5, y: 0.1 },
    }),
    techStack: () => ({
      text: `My weapons: ${userProfile.techStack.slice(0, 3).join(', ')}!`,
      type: 'speech',
      position: { x: 0.65, y: 0.2 },
      tailDirection: 'bottom-left',
    }),
    project: () => ({
      text: `Check out ${userProfile.projects[0]?.name || 'my project'}!`,
      type: 'speech',
      position: { x: 0.6, y: 0.15 },
      tailDirection: 'bottom-left',
    }),
    coding: () => ({
      text: 'Time to code!',
      type: 'thought',
      position: { x: 0.7, y: 0.1 },
    }),
    battleReady: () => ({
      text: 'IKUZO!!',
      type: 'shout',
      position: { x: 0.5, y: 0.12 },
    }),
    finale: () => ({
      text: 'Follow me on GitHub!',
      type: 'speech',
      position: { x: 0.6, y: 0.2 },
      tailDirection: 'bottom-left',
    }),
  };

  const factory = bubbleMap[scene];
  return factory ? factory() : undefined;
}

/**
 * Generate a full set of panels for a layout.
 * Combines scene selection, prompt building, and speech bubble generation.
 */
export function generatePanelPrompts(
  userProfile: UserProfile,
  style: MangaStyle,
  layoutType: PanelLayoutType,
): Omit<MangaPanel, 'x' | 'y' | 'width' | 'height'>[] {
  const scenes = autoSelectScenes(userProfile, layoutType);

  return scenes.map((scene) => ({
    id: uid(),
    prompt: buildPanelPrompt(scene, userProfile, style),
    speechBubble: generateBubbleText(scene, userProfile),
    label: PANEL_SCENE_TEMPLATES[scene].label,
    effects: getDefaultEffects(scene),
  }));
}

// ============================================================
// Helpers
// ============================================================

function getPanelCountForLayout(layout: PanelLayoutType): number {
  const counts: Record<PanelLayoutType, number> = {
    '2x2': 4,
    '3x1': 3,
    '1-2-1': 4,
    'hero': 1,
    'action': 5,
    'comic-strip': 4,
    'profile': 3,
  };
  return counts[layout] ?? 4;
}

function getDefaultEffects(scene: PanelSceneType) {
  const effects: Record<PanelSceneType, MangaPanel['effects']> = {
    hero: [{ type: 'speedlines', intensity: 0.6 }],
    coding: [{ type: 'screentone', intensity: 0.3 }],
    techStack: [{ type: 'sparkle', intensity: 0.5 }],
    project: [{ type: 'impact', intensity: 0.4 }],
    bio: [{ type: 'screentone', intensity: 0.2 }],
    battleReady: [
      { type: 'speedlines', intensity: 0.8 },
      { type: 'impact', intensity: 0.6 },
    ],
    teamwork: [{ type: 'sparkle', intensity: 0.4 }],
    finale: [
      { type: 'speedlines', intensity: 0.5 },
      { type: 'sparkle', intensity: 0.7 },
    ],
  };
  return effects[scene] ?? [];
}
