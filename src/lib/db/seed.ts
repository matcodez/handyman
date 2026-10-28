import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { RawTx } from './client'
import { DEMO_PASSWORD, demoPhoto } from '@/lib/demo'

/**
 * Datos de demostración. TODO lo que se inserta aquí es ficticio: personas, teléfonos,
 * direcciones, reseñas y montos. Los usuarios quedan marcados con is_demo = true.
 */

const DAY = 86400000
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000)
const dateIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10)
const code = (prefix: string) => {
  const a = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  return `${prefix}-${Array.from(crypto.randomBytes(6), (b) => a[b % a.length]).join('')}`
}

const GENERAL_TERMS = (days: number, extra: string) =>
  `Handyman respalda este trabajo por ${days} días a partir de la fecha de aprobación. La garantía cubre defectos de mano de obra ` +
  `directamente relacionados con el alcance acordado en la orden. ${extra} No cubre daños por mal uso, modificaciones hechas por terceros, ` +
  `desgaste normal, ni materiales suministrados por el cliente. Para hacerla válida, reporta el problema desde la app con fotos antes de la fecha de vencimiento. ` +
  `(Texto de demostración: los términos legales definitivos están pendientes de revisión.)`

const CATEGORIES: [name: string, slug: string, desc: string, icon: string, days: number, extra: string][] = [
  ['Plomería', 'plomeria', 'Fugas, grifos, tuberías, calentadores y drenajes.', 'shower-head', 60, 'Incluye fugas en las uniones o piezas instaladas.'],
  ['Electricidad', 'electricidad', 'Tomacorrientes, iluminación, fallas y cableado.', 'plug-zap', 60, 'Incluye fallas en conexiones y dispositivos instalados.'],
  ['Albañilería / construcción', 'albanileria', 'Reparaciones, paredes y trabajos de obra menor.', 'brick-wall', 90, 'Incluye fisuras o desprendimientos en el área intervenida.'],
  ['Pintura', 'pintura', 'Interiores, exteriores y retoques.', 'paint-roller', 30, 'Incluye descascarado o burbujas en superficies preparadas por el profesional.'],
  ['Carpintería', 'carpinteria', 'Puertas, muebles, reparaciones e instalación.', 'hammer', 60, 'Incluye ajustes de bisagras, rieles y ensambles realizados.'],
  ['Herrería', 'herreria', 'Portones, balcones, protecciones y soldadura.', 'flame', 90, 'Incluye soldaduras y anclajes realizados.'],
  ['Jardinería / paisajismo', 'jardineria', 'Poda, mantenimiento e instalación básica.', 'sprout', 30, 'Incluye reposición de plantas instaladas que no hayan prendido.'],
  ['Tablayeso / cielo falso', 'tablayeso', 'Divisiones, reparaciones e instalación.', 'layers', 60, 'Incluye fisuras en juntas y desniveles.'],
  ['Pisos', 'pisos', 'Instalación, reparación y pulido.', 'grid-3x3', 90, 'Incluye piezas sueltas o desniveladas.'],
  ['Techado e impermeabilización', 'techado', 'Filtraciones y reparación de techos.', 'house', 90, 'Incluye filtraciones en el área tratada.'],
  ['Cerrajería', 'cerrajeria', 'Cerraduras, chapas e instalación.', 'key-round', 30, 'Incluye fallas de instalación de chapas y cerraduras.'],
  ['Limpieza profunda', 'limpieza', 'Hogares, oficinas y limpieza post-construcción.', 'spray-can', 30, 'Incluye repaso de áreas que no cumplan lo acordado, reportadas en 48 horas.'],
  ['Vidrio y aluminio', 'vidrio-aluminio', 'Ventanas, puertas y reparaciones.', 'panels-top-left', 60, 'Incluye sellos, rieles y herrajes instalados.'],
  ['Aire acondicionado y refrigeración', 'aire-acondicionado', 'Mantenimiento e instalación.', 'snowflake', 60, 'Incluye fugas de gas o fallas en la instalación.'],
  ['Control de plagas', 'control-plagas', 'Servicios de fumigación.', 'bug-off', 30, 'Incluye una reaplicación si la plaga tratada reaparece.'],
  ['Seguridad electrónica', 'seguridad-electronica', 'Cámaras, alarmas y dispositivos.', 'cctv', 60, 'Incluye configuración y cableado instalado.'],
  ['Mudanzas', 'mudanzas', 'Traslado de muebles y pertenencias.', 'truck', 30, 'Incluye daños ocurridos durante el traslado, reportados al finalizar.'],
  ['Ingeniería civil / supervisión', 'ingenieria-civil', 'Inspecciones, planos y supervisión profesional cuando corresponda.', 'hard-hat', 30, 'Cubre correcciones a entregables documentales.'],
]

