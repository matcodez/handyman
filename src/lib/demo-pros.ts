// Profesionales demo dedicados, uno por área de trabajo, para que cada oficio tenga un ejemplo
// verificado. Datos ficticios. Lo usan el seed (src/lib/db/seed-pros.ts) y la pantalla de acceso.

export interface DemoPro {
  email: string
  full: string
  pub: string
  phone: string
  years: number
  cats: string[]
  zones: string[]
  avail: string
  bio: string
  area: string
}

export const DEMO_PROS_BY_AREA: DemoPro[] = [
  { area: 'Herrería', email: 'herreria@handyman.demo', full: 'Rodrigo Cifuentes', pub: 'Rodrigo Cifuentes · Herrería', phone: '5550 0201', years: 14,
    cats: ['herreria'], zones: ['Zona 11', 'Zona 12', 'Zona 13', 'Mixco', 'Villa Nueva'], avail: 'Lunes a sábado, 7:00 a 17:00',
    bio: 'Taller de herrería con 14 años de experiencia. Portones corredizos, balcones, protecciones para ventanas y estructuras metálicas livianas. Soldadura en sitio.' },
  { area: 'Ingeniería civil / supervisión', email: 'ingenieria@handyman.demo', full: 'Paola Monterroso', pub: 'Ing. Paola Monterroso · Supervisión de obra', phone: '5550 0202', years: 11,
    cats: ['ingenieria-civil', 'albanileria'], zones: ['Zona 9', 'Zona 10', 'Zona 14', 'Zona 15', 'Zona 16', 'Carretera a El Salvador'], avail: 'Lunes a viernes, 8:00 a 17:00',
    bio: 'Ingeniera civil colegiada (número ficticio de demostración). Inspecciones estructurales, planos para ampliaciones y supervisión de remodelaciones para que el trabajo quede según lo acordado.' },
  { area: 'Tablayeso / cielo falso', email: 'tablayeso@handyman.demo', full: 'Byron Sic', pub: 'Byron Sic · Tablayeso y cielo falso', phone: '5550 0203', years: 10,
    cats: ['tablayeso', 'pintura'], zones: ['Zona 10', 'Zona 11', 'Zona 14', 'Zona 15', 'Mixco'], avail: 'Lunes a sábado, 7:30 a 16:30',
    bio: 'Especialista en divisiones de tablayeso, cielos falsos y reparaciones de juntas. Trabajo limpio con protección de muebles y pisos.' },
  { area: 'Pisos', email: 'pisos@handyman.demo', full: 'Julio Pirir', pub: 'Julio Pirir · Pisos y porcelanato', phone: '5550 0204', years: 16,
    cats: ['pisos', 'albanileria'], zones: ['Zona 10', 'Zona 12', 'Zona 14', 'Zona 15', 'Villa Nueva', 'San Cristóbal'], avail: 'Lunes a sábado, 7:00 a 17:00',
    bio: 'Instalación de cerámica, porcelanato y piso laminado. Nivelación, reparación de piezas sueltas y pulido de pisos de granito.' },
  { area: 'Techado e impermeabilización', email: 'techos@handyman.demo', full: 'Fernando Coyoy', pub: 'Fernando Coyoy · Techos e impermeabilización', phone: '5550 0205', years: 13,
    cats: ['techado'], zones: ['Zona 10', 'Zona 11', 'Zona 15', 'Zona 16', 'Mixco', 'Santa Catarina Pinula'], avail: 'Lunes a sábado, 7:00 a 16:00',
    bio: 'Reparación de filtraciones, impermeabilización de losas y terrazas, y cambio de lámina. Prueba de agua al terminar.' },
  { area: 'Cerrajería', email: 'cerrajeria@handyman.demo', full: 'Héctor Lima', pub: 'Héctor Lima · Cerrajería', phone: '5550 0206', years: 9,
    cats: ['cerrajeria'], zones: ['Zona 1', 'Zona 4', 'Zona 9', 'Zona 10', 'Zona 13', 'Zona 14'], avail: 'Todos los días, 7:00 a 20:00',
    bio: 'Cambio e instalación de chapas, cerraduras digitales y apertura de puertas sin daño. Atención el mismo día.' },
  { area: 'Limpieza profunda', email: 'limpieza@handyman.demo', full: 'Marta Chávez', pub: 'Brillo Total · Limpieza profunda', phone: '5550 0207', years: 8,
    cats: ['limpieza'], zones: ['Zona 10', 'Zona 13', 'Zona 14', 'Zona 15', 'Zona 16', 'Carretera a El Salvador'], avail: 'Lunes a sábado, 7:00 a 17:00',
    bio: 'Equipo de cuatro personas para limpieza profunda de casas y oficinas, y limpieza post-construcción. Productos incluidos.' },
  { area: 'Vidrio y aluminio', email: 'vidrio@handyman.demo', full: 'Mario Barrios', pub: 'Vidrios Barrios · Vidrio y aluminio', phone: '5550 0208', years: 18,
    cats: ['vidrio-aluminio'], zones: ['Zona 1', 'Zona 9', 'Zona 10', 'Zona 11', 'Zona 14', 'Mixco'], avail: 'Lunes a viernes, 8:00 a 17:00',
    bio: 'Ventanería de aluminio, cambio de vidrios, puertas corredizas y espejos. Medición y cotización en sitio.' },
  { area: 'Aire acondicionado y refrigeración', email: 'aire@handyman.demo', full: 'Wilson Ramírez', pub: 'Frío Experto · Aire acondicionado', phone: '5550 0209', years: 12,
    cats: ['aire-acondicionado'], zones: ['Zona 10', 'Zona 13', 'Zona 14', 'Zona 15', 'Zona 16', 'Carretera a El Salvador'], avail: 'Lunes a sábado, 8:00 a 18:00',
    bio: 'Instalación y mantenimiento de mini splits, recarga de gas y reparación de refrigeradores comerciales.' },
  { area: 'Control de plagas', email: 'plagas@handyman.demo', full: 'Sandra Cotí', pub: 'FumiGuate · Control de plagas', phone: '5550 0210', years: 7,
    cats: ['control-plagas'], zones: ['Zona 10', 'Zona 11', 'Zona 14', 'Zona 15', 'Mixco', 'Villa Nueva'], avail: 'Lunes a sábado, 7:00 a 16:00',
    bio: 'Fumigación de casas y oficinas contra cucarachas, hormigas, zancudos y roedores con productos registrados. Incluye una reaplicación.' },
  { area: 'Seguridad electrónica', email: 'seguridad@handyman.demo', full: 'Cristian Ávila', pub: 'Cristian Ávila · Cámaras y alarmas', phone: '5550 0211', years: 8,
    cats: ['seguridad-electronica'], zones: ['Zona 10', 'Zona 14', 'Zona 15', 'Zona 16', 'Carretera a El Salvador', 'Fraijanes'], avail: 'Lunes a sábado, 8:00 a 18:00',
    bio: 'Instalación de cámaras de seguridad, alarmas, videoporteros y cercos eléctricos. Configuración para ver las cámaras desde el teléfono.' },
  { area: 'Mudanzas', email: 'mudanzas@handyman.demo', full: 'Elmer Toc', pub: 'Mudanzas Rápidas GT', phone: '5550 0212', years: 10,
    cats: ['mudanzas'], zones: ['Zona 1', 'Zona 10', 'Zona 11', 'Zona 14', 'Zona 15', 'Mixco', 'Villa Nueva'], avail: 'Todos los días, 7:00 a 19:00',
    bio: 'Mudanzas residenciales y de oficina con camión propio, embalaje y armado de muebles. Personal uniformado.' },
]

/**
 * Cuenta demo recomendada para cada área de trabajo (las 18 categorías del catálogo).
 * Incluye los profesionales originales del seed cuando su oficio principal es esa área.
 */
export const DEMO_ACCOUNT_BY_AREA: { area: string; email: string; name: string }[] = [
  { area: 'Plomería', email: 'plomero@handyman.demo', name: 'Carlos Ajú' },
  { area: 'Electricidad', email: 'electricista@handyman.demo', name: 'Marvin Xicará' },
  { area: 'Albañilería / construcción', email: 'albanil@handyman.demo', name: 'Edwin Chacón' },
  { area: 'Pintura', email: 'pintor@handyman.demo', name: 'José Tzoc' },
  { area: 'Carpintería', email: 'carpintero@handyman.demo', name: 'Luis Morales' },
  { area: 'Jardinería / paisajismo', email: 'jardin@handyman.demo', name: 'Ana Lucía Pérez' },
  ...DEMO_PROS_BY_AREA.map((p) => ({ area: p.area, email: p.email, name: p.pub })),
]
