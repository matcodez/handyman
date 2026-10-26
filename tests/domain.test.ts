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

describe('privacidad en el chat previo a contratar', async () => {
  const { maskContactInfo } = await import('@/lib/domain/privacy')
  it('oculta teléfonos guatemaltecos en distintos formatos', () => {
    expect(maskContactInfo('Llámeme al 5555 1234')).toBe('Llámeme al [número oculto]')
    expect(maskContactInfo('Mi cel: +502 5555-1234')).toBe('Mi cel: [número oculto]')
    expect(maskContactInfo('55551234 es mi número')).toBe('[número oculto] es mi número')
  })
  it('oculta correos y deja intacto el resto del texto', () => {
    expect(maskContactInfo('Escríbame a andrea@correo.com, gracias')).toBe('Escríbame a [correo oculto], gracias')
    expect(maskContactInfo('El trabajo cuesta Q 450 y dura 2 horas')).toBe('El trabajo cuesta Q 450 y dura 2 horas')
  })
})

describe('centro de soporte: tiempos de respuesta', async () => {
  const { defaultPriority, slaDue, slaState, relativeTime } = await import('@/lib/domain/sla')
  const t0 = new Date('2026-10-25T10:00:00Z')
  it('las incidencias (pago retenido) tienen prioridad alta y 4 h de plazo', () => {
    expect(defaultPriority('dispute')).toBe('alta')
    expect(defaultPriority('warranty')).toBe('normal')
    expect(slaDue(t0, 'alta').toISOString()).toBe('2026-10-25T14:00:00.000Z')
    expect(slaDue(t0, 'urgente').toISOString()).toBe('2026-10-25T11:00:00.000Z')
  })
  it('calcula el estado del compromiso', () => {
    const due = slaDue(t0, 'alta')
    const at = (h: number) => new Date(t0.getTime() + h * 3600_000)
    expect(slaState({ sla_due_at: due, first_response_at: null, priority: 'alta' }, at(1))).toBe('on_time')
    expect(slaState({ sla_due_at: due, first_response_at: null, priority: 'alta' }, at(3.5))).toBe('due_soon')
    expect(slaState({ sla_due_at: due, first_response_at: null, priority: 'alta' }, at(5))).toBe('overdue')
    expect(slaState({ sla_due_at: due, first_response_at: at(2), priority: 'alta' }, at(5))).toBe('met')
    expect(slaState({ sla_due_at: due, first_response_at: at(6), priority: 'alta' }, at(7))).toBe('late_met')
    expect(slaState({ sla_due_at: due, first_response_at: null, priority: 'alta', closed: true }, at(9))).toBe('closed')
  })
  it('expresa tiempos relativos en español', () => {
    expect(relativeTime(new Date(t0.getTime() + 200 * 60000), t0)).toBe('en 3 h 20 min')
    expect(relativeTime(new Date(t0.getTime() - 15 * 60000), t0)).toBe('hace 15 min')
  })
})