interface ProSeed {
  email: string; full: string; pub: string; phone: string; years: number; status: string; note?: string
  cats: string[]; zones: string[]; avail: string; bio: string
}

const PROS: ProSeed[] = [
  { email: 'plomero@handyman.demo', full: 'Carlos Ajú', pub: 'Carlos Ajú · Plomería', phone: '5550 0101', years: 12, status: 'approved',
    cats: ['plomeria', 'aire-acondicionado'], zones: ['Zona 9', 'Zona 10', 'Zona 13', 'Zona 14', 'Zona 15'], avail: 'Lunes a sábado, 7:00 a 17:00',
    bio: 'Plomero con 12 años de experiencia en residencias y edificios de oficinas. Especialista en detección de fugas, calentadores y drenajes. Trabajo limpio y con presupuesto claro antes de empezar.' },
  { email: 'electricista@handyman.demo', full: 'Marvin Xicará', pub: 'Marvin Xicará · Electricista', phone: '5550 0102', years: 9, status: 'approved',
    cats: ['electricidad', 'seguridad-electronica', 'aire-acondicionado'], zones: ['Zona 10', 'Zona 14', 'Zona 15', 'Zona 16', 'Carretera a El Salvador'], avail: 'Lunes a viernes, 8:00 a 18:00',
    bio: 'Electricista certificado por INTECAP. Instalaciones residenciales, tableros, iluminación LED y diagnóstico de cortos. También instalo cámaras y alarmas.' },
  { email: 'pintor@handyman.demo', full: 'José Tzoc', pub: 'José Tzoc · Pintura y acabados', phone: '5550 0103', years: 15, status: 'approved',
    cats: ['pintura', 'tablayeso', 'albanileria'], zones: ['Zona 10', 'Zona 11', 'Zona 14', 'Zona 15', 'Mixco'], avail: 'Lunes a sábado, 7:00 a 16:00',
    bio: 'Pintor y tablayesero con 15 años de oficio. Preparo superficies, protejo muebles y pisos, y entrego el espacio limpio. Interiores, exteriores y cielo falso.' },
  { email: 'carpintero@handyman.demo', full: 'Luis Morales', pub: 'Luis Morales · Carpintería', phone: '5550 0104', years: 20, status: 'approved',
    cats: ['carpinteria', 'cerrajeria', 'vidrio-aluminio'], zones: ['Zona 1', 'Zona 4', 'Zona 9', 'Zona 10', 'Zona 14', 'Zona 15'], avail: 'Martes a sábado, 8:00 a 17:00',
    bio: 'Carpintero de segunda generación. Puertas, closets, cocinas y reparación de muebles. También cambio chapas y ajusto ventanería de aluminio.' },
  { email: 'jardin@handyman.demo', full: 'Ana Lucía Pérez', pub: 'Ana Lucía Pérez · Jardines y limpieza', phone: '5550 0105', years: 7, status: 'approved',
    cats: ['jardineria', 'limpieza', 'control-plagas'], zones: ['Zona 10', 'Zona 14', 'Zona 15', 'Zona 16', 'Santa Catarina Pinula', 'Carretera a El Salvador'], avail: 'Lunes a sábado, 6:30 a 15:00',
    bio: 'Dirijo un equipo de tres personas para mantenimiento de jardines, limpieza profunda de casas y oficinas, y fumigación con productos registrados.' },
  { email: 'albanil@handyman.demo', full: 'Edwin Chacón', pub: 'Edwin Chacón · Obra y techos', phone: '5550 0106', years: 18, status: 'approved',
    cats: ['albanileria', 'pisos', 'techado', 'plomeria'], zones: ['Zona 10', 'Zona 11', 'Zona 12', 'Zona 14', 'Zona 15', 'Villa Nueva', 'San Cristóbal'], avail: 'Lunes a sábado, 7:00 a 17:00',
    bio: 'Maestro de obra con 18 años de experiencia. Remodelaciones menores, instalación de piso cerámico y porcelanato, impermeabilización de terrazas y losas.' },
  { email: 'multiservicios@handyman.demo', full: 'Sergio Hernández', pub: 'Multiservicios Hernández', phone: '5550 0107', years: 6, status: 'approved',
    cats: ['plomeria', 'electricidad', 'mudanzas'], zones: ['Zona 10', 'Zona 13', 'Zona 14', 'Zona 15', 'Mixco', 'Villa Nueva'], avail: 'Todos los días, 8:00 a 18:00',
    bio: 'Pequeña empresa familiar. Resolvemos reparaciones eléctricas y de plomería el mismo día, y ofrecemos servicio de mudanza con camión propio.' },
  { email: 'pendiente@handyman.demo', full: 'Diego Ramírez', pub: 'Diego Ramírez · Herrería', phone: '5550 0108', years: 8, status: 'pending',
    cats: ['herreria'], zones: ['Zona 11', 'Zona 12', 'Mixco'], avail: 'Lunes a viernes, 8:00 a 17:00',
    bio: 'Herrero con taller propio. Portones, balcones, puertas de seguridad y estructuras metálicas livianas. Soldadura MIG y eléctrica.' },
  { email: 'rechazado@handyman.demo', full: 'Óscar Juárez', pub: 'Óscar Juárez · Mudanzas', phone: '5550 0109', years: 3, status: 'rejected',
    note: 'El DPI enviado es ilegible y falta la constancia de antecedentes penales. Vuelve a subir ambos documentos.',
    cats: ['mudanzas'], zones: ['Zona 1', 'Mixco'], avail: 'Fines de semana',
    bio: 'Servicio de fletes y mudanzas pequeñas dentro de la ciudad capital y municipios cercanos.' },
]

