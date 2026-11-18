import type { Attack } from '@/features/combat/combat.api'
import type { Encounter, EncounterInput } from './encounters.api'

// Limits mirror supabase/migrations/20261107000001_save_encounter.sql (the server is authoritative).
export const NAME_MAX = 80
export const STORY_MAX = 1000
export const ENEMY_NAME_MAX = 60
const COUNT_MAX = 20
export const LABEL_MAX = 12
const AC_MAX = 40
export const NOTES_MAX = 500
export const ATTACKS_MAX = 6
const ENEMIES_MAX = 30
export const ATTACK_NAME_MAX = 60
export const TO_HIT_MAX = 20
export const DAMAGE_MAX = 40
const DEFAULT_LABEL = 'AC'

/** Every number is typed text until save; blank means "not set" where the field is optional. */
export type AttackDraft = { name: string; toHit: string; damage: string }
export type EnemyDraft = {
  /** Stable React key, so moving a row keeps its inputs. Never saved. */
  key: string
  name: string
  count: string
  maxHp: string
  defenseLabel: string
  ac: string
  xp: string
  attacks: AttackDraft[]
  notes: string
  hidden: boolean
}
export type EncounterDraft = {
  name: string
  storyBefore: string
  storyWhy: string
  storyAfter: string
  enemies: EnemyDraft[]
}

let keySeq = 0
const nextKey = () => `enemy-${++keySeq}`

export const blankAttack = (): AttackDraft => ({ name: '', toHit: '', damage: '' })
export const blankEnemy = (): EnemyDraft => ({
  key: nextKey(), name: '', count: '1', maxHp: '', defenseLabel: DEFAULT_LABEL, ac: '', xp: '', attacks: [], notes: '', hidden: false,
})
export const blankDraft = (): EncounterDraft => ({ name: '', storyBefore: '', storyWhy: '', storyAfter: '', enemies: [] })

export const digits = (t: string) => t.replace(/[^0-9]/g, '')
/** Count as typed: digits only, 1..20; empty stays empty so it can be retyped. */
export function clampCount(t: string): string {
  const d = digits(t)
  if (d === '') return ''
  return String(Math.max(1, Math.min(COUNT_MAX, Number.parseInt(d, 10))))
}

const isAttack = (a: unknown): a is Attack =>
  typeof a === 'object' && a !== null
  && typeof (a as Attack).name === 'string' && typeof (a as Attack).toHit === 'string' && typeof (a as Attack).damage === 'string'

/** The saved encounter as form text. Malformed stored attacks are dropped rather than crashing the form. */
export function draftFromEncounter(e: Encounter): EncounterDraft {
  return {
    name: e.name,
    storyBefore: e.story_before ?? '',
    storyWhy: e.story_why ?? '',
    storyAfter: e.story_after ?? '',
    enemies: e.enemies.map((x) => ({
      key: nextKey(),
      name: x.name,
      count: String(x.count),
      maxHp: String(x.max_hp),
      defenseLabel: x.defense_label ?? DEFAULT_LABEL,
      ac: x.ac === null ? '' : String(x.ac),
      xp: x.xp === null ? '' : String(x.xp),
      attacks: Array.isArray(x.attacks) ? x.attacks.filter(isAttack).map(({ name, toHit, damage }) => ({ name, toHit, damage })) : [],
      notes: x.notes ?? '',
      hidden: x.hidden,
    })),
  }
}

