// Maps raw Supabase / network failures to a small closed set of app errors with user-facing copy.
export type AppErrorCode =
  | 'invalid_code'
  | 'already_member'
  | 'system_mismatch'
  | 'not_your_character'
  | 'duplicate'
  | 'in_use'
  | 'username_taken'
  | 'not_member'
  | 'no_active_session'
  | 'not_allowed'
  | 'not_in_combat'
  | 'invalid_turn_target'
  | 'not_your_turn'
  | 'no_active_combat'
  | 'not_rolling'
  | 'not_active'
  | 'invalid_target'
  | 'invalid_amount'
  | 'invalid_mode'
  | 'invalid_initiative'
  | 'invalid_position'
  | 'invalid_enemy'
  | 'invalid_encounter'
  | 'invalid_patch'
  | 'invalid_batch'
  | 'network'
  | 'load_failed'
  | 'save_failed'
  | 'unknown'

export const ERROR_COPY: Record<AppErrorCode, string> = {
  invalid_code: "We couldn't find a campaign with that code.",
  already_member: "You're already in this campaign.",
  system_mismatch: 'That character is from a different game system than this campaign.',
  not_your_character: 'You can only join with your own characters.',
  duplicate: 'You already have one with this name.',
  in_use: 'This is used by a character. Remove it from them first.',
  username_taken: 'That username is taken.',
  not_member: "You're not part of this campaign yet.",
  no_active_session: 'This session has already ended.',
  not_allowed: "You can't do that in this session.",
  not_in_combat: "Combat hasn't started yet.",
  invalid_turn_target: "That player can't take a turn right now.",
  not_your_turn: "It isn't your turn.",
  no_active_combat: 'That fight has already ended.',
  not_rolling: 'Combat has already started.',
  not_active: 'Combat has not started yet.',
  invalid_target: "That row isn't in this fight any more.",
  invalid_amount: 'Enter a whole number above zero.',
  invalid_mode: 'Something went wrong. Please try again.',
  invalid_initiative: 'Initiative must be a whole number from -20 to 99.',
  invalid_position: "That spot isn't in the order.",
  invalid_enemy: 'Check the enemy details: a name up to 60 characters, at least 1 hit point, armor class 0 to 40, up to 20 copies.',
  invalid_encounter: 'Check the encounter: a name up to 80 characters, and story notes up to 1000 characters each.',
  invalid_patch: 'Something went wrong. Please try again.',
  invalid_batch: 'Something went wrong. Please try again.',
  network: "Can't reach the server. Check your connection and try again.",
  load_failed: 'Couldn’t load this. Check your connection and try again.',
  save_failed: 'Couldn’t save. Try again.',
  unknown: 'Something went wrong. Please try again.',
}

export class AppError extends Error {
  code: AppErrorCode
  constructor(code: AppErrorCode, options?: { cause?: unknown }) {
    super(ERROR_COPY[code], options)
    this.name = 'AppError'
    this.code = code
  }
}

const RPC_CODES: ReadonlySet<string> = new Set([
  'invalid_code', 'already_member', 'system_mismatch', 'not_your_character',
  'not_member', 'no_active_session', 'not_allowed', 'not_in_combat', 'invalid_turn_target', 'not_your_turn',
  'no_active_combat', 'not_rolling', 'not_active', 'invalid_target', 'invalid_amount', 'invalid_mode', 'invalid_initiative', 'invalid_position', 'invalid_enemy', 'invalid_encounter', 'invalid_patch', 'invalid_batch',
])
const NETWORK_PATTERN = /network request failed|failed to fetch|network error|networkerror|load failed/i

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e
  const err = (typeof e === 'object' && e !== null ? e : {}) as { code?: unknown; message?: unknown }
  const message = typeof err.message === 'string' ? err.message : typeof e === 'string' ? e : ''
  if (err.code === 'P0001' && RPC_CODES.has(message)) return new AppError(message as AppErrorCode, { cause: e })
  if (NETWORK_PATTERN.test(message)) return new AppError('network', { cause: e })
  return new AppError('unknown', { cause: e })
}

/** Returns data or throws the mapped AppError. */
export function unwrap<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw toAppError(res.error)
  return res.data as NonNullable<T>
}

/** Throws the mapped AppError when the response carries an error. */
export function check(res: { error: unknown }): void {
  if (res.error) throw toAppError(res.error)
}
