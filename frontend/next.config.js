/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output: produces a lean self-contained build for Railway/Docker
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      // Allow any Railway-hosted image URLs
      { protocol: 'https', hostname: '*.up.railway.app' },
    ],
  },

  // Rewrites: only proxy locally (when NEXT_PUBLIC_API_URL isn't set).
  // In production on Railway, the frontend hits the API service directly
  // via the full URL set in NEXT_PUBLIC_API_URL — no proxy needed.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://project-point-ledger-production.up.railway.app//api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
