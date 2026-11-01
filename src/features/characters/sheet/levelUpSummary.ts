// System-agnostic "what changes" rows for the level-up screen: level, then every stat, resource
// maximum and derived value that differs between the character and the levelUp preview.
import type { CharacterRecord, DerivedValue, GameSystem, LevelUpPatch, PickRecord, ResourceValue } from '@/systems/types'

export type SummaryRow = { label: string; value: string }

const show = (d: DerivedValue) => (d.format === 'modifier' && typeof d.value === 'number' ? (d.value >= 0 ? `+${d.value}` : `${d.value}`) : String(d.value))

function maxes(v: ResourceValue | undefined): Record<string, number> {
  if (!v) return {}
  return 'tiers' in v ? Object.fromEntries(Object.entries(v.tiers).map(([t, s]) => [t, s.max])) : { '': v.max }
}

export function levelUpSummary(
  system: GameSystem,
  before: CharacterRecord,
  after: LevelUpPatch,
  picks: PickRecord[],
): SummaryRow[] {
  const rows: SummaryRow[] = [{ label: 'Level', value: `${before.level} → ${after.level}` }]

  for (const def of system.stats) {
    const a = before.stats[def.key]
    const b = after.stats[def.key]
    if (a !== b) rows.push({ label: def.label, value: `${a ?? def.default} → ${b ?? def.default}` })
  }

  for (const def of system.resources) {
    const a = maxes(before.resources[def.key])
    const b = maxes(after.resources[def.key])
    for (const tier of Object.keys({ ...a, ...b })) {
      if ((a[tier] ?? 0) === (b[tier] ?? 0)) continue
      const label = def.kind === 'slots' ? `${def.label} · ${def.tierLabel?.(tier) ?? tier}` : `${def.label} max`
      rows.push({ label, value: `${a[tier] ?? 0} → ${b[tier] ?? 0}` })
    }
  }

  const old = system.rules.derived(before, picks)
  const next = system.rules.derived({ ...before, ...after }, picks)
  for (const d of next) {
    const o = old.find((x) => x.key === d.key)
    // A derived value labelled like a stat row (e.g. an ability modifier) is implied by that row.
    if (rows.some((r) => r.label === d.label)) continue
    if (o && o.value !== d.value && !d.key.startsWith('xp_')) rows.push({ label: d.label, value: `${show(o)} → ${show(d)}` })
  }
  return rows
}
