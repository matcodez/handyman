import Link from 'next/link'
import {
  ArrowRight, BadgeCheck, ClipboardList, FileCheck2, HandCoins, Images, MapPin, MessagesSquare, QrCode, ScanLine, Search, ShieldCheck, Star,
} from 'lucide-react'
import { db } from '@/lib/db/client'
import { ZONES } from '@/lib/domain/states'
import { listCategories } from '@/lib/services/catalog'
import { listPublicPros } from '@/lib/services/professionals'
import { DemoBadge } from '@/components/ui/primitives'
import { ProCard } from '@/components/domain/cards'
import { Avatar, CategoryIcon } from '@/components/domain/visuals'

const TRUST = [
  { icon: BadgeCheck, title: 'Identidad verificada', text: 'Cada profesional entrega su DPI y constancias de antecedentes. Administración revisa el expediente antes de aprobarlo.', stat: '71.4%', statText: 'dijo que le cuesta encontrar a alguien de confianza' },
  { icon: Images, title: 'Historial de trabajos', text: 'Antes de contratar ves fotos de trabajos anteriores, años de experiencia y reseñas de órdenes reales completadas en la plataforma.', stat: '90.5%', statText: 'contrató la última vez solo por recomendación de un conocido' },
  { icon: HandCoins, title: 'Precio y alcance acordados', text: 'Recibes cotizaciones con monto en quetzales, alcance, materiales y duración. Lo que aceptas queda congelado en la orden.', stat: '80.9%', statText: 'usaría una app con profesional verificado, precio previo y garantía' },
  { icon: ShieldCheck, title: 'Garantía escrita', text: 'Al aprobar el trabajo se emite una garantía de 30 a 90 días según el oficio, con términos, exclusiones y fechas visibles.', stat: '52.4%', statText: 'ya tuvo un trabajo que quedó mal' },
]

const STEPS = [
  { icon: ClipboardList, title: 'Publica tu solicitud', text: 'Elige el oficio, describe el problema, sube fotos e indica zona y fecha.' },
  { icon: MessagesSquare, title: 'Compara cotizaciones', text: 'Profesionales verificados te envían precio, alcance y materiales. Tú eliges.' },
  { icon: ScanLine, title: 'Confirma con QR', text: 'Al llegar, escaneas su carné digital y confirmas que es la persona que contrataste.' },
  { icon: FileCheck2, title: 'Aprueba y recibe garantía', text: 'Revisas las fotos del trabajo terminado, apruebas y recibes tu garantía escrita.' },
]

