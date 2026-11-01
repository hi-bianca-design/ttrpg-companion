export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

// Level 1: max hit die + con mod. Each subsequent level: floor(hitDie/2)+1 + con mod.
export function getMaxHP(level: number, hitDie: number, constitutionModifier: number): number {
  return (hitDie + constitutionModifier) + (level - 1) * (Math.floor(hitDie / 2) + 1 + constitutionModifier)
}

export const SPELLCASTING_CLASSES = [
  'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard',
]

// Cantrips known by class at each level (index 0 = level 1)
const CANTRIPS_KNOWN: Partial<Record<string, number[]>> = {
  Bard:     [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Cleric:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  Druid:    [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Sorcerer: [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
  Warlock:  [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Wizard:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
}

// Spells known by class at each level (index 0 = level 1); null = prepared caster
const SPELLS_KNOWN: Partial<Record<string, number[]>> = {
  Bard:    [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  Sorcerer:[2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  Warlock: [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  Ranger:  [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
}

// Highest spell slot level available to a class at a given character level
export function getMaxSpellLevel(className: string, characterLevel: number): number {
  switch (className) {
    case 'Bard':
    case 'Cleric':
    case 'Druid':
    case 'Sorcerer':
    case 'Wizard':
      // Full casters: ceil(level/2), max 9
      return Math.min(9, Math.ceil(characterLevel / 2))
    case 'Warlock':
      // Full slots but max spell level 5
      return Math.min(5, Math.ceil(characterLevel / 2))
    case 'Paladin':
      // Half caster starting at level 1: ceil(level/4), max 5
      return Math.min(5, Math.ceil(characterLevel / 4))
    case 'Ranger':
      // Half caster starting at level 2
      return characterLevel < 2 ? 0 : Math.min(5, Math.ceil((characterLevel - 1) / 4))
    default:
      return 0
  }
}

export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
]

export function getLevelFromXP(xp: number): number {
  let level = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}

export function getXPForNextLevel(level: number): number | null {
  if (level >= 20) return null
  return XP_THRESHOLDS[level] ?? null
}

export function getMaxHPMulticlass(
  startingLevel: number,
  primaryHitDie: number,
  secondHitDie: number | null,
  secondClassLevel: number | null,
  conMod: number
): number {
  const primaryLevel = startingLevel - (secondClassLevel ?? 0)
  const primaryHP =
    (primaryHitDie + conMod) +
    Math.max(0, primaryLevel - 1) * (Math.floor(primaryHitDie / 2) + 1 + conMod)
  const secondaryHP =
    secondClassLevel && secondHitDie
      ? secondClassLevel * (Math.floor(secondHitDie / 2) + 1 + conMod)
      : 0
  return primaryHP + secondaryHP
}

export function getSpellLimits(
  className: string,
  level: number,
  abilityMod: number = 0,
): { maxCantrips: number; maxSpells: number } {
  const idx = Math.min(Math.max(level, 1), 20) - 1
  const maxCantrips = CANTRIPS_KNOWN[className]?.[idx] ?? 0

  const known = SPELLS_KNOWN[className]
  if (known) return { maxCantrips, maxSpells: known[idx] }

  // Prepared casters: ability modifier + level (min 1)
  const prepared = Math.max(1, abilityMod + level)
  return { maxCantrips, maxSpells: prepared }
}
