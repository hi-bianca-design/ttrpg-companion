import AsyncStorage from '@react-native-async-storage/async-storage'
import { parseInviteCode } from '@/features/campaigns/inviteLink'

const KEY = 'session-zero:pending-join-code'

// A join link opened while signed out: kept across the login redirect and used once after sign-in.
export async function setPendingJoinCode(code: string): Promise<void> {
  const parsed = parseInviteCode(code)
  if (parsed) await AsyncStorage.setItem(KEY, parsed)
}

export async function takePendingJoinCode(): Promise<string | null> {
  const code = await AsyncStorage.getItem(KEY)
  if (code) await AsyncStorage.removeItem(KEY)
  return code || null
}
