'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

/** "Letra grande": amplía el contenido para quien lee con dificultad. Se recuerda en este dispositivo. */
export function TextSizeToggle({ className }: { className?: string }) {
  const [big, setBig] = useState(false)
  useEffect(() => setBig(document.documentElement.classList.contains('texto-grande')), [])
  const toggle = () => {
    const next = !big
    document.documentElement.classList.toggle('texto-grande', next)
    try { localStorage.setItem('hm-texto-grande', next ? '1' : '0') } catch {}
    setBig(next)
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={big} title={big ? 'Volver al tamaño normal' : 'Letra más grande'}
      className={cn('flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-xl px-2 font-display font-semibold hover:bg-black/5 lg:hover:bg-paper2', big && 'bg-white/15 lg:bg-brand-bg lg:text-brand', className)}>
      <span className="text-sm" aria-hidden>A</span><span className="text-lg leading-none" aria-hidden>A</span>
      <span className="sr-only">{big ? 'Usar letra normal' : 'Usar letra grande'}</span>
    </button>
  )
}
