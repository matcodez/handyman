import { Plus } from 'lucide-react'
import { listCategories, type Category } from '@/lib/services/catalog'
import { saveCategoryAction, toggleCategoryAction } from '@/app/actions/admin'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, PageHeader, Section } from '@/components/ui/primitives'
import { CATEGORY_ICONS, CategoryIcon } from '@/components/domain/visuals'

export const metadata = { title: 'Categorías y garantías' }

function CategoryFields({ c }: { c?: Category }) {
  const p = c?.id ?? 'new'
  return (
    <>
      {c && <input type="hidden" name="category_id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_180px_140px]">
        <div><label className="label" htmlFor={`n-${p}`}>Nombre</label><input id={`n-${p}`} name="name" defaultValue={c?.name} required minLength={3} maxLength={60} className="input" /></div>
        <div>
          <label className="label" htmlFor={`i-${p}`}>Ícono</label>
          <select id={`i-${p}`} name="icon_key" defaultValue={c?.icon_key ?? 'wrench'} className="input">
            {Object.keys(CATEGORY_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor={`w-${p}`}>Garantía (días)</label><input id={`w-${p}`} name="warranty_days" type="number" min={30} max={90} defaultValue={c?.warranty_days ?? 30} required className="input font-num" /></div>
      </div>
      <div><label className="label" htmlFor={`d-${p}`}>Descripción / ejemplos</label><input id={`d-${p}`} name="description" defaultValue={c?.description} required minLength={5} maxLength={200} className="input" /></div>
      <div>
        <label className="label" htmlFor={`t-${p}`}>Plantilla de términos de garantía</label>
        <textarea id={`t-${p}`} name="warranty_terms" defaultValue={c?.warranty_terms} required minLength={20} maxLength={1500} className="input" />
        <p className="hint">Se copia en cada garantía al emitirse; los cambios no alteran garantías ya emitidas.</p>
      </div>
    </>
  )
}

export default async function AdminCategories() {
  const cats = await listCategories({ includeInactive: true })
  return (
    <>
      <PageHeader title="Categorías y garantías" description="Oficios disponibles, su duración de garantía (30 a 90 días) y la plantilla de términos. Todos los cambios quedan auditados." />
      <details className="card mb-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-display font-semibold text-brand [&::-webkit-details-marker]:hidden"><Plus className="h-5 w-5" aria-hidden />Nueva categoría</summary>
        <ActionForm action={saveCategoryAction} className="space-y-4 border-t border-line p-5">
          <CategoryFields />
          <SubmitButton>Crear categoría</SubmitButton>
        </ActionForm>
      </details>

      <Section title={`${cats.length} categorías`} className="mt-0">
        <ul className="space-y-2">
          {cats.map((c) => (
            <li key={c.id}>
              <details className="card group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-bg text-brand"><CategoryIcon iconKey={c.icon_key} className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-display font-semibold">{c.name}</span><span className="block truncate text-xs text-ink3">{c.description}</span></span>
                  <Badge tone="info">{c.warranty_days} días</Badge>
                  <Badge tone={c.active ? 'ok' : 'neutral'}>{c.active ? 'Activa' : 'Inactiva'}</Badge>
                </summary>
                <div className="space-y-4 border-t border-line p-5">
                  <ActionForm action={saveCategoryAction} resetOnSuccess={false} className="space-y-4">
                    <CategoryFields c={c} />
                    <SubmitButton>Guardar cambios</SubmitButton>
                  </ActionForm>
                  <ActionForm action={toggleCategoryAction} confirm={c.active ? `¿Desactivar ${c.name}? Dejará de aparecer para nuevas solicitudes.` : `¿Activar ${c.name}?`}>
                    <input type="hidden" name="category_id" value={c.id} />
                    <SubmitButton className={c.active ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}>{c.active ? 'Desactivar' : 'Activar'}</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
