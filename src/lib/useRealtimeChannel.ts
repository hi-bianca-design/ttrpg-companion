import { useEffect, useId, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Options = {
  /** Channel name base. `null` means nothing to listen to: no channel, and `connected` is true. */
  topic: string | null
  /** Adds the `postgres_changes` bindings to the fresh channel. Called once per channel built. */
  bind: (channel: RealtimeChannel) => RealtimeChannel
  /** Called on every SUBSCRIBED, including recovery: changes made while joining or down never arrived. */
  onSubscribed: () => void
}

/**
 * The Realtime channel lifecycle shared by the party and combat hooks. A unique channel name per hook
 * instance (realtime-js hands back an existing channel for a name in use, and a second screen would throw
 * or tear it down), `connected` from the channel status, a rebuild two seconds after the server closes the
 * channel (the socket does not rejoin on its own), and teardown on unmount or topic change.
 */
export function useRealtimeChannel({ topic, bind, onSubscribed }: Options): { connected: boolean } {
  const [connected, setConnected] = useState(true)
  const instance = useId()
  // Bumped to rebuild the channel after the server closes it.
  const [attempt, setAttempt] = useState(0)
  // The latest callbacks, so a re-render never rebuilds the channel.
  const latest = useRef({ bind, onSubscribed })
  latest.current = { bind, onSubscribed }

  useEffect(() => {
    if (!topic) {
      setConnected(true)
      return
    }
    let closed = false
    let rebuild: ReturnType<typeof setTimeout> | undefined

    const channel = latest.current
      .bind(supabase.channel(`${topic}:${instance}:${attempt}`))
      .subscribe((status) => {
        if (closed) return
        if (status === 'SUBSCRIBED') {
          setConnected(true)
          latest.current.onSubscribed()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnected(false)
          if (status === 'CLOSED') rebuild = setTimeout(() => setAttempt((n) => n + 1), 2000)
        }
      })

    return () => {
      closed = true
      clearTimeout(rebuild)
      supabase.removeChannel(channel)
    }
  }, [topic, instance, attempt])

  return { connected }
}
