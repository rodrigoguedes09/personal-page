/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required headers for SharedArrayBuffer (WASM threads) and WebGPU
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  // Exclude heavy client-only packages from SSR (Next.js 14 key)
  experimental: {
    serverComponentsExternalPackages: ['@huggingface/transformers', 'onnxruntime-web', 'onnxruntime-common'],
  },
  webpack: (config, { isServer }) => {
    // Enable async WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Client-side polyfills for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        stream: false,
      };
    }

    // On server: externalize transformers so import.meta.url is not parsed
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@huggingface/transformers', 'onnxruntime-web', 'onnxruntime-common');
    }

    // Handle ONNX Runtime WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Do not parse onnxruntime-web — it ships fully-bundled ESM that
    // contains `import.meta.url` which trips up the SWC/webpack parser.
    config.module.noParse = config.module.noParse || [];
    if (Array.isArray(config.module.noParse)) {
      config.module.noParse.push(/onnxruntime-web/);
    }

    return config;
  },
  // Allow loading models from HuggingFace CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'huggingface.co',
      },
      {
        protocol: 'https',
        hostname: 'cdn-lfs.huggingface.co',
      },
    ],
  },
};

export default nextConfig;
