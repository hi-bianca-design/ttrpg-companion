import { supabase } from '@/lib/supabase'
import { AppError } from '@/features/errors'

/** The signed-in user's id from the locally stored session (no network round trip). */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new AppError('unknown', { cause: 'not_authenticated' })
  return id
}
