'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase, ClipboardList, FileText, FolderCog, History, Inbox, LayoutDashboard, LifeBuoy, ScrollText, ShieldCheck, User, UserCheck, Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, requests: ClipboardList, orders: Briefcase, warranty: ShieldCheck, user: User, inbox: Inbox, quotes: FileText,
  verify: UserCheck, history: History, pros: UserCheck, categories: FolderCog, cases: LifeBuoy, users: Users, audit: ScrollText,
}

export interface NavItem { href: string; label: string; short?: string; icon: string; badge?: number; exact?: boolean }

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard
        const active = isActive(pathname, item)
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
            className={cn('flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-sm transition-colors',
              active ? 'bg-brand text-white shadow-[0_8px_20px_-8px_rgba(49,84,200,0.9)]' : 'text-white/65 hover:bg-white/5 hover:text-white')}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {!!item.badge && <span className={cn('rounded-full px-2 py-0.5 font-num text-[11px] font-semibold', active ? 'bg-white/20 text-white' : 'bg-accent text-navy')}>{item.badge}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Navegación principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden">
      <ul className="flex overflow-x-auto">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard
          const active = isActive(pathname, item)
          return (
            <li key={item.href} className="min-w-[72px] flex-1">
              <Link href={item.href} aria-current={active ? 'page' : undefined}
                className={cn('relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 font-display text-[11px]', active ? 'font-semibold text-brand' : 'text-ink3')}>
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" aria-hidden />}
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  {!!item.badge && <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-accent px-1 text-center font-num text-[10px] font-semibold leading-4 text-navy">{item.badge}</span>}
                </span>
                {item.short ?? item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
