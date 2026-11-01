import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import type { CharacterFull } from '../characters.api'
import { findDerived, formatDerived } from './format'

const CLASS_LINE_KINDS = ['class', 'subclass', 'background']

const pickName = (character: CharacterFull, kind: string) => character.picks.find((p) => p.kind === kind)?.content?.name

/** "Wizard · Evoker · Sage": the sheet header's subtitle on the Character tab. */
export function classLine(character: CharacterFull): string {
  return CLASS_LINE_KINDS.map((k) => pickName(character, k)).filter(Boolean).join(' · ')
}

/** Under the sheet header on the Character tab: species / level / proficiency chips and (when tracked) an XP bar. */
export function CharacterSummary({ character }: { character: CharacterFull }) {
  const species = pickName(character, 'species')
  const prof = findDerived(character.derived, 'proficiency')
  const xp = typeof character.details.xp === 'number' ? character.details.xp : null
  const xpProgress = findDerived(character.derived, 'xp_progress')
  const xpNext = findDerived(character.derived, 'xp_next')

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {species ? <Badge>{species}</Badge> : null}
        <Badge>{`Level ${character.level}`}</Badge>
        {prof ? <Badge>{`Prof ${formatDerived(prof)}`}</Badge> : null}
      </View>
      {xp !== null ? (
        <View className="gap-1" accessible accessibilityLabel={`Experience ${xp} XP${xpNext ? ` of ${xpNext.value}` : ''}`}>
          <View className="flex-row items-center justify-between">
            <Text variant="label">XP</Text>
            <Text variant="label">{xpNext ? `${xp.toLocaleString()} / ${Number(xpNext.value).toLocaleString()}` : xp.toLocaleString()}</Text>
          </View>
          <Progress value={typeof xpProgress?.value === 'number' ? xpProgress.value : 0} />
        </View>
      ) : null}
    </View>
  )
}
