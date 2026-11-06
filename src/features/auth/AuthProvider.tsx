import React, { createContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
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
      if (event === 'SIGNED_OUT') {
        void clearPersistedCombat()
        queryClient.clear()
        useBuilderStore.getState().reset()
      }
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
