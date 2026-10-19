'use client'

import { useState } from 'react'
import { ImagePlus, LoaderCircle } from 'lucide-react'

const MAX_SIDE = 1600
const MAX_BYTES = 4 * 1024 * 1024

/**
 * Reduce fotos grandes en el navegador (máx. 1600 px, JPEG 82%) antes de subirlas:
 * las fotos de teléfono pesan varios MB y el hosting limita el tamaño de cada envío.
 */
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 600 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** Selector de fotos con vista previa local. La validación real ocurre en el servidor. */
export function PhotoInput({ name, label, hint, required, max = 6, accept = 'image/jpeg,image/png,image/webp', single }: {
  name: string; label: string; hint?: string; required?: boolean; max?: number; accept?: string; single?: boolean
}) {
  const [previews, setPreviews] = useState<{ url: string; name: string; isImage: boolean }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const id = `file-${name}`

  return (
    <div>
      <span className="label">{label}</span>
      <label htmlFor={id} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line2 bg-paper/60 px-4 py-6 text-center transition-colors hover:border-brand hover:bg-brand-bg/50 focus-within:border-brand">
        {busy ? <LoaderCircle className="h-6 w-6 animate-spin text-brand" aria-hidden /> : <ImagePlus className="h-6 w-6 text-brand" aria-hidden />}
        <span className="font-display text-sm font-medium text-ink">{busy ? 'Preparando fotos…' : previews.length ? 'Cambiar selección' : single ? 'Seleccionar archivo' : 'Seleccionar fotos'}</span>
        <span className="text-xs text-ink3">{hint ?? `JPG, PNG o WEBP · máximo ${max}`}</span>
        <input
          id={id} name={name} type="file" accept={accept} multiple={!single} required={required} className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget
            previews.forEach((p) => URL.revokeObjectURL(p.url))
            setBusy(true)
            const files = await Promise.all(Array.from(input.files ?? []).map(compress))
            // Reemplaza la selección por las versiones comprimidas para que se envíen esas.
            const dt = new DataTransfer()
            files.forEach((f) => dt.items.add(f))
            input.files = dt.files
            setBusy(false)
            if (files.length > max) setError(`Selecciona un máximo de ${max} archivos.`)
            else if (files.some((f) => f.size > MAX_BYTES)) setError('Cada archivo debe pesar 4 MB o menos.')
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
