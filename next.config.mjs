/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // PGlite carga un binario WASM desde node_modules; pg usa módulos nativos opcionales. No se empaquetan.
    serverComponentsExternalPackages: ['@electric-sql/pglite', 'pg'],
    // Las migraciones SQL se leen en tiempo de ejecución: incluirlas en el bundle serverless de Vercel.
    outputFileTracingIncludes: { '/**': ['./db/migrations/**'] },
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
