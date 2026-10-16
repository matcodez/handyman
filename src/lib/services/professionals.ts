import 'server-only'
import crypto from 'node:crypto'
import { db, tx } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import { ZONES, type VerificationStatus } from '@/lib/domain/states'
import { adminIds, audit, notify } from './core'

export interface ProProfile {
  user_id: string
  full_name: string
  public_name: string
  avatar_url: string | null
  phone: string | null
  bio: string
  years_experience: number
  service_area: string[]
  availability: string
  verification_status: VerificationStatus
  verification_note: string | null
  verified_at: Date | null
  qr_token: string
  rating_average: string
  reviews_count: number
  completed_jobs_count: number
  created_at: Date
}

const PRO_SELECT = `
  select p.user_id, u.full_name, p.public_name, u.avatar_url, u.phone, p.bio, p.years_experience, p.service_area,
         p.availability, p.verification_status, p.verification_note, p.verified_at, p.qr_token,
         p.rating_average::text as rating_average, p.reviews_count, p.completed_jobs_count, u.created_at
  from professional_profiles p join users u on u.id = p.user_id`

export function newQrToken() {
  return crypto.randomBytes(18).toString('base64url')
}

export function getProProfile(userId: string) {
  return db.q1<ProProfile>(`${PRO_SELECT} where p.user_id = $1`, [userId])
}

/** Búsqueda por token del QR. Solo perfiles de usuarios activos. */
export function getProByQrToken(token: string) {
  return db.q1<ProProfile>(`${PRO_SELECT} where p.qr_token = $1 and u.status = 'active'`, [token])
}

export interface ProCategory { category_id: string; name: string; slug: string; icon_key: string; experience_description: string }

export function listProCategories(userId: string) {
  return db.q<ProCategory>(
    `select pc.category_id, c.name, c.slug, c.icon_key, pc.experience_description
     from professional_categories pc join categories c on c.id = pc.category_id
     where pc.professional_id = $1 and pc.active order by c.sort_order`,
    [userId],
  )
}

export interface PortfolioItem { id: string; title: string; description: string; photo_urls: string[]; category_name: string | null; created_at: Date }

export function listPortfolio(userId: string) {
  return db.q<PortfolioItem>(
    `select pi.id, pi.title, pi.description, pi.photo_urls, c.name as category_name, pi.created_at
     from portfolio_items pi left join categories c on c.id = pi.category_id
     where pi.professional_id = $1 and pi.visibility_status = 'visible' order by pi.created_at desc`,
    [userId],
  )
}

export interface PublicReview {
  id: string; reviewer_first_name: string; punctuality_score: number; communication_score: number; cleanliness_score: number
  comment: string; created_at: Date; category_name: string
}

export function listReviews(userId: string) {
  return db.q<PublicReview>(
    `select rv.id, split_part(u.full_name, ' ', 1) as reviewer_first_name, rv.punctuality_score, rv.communication_score,
            rv.cleanliness_score, rv.comment, rv.created_at, c.name as category_name
     from reviews rv join users u on u.id = rv.reviewer_id join orders o on o.id = rv.order_id
     join service_requests r on r.id = o.request_id join categories c on c.id = r.category_id
     where rv.reviewee_id = $1 and rv.moderation_status = 'published' order by rv.created_at desc`,
    [userId],
  )
}

export interface ProCard {
  user_id: string; public_name: string; avatar_url: string | null; years_experience: number
  verification_status: VerificationStatus; rating_average: string; reviews_count: number; completed_jobs_count: number
  service_area: string[]; categories: string[]; bio: string
}

/** Directorio público: únicamente profesionales aprobados. */
export function listPublicPros(opts: { categorySlug?: string; zone?: string; limit?: number } = {}) {
  const params: unknown[] = []
  const where = [`p.verification_status = 'approved'`, `u.status = 'active'`]
  if (opts.categorySlug) {
    params.push(opts.categorySlug)
    where.push(`exists (select 1 from professional_categories pc join categories c on c.id = pc.category_id
                        where pc.professional_id = p.user_id and pc.active and c.slug = $${params.length})`)
  }
  if (opts.zone) {
    params.push(opts.zone)
    where.push(`p.service_area @> to_jsonb($${params.length}::text)`)
  }
  params.push(opts.limit ?? 24)
  return db.q<ProCard>(
    `select p.user_id, p.public_name, u.avatar_url, p.years_experience, p.verification_status,
            p.rating_average::text as rating_average, p.reviews_count, p.completed_jobs_count, p.service_area, p.bio,
            coalesce((select jsonb_agg(c.name order by c.sort_order) from professional_categories pc
                      join categories c on c.id = pc.category_id where pc.professional_id = p.user_id and pc.active), '[]'::jsonb) as categories
     from professional_profiles p join users u on u.id = p.user_id
     where ${where.join(' and ')}
     order by p.rating_average desc, p.completed_jobs_count desc limit $${params.length}`,
    params,
  )
}

// ── Edición por el profesional ──────────────────────────────────────────────

