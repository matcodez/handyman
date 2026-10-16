import { requireUser } from '@/lib/auth/session'
import { AppShell, PRO_NAV } from '@/components/layout/app-shell'

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('professional')
  return <AppShell user={user} items={PRO_NAV}>{children}</AppShell>
}
