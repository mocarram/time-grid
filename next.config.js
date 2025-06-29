/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.cache = false;
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Ensure we're not using static export which is incompatible with API routes
  // output: 'export', // This line should be removed/commented out
};

module.exports = nextConfig;
