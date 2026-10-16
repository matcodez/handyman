import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { ADMIN_NAV, AppShell } from '@/components/layout/app-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('admin')
  const c = await db.q1<{ pros: number; cases: number }>(
    `select (select count(*)::int from professional_profiles where verification_status in ('pending','in_review')) as pros,
            (select count(*)::int from support_cases where status in ('open','in_review')) as cases`,
  )
  const items = ADMIN_NAV.map((i) => ({ ...i, badge: i.href === '/admin/profesionales' ? c?.pros : i.href === '/admin/casos' ? c?.cases : undefined }))
  return <AppShell user={user} items={items}>{children}</AppShell>
}
