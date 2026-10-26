'use client'

/** Atajos "Hoy / Mañana / Este sábado" que llenan el campo de fecha con un toque. */
export function QuickDate({ target, today }: { target: string; today: string }) {
  const base = new Date(`${today}T12:00:00`)
  const add = (d: number) => { const x = new Date(base); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10) }
  const toSat = (6 - base.getDay() + 7) % 7 || 7
  const options: [string, string][] = [['Hoy', today], ['Mañana', add(1)], ['Este sábado', add(toSat)], ['En una semana', add(7)]]
  const set = (v: string) => {
    const el = document.getElementById(target) as HTMLInputElement | null
    if (!el) return
    el.value = v
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {options.map(([label, v]) => (
        <button key={label} type="button" onClick={() => set(v)} className="rounded-xl border border-line bg-white px-3.5 py-2 font-display text-sm hover:border-brand hover:bg-brand-bg/60">{label}</button>
      ))}
    </div>
  )
}
