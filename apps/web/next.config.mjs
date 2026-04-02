/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kin/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
