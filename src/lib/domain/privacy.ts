/**
 * Antes de contratar no se comparten teléfonos ni correos: así el trato se mantiene dentro de
 * Handyman (con precio acordado, pago retenido y garantía). Módulo puro para poder probarlo.
 */
export function maskContactInfo(text: string) {
  return text
    .replace(/(\+?\s?502[\s-]?)?\b\d{4}[\s.-]?\d{4}\b/g, '[número oculto]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo oculto]')
}
