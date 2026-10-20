import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { RawTx } from './client'
import { DEMO_PASSWORD, demoPhoto } from '@/lib/demo'
import { DEMO_PROS_BY_AREA } from '@/lib/demo-pros'
import { COMMENTS, WORKS, demoPdf } from './seed'

/**
 * Migración de datos "demo_pros_por_area": agrega un profesional verificado dedicado a cada
 * área de trabajo, con galería, documentos privados de demostración e historial de órdenes
 * completadas con reseñas. Es idempotente (omite correos que ya existen), así que sirve
 * tanto para bases nuevas como para la base ya publicada.
 */
const DAY = 86400000
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000)
const code = (prefix: string) => {
  const a = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  return `${prefix}-${Array.from(crypto.randomBytes(6), (b) => a[b % a.length]).join('')}`
}

// Una solicitud abierta de ejemplo por área, para que cualquier profesional demo tenga algo que cotizar.
const OPEN_REQUESTS: Record<string, [title: string, description: string]> = {
  plomeria: ['Calentador de agua no enciende', 'El calentador de paso dejó de encender desde ayer. Huele un poco a gas cuando intento prenderlo.'],
  electricidad: ['Instalar tomacorrientes en la cocina', 'Necesito agregar 3 tomacorrientes dobles sobre la encimera de la cocina para los electrodomésticos.'],
  albanileria: ['Reparar grieta en pared del patio', 'Hay una grieta diagonal de aproximadamente 1 metro en la pared del patio trasero. Quiero repararla y repellar.'],
  pintura: ['Pintar dos dormitorios', 'Dos dormitorios de 3x3 m. Paredes en buen estado, solo cambio de color a blanco hueso.'],
  carpinteria: ['Puertas de closet desniveladas', 'Las puertas corredizas del closet se salen del riel y una no cierra bien.'],
  herreria: ['Fabricar protecciones para 4 ventanas', 'Necesito protecciones de hierro para 4 ventanas de 1.20 x 1.00 m en el primer nivel, pintadas en negro.'],
  jardineria: ['Mantenimiento mensual de jardín', 'Jardín de 40 m² con grama y arbustos. Busco corte, poda y limpieza una vez al mes.'],
  tablayeso: ['División de tablayeso para oficina', 'Quiero dividir una sala de 4 x 5 m para crear una oficina con puerta.'],
  pisos: ['Cambiar piso del baño', 'Baño de 2 x 2.5 m con piso cerámico dañado. Quiero cambiarlo por porcelanato antideslizante.'],
  techado: ['Filtración en la terraza', 'Cuando llueve fuerte entra agua por el techo de la sala, debajo de la terraza.'],
  cerrajeria: ['Instalar cerradura digital', 'Ya compré una cerradura digital y necesito que la instalen en la puerta principal de madera.'],
  limpieza: ['Limpieza profunda de casa de 2 niveles', 'Casa de 150 m² que estuvo cerrada varios meses. Limpieza general, baños, cocina y ventanas.'],
  'vidrio-aluminio': ['Cambiar vidrio quebrado de ventana', 'Se quebró el vidrio de una ventana corrediza de 1.50 x 1.20 m en la sala.'],
  'aire-acondicionado': ['Mantenimiento de 2 mini splits', 'Dos equipos de 12,000 BTU que no enfrían como antes. Necesito limpieza y revisión de gas.'],
  'control-plagas': ['Fumigación contra cucarachas', 'Apartamento de 90 m² con cucarachas en la cocina. Prefiero productos seguros para mascotas.'],
  'seguridad-electronica': ['Instalar 4 cámaras de seguridad', 'Quiero 4 cámaras exteriores con visión nocturna y verlas desde el teléfono.'],
  mudanzas: ['Mudanza de apartamento de 2 habitaciones', 'Mudanza dentro de la ciudad, de zona 10 a zona 15. Hay que desarmar 2 camas y un ropero.'],
  'ingenieria-civil': ['Revisión estructural antes de construir segundo nivel', 'Quiero construir un segundo nivel y necesito saber si la estructura actual lo soporta.'],
}

