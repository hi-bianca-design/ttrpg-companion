import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { CaretRight, CheckCircle, CircleIcon } from 'phosphor-react-native'
import { BackButton, CancelButton, ScreenBackground, SectionHeader } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { WizardProgress } from '@/features/characters/builder/WizardProgress'
import { useBuilderStore, visibleSteps } from '@/features/characters/builder/builder.store'
import { useCreateCharacter } from '@/features/characters/characters.queries'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { getSystem } from '@/systems/registry'
import type { BuilderStepDef, Draft } from '@/systems/types'

const stepHref = (id: string) => `/(app)/characters/new/${id}` as const

/** "Ready to create" checklist; each incomplete step is a button that jumps back to it. */
function Checklist({ steps, draft, onJump }: { steps: BuilderStepDef[]; draft: Draft; onJump: (id: string) => void }) {
  const colors = THEME_COLORS
  return (
    <SectionHeader id="builder-checklist" title="Ready to create">
      <Card className="p-0">
        {steps.map((s, i) => {
          const done = s.isComplete(draft)
          const row = (
            <View className={cn('min-h-11 flex-row items-center gap-3 px-4 py-3', i < steps.length - 1 && 'border-b border-rule')}>
              {done
                ? <CheckCircle size={20} weight="fill" color={colors.primary} />
                : <CircleIcon size={20} color={colors.mutedForeground} />}
              <Text variant="body" tone={done ? 'default' : 'muted'} className="flex-1">{s.title}</Text>
              {done ? null : <Text variant="label" tone="accent">Finish</Text>}
              {done ? null : <CaretRight size={16} color={colors.accentForeground} />}
            </View>
          )
          return done ? (
            <View key={s.id}>{row}</View>
          ) : (
            <Pressable key={s.id} role="button" accessibilityLabel={`${s.title}, incomplete`} onPress={() => onJump(s.id)}>
              {row}
            </Pressable>
          )
        })}
      </Card>
    </SectionHeader>
  )
}

export default function BuilderStepScreen() {
  const { step } = useLocalSearchParams<{ step: string }>()
  const systemId = useBuilderStore((s) => s.systemId)
  const draft = useBuilderStore((s) => s.draft)
  const update = useBuilderStore((s) => s.update)
  const reset = useBuilderStore((s) => s.reset)
  const exit = useBuilderStore((s) => s.exit)
  // Set once the character is saved or the draft discarded: the wizard is leaving, so a cleared
  // store must not redirect back into it.
  const exiting = useBuilderStore((s) => s.exiting)
  const router = useRouter()
  const create = useCreateCharacter()
  const [error, setError] = useState<string | null>(null)

  // No wizard in progress (e.g. app reload on a step URL): start over from the picker.
  if (!systemId) return exiting ? null : <Redirect href="/(app)/characters/new" />

  const system = getSystem(systemId)
  const steps = visibleSteps(system.builder.steps, draft)
  const index = steps.findIndex((s) => s.id === step)
  if (index === -1) return <Redirect href={stepHref(steps[0].id)} />

  const current = steps[index]
  const isLast = index === steps.length - 1
  const Step = current.component
  const before = steps.slice(0, -1)
  const allComplete = steps.every((s) => s.isComplete(draft))

  async function handleCreate() {
    setError(null)
    try {
      const id = await create.mutateAsync(system.builder.toCharacter(draft))
      // Leave the wizard entirely so Back from the sheet returns to the list, then clear the draft.
      // The push waits a tick so the pop is applied first (on web that rewinds browser history
      // instead of collapsing into a replace that leaves the wizard entries behind).
      exit()
      router.dismissTo('/(app)/characters')
      setTimeout(() => {
        router.push(`/(app)/characters/${id}`)
        reset()
      }, 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenBackground>
        <View className="flex-row items-center gap-3">
          {/* On the first step this leaves the wizard; DiscardDraftGuard asks first when the draft has choices. */}
          <BackButton onPress={() => router.back()} />
          <WizardProgress title={current.title} index={index} total={steps.length} />
          {/* From step 2 Back only steps back; Cancel leaves the whole wizard (DiscardDraftGuard asks once). */}
          {index > 0 ? <CancelButton edge="trailing" onPress={() => router.dismissTo('/(app)/characters')} /> : null}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Step draft={draft} update={update} />
          {isLast ? <Checklist steps={before} draft={draft} onJump={(id) => router.dismissTo(stepHref(id))} /> : null}
        </ScrollView>

        <View className="gap-2">
          {error ? <Text variant="caption" tone="destructive">{error}</Text> : null}
          {isLast ? (
            <Button
              variant="highlight"
              accessibilityLabel="Create character"
              disabled={!allComplete || create.isPending}
              onPress={handleCreate}
            >
              <Text>{create.isPending ? 'Creating…' : 'Create character'}</Text>
            </Button>
          ) : (
            <Button
              accessibilityLabel="Continue"
              disabled={!current.isComplete(draft)}
              onPress={() => router.push(stepHref(steps[index + 1].id))}
            >
              <Text>Continue</Text>
            </Button>
          )}
        </View>
      </ScreenBackground>
    </KeyboardAvoidingView>
  )
}
