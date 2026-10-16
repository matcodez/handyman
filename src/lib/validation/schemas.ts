import { z } from 'zod'
import { DISPUTE_REASONS, TIME_WINDOWS, WARRANTY_REASONS, ZONES } from '@/lib/domain/states'
import { AppError } from '@/lib/errors'

const text = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label}: mínimo ${min} caracteres.`).max(max, `${label}: máximo ${max} caracteres.`)

const zone = z.enum(ZONES, { errorMap: () => ({ message: 'Selecciona una zona válida.' }) })
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida.')
const uuid = z.string().uuid('Identificador inválido.')
// Monto como texto decimal exacto: evita errores de punto flotante.
const money = z
  .string()
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, 'Ingresa un monto válido en quetzales (por ejemplo 450 o 450.50).')
  .refine((v) => Number(v) > 0, 'El monto debe ser mayor a cero.')
const score = z.coerce.number().int().min(1, 'Califica de 1 a 5.').max(5, 'Califica de 1 a 5.')

export const registerSchema = z.object({
  role: z.enum(['customer', 'professional'], { errorMap: () => ({ message: 'Elige un tipo de cuenta.' }) }),
  full_name: text(3, 80, 'Nombre'),
  email: z.string().trim().toLowerCase().email('Correo inválido.').max(120),
  phone: z.string().trim().regex(/^[0-9 +()-]{8,20}$/, 'Teléfono inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(72),
  accept: z.literal('on', { errorMap: () => ({ message: 'Debes aceptar los términos de la demo.' }) }),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.').max(72),
})

export const requestSchema = z.object({
  category_id: uuid,
  title: text(6, 90, 'Título'),
  description: text(20, 1500, 'Descripción'),
  place_type: z.enum(['casa', 'oficina', 'otro']),
  location_label: zone,
  address_private: text(8, 200, 'Dirección'),
  preferred_date: isoDate,
  preferred_time_window: z.enum(TIME_WINDOWS),
})

export const quoteSchema = z.object({
  request_id: uuid,
  price_amount: money,
  scope_description: text(20, 1200, 'Alcance'),
  materials_included: z.enum(['si', 'no']),
  materials_notes: z.string().trim().max(400).default(''),
  estimated_duration: text(2, 60, 'Duración estimada'),
  proposed_date: isoDate,
  notes: z.string().trim().max(600).default(''),
})

export const messageSchema = z.object({ request_id: uuid, body: text(2, 600, 'Mensaje') })

export const changeSchema = z.object({ order_id: uuid, description: text(10, 600, 'Motivo'), new_price: money })

export const disputeSchema = z.object({
  order_id: uuid,
  reason: z.enum(DISPUTE_REASONS),
  description: text(15, 1200, 'Descripción'),
})

export const warrantyClaimSchema = z.object({
  warranty_id: uuid,
  reason: z.enum(WARRANTY_REASONS),
  description: text(15, 1200, 'Descripción'),
})

export const reviewSchema = z.object({
  order_id: uuid,
  punctuality_score: score,
  communication_score: score,
  cleanliness_score: score,
  comment: z.string().trim().max(600).default(''),
})

export const proProfileSchema = z.object({
  public_name: text(3, 60, 'Nombre comercial'),
  bio: text(20, 800, 'Biografía'),
  years_experience: z.coerce.number().int().min(0).max(60),
  availability: text(3, 120, 'Disponibilidad'),
  phone: z.string().trim().regex(/^[0-9 +()-]{8,20}$/, 'Teléfono inválido.'),
})

export const customerProfileSchema = z.object({
  full_name: text(3, 80, 'Nombre'),
  phone: z.string().trim().regex(/^[0-9 +()-]{8,20}$/, 'Teléfono inválido.'),
  preferred_contact: z.enum(['app', 'telefono', 'correo']),
})

export const addressSchema = z.object({
  label: text(2, 40, 'Etiqueta'),
  zone,
  address_private: text(8, 200, 'Dirección'),
})

export const portfolioSchema = z.object({
  title: text(4, 80, 'Título'),
  description: z.string().trim().max(400).default(''),
  category_id: uuid,
})

export const categorySchema = z.object({
  name: text(3, 60, 'Nombre'),
  description: text(5, 200, 'Descripción'),
  icon_key: z.string().trim().min(2).max(30),
  warranty_days: z.coerce.number().int().min(30, 'La garantía mínima es de 30 días.').max(90, 'La garantía máxima es de 90 días.'),
  warranty_terms: text(20, 1500, 'Términos de garantía'),
})

export { uuid as uuidSchema, zone as zoneSchema }

/** Valida FormData contra un esquema y lanza AppError con el primer mensaje legible. */
export function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData): z.infer<T> {
  const raw: Record<string, unknown> = {}
  formData.forEach((v, k) => {
    if (typeof v === 'string') raw[k] = v
  })
  const res = schema.safeParse(raw)
  if (!res.success) throw new AppError(res.error.issues[0]?.message ?? 'Revisa los datos del formulario.')
  return res.data
}
