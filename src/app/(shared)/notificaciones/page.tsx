import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { timeAgo } from '@/lib/format'
import { listNotifications } from '@/lib/services/core'
import { markNotificationsReadAction } from '@/app/actions/auth'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { ADMIN_NAV, AppShell, CUSTOMER_NAV, PRO_NAV } from '@/components/layout/app-shell'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Notificaciones' }

export default async function NotificationsPage() {
  const user = await requireUser()
  const list = await listNotifications(user.id, 50)
  const nav = user.role === 'admin' ? ADMIN_NAV : user.role === 'professional' ? PRO_NAV : CUSTOMER_NAV
  const unread = list.filter((n) => !n.read_at).length

  return (
    <AppShell user={user} items={nav}>
      <PageHeader
        title="Notificaciones"
        description="Avisos de nuevas cotizaciones, cambios de estado y garantías. (El envío por correo o SMS queda para una fase posterior.)"
        action={unread > 0 ? (
          <ActionForm action={markNotificationsReadAction}><SubmitButton className="btn-secondary btn-sm"><CheckCheck className="h-4 w-4" aria-hidden />Marcar todas como leídas</SubmitButton></ActionForm>
        ) : undefined}
      />
      {list.length === 0 ? (
        <EmptyState icon={Bell} title="Sin notificaciones" description="Aquí verás los avisos importantes sobre tus solicitudes y órdenes." />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {list.map((n) => {
            const body = (
              <div className={cn('flex gap-3 px-5 py-4 transition-colors', n.href && 'hover:bg-paper', !n.read_at && 'bg-brand-bg/40')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-brand')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-ink">{n.title}{!n.read_at && <span className="sr-only"> (sin leer)</span>}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink2">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink3">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            )
            return <li key={n.id}>{n.href ? <Link href={n.href}>{body}</Link> : body}</li>
          })}
        </ul>
      )}
    </AppShell>
  )
}
