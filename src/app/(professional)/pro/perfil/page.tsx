import { notFound } from 'next/navigation'
import { ImagePlus, Sparkles, Trash2 } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { ZONES } from '@/lib/domain/states'
import { listCategories } from '@/lib/services/catalog'
import { getProProfile, listPortfolio, listProCategories } from '@/lib/services/professionals'
import { addPortfolioAction, deletePortfolioAction, updateProProfileAction } from '@/app/actions/pro'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Notice, PageHeader, Section } from '@/components/ui/primitives'
import { PhotoInput } from '@/components/domain/photo-input'
import { Avatar, CategoryIcon, Photo } from '@/components/domain/visuals'

export const metadata = { title: 'Perfil y galería' }

export default async function ProProfilePage({ searchParams }: { searchParams: { bienvenida?: string } }) {
  const user = await requireUser('professional')
  const pro = await getProProfile(user.id)
  if (!pro) notFound()
  const [all, mine, portfolio] = await Promise.all([listCategories(), listProCategories(user.id), listPortfolio(user.id)])
  const mineIds = new Set(mine.map((c) => c.category_id))

  return (
    <>
      <PageHeader title="Perfil y galería" description="Esto es lo que verán los clientes al comparar cotizaciones." />
      {searchParams.bienvenida && (
        <div className="mb-6"><Notice tone="ok" icon={Sparkles} title="¡Bienvenido a Handyman!">Paso 1: completa tu perfil. Paso 2: sube tus documentos en el centro de verificación. Cuando administración te apruebe, podrás cotizar.</Notice></div>
      )}

      <ActionForm action={updateProProfileAction} resetOnSuccess={false} className="card card-pad space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={pro.public_name} src={pro.avatar_url} size="lg" />
          <div className="flex-1"><PhotoInput name="avatar" label="Fotografía de perfil" single max={1} hint="Una foto clara de tu rostro: es la que verá el cliente al escanear tu QR." /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="public_name">Nombre comercial</label><input id="public_name" name="public_name" defaultValue={pro.public_name} required minLength={3} maxLength={60} className="input" /></div>
          <div><label className="label" htmlFor="years_experience">Años de experiencia</label><input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={pro.years_experience} required className="input" /></div>
          <div><label className="label" htmlFor="phone">Teléfono</label><input id="phone" name="phone" defaultValue={pro.phone ?? ''} required className="input" /><p className="hint">Solo lo verán clientes con una orden aceptada.</p></div>
          <div><label className="label" htmlFor="availability">Disponibilidad</label><input id="availability" name="availability" defaultValue={pro.availability} required placeholder="Lunes a sábado, 8:00 a 17:00" className="input" /></div>
        </div>
        <div><label className="label" htmlFor="bio">Biografía</label><textarea id="bio" name="bio" defaultValue={pro.bio} required minLength={20} maxLength={800} className="input" placeholder="Tu experiencia, especialidades y forma de trabajar" /></div>

        <fieldset>
          <legend className="label">Oficios (máximo 6)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {all.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line px-3 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-bg/60">
                <input type="checkbox" name="categories" value={c.id} defaultChecked={mineIds.has(c.id)} className="accent-[#3154c8]" />
                <CategoryIcon iconKey={c.icon_key} className="h-4 w-4 text-brand" /><span className="leading-tight">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Zonas de cobertura</legend>
          <div className="flex flex-wrap gap-2">
            {ZONES.map((z) => (
              <label key={z} className="cursor-pointer rounded-full border-2 border-line px-3.5 py-1.5 font-display text-sm has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white">
                <input type="checkbox" name="zones" value={z} defaultChecked={pro.service_area.includes(z)} className="sr-only" />{z}
              </label>
            ))}
          </div>
        </fieldset>
        <SubmitButton>Guardar perfil</SubmitButton>
      </ActionForm>

      <Section title={`Galería de trabajos (${portfolio.length})`}>
        {portfolio.length > 0 && (
          <ul className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((p) => (
              <li key={p.id} className="card overflow-hidden">
                <Photo src={p.photo_urls[0]} alt={p.title} className="aspect-[4/3] w-full" />
                <div className="flex items-start justify-between gap-2 p-3.5">
                  <div className="min-w-0"><p className="truncate font-display text-sm font-semibold">{p.title}</p><p className="text-xs text-ink3">{p.category_name} · {p.photo_urls.length} foto(s)</p></div>
                  <ActionForm action={deletePortfolioAction} confirm={`¿Eliminar “${p.title}” de tu galería?`}>
                    <input type="hidden" name="item_id" value={p.id} />
                    <SubmitButton className="btn-ghost btn-sm px-2" pendingText="…"><Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Eliminar</span></SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addPortfolioAction} className="card card-pad space-y-4">
          <h3 className="flex items-center gap-2 font-display font-semibold"><ImagePlus className="h-5 w-5 text-brand" aria-hidden />Agregar trabajo</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="title">Título</label><input id="title" name="title" required minLength={4} maxLength={80} className="input" /></div>
            <div>
              <label className="label" htmlFor="category_id">Oficio</label>
              <select id="category_id" name="category_id" required defaultValue={mine[0]?.category_id ?? ''} className="input">
                <option value="" disabled>Selecciona</option>
                {all.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label" htmlFor="pdesc">Descripción (opcional)</label><input id="pdesc" name="description" maxLength={400} className="input" /></div>
          <PhotoInput name="photos" label="Fotos" required />
          <SubmitButton className="btn-secondary">Publicar en mi galería</SubmitButton>
        </ActionForm>
      </Section>
    </>
  )
}
