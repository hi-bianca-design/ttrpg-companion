// The GameSystem contract: everything system-specific (stats, resources, content kinds,
// builder steps, rules) is declared by a module under src/systems/<id>/ and consumed
// generically by screens. Shapes stored in JSON columns are validated by its Zod schemas.
import type * as React from 'react'
import type { z } from 'zod'
import type { PipCount, ResourceTint } from '@/components/game/ResourceTracker'

export type SystemId = 'dnd5e-2024' | 'daggerheart'

export type StatDef = { key: string; label: string; short: string; min: number; max: number; default: number }

export type PoolValue = { current: number; max: number; temp?: number }
export type SlotsValue = { tiers: Record<string, { max: number; used: number }> } // single-tier resources use tier '1'
export type ResourceValue = PoolValue | SlotsValue

export type ResourceDef =
  | {
      key: string
      label: string
      kind: 'pool'
      display: 'bar' | 'counter'
      tint?: ResourceTint
      /** Why damage is unavailable once this pool is at 0 (e.g. D&D: mark a death-save failure instead). */
      emptyHint?: string
      /** A limited-use class feature drawn from a pool (e.g. Lay On Hands), tracked on the Actions screen. */
      group?: 'feature'
    }
  | {
      key: string
      label: string
      kind: 'slots'
      display: 'pips'
      tierLabel?: (tier: string) => string
      tint?: ResourceTint
      /** How the pips read; default 'remaining' (filled = left to spend). */
      count?: PipCount
      /** Only shown while this pool resource is at 0 (e.g. death saves while hit points are 0). */
      showWhenEmpty?: string
      /** A limited-use class feature, tracked on the Actions screen; a rest recharges it. */
      group?: 'feature'
    }

export type FieldDef = {
  key: string
  label: string
  type: 'text' | 'longtext' | 'number' | 'boolean' | 'select' | 'multiselect'
  options?: string[]
  required?: boolean
}

export type ContentKindDef = {
  kind: string
  label: string
  plural: string
  schema: z.ZodTypeAny
  fields: FieldDef[]
  homebrew: boolean
  isItem: boolean
  parentKind?: string
}

export type CharacterRecord = {
  id: string
  system_id: SystemId
  name: string
  level: number
  stats: Record<string, number>
  resources: Record<string, ResourceValue>
  conditions: string[]
  details: Record<string, unknown>
}

export type PickRecord = {
  content_id: string
  kind: string
  state: Record<string, unknown>
  acquired_at_level: number
  content: { name: string; data: unknown }
}

/** One labelled value on a party card. */
export type SummaryItem = { key: string; label: string; value: string }
/** What a party card shows: `glance` always, `more` once expanded. */
export type PartySummary = { glance: SummaryItem[]; more: SummaryItem[] }

export type DerivedValue = { key: string; label: string; value: number | string; format?: 'modifier' | 'plain' }

export type Draft = Record<string, unknown>
export type BuilderStepProps = { draft: Draft; update(patch: Partial<Draft>): void }
export type BuilderStepDef = {
  id: string
  title: string
  component: React.ComponentType<BuilderStepProps>
  /** "Filled in" status only (checklist ticks); it never blocks Continue or Create. */
  isComplete(draft: Draft): boolean
  skip?(draft: Draft): boolean
}

/** Content the player made in the wizard: created as a content row at Create time, then picked. */
export type NewCustomContent = {
  kind: string
  name: string
  description: string
  data: unknown
  /** False for a one-off (kept out of the player's library lists). */
  library: boolean
  pick: { state: Record<string, unknown>; acquired_at_level: number }
}

export type NewCharacter = Omit<CharacterRecord, 'id'> & {
  picks: Array<Pick<PickRecord, 'content_id' | 'kind' | 'state' | 'acquired_at_level'>>
  /** Starting inventory, written to character_items. */
  items?: Array<{ content_id: string; quantity: number; equipped: boolean }>
  /** Custom content to create and pick alongside `picks`. */
  custom?: NewCustomContent[]
}

/** Props every sheet section receives. `onChange` is only passed to the `levelUp` section: it reports the
 * system-specific level-up input and whether that input is complete (the Level up button waits for it). */
export type SheetSectionProps = {
  character: CharacterRecord
  picks: PickRecord[]
  onChange?: (input: Record<string, unknown>, ready: boolean) => void
}

/** What a level up changes on the character row. */
export type LevelUpPatch = Pick<CharacterRecord, 'level' | 'resources' | 'stats'>

export interface GameSystem {
  id: SystemId
  name: string
  hidden?: boolean
  /** Highest character level; the level-up screen shows a max-level state from here on. */
  maxLevel?: number
  stats: StatDef[]
  resources: ResourceDef[]
  conditions: string[]
  contentKinds: Record<string, ContentKindDef>
  schemas: { stats: z.ZodTypeAny; resources: z.ZodTypeAny; details: z.ZodTypeAny }
  builder: {
    steps: BuilderStepDef[]
    initialDraft(): Draft
    pruneDraft(draft: Draft, changed: Partial<Draft>): Draft
    toCharacter(draft: Draft): NewCharacter
    /** The only gate on creating a character. */
    canCreate(draft: Draft): boolean
  }
  rules: {
    derived(c: CharacterRecord, picks: PickRecord[]): DerivedValue[]
    /** Optional: the system's party-card fields. Systems without it get the generic card (name, hit points, conditions). */
    partySummary?(c: CharacterRecord, picks: PickRecord[]): PartySummary
    rest(c: CharacterRecord, kind: 'short' | 'long', picks: PickRecord[]): Record<string, ResourceValue>
    levelUp?(c: CharacterRecord, picks: PickRecord[], input: Record<string, unknown>): LevelUpPatch
    /** Most items a character may be attuned to at once; undefined = no limit. */
    maxAttuned?: number
  }
  // Per-system sheet sections, e.g. D&D 'proficiencies'
  sheet?: { sections?: Record<string, React.ComponentType<SheetSectionProps>> }
}
