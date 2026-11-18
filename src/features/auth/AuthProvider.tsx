import React, { createContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import { clearPersistedCombat, setOfflineUser } from '@/lib/offline'
import { useBuilderStore } from '@/features/characters/builder/builder.store'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // The last user seen signed in. Survives a lost session (an expired token while offline) so a different
  // user arriving later, with no SIGNED_OUT in between, is still recognised as a change of user.
  const lastUserId = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) lastUserId.current = session.user.id
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch(() => {
        // Session could not be retrieved; treat as unauthenticated
      })
      .finally(() => {
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      // Cached characters/campaigns and any half-built character belong to the previous user. The GM's
      // offline combat cache goes first, so clearing the query cache is never written back to it.
      // A different user without a sign-out (a frozen tab resuming after someone else signed in, or a new
      // sign-in after a lost session) is treated the same, before the new user starts persisting.
      const otherUser = !!session && !!lastUserId.current && session.user.id !== lastUserId.current
      if (event === 'SIGNED_OUT' || otherUser) {
        void clearPersistedCombat()
        queryClient.clear()
        useBuilderStore.getState().reset()
      }
      if (event === 'SIGNED_OUT') lastUserId.current = null
      else if (session) lastUserId.current = session.user.id
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Offline combat data is kept per user: a new user (or a different one) switches the persisted store.
  // No session only pauses it (an expired token while offline must not wipe the GM's cards); sign-out clears it.
  const userId = user?.id ?? null
  useEffect(() => {
    if (!loading) void setOfflineUser(userId)
  }, [loading, userId])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
