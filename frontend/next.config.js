/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Type checking happens in separate process, so we can proceed with build
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint runs separately in CI/CD
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverActions: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
