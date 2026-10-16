import 'server-only'
import { headers } from 'next/headers'
import { AppError } from '@/lib/errors'

// Limitador en memoria (ventana deslizante). Suficiente para una sola instancia;
// en producción usar un almacén compartido (Redis/Upstash) con la misma firma.
const g = globalThis as unknown as { __hmRate?: Map<string, number[]> }
const hits: Map<string, number[]> = (g.__hmRate ??= new Map())

export function clientIp() {
  const h = headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
}

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (list.length >= max) {
    hits.set(key, list)
    throw new AppError('Demasiados intentos. Espera un momento y vuelve a intentarlo.')
  }
  list.push(now)
  hits.set(key, list)
}
