import 'server-only'
import { db } from '@/lib/db/client'

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon_key: string
  active: boolean
  warranty_days: number
  warranty_terms: string
  sort_order: number
}

export function listCategories(opts: { includeInactive?: boolean } = {}) {
  return db.q<Category>(
    `select * from categories ${opts.includeInactive ? '' : 'where active'} order by sort_order, name`,
  )
}

export function getCategory(id: string) {
  return db.q1<Category>(`select * from categories where id = $1`, [id])
}

export function getCategoryBySlug(slug: string) {
  return db.q1<Category>(`select * from categories where slug = $1 and active`, [slug])
}

export function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
