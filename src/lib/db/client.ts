import 'server-only'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Cliente de base de datos con dos motores intercambiables y la misma interfaz `Exec`:
 *  - Producción (Vercel): PostgreSQL administrado (Neon/Supabase) vía `pg`, si existe
 *    DATABASE_URL o POSTGRES_URL.
 *  - Local / demo: PostgreSQL embebido (PGlite) persistido en .data/pg.
 * Las migraciones de db/migrations son SQL estándar y corren igual en ambos.
 */
export interface Exec {
  q<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  q1<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>
}

/** Interfaz mínima que usan las migraciones y el seed. */
export interface RawTx {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
  exec(sql: string): Promise<unknown>
}

interface Driver {
  query<T>(sql: string, params: unknown[]): Promise<T[]>
  transaction<T>(fn: (t: RawTx) => Promise<T>): Promise<T>
}

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
}

export function dataDir() {
  if (process.env.HANDYMAN_DATA_DIR) return process.env.HANDYMAN_DATA_DIR
  // En Vercel solo /tmp es escribible (y efímero).
  return process.env.VERCEL ? '/tmp/handyman' : path.join(process.cwd(), '.data')
}

const g = globalThis as unknown as { __handymanDb?: Promise<Driver> }

// pg serializa los arreglos JS como arreglos de Postgres; nuestras columnas de listas son jsonb.
const pgParams = (params: unknown[]) => params.map((p) => (Array.isArray(p) ? JSON.stringify(p) : p))

async function pgDriver(url: string): Promise<Driver> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 20_000 })
  const wrapClient = (c: import('pg').PoolClient): RawTx => ({
    query: async <T>(sql: string, params: unknown[] = []) => ({ rows: (await c.query(sql, pgParams(params))).rows as T[] }),
    exec: (sql: string) => c.query(sql),
  })
  return {
    async query<T>(sql: string, params: unknown[]) {
      return (await pool.query(sql, pgParams(params))).rows as T[]
    },
    async transaction<T>(fn: (t: RawTx) => Promise<T>) {
      const c = await pool.connect()
      try {
        await c.query('begin')
        const r = await fn(wrapClient(c))
        await c.query('commit')
        return r
      } catch (e) {
        await c.query('rollback').catch(() => {})
        throw e
      } finally {
        c.release()
      }
    },
  }
}

async function pgliteDriver(): Promise<Driver> {
  const { PGlite } = await import('@electric-sql/pglite')
  fs.mkdirSync(dataDir(), { recursive: true })
  const pg = new PGlite(path.join(dataDir(), 'pg'))
  await pg.waitReady
  return {
    async query<T>(sql: string, params: unknown[]) {
      return (await pg.query<T>(sql, params as never[])).rows
    },
    transaction<T>(fn: (t: RawTx) => Promise<T>) {
      return pg.transaction((t) =>
        fn({
          query: async <R>(sql: string, params: unknown[] = []) => ({ rows: (await t.query<R>(sql, params as never[])).rows }),
          exec: (sql: string) => t.exec(sql),
        }),
      ) as Promise<T>
    },
  }
}

async function init(): Promise<Driver> {
  const url = databaseUrl()
  const driver = url ? await pgDriver(url) : await pgliteDriver()

  // Migraciones + seed en una sola transacción, con candado para que varias instancias
  // serverless arrancando a la vez no siembren datos duplicados.
  await driver.transaction(async (t) => {
    if (url) await t.query('select pg_advisory_xact_lock(424242)')
    await t.exec(`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`)
    const applied = new Set((await t.query<{ name: string }>('select name from _migrations')).rows.map((r) => r.name))
    const dir = path.join(process.cwd(), 'db', 'migrations')
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (applied.has(file)) continue
      await t.exec(fs.readFileSync(path.join(dir, file), 'utf8'))
      await t.query('insert into _migrations (name) values ($1)', [file])
    }
    const users = await t.query<{ n: number }>('select count(*)::int as n from users')
    if (users.rows[0].n === 0) {
      const { seed } = await import('./seed')
      await seed(t)
    }
  })
  return driver
}

function getDriver() {
  if (!g.__handymanDb) {
    g.__handymanDb = init().catch((e) => {
      g.__handymanDb = undefined
      throw e
    })
  }
  return g.__handymanDb
}

function wrap(run: (sql: string, params: unknown[]) => Promise<unknown[]>): Exec {
  return {
    async q<T>(sql: string, params: unknown[] = []) {
      return (await run(sql, params)) as T[]
    },
    async q1<T>(sql: string, params: unknown[] = []) {
      return ((await run(sql, params)) as T[])[0]
    },
  }
}

/** Ejecutor global (fuera de transacción). */
export const db: Exec = wrap(async (sql, params) => (await getDriver()).query(sql, params))

/**
 * Transacción. Dentro de `fn` usar únicamente el ejecutor `t`
 * (con PGlite, una consulta global dentro de la transacción la bloquearía).
 */
export async function tx<T>(fn: (t: Exec) => Promise<T>): Promise<T> {
  const driver = await getDriver()
  return driver.transaction((raw) => fn(wrap(async (sql, params) => (await raw.query(sql, params)).rows)))
}
