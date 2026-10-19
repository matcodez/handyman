// Reinicia los datos de demostración. Al siguiente request la app recrea el esquema y siembra la demo.
//  - Local (PGlite): borra .data/pg. Detén el servidor (`npm run dev`) antes de ejecutarlo.
//  - Producción (Neon/Postgres): DATABASE_URL="postgres://..." npm run db:reset
//    Borra TODAS las tablas del esquema public de esa base.
import fs from 'node:fs'
import path from 'node:path'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (url) {
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  await client.query('drop schema public cascade; create schema public;')
  await client.end()
  console.log('Base remota reiniciada. Abre la app para volver a sembrar los datos demo.')
} else {
  const dir = process.env.HANDYMAN_DATA_DIR || path.join(process.cwd(), '.data')
  for (const sub of ['pg', 'storage']) fs.rmSync(path.join(dir, sub), { recursive: true, force: true })
  console.log(`Datos de demostración reiniciados en ${dir}. Inicia la app para volver a sembrarlos.`)
}
