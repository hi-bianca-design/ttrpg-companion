// D&D 5e (2024) level-1 class choices as data: which choices a class makes and how many.
// Values are stored as free strings on the class pick's `state.choices[key]`; a value that
// matches an official option by name (see sameName) applies that option's mechanics, anything
// else is kept and shown as text with no effect.
import { orderFeature, orderOptions, weaponMasteryCountFor } from './rules'

// sameName lives in rules.ts (which also needs it) so this module and rules.ts don't import each other at runtime.
export { sameName } from './rules'

export type ChoiceKey = 'fighting_style' | 'weapon_mastery' | 'expertise' | 'order'

export type ClassChoice = { key: ChoiceKey; label: string; help: string; count: number }

/** The class's level-1 choices, from its level-1 feature names (and the Cleric / Druid order table). */
export function classChoicesFor(className: string, level1Features: string[]): ClassChoice[] {
  const out: ClassChoice[] = []
  if (level1Features.includes('Fighting Style')) {
    out.push({ key: 'fighting_style', label: 'Fighting Style', help: 'A fighting style feat, such as Defense or Archery.', count: 1 })
  }
  const mastery = weaponMasteryCountFor(className, level1Features)
  if (mastery > 0) {
    out.push({ key: 'weapon_mastery', label: 'Weapon Mastery', help: `${mastery} weapons whose mastery property you can use.`, count: mastery })
  }
  if (level1Features.includes('Expertise')) {
    out.push({ key: 'expertise', label: 'Expertise', help: '2 skills you are proficient in; your proficiency bonus is doubled for them.', count: 2 })
  }
  const feature = orderFeature(className)
  if (feature && orderOptions(className).length > 0) {
    out.push({ key: 'order', label: feature, help: orderOptions(className).map((o) => o.label).join(' or '), count: 1 })
  }
  return out
}

const CHOICE_KEYS: { key: ChoiceKey; label: string }[] = [
  { key: 'fighting_style', label: 'Fighting Style' },
  { key: 'weapon_mastery', label: 'Weapon Mastery' },
  { key: 'expertise', label: 'Expertise' },
  { key: 'order', label: 'Order' },
]

/** Non-empty class choices with display labels, for read-only summaries (sheet, Review). No class content needed. */
export function choiceSummary(className: string, valuesFor: (key: ChoiceKey) => string[]): { key: ChoiceKey; label: string; value: string }[] {
  return CHOICE_KEYS.flatMap(({ key, label }) => {
    const values = valuesFor(key).map((v) => v.trim()).filter(Boolean)
    if (values.length === 0) return []
    return [{ key, label: key === 'order' ? (orderFeature(className) ?? label) : label, value: values.join(', ') }]
  })
}
