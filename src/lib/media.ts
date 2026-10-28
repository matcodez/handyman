/**
 * Fotos de referencia por oficio, guardadas en `public/img`.
 * Origen: Unsplash (licencia Unsplash: uso comercial gratuito, sin atribución obligatoria).
 * El id de cada foto queda anotado para poder rastrearla o reemplazarla.
 * Cuando existan fotos de trabajos reales de profesionales, esas tienen prioridad.
 */
export const CATEGORY_PHOTOS: Record<string, string[]> = {
  plomeria: ['/img/oficios/plomeria.jpg', '/img/oficios/plomeria-2.jpg'], // 1676210133055-eab6ef033ce3, 1749532125405-70950966b0e5
  electricidad: ['/img/oficios/electricidad.jpg', '/img/oficios/electricidad-2.jpg'], // 1621905251189-08b45d6a269e, 1660330589693-99889d60181e
  albanileria: ['/img/oficios/albanileria.jpg', '/img/oficios/albanileria-2.jpg'], // 1701850009190-2859ba2aeea6, 1768839725085-829e6ac7ac26
  pintura: ['/img/oficios/pintura.jpg', '/img/oficios/pintura-2.jpg'], // 1562259949-e8e7689d7828, 1717281234297-3def5ae3eee1
  carpinteria: ['/img/oficios/carpinteria.jpg', '/img/oficios/carpinteria-2.jpg'], // 1659930087003-2d64e33181f7, 1561297331-a9c00b9c2c44
  herreria: ['/img/oficios/herreria.jpg', '/img/oficios/herreria-2.jpg'], // 1504328345606-18bbc8c9d7d1, 1698664683348-f9f35b809821
  jardineria: ['/img/oficios/jardineria.jpg', '/img/oficios/jardineria-2.jpg'], // 1617576683096-00fc8eecb3af, 1622383563227-04401ab4e5ea
  tablayeso: ['/img/oficios/tablayeso.jpg', '/img/oficios/tablayeso-2.jpg'], // 1768321914149-5a6428ec2f82, 1770838773417-08b18661c62f
  pisos: ['/img/oficios/pisos.jpg'], // 1731168273756-e02cae42265b
  techado: ['/img/oficios/techado.jpg', '/img/oficios/techado-2.jpg'], // 1635424824849-1b09bdcc55b1, 1763665814538-8ba04597286c
  cerrajeria: ['/img/oficios/cerrajeria.jpg'], // 1759452003649-552896c8ed63
  limpieza: ['/img/oficios/limpieza.jpg', '/img/oficios/limpieza-2.jpg'], // 1758273238415-01ec03d9ef27, 1740657254989-42fe9c3b8cce
  'vidrio-aluminio': ['/img/oficios/vidrio-aluminio.jpg', '/img/oficios/vidrio-aluminio-2.jpg'], // 1630368177606-471ad5e501c4, 1527352774566-e4916e36c645
  'aire-acondicionado': ['/img/oficios/aire-acondicionado.jpg', '/img/oficios/aire-acondicionado-2.jpg'], // 1718203862467-c33159fdc504, 1761330440311-16e160cad236
  'control-plagas': ['/img/oficios/control-plagas.jpg'], // 1747659629851-a92bd71149f6
  'seguridad-electronica': ['/img/oficios/seguridad-electronica.jpg', '/img/oficios/seguridad-electronica-2.jpg'], // 1765121689322-6befc57dc8db, 1496368077930-c1e31b4e5b44
  mudanzas: ['/img/oficios/mudanzas.jpg', '/img/oficios/mudanzas-2.jpg'], // 1714647211902-bb711d643a17, 1757837593538-b4a8654132f1
  'ingenieria-civil': ['/img/oficios/ingenieria-civil.jpg', '/img/oficios/ingenieria-civil-2.jpg'], // 1772442198624-4fc4d7281e89, 1581092583537-20d51b4b4f1b
}

export const HERO_PHOTO = '/img/portada.jpg' // 1505798577917-a65157d3320a
export const PROS_PHOTO = '/img/profesionales.jpg' // 1595844730298-b960ff98fee0

/** Foto de un oficio; `variant` elige entre las disponibles. Sin foto, devuelve null. */
export function categoryPhoto(slug: string, variant = 1): string | null {
  const list = CATEGORY_PHOTOS[slug]
  if (!list?.length) return null
  return list[(Math.max(1, variant) - 1) % list.length]
}

/** True cuando `variant` ya dio la vuelta a la lista: la foto se repite y conviene variarla (espejo/encuadre). */
export function isRepeatedPhoto(slug: string, variant = 1): boolean {
  const n = CATEGORY_PHOTOS[slug]?.length ?? 0
  return n > 0 && Math.max(1, variant) > n
}
