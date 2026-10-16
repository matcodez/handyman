import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { dataDir } from '@/lib/db/client'
import { AppError } from '@/lib/errors'

/**
 * Almacenamiento de archivos — adaptador local para el modo demo.
 *   public/  → fotos de solicitudes, portafolio y evidencia (nombres UUID no listables)
 *   private/ → documentos de verificación; solo se sirven tras comprobar permisos
 * En producción se sustituye por Supabase Storage (bucket privado + URLs firmadas).
 */
export type Bucket = 'public' | 'private'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_FILES = 6

const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { ext: 'pdf', mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
]

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.ext, s.mime]))

export function storageRoot() {
  return path.join(dataDir(), 'storage')
}

/** Valida por contenido real (firma binaria), no por extensión ni por el MIME declarado. */
export async function saveFile(file: File, bucket: Bucket, opts: { allowPdf?: boolean } = {}) {
  if (file.size === 0) throw new AppError('El archivo está vacío.')
  if (file.size > MAX_BYTES) throw new AppError('Cada archivo debe pesar 5 MB o menos.')
  const buf = Buffer.from(await file.arrayBuffer())
  const kind = SIGNATURES.find((s) => s.test(buf))
  if (!kind || (kind.ext === 'pdf' && !opts.allowPdf)) {
    throw new AppError(opts.allowPdf ? 'Formato no permitido. Usa JPG, PNG, WEBP o PDF.' : 'Formato no permitido. Usa JPG, PNG o WEBP.')
  }
  const name = `${crypto.randomUUID()}.${kind.ext}`
  const dir = path.join(storageRoot(), bucket)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, name), buf)
  return `${bucket}/${name}`
}

export function fileUrl(storagePath: string) {
  return `/api/files/${storagePath}`
}

/** Extrae los archivos reales de un campo de formulario y los guarda como imágenes públicas. */
export async function saveImages(formData: FormData, field: string, opts: { min?: number } = {}) {
  const files = formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length < (opts.min ?? 0)) {
    throw new AppError(opts.min === 1 ? 'Adjunta al menos una foto.' : `Adjunta al menos ${opts.min} fotos.`)
  }
  if (files.length > MAX_FILES) throw new AppError(`Puedes adjuntar un máximo de ${MAX_FILES} fotos.`)
  const urls: string[] = []
  for (const f of files) urls.push(fileUrl(await saveFile(f, 'public')))
  return urls
}
