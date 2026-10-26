// Cuentas de demostración creadas por el seed (src/lib/db/seed.ts).
// Son datos ficticios para presentar el proyecto; no usar en producción.

export const DEMO_PASSWORD = 'Handyman2026'

export const DEMO_ACCOUNTS = [
  { role: 'Cliente', name: 'Andrea Castillo', email: 'cliente@handyman.demo', hint: 'Solicitudes, cotizaciones y órdenes en todos los estados' },
  { role: 'Profesional', name: 'Marvin Xicará · Electricista', email: 'electricista@handyman.demo', hint: 'Verificado, con órdenes activas' },
  { role: 'Profesional', name: 'Carlos Ajú · Plomero', email: 'plomero@handyman.demo', hint: 'Verificado, con solicitudes por cotizar' },
  { role: 'Profesional', name: 'Diego Ramírez · Herrero', email: 'pendiente@handyman.demo', hint: 'Verificación pendiente: no puede cotizar' },
  { role: 'Administración', name: 'Lucía Méndez', email: 'admin@handyman.demo', hint: 'Verificaciones, categorías, casos y auditoría' },
  { role: 'Soporte', name: 'Jorge Herrera · Agente y evaluador', email: 'soporte@handyman.demo', hint: 'Centro de soporte, mediación y evaluaciones técnicas' },
] as const

/** Las fotos de demostración usan el esquema `demo:<slug-categoria>:<variante>`. */
export function demoPhoto(slug: string, variant = 1) {
  return `demo:${slug}:${variant}`
}
