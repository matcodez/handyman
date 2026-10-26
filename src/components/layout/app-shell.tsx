import Link from 'next/link'
import { Bell, FlaskConical, LifeBuoy, LogOut } from 'lucide-react'
import type { SessionUser } from '@/lib/auth/session'
import { ROLE_LABEL } from '@/lib/domain/states'
import { unreadCount } from '@/lib/services/core'
import { unreadConversations } from '@/lib/services/messaging'
import { openSupportChatAction } from '@/app/actions/messaging'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { logoutAction } from '@/app/actions/auth'
import { Avatar, Logo } from '@/components/domain/visuals'
import { BottomNav, SidebarNav, type NavItem } from './nav-links'

/** Marco de la aplicación autenticada: sidebar navy en escritorio (como WPOS) y barra inferior tipo app en móvil. */
export async function AppShell({ user, items: baseItems, children }: { user: SessionUser; items: NavItem[]; children: React.ReactNode }) {
  const [unread, unreadChats] = await Promise.all([unreadCount(user.id), unreadConversations(user.id)])
  const items = baseItems.map((i) => (i.href === '/mensajes' ? { ...i, badge: unreadChats || undefined } : i))
  const home = items[0].href

  const bell = (
    <Link href="/notificaciones" aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`} className="relative flex h-11 w-11 items-center justify-center rounded-xl text-current hover:bg-black/5 lg:hover:bg-paper2">
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 && <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-accent px-1 text-center font-num text-[11px] font-semibold leading-[18px] text-navy">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )

  return (
    <div className="min-h-screen lg:pl-[264px]">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-navy px-4 py-5 lg:flex">
        <Link href={home} className="px-2"><Logo light /></Link>
        <p className="mt-6 px-3.5 font-display text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">{ROLE_LABEL[user.role]}</p>
        <div className="mt-2 flex-1 overflow-y-auto"><SidebarNav items={items} /></div>
        <div className="mt-4 rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.full_name} src={user.avatar_url} size="sm" className="ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-medium text-white">{user.full_name}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 font-display text-xs text-white/70 hover:bg-white/10 hover:text-white">
              <LogOut className="h-3.5 w-3.5" aria-hidden />Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-navy px-4 text-white lg:h-16 lg:border-b lg:border-line lg:bg-white/90 lg:px-8 lg:text-ink lg:backdrop-blur">
        <Link href={home} className="lg:hidden"><Logo light /></Link>
        <p className="hidden items-center gap-2 text-sm text-ink3 lg:flex">
          <FlaskConical className="h-4 w-4 text-accent-dark" aria-hidden />
          Entorno de demostración académica · datos ficticios, pagos simulados
        </p>
        <div className="flex items-center gap-1">
          {user.role !== 'admin' && (
            <ActionForm action={openSupportChatAction} resetOnSuccess={false}>
              <SubmitButton pendingText="…" className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 font-display text-sm hover:bg-black/5 lg:hover:bg-paper2">
                <LifeBuoy className="h-5 w-5" aria-hidden /><span className="hidden sm:inline">Pregúntale a Handyman</span><span className="sr-only sm:hidden">Pregúntale a Handyman</span>
              </SubmitButton>
            </ActionForm>
          )}
          {bell}
          <form action={logoutAction} className="lg:hidden">
            <button type="submit" aria-label="Cerrar sesión" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"><LogOut className="h-5 w-5" aria-hidden /></button>
          </form>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">{children}</main>
      <BottomNav items={items} />
    </div>
  )
}

export const CUSTOMER_NAV: NavItem[] = [
  { href: '/cliente', label: 'Inicio', icon: 'dashboard', exact: true },
  { href: '/cliente/solicitudes', label: 'Mis solicitudes', short: 'Solicitudes', icon: 'requests' },
  { href: '/cliente/ordenes', label: 'Órdenes', icon: 'orders' },
  { href: '/mensajes', label: 'Mensajes', icon: 'messages' },
  { href: '/cliente/garantias', label: 'Garantías y reclamos', short: 'Garantías', icon: 'warranty' },
  { href: '/cliente/perfil', label: 'Perfil y direcciones', short: 'Perfil', icon: 'user' },
]

export const PRO_NAV: NavItem[] = [
  { href: '/pro', label: 'Inicio', icon: 'dashboard', exact: true },
  { href: '/pro/solicitudes', label: 'Solicitudes', icon: 'inbox' },
  { href: '/pro/cotizaciones', label: 'Mis cotizaciones', short: 'Cotizaciones', icon: 'quotes' },
  { href: '/pro/ordenes', label: 'Órdenes', icon: 'orders' },
  { href: '/mensajes', label: 'Mensajes', icon: 'messages' },
  { href: '/pro/verificacion', label: 'Verificación', icon: 'verify' },
  { href: '/pro/perfil', label: 'Perfil y galería', short: 'Perfil', icon: 'user' },
  { href: '/pro/historial', label: 'Historial y reseñas', short: 'Historial', icon: 'history' },
]

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Panel', icon: 'dashboard', exact: true },
  { href: '/admin/profesionales', label: 'Profesionales', short: 'Verificar', icon: 'pros' },
  { href: '/admin/casos', label: 'Casos y reclamos', short: 'Casos', icon: 'cases' },
  { href: '/mensajes', label: 'Mensajes y soporte', short: 'Mensajes', icon: 'messages' },
  { href: '/admin/operaciones', label: 'Operaciones', short: 'Órdenes', icon: 'orders' },
  { href: '/admin/categorias', label: 'Categorías y garantías', short: 'Oficios', icon: 'categories' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
  { href: '/admin/auditoria', label: 'Auditoría', short: 'Registro', icon: 'audit' },
]
