import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

/**
 * Cliente de base de datos.
 *
 * Modo demo: PostgreSQL embebido (PGlite) persistido en .data/pg. Las migraciones de
 * db/migrations son SQL estándar, por lo que el mismo esquema corre en Supabase.
 * Para producción basta reemplazar este módulo por un pool de `pg`/Supabase que
 * implemente la misma interfaz `Exec`.
 */
export interface Exec {
  q<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  q1<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>
}

export function dataDir() {
  return process.env.HANDYMAN_DATA_DIR || path.join(process.cwd(), '.data')
}

const g = globalThis as unknown as { __handymanDb?: Promise<PGlite> }

async function init(): Promise<PGlite> {
  fs.mkdirSync(dataDir(), { recursive: true })
  const pg = new PGlite(path.join(dataDir(), 'pg'))
  await pg.waitReady

  await pg.exec(
    `create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`,
  )
  const applied = new Set(
    (await pg.query<{ name: string }>('select name from _migrations')).rows.map((r) => r.name),
  )
  const dir = path.join(process.cwd(), 'db', 'migrations')
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pg.transaction(async (t) => {
      await t.exec(sql)
      await t.query('insert into _migrations (name) values ($1)', [file])
    })
  }

  const users = await pg.query<{ n: number }>('select count(*)::int as n from users')
  if (users.rows[0].n === 0) {
    const { seed } = await import('./seed')
    await seed(pg)
  }
  return pg
}

function getPg() {
  if (!g.__handymanDb) {
    g.__handymanDb = init().catch((e) => {
      g.__handymanDb = undefined
      throw e
    })
  }
  return g.__handymanDb
}

function wrap(runner: { query: PGlite['query'] }): Exec {
  return {
    async q<T>(sql: string, params: unknown[] = []) {
      return (await runner.query<T>(sql, params as never[])).rows
    },
    async q1<T>(sql: string, params: unknown[] = []) {
      return (await runner.query<T>(sql, params as never[])).rows[0]
    },
  }
}

/** Ejecutor global (fuera de transacción). */
export const db: Exec = {
  async q<T>(sql: string, params?: unknown[]) {
    return wrap(await getPg()).q<T>(sql, params)
  },
  async q1<T>(sql: string, params?: unknown[]) {
    return wrap(await getPg()).q1<T>(sql, params)
  },
}

/**
 * Transacción. Dentro de `fn` usar únicamente el ejecutor `t`:
 * PGlite es de conexión única y una consulta global dentro de la transacción la bloquearía.
 */
export async function tx<T>(fn: (t: Exec) => Promise<T>): Promise<T> {
  const pg = await getPg()
  return pg.transaction(async (t) => fn(wrap(t as unknown as { query: PGlite['query'] }))) as Promise<T>
}
