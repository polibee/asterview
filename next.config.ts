
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Add this line for static exports
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Add this line for static exports with next/image
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 's3-ap-northeast-1.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
