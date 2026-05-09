/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint runs in CI as a separate step; build is for shipping.
    ignoreDuringBuilds: false,
    dirs: ["app", "src", "components", "tests"],
  },
  images: { unoptimized: true },
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
