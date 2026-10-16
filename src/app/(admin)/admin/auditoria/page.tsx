import { formatDateTime } from '@/lib/format'
import { ROLE_LABEL, type Role } from '@/lib/domain/states'
import { listAudit } from '@/lib/services/admin'
import { PageHeader } from '@/components/ui/primitives'

export const metadata = { title: 'Auditoría' }

export default async function AdminAudit() {
  const rows = await listAudit(300)
  return (
    <>
      <PageHeader title="Registro de auditoría" description="Acciones sensibles: verificaciones, cambios de precio, aceptaciones, aprobaciones, reclamos y cambios de estado. Solo lectura; no se puede editar ni borrar." />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-ink2">{formatDateTime(a.created_at)}</td>
                <td>{a.actor_name ?? 'Sistema'}{a.actor_role && <span className="block text-xs text-ink3">{ROLE_LABEL[a.actor_role as Role]}</span>}</td>
                <td className="font-num text-[13px] text-brand-dark">{a.action}</td>
                <td className="text-ink2">{a.entity_type}<span className="block font-num text-[11px] text-ink3">{a.entity_id?.slice(0, 8)}</span></td>
                <td className="max-w-[320px] text-xs text-ink2">
                  {Object.entries(a.metadata ?? {}).filter(([, v]) => v !== null && v !== '').map(([k, v]) => <span key={k} className="mr-2 inline-block"><span className="text-ink3">{k}:</span> {String(v)}</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
