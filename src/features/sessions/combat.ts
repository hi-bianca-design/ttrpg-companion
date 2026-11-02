import type { Session } from './sessions.api'

/** The GM, or whoever entered combat, can end it. Unknown ids never match each other. */
export function canEndCombat(
  session: Pick<Session, 'combat_started_by'>,
  userId: string | undefined,
  gmId: string | undefined,
): boolean {
  if (!userId) return false
  return userId === gmId || userId === session.combat_started_by
}
