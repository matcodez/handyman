import { describe, expect, it } from 'vitest'
import { canOrderTransition, canVerificationTransition, orderStepIndex, warrantyEnd } from '@/lib/domain/states'
import { formatQ, formatDate } from '@/lib/format'
import { parseForm, quoteSchema, registerSchema, categorySchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/errors'

const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

describe('ciclo de vida de la orden', () => {
  it('no permite iniciar el trabajo sin confirmar identidad', () => {
    expect(canOrderTransition('scheduled', 'in_progress')).toBe(false)
    expect(canOrderTransition('en_route', 'in_progress')).toBe(false)
    expect(canOrderTransition('arrived', 'in_progress')).toBe(true)
  })
  it('solo se aprueba o disputa desde "pendiente de aprobación"', () => {
    expect(canOrderTransition('in_progress', 'completed')).toBe(false)
    expect(canOrderTransition('pending_approval', 'completed')).toBe(true)
    expect(canOrderTransition('pending_approval', 'disputed')).toBe(true)
  })
  it('una orden completada o cancelada es final', () => {
    expect(canOrderTransition('completed', 'disputed')).toBe(false)
    expect(canOrderTransition('cancelled', 'scheduled')).toBe(false)
  })
  it('ubica los estados en la línea de tiempo', () => {
    expect(orderStepIndex('en_route')).toBe(0)
    expect(orderStepIndex('disputed')).toBe(3)
    expect(orderStepIndex('completed')).toBe(4)
  })
})

describe('verificación de profesionales', () => {
  it('un borrador solo puede pasar a pendiente (lo envía el profesional)', () => {
    expect(canVerificationTransition('draft', 'approved')).toBe(false)
    expect(canVerificationTransition('draft', 'pending')).toBe(true)
  })
  it('administración puede aprobar, rechazar y suspender', () => {
    expect(canVerificationTransition('pending', 'approved')).toBe(true)
    expect(canVerificationTransition('in_review', 'rejected')).toBe(true)
    expect(canVerificationTransition('approved', 'suspended')).toBe(true)
    expect(canVerificationTransition('rejected', 'approved')).toBe(false)
  })
})

describe('garantía', () => {
  it('calcula la fecha de vencimiento a partir de la duración', () => {
    const start = new Date('2026-01-01T12:00:00Z')
    expect(warrantyEnd(start, 60).toISOString()).toBe('2026-03-02T12:00:00.000Z')
  })
})

describe('formato', () => {
  it('muestra quetzales sin errores de punto flotante', () => {
    expect(formatQ('1250')).toBe('Q 1,250.00')
    expect(formatQ('3200.5')).toBe('Q 3,200.50')
    expect(formatQ('0.10')).toBe('Q 0.10')
  })
  it('interpreta columnas date como día calendario', () => {
    expect(formatDate('2026-10-20')).toMatch(/20/)
  })
})

describe('validación en servidor', () => {
  const quote = {
    request_id: '6f1b9b7e-4c1a-4e5a-9f3e-2b8a1c0d9e7f', price_amount: '450.50', scope_description: 'Cambio de sifón y sellado de uniones.',
    materials_included: 'si', materials_notes: '', estimated_duration: '2 horas', proposed_date: '2026-10-20', notes: '',
  }
  it('acepta montos decimales exactos', () => {
    expect(parseForm(quoteSchema, fd(quote)).price_amount).toBe('450.50')
  })
  it('rechaza montos inválidos o negativos', () => {
    expect(() => parseForm(quoteSchema, fd({ ...quote, price_amount: '-5' }))).toThrow(AppError)
    expect(() => parseForm(quoteSchema, fd({ ...quote, price_amount: '12.345' }))).toThrow(AppError)
    expect(() => parseForm(quoteSchema, fd({ ...quote, price_amount: '0' }))).toThrow(AppError)
  })
  it('el registro público no permite crear administradores', () => {
    const base = { full_name: 'Persona Demo', email: 'demo@demo.gt', phone: '5555 5555', password: 'clave-segura', accept: 'on' }
    expect(parseForm(registerSchema, fd({ ...base, role: 'customer' })).role).toBe('customer')
    expect(() => parseForm(registerSchema, fd({ ...base, role: 'admin' }))).toThrow(AppError)
  })
  it('la garantía por categoría debe estar entre 30 y 90 días', () => {
    const base = { name: 'Pintura', description: 'Interiores', icon_key: 'paint-roller', warranty_terms: 'Términos de demostración suficientemente largos.' }
    expect(() => parseForm(categorySchema, fd({ ...base, warranty_days: '20' }))).toThrow(AppError)
    expect(() => parseForm(categorySchema, fd({ ...base, warranty_days: '120' }))).toThrow(AppError)
    expect(parseForm(categorySchema, fd({ ...base, warranty_days: '60' })).warranty_days).toBe(60)
  })
})
