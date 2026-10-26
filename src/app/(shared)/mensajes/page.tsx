import Link from 'next/link'
import { Briefcase, ClipboardList, LifeBuoy, MessageCircle } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { timeAgo } from '@/lib/format'
import { listConversations, type ConversationKind } from '@/lib/services/messaging'
import { openSupportChatAction } from '@/app/actions/messaging'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { Avatar } from '@/components/domain/visuals'
import { ADMIN_NAV, AppShell, CUSTOMER_NAV, PRO_NAV } from '@/components/layout/app-shell'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Mensajes' }

const KIND: Record<ConversationKind, { label: string; icon: typeof Briefcase }> = {
  quote: { label: 'Antes de contratar', icon: ClipboardList },
  order: { label: 'Orden', icon: Briefcase },
  support: { label: 'Soporte Handyman', icon: LifeBuoy },
}

export default async function MessagesPage() {
  const user = await requireUser()
  const list = await listConversations(user)
  const nav = user.role === 'admin' ? ADMIN_NAV : user.role === 'professional' ? PRO_NAV : CUSTOMER_NAV

  return (
    <AppShell user={user} items={nav}>
      <PageHeader
        title={user.role === 'admin' ? 'Mensajes y soporte' : 'Mensajes'}
        description={user.role === 'admin'
          ? 'Consultas de soporte de clientes y profesionales, y conversaciones de órdenes para mediar.'
          : 'Conversa con los profesionales y con el equipo de Handyman sin salir de la plataforma.'}
        action={user.role !== 'admin' ? (
          <ActionForm action={openSupportChatAction} resetOnSuccess={false}>
            <SubmitButton className="btn-secondary"><LifeBuoy className="h-4 w-4" aria-hidden />Pregúntale a Handyman</SubmitButton>
          </ActionForm>
        ) : undefined}
      />
      {list.length === 0 ? (
        <EmptyState icon={MessageCircle} title="Aún no tienes conversaciones" description="Desde una cotización puedes escribirle al profesional, y desde cualquier pantalla puedes preguntarle a Handyman." />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {list.map((c) => {
            const K = KIND[c.kind]
            const name = c.kind === 'support' ? (user.role === 'admin' ? (c.counterpart_name ?? 'Usuario') : 'Equipo Handyman') : (c.counterpart_name ?? 'Conversación')
            return (
              <li key={c.id}>
                <Link href={`/mensajes/${c.id}`} className={cn('flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-paper sm:px-5', c.unread > 0 && 'bg-brand-bg/40')}>
                  {c.kind === 'support' && user.role !== 'admin'
                    ? <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-accent"><LifeBuoy className="h-5 w-5" aria-hidden /></span>
                    : <Avatar name={name} src={c.counterpart_avatar} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn('truncate font-display text-[15px]', c.unread ? 'font-semibold text-ink' : 'font-medium text-ink')}>{name}</p>
                      <span className="shrink-0 text-xs text-ink3">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-ink3"><K.icon className="h-3.5 w-3.5" aria-hidden />{K.label} · <span className="truncate">{c.subject}</span></p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={cn('truncate text-sm', c.unread ? 'text-ink' : 'text-ink2')}>
                        {c.last_kind === 'system' ? <em className="not-italic text-ink3">{c.last_body}</em> : `${c.last_sender_id === user.id ? 'Tú: ' : ''}${c.last_body || '📷 Foto'}`}
                      </p>
                      {c.unread > 0 && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 font-num text-[11px] font-semibold text-white">{c.unread}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AppShell>
  )
}
