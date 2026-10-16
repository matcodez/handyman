import { requireUser } from '@/lib/auth/session'
import { formatDate } from '@/lib/format'
import { ROLE_LABEL, type Role } from '@/lib/domain/states'
import { listUsers } from '@/lib/services/admin'
import { setUserStatusAction } from '@/app/actions/admin'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, DemoBadge, PageHeader } from '@/components/ui/primitives'

export const metadata = { title: 'Usuarios' }

export default async function AdminUsers() {
  const admin = await requireUser('admin')
  const users = await listUsers()
  return (
    <>
      <PageHeader title="Usuarios" description="Cuentas registradas. Los roles no pueden cambiarse desde la interfaz y las contraseñas nunca son visibles." />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Alta</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name} {u.is_demo && <DemoBadge className="ml-1 align-middle" />}</td>
                <td className="text-ink2">{u.email}</td>
                <td>{ROLE_LABEL[u.role as Role]}</td>
                <td className="whitespace-nowrap">{formatDate(u.created_at)}</td>
                <td><Badge tone={u.status === 'active' ? 'ok' : 'bad'}>{u.status === 'active' ? 'Activa' : 'Suspendida'}</Badge></td>
                <td className="text-right">
                  {u.role !== 'admin' && u.id !== admin.id && (
                    <ActionForm action={setUserStatusAction} confirm={u.status === 'active' ? `¿Suspender la cuenta de ${u.full_name}? No podrá iniciar sesión.` : `¿Reactivar la cuenta de ${u.full_name}?`}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="status" value={u.status === 'active' ? 'suspended' : 'active'} />
                      <SubmitButton className={u.status === 'active' ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}>{u.status === 'active' ? 'Suspender' : 'Reactivar'}</SubmitButton>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
