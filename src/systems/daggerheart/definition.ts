// Daggerheart: static definition (traits, resources, content-kind metadata). Content-kind schemas live in schemas.ts and are joined to this
// metadata in index.ts (same cycle-avoidance as dnd5e-2024).
import type { ContentKindDef, ResourceDef, StatDef } from '../types'

export const TRAIT_KEYS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const

export const DH_STATS: StatDef[] = TRAIT_KEYS.map((key) => ({
  key,
  label: key[0].toUpperCase() + key.slice(1),
  short: key.slice(0, 3).toUpperCase(),
  min: -5,
  max: 8,
  default: 0,
}))

// HP, Stress and Armor are slot tracks (single tier '1'); Hope is a pool. Evasion lives in details.
export const DH_RESOURCES: ResourceDef[] = [
  { key: 'hp', label: 'Hit Points', kind: 'slots', display: 'pips', tint: 'plum' },
  { key: 'stress', label: 'Stress', kind: 'slots', display: 'pips' },
  { key: 'armor', label: 'Armor', kind: 'slots', display: 'pips' },
  { key: 'hope', label: 'Hope', kind: 'pool', display: 'counter' },
]

export const HOPE_MAX = 6

export type ContentKindMeta = Omit<ContentKindDef, 'schema'>

export const DH_CONTENT_KIND_META: Record<string, ContentKindMeta> = {
  ancestry: { kind: 'ancestry', label: 'Ancestry', plural: 'Ancestries', homebrew: true, isItem: false, fields: [] },
  community: { kind: 'community', label: 'Community', plural: 'Communities', homebrew: true, isItem: false, fields: [] },
  class: { kind: 'class', label: 'Class', plural: 'Classes', homebrew: false, isItem: false, fields: [] },
  subclass: {
    kind: 'subclass', label: 'Subclass', plural: 'Subclasses', homebrew: true, isItem: false, parentKind: 'class', fields: [],
  },
  domain_card: {
    kind: 'domain_card', label: 'Domain card', plural: 'Domain cards', homebrew: true, isItem: false,
    fields: [
      { key: 'domain', label: 'Domain', type: 'text', required: true },
      { key: 'level', label: 'Level', type: 'number', required: true },
      { key: 'recall_cost', label: 'Recall cost', type: 'number', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['ability', 'spell', 'grimoire'], required: true },
      { key: 'text', label: 'Text', type: 'longtext', required: true },
    ],
  },
}
