/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['assets.coingecko.com', 'cryptologos.cc'],
  },
  env: {
    NEXT_PUBLIC_COINGECKO_API_URL: process.env.NEXT_PUBLIC_COINGECKO_API_URL,
  },
}

module.exports = nextConfig 