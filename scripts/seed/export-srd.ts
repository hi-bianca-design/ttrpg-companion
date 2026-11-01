// One-off export of the legacy SRD tables to supabase/seed/dnd5e-2024/*.json.
// Reads a LOCAL Supabase stack (built from the legacy migrations) via supabase-js.
// Env: SUPABASE_URL (default http://127.0.0.1:54321) and SUPABASE_SERVICE_ROLE_KEY
// (see `npx supabase status -o env`). Never commit keys.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { getSystem } from '../../src/systems/registry'

type Row = Record<string, any>
type Kind = 'class' | 'subclass' | 'species' | 'background' | 'feat' | 'spell' | 'item' | 'magic_item'

const slugify = (name: string) =>
  name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const TABLES: { table: string; kind: Kind }[] = [
  { table: 'classes', kind: 'class' },
  { table: 'subclasses', kind: 'subclass' },
  { table: 'species', kind: 'species' },
  { table: 'backgrounds', kind: 'background' },
  { table: 'feats', kind: 'feat' },
  { table: 'spells', kind: 'spell' },
  { table: 'equipment', kind: 'item' },
  { table: 'magic_items', kind: 'magic_item' },
]

async function fetchAll(client: SupabaseClient<any, any, any, any, any>, table: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select('*').order('name').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function main() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  const client = createClient(process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321', key)
  const system = getSystem('dnd5e-2024')
  const outDir = path.join(__dirname, '../../supabase/seed/dnd5e-2024')
  fs.mkdirSync(outDir, { recursive: true })

  const classes = await fetchAll(client, 'classes')
  const classSlugById = new Map(classes.map((c) => [c.id, slugify(c.name)]))
  let failures = 0

  for (const { table, kind } of TABLES) {
    const rows = table === 'classes' ? classes : await fetchAll(client, table)
    const out = rows.map((row) => {
      const { id, name, description, class_id, ...data } = row
      const entry: Record<string, unknown> = { slug: slugify(name), name }
      if (description != null) entry.description = description
      if (kind === 'subclass') {
        const parent = classSlugById.get(class_id)
        if (!parent) throw new Error(`subclass ${name}: unknown class_id ${class_id}`)
        entry.parent_slug = parent
      }
      entry.data = data
      return entry as { slug: string; name: string; data: unknown }
    })
    out.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))

    const slugs = new Set(out.map((r) => r.slug))
    if (slugs.size !== out.length) throw new Error(`${kind}: duplicate slugs`)
    for (const r of out) {
      const parsed = system.contentKinds[kind].schema.safeParse(r.data)
      if (!parsed.success) {
        failures++
        console.error(`SCHEMA FAIL ${kind}/${r.slug}: ${parsed.error.message}`)
      }
    }
    fs.writeFileSync(path.join(outDir, `${kind}.json`), JSON.stringify(out, null, 2) + '\n')
    console.log(`${kind.padEnd(11)} ${String(out.length).padStart(4)}  (from ${table}: ${rows.length})`)
  }
  if (failures) throw new Error(`${failures} rows failed schema validation`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
