/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@snakes/shared', '@snakes/engine'],
  reactStrictMode: false
};

export default nextConfig;