export const WORKS: Record<string, string[]> = {
  plomeria: ['Reparación de fuga en lavamanos', 'Cambio de calentador de paso', 'Destape de drenaje de cocina', 'Instalación de grifería de baño'],
  electricidad: ['Cambio de tablero de distribución', 'Instalación de luminarias LED', 'Reparación de tomacorrientes', 'Cableado para estufa eléctrica'],
  pintura: ['Pintura de sala y comedor', 'Retoque de fachada', 'Pintura de oficina de 80 m²', 'Pintura de dormitorios'],
  carpinteria: ['Closet a medida', 'Ajuste de puertas de cocina', 'Restauración de mesa de comedor', 'Instalación de puerta de madera'],
  jardineria: ['Mantenimiento mensual de jardín', 'Poda de seto y árboles', 'Instalación de grama', 'Diseño de jardinera de entrada'],
  albanileria: ['Reparación de muro con humedad', 'Levantado de pared divisoria', 'Resane y repello de fachada', 'Base de concreto para pila'],
  'aire-acondicionado': ['Mantenimiento de mini split', 'Instalación de aire de 12,000 BTU'],
  'seguridad-electronica': ['Instalación de 4 cámaras', 'Configuración de alarma'],
  tablayeso: ['Cielo falso en sala', 'División de oficina'],
  cerrajeria: ['Cambio de chapa principal', 'Instalación de cerradura digital'],
  'vidrio-aluminio': ['Cambio de vidrio de ventana', 'Ajuste de puerta corrediza'],
  limpieza: ['Limpieza post-remodelación', 'Limpieza profunda de oficina'],
  'control-plagas': ['Fumigación contra cucarachas', 'Control de hormigas en jardín'],
  pisos: ['Instalación de porcelanato', 'Cambio de piso de baño'],
  techado: ['Impermeabilización de losa', 'Reparación de lámina'],
  mudanzas: ['Mudanza de apartamento', 'Traslado de oficina pequeña'],
  herreria: ['Portón corredizo', 'Balcón de seguridad', 'Protecciones para ventanas', 'Reparación de soldadura'],
  'ingenieria-civil': ['Inspección estructural de vivienda', 'Planos para ampliación', 'Supervisión de remodelación'],
}

export const COMMENTS = [
  'Llegó puntual, explicó lo que iba a hacer y dejó todo limpio. Muy recomendado.',
  'Buen trabajo y precio justo. Respetó lo que se había cotizado.',
  'Resolvió el problema el mismo día. Excelente comunicación por la app.',
  'Muy profesional. Me mostró el avance con fotos antes de terminar.',
  'Trabajo bien hecho. Se tardó un poco más de lo estimado, pero avisó a tiempo.',
  'Cuidadoso con los muebles y muy ordenado. Volvería a contratarlo.',
  'Cumplió con el alcance acordado y me explicó la garantía.',
]

/** PDF mínimo válido para los documentos privados de demostración. */
export function demoPdf(title: string) {
  const stream = `BT /F1 16 Tf 36 200 Td (${title}) Tj 0 -26 Td /F1 11 Tf (DOCUMENTO DE DEMOSTRACION - SIN VALIDEZ) Tj 0 -18 Td (Handyman / datos ficticios) Tj ET`
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 260]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

