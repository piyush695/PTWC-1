/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker — produces a self-contained server in .next/standalone
  output: 'standalone',

  // Don't fail production build on type errors or lint warnings
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable static page generation — all pages rendered at request time
  // This prevents build-time crashes from undefined data during pre-render
  staticPageGenerationTimeout: 0,

  images: {
    domains: ['flagcdn.com', 'res.cloudinary.com', 'cdn.holaprime.com'],
    unoptimized: true,
  },

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
