export function LoadingSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Cargando">
      <div className="h-8 w-56 rounded-lg bg-line" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-line/70" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white shadow-card" />)}
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-white shadow-card" />)}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
