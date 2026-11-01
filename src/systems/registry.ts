import { dnd5e2024 } from './dnd5e-2024'
import type { GameSystem, SystemId } from './types'

export const SYSTEMS: GameSystem[] = [dnd5e2024]

export function getSystem(id: SystemId): GameSystem {
  const system = SYSTEMS.find((s) => s.id === id)
  if (!system) throw new Error(`Unknown game system: ${id}`)
  return system
}
