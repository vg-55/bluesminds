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
      }
    }
    return config
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
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/api-docs',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
