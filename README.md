<p align="center">
  <img src="https://img.shields.io/badge/AI-100%25%20Client--Side-ff3366?style=for-the-badge" alt="100% Client-Side AI" />
  <img src="https://img.shields.io/badge/WebGPU-Powered-4488ff?style=for-the-badge&logo=webgpu" alt="WebGPU Powered" />
  <img src="https://img.shields.io/badge/Cost-$0%20Forever-22cc88?style=for-the-badge" alt="$0 Forever" />
</p>

# ⚡ MangaREADME Generator

> **Turn your GitHub profile into a manga masterpiece — entirely in your browser.**

MangaREADME Generator is an open-source web application that creates manga-style images for GitHub README files using **Stable Diffusion running 100% client-side** via WebGPU. No API keys, no server costs, no data leaves your machine.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Client-Side AI** | Stable Diffusion inference via Transformers.js v3 + WebGPU/WASM |
| 🎨 **Manga Styles** | Shōnen, Shōjo, Seinen, Chibi, and Cyberpunk presets |
| 📐 **Smart Layouts** | 7 panel layout algorithms (2×2 grid, hero banner, action, comic strip, etc.) |
| 💬 **Speech Bubbles** | 5 bubble types — speech, thought, shout, narration, whisper |
| 🔥 **Visual Effects** | Speed lines, screentone, halftone, sparkle, impact, and more |
| 📦 **One-Click Export** | Download PNG + copy Markdown snippet for GitHub README |
| ⚡ **4-bit Quantized** | Optimized for consumer GPUs with INT4/INT8 quantization |
| 🔒 **Privacy First** | Zero server calls — your data never leaves the browser |

---

## 🖼️ How It Works

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. INPUT     │ →  │  2. STYLE     │ →  │  3. GENERATE  │ →  │  4. EXPORT    │
│  Name, Bio,   │    │  Manga style, │    │  AI generates │    │  Download PNG │
│  Tech Stack,  │    │  Layout,      │    │  each panel   │    │  Copy Markdown│
│  Projects     │    │  Prompts      │    │  via WebGPU   │    │  for GitHub   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

1. **Input** — Enter your name, bio, tech stack, and projects
2. **Customize** — Pick a manga style and layout; tweak per-panel prompts and speech bubbles
3. **Generate** — Stable Diffusion creates each panel image in a Web Worker
4. **Export** — Download the final manga page as PNG and copy `<img>` Markdown for your README

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 18**
- **Browser with WebGPU** — Chrome 113+, Edge 113+, or Firefox Nightly with `dom.webgpu.enabled`
- A GPU with ≥ 4 GB VRAM is recommended (WASM fallback is available but ~10× slower)

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/manga-readme-generator.git
cd manga-readme-generator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the 4-step wizard.

---

## 🏗️ Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout with metadata
│   ├── page.tsx          # Main 4-step wizard page
│   └── globals.css       # Manga-themed Tailwind styles
├── components/           # React UI components
│   ├── header.tsx        # App header with GitHub link
│   ├── footer.tsx        # App footer
│   ├── webgpu-status.tsx # GPU capability badge
│   ├── progress-bar.tsx  # Manga-styled progress bar
│   ├── model-loader.tsx  # Model download & caching UI
│   ├── user-input-form.tsx   # Step 1: User data form
│   ├── manga-canvas.tsx  # Canvas-based manga renderer
│   ├── generation-view.tsx   # Step 3: Generation controls
│   └── export-options.tsx    # Step 4: Export controls
├── hooks/                # Custom React hooks
│   ├── use-webgpu.ts     # WebGPU detection hook
│   └── use-generation.ts # Worker lifecycle & generation
├── lib/                  # Core library modules
│   ├── constants.ts      # Model registry, style presets, templates
│   ├── utils.ts          # Utility functions
│   ├── webgpu.ts         # WebGPU detection & capability check
│   ├── prompt-engine.ts  # User data → manga prompt mapper
│   ├── manga-layout.ts   # 7 panel layout algorithms
│   ├── canvas-renderer.ts# Canvas drawing with effects & bubbles
│   └── export.ts         # PNG/Markdown export
├── store/
│   └── app-store.ts      # Zustand global state
├── types/
│   └── index.ts          # TypeScript type definitions
└── workers/
    └── sd-worker.ts      # Web Worker running Stable Diffusion
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Web Worker** | Inference runs off the main thread — UI stays responsive |
| **Zustand** | Lightweight global state over React Context for scalability |
| **Canvas 2D** | Direct pixel-level control for effects and efficient PNG export |
| **Dynamic `import()`** | Transformers.js is loaded only when needed (≈ 60 MB) |
| **OPFS Caching** | Models are cached in browser storage — no re-download on revisit |
| **`webpackIgnore`** | ONNX Runtime's ESM bundle uses `import.meta.url` which breaks SWC |

---

## 🎨 Manga Styles

| Style | Vibe |
|-------|------|
| **Shōnen** | Bold, high-energy action with dramatic lighting |
| **Shōjo** | Soft tones, floral accents, expressive eyes |
| **Seinen** | Detailed, mature, photorealistic manga |
| **Chibi** | Cute, super-deformed characters |
| **Cyberpunk** | Neon-lit, tech-heavy futuristic aesthetic |

---

## 🧩 Supported Models

Models are downloaded from Hugging Face Hub and cached in the browser via OPFS:

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| SD 1.5 (ONNX q4) | ~800 MB | Medium | Good |
| SDXL Turbo (WebGPU) | ~2.5 GB | Fast (4 steps) | Great |
| SD Turbo (ONNX q8) | ~1.5 GB | Fast (4 steps) | Great |

> Models are quantized to 4-bit or 8-bit for consumer GPU compatibility.

---

## 🔧 Configuration

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_*` | — | (None required — fully client-side) |

### WebGPU Requirements

| Requirement | Minimum |
|-------------|---------|
| Max Buffer Size | ≥ 256 MB |
| Max Storage Buffer Binding | ≥ 128 MB |
| Browser | Chrome 113+ / Edge 113+ |

If WebGPU is unavailable, the app falls back to WASM (CPU) inference — significantly slower but functional.

---

## 📦 Tech Stack

- **Framework** — [Next.js 14](https://nextjs.org/) (App Router)
- **Language** — [TypeScript 5](https://www.typescriptlang.org/)
- **Styling** — [Tailwind CSS 3.4](https://tailwindcss.com/)
- **AI Inference** — [Transformers.js v3](https://huggingface.co/docs/transformers.js)
- **State** — [Zustand 5](https://zustand-demo.pmnd.rs/)
- **Icons** — [Lucide React](https://lucide.dev/)
- **Export** — [html-to-image](https://github.com/nicolo-ribaudo/html-to-image)

---

## 🤝 Contributing

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

## 📄 License

MIT © [Your Name](https://github.com/YOUR_USERNAME)

---

<p align="center">
  <strong>Made with ⚡ WebGPU and 🖤 manga ink</strong>
</p>
