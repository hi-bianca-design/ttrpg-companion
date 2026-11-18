type OrderItem = { id: string; kind: 'player' | 'enemy'; hp: number | null }

/**
 * The device's copy of the server's `combat_next_entry`, for Next turn while offline. `order` is in
 * position order. Enemies at 0 hit points are skipped; players never are. If every entry other than the
 * current one is a downed enemy, it returns the plain next position, so the turn always moves. Past the
 * last row it wraps (`wrapped`: the round goes up). An unknown current starts before the first row.
 * Null only when there are no rows.
 */
export function nextEntryLocal(order: OrderItem[], currentId: string): { id: string; wrapped: boolean } | null {
  const at = order.findIndex((e) => e.id === currentId)
  const after = order.slice(at + 1)
  const up = (e: OrderItem) => !(e.kind === 'enemy' && e.hp === 0)

  const ahead = after.find(up)
  if (ahead) return { id: ahead.id, wrapped: false }
  const wrapped = order.find((e) => e.id !== currentId && up(e))
  if (wrapped) return { id: wrapped.id, wrapped: true }
  if (after[0]) return { id: after[0].id, wrapped: false }
  return order[0] ? { id: order[0].id, wrapped: true } : null
}