export default async function HomePage() {
  const [categories, pros, stats, testimonials] = await Promise.all([
    listCategories(),
    listPublicPros({ limit: 3 }),
    db.q1<{ pros: number; done: number; rating: string | null }>(
      `select (select count(*)::int from professional_profiles where verification_status = 'approved') as pros,
              (select count(*)::int from orders where status = 'completed') as done,
              (select round(avg((punctuality_score + communication_score + cleanliness_score) / 3.0), 1)::text from reviews) as rating`,
    ),
    db.q<{ id: string; comment: string; name: string; category: string; pro: string }>(
      `select rv.id, rv.comment, split_part(u.full_name, ' ', 1) as name, c.name as category, p.public_name as pro
       from reviews rv join users u on u.id = rv.reviewer_id join orders o on o.id = rv.order_id
       join service_requests r on r.id = o.request_id join categories c on c.id = r.category_id
       join professional_profiles p on p.user_id = rv.reviewee_id
       where rv.comment <> '' order by rv.created_at desc limit 3`,
    ),
  ])
  const featured = pros[0]

  return (
    <>
      {/* HERO */}
      <section className="container-page pt-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-xl3 bg-navy text-white">
          <div className="dots absolute inset-0" aria-hidden />
          <div className="absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand/40 blur-3xl" aria-hidden />
          <div className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-accent/15 blur-3xl" aria-hidden />

          <div className="relative grid gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-14 lg:py-20">
            <div className="animate-in-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-display text-xs font-medium text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                Ciudad de Guatemala · Profesionales verificados
              </p>
              <h1 className="text-balance mt-5 text-[2.35rem] font-semibold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
                Encuentra profesionales <span className="text-accent">de confianza</span> para tu hogar u oficina
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                Publica lo que necesitas, compara cotizaciones de profesionales con identidad verificada y contrata con precio acordado y garantía por escrito.
              </p>

              {/* Buscador rápido */}
              <form action="/profesionales" className="mt-7 grid gap-2 rounded-2xl bg-white p-2 shadow-float sm:grid-cols-[1fr_1fr_auto]">
                <label className="relative block">
                  <span className="sr-only">Oficio</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" aria-hidden />
                  <select name="oficio" defaultValue="" className="input border-transparent pl-10">
                    <option value="">¿Qué necesitas?</option>
                    {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </select>
                </label>
                <label className="relative block">
                  <span className="sr-only">Zona aproximada</span>
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" aria-hidden />
                  <select name="zona" defaultValue="" className="input border-transparent pl-10">
                    <option value="">Zona aproximada</option>
                    {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </label>
                <button type="submit" className="btn-primary">Buscar</button>
              </form>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/registro?tipo=cliente" className="btn-accent">Solicitar un servicio <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                <Link href="/registro?tipo=profesional" className="btn border border-white/20 text-white hover:bg-white/10">Soy profesional</Link>
              </div>

              <dl className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/70">
                <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-accent" aria-hidden /><dt className="sr-only">Profesionales verificados</dt><dd><span className="font-num text-lg font-semibold text-white">{stats?.pros ?? 0}</span> profesionales verificados</dd></div>
                <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-accent" aria-hidden /><dt className="sr-only">Trabajos completados</dt><dd><span className="font-num text-lg font-semibold text-white">{stats?.done ?? 0}</span> trabajos completados</dd></div>
                <div className="flex items-center gap-2"><Star className="h-5 w-5 fill-accent text-accent" aria-hidden /><dt className="sr-only">Calificación promedio</dt><dd><span className="font-num text-lg font-semibold text-white">{stats?.rating ?? '—'}</span> de calificación</dd></div>
                <DemoBadge className="border-white/30 bg-white/10 text-white/80">Cifras de demostración</DemoBadge>
              </dl>
            </div>

            {/* Composición: perfil verificado + carné QR + garantía */}
            <div className="relative mx-auto hidden w-full max-w-sm lg:block" aria-hidden>
              <div className="animate-float rounded-3xl bg-white p-5 text-ink shadow-float">
                <div className="flex items-center gap-3.5">
                  <Avatar name={featured?.public_name ?? 'Profesional Demo'} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold">{featured?.public_name ?? 'Profesional demo'}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-1 font-display text-xs font-medium text-ok"><BadgeCheck className="h-3.5 w-3.5" />Identidad verificada</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-paper py-2.5"><p className="font-num text-lg font-semibold">{featured?.years_experience ?? 10}</p><p className="text-[11px] text-ink3">años</p></div>
                  <div className="rounded-xl bg-paper py-2.5"><p className="font-num text-lg font-semibold">{featured?.completed_jobs_count ?? 0}</p><p className="text-[11px] text-ink3">trabajos</p></div>
                  <div className="rounded-xl bg-paper py-2.5"><p className="font-num text-lg font-semibold">{Number(featured?.rating_average ?? 5).toFixed(1)}</p><p className="text-[11px] text-ink3">calificación</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-line px-4 py-3">
                  <div><p className="text-xs text-ink3">Cotización</p><p className="font-num text-xl font-semibold">Q 450.00</p></div>
                  <span className="rounded-lg bg-brand px-3 py-1.5 font-display text-xs font-medium text-white">Aceptar</span>
                </div>
              </div>
              <div className="absolute -left-12 bottom-10 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-float">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white"><QrCode className="h-6 w-6" /></span>
                <div><p className="font-display text-sm font-semibold">Carné con QR</p><p className="text-xs text-ink3">Confirma quién llega</p></div>
              </div>
              <div className="absolute -right-6 -top-6 flex items-center gap-2.5 rounded-2xl bg-accent px-4 py-3 text-navy shadow-float">
                <ShieldCheck className="h-6 w-6" />
                <div><p className="font-display text-sm font-semibold leading-tight">Garantía escrita</p><p className="text-xs">30 a 90 días</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="container-page mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Oficios</p>
            <h2 className="section-title mt-2">¿Qué necesitas resolver hoy?</h2>
          </div>
          <Link href="/servicios" className="hidden items-center gap-1 font-display text-sm font-medium text-brand hover:underline sm:inline-flex">Ver los {categories.length} oficios <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((c) => (
            <li key={c.id}>
              <Link href={`/servicios#${c.slug}`} className="card group flex h-full flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-bg text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <CategoryIcon iconKey={c.icon_key} className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-display text-[15px] font-semibold text-ink">{c.name}</span>
                  <span className="mt-1 line-clamp-2 block text-[13px] text-ink2">{c.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/servicios" className="btn-secondary mt-5 w-full sm:hidden">Ver todos los oficios</Link>
      </section>

      {/* CONFIANZA */}
      <section className="container-page mt-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Por qué Handyman</p>
          <h2 className="section-title mt-2">Confianza antes de contratar. Respaldo después del trabajo.</h2>
          <p className="mt-3 text-ink2">Diseñamos la plataforma a partir de lo que nos dijeron personas que contratan estos servicios en Guatemala.</p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {TRUST.map((t) => (
            <li key={t.title} className="card card-pad flex flex-col">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-accent"><t.icon className="h-6 w-6" aria-hidden /></span>
                <h3 className="text-lg font-semibold">{t.title}</h3>
              </div>
              <p className="mt-3.5 flex-1 text-[15px] leading-relaxed text-ink2">{t.text}</p>
              <p className="mt-4 flex items-baseline gap-2.5 rounded-xl bg-paper px-4 py-3 text-sm text-ink2">
                <span className="font-num text-2xl font-semibold text-brand">{t.stat}</span>
                <span>{t.statText}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink3">Porcentajes tomados de la encuesta de campo del equipo del proyecto (fase Definir). Muestra pequeña y no representativa.</p>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mt-20 bg-white py-16">
        <div className="container-page">
          <div className="text-center">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="section-title mt-2">De la solicitud a la garantía en 4 pasos</h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl bg-paper p-6">
                <span className="font-num text-5xl font-semibold text-brand/15">{String(i + 1).padStart(2, '0')}</span>
                <span className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand shadow-card"><s.icon className="h-5 w-5" aria-hidden /></span>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink2">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center"><Link href="/como-funciona" className="btn-secondary">Ver el proceso completo</Link></div>
        </div>
      </section>

      {/* PROFESIONALES */}
      <section className="container-page mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Profesionales destacados</p>
            <h2 className="section-title mt-2">Conoce a quién vas a dejar entrar</h2>
          </div>
          <DemoBadge>Perfiles de demostración</DemoBadge>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">{pros.map((p) => <ProCard key={p.user_id} pro={p} />)}</div>
        <div className="mt-6 text-center"><Link href="/profesionales" className="btn-secondary">Ver todos los profesionales</Link></div>
      </section>

      {/* GARANTÍA */}
      <section className="container-page mt-20">
        <div className="grid overflow-hidden rounded-xl3 bg-white shadow-card lg:grid-cols-2">
          <div className="p-7 sm:p-10">
            <p className="eyebrow">Garantía y reclamos</p>
            <h2 className="section-title mt-2">Si algo no quedó bien, hay un proceso claro</h2>
            <ul className="mt-6 space-y-4 text-[15px] text-ink2">
              <li className="flex gap-3"><FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /><span><strong className="font-semibold text-ink">Evidencia de finalización.</strong> El profesional sube fotos del trabajo terminado y tú decides si lo apruebas.</span></li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /><span><strong className="font-semibold text-ink">Garantía por escrito.</strong> De 30 a 90 días según el oficio, con alcance, exclusiones y fecha de vencimiento.</span></li>
              <li className="flex gap-3"><MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /><span><strong className="font-semibold text-ink">Reclamos documentados.</strong> Reportas el problema con fotos y administración registra la resolución.</span></li>
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-ink3">La cobertura depende de los términos de cada garantía. En este MVP los términos son de demostración y los pagos retenidos se representan como estados simulados: no se cobra ni se custodia dinero real.</p>
            <Link href="/legal/garantia" className="btn-secondary mt-6">Leer la política de garantía</Link>
          </div>
          <div className="relative flex items-center justify-center bg-gradient-to-br from-navy-3 to-brand-dark p-8">
            <div className="dots absolute inset-0" aria-hidden />
            <div className="relative w-full max-w-xs rounded-3xl bg-white p-5 shadow-float">
              <div className="flex items-center gap-3"><ShieldCheck className="h-9 w-9 text-accent" aria-hidden /><div><p className="font-display text-[11px] uppercase tracking-[0.16em] text-ink3">Garantía escrita</p><p className="font-display font-semibold">Orden HM-DEMO01</p></div></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-paper p-3"><p className="text-xs text-ink3">Duración</p><p className="font-num text-lg font-semibold">60 días</p></div>
                <div className="rounded-xl bg-paper p-3"><p className="text-xs text-ink3">Estado</p><p className="font-display font-semibold text-ok">Activa</p></div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink3">Cubre defectos de mano de obra relacionados con el alcance acordado…</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      {testimonials.length > 0 && (
        <section className="container-page mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Opiniones</p><h2 className="section-title mt-2">Lo que se califica después de cada orden</h2></div>
            <DemoBadge>Testimonios de demostración</DemoBadge>
          </div>
          <ul className="mt-7 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.id} className="card card-pad flex flex-col">
                <div className="flex gap-0.5" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}</div>
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink">“{t.comment}”</blockquote>
                <p className="mt-4 text-sm text-ink2"><span className="font-display font-medium text-ink">{t.name}</span> · {t.category} con {t.pro}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA PROFESIONALES */}
      <section className="container-page mt-20">
        <div className="relative overflow-hidden rounded-xl3 bg-brand px-6 py-12 text-center text-white sm:px-12">
          <div className="dots absolute inset-0" aria-hidden />
          <div className="relative">
            <h2 className="text-balance mx-auto max-w-2xl text-2xl font-semibold sm:text-4xl">¿Eres profesional de un oficio? Consigue clientes con tu trabajo como respaldo.</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">Crea tu perfil, verifica tu identidad y cotiza solicitudes de tu zona. Tu carné digital con QR le da tranquilidad al cliente.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/registro?tipo=profesional" className="btn-accent">Crear perfil profesional</Link>
              <Link href="/como-funciona#profesionales" className="btn border border-white/30 text-white hover:bg-white/10">Cómo funciona para profesionales</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
