import type { DerivedValue } from '@/systems/types'

/** "sleight-of-hand" / "concentrating" → "Sleight Of Hand" / "Concentrating". */
export function titleCase(key: string): string {
  return key.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export function findDerived(derived: DerivedValue[], key: string): DerivedValue | undefined {
  return derived.find((d) => d.key === key)
}

export function formatDerived(d: DerivedValue): string {
  if (d.format === 'modifier' && typeof d.value === 'number') return d.value >= 0 ? `+${d.value}` : `${d.value}`
  return String(d.value)
}
