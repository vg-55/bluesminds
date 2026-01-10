import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Docker
  output: 'standalone',

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Temporarily skip type checking during build (types are checked in CI)
  // TODO: Fix Supabase type narrowing issues
  typescript: {
    ignoreBuildErrors: true,
  },

  // Power domain whitelisting for images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Environment variable validation
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for certain packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Removed redirect from /docs to /api-docs to enable Fumadocs
    ];
  },

  // Rewrites for OpenAI-compatible API paths
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: '/api/v1/:path*',
      },
      {
        source: '/chat/completions',
        destination: '/api/v1/chat/completions',
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
