import { composePlugins, withNx } from '@nx/next';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
};

const plugins = [withNx];

export default composePlugins(...plugins)(nextConfig);
