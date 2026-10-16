import { notFound } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { QUOTE } from '@/lib/domain/states'
import { getProProfile } from '@/lib/services/professionals'
import { listOpenRequestsForPro } from '@/lib/services/requests'
import { EmptyState, PageHeader, Section } from '@/components/ui/primitives'
import { RequestCard } from '@/components/domain/cards'
import { VerificationGate } from '../verification-gate'

export const metadata = { title: 'Solicitudes' }

export default async function ProRequests() {
  const user = await requireUser('professional')
  const pro = await getProProfile(user.id)
  if (!pro) notFound()
  if (pro.verification_status !== 'approved') {
    return (<><PageHeader title="Solicitudes" /><VerificationGate status={pro.verification_status} note={pro.verification_note} /></>)
  }
  const list = await listOpenRequestsForPro(user.id)
  const fresh = list.filter((r) => !r.my_quote_id)
  const quoted = list.filter((r) => r.my_quote_id)
  return (
    <>
      <PageHeader title="Solicitudes compatibles" description={`Trabajos abiertos de tus oficios en tus zonas de cobertura (${pro.service_area.join(', ')}). Solo ves la zona aproximada hasta que te contraten.`} />
      <Section title={`Por cotizar (${fresh.length})`} className="mt-0">
        {fresh.length === 0 ? (
          <EmptyState icon={Inbox} title="No hay solicitudes nuevas" description="Amplía tus oficios o zonas de cobertura en tu perfil para ver más oportunidades." />
        ) : (
          <div className="space-y-3">{fresh.map((r) => <RequestCard key={r.id} r={r} href={`/pro/solicitudes/${r.id}`} />)}</div>
        )}
      </Section>
      {quoted.length > 0 && (
        <Section title={`Ya cotizadas (${quoted.length})`}>
          <div className="space-y-3">
            {quoted.map((r) => (
              <div key={r.id} className="relative">
                <RequestCard r={r} href={`/pro/solicitudes/${r.id}`} />
                <span className="pointer-events-none absolute right-14 top-3 hidden font-display text-xs text-ink3 sm:block">Tu cotización: {QUOTE[r.my_quote_status!].label}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
