import type { PoolValue, ResourceDef, ResourceValue } from '@/systems/types'

type RestKind = 'short' | 'long'

const KIND_LABEL: Record<RestKind, string> = { short: 'Short rest', long: 'Long rest' }

/**
 * One-line confirmation after a rest, from the system's declared resources: what the rest
 * restored, in declaration order ("Long rest: Hit Points 14/14, Spell Slots restored."), or that
 * nothing needed it.
 */
export function restSummary(
  defs: ResourceDef[],
  kind: RestKind,
  before: Record<string, ResourceValue>,
  after: Record<string, ResourceValue>,
): string {
  const changed = defs.flatMap((def) => {
    const prev = before[def.key]
    const next = after[def.key]
    if (!next || JSON.stringify(prev) === JSON.stringify(next)) return []
    // Marks counted up from empty (death saves) are cleared by a rest, not restored.
    if (def.kind === 'slots' && def.count === 'marked') return []
    if (def.kind === 'pool') {
      const pool = next as PoolValue
      return def.display === 'bar' ? [`${def.label} ${pool.current}/${pool.max}`] : [def.label]
    }
    return [def.label]
  })
  if (changed.length === 0) {
    return kind === 'short' ? `${KIND_LABEL.short}: nothing to recharge.` : `${KIND_LABEL.long}: already fully rested.`
  }
  return `${KIND_LABEL[kind]}: ${changed.join(', ')} restored.`
}
