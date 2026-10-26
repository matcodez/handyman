'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Vuelve a pedir los datos del servidor cada cierto tiempo mientras la pestaña está visible. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh() }, seconds * 1000)
    return () => clearInterval(t)
  }, [router, seconds])
  return null
}
