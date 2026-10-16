import Link from 'next/link'
import QRCode from 'qrcode'
import { headers } from 'next/headers'
import { BadgeCheck, Briefcase, CalendarDays, Check, ChevronRight, FileCheck2, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { daysLeft, formatDate, formatDateTime, formatQ } from '@/lib/format'
import { ORDER, ORDER_STEPS, PAYMENT, REQUEST, WARRANTY, orderStepIndex, type OrderStatus, type PaymentStatus } from '@/lib/domain/states'
import type { ProCard as ProCardData } from '@/lib/services/professionals'
import type { OrderRow, WarrantyRow } from '@/lib/services/orders'
import type { RequestRow } from '@/lib/services/requests'
import { Badge, DemoBadge } from '@/components/ui/primitives'
import { Avatar, CategoryIcon, Stars, StatusBadge, VerificationBadge } from './visuals'

export function ProCard({ pro }: { pro: ProCardData }) {
  return (
    <Link href={`/profesionales/${pro.user_id}`} className="card group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-3.5">
        <Avatar name={pro.public_name} src={pro.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink group-hover:text-brand">{pro.public_name}</h3>
          <div className="mt-1"><VerificationBadge status={pro.verification_status} /></div>
        </div>
      </div>
      <p className="mt-3.5 line-clamp-2 text-sm text-ink2">{pro.bio}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {pro.categories.slice(0, 3).map((c) => <Badge key={c}>{c}</Badge>)}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-sm">
        <Stars value={pro.rating_average} count={pro.reviews_count} />
        <span className="inline-flex items-center gap-1.5 text-ink2">
          <Briefcase className="h-4 w-4 text-ink3" aria-hidden />
          <span className="font-num font-medium text-ink">{pro.years_experience}</span> años · <span className="font-num font-medium text-ink">{pro.completed_jobs_count}</span> trabajos
        </span>
      </div>
    </Link>
  )
}

export function RequestCard({ r, href }: { r: RequestRow; href: string }) {
  return (
    <Link href={href} className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-lift sm:p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-bg text-brand">
        <CategoryIcon iconKey={r.category_icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display text-[15px] font-semibold text-ink group-hover:text-brand">{r.title}</h3>
          <StatusBadge map={REQUEST} status={r.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink2">
          <span>{r.category_name}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-ink3" aria-hidden />{r.location_label}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-ink3" aria-hidden />{formatDate(r.preferred_date)}</span>
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-num text-xl font-semibold text-ink">{r.quotes_count}</p>
        <p className="text-xs text-ink3">{r.quotes_count === 1 ? 'cotización' : 'cotizaciones'}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink3 group-hover:text-brand" aria-hidden />
    </Link>
  )
}

export function OrderCard({ o, href, viewer }: { o: OrderRow; href: string; viewer: 'customer' | 'professional' | 'admin' }) {
  const label = viewer === 'professional' && o.status === 'pending_approval' ? 'Esperando aprobación del cliente' : ORDER[o.status].label
  return (
    <Link href={href} className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-lift sm:p-5">
      <Avatar name={viewer === 'customer' ? o.pro_name : o.customer_name} src={viewer === 'customer' ? o.pro_avatar : null} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display text-[15px] font-semibold text-ink group-hover:text-brand">{o.agreed_scope_snapshot.title}</h3>
          <Badge tone={ORDER[o.status].tone}>{label}</Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink2">
          <span className="font-num text-ink3">{o.order_number}</span>
          <span>{viewer === 'customer' ? o.pro_name : viewer === 'professional' ? o.customer_name : `${o.customer_name} → ${o.pro_name}`}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-ink3" aria-hidden />{formatDate(o.scheduled_at)}</span>
        </p>
      </div>
      <p className="hidden font-num text-lg font-semibold text-ink sm:block">{formatQ(o.agreed_price)}</p>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink3 group-hover:text-brand" aria-hidden />
    </Link>
  )
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') return <Badge tone="neutral">Orden cancelada</Badge>
  const current = orderStepIndex(status)
  return (
    <ol className="flex w-full items-start" aria-label="Progreso de la orden">
      {ORDER_STEPS.map((s, i) => {
        const done = i < current || status === 'completed'
        const active = i === current && status !== 'completed'
        const disputed = active && status === 'disputed'
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className={cn('absolute right-1/2 top-4 -z-0 h-0.5 w-full', done || active ? 'bg-brand' : 'bg-line2')} aria-hidden />}
            <span className={cn('relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 font-num text-xs font-semibold',
              disputed ? 'border-bad bg-bad text-white' : done ? 'border-brand bg-brand text-white' : active ? 'border-brand bg-white text-brand ring-4 ring-brand/15' : 'border-line2 bg-white text-ink3')}>
              {disputed ? <TriangleAlert className="h-4 w-4" aria-hidden /> : done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('mt-2 px-1 text-[11px] leading-tight sm:text-xs', active || done ? 'font-medium text-ink' : 'text-ink3')}>
              {disputed ? 'En disputa' : i === 0 && status === 'en_route' ? 'En camino' : s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={PAYMENT[status].tone}>{PAYMENT[status].label}</Badge>
      <DemoBadge>Pago simulado</DemoBadge>
    </span>
  )
}

/** URL absoluta de la página pública de verificación a la que apunta el QR. */
export function verificationUrl(token: string) {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || /^\d/.test(host) ? 'http' : 'https')
  return `${proto}://${host}/verificar/${token}`
}

/** Carné digital con QR. El QR solo contiene la URL de verificación: ningún dato personal. */
export async function QrBadge({ token, name, className }: { token: string; name: string; className?: string }) {
  const url = verificationUrl(token)
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b1020', light: '#ffffff' } })
  return (
    <div className={cn('overflow-hidden rounded-3xl bg-navy text-white shadow-float', className)}>
      <div className="dots flex items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">Carné Handyman</p>
          <p className="truncate font-display text-base font-semibold">{name}</p>
        </div>
        <BadgeCheck className="h-7 w-7 shrink-0 text-accent" aria-hidden />
      </div>
      <div className="bg-white p-5">
        <div role="img" aria-label={`Código QR de verificación de ${name}`} className="mx-auto w-full max-w-[220px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 text-center text-xs text-ink3">El cliente lo escanea con la cámara de su teléfono para confirmar tu identidad.</p>
      </div>
    </div>
  )
}

export function WarrantyCard({ w, orderNumber, title, proName, children }: { w: WarrantyRow; orderNumber: string; title: string; proName: string; children?: React.ReactNode }) {
  const left = daysLeft(w.expires_at)
  const live = ['active', 'reported', 'in_review', 'approved_fix'].includes(w.status)
  return (
    <article className="card overflow-hidden">
      <div className={cn('flex items-center justify-between gap-3 px-5 py-4 text-white', live ? 'bg-gradient-to-r from-navy-3 to-brand-dark' : 'bg-ink3')}>
        <div className="flex min-w-0 items-center gap-3">
          <ShieldCheck className="h-8 w-8 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="font-display text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">Garantía escrita · {orderNumber}</p>
            <h3 className="truncate text-base font-semibold text-white">{title}</h3>
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 font-display text-xs font-medium backdrop-blur">{WARRANTY[w.status].label}</span>
      </div>
      <div className="card-pad">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="text-xs uppercase tracking-wide text-ink3">Duración</p><p className="font-num text-lg font-semibold">{w.duration_days} días</p></div>
          <div><p className="text-xs uppercase tracking-wide text-ink3">Inicio</p><p className="text-[15px] font-medium">{formatDate(w.starts_at)}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-ink3">Vence</p><p className="text-[15px] font-medium">{formatDate(w.expires_at)}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-ink3">Restan</p><p className="font-num text-lg font-semibold">{live ? `${left} días` : '—'}</p></div>
        </div>
        <details className="group mt-4 rounded-xl bg-paper px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-sm font-medium text-ink">
            <span className="inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand" aria-hidden />Términos y exclusiones</span>
            <ChevronRight className="h-4 w-4 text-ink3 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <p className="mt-2.5 text-sm leading-relaxed text-ink2">{w.terms_text}</p>
          <p className="mt-2 text-xs text-ink3">Profesional responsable: {proName} · Política {w.policy_version} · Emitida el {formatDateTime(w.starts_at)}</p>
        </details>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </article>
  )
}
