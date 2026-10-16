import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/domain/states'

const TONES: Record<Tone, string> = {
  neutral: 'bg-paper2 text-ink2',
  info: 'bg-brand-bg text-brand-dark',
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-display text-xs font-medium', TONES[tone], className)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  )
}

/** Etiqueta explícita para todo lo simulado o ficticio. */
export function DemoBadge({ children = 'DEMO', className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border border-dashed border-accent-dark/50 bg-accent-bg px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider text-accent-dark', className)}>
      <FlaskConical className="h-3 w-3" aria-hidden />
      {children}
    </span>
  )
}

export function PageHeader({ title, description, action, back }: { title: string; description?: React.ReactNode; action?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-ink3 hover:text-brand">
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink2">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-bg text-brand">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink2">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, icon: Icon, tone = 'info', href }: { label: string; value: React.ReactNode; hint?: string; icon: LucideIcon; tone?: Tone; href?: string }) {
  const body = (
    <div className={cn('card card-pad flex items-start gap-4', href && 'transition-shadow hover:shadow-lift')}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="font-num text-[1.75rem] font-semibold leading-none text-ink">{value}</p>
        <p className="mt-1.5 text-sm text-ink2">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-ink3">{hint}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

export function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('mt-8', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function DefList({ items }: { items: [label: string, value: React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink3">{label}</dt>
          <dd className="mt-0.5 break-words text-[15px] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Notice({ tone = 'info', icon: Icon, title, children }: { tone?: Tone; icon?: LucideIcon; title?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl px-4 py-3.5 text-sm', TONES[tone])}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <div className="min-w-0">
        {title && <p className="font-display font-semibold">{title}</p>}
        <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>
      </div>
    </div>
  )
}