export async function seed(t: RawTx) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)

  {
    const ins = async (table: string, row: Record<string, unknown>): Promise<string> => {
      const keys = Object.keys(row)
      const res = await t.query<Record<string, string>>(
        `insert into ${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
        Object.values(row) as never[],
      )
      return res.rows[0].id ?? res.rows[0].user_id
    }

    // ── Categorías ──
    const cat: Record<string, string> = {}
    for (const [i, [name, slug, description, icon_key, warranty_days, extra]] of CATEGORIES.entries()) {
      cat[slug] = await ins('categories', {
        name, slug, description, icon_key, warranty_days, warranty_terms: GENERAL_TERMS(warranty_days, extra), sort_order: i + 1,
      })
    }

    // ── Usuarios ──
    const user = (role: string, full_name: string, email: string, phone: string, created: Date) =>
      ins('users', { role, full_name, email, phone, password_hash: hash, is_demo: true, created_at: created })

    const admin = await user('admin', 'Lucía Méndez', 'admin@handyman.demo', '5550 0001', ago(120))
    const andrea = await user('customer', 'Andrea Castillo', 'cliente@handyman.demo', '5550 0011', ago(90))
    const roberto = await user('customer', 'Roberto Aguilar', 'cliente2@handyman.demo', '5550 0012', ago(75))
    for (const c of [andrea, roberto]) await ins('customer_profiles', { user_id: c })
    await ins('customer_addresses', { user_id: andrea, label: 'Casa', zone: 'Zona 10', address_private: '4a. avenida 12-34, Edificio Demo, apto. 5B, zona 10' })
    await ins('customer_addresses', { user_id: andrea, label: 'Oficina', zone: 'Zona 14', address_private: '10a. calle 3-21, Centro Empresarial Demo, nivel 7, zona 14' })
    await ins('customer_addresses', { user_id: roberto, label: 'Casa', zone: 'Zona 15', address_private: '2a. calle 20-15, Colonia Demo, casa 8, zona 15' })

    const pro: Record<string, string> = {}
    for (const [i, p] of PROS.entries()) {
      const id = await user('professional', p.full, p.email, p.phone, ago(80 - i * 4))
      pro[p.email.split('@')[0]] = id
      await ins('professional_profiles', {
        user_id: id, public_name: p.pub, bio: p.bio, years_experience: p.years, service_area: p.zones, availability: p.avail,
        verification_status: p.status, verification_note: p.note ?? null,
        verified_by: p.status === 'approved' || p.status === 'rejected' ? admin : null,
        verified_at: p.status === 'approved' || p.status === 'rejected' ? ago(70 - i * 4) : null,
        qr_token: crypto.randomBytes(18).toString('base64url'),
      })
      for (const slug of p.cats) await ins('professional_categories', { professional_id: id, category_id: cat[slug] }).catch(() => '')
      // Portafolio
      let v = 1
      for (const slug of p.cats) {
        for (const title of (WORKS[slug] ?? []).slice(0, slug === p.cats[0] ? 3 : 1)) {
          await ins('portfolio_items', {
            professional_id: id, title, description: 'Trabajo de demostración realizado para un cliente residencial.',
            photo_urls: [demoPhoto(slug, v), demoPhoto(slug, v + 1)], category_id: cat[slug], created_at: ago(60 - v * 5),
          })
          v++
        }
      }
      // Documentos privados (PDF de demostración en almacenamiento privado)
      const docTypes = p.status === 'rejected' ? ['dpi'] : ['dpi', 'antecedentes_penales', 'antecedentes_policiacos']
      for (const dt of docTypes) {
        const file = `${crypto.randomUUID()}.pdf`
        const pdf = demoPdf(`${dt.toUpperCase().replace(/_/g, ' ')} - ${p.full.normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`)
        await t.query(`insert into files (bucket, name, mime, size_bytes, data) values ($1,$2,$3,$4,$5)`, ['private', file, 'application/pdf', pdf.length, pdf])
        await ins('professional_documents', {
          professional_id: id, document_type: dt, private_storage_path: `private/${file}`, original_name: `${dt}-demo.pdf`,
          review_status: p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending',
          reviewer_id: p.status === 'pending' ? null : admin, reviewed_at: p.status === 'pending' ? null : ago(70 - i * 4),
          rejection_reason: p.status === 'rejected' ? p.note : null, created_at: ago(78 - i * 4),
        })
      }
      if (p.status !== 'pending') {
        await ins('audit_logs', {
          actor_id: admin, action: `verification.${p.status}`, entity_type: 'professional', entity_id: id,
          metadata: { from: 'pending', to: p.status, reason: p.note ?? 'Documentos completos y legibles (demo).', professional: p.pub }, created_at: ago(70 - i * 4),
        })
      }
    }
    // Profesional recién registrado, sin expediente
    const nuevo = await user('professional', 'Kevin López', 'nuevo@handyman.demo', '5550 0110', ago(1))
    await ins('professional_profiles', { user_id: nuevo, public_name: 'Kevin López', qr_token: crypto.randomBytes(18).toString('base64url') })

    // ── Solicitudes, cotizaciones y órdenes ──
    interface Req { customer: string; slug: string; title: string; desc: string; zone: string; addr: string; place?: string; created: number; date: string; status: string }
    const request = (r: Req) =>
      ins('service_requests', {
        customer_id: r.customer, category_id: cat[r.slug], title: r.title, description: r.desc, photo_urls: [demoPhoto(r.slug, 5), demoPhoto(r.slug, 6)],
        place_type: r.place ?? 'casa', location_label: r.zone, address_private: r.addr, preferred_date: r.date,
        preferred_time_window: 'Mañana (8:00 – 12:00)', status: r.status, created_at: ago(r.created),
      })
    interface Qt { req: string; pro: string; price: string; scope: string; mat: boolean; matNotes?: string; dur: string; date: string; status: string; created: number }
    const quote = (q: Qt) =>
      ins('quotes', {
        request_id: q.req, professional_id: q.pro, price_amount: q.price, scope_description: q.scope, materials_included: q.mat,
        materials_notes: q.matNotes ?? (q.mat ? 'Incluye todos los materiales necesarios.' : 'Materiales por cuenta del cliente; se entrega lista.'),
        estimated_duration: q.dur, proposed_date: q.date, notes: 'Precio final sujeto a que el alcance no cambie al revisar en sitio.',
        status: q.status, created_at: ago(q.created), expires_at: new Date(Date.now() + 10 * DAY),
      })

    interface Ord {
      r: Req; q: Omit<Qt, 'req' | 'status' | 'created'>; status: string; daysDone?: number; review?: [number, number, number]
      payment: string; warranty?: string
    }
    const order = async (o: Ord) => {
      const reqId = await request({ ...o.r, status: 'hired' })
      const qId = await quote({ ...o.q, req: reqId, status: 'accepted', created: o.r.created - 0.5 })
      const done = o.daysDone
      const reached = (s: string[]) => s.includes(o.status)
      const orderId = await ins('orders', {
        order_number: code('HM'), request_id: reqId, accepted_quote_id: qId, customer_id: o.r.customer, professional_id: o.q.pro,
        agreed_price: o.q.price,
        agreed_scope_snapshot: {
          title: o.r.title, category: CATEGORIES.find((c) => c[1] === o.r.slug)![0], scope_description: o.q.scope, materials_included: o.q.mat,
          materials_notes: o.q.matNotes ?? '', estimated_duration: o.q.dur, notes: '', quoted_price: o.q.price, accepted_at: ago(o.r.created - 1).toISOString(),
        },
        scheduled_at: o.q.date, status: o.status, created_at: ago(o.r.created - 1),
        arrival_marked_at: reached(['arrived', 'in_progress', 'pending_approval', 'completed', 'disputed']) ? ago((done ?? 0) + 0.3) : null,
        arrival_confirmed_at: reached(['arrived', 'in_progress', 'pending_approval', 'completed', 'disputed']) ? ago((done ?? 0) + 0.29) : null,
        started_at: reached(['in_progress', 'pending_approval', 'completed', 'disputed']) ? ago((done ?? 0) + 0.28) : null,
        completed_at: reached(['pending_approval', 'completed', 'disputed']) ? ago(done ?? 0, 3) : null,
        approved_at: o.status === 'completed' ? ago(done ?? 0) : null,
      })
      await ins('payments', { order_id: orderId, amount: o.q.price, status: o.payment, provider: 'demo', provider_reference: code('DEMO'), is_demo: true })
      if (reached(['pending_approval', 'completed', 'disputed'])) {
        for (const v of [7, 8]) {
          await ins('order_evidence', { order_id: orderId, uploader_id: o.q.pro, stage: 'final', photo_url: demoPhoto(o.r.slug, v), caption: 'Trabajo terminado (foto demo)', created_at: ago(done ?? 0, 3) })
        }
      }
      let warrantyId: string | null = null
      if (o.status === 'completed') {
        const c = CATEGORIES.find((x) => x[1] === o.r.slug)!
        const starts = ago(done ?? 0)
        const expires = new Date(starts.getTime() + c[4] * DAY)
        warrantyId = await ins('warranties', {
          order_id: orderId, policy_version: `2026.1-${c[0]}`, terms_text: GENERAL_TERMS(c[4], c[5]), duration_days: c[4], starts_at: starts, expires_at: expires,
          status: o.warranty ?? (expires < new Date() ? 'expired' : 'active'),
        })
        if (o.review) {
          await ins('reviews', {
            order_id: orderId, reviewer_id: o.r.customer, reviewee_id: o.q.pro, punctuality_score: o.review[0], communication_score: o.review[1],
            cleanliness_score: o.review[2], comment: COMMENTS[Math.floor((done ?? 0) * 7 + o.review[0]) % COMMENTS.length], created_at: ago((done ?? 0) - 0.2),
          })
        }
      }
      return { orderId, reqId, warrantyId }
    }

    // Historial: órdenes completadas con reseñas para cada profesional aprobado.
    let n = 0
    for (const p of PROS.filter((x) => x.status === 'approved')) {
      const id = pro[p.email.split('@')[0]]
      const jobs = 3 + (n % 3)
      for (let j = 0; j < jobs; j++) {
        const slug = p.cats[j % p.cats.length]
        const titles = WORKS[slug] ?? ['Servicio general']
        const customer = (n + j) % 2 === 0 ? roberto : andrea
        const zone = p.zones[j % p.zones.length]
        const daysDone = 12 + j * 17 + n * 3
        const price = String(350 + ((n * 137 + j * 211) % 14) * 150)
        await order({
          r: { customer, slug, title: titles[j % titles.length], desc: 'Solicitud de demostración generada para poblar el historial del profesional.', zone,
            addr: `Dirección ficticia ${10 + n}-${20 + j}, ${zone}`, created: daysDone + 4, date: ago(daysDone).toISOString().slice(0, 10), status: 'hired' },
          q: { pro: id, price: `${price}.00`, scope: `${titles[j % titles.length]}. Incluye diagnóstico, mano de obra y limpieza del área de trabajo.`, mat: j % 2 === 0, dur: j % 2 === 0 ? '1 día' : '4 horas', date: ago(daysDone).toISOString().slice(0, 10) },
          status: 'completed', daysDone, payment: 'released_demo',
          review: [5 - ((n + j) % 3 === 2 ? 1 : 0), 5 - ((n * j) % 4 === 3 ? 1 : 0), 5 - ((n + 2 * j) % 5 === 4 ? 1 : 0)],
        })
      }
      n++
    }

    // Escenarios activos de Andrea (cuenta principal de la demo)
    const fuga = await request({
      customer: andrea, slug: 'plomeria', title: 'Fuga de agua bajo el lavatrastos', zone: 'Zona 10', addr: '4a. avenida 12-34, Edificio Demo, apto. 5B, zona 10',
      desc: 'Desde ayer hay un goteo constante en la tubería bajo el lavatrastos de la cocina. Se moja el gabinete y ya puse una cubeta. Necesito que revisen si es el sifón o la llave de paso.',
      created: 2, date: dateIn(2), status: 'quoting',
    })
    await quote({ req: fuga, pro: pro.plomero, price: '450.00', scope: 'Diagnóstico de la fuga, cambio de sifón y empaques, sellado de uniones y prueba de presión por 20 minutos.', mat: true, matNotes: 'Incluye sifón de PVC, empaques y teflón.', dur: '2 horas', date: dateIn(2), status: 'sent', created: 1.8 })
    await quote({ req: fuga, pro: pro.albanil, price: '380.00', scope: 'Revisión de tubería bajo lavatrastos y reparación de la unión con fuga. Si se requiere cambio de llave de paso se cotiza aparte.', mat: false, matNotes: 'Materiales no incluidos; estimado adicional de Q 80 a Q 150.', dur: '2 a 3 horas', date: dateIn(3), status: 'sent', created: 1.5 })
    await quote({ req: fuga, pro: pro.multiservicios, price: '520.00', scope: 'Cambio completo de sifón, manguera de abasto y llave de paso angular. Incluye limpieza del gabinete y prueba de funcionamiento.', mat: true, matNotes: 'Incluye llave angular, manguera flexible y sifón.', dur: '1.5 horas', date: dateIn(1), status: 'sent', created: 1.2 })
    await ins('request_messages', { request_id: fuga, author_id: pro.plomero, body: '¿La fuga es constante o solo cuando abre el grifo? ¿El sifón es de PVC o metálico?', created_at: ago(1.9) })
    await ins('request_messages', { request_id: fuga, author_id: andrea, body: 'Es constante, aunque el grifo esté cerrado. El sifón es de PVC blanco.', created_at: ago(1.85) })

    await request({
      customer: andrea, slug: 'limpieza', title: 'Limpieza profunda después de remodelación', zone: 'Zona 10', addr: '4a. avenida 12-34, Edificio Demo, apto. 5B, zona 10',
      desc: 'Terminamos de remodelar la cocina y quedó polvo fino en todo el apartamento (85 m²). Necesito limpieza de pisos, ventanas, gabinetes y baños.',
      created: 0.2, date: dateIn(5), status: 'open',
    })

    const lamparas = await order({
      r: { customer: andrea, slug: 'electricidad', title: 'Instalar 6 lámparas LED en sala y comedor', zone: 'Zona 14', place: 'oficina', addr: '10a. calle 3-21, Centro Empresarial Demo, nivel 7, zona 14',
        desc: 'Quiero reemplazar las lámparas viejas por 6 luminarias LED empotrables que ya compré. El cielo es de tablayeso.', created: 4, date: dateIn(1), status: 'hired' },
      q: { pro: pro.electricista, price: '900.00', scope: 'Desmontaje de 6 lámparas existentes, instalación y conexión de 6 luminarias LED empotrables, prueba de circuito y retiro de desechos.', mat: false, matNotes: 'El cliente proporciona las luminarias. Incluye conectores y cinta aislante.', dur: '4 horas', date: dateIn(1) },
      status: 'scheduled', payment: 'held_demo',
    })
    const pintura = await order({
      r: { customer: andrea, slug: 'pintura', title: 'Pintar apartamento de 2 habitaciones', zone: 'Zona 10', addr: '4a. avenida 12-34, Edificio Demo, apto. 5B, zona 10',
        desc: 'Pintura completa de paredes interiores en color blanco hueso. Hay algunas grietas pequeñas en la sala que deben resanarse antes.', created: 9, date: ago(2).toISOString().slice(0, 10), status: 'hired' },
      q: { pro: pro.pintor, price: '2850.00', scope: 'Resane de grietas, lijado, una mano de sellador y dos manos de pintura látex en sala, comedor, pasillo y 2 dormitorios. Protección de pisos y muebles.', mat: true, matNotes: 'Incluye pintura látex premium, sellador, masilla y materiales de protección.', dur: '3 días', date: ago(2).toISOString().slice(0, 10) },
      status: 'pending_approval', daysDone: 0, payment: 'held_demo',
    })
    await order({
      r: { customer: andrea, slug: 'carpinteria', title: 'Reparar puerta principal que no cierra bien', zone: 'Zona 10', addr: '4a. avenida 12-34, Edificio Demo, apto. 5B, zona 10',
        desc: 'La puerta de entrada roza con el marco y hay que empujarla para que cierre. Creo que se bajó una bisagra.', created: 16, date: ago(10).toISOString().slice(0, 10), status: 'hired' },
      q: { pro: pro.carpintero, price: '375.00', scope: 'Ajuste y refuerzo de bisagras, cepillado del canto superior y ajuste del pestillo.', mat: true, dur: '2 horas', date: ago(10).toISOString().slice(0, 10) },
      status: 'completed', daysDone: 10, payment: 'released_demo', review: [5, 5, 5],
    })

    // Escenarios de Roberto (alimentan el panel administrativo)
    const terraza = await order({
      r: { customer: roberto, slug: 'techado', title: 'Impermeabilizar terraza de 30 m²', zone: 'Zona 15', addr: '2a. calle 20-15, Colonia Demo, casa 8, zona 15',
        desc: 'Hay filtraciones hacia el dormitorio cuando llueve. Necesito impermeabilizar toda la terraza.', created: 8, date: ago(3).toISOString().slice(0, 10), status: 'hired' },
      q: { pro: pro.albanil, price: '3200.00', scope: 'Limpieza de superficie, sellado de grietas y aplicación de dos capas de impermeabilizante acrílico en 30 m².', mat: true, dur: '2 días', date: ago(3).toISOString().slice(0, 10) },
      status: 'disputed', daysDone: 1, payment: 'refund_review',
    })
    const caso1 = await ins('support_cases', {
      case_number: code('CASO'), order_id: terraza.orderId, opened_by: roberto, kind: 'dispute', reason: 'El trabajo quedó incompleto',
      description: 'Solo aplicaron una capa de impermeabilizante y quedó una esquina sin cubrir junto a la bajada de agua. El alcance decía dos capas en toda la terraza.',
      evidence_urls: [demoPhoto('techado', 9)], status: 'open', created_at: ago(0.6),
    })
    const chapa = await order({
      r: { customer: roberto, slug: 'cerrajeria', title: 'Cambiar chapa de la puerta de la cocina', zone: 'Zona 15', addr: '2a. calle 20-15, Colonia Demo, casa 8, zona 15',
        desc: 'La chapa se traba y a veces no gira la llave. Quiero cambiarla por una nueva.', created: 20, date: ago(14).toISOString().slice(0, 10), status: 'hired' },
      q: { pro: pro.carpintero, price: '425.00', scope: 'Retiro de chapa dañada e instalación de chapa nueva de pomo con llave, ajuste de contrachapa.', mat: true, dur: '1 hora', date: ago(14).toISOString().slice(0, 10) },
      status: 'completed', daysDone: 14, payment: 'released_demo', review: [5, 4, 5], warranty: 'reported',
    })
    const caso2 = await ins('support_cases', {
      case_number: code('CASO'), order_id: chapa.orderId, warranty_id: chapa.warrantyId, opened_by: roberto, kind: 'warranty', reason: 'Una pieza instalada dejó de funcionar',
      description: 'La chapa nueva volvió a trabarse después de dos semanas. Hay que forzar la llave para abrir.', evidence_urls: [demoPhoto('cerrajeria', 9)], status: 'open', created_at: ago(0.3),
    })
    await order({
      r: { customer: roberto, slug: 'electricidad', title: 'Corto circuito en tomacorrientes de la cocina', zone: 'Zona 15', addr: '2a. calle 20-15, Colonia Demo, casa 8, zona 15',
        desc: 'Al conectar el microondas se baja el flipón. Pasa en dos tomacorrientes de la cocina.', created: 3, date: dateIn(0), status: 'hired' },
      q: { pro: pro.electricista, price: '650.00', scope: 'Diagnóstico del circuito, cambio de 2 tomacorrientes y revisión del flipón correspondiente.', mat: true, dur: '3 horas', date: dateIn(0) },
      status: 'in_progress', daysDone: 0, payment: 'held_demo',
    })
    const aire = await request({
      customer: roberto, slug: 'aire-acondicionado', title: 'Instalar aire acondicionado de 12,000 BTU', zone: 'Zona 15', addr: '2a. calle 20-15, Colonia Demo, casa 8, zona 15',
      desc: 'Ya tengo el equipo mini split. Necesito instalación en el dormitorio principal, con unos 4 metros de tubería.', created: 1, date: dateIn(4), status: 'quoting',
    })
    await quote({ req: aire, pro: pro.plomero, price: '1250.00', scope: 'Instalación de mini split de 12,000 BTU: soportes, 4 m de tubería de cobre, drenaje, vacío y prueba de funcionamiento.', mat: true, dur: '5 horas', date: dateIn(4), status: 'sent', created: 0.8 })

    // ── Reputación derivada de los datos reales insertados ──
    await t.exec(`
      update professional_profiles p set
        rating_average = coalesce((select round(avg((punctuality_score + communication_score + cleanliness_score) / 3.0), 2) from reviews where reviewee_id = p.user_id), 0),
        reviews_count = (select count(*) from reviews where reviewee_id = p.user_id),
        completed_jobs_count = (select count(*) from orders where professional_id = p.user_id and status = 'completed')`)

    // ── Notificaciones y auditoría de ejemplo ──
    const note = (user_id: string, title: string, body: string, href: string, hours: number) =>
      ins('notifications', { user_id, type: 'demo', title, body, href, created_at: ago(0, hours) })
    await note(andrea, 'Recibiste una cotización', 'Multiservicios Hernández cotizó "Fuga de agua bajo el lavatrastos"', `/cliente/solicitudes/${fuga}`, 28)
    await note(andrea, 'Revisa y aprueba el trabajo', 'José Tzoc terminó la pintura de tu apartamento.', `/cliente/ordenes/${pintura.orderId}`, 3)
    await note(andrea, 'Servicio programado para mañana', 'Marvin Xicará instalará tus lámparas LED.', `/cliente/ordenes/${lamparas.orderId}`, 6)
    await note(pro.electricista, 'Tienes un servicio mañana', 'Instalar 6 lámparas LED en sala y comedor · Zona 14', `/pro/ordenes/${lamparas.orderId}`, 6)
    await note(pro.plomero, 'Nueva solicitud de Plomería', 'Fuga de agua bajo el lavatrastos · Zona 10', `/pro/solicitudes/${fuga}`, 47)
    await note(admin, 'Profesional pendiente de verificación', 'Diego Ramírez · Herrería', `/admin/profesionales/${pro.pendiente}`, 20)
    await note(admin, 'Nueva incidencia', 'Impermeabilizar terraza de 30 m²: el trabajo quedó incompleto', `/admin/casos/${caso1}`, 14)
    await note(admin, 'Nuevo caso de garantía', 'Cambiar chapa de la puerta de la cocina', `/admin/casos/${caso2}`, 7)
    await ins('audit_logs', { actor_id: pro.pendiente, action: 'verification.submitted', entity_type: 'professional', entity_id: pro.pendiente, metadata: { documents: 3 }, created_at: ago(0, 20) })
    await ins('audit_logs', { actor_id: roberto, action: 'case.opened', entity_type: 'support_case', entity_id: caso1, metadata: { kind: 'dispute', reason: 'El trabajo quedó incompleto' }, created_at: ago(0.6) })
    await ins('audit_logs', { actor_id: roberto, action: 'case.opened', entity_type: 'support_case', entity_id: caso2, metadata: { kind: 'warranty', reason: 'Una pieza instalada dejó de funcionar' }, created_at: ago(0.3) })
  }
}