export async function seedDemoProsByArea(t: RawTx) {
  const one = async <T>(sql: string, params: unknown[] = []) => (await t.query<T>(sql, params)).rows[0]
  const ins = async (table: string, row: Record<string, unknown>) => {
    const keys = Object.keys(row)
    const r = await one<Record<string, string>>(
      `insert into ${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
      Object.values(row),
    )
    return r!.id ?? r!.user_id
  }

  const admin = await one<{ id: string }>(`select id from users where role = 'admin' order by created_at limit 1`)
  const customers = (await t.query<{ id: string }>(`select id from users where role = 'customer' and is_demo order by created_at limit 2`)).rows
  const cats = new Map(
    (await t.query<{ id: string; slug: string; name: string; warranty_days: number; warranty_terms: string }>(
      `select id, slug, name, warranty_days, warranty_terms from categories`,
    )).rows.map((c) => [c.slug, c]),
  )
  if (!admin || customers.length === 0) return
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)

  for (const [i, p] of DEMO_PROS_BY_AREA.entries()) {
    if (await one(`select 1 from users where email = $1`, [p.email])) continue
    const id = await ins('users', {
      role: 'professional', full_name: p.full, email: p.email, phone: p.phone, password_hash: hash, is_demo: true, created_at: ago(70 - i * 2),
    })
    await ins('professional_profiles', {
      user_id: id, public_name: p.pub, bio: p.bio, years_experience: p.years, service_area: p.zones, availability: p.avail,
      verification_status: 'approved', verified_by: admin.id, verified_at: ago(65 - i * 2), qr_token: crypto.randomBytes(18).toString('base64url'),
    })
    for (const slug of p.cats) {
      const c = cats.get(slug)
      if (c) await ins('professional_categories', { professional_id: id, category_id: c.id })
    }

    // Galería
    const main = p.cats[0]
    for (const [j, title] of (WORKS[main] ?? ['Trabajo realizado']).slice(0, 3).entries()) {
      await ins('portfolio_items', {
        professional_id: id, title, description: 'Trabajo de demostración realizado para un cliente residencial.',
        photo_urls: [demoPhoto(main, j * 2 + 1), demoPhoto(main, j * 2 + 2)], category_id: cats.get(main)?.id ?? null, created_at: ago(50 - j * 6),
      })
    }

    // Documentos privados aprobados
    for (const dt of ['dpi', 'antecedentes_penales', 'antecedentes_policiacos']) {
      const file = `${crypto.randomUUID()}.pdf`
      const pdf = demoPdf(`${dt.toUpperCase().replace(/_/g, ' ')} - ${p.full.normalize('NFD').replace(/[̀-ͯ]/g, '')}`)
      await t.query(`insert into files (bucket, name, mime, size_bytes, data) values ($1,$2,$3,$4,$5)`, ['private', file, 'application/pdf', pdf.length, pdf])
      await ins('professional_documents', {
        professional_id: id, document_type: dt, private_storage_path: `private/${file}`, original_name: `${dt}-demo.pdf`,
        review_status: 'approved', reviewer_id: admin.id, reviewed_at: ago(65 - i * 2), created_at: ago(68 - i * 2),
      })
    }
    await ins('audit_logs', {
      actor_id: admin.id, action: 'verification.approved', entity_type: 'professional', entity_id: id,
      metadata: { from: 'pending', to: 'approved', reason: 'Documentos completos y legibles (demo).', professional: p.pub }, created_at: ago(65 - i * 2),
    })

    // Historial: órdenes completadas con reseña
    const jobs = 3 + (i % 2)
    for (let j = 0; j < jobs; j++) {
      const slug = p.cats[j % p.cats.length]
      const c = cats.get(slug)
      if (!c) continue
      const titles = WORKS[slug] ?? ['Servicio general']
      const title = titles[j % titles.length]
      const customer = customers[(i + j) % customers.length].id
      const zone = p.zones[j % p.zones.length]
      const doneDays = 8 + j * 15 + i * 2
      const date = ago(doneDays).toISOString().slice(0, 10)
      const price = `${400 + ((i * 173 + j * 251) % 16) * 125}.00`
      const reqId = await ins('service_requests', {
        customer_id: customer, category_id: c.id, title, description: 'Solicitud de demostración generada para poblar el historial del profesional.',
        photo_urls: [demoPhoto(slug, 5), demoPhoto(slug, 6)], place_type: 'casa', location_label: zone,
        address_private: `Dirección ficticia ${20 + i}-${30 + j}, ${zone}`, preferred_date: date, preferred_time_window: 'Mañana (8:00 – 12:00)',
        status: 'hired', created_at: ago(doneDays + 4),
      })
      const scope = `${title}. Incluye diagnóstico, mano de obra y limpieza del área de trabajo.`
      const quoteId = await ins('quotes', {
        request_id: reqId, professional_id: id, price_amount: price, scope_description: scope, materials_included: j % 2 === 0,
        materials_notes: j % 2 === 0 ? 'Incluye todos los materiales necesarios.' : 'Materiales por cuenta del cliente.',
        estimated_duration: j % 2 === 0 ? '1 día' : '4 horas', proposed_date: date, notes: '', status: 'accepted',
        created_at: ago(doneDays + 3.6), expires_at: ago(doneDays - 3),
      })
      const orderId = await ins('orders', {
        order_number: code('HM'), request_id: reqId, accepted_quote_id: quoteId, customer_id: customer, professional_id: id, agreed_price: price,
        agreed_scope_snapshot: {
          title, category: c.name, scope_description: scope, materials_included: j % 2 === 0, materials_notes: '',
          estimated_duration: j % 2 === 0 ? '1 día' : '4 horas', notes: '', quoted_price: price, accepted_at: ago(doneDays + 3).toISOString(),
        },
        scheduled_at: date, status: 'completed', created_at: ago(doneDays + 3),
        arrival_marked_at: ago(doneDays, 6), arrival_confirmed_at: ago(doneDays, 5.9), started_at: ago(doneDays, 5.8),
        completed_at: ago(doneDays, 2), approved_at: ago(doneDays),
      })
      await ins('payments', { order_id: orderId, amount: price, status: 'released_demo', provider: 'demo', provider_reference: code('DEMO'), is_demo: true })
      for (const v of [7, 8]) {
        await ins('order_evidence', { order_id: orderId, uploader_id: id, stage: 'final', photo_url: demoPhoto(slug, v), caption: 'Trabajo terminado (foto demo)', created_at: ago(doneDays, 2) })
      }
      const starts = ago(doneDays)
      const expires = new Date(starts.getTime() + c.warranty_days * DAY)
      await ins('warranties', {
        order_id: orderId, policy_version: `2026.1-${c.name}`, terms_text: c.warranty_terms, duration_days: c.warranty_days,
        starts_at: starts, expires_at: expires, status: expires < new Date() ? 'expired' : 'active',
      })
      await ins('reviews', {
        order_id: orderId, reviewer_id: customer, reviewee_id: id,
        punctuality_score: (i + j) % 4 === 3 ? 4 : 5, communication_score: 5, cleanliness_score: (i * j) % 5 === 4 ? 4 : 5,
        comment: COMMENTS[(i * 3 + j) % COMMENTS.length], created_at: ago(doneDays - 0.2),
      })
    }

    await t.query(
      `update professional_profiles p set
         rating_average = coalesce((select round(avg((punctuality_score + communication_score + cleanliness_score) / 3.0), 2) from reviews where reviewee_id = p.user_id), 0),
         reviews_count = (select count(*)::int from reviews where reviewee_id = p.user_id),
         completed_jobs_count = (select count(*)::int from orders where professional_id = p.user_id and status = 'completed')
       where p.user_id = $1`,
      [id],
    )
  }

  // Solicitudes abiertas de ejemplo en las áreas que no tienen ninguna. Las publica un tercer
  // cliente demo para no saturar el panel de Andrea, la cuenta principal de la presentación.
  let sofia = (await one<{ id: string }>(`select id from users where email = 'cliente3@handyman.demo'`))?.id
  if (!sofia) {
    sofia = await ins('users', {
      role: 'customer', full_name: 'Sofía Herrera', email: 'cliente3@handyman.demo', phone: '5550 0013', password_hash: hash, is_demo: true, created_at: ago(30),
    })
    await ins('customer_profiles', { user_id: sofia })
  }
  let k = 0
  for (const [slug, [title, description]] of Object.entries(OPEN_REQUESTS)) {
    const c = cats.get(slug)
    if (!c) continue
    if (await one(`select 1 from service_requests where category_id = $1 and status in ('open','quoting')`, [c.id])) continue
    const pro = DEMO_PROS_BY_AREA.find((p) => p.cats[0] === slug)
    const zone = !pro || pro.zones.includes('Zona 10') ? 'Zona 10' : pro.zones[0]
    await ins('service_requests', {
      customer_id: sofia, category_id: c.id, title, description,
      photo_urls: [demoPhoto(slug, 3), demoPhoto(slug, 4)], place_type: 'casa', location_label: zone,
      address_private: `Dirección ficticia ${40 + k}-${10 + k}, ${zone}`, preferred_date: new Date(Date.now() + (3 + (k % 5)) * DAY).toISOString().slice(0, 10),
      preferred_time_window: k % 2 ? 'Tarde (12:00 – 17:00)' : 'Mañana (8:00 – 12:00)', status: 'open', created_at: ago(0, 2 + k),
    })
    k++
  }
}
