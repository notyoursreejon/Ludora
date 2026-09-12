/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@snakes/shared', '@snakes/engine', '@snakes/ludo-engine'],
  reactStrictMode: false
};

export default nextConfig;
