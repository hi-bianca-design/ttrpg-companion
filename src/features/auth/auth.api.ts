import { supabase } from '@/lib/supabase'
import { AppError } from '@/features/errors'

export async function signUp(email: string, password: string, username: string) {
  // supabase-js only sees GoTrue's generic "Database error saving new user" when the
  // handle_new_user trigger refuses a taken name, so ask first. If the check itself fails,
  // carry on: the trigger still refuses a taken name.
  const available = await supabase.rpc('username_available', { p_username: username })
  if (available.data === false) throw new AppError('username_taken')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  // handle_new_user raises `username_taken` (P0001); some GoTrue clients get that message back.
  if (error?.message === 'username_taken') throw new AppError('username_taken', { cause: error })
  if (error) throw new Error(error.message)
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
