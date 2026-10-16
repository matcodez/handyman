import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BadgeCheck, FileCheck2, QrCode, ShieldCheck } from 'lucide-react'
import { getSession, homeFor } from '@/lib/auth/session'
import { Logo } from '@/components/domain/visuals'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (user) redirect(homeFor(user.role))
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="dots absolute inset-0" aria-hidden />
        <div className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-brand/40 blur-3xl" aria-hidden />
        <Link href="/" className="relative"><Logo light /></Link>
        <div className="relative">
          <h2 className="text-balance text-4xl font-semibold leading-tight">Confianza antes de contratar. <span className="text-accent">Respaldo</span> después del trabajo.</h2>
          <ul className="mt-8 space-y-4 text-white/80">
            <li className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-accent" aria-hidden />Profesionales con identidad verificada</li>
            <li className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-accent" aria-hidden />Precio y alcance acordados antes de empezar</li>
            <li className="flex items-center gap-3"><QrCode className="h-5 w-5 text-accent" aria-hidden />Confirmación de identidad con QR al llegar</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-accent" aria-hidden />Garantía escrita de 30 a 90 días</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Proyecto académico · Universidad Rafael Landívar · Artefacto Creativo, S.A.</p>
      </aside>
      <main id="contenido" className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="lg:hidden"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  )
}
