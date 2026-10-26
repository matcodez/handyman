import { requireUser } from '@/lib/auth/session'
import { listAddresses } from '@/lib/services/accounts'
import { PageHeader } from '@/components/ui/primitives'
import { EmergencyForm } from '@/components/domain/emergency-form'

export const metadata = { title: 'Emergencia' }

export default async function EmergencyPage() {
  const user = await requireUser('customer')
  const addresses = await listAddresses(user.id)
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Emergencia" back={{ href: '/cliente', label: 'Inicio' }} description="Toca lo que pasó y confirma tu dirección. En menos de un minuto avisamos a los profesionales disponibles cerca de ti." />
      <EmergencyForm addresses={addresses} />
    </div>
  )
}
