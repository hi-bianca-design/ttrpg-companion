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
