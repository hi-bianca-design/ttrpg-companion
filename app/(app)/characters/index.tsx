import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { Plus, Sword } from 'phosphor-react-native'
import { ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import type { CharacterSummary } from '@/features/characters/characters.api'
import { useCharacters, useDeleteCharacter } from '@/features/characters/characters.queries'
import { THEME_COLORS } from '@/lib/theme'

type CardProps = { character: CharacterSummary; onPress: () => void; onLongPress: () => void }

function CharacterCard({ character, onPress, onLongPress }: CardProps) {
  const subtitle = `Level ${character.level}${character.class_name ? ` ${character.class_name}` : ''}`
  const hp = character.hp
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${character.name}, ${subtitle}`}
      accessibilityHint="Long press to delete"
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Card className="gap-3">
        <View className="gap-1">
          <Text variant="subhead" numberOfLines={1}>{character.name}</Text>
          <Text variant="body-sm" tone="muted">{subtitle}</Text>
        </View>
        {hp ? (
          <View className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text variant="label">HP</Text>
              <Text variant="label">{`${hp.current} / ${hp.max}`}</Text>
            </View>
            <Progress value={hp.max > 0 ? (hp.current / hp.max) * 100 : 0} accessibilityLabel={`Hit points ${hp.current} of ${hp.max}`} />
          </View>
        ) : null}
      </Card>
    </Pressable>
  )
}

export default function CharactersScreen() {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useCharacters()
  const remove = useDeleteCharacter()
  const [pendingDelete, setPendingDelete] = useState<CharacterSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  const create = () => router.push('/(app)/characters/new')
  const characters = data ?? []

  return (
    <ScreenBackground scroll>
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-1">
          <Text variant="title">Characters</Text>
          {characters.length > 0 ? (
            <Text variant="body-sm" tone="muted">
              {`${characters.length} character${characters.length === 1 ? '' : 's'}`}
            </Text>
          ) : null}
        </View>
        {characters.length > 0 ? (
          <Button size="sm" accessibilityLabel="New character" onPress={create}>
            <Plus size={16} color={colors.primaryForeground} weight="bold" />
            <Text>New</Text>
          </Button>
        ) : null}
      </View>

      {isLoading ? (
        <View className="gap-2" accessibilityLabel="Loading characters">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-full bg-muted" />
              <View className="h-2 w-full rounded-full bg-muted" />
            </Card>
          ))}
        </View>
      ) : isError ? (
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load your characters. Check your connection.</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : characters.length === 0 ? (
        <View className="items-center gap-4 pt-8">
          <Sword size={48} color={colors.accentForeground} weight="duotone" />
          <View className="items-center gap-2">
            <Text variant="display" className="text-center">No characters yet</Text>
            <Text variant="body-sm" tone="muted" className="text-center">
              Build your first hero: choose a class, an origin and abilities. The adventure starts here.
            </Text>
          </View>
          <Button className="w-full" onPress={create}>
            <Text>Create character</Text>
          </Button>
        </View>
      ) : (
        <View className="gap-2">
          {characters.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              onPress={() => router.push(`/(app)/characters/${c.id}`)}
              onLongPress={() => { setDeleteError(null); setPendingDelete(c) }}
            />
          ))}
        </View>
      )}

      {deleteError ? <Text variant="caption" tone="destructive">{deleteError}</Text> : null}

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Delete ${pendingDelete?.name ?? 'character'}?`}</DialogTitle>
            <DialogDescription>This removes the character and everything on their sheet. It can’t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" accessibilityLabel="Cancel" onPress={() => setPendingDelete(null)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              accessibilityLabel="Delete"
              onPress={() => {
                if (!pendingDelete) return
                remove.mutate(pendingDelete.id, {
                  onError: (e) => setDeleteError(e instanceof Error ? e.message : 'Couldn’t delete. Try again.'),
                })
                setPendingDelete(null)
              }}
            >
              <Text>Delete</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScreenBackground>
  )
}
