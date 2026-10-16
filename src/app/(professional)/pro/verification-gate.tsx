import Link from 'next/link'
import { Hourglass, ShieldAlert } from 'lucide-react'
import type { VerificationStatus } from '@/lib/domain/states'
import { Notice } from '@/components/ui/primitives'

/** Aviso para profesionales que aún no pueden cotizar. */
export function VerificationGate({ status, note }: { status: VerificationStatus; note?: string | null }) {
  if (status === 'approved') return null
  if (status === 'pending' || status === 'in_review') {
    return (
      <Notice tone="warn" icon={Hourglass} title="Verificación pendiente">
        Tu expediente está en revisión. Mientras tanto no puedes ver solicitudes ni enviar cotizaciones.
      </Notice>
    )
  }
  return (
    <Notice tone={status === 'draft' ? 'info' : 'bad'} icon={ShieldAlert} title={status === 'draft' ? 'Completa tu verificación para empezar a cotizar' : status === 'rejected' ? 'Tu verificación fue rechazada' : 'Tu perfil está suspendido'}>
      {note && <span className="block">{note}</span>}
      {status !== 'suspended' && <Link href="/pro/verificacion" className="font-semibold underline">Ir al centro de verificación</Link>}
    </Notice>
  )
}
