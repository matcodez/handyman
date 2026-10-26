import type { Metadata, Viewport } from 'next'
import { Poppins, IBM_Plex_Sans, Outfit } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

// Misma familia tipográfica que WPOS: Poppins (marca y títulos), IBM Plex Sans (texto), Outfit (cifras).
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' })
const ibm = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-ibm', display: 'swap' })
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-outfit', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Handyman — Profesionales verificados para tu hogar u oficina', template: '%s · Handyman' },
  description:
    'Handyman conecta a clientes con profesionales verificados de mantenimiento y reparación en Guatemala: identidad verificada, cotización previa, confirmación por QR y garantía escrita.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Handyman', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = { themeColor: '#0b1020', viewportFit: 'cover' }

// Todas las páginas dependen de la sesión o de la base de datos: se renderizan por request.
export const dynamic = 'force-dynamic'
// En Vercel, el primer request crea el esquema y los datos demo: se da margen de tiempo.
export const maxDuration = 60

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${ibm.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica la preferencia de "letra grande" antes de pintar, para evitar un salto visual. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('hm-texto-grande')==='1')document.documentElement.classList.add('texto-grande')}catch(e){}" }} />
      </head>
      <body className="font-sans">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
          Saltar al contenido
        </a>
        {children}
        <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: 'var(--font-ibm), system-ui, sans-serif', borderRadius: '12px' } }} />
      </body>
    </html>
  )
}
