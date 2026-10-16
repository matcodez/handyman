import { requireUser } from '@/lib/auth/session'
import { AppShell, CUSTOMER_NAV } from '@/components/layout/app-shell'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('customer')
  return <AppShell user={user} items={CUSTOMER_NAV}>{children}</AppShell>
}
