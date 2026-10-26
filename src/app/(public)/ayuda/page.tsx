import Link from 'next/link'
import { Clock, FileSignature, Headphones, MessageCircle, Phone, ShieldCheck, Siren, Users } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { SUPPORT_PHONE } from '@/lib/services/messaging'
import { PRIORITY } from '@/lib/domain/sla'

export const metadata = { title: 'Centro de ayuda', description: 'Canales de atención, horarios, tiempos de respuesta y preguntas frecuentes de Handyman.' }

const FAQ: [string, string][] = [
  ['¿Cómo solicito un servicio?', 'Presiona “Planificar un trabajo”, elige el oficio con un toque, cuéntanos qué pasa (puedes dictarlo), agrega una foto y elige cuándo te queda bien. Te llegan cotizaciones de profesionales verificados.'],
  ['¿Y si es una emergencia?', 'Usa el botón rojo “Emergencia”. Eliges qué pasó y en menos de un minuto avisamos a los profesionales disponibles cerca de ti. La visita de diagnóstico tiene precio fijo y se descuenta del trabajo si lo contratas.'],
  ['¿Puedo hablar con el profesional antes de contratar?', 'Sí, por el chat de la solicitud. Por seguridad, los teléfonos y correos se ocultan hasta que aceptas una cotización; después puedes llamarle desde la orden.'],
  ['¿Quién puede ver mi dirección?', 'Antes de contratar, los profesionales solo ven la zona aproximada. La dirección exacta solo la ve el profesional que contrataste.'],
  ['¿Cómo sé que es la persona correcta?', 'Al llegar te muestra su carné digital. Escaneas el QR, comparas foto y nombre, y confirmas desde tu teléfono antes de dejarlo pasar.'],
  ['¿Qué pasa si el trabajo quedó mal?', 'No lo apruebes: abre una incidencia. Se crea un caso con número, un agente de Handyman te contacta dentro del tiempo comprometido y abre una sala de mediación con el profesional.'],
  ['¿Cómo funciona la garantía?', 'Cada trabajo aprobado tiene una garantía escrita de 30 a 90 días según el oficio. Si el problema vuelve, repórtalo desde “Garantías” con fotos.'],
  ['¿El pago es real?', 'No. Este es un proyecto académico: los pagos son simulados y aparecen marcados como DEMO.'],
]

export default async function HelpCenter() {
  const user = await getSession()
  const tel = SUPPORT_PHONE.replace(/[^\d+]/g, '')
  return (
    <div className="container-page py-12 lg:py-16">
      <p className="eyebrow">Centro de ayuda</p>
      <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">Personas reales listas para ayudarte</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink2">Si algo sale mal, no estás solo: un agente de Handyman da seguimiento a tu caso de principio a fin.</p>

      <section className="mt-10 grid gap-4 md:grid-cols-3" aria-label="Canales de atención">
        <div className="card card-pad">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><MessageCircle className="h-6 w-6" aria-hidden /></span>
          <h2 className="mt-4 text-lg font-semibold">Chat en la app</h2>
          <p className="mt-1 text-ink2">Toca <strong className="font-medium">“Pregúntale a Handyman”</strong> en la parte superior de tu panel. Respondemos ahí mismo y queda el historial.</p>
          <Link href={user ? '/mensajes' : '/login'} className="btn-primary mt-4">{user ? 'Ir a mis mensajes' : 'Entrar para chatear'}</Link>
        </div>
        <div className="card card-pad">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ok/10 text-ok"><Phone className="h-6 w-6" aria-hidden /></span>
          <h2 className="mt-4 text-lg font-semibold">Línea telefónica</h2>
          <p className="mt-1 text-ink2">Llama a nuestra línea de atención. Ideal si prefieres hablar con alguien.</p>
          <a href={`tel:${tel}`} className="btn-secondary mt-4 font-num">{SUPPORT_PHONE}</a>
          <p className="mt-2 text-xs text-ink3">Número de demostración. También atenderá por WhatsApp Business en la versión de producción.</p>
        </div>
        <div className="card card-pad">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-dark"><Clock className="h-6 w-6" aria-hidden /></span>
          <h2 className="mt-4 text-lg font-semibold">Horario</h2>
          <ul className="mt-1 space-y-1 text-ink2">
            <li>Lunes a sábado: 7:00 a 20:00</li>
            <li>Domingo: 8:00 a 14:00</li>
            <li className="flex items-center gap-1.5 font-medium text-bad"><Siren className="h-4 w-4" aria-hidden />Emergencias: 24 horas</li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Tiempos de respuesta garantizados</h2>
        <p className="mt-1 text-ink2">Cada caso recibe un número, un agente asignado y un plazo máximo para la primera respuesta.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {([
            ['urgente', 'Sin agua, sin luz, puerta que no cierra o riesgo en casa'],
            ['alta', 'Incidencia antes de aprobar un trabajo (el pago queda retenido)'],
            ['normal', 'Garantías y consultas generales'],
          ] as const).map(([p, d]) => (
            <div key={p} className="card card-pad">
              <p className="font-num text-3xl font-bold text-navy">{PRIORITY[p].hours} h</p>
              <p className="mt-1 font-display font-semibold">Prioridad {PRIORITY[p].label.toLowerCase()}</p>
              <p className="mt-1 text-sm text-ink2">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink3">Si el plazo vence sin respuesta, el caso se escala automáticamente a un supervisor.</p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Cómo resolvemos un problema</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            [Headphones, 'Abres el caso', 'Desde la orden o la garantía, con fotos. Recibes un número de caso.'],
            [Users, 'Sala de mediación', 'Tú, el profesional y un agente de Handyman conversan en el mismo chat.'],
            [FileSignature, 'Acuerdo por escrito', 'El agente propone una solución: corregir, completar o devolver el pago.'],
            [ShieldCheck, 'Ambos aceptan', 'Cuando los dos aceptan, el caso se cierra y queda documentado.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Headphones
            return (
              <li key={i} className="card card-pad">
                <span className="flex items-center gap-2 font-display text-sm font-semibold text-brand"><I className="h-5 w-5" aria-hidden />Paso {i + 1}</span>
                <p className="mt-2 font-display font-semibold">{t as string}</p>
                <p className="mt-1 text-sm text-ink2">{d as string}</p>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold">Preguntas frecuentes</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group">
              <summary className="cursor-pointer list-none px-5 py-4 font-display font-medium [&::-webkit-details-marker]:hidden">{q}</summary>
              <p className="border-t border-line px-5 py-4 text-ink2">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