export async function updateProProfile(
  actor: SessionUser,
  input: { public_name: string; bio: string; years_experience: number; availability: string; phone: string },
  zones: string[],
  categoryIds: string[],
  avatarUrl: string | null,
) {
  if (actor.role !== 'professional') throw new AppError('Acción no permitida.')
  const validZones = zones.filter((z) => (ZONES as readonly string[]).includes(z))
  if (validZones.length === 0) throw new AppError('Selecciona al menos una zona de cobertura.')
  if (categoryIds.length === 0) throw new AppError('Selecciona al menos un oficio.')
  if (categoryIds.length > 6) throw new AppError('Puedes seleccionar un máximo de 6 oficios.')
  await tx(async (t) => {
    // Nota: verification_status NO se toca aquí; solo administración puede cambiarlo.
    await t.q(
      `update professional_profiles set public_name = $1, bio = $2, years_experience = $3, availability = $4, service_area = $5 where user_id = $6`,
      [input.public_name, input.bio, input.years_experience, input.availability, validZones, actor.id],
    )
    await t.q(`update users set phone = $1, avatar_url = coalesce($2, avatar_url) where id = $3`, [input.phone, avatarUrl, actor.id])
    const cats = await t.q<{ id: string }>(`select id from categories where active and id::text = any($1::text[])`, [categoryIds])
    await t.q(`update professional_categories set active = false where professional_id = $1`, [actor.id])
    for (const c of cats) {
      await t.q(
        `insert into professional_categories (professional_id, category_id, active) values ($1,$2,true)
         on conflict (professional_id, category_id) do update set active = true`,
        [actor.id, c.id],
      )
    }
  })
}

export async function addPortfolioItem(
  actor: SessionUser, input: { title: string; description: string; category_id: string }, photoUrls: string[],
) {
  if (actor.role !== 'professional') throw new AppError('Acción no permitida.')
  if (photoUrls.length < 1) throw new AppError('Adjunta al menos una foto del trabajo.')
  const n = await db.q1<{ n: number }>(`select count(*)::int as n from portfolio_items where professional_id = $1`, [actor.id])
  if ((n?.n ?? 0) >= 30) throw new AppError('Alcanzaste el máximo de 30 trabajos en tu galería.')
  await db.q(
    `insert into portfolio_items (professional_id, title, description, photo_urls, category_id) values ($1,$2,$3,$4,$5)`,
    [actor.id, input.title, input.description, photoUrls, input.category_id],
  )
}

export async function deletePortfolioItem(actor: SessionUser, id: string) {
  await db.q(`delete from portfolio_items where id = $1 and professional_id = $2`, [id, actor.id])
}

// ── Verificación ────────────────────────────────────────────────────────────

export interface DocumentRow {
  id: string; professional_id: string; document_type: string; private_storage_path: string; original_name: string
  review_status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null; created_at: Date
}

export function listDocuments(proId: string) {
  return db.q<DocumentRow>(
    `select id, professional_id, document_type, private_storage_path, original_name, review_status, rejection_reason, created_at
     from professional_documents where professional_id = $1 order by created_at desc`,
    [proId],
  )
}

export async function addDocument(actor: SessionUser, documentType: string, storagePath: string, originalName: string) {
  if (actor.role !== 'professional') throw new AppError('Acción no permitida.')
  const p = await getProProfile(actor.id)
  if (!p) throw new AppError('Perfil no encontrado.')
  if (!['draft', 'rejected'].includes(p.verification_status)) {
    throw new AppError('Tus documentos ya están en revisión. Podrás enviar nuevos si administración lo solicita.')
  }
  await db.q(
    `insert into professional_documents (professional_id, document_type, private_storage_path, original_name) values ($1,$2,$3,$4)`,
    [actor.id, documentType, storagePath, originalName.slice(0, 120)],
  )
}

export async function deleteDocument(actor: SessionUser, id: string) {
  await db.q(`delete from professional_documents where id = $1 and professional_id = $2 and review_status = 'pending'`, [id, actor.id])
}

/** El profesional envía su expediente. El estado pasa a "Pendiente"; aprobar es exclusivo de administración. */
export async function submitForVerification(actor: SessionUser) {
  if (actor.role !== 'professional') throw new AppError('Acción no permitida.')
  await tx(async (t) => {
    const p = await t.q1<{ verification_status: VerificationStatus; public_name: string; bio: string }>(
      `select verification_status, public_name, bio from professional_profiles where user_id = $1`, [actor.id],
    )
    if (!p) throw new AppError('Perfil no encontrado.')
    if (!['draft', 'rejected'].includes(p.verification_status)) throw new AppError('Tu expediente ya fue enviado.')
    const docs = await t.q<{ document_type: string }>(
      `select document_type from professional_documents where professional_id = $1 and review_status = 'pending'`, [actor.id],
    )
    if (!docs.some((d) => d.document_type === 'dpi')) throw new AppError('Sube tu DPI para poder enviar el expediente.')
    const cats = await t.q1<{ n: number }>(`select count(*)::int as n from professional_categories where professional_id = $1 and active`, [actor.id])
    if (!cats?.n || p.bio.length < 20) throw new AppError('Completa tu perfil (biografía, oficios y zonas) antes de enviar el expediente.')
    await t.q(`update professional_profiles set verification_status = 'pending', verification_note = null where user_id = $1`, [actor.id])
    for (const a of await adminIds(t)) {
      await notify(t, a, { type: 'verification.submitted', title: 'Profesional pendiente de verificación', body: p.public_name, href: `/admin/profesionales/${actor.id}` })
    }
    await audit(t, actor.id, 'verification.submitted', 'professional', actor.id, { documents: docs.length })
  })
}
