'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, CalendarPlus, FileText, Headphones, MessageCircle, QrCode, Radio, ShieldCheck, Siren, Wallet, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type Slide = { icon: LucideIcon; tone: string; title: string; body: string }

const SLIDES: Record<'customer' | 'professional', Slide[]> = {
  customer: [
    { icon: Siren, tone: 'bg-bad text-white', title: '¿Una emergencia?', body: 'Toca el botón rojo “Emergencia”, elige qué pasó y en menos de un minuto avisamos a profesionales disponibles cerca de ti.' },
    { icon: CalendarPlus, tone: 'bg-navy text-accent', title: '¿Un trabajo que puede esperar?', body: 'Toca “Planificar un trabajo”: elige el oficio, cuéntanos qué pasa (puedes dictarlo con tu voz) y agrega una foto.' },
    { icon: FileText, tone: 'bg-brand text-white', title: 'Compara y elige', body: 'Recibes cotizaciones de profesionales verificados. Puedes chatear con ellos antes de aceptar. Tu pago queda retenido hasta que apruebes.' },
    { icon: QrCode, tone: 'bg-ok text-white', title: 'Confirma quién llega', body: 'Al llegar, escanea el QR de su carné y compara la foto. Así sabes que es la persona correcta antes de abrir la puerta.' },
    { icon: Headphones, tone: 'bg-accent text-navy', title: 'Nunca estás solo', body: 'Si algo sale mal, toca “Pregúntale a Handyman” o llama a nuestra línea. Un agente te acompaña hasta resolverlo, y tu trabajo tiene garantía escrita.' },
  ],
  professional: [
    { icon: BadgeCheck, tone: 'bg-ok text-white', title: 'Tu perfil verificado', body: 'Cuando administración aprueba tus documentos, puedes ver solicitudes de tus oficios y zonas y enviar cotizaciones.' },
    { icon: Radio, tone: 'bg-bad text-white', title: 'Emergencias', body: 'Activa “Estoy disponible” y recibirás primero las emergencias cercanas. El primero que acepta la toma: indica en cuánto llegas.' },
    { icon: MessageCircle, tone: 'bg-brand text-white', title: 'Chatea con el cliente', body: 'Resuelve dudas por el chat antes de cotizar. El teléfono se comparte cuando el cliente te contrata.' },
    { icon: QrCode, tone: 'bg-navy text-accent', title: 'Muestra tu carné', body: 'Al llegar, el cliente escanea tu QR para confirmar tu identidad. Después puedes iniciar el trabajo.' },
    { icon: Wallet, tone: 'bg-accent text-navy', title: 'Evidencia y pago', body: 'Sube fotos del trabajo terminado. Cuando el cliente aprueba, el pago se libera y se emite la garantía.' },
  ],
}

/** Tutorial de primera vez (se muestra una sola vez por dispositivo; se puede volver a abrir desde "Ver tutorial"). */
export function Tutorial({ role, name }: { role: 'customer' | 'professional'; name: string }) {
  const key = `hm-tutorial-${role}`
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const slides = SLIDES[role]

  useEffect(() => {
    try { if (!localStorage.getItem(key)) setOpen(true) } catch {}
    const show = () => { setI(0); setOpen(true) }
    window.addEventListener('hm:tutorial', show)
    if (location.hash === '#tutorial') show()
    return () => window.removeEventListener('hm:tutorial', show)
  }, [key])

  const close = () => {
    try { localStorage.setItem(key, '1') } catch {}
    setOpen(false)
  }
  if (!open) return null
  const s = slides[i]
  const last = i === slides.length - 1

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lift">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink3">{i === 0 ? `Bienvenido, ${name}` : 'Cómo funciona'}</p>
          <button type="button" onClick={close} className="flex h-9 items-center gap-1 rounded-xl px-2 text-sm text-ink3 hover:bg-paper"><X className="h-4 w-4" aria-hidden />Saltar</button>
        </div>
        <div className="px-6 pb-6 pt-4 text-center">
          <span className={cn('mx-auto flex h-20 w-20 items-center justify-center rounded-3xl', s.tone)}><s.icon className="h-10 w-10" aria-hidden /></span>
          <h2 id="tutorial-title" className="mt-5 text-2xl font-bold">{s.title}</h2>
          <p className="mt-2 text-[17px] leading-relaxed text-ink2">{s.body}</p>
          <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
            {slides.map((_, j) => <span key={j} className={cn('h-2 rounded-full transition-all', j === i ? 'w-6 bg-brand' : 'w-2 bg-line2')} />)}
          </div>
          <p className="sr-only">Paso {i + 1} de {slides.length}</p>
          <div className="mt-6 flex gap-2">
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="btn-ghost flex-1">Atrás</button>}
            <button type="button" onClick={() => (last ? close() : setI(i + 1))} className="btn-primary h-12 flex-[2] text-base">
              {last ? <><ShieldCheck className="h-5 w-5" aria-hidden />¡Entendido!</> : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Botón para volver a ver el tutorial. */
export function TutorialButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event('hm:tutorial'))} className={className ?? 'btn-ghost btn-sm'}>
      Ver tutorial de nuevo
    </button>
  )
}
