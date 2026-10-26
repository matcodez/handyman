// Carril de urgencias y estimador orientativo. Módulo puro (UI, servicios y pruebas).

export interface EmergencyKind {
  key: string
  label: string
  hint: string
  categorySlug: string | null   // null = no se despacha (riesgo que atienden los bomberos)
  icon: string
  tips: string[]
}

/** Visita de diagnóstico urgente: precio fijo, se descuenta del trabajo si se contrata. */
export const URGENT_VISIT_FEE = 150

export const ETA_OPTIONS = [20, 30, 45, 60, 90] as const

export const EMERGENCIES: EmergencyKind[] = [
  {
    key: 'fuga', label: 'Fuga de agua', hint: 'Tubería rota, chorro o goteo fuerte', categorySlug: 'plomeria', icon: 'droplets',
    tips: [
      'Cierra la llave de paso general (suele estar junto al contador o bajo el lavatrastos).',
      'Si el agua llega a enchufes o aparatos, baja el flipón de esa área antes de tocar nada.',
      'Pon toallas o una cubeta y mueve muebles y aparatos fuera del agua.',
    ],
  },
  {
    key: 'drenaje', label: 'Drenaje tapado o inundación', hint: 'Inodoro, regadera o patio que no desagua', categorySlug: 'plomeria', icon: 'droplets',
    tips: [
      'Deja de usar inodoros, lavamanos y lavadora para no empeorar el reflujo.',
      'No uses químicos destapacaños si ya hay agua estancada: pueden quemar la piel.',
      'Si entra agua de la calle, levanta del piso aparatos y documentos importantes.',
    ],
  },
  {
    key: 'luz', label: 'Sin luz o chispazos', hint: 'Corto circuito, olor a quemado, flipón que salta', categorySlug: 'electricidad', icon: 'zap',
    tips: [
      'Baja el flipón principal si ves chispas, humo o hueles a quemado.',
      'No toques cables, enchufes ni aparatos con las manos mojadas o descalzo.',
      'Si hay fuego, no uses agua: sal de la casa y llama a los bomberos al 122 o 123.',
    ],
  },
  {
    key: 'cerradura', label: 'Cerradura o puerta', hint: 'Te quedaste afuera o la puerta no cierra', categorySlug: 'cerrajeria', icon: 'key-round',
    tips: [
      'No fuerces la llave: si se quiebra adentro, la reparación es más cara.',
      'Si un niño o una persona vulnerable quedó adentro y hay riesgo, llama al 110 (PNC) o 122.',
      'Ten a mano un documento que demuestre que vives ahí; el cerrajero te lo pedirá.',
    ],
  },
  {
    key: 'vidrio', label: 'Vidrio roto', hint: 'Ventana o puerta de vidrio quebrada', categorySlug: 'vidrio-aluminio', icon: 'panels-top-left',
    tips: [
      'Aleja a niños y mascotas y usa zapatos cerrados en el área.',
      'Recoge los pedazos grandes con guantes gruesos; los pequeños, con cinta adhesiva.',
      'Cubre el hueco con cartón o plástico y cinta mientras llega el profesional.',
    ],
  },
  {
    key: 'gas', label: 'Olor a gas', hint: 'Fuga en cilindro, estufa o tubería', categorySlug: null, icon: 'flame',
    tips: [
      'No enciendas ni apagues luces ni aparatos, y no uses fósforos ni encendedores.',
      'Cierra la válvula del cilindro si puedes hacerlo sin riesgo y abre puertas y ventanas.',
      'Sal de la casa con todas las personas y llama a los bomberos al 122 o 123 desde afuera.',
    ],
  },
]

export function emergencyByKey(key: string) {
  return EMERGENCIES.find((e) => e.key === key)
}

// ── Estimador orientativo ───────────────────────────────────────────────────
// No reemplaza la cotización: da un rango de referencia para que el cliente sepa qué esperar.
// Se basa en precios típicos por oficio en Ciudad de Guatemala y en palabras clave del relato.

const BASE: Record<string, [number, number]> = {
  plomeria: [150, 600], electricidad: [150, 700], albanileria: [400, 3500], pintura: [600, 4500], carpinteria: [250, 1800],
  herreria: [350, 3000], jardineria: [150, 900], tablayeso: [500, 4000], pisos: [800, 6000], techado: [600, 5000],
  cerrajeria: [150, 650], limpieza: [300, 1500], 'vidrio-aluminio': [250, 2000], 'aire-acondicionado': [350, 2500],
  'control-plagas': [300, 1200], 'seguridad-electronica': [500, 4500], mudanzas: [600, 3500], 'ingenieria-civil': [800, 6000],
}

const UP: [RegExp, number, string][] = [
  [/\b(instalar|instalaci[oó]n|nuevo|nueva|cambiar todo|completo|completa)\b/i, 1.4, 'instalación nueva'],
  [/\b(urgente|emergencia|ya mismo|hoy mismo|noche)\b/i, 1.2, 'atención urgente'],
  [/\b(\d{2,})\s?(m2|m²|metros)\b/i, 1.6, 'área grande'],
  [/\b(todo el|toda la|varias|varios|[3-9] (puertas|ventanas|lámparas|lamparas|tomacorrientes))\b/i, 1.3, 'varias piezas'],
]
const DOWN: [RegExp, number, string][] = [
  [/\b(peque[nñ]o|peque[nñ]a|goteo|revisar|revisi[oó]n|ajustar|ajuste|diagn[oó]stico)\b/i, 0.75, 'trabajo menor'],
]

export interface Estimate { min: number; max: number; factors: string[] }

const round = (n: number) => Math.max(50, Math.round(n / 50) * 50)

export function estimatePrice(categorySlug: string, text: string): Estimate | null {
  const base = BASE[categorySlug]
  if (!base) return null
  let [min, max] = base
  const factors: string[] = []
  for (const [re, f, label] of UP) if (re.test(text)) { min *= f; max *= f; factors.push(label) }
  for (const [re, f, label] of DOWN) if (re.test(text)) { min *= f; max *= f; factors.push(label) }
  return { min: round(min), max: round(max), factors }
}
