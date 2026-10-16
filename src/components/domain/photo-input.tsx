'use client'

import { useState } from 'react'
import { ImagePlus } from 'lucide-react'

/** Selector de fotos con vista previa local. La validación real ocurre en el servidor. */
export function PhotoInput({ name, label, hint, required, max = 6, accept = 'image/jpeg,image/png,image/webp', single }: {
  name: string; label: string; hint?: string; required?: boolean; max?: number; accept?: string; single?: boolean
}) {
  const [previews, setPreviews] = useState<{ url: string; name: string; isImage: boolean }[]>([])
  const [error, setError] = useState('')
  const id = `file-${name}`

  return (
    <div>
      <span className="label">{label}</span>
      <label htmlFor={id} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line2 bg-paper/60 px-4 py-6 text-center transition-colors hover:border-brand hover:bg-brand-bg/50 focus-within:border-brand">
        <ImagePlus className="h-6 w-6 text-brand" aria-hidden />
        <span className="font-display text-sm font-medium text-ink">{previews.length ? 'Cambiar selección' : single ? 'Seleccionar archivo' : 'Seleccionar fotos'}</span>
        <span className="text-xs text-ink3">{hint ?? `JPG, PNG o WEBP · hasta 5 MB cada una · máximo ${max}`}</span>
        <input
          id={id} name={name} type="file" accept={accept} multiple={!single} required={required} className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            previews.forEach((p) => URL.revokeObjectURL(p.url))
            if (files.length > max) setError(`Selecciona un máximo de ${max} archivos.`)
            else if (files.some((f) => f.size > 5 * 1024 * 1024)) setError('Cada archivo debe pesar 5 MB o menos.')
            else setError('')
            setPreviews(files.map((f) => ({ url: URL.createObjectURL(f), name: f.name, isImage: f.type.startsWith('image/') })))
          }}
        />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      {previews.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((p) => (
            <li key={p.url} className="overflow-hidden rounded-xl border border-line bg-white">
              {p.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.name} className="aspect-square w-full object-cover" />
              ) : (
                <span className="flex aspect-square items-center justify-center p-2 text-center text-xs text-ink2">{p.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
