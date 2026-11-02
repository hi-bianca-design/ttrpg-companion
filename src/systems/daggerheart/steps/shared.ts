// Name suggestions for the Daggerheart text steps (names only; no rules text). Typed values are
// always kept, so homebrew names work the same way.
export const CLASS_SUGGESTIONS = ['Bard', 'Druid', 'Guardian', 'Ranger', 'Rogue', 'Seraph', 'Sorcerer', 'Warrior', 'Wizard']

export const ANCESTRY_SUGGESTIONS = [
  'Clank', 'Drakona', 'Dwarf', 'Elf', 'Faerie', 'Faun', 'Firbolg', 'Fungril', 'Galapa',
  'Giant', 'Goblin', 'Halfling', 'Human', 'Infernis', 'Katari', 'Orc', 'Ribbet', 'Simiah',
]

export const COMMUNITY_SUGGESTIONS = [
  'Highborne', 'Loreborne', 'Orderborne', 'Ridgeborne', 'Seaborne', 'Slyborne', 'Underborne', 'Wanderborne', 'Wildborne',
]

/** Digits only; empty (or no digits) is null. */
export function parseCount(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  return digits === '' ? null : parseInt(digits, 10)
}
