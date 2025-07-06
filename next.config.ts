import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'i.pravatar.cc'
      },
      {
        hostname: 'github.com'
      }
    ],
  },
};

export default nextConfig;
