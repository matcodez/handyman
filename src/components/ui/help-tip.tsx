'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CircleHelp, X } from 'lucide-react'

/** Ayuda contextual: un "?" junto a un campo o paso que explica en palabras simples qué hacer. */
export function HelpTip({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button type="button" onClick={(e) => { e.preventDefault(); setOpen((o) => !o) }} aria-expanded={open} aria-controls={id}
        className="flex h-7 w-7 items-center justify-center rounded-full text-brand hover:bg-brand-bg" title="Ayuda">
        <CircleHelp className="h-[18px] w-[18px]" aria-hidden /><span className="sr-only">Ayuda: {title}</span>
      </button>
      {open && (
        <span id={id} role="dialog" aria-label={title}
          className="absolute left-1/2 top-8 z-50 block w-72 max-w-[80vw] -translate-x-1/2 rounded-2xl bg-navy p-4 text-left font-sans text-sm font-normal normal-case leading-relaxed tracking-normal text-white shadow-lift">
          <span className="mb-1 flex items-start justify-between gap-2 font-display font-semibold">
            {title}
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar ayuda" className="-mr-1 -mt-1 rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" aria-hidden /></button>
          </span>
          <span className="block text-white/85">{children}</span>
        </span>
      )}
    </span>
  )
}
