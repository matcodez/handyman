import Link from 'next/link'
import { FlaskConical, Menu } from 'lucide-react'
import { getSession, homeFor } from '@/lib/auth/session'
import { Logo } from '@/components/domain/visuals'

const LINKS = [
  { href: '/servicios', label: 'Servicios' },
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/profesionales', label: 'Profesionales' },
  { href: '/ayuda', label: 'Ayuda' },
]

export async function PublicNav() {
  const user = await getSession()
  const cta = user ? (user.role === 'customer' ? '/cliente/solicitudes/nueva' : homeFor(user.role)) : '/registro?tipo=cliente'
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Handyman, inicio"><Logo /></Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3.5 py-2 font-display text-sm text-ink2 hover:bg-paper hover:text-ink">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href={homeFor(user.role)} className="btn-ghost btn-sm hidden sm:inline-flex">Mi panel</Link>
          ) : (
            <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Acceder</Link>
          )}
          <Link href={cta} className="btn-primary btn-sm">{user && user.role !== 'customer' ? 'Ir a mi panel' : 'Solicitar servicio'}</Link>
          <details className="relative md:hidden">
            <summary aria-label="Abrir menú" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl hover:bg-paper [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" aria-hidden />
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-2xl bg-white p-2 shadow-lift">
              {[...LINKS, user ? { href: homeFor(user.role), label: 'Mi panel' } : { href: '/login', label: 'Acceder' }].map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-xl px-4 py-3 font-display text-sm text-ink hover:bg-paper">{l.label}</Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 bg-navy text-white/70">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Profesionales verificados para tu hogar u oficina en el área metropolitana de Ciudad de Guatemala.</p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-white">Plataforma</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/servicios" className="hover:text-white">Servicios</Link></li>
            <li><Link href="/como-funciona" className="hover:text-white">Cómo funciona</Link></li>
            <li><Link href="/profesionales" className="hover:text-white">Profesionales verificados</Link></li>
            <li><Link href="/registro?tipo=profesional" className="hover:text-white">Ofrecer mis servicios</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-white">Ayuda y legal</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/ayuda" className="hover:text-white">Centro de ayuda</Link></li>
            <li><Link href="/legal/garantia" className="hover:text-white">Garantía y reclamos</Link></li>
            <li><Link href="/legal/terminos" className="hover:text-white">Términos de uso</Link></li>
            <li><Link href="/legal/privacidad" className="hover:text-white">Privacidad</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-white">Contacto</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>soporte@handyman.demo</li>
            <li>Ciudad de Guatemala, Guatemala</li>
            <li>Un intraemprendimiento de Artefacto Creativo, S.A.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Handyman · Proyecto académico, Universidad Rafael Landívar.</p>
          <p className="inline-flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-accent" aria-hidden />MVP de demostración: perfiles, reseñas y pagos son ficticios o simulados.</p>
        </div>
      </div>
    </footer>
  )
}
