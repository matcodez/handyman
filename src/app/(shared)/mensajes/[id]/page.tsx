import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink, LifeBuoy, Phone } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { getConversation, listMessages, markRead, SUPPORT_PHONE } from '@/lib/services/messaging'
import { ADMIN_NAV, AppShell, CUSTOMER_NAV, PRO_NAV } from '@/components/layout/app-shell'
import { Avatar } from '@/components/domain/visuals'
import { ChatThread } from '@/components/domain/chat-thread'

export const metadata = { title: 'Conversación' }

const ACTIVE_ORDER = ['scheduled', 'en_route', 'arrived', 'in_progress', 'pending_approval', 'disputed']

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const c = await getConversation(user, params.id)
  if (!c) notFound()
  const messages = await listMessages(user, c.id)
  await markRead(user, c.id)
  const nav = user.role === 'admin' ? ADMIN_NAV : user.role === 'professional' ? PRO_NAV : CUSTOMER_NAV

  const others = c.participants.filter((p) => p.user_id !== user.id && p.role !== 'agent')
  const other = others[0]
  const isSupportForUser = c.kind === 'support' && user.role !== 'admin'
  const title = isSupportForUser ? 'Equipo Handyman' : other ? (other.public_name ?? other.full_name) : 'Conversación'

  // Llamada por línea telefónica: solo con una orden activa (participantes) o a la línea de soporte.
  const phone = isSupportForUser
    ? SUPPORT_PHONE
    : c.kind === 'order' && c.order_status && ACTIVE_ORDER.includes(c.order_status) && user.role !== 'admin' ? other?.phone ?? null : null

  const prefix = user.role === 'admin' ? '/admin' : user.role === 'professional' ? '/pro' : '/cliente'
  const context = c.order_id ? { href: `${prefix}/ordenes/${c.order_id}`, label: 'Ver orden' }
    : c.request_id && user.role !== 'admin' ? { href: `${prefix}/solicitudes/${c.request_id}`, label: 'Ver solicitud' } : null

  return (
    <AppShell user={user} items={nav}>
      <div className="card -mx-4 flex h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-none sm:mx-0 sm:rounded-2xl lg:h-[calc(100dvh-8rem)]">
        <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
          <Link href="/mensajes" aria-label="Volver a mensajes" className="flex h-10 w-10 items-center justify-center rounded-xl text-ink2 hover:bg-paper"><ChevronLeft className="h-5 w-5" aria-hidden /></Link>
          {isSupportForUser
            ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-accent"><LifeBuoy className="h-5 w-5" aria-hidden /></span>
            : <Avatar name={title} src={other?.avatar_url} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold">{title}</p>
            <p className="truncate text-xs text-ink3">{c.subject}</p>
          </div>
          {context && <Link href={context.href} className="btn-ghost btn-sm hidden sm:inline-flex"><ExternalLink className="h-4 w-4" aria-hidden />{context.label}</Link>}
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="btn-secondary btn-sm" title={`Llamar al ${phone}`}>
              <Phone className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Llamar</span>
            </a>
          )}
        </header>
        {c.kind === 'quote' && <p className="bg-accent-bg px-4 py-2 text-xs text-accent-dark">Conversación antes de contratar. Las llamadas se habilitan cuando aceptas una cotización.</p>}
        <ChatThread
          conversationId={c.id}
          viewerId={user.id}
          initial={messages.map((m) => ({ ...m, created_at: new Date(m.created_at).toISOString() }))}
          canSend={c.status === 'open'}
          masked={c.kind === 'quote'}
        />
      </div>
    </AppShell>
  )
}
