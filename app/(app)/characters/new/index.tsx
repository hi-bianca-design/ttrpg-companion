import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { ContentCard, ScreenBackground } from '@/components/game'
import { Text } from '@/components/ui/text'
import { useBuilderStore, visibleSteps } from '@/features/characters/builder/builder.store'
import { getSystem, visibleSystems } from '@/systems/registry'
import type { SystemId } from '@/systems/types'

function firstStepHref(systemId: SystemId) {
  const { builder } = getSystem(systemId)
  const [first] = visibleSteps(builder.steps, builder.initialDraft())
  return `/(app)/characters/new/${first.id}` as const
}

/** System picker; skipped (straight to the first step) when only one system is visible. */
export default function NewCharacterScreen() {
  const systems = visibleSystems()
  const start = useBuilderStore((s) => s.start)
  const router = useRouter()
  const [only, setOnly] = useState<SystemId | null>(null)

  useEffect(() => {
    if (systems.length !== 1) return
    start(systems[0].id)
    setOnly(systems[0].id)
  }, []) // once, on entry

  if (only) return <Redirect href={firstStepHref(only)} />
  if (systems.length === 1) return null

  return (
    <ScreenBackground scroll>
      <View className="gap-1">
        <Text variant="title">New character</Text>
        <Text variant="body-sm" tone="muted">Which game is this character for?</Text>
      </View>
      <View className="gap-2">
        {systems.map((s) => (
          <ContentCard
            key={s.id}
            title={s.name}
            onPress={() => {
              start(s.id)
              router.replace(firstStepHref(s.id))
            }}
          />
        ))}
      </View>
    </ScreenBackground>
  )
}
