/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'cheerio'],
  },
};

module.exports = nextConfig;
