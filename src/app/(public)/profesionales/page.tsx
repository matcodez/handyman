import Link from 'next/link'
import { UserSearch } from 'lucide-react'
import { ZONES } from '@/lib/domain/states'
import { listCategories } from '@/lib/services/catalog'
import { listPublicPros } from '@/lib/services/professionals'
import { DemoBadge, EmptyState } from '@/components/ui/primitives'
import { ProCard } from '@/components/domain/cards'

export const metadata = { title: 'Profesionales verificados' }

export default async function ProsPage({ searchParams }: { searchParams: { oficio?: string; zona?: string } }) {
  const categories = await listCategories()
  const slug = categories.find((c) => c.slug === searchParams.oficio)?.slug
  const zone = (ZONES as readonly string[]).includes(searchParams.zona ?? '') ? searchParams.zona : undefined
  const pros = await listPublicPros({ categorySlug: slug, zone, limit: 48 })

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">Directorio</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Profesionales con identidad verificada</h1>
          <p className="mt-3 text-ink2">Solo aparecen perfiles aprobados por administración. Para contratar, publica una solicitud y recibe sus cotizaciones.</p>
        </div>
        <DemoBadge>Perfiles de demostración</DemoBadge>
      </div>

      <form className="card mt-8 grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <label><span className="sr-only">Oficio</span>
          <select name="oficio" defaultValue={slug ?? ''} className="input">
            <option value="">Todos los oficios</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Zona</span>
          <select name="zona" defaultValue={zone ?? ''} className="input">
            <option value="">Todas las zonas</option>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">Filtrar</button>
        {(slug || zone) && <Link href="/profesionales" className="btn-ghost">Limpiar</Link>}
      </form>

      <p className="mt-5 text-sm text-ink3" aria-live="polite">{pros.length} {pros.length === 1 ? 'profesional encontrado' : 'profesionales encontrados'}</p>
      {pros.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={UserSearch} title="Aún no hay profesionales para ese filtro" description="Prueba con otra zona u oficio, o publica tu solicitud: avisaremos a los profesionales que se sumen." action={<Link href="/profesionales" className="btn-secondary">Ver todos</Link>} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pros.map((p) => <ProCard key={p.user_id} pro={p} />)}</div>
      )}
    </div>
  )
}
