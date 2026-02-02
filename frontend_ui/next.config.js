/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/chord-probabilities',
  assetPrefix: '/chord-probabilities',
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
