import { notFound } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import { Notice } from '@/components/ui/primitives'

const PAGES: Record<string, { title: string; sections: [string, string][] }> = {
  ayuda: {
    title: 'Centro de ayuda',
    sections: [
      ['¿Cómo solicito un servicio?', 'Crea una cuenta de cliente, presiona “Solicitar servicio”, elige el oficio, describe el problema, adjunta al menos una foto e indica zona, dirección y fecha preferida.'],
      ['¿Quién puede ver mi dirección?', 'Antes de contratar, los profesionales solo ven la zona aproximada. Tu dirección exacta se muestra únicamente al profesional cuya cotización aceptaste.'],
      ['¿Cómo confirmo la identidad del profesional?', 'Al llegar, el profesional te muestra su carné digital. Escanea el QR con la cámara de tu teléfono, compara foto y nombre, y confirma desde tu sesión.'],
      ['¿Qué hago si el trabajo quedó mal?', 'Cuando el profesional marque el trabajo como terminado, puedes abrir una incidencia en lugar de aprobarlo. Si el problema aparece después, reporta la garantía desde “Garantías y reclamos”.'],
      ['Contacto', 'Escríbenos a soporte@handyman.demo (dirección ficticia de demostración).'],
    ],
  },
  garantia: {
    title: 'Garantía y reclamos',
    sections: [
      ['Qué es la garantía escrita', 'Al aprobar un trabajo se genera un documento con número de orden, alcance cubierto, exclusiones, duración y fechas de inicio y vencimiento.'],
      ['Duración', 'Entre 30 y 90 días según el oficio. La duración vigente de cada categoría la configura administración y queda copiada en la garantía al emitirse.'],
      ['Qué cubre y qué no', 'Cubre defectos de mano de obra relacionados con el alcance acordado. No cubre mal uso, modificaciones de terceros, desgaste normal ni materiales suministrados por el cliente.'],
      ['Cómo reclamar', 'Desde “Garantías y reclamos” seleccionas la garantía activa, eliges el motivo, describes el problema y adjuntas fotos. Administración revisa el caso y documenta la resolución.'],
      ['Estados posibles', 'Activa, Reportada, En revisión, Aprobada para corrección, Rechazada con motivo, Resuelta o Expirada.'],
    ],
  },
  terminos: {
    title: 'Términos de uso',
    sections: [
      ['Naturaleza del servicio', 'Handyman es una plataforma que conecta clientes con profesionales independientes. Este sitio es un MVP académico: no presta servicios reales ni procesa pagos.'],
      ['Cuentas', 'Cada persona es responsable de la veracidad de los datos que registra. Los profesionales no pueden cotizar hasta que administración apruebe su verificación.'],
      ['Pagos', 'Los estados de pago que aparecen en la plataforma son simulados y están marcados como DEMO. No se solicitan ni almacenan datos de tarjetas.'],
      ['Reseñas', 'Solo pueden publicarse después de una orden completada y por el cliente de esa orden.'],
    ],
  },
  privacidad: {
    title: 'Política de privacidad',
    sections: [
      ['Datos que se guardan', 'Nombre, correo, teléfono, direcciones de servicio y, en el caso de profesionales, documentos de verificación.'],
      ['Quién puede verlos', 'Los documentos de identidad y antecedentes se guardan en almacenamiento privado y solo los ven el propio profesional y administración. Los perfiles públicos nunca muestran dirección residencial, teléfono ni documentos.'],
      ['Código QR', 'El QR del carné contiene únicamente un enlace con un identificador aleatorio. No incluye datos personales.'],
      ['Auditoría', 'Las acciones sensibles (verificaciones, cambios de precio, aprobaciones y reclamos) quedan registradas con autor, fecha y motivo.'],
    ],
  },
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: PAGES[params.slug]?.title ?? 'Información' }
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const page = PAGES[params.slug]
  if (!page) notFound()
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">{page.title}</h1>
      <div className="mt-6">
        <Notice tone="warn" icon={FlaskConical} title="Texto de demostración">
          Este contenido resume el funcionamiento del MVP. Las políticas legales definitivas (términos, privacidad, cancelación y límites de garantía) están pendientes de redacción y revisión legal.
        </Notice>
      </div>
      <div className="mt-8 space-y-4">
        {page.sections.map(([h, p]) => (
          <section key={h} className="card card-pad">
            <h2 className="text-base font-semibold">{h}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink2">{p}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
