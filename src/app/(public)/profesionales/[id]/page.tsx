import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Lock } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { getProProfile, listPortfolio, listProCategories, listReviews } from '@/lib/services/professionals'
import { ProProfileView } from '@/components/domain/pro-profile'

export default async function ProPublicPage({ params }: { params: { id: string } }) {
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const [pro, user] = await Promise.all([getProProfile(params.id), getSession()])
  // Los perfiles no aprobados solo los ven su dueño y administración.
  if (!pro || (pro.verification_status !== 'approved' && user?.id !== pro.user_id && user?.role !== 'admin')) notFound()
  const [categories, portfolio, reviews] = await Promise.all([listProCategories(pro.user_id), listPortfolio(pro.user_id), listReviews(pro.user_id)])

  return (
    <div className="container-page py-8">
      <ProProfileView
        pro={pro} categories={categories} portfolio={portfolio} reviews={reviews}
        aside={
          <div className="card card-pad">
            <h2 className="text-base font-semibold">¿Quieres contratar a {pro.public_name.split(' ·')[0]}?</h2>
            <p className="mt-2 text-sm text-ink2">Publica tu solicitud y recibe cotizaciones de profesionales verificados de tu zona.</p>
            <Link href={user?.role === 'customer' ? '/cliente/solicitudes/nueva' : '/registro?tipo=cliente'} className="btn-primary mt-4 w-full">Solicitar un servicio</Link>
            <p className="mt-3 flex items-start gap-2 text-xs text-ink3"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Por privacidad no mostramos teléfono, dirección ni documentos del profesional.</p>
          </div>
        }
      />
    </div>
  )
}
