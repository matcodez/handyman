'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenido" className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bad-bg text-bad"><TriangleAlert className="h-8 w-8" aria-hidden /></span>
      <h1 className="mt-5 text-2xl font-semibold">Algo salió mal</h1>
      <p className="mt-2 max-w-md text-ink2">No pudimos cargar esta sección. Tus datos están a salvo; intenta de nuevo.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6"><RotateCcw className="h-4 w-4" aria-hidden />Reintentar</button>
    </main>
  )
}
