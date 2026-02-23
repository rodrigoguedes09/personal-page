<p align="center">
  <img src="https://img.shields.io/badge/AI-HuggingFace%20API-ff3366?style=for-the-badge" alt="AI Powered" />
  <img src="https://img.shields.io/badge/Cost-$0%20Forever-22cc88?style=for-the-badge" alt="$0 Forever" />
</p>

# MangaREADME Generator

> **Turn your GitHub profile into a manga masterpiece.**

MangaREADME Generator is an open-source web application that creates manga-style images for GitHub README files using **AI image generation** via the HuggingFace Inference API. No model downloads, no GPU required, no data stored server-side.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Generation** | Stable Diffusion via HuggingFace Inference API -- no downloads |
| **Manga Styles** | Shonen, Shojo, Seinen, Chibi, and Cyberpunk presets |
| **Smart Layouts** | 7 panel layout algorithms (2x2 grid, hero banner, action, comic strip, etc.) |
| **Speech Bubbles** | 5 bubble types -- speech, thought, shout, narration, whisper |
| **Visual Effects** | Speed lines, screentone, halftone, sparkle, impact, and more |
| **One-Click Export** | Download PNG + copy Markdown snippet for GitHub README |
| **No Setup** | Works in any modern browser -- no GPU, no model downloads |

---

## How It Works

```
 1. INPUT        ->   2. STYLE        ->   3. GENERATE     ->   4. EXPORT
 Name, Bio,           Manga style,          AI generates          Download PNG
 Tech Stack,          Layout,               each panel            Copy Markdown
 Projects             Prompts               via HF API            for GitHub
```

1. **Input** -- Enter your name, bio, tech stack, and projects
2. **Customize** -- Pick a manga style and layout; tweak per-panel prompts and speech bubbles
3. **Generate** -- HuggingFace Inference API creates each panel image
4. **Export** -- Download the final manga page as PNG and copy Markdown for your README

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- A modern browser (Chrome, Edge, Firefox, Safari)
- Optional: HuggingFace API token for higher rate limits (free at huggingface.co)

### Install and Run

```bash
git clone https://github.com/rodrigoguedes09/personal-page.git
cd personal-page
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the 4-step wizard.

---

## Architecture

```
src/
  app/                    -- Next.js App Router pages
    layout.tsx            -- Root layout with metadata
    page.tsx              -- Main 4-step wizard page
    globals.css           -- Manga-themed Tailwind styles
  components/             -- React UI components
    header.tsx            -- App header with GitHub link
    footer.tsx            -- App footer
    webgpu-status.tsx     -- GPU capability badge (informational)
    progress-bar.tsx      -- Manga-styled progress bar
    model-loader.tsx      -- AI model selector and API config
    user-input-form.tsx   -- Step 1: User data form
    manga-canvas.tsx      -- Canvas-based manga renderer
    generation-view.tsx   -- Step 3: Generation controls
    export-options.tsx    -- Step 4: Export controls
  hooks/                  -- Custom React hooks
    use-webgpu.ts         -- WebGPU detection hook
    use-generation.ts     -- HF Inference API generation
  lib/                    -- Core library modules
    constants.ts          -- Model registry, style presets, templates
    utils.ts              -- Utility functions
    webgpu.ts             -- WebGPU detection and capability check
    hf-inference.ts       -- HuggingFace Inference API client
    prompt-engine.ts      -- User data to manga prompt mapper
    manga-layout.ts       -- 7 panel layout algorithms
    canvas-renderer.ts    -- Canvas drawing with effects and bubbles
    export.ts             -- PNG/Markdown export
  store/
    app-store.ts          -- Zustand global state
  types/
    index.ts              -- TypeScript type definitions
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **HF Inference API** | No model downloads needed -- works instantly in any browser |
| **Zustand** | Lightweight global state over React Context for scalability |
| **Canvas 2D** | Direct pixel-level control for effects and efficient PNG export |
| **Optional API Token** | Free tier works without a token; token increases rate limits |

---

## Manga Styles

| Style | Vibe |
|-------|------|
| **Shonen** | Bold, high-energy action with dramatic lighting |
| **Shojo** | Soft tones, floral accents, expressive eyes |
| **Seinen** | Detailed, mature, photorealistic manga |
| **Chibi** | Cute, super-deformed characters |
| **Cyberpunk** | Neon-lit, tech-heavy futuristic aesthetic |

---

## Supported Models

Models run on HuggingFace Inference API servers -- nothing is downloaded to your machine:

| Model | Best For |
|-------|----------|
| SDXL 1.0 | High quality, detailed images (recommended) |
| Stable Diffusion 1.5 | Classic model, fast and reliable |
| Stable Diffusion 2.1 | Improved quality, good for detailed scenes |

---

## Configuration

### HuggingFace API Token (Optional)

The app works without a token using the free tier. For higher rate limits:

1. Create a free account at [huggingface.co](https://huggingface.co)
2. Go to Settings > Access Tokens
3. Create a token and paste it into the app's API config panel

---

## Tech Stack

- **Framework** -- [Next.js 14](https://nextjs.org/) (App Router)
- **Language** -- [TypeScript 5](https://www.typescriptlang.org/)
- **Styling** -- [Tailwind CSS 3.4](https://tailwindcss.com/)
- **AI Inference** -- [HuggingFace Inference API](https://huggingface.co/docs/api-inference)
- **State** -- [Zustand 5](https://zustand-demo.pmnd.rs/)
- **Icons** -- [Lucide React](https://lucide.dev/)
- **Export** -- [html-to-image](https://github.com/nicolo-ribaudo/html-to-image)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Local Development

```bash
npm run dev     # Start dev server on http://localhost:3000
npm run build   # Production build
npm run lint    # Run ESLint
```

---

## License

MIT

---

<p align="center">
  <strong>Made with AI and manga ink</strong>
</p>
