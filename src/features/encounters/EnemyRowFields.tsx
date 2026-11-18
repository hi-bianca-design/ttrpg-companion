import { ArrowDown, ArrowUp, Plus, Trash, X } from 'phosphor-react-native'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { THEME_COLORS } from '@/lib/theme'
import {
  ATTACKS_MAX, ATTACK_NAME_MAX, DAMAGE_MAX, ENEMY_NAME_MAX, LABEL_MAX, NOTES_MAX, TO_HIT_MAX,
  blankAttack, clampCount, digits, type EnemyDraft, type EnemyErrors,
} from './encounterForm'
import { FormField } from './FormField'

type Props = {
  /** 0-based position in the list; labels are 1-based. */
  index: number
  total: number
  enemy: EnemyDraft
  errors: EnemyErrors
  onChange: (patch: Partial<EnemyDraft>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}

/** One enemy of the encounter: its stats, up to six attacks, a Hidden toggle, and move / remove controls. */
export function EnemyRowFields({ index, total, enemy, errors, onChange, onMove, onRemove }: Props) {
  const n = index + 1
  const label = `Enemy ${n}`
  const icon = THEME_COLORS.foreground
  const setAttack = (i: number, patch: Partial<EnemyDraft['attacks'][number]>) =>
    onChange({ attacks: enemy.attacks.map((a, j) => (j === i ? { ...a, ...patch } : a)) })

  return (
    <Card compact className="gap-3">
      <View className="flex-row items-center gap-2">
        <Text variant="subhead" className="flex-1" numberOfLines={1}>{enemy.name.trim() || label}</Text>
        <Button size="icon" variant="outline" disabled={index === 0} accessibilityLabel={`Move enemy ${n} up`} onPress={() => onMove(-1)}>
          <ArrowUp size={16} color={icon} />
        </Button>
        <Button size="icon" variant="outline" disabled={index === total - 1} accessibilityLabel={`Move enemy ${n} down`} onPress={() => onMove(1)}>
          <ArrowDown size={16} color={icon} />
        </Button>
        <Button size="icon" variant="outline" accessibilityLabel={`Remove enemy ${n}`} onPress={onRemove}>
          <Trash size={16} color={icon} />
        </Button>
      </View>

      <FormField label="Name" reason={errors.name} empty={enemy.name.trim() === ''}>
        <Input accessibilityLabel={`${label} name`} placeholder="Goblin" value={enemy.name} maxLength={ENEMY_NAME_MAX} onChangeText={(t) => onChange({ name: t })} />
      </FormField>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <FormField label="×" reason={errors.count} empty={enemy.count === ''}>
            <Input accessibilityLabel={`${label} count`} keyboardType="number-pad" inputMode="numeric" value={enemy.count} onChangeText={(t) => onChange({ count: clampCount(t) })} />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label="Max HP" reason={errors.maxHp} empty={enemy.maxHp === ''}>
            <Input accessibilityLabel={`${label} max HP`} keyboardType="number-pad" inputMode="numeric" maxLength={4} value={enemy.maxHp} onChangeText={(t) => onChange({ maxHp: digits(t) })} />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label="XP" reason={errors.xp} empty={enemy.xp === ''}>
            <Input accessibilityLabel={`${label} xp`} keyboardType="number-pad" inputMode="numeric" maxLength={6} value={enemy.xp} onChangeText={(t) => onChange({ xp: digits(t) })} />
          </FormField>
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <FormField label="Defense label" reason={errors.defenseLabel}>
            <Input accessibilityLabel={`${label} defense label`} value={enemy.defenseLabel} maxLength={LABEL_MAX} onChangeText={(t) => onChange({ defenseLabel: t })} />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label="Defense value" reason={errors.ac} empty={enemy.ac === ''}>
            <Input accessibilityLabel={`${label} defense value`} keyboardType="number-pad" inputMode="numeric" maxLength={2} value={enemy.ac} onChangeText={(t) => onChange({ ac: digits(t) })} />
          </FormField>
        </View>
      </View>

      <View className="gap-2">
        <Text variant="label">Attacks</Text>
        {enemy.attacks.map((a, i) => (
          <View key={i} className="gap-1">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Input accessibilityLabel={`${label} attack ${i + 1} name`} placeholder="Bite" value={a.name} maxLength={ATTACK_NAME_MAX} onChangeText={(t) => setAttack(i, { name: t })} />
              </View>
              <Button size="icon" variant="outline" accessibilityLabel={`Remove ${label.toLowerCase()} attack ${i + 1}`} onPress={() => onChange({ attacks: enemy.attacks.filter((_, j) => j !== i) })}>
                <X size={16} color={icon} />
              </Button>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input accessibilityLabel={`${label} attack ${i + 1} to hit`} placeholder="+4" value={a.toHit} maxLength={TO_HIT_MAX} onChangeText={(t) => setAttack(i, { toHit: t })} />
              </View>
              <View className="flex-1">
                <Input accessibilityLabel={`${label} attack ${i + 1} damage`} placeholder="1d6+2" value={a.damage} maxLength={DAMAGE_MAX} onChangeText={(t) => setAttack(i, { damage: t })} />
              </View>
            </View>
            {a.name.trim() === '' ? <Text variant="caption" tone="muted">{errors.attacks[i]?.name}</Text> : null}
          </View>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={enemy.attacks.length >= ATTACKS_MAX}
          accessibilityLabel={`Add attack to enemy ${n}`}
          onPress={() => onChange({ attacks: [...enemy.attacks, blankAttack()] })}
        >
          <Plus size={14} color={THEME_COLORS.accentForeground} />
          <Text>Add attack</Text>
        </Button>
      </View>

      <FormField label="Notes" reason={errors.notes}>
        <Input accessibilityLabel={`${label} notes`} placeholder="Optional" multiline maxLength={NOTES_MAX} value={enemy.notes} onChangeText={(t) => onChange({ notes: t })} />
      </FormField>
      <View className="flex-row flex-wrap gap-2">
        <ToggleChip label="Hidden" accessibilityLabel={`${label} hidden`} tone="outline" selected={enemy.hidden} onPress={() => onChange({ hidden: !enemy.hidden })} />
      </View>
    </Card>
  )
}
