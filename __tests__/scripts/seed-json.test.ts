import fs from 'fs'
import path from 'path'
import { getSystem } from '../../src/systems/registry'

const DIR = path.join(__dirname, '../../supabase/seed/dnd5e-2024')
const KINDS = ['class', 'subclass', 'species', 'background', 'feat', 'spell', 'item', 'magic_item'] as const

type Row = { slug: string; name: string; parent_slug?: string; data: unknown }
const load = (kind: string): Row[] => JSON.parse(fs.readFileSync(path.join(DIR, `${kind}.json`), 'utf8'))

describe('dnd5e-2024 seed JSON', () => {
  const system = getSystem('dnd5e-2024')

  describe.each(KINDS)('%s.json', (kind) => {
    it('exists and is non-empty', () => {
      expect(fs.existsSync(path.join(DIR, `${kind}.json`))).toBe(true)
      expect(load(kind).length).toBeGreaterThan(0)
    })

    it('is sorted by slug with unique slugs', () => {
      const slugs = load(kind).map((r) => r.slug)
      expect(slugs).toEqual([...slugs].sort())
      expect(new Set(slugs).size).toBe(slugs.length)
    })

    it('every row data passes the kind schema', () => {
      for (const row of load(kind)) {
        const result = system.contentKinds[kind].schema.safeParse(row.data)
        if (!result.success) throw new Error(`${kind}/${row.slug}: ${result.error.message}`)
      }
    })
  })

  it('every subclass parent_slug resolves to a class slug', () => {
    const classSlugs = new Set(load('class').map((r) => r.slug))
    for (const sub of load('subclass')) expect(classSlugs.has(sub.parent_slug as string)).toBe(true)
  })
})
