// Starting equipment: the class's free-text options ("Option A: Chain Mail, 8 Javelins, 4 GP") parsed
// into entries and gold, and matched against the item content list.

export type EquipmentEntry = { text: string; name: string; quantity: number }
export type EquipmentOption = { label: string; entries: EquipmentEntry[]; gold: number }
export type EquipmentItem = { content_id: string; quantity: number; equipped: boolean }
type ItemContent = { id: string; name: string; data: { category?: string } }

export function parseEquipmentOption(text: string): EquipmentOption {
  const [head, ...rest] = text.split(':')
  const hasLabel = rest.length > 0
  const label = hasLabel ? head.trim() : ''
  const body = hasLabel ? rest.join(':') : text
  let gold = 0
  const entries: EquipmentEntry[] = []
  for (const raw of body.split(',').map((t) => t.trim()).filter(Boolean)) {
    const g = raw.match(/^(\d+)\s*GP$/i)
    if (g) { gold += Number(g[1]); continue }
    const q = raw.match(/^(\d+)\s+(.+)$/)
    entries.push({ text: raw, name: q ? q[2] : raw, quantity: q ? Number(q[1]) : 1 })
  }
  return { label, entries, gold }
}

const singular = (name: string) => (name.endsWith('s') ? name.slice(0, -1) : name)

/** Items worth carrying and wielding start equipped; everything with no matching item is listed as other gear. */
export function resolveEquipment(option: EquipmentOption, items: ItemContent[]): { items: EquipmentItem[]; other: string[] } {
  const byName = new Map(items.map((i) => [i.name.toLowerCase(), i]))
  const out: EquipmentItem[] = []
  const other: string[] = []
  for (const e of option.entries) {
    const key = e.name.toLowerCase()
    const hit = byName.get(key) ?? byName.get(singular(key))
    if (!hit) { other.push(e.text); continue }
    const category = hit.data.category ?? ''
    out.push({ content_id: hit.id, quantity: e.quantity, equipped: /Armor|Shield|Weapon/.test(category) })
  }
  return { items: out, other }
}
