'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { CategoryCover, CategoryTile } from '@/components/domain/visuals'

interface Item { id: string; name: string; slug: string; description: string; icon_key: string; warranty_days: number; pros: number }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Catalog({ items, requestHref }: { items: Item[]; requestHref: string }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => items.filter((i) => norm(`${i.name} ${i.description}`).includes(norm(q))), [items, q])

  return (
    <>
      <label className="relative mx-auto block max-w-xl">
        <span className="sr-only">Buscar oficio</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Busca por oficio o problema: fuga, pintura, cerradura…" className="input h-14 rounded-2xl pl-12 shadow-card" />
      </label>
      <p className="mt-4 text-center text-sm text-ink3" aria-live="polite">{filtered.length} de {items.length} oficios</p>

      {filtered.length === 0 ? (
        <div className="card mx-auto mt-8 max-w-md px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">No encontramos ese oficio</h2>
          <p className="mt-1.5 text-sm text-ink2">Prueba con otra palabra o revisa la lista completa.</p>
          <button type="button" onClick={() => setQ('')} className="btn-secondary mt-4">Ver todos</button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id} id={c.slug} className="card group flex scroll-mt-24 flex-col overflow-hidden target:ring-2 target:ring-brand">
              <div className="relative">
                <div className="overflow-hidden"><CategoryCover slug={c.slug} iconKey={c.icon_key} alt={`Trabajo de ${c.name.toLowerCase()}`} className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.04]" /></div>
                <CategoryTile iconKey={c.icon_key} className="absolute -bottom-6 left-5 ring-4 ring-white" />
              </div>
              <div className="flex flex-1 flex-col px-5 pb-5 pt-9">
                <h2 className="font-display text-base font-semibold">{c.name}</h2>
                <p className="mt-1 flex-1 text-sm text-ink2">{c.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-1 font-display font-medium text-ok"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Garantía de {c.warranty_days} días</span>
                  <span className="rounded-full bg-paper2 px-2.5 py-1 font-display font-medium">{c.pros} {c.pros === 1 ? 'profesional verificado' : 'profesionales verificados'}</span>
                </div>
                <div className="mt-5 flex gap-2 border-t border-line pt-4">
                  <Link href={`${requestHref}${requestHref.includes('?') ? '&' : '?'}oficio=${c.slug}`} className="btn-primary btn-sm flex-1">Solicitar</Link>
                  <Link href={`/profesionales?oficio=${c.slug}`} className="btn-secondary btn-sm flex-1">Ver profesionales <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
