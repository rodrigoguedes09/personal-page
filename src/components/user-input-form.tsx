'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { MangaStyle, PanelLayoutType, Project } from '@/types';
import { MANGA_STYLE_PROMPTS } from '@/lib/constants';
import { getLayoutInfo } from '@/lib/manga-layout';
import { cn } from '@/lib/utils';

const LAYOUT_OPTIONS: PanelLayoutType[] = ['2x2', '3x1', '1-2-1', 'hero', 'action', 'comic-strip', 'profile'];
const STYLE_OPTIONS: MangaStyle[] = ['shonen', 'shojo', 'seinen', 'chibi', 'cyberpunk'];
const POPULAR_TECHS = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C#', 'C++',
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Node.js', 'Deno', 'Bun',
  'TailwindCSS', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Linux', 'Git', 'GraphQL', 'REST', 'WebAssembly',
];

export function UserInputForm() {
  const {
    userProfile,
    style,
    layoutType,
    setUserProfile,
    setStyle,
    setLayoutType,
    setCurrentStep,
  } = useAppStore();

  const [techInput, setTechInput] = useState('');
  const [projects, setProjects] = useState<Project[]>(
    userProfile.projects.length > 0 ? userProfile.projects : [{ name: '', description: '' }],
  );

  // ---- Tech Stack ----
  const addTech = useCallback(
    (tech: string) => {
      const trimmed = tech.trim();
      if (trimmed && !userProfile.techStack.includes(trimmed)) {
        setUserProfile({ techStack: [...userProfile.techStack, trimmed] });
      }
      setTechInput('');
    },
    [userProfile.techStack, setUserProfile],
  );

  const removeTech = useCallback(
    (tech: string) => {
      setUserProfile({
        techStack: userProfile.techStack.filter((t) => t !== tech),
      });
    },
    [userProfile.techStack, setUserProfile],
  );

  // ---- Projects ----
  const updateProject = useCallback(
    (index: number, field: keyof Project, value: string) => {
      const updated = [...projects];
      updated[index] = { ...updated[index], [field]: value };
      setProjects(updated);
      setUserProfile({ projects: updated.filter((p) => p.name.trim()) });
    },
    [projects, setUserProfile],
  );

  const addProject = useCallback(() => {
    if (projects.length < 4) {
      setProjects([...projects, { name: '', description: '' }]);
    }
  }, [projects]);

  const removeProject = useCallback(
    (index: number) => {
      const updated = projects.filter((_, i) => i !== index);
      setProjects(updated.length === 0 ? [{ name: '', description: '' }] : updated);
      setUserProfile({ projects: updated.filter((p) => p.name.trim()) });
    },
    [projects, setUserProfile],
  );

  // ---- Validation ----
  const isValid = userProfile.name.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* ============ Personal Info ============ */}
      <section>
        <h3 className="mb-3 font-manga text-lg tracking-wide text-manga-black">
          Personal Info
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
              Name *
            </label>
            <input
              type="text"
              value={userProfile.name}
              onChange={(e) => setUserProfile({ name: e.target.value })}
              placeholder="Your name or username"
              className={cn(
                'w-full rounded-sm border-2 border-manga-black px-3 py-2',
                'text-sm font-medium placeholder:text-manga-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-manga-blue',
              )}
            />
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
              Title
            </label>
            <input
              type="text"
              value={userProfile.title ?? ''}
              onChange={(e) => setUserProfile({ title: e.target.value })}
              placeholder="e.g. Full-Stack Developer"
              className={cn(
                'w-full rounded-sm border-2 border-manga-black px-3 py-2',
                'text-sm font-medium placeholder:text-manga-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-manga-blue',
              )}
            />
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-manga-gray-500">
            Bio
          </label>
          <textarea
            value={userProfile.bio}
            onChange={(e) => setUserProfile({ bio: e.target.value })}
            placeholder="Tell us about yourself in 1-2 sentences..."
            rows={2}
            maxLength={200}
            className={cn(
              'w-full resize-none rounded-sm border-2 border-manga-black px-3 py-2',
              'text-sm font-medium placeholder:text-manga-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-manga-blue',
            )}
          />
          <p className="text-right text-[10px] text-manga-gray-400">
            {userProfile.bio.length}/200
          </p>
        </div>
      </section>

      {/* ============ Tech Stack ============ */}
      <section>
        <h3 className="mb-3 font-manga text-lg tracking-wide text-manga-black">
          Tech Stack
        </h3>

        {/* Selected techs */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {userProfile.techStack.map((tech) => (
            <button
              key={tech}
              onClick={() => removeTech(tech)}
              className={cn(
                'inline-flex items-center gap-1 rounded-sm border-2 border-manga-black px-2 py-0.5',
                'text-xs font-bold text-manga-black',
                'bg-manga-gold/30 transition-colors hover:bg-red-100',
              )}
              title={`Remove ${tech}`}
            >
              {tech}
              <span className="text-manga-gray-400">×</span>
            </button>
          ))}
          {userProfile.techStack.length === 0 && (
            <p className="text-xs italic text-manga-gray-400">
              Click below or type to add technologies
            </p>
          )}
        </div>

        {/* Tech input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && techInput.trim()) {
                e.preventDefault();
                addTech(techInput);
              }
            }}
            placeholder="Type a technology..."
            className={cn(
              'flex-1 rounded-sm border-2 border-manga-black px-3 py-1.5',
              'text-sm placeholder:text-manga-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-manga-blue',
            )}
          />
          <button
            onClick={() => addTech(techInput)}
            disabled={!techInput.trim()}
            className={cn(
              'rounded-sm border-2 border-manga-black px-3 py-1.5',
              'text-xs font-bold',
              'bg-manga-gray-100 transition-colors hover:bg-manga-gray-200',
              'disabled:opacity-30',
            )}
          >
            Add
          </button>
        </div>

        {/* Quick-add popular techs */}
        <div className="mt-2 flex flex-wrap gap-1">
          {POPULAR_TECHS.filter((t) => !userProfile.techStack.includes(t))
            .slice(0, 16)
            .map((tech) => (
              <button
                key={tech}
                onClick={() => addTech(tech)}
                className={cn(
                  'rounded-sm border border-manga-gray-200 px-1.5 py-0.5',
                  'text-[10px] text-manga-gray-500',
                  'transition-colors hover:border-manga-black hover:text-manga-black',
                )}
              >
                + {tech}
              </button>
            ))}
        </div>
      </section>

      {/* ============ Projects ============ */}
      <section>
        <h3 className="mb-3 font-manga text-lg tracking-wide text-manga-black">
          Projects
        </h3>

        <div className="space-y-3">
          {projects.map((project, index) => (
            <div
              key={index}
              className="relative rounded-sm border-2 border-manga-gray-200 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => updateProject(index, 'name', e.target.value)}
                  placeholder="Project name"
                  className={cn(
                    'rounded-sm border border-manga-gray-300 px-2 py-1.5',
                    'text-sm placeholder:text-manga-gray-300',
                    'focus:border-manga-black focus:outline-none',
                  )}
                />
                <input
                  type="text"
                  value={project.description}
                  onChange={(e) => updateProject(index, 'description', e.target.value)}
                  placeholder="Short description"
                  className={cn(
                    'rounded-sm border border-manga-gray-300 px-2 py-1.5',
                    'text-sm placeholder:text-manga-gray-300',
                    'focus:border-manga-black focus:outline-none',
                  )}
                />
              </div>
              {projects.length > 1 && (
                <button
                  onClick={() => removeProject(index)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-manga-gray-300 bg-white text-[10px] text-manga-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {projects.length < 4 && (
          <button
            onClick={addProject}
            className="mt-2 text-xs font-bold text-manga-blue hover:underline"
          >
            + Add another project
          </button>
        )}
      </section>

      {/* ============ Manga Style ============ */}
      <section>
        <h3 className="mb-3 font-manga text-lg tracking-wide text-manga-black">
          Manga Style
        </h3>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={cn(
                'rounded-sm border-2 p-3 text-left transition-all',
                style === s
                  ? 'border-manga-black bg-manga-black text-white shadow-none'
                  : 'border-manga-gray-300 bg-white text-manga-black hover:border-manga-black',
                style === s
                  ? ''
                  : 'shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]',
              )}
            >
              <div className="font-manga text-sm capitalize">{s}</div>
              <p className="mt-0.5 text-[9px] leading-tight opacity-70">
                {getStyleDescription(s)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ============ Layout ============ */}
      <section>
        <h3 className="mb-3 font-manga text-lg tracking-wide text-manga-black">
          Panel Layout
        </h3>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {LAYOUT_OPTIONS.map((l) => {
            const info = getLayoutInfo(l);
            return (
              <button
                key={l}
                onClick={() => setLayoutType(l)}
                className={cn(
                  'rounded-sm border-2 p-2 text-center transition-all',
                  layoutType === l
                    ? 'border-manga-black bg-manga-black text-white'
                    : 'border-manga-gray-300 bg-white text-manga-black hover:border-manga-black',
                )}
              >
                <div className="text-xl">{info.icon}</div>
                <div className="mt-0.5 text-[10px] font-bold">{info.name}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============ Continue Button ============ */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setCurrentStep('customize')}
          disabled={!isValid}
          className={cn(
            'rounded-sm border-2 border-manga-black px-8 py-3',
            'font-manga text-base tracking-wider',
            'transition-all',
            isValid
              ? 'bg-manga-accent text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'
              : 'bg-manga-gray-200 text-manga-gray-400 cursor-not-allowed',
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function getStyleDescription(style: MangaStyle): string {
  const descriptions: Record<MangaStyle, string> = {
    shonen: 'Bold & action-packed',
    shojo: 'Soft & elegant',
    seinen: 'Detailed & mature',
    chibi: 'Cute & playful',
    cyberpunk: 'Futuristic & techy',
  };
  return descriptions[style];
}
