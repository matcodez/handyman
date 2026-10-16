import Link from 'next/link'
import { BadgeCheck, ClipboardList, FileCheck2, FlaskConical, HandCoins, MessagesSquare, ScanLine, ShieldCheck, UserCheck, Wrench } from 'lucide-react'
import { Notice } from '@/components/ui/primitives'

export const metadata = { title: 'Cómo funciona' }

const CUSTOMER = [
  { icon: ClipboardList, title: '1. Publica tu solicitud', text: 'Elige el oficio, describe el problema, adjunta fotos e indica el tipo de lugar, la zona, la dirección y tu disponibilidad. Los profesionales solo ven la zona aproximada: tu dirección exacta se comparte únicamente con quien contrates.' },
  { icon: MessagesSquare, title: '2. Recibe y compara cotizaciones', text: 'Solo profesionales con identidad verificada que cubren tu oficio y zona pueden cotizar. Cada propuesta indica monto en quetzales, alcance, materiales incluidos o no, duración y fecha propuesta. Puedes hacer preguntas antes de decidir.' },
  { icon: HandCoins, title: '3. Acepta una cotización', text: 'Al aceptar se crea una orden que congela el precio y el alcance. Si algo cambia, el profesional debe solicitar una modificación y tú debes aprobarla. El pago queda como “Retenido en demo”.' },
  { icon: ScanLine, title: '4. Confirma la identidad con QR', text: 'Cuando el profesional llega, te muestra su carné digital. Escaneas el QR con tu teléfono, ves su foto, nombre y estado de verificación, y confirmas que coincide con la persona presente. Queda registrada la fecha y hora.' },
  { icon: FileCheck2, title: '5. Revisa la evidencia y aprueba', text: 'Al terminar, el profesional sube fotos del trabajo. Tú apruebas o abres una incidencia con motivo y evidencia. Administración documenta la resolución.' },
  { icon: ShieldCheck, title: '6. Recibe tu garantía escrita', text: 'Al aprobar se emite una garantía con número de orden, alcance, exclusiones, duración (30 a 90 días según el oficio) y fechas de inicio y vencimiento. Si surge un problema dentro del plazo, lo reportas desde la app.' },
]

const PRO = [
  { icon: Wrench, title: 'Crea tu perfil', text: 'Nombre comercial, biografía, años de experiencia, oficios, zonas de cobertura y galería de trabajos anteriores.' },
  { icon: UserCheck, title: 'Verifica tu identidad', text: 'Sube tu DPI y constancias de antecedentes. Administración revisa el expediente y registra la decisión. Tus documentos nunca son públicos.' },
  { icon: MessagesSquare, title: 'Cotiza solicitudes de tu zona', text: 'Una vez aprobado, ves solicitudes compatibles con tus oficios y envías cotizaciones con alcance y precio claros.' },
  { icon: BadgeCheck, title: 'Trabaja con respaldo', text: 'Tu carné con QR da tranquilidad al cliente. Subes evidencia al terminar y construyes reputación con reseñas de órdenes reales.' },
]

export default function HowItWorksPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Cómo funciona</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Trazabilidad de principio a fin</h1>
        <p className="mt-4 text-ink2">Handyman no es un directorio de contactos. Cada paso deja registro: quién cotizó, qué se acordó, quién llegó, cómo quedó el trabajo y qué garantía lo respalda.</p>
      </div>

      <section className="mx-auto mt-12 max-w-3xl" aria-labelledby="clientes">
        <h2 id="clientes" className="section-title">Para clientes</h2>
        <ol className="mt-6 space-y-4">
          {CUSTOMER.map((s) => (
            <li key={s.title} className="card card-pad flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-bg text-brand"><s.icon className="h-6 w-6" aria-hidden /></span>
              <div><h3 className="text-base font-semibold">{s.title}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-ink2">{s.text}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-6"><Link href="/registro?tipo=cliente" className="btn-primary">Solicitar un servicio</Link></div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl scroll-mt-24" id="profesionales" aria-labelledby="pros">
        <h2 id="pros" className="section-title">Para profesionales</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRO.map((s) => (
            <li key={s.title} className="card card-pad">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-accent"><s.icon className="h-6 w-6" aria-hidden /></span>
              <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink2">{s.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6"><Link href="/registro?tipo=profesional" className="btn-secondary">Crear perfil profesional</Link></div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <Notice tone="warn" icon={FlaskConical} title="Qué es real y qué es simulado en este MVP">
          Los flujos de solicitud, cotización, orden, QR, evidencia, garantía y reclamos funcionan y guardan datos. Los pagos son <strong>estados simulados</strong> (“Retenido en demo”, “Liberado en demo”): no se cobra, no se custodia dinero y nunca se piden datos de tarjeta. La verificación la realiza un administrador revisando documentos; no hay conexión con registros oficiales.
        </Notice>
      </section>
    </div>
  )
}
