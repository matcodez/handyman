import { Briefcase, CalendarDays, Clock, Images, MapPin, MessageSquareText } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { PortfolioItem, ProCategory, ProProfile, PublicReview } from '@/lib/services/professionals'
import { Badge, DemoBadge } from '@/components/ui/primitives'
import { Avatar, CategoryIcon, Photo, Stars, VerificationBadge } from './visuals'

/**
 * Vista pública del perfil profesional. Solo recibe datos autorizados:
 * nunca dirección residencial, teléfono privado ni documentos de identidad.
 */
export function ProProfileView({ pro, categories, portfolio, reviews, aside }: {
  pro: ProProfile; categories: ProCategory[]; portfolio: PortfolioItem[]; reviews: PublicReview[]; aside?: React.ReactNode
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <header className="card overflow-hidden">
          <div className="relative h-28 bg-gradient-to-r from-navy to-brand-dark"><div className="dots absolute inset-0" aria-hidden /></div>
          <div className="px-5 pb-6 sm:px-7">
            <Avatar name={pro.public_name} src={pro.avatar_url} size="xl" className="-mt-12 ring-4" />
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl font-semibold sm:text-3xl">{pro.public_name}</h1>
              <VerificationBadge status={pro.verification_status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink2">
              <Stars value={pro.rating_average} count={pro.reviews_count} size="md" />
              <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-ink3" aria-hidden /><strong className="font-num font-semibold text-ink">{pro.years_experience}</strong> años de experiencia</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-ink3" aria-hidden /><strong className="font-num font-semibold text-ink">{pro.completed_jobs_count}</strong> trabajos completados en Handyman</span>
            </div>
            {pro.bio && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink2">{pro.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c.category_id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-bg px-3 py-1.5 font-display text-xs font-medium text-brand-dark">
                  <CategoryIcon iconKey={c.icon_key} className="h-3.5 w-3.5" />{c.name}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="card card-pad" aria-labelledby="galeria">
          <div className="flex items-center justify-between gap-3">
            <h2 id="galeria" className="flex items-center gap-2 text-lg font-semibold"><Images className="h-5 w-5 text-brand" aria-hidden />Trabajos anteriores</h2>
            {portfolio.some((p) => p.photo_urls.some((u) => u.startsWith('demo:'))) && <DemoBadge>Fotos de demostración</DemoBadge>}
          </div>
          {portfolio.length === 0 ? (
            <p className="mt-3 text-sm text-ink2">Este profesional aún no ha publicado trabajos en su galería.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {portfolio.map((item) => (
                <li key={item.id} className="overflow-hidden rounded-2xl border border-line">
                  <div className="grid grid-cols-2 gap-0.5 bg-line">
                    {item.photo_urls.slice(0, 2).map((u, i) => (
                      <Photo key={i} src={u} alt={item.title} className={`aspect-[4/3] w-full ${item.photo_urls.length === 1 ? 'col-span-2' : ''}`} />
                    ))}
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-display text-sm font-semibold">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-ink3">{item.category_name ?? 'General'} · {formatDate(item.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-pad" aria-labelledby="resenas">
          <h2 id="resenas" className="flex items-center gap-2 text-lg font-semibold"><MessageSquareText className="h-5 w-5 text-brand" aria-hidden />Reseñas de órdenes completadas</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-ink2">Todavía no hay reseñas. Solo pueden calificar clientes con una orden completada.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {reviews.slice(0, 8).map((r) => (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-sm font-medium">{r.reviewer_first_name} <span className="font-sans font-normal text-ink3">· {r.category_name}</span></p>
                    <Stars value={(r.punctuality_score + r.communication_score + r.cleanliness_score) / 3} />
                  </div>
                  {r.comment && <p className="mt-1.5 text-[15px] text-ink2">{r.comment}</p>}
                  <p className="mt-1.5 text-xs text-ink3">Puntualidad {r.punctuality_score}/5 · Comunicación {r.communication_score}/5 · Limpieza {r.cleanliness_score}/5 · {formatDate(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        {aside}
        <div className="card card-pad">
          <h2 className="font-display text-sm font-semibold">Cobertura</h2>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden /><span className="flex flex-wrap gap-1.5">{pro.service_area.length ? pro.service_area.map((z) => <Badge key={z}>{z}</Badge>) : 'Sin zonas definidas'}</span></p>
          {pro.availability && <p className="mt-3 flex items-start gap-2 text-sm text-ink2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden />{pro.availability}</p>}
        </div>
      </aside>
    </div>
  )
}
