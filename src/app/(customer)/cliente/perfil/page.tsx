import { Lock, MapPin, Trash2 } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { ZONES } from '@/lib/domain/states'
import { getCustomerProfile, listAddresses } from '@/lib/services/accounts'
import { addAddressAction, deleteAddressAction, updateCustomerProfileAction } from '@/app/actions/customer'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { PageHeader, Section } from '@/components/ui/primitives'

export const metadata = { title: 'Perfil y direcciones' }

export default async function CustomerProfilePage() {
  const user = await requireUser('customer')
  const [profile, addresses] = await Promise.all([getCustomerProfile(user.id), listAddresses(user.id)])
  return (
    <>
      <PageHeader title="Perfil y direcciones" description="Tus datos de contacto y las direcciones donde solicitas servicios." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-lg font-semibold">Datos de contacto</h2>
          <ActionForm action={updateCustomerProfileAction} resetOnSuccess={false} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="full_name">Nombre completo</label>
              <input id="full_name" name="full_name" defaultValue={user.full_name} required minLength={3} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="email">Correo</label>
              <input id="email" value={user.email} disabled className="input bg-paper text-ink3" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Teléfono</label>
              <input id="phone" name="phone" defaultValue={user.phone ?? ''} required className="input" />
              <p className="hint">Solo lo verá el profesional que contrates.</p>
            </div>
            <div>
              <label className="label" htmlFor="preferred_contact">Contacto preferido</label>
              <select id="preferred_contact" name="preferred_contact" defaultValue={profile?.preferred_contact ?? 'app'} className="input">
                <option value="app">Mensajes en la app</option>
                <option value="telefono">Teléfono</option>
                <option value="correo">Correo</option>
              </select>
            </div>
            <SubmitButton>Guardar cambios</SubmitButton>
          </ActionForm>
        </section>

        <section className="space-y-4">
          <div className="card card-pad">
            <h2 className="text-lg font-semibold">Direcciones guardadas</h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden />Los profesionales solo ven la zona hasta que aceptas su cotización.</p>
            {addresses.length === 0 ? (
              <p className="mt-4 text-sm text-ink3">No tienes direcciones guardadas.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-paper p-3.5">
                    <div className="flex min-w-0 gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                      <div className="min-w-0"><p className="font-display text-sm font-semibold">{a.label} · {a.zone}</p><p className="text-sm text-ink2">{a.address_private}</p></div>
                    </div>
                    <ActionForm action={deleteAddressAction} confirm={`¿Eliminar la dirección “${a.label}”?`}>
                      <input type="hidden" name="address_id" value={a.id} />
                      <SubmitButton className="btn-ghost btn-sm px-2" pendingText="…"><Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Eliminar</span></SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Section title="Agregar dirección" className="mt-0">
            <ActionForm action={addAddressAction} className="card card-pad space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="label">Etiqueta</label><input id="label" name="label" required placeholder="Casa, oficina…" className="input" /></div>
                <div>
                  <label className="label" htmlFor="zone">Zona</label>
                  <select id="zone" name="zone" required defaultValue="" className="input">
                    <option value="" disabled>Selecciona</option>
                    {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label" htmlFor="address_private">Dirección exacta</label><input id="address_private" name="address_private" required minLength={8} className="input" /></div>
              <SubmitButton className="btn-secondary">Guardar dirección</SubmitButton>
            </ActionForm>
          </Section>
        </section>
      </div>
    </>
  )
}
