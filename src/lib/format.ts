// Formato de presentación: quetzales y hora local de Guatemala (los datos se guardan en UTC).

const TZ = 'America/Guatemala'

/** Monto decimal exacto (string de numeric) → "Q 1,250.00". Solo para mostrar. */
export function formatQ(amount: string | number | null | undefined) {
  if (amount === null || amount === undefined || amount === '') return '—'
  const [int, dec = ''] = String(amount).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `Q ${grouped}.${(dec + '00').slice(0, 2)}`
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  // Las columnas `date` llegan como "YYYY-MM-DD": se interpretan como día calendario, sin zona.
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(y, m - 1, day)),
    )
  }
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(new Date(d))
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es-GT', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ,
  }).format(new Date(d))
}

export function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const days = Math.round(h / 24)
  if (days < 30) return `hace ${days} d`
  return formatDate(d)
}

export function daysLeft(until: Date | string) {
  return Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000))
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

/** Fecha de hoy en Guatemala como YYYY-MM-DD (para `min` de inputs de fecha). */
export function todayGT() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}