/** A new array with the row at `index` swapped one place up (-1) or down (+1); a no-op at the ends. */
export function moveEnemy(enemies: EnemyDraft[], index: number, dir: -1 | 1): EnemyDraft[] {
  const to = index + dir
  if (index < 0 || index >= enemies.length || to < 0 || to >= enemies.length) return enemies
  const next = [...enemies]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

export type AttackErrors = { name?: string }
export type EnemyErrors = {
  name?: string
  count?: string
  maxHp?: string
  defenseLabel?: string
  ac?: string
  xp?: string
  notes?: string
  tooManyAttacks?: string
  attacks: AttackErrors[]
}
type DraftErrors = {
  valid: boolean
  name?: string
  storyBefore?: string
  storyWhy?: string
  storyAfter?: string
  tooManyEnemies?: string
  enemies: EnemyErrors[]
}

const int = (t: string): number | null => (t.trim() === '' ? null : Number.parseInt(t, 10))

function validateEnemy(e: EnemyDraft): EnemyErrors {
  const out: EnemyErrors = { attacks: e.attacks.map((a) => (a.name.trim() === '' ? { name: 'Give the attack a name' } : {})) }
  const name = e.name.trim()
  if (name === '') out.name = 'Give the enemy a name'
  else if (name.length > ENEMY_NAME_MAX) out.name = `Up to ${ENEMY_NAME_MAX} characters`
  const count = int(e.count)
  if (count === null || count < 1 || count > COUNT_MAX) out.count = `A number from 1 to ${COUNT_MAX}`
  const hp = int(e.maxHp)
  if (hp === null || hp < 1) out.maxHp = 'At least 1'
  const ac = int(e.ac)
  if (ac !== null && (ac < 0 || ac > AC_MAX)) out.ac = `From 0 to ${AC_MAX}`
  if (ac !== null && e.defenseLabel.trim().length > LABEL_MAX) out.defenseLabel = `Up to ${LABEL_MAX} characters`
  if (e.notes.trim().length > NOTES_MAX) out.notes = `Up to ${NOTES_MAX} characters`
  if (e.attacks.length > ATTACKS_MAX) out.tooManyAttacks = `Up to ${ATTACKS_MAX} attacks`
  return out
}

const enemyOk = (e: EnemyErrors) =>
  !e.name && !e.count && !e.maxHp && !e.defenseLabel && !e.ac && !e.xp && !e.notes && !e.tooManyAttacks && e.attacks.every((a) => !a.name)

/** Every reason the draft cannot be saved yet. The name and every enemy row must be clean. */
export function validateDraft(d: EncounterDraft): DraftErrors {
  const out: DraftErrors = { valid: true, enemies: d.enemies.map(validateEnemy) }
  const name = d.name.trim()
  if (name === '') out.name = 'Give the encounter a name'
  else if (name.length > NAME_MAX) out.name = `Up to ${NAME_MAX} characters`
  const story = (t: string) => (t.trim().length > STORY_MAX ? `Up to ${STORY_MAX} characters` : undefined)
  out.storyBefore = story(d.storyBefore)
  out.storyWhy = story(d.storyWhy)
  out.storyAfter = story(d.storyAfter)
  if (d.enemies.length > ENEMIES_MAX) out.tooManyEnemies = `Up to ${ENEMIES_MAX} enemies`
  out.valid = !out.name && !out.storyBefore && !out.storyWhy && !out.storyAfter && !out.tooManyEnemies && out.enemies.every(enemyOk)
  return out
}

const orNull = (t: string) => t.trim() || null

/** The save payload from a valid draft: trimmed, blanks as null, numbers as numbers, list order kept. */
export function toSaveInput(d: EncounterDraft): EncounterInput {
  return {
    name: d.name.trim(),
    storyBefore: orNull(d.storyBefore),
    storyWhy: orNull(d.storyWhy),
    storyAfter: orNull(d.storyAfter),
    enemies: d.enemies.map((e) => {
      const ac = int(e.ac)
      return {
        name: e.name.trim(),
        count: int(e.count) ?? 1,
        max_hp: int(e.maxHp) ?? 1,
        // The label only means something beside a number: blank AC stores no label, blank label stores the default.
        defense_label: ac === null ? null : e.defenseLabel.trim() || DEFAULT_LABEL,
        ac,
        xp: int(e.xp),
        notes: orNull(e.notes),
        hidden: e.hidden,
        attacks: e.attacks.map((a) => ({ name: a.name.trim(), toHit: a.toHit.trim(), damage: a.damage.trim() })),
      }
    }),
  }
}
