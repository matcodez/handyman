/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // PGlite carga un binario WASM desde node_modules; no debe empaquetarse.
    serverComponentsExternalPackages: ['@electric-sql/pglite'],
    // allowedOrigins: permite usar los formularios a través de un túnel temporal (Cloudflare, localhost.run o Pinggy).
    serverActions: { bodySizeLimit: '16mb', allowedOrigins: ['**.trycloudflare.com', '**.lhr.life', '**.localhost.run', '**.pinggy.link'] },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
