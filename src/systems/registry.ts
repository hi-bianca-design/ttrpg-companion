import { daggerheart } from './daggerheart'
import { dnd5e2024 } from './dnd5e-2024'
import type { GameSystem, SystemId } from './types'

export const SYSTEMS: GameSystem[] = [dnd5e2024, daggerheart]

/** Systems offered by UI pickers (hidden stubs are still resolvable via getSystem). */
export function visibleSystems(): GameSystem[] {
  return SYSTEMS.filter((s) => !s.hidden)
}

export function getSystem(id: SystemId): GameSystem {
  const system = SYSTEMS.find((s) => s.id === id)
  if (!system) throw new Error(`Unknown game system: ${id}`)
  return system
}
