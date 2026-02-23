'use client';

import { APP_NAME, APP_VERSION } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t-4 border-manga-black bg-manga-black py-6 text-manga-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-manga text-lg">{APP_NAME}</span>
            <span className="text-xs text-manga-gray-400">v{APP_VERSION}</span>
          </div>

          <p className="text-center text-xs text-manga-gray-400">
            Built with Next.js, Transformers.js &amp; WebGPU.
            <br className="sm:hidden" />
            {' '}100% client-side — your data never leaves your browser.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/manga-readme-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-manga-gray-400 underline-offset-2 hover:text-white hover:underline"
            >
              Source Code
            </a>
            <a
              href="https://github.com/manga-readme-generator/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-manga-gray-400 underline-offset-2 hover:text-white hover:underline"
            >
              Report Bug
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
