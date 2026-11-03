import type { Session } from './sessions.api'

/**
 * The signed-in user holds the turn, and is looking at their own character's sheet (the banner is
 * for the holder only: not the GM viewing that sheet, not a teammate's). Unknown ids never match.
 */
export function holdsTurn(
  session: Pick<Session, 'in_combat' | 'current_turn_user_id'>,
  userId: string | undefined,
  characterOwnerId: string | undefined,
): boolean {
  if (!userId || !characterOwnerId) return false
  return session.in_combat && session.current_turn_user_id === userId && characterOwnerId === userId
}
