/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  turbopack: {},  // Turbopackを明示的に有効化（webpack競合を回避）
}

module.exports = nextConfig
