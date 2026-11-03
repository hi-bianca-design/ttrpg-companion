import { useEffect, useRef } from 'react'
import { Slot, useGlobalSearchParams, useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/features/auth/useAuth'
import { parseInviteCode } from '@/features/campaigns/inviteLink'
import { setPendingJoinCode, takePendingJoinCode } from '@/features/campaigns/pendingJoin'

export function RootRedirect() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()
  const params = useGlobalSearchParams<{ code?: string | string[] }>()
  const resuming = useRef(false)

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) {
      // A join link opened signed out: remember its code so sign-in can resume the join.
      const onJoin = segments[1] === 'campaigns' && segments[2] === 'join'
      const code = onJoin ? parseInviteCode(params.code) : ''
      Promise.resolve(code ? setPendingJoinCode(code) : undefined)
        .catch(() => {})
        .finally(() => router.replace('/(auth)/login'))
    }
    if (user && inAuthGroup && !resuming.current) {
      resuming.current = true
      takePendingJoinCode()
        .catch(() => null)
        .then((code) => {
          if (code) router.replace({ pathname: '/(app)/campaigns/join', params: { code } })
          else router.replace('/(app)')
        })
        .finally(() => { resuming.current = false })
    }
  }, [user, loading, segments, params.code])

  return <Slot />
}
