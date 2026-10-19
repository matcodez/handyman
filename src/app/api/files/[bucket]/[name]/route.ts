import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { readFile } from '@/lib/storage'

const NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/

/**
 * Sirve archivos subidos.
 *  - public: fotos con nombre UUID no listable.
 *  - private: documentos de verificación; solo administración o el profesional dueño.
 */
export async function GET(_req: Request, { params }: { params: { bucket: string; name: string } }) {
  const { bucket, name } = params
  if ((bucket !== 'public' && bucket !== 'private') || !NAME.test(name)) return new NextResponse('No encontrado', { status: 404 })

  if (bucket === 'private') {
    const user = await getSession()
    if (!user) return new NextResponse('No autorizado', { status: 401 })
    if (user.role !== 'admin') {
      const owned = await db.q1(
        `select 1 from professional_documents where private_storage_path = $1 and professional_id = $2`,
        [`private/${name}`, user.id],
      )
      if (!owned) return new NextResponse('No encontrado', { status: 404 })
    }
  }

  const file = await readFile(bucket, name)
  if (!file) return new NextResponse('No encontrado', { status: 404 })
  return new NextResponse(Buffer.from(file.data), {
    headers: {
      'Content-Type': file.mime,
      'Cache-Control': bucket === 'private' ? 'private, no-store' : 'public, max-age=31536000, immutable',
      'Content-Disposition': 'inline',
    },
  })
}
