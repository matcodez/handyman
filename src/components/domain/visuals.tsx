import {
  AirVent, BadgeCheck, BrickWall, Bug, Cctv, Droplets, Fence, Grid3x3, Hammer, Hourglass, KeyRound, Layers, PaintRoller,
  PanelsTopLeft, Ruler, ShieldAlert, Sparkles, Star, Trees, Truck, Umbrella, Wrench, Zap, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import { VERIFICATION, type Tone, type VerificationStatus } from '@/lib/domain/states'
import { Badge } from '@/components/ui/primitives'

// Íconos disponibles para categorías (icon_key editable desde administración).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  droplets: Droplets, zap: Zap, 'brick-wall': BrickWall, 'paint-roller': PaintRoller, hammer: Hammer, fence: Fence, trees: Trees,
  layers: Layers, 'grid-3x3': Grid3x3, umbrella: Umbrella, 'key-round': KeyRound, sparkles: Sparkles, 'panels-top-left': PanelsTopLeft,
  'air-vent': AirVent, bug: Bug, cctv: Cctv, truck: Truck, ruler: Ruler, wrench: Wrench,
}

const SLUG_ICON: Record<string, string> = {
  plomeria: 'droplets', electricidad: 'zap', albanileria: 'brick-wall', pintura: 'paint-roller', carpinteria: 'hammer', herreria: 'fence',
  jardineria: 'trees', tablayeso: 'layers', pisos: 'grid-3x3', techado: 'umbrella', cerrajeria: 'key-round', limpieza: 'sparkles',
  'vidrio-aluminio': 'panels-top-left', 'aire-acondicionado': 'air-vent', 'control-plagas': 'bug', 'seguridad-electronica': 'cctv',
  mudanzas: 'truck', 'ingenieria-civil': 'ruler',
}

export function CategoryIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const Icon = CATEGORY_ICONS[iconKey] ?? Wrench
  return <Icon className={className} aria-hidden />
}

const PHOTO_PALETTES = [
  'from-navy-3 via-brand-dark to-brand',
  'from-brand-dark via-brand to-brand-light',
  'from-[#1b2a57] via-[#31418f] to-[#f5a524]',
  'from-navy via-navy-4 to-[#3f6ad8]',
]

/**
 * Foto de un trabajo o solicitud. Las URLs `demo:<slug>:<n>` se dibujan como una
 * ilustración claramente etiquetada; las fotos subidas por usuarios se muestran tal cual.
 */
export function Photo({ src, alt, className, label = true }: { src: string; alt: string; className?: string; label?: boolean }) {
  if (src.startsWith('demo:')) {
    const [, slug, v] = src.split(':')
    const n = Number(v) || 1
    const Icon = CATEGORY_ICONS[SLUG_ICON[slug] ?? 'wrench'] ?? Wrench
    return (
      <div role="img" aria-label={`${alt} (foto de demostración)`} className={cn('relative overflow-hidden bg-gradient-to-br', PHOTO_PALETTES[n % PHOTO_PALETTES.length], className)}>
        <div className="dots absolute inset-0" />
        <div className={cn('absolute h-[70%] w-[70%] rounded-full bg-white/10 blur-2xl', n % 2 ? '-right-[20%] -top-[20%]' : '-bottom-[25%] -left-[15%]')} />
        <Icon className={cn('absolute text-white/85', n % 3 === 0 ? 'left-[12%] top-[16%] h-[42%] w-[42%]' : n % 3 === 1 ? 'left-1/2 top-1/2 h-[44%] w-[44%] -translate-x-1/2 -translate-y-1/2' : 'bottom-[14%] right-[12%] h-[46%] w-[46%]')} strokeWidth={1.25} />
        {label && <span className="absolute bottom-2 left-2 rounded-md bg-navy/55 px-1.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">Foto demo</span>}
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn('bg-paper2 object-cover', className)} />
}

export function PhotoGrid({ urls, alt, className }: { urls: string[]; alt: string; className?: string }) {
  if (urls.length === 0) return null
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}>
      {urls.map((u, i) => (
        <Photo key={`${u}-${i}`} src={u} alt={`${alt} ${i + 1}`} className="aspect-[4/3] w-full rounded-xl" />
      ))}
    </div>
  )
}

const AVATAR_TINTS = ['bg-brand text-white', 'bg-navy-3 text-white', 'bg-accent text-navy', 'bg-[#1f7a6b] text-white', 'bg-[#7a3fb1] text-white', 'bg-[#c2472f] text-white']

export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' }
  const tint = AVATAR_TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length]
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`Foto de ${name}`} className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size], className)} />
  }
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold ring-2 ring-white', sizes[size], tint, className)}>
      {initials(name)}
    </span>
  )
}

const VERIFICATION_ICON: Record<VerificationStatus, LucideIcon> = {
  approved: BadgeCheck, pending: Hourglass, in_review: Hourglass, draft: ShieldAlert, rejected: ShieldAlert, suspended: ShieldAlert,
}

/** Estado de verificación con texto explícito (no depende solo del color). */
export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const v = VERIFICATION[status]
  return <Badge tone={v.tone} icon={VERIFICATION_ICON[status]} className={className}>{v.label}</Badge>
}

export function StatusBadge({ map, status }: { map: Record<string, { label: string; tone: Tone }>; status: string }) {
  const s = map[status] ?? { label: status, tone: 'neutral' as Tone }
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function Stars({ value, count, size = 'sm' }: { value: string | number; count?: number; size?: 'sm' | 'md' }) {
  const v = Number(value)
  if (!v) return <span className="text-xs text-ink3">Sin calificaciones aún</span>
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Calificación ${v.toFixed(1)} de 5${count !== undefined ? `, ${count} reseñas` : ''}`}>
      <Star className={cn('fill-accent text-accent', size === 'md' ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
      <span className={cn('font-num font-semibold text-ink', size === 'md' ? 'text-lg' : 'text-sm')}>{v.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-ink3">({count})</span>}
    </span>
  )
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#ffffff' : '#0b1020'} />
        <path d="M18 16v32M46 16v32M18 32h28" stroke={light ? '#0b1020' : '#fff'} strokeWidth="7" strokeLinecap="round" />
        <circle cx="46" cy="16" r="6" fill="#f5a524" />
      </svg>
      <span className={cn('font-display text-xl font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>
        handy<span className={light ? 'text-accent' : 'text-brand'}>man</span>
      </span>
    </span>
  )
}
