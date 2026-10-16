import { db } from '@/lib/db/client'
import { getSession } from '@/lib/auth/session'
import { Catalog } from './catalog'

export const metadata = { title: 'Servicios' }

export default async function ServicesPage() {
  const [user, items] = await Promise.all([
    getSession(),
    db.q<{ id: string; name: string; slug: string; description: string; icon_key: string; warranty_days: number; pros: number }>(
      `select c.id, c.name, c.slug, c.description, c.icon_key, c.warranty_days,
              (select count(*)::int from professional_categories pc join professional_profiles p on p.user_id = pc.professional_id
               where pc.category_id = c.id and pc.active and p.verification_status = 'approved') as pros
       from categories c where c.active order by c.sort_order`,
    ),
  ])
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Catálogo de oficios</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Un profesional para cada trabajo</h1>
        <p className="mt-4 text-ink2">Mantenimiento, reparación, instalación y construcción para casas, oficinas y otros espacios. Cada oficio tiene su propia duración de garantía.</p>
      </div>
      <div className="mt-8">
        <Catalog items={items} requestHref={user?.role === 'customer' ? '/cliente/solicitudes/nueva' : '/registro?tipo=cliente'} />
      </div>
    </div>
  )
}
