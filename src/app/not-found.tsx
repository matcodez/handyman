import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/domain/visuals'

export default function NotFound() {
  return (
    <main id="contenido" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <span className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-bg text-brand"><Compass className="h-8 w-8" aria-hidden /></span>
      <h1 className="mt-5 text-3xl font-semibold">No encontramos esta página</h1>
      <p className="mt-2 max-w-md text-ink2">Puede que el enlace sea incorrecto o que no tengas permiso para ver este contenido.</p>
      <Link href="/" className="btn-primary mt-6">Volver al inicio</Link>
    </main>
  )
}
