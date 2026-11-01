# Character Sheet Custom Content Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the character sheet so it correctly displays characters that use custom species, backgrounds, equipment, or spells created via the Plan 3 custom content manager.

**Architecture:** After Plan 3's custom FK columns were added to `characters`, the `SHEET_SELECT` query and `CharacterWithRelations` type were never updated — so custom-content characters silently show "—" for species/background, skip all background skill proficiencies, and show "Custom Item" without a name in inventory. Fix by expanding the query to join `user_content` via each FK, widening the type, and updating the three affected tabs. Also add a missing "Add Condition" UI to the Overview tab.

**Tech Stack:** React Native, Expo Router v3, Supabase JS v2, TypeScript, NativeWind v4 (Catppuccin Mocha palette: `bg-base` = #1e1e2e, `bg-surface` = #313244, `bg-overlay` = #45475a, `text-text` = #cdd6f4, `text-muted` = #6c7086, `text-primary` = #cba6f7, `text-red` = #f38ba8, `text-green` = #a6e3a1, `text-yellow` = #f9e2af). **IMPORTANT:** `text-base` is a Catppuccin color class (#1e1e2e), NOT a Tailwind font-size class. Use `text-sm`/`text-lg` etc. for font sizes.

---

## File Structure

**Modified:**
- `src/modules/character/character.types.ts` — widen `CharacterWithRelations` with custom relations
- `src/modules/character/character.service.ts` — expand `SHEET_SELECT` to join custom content
- `app/(app)/characters/[id]/index.tsx` — show custom species/background names; add condition picker
- `app/(app)/characters/[id]/skills.tsx` — use custom background's `skill_proficiencies` from JSONB
- `app/(app)/characters/[id]/inventory.tsx` — show custom equipment name via join

**Test:**
- `__tests__/modules/character/character.service.test.ts` — add `getCharacter` test

---

### Task 1: Expand SHEET_SELECT and CharacterWithRelations for custom content

The Supabase FK hint syntax `table!fk_name(cols)` disambiguates when `user_content` is referenced by multiple FKs. FK names come from `src/types/database.types.ts`:
- `characters_custom_species_id_fkey`
- `characters_custom_background_id_fkey`
- `character_equipment_custom_content_id_fkey`

**Files:**
- Modify: `src/modules/character/character.types.ts`
- Modify: `src/modules/character/character.service.ts`
- Test: `__tests__/modules/character/character.service.test.ts`

- [ ] **Step 1: Write failing test for getCharacter query**

Add to the end of `__tests__/modules/character/character.service.test.ts`:

```typescript
describe('getCharacter', () => {
  it('selects custom_species, custom_background, and custom_equipment relations', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'c1' }, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    await getCharacter('c1')
    const selectArg = mockSelect.mock.calls[0][0] as string
    expect(selectArg).toContain('custom_species')
    expect(selectArg).toContain('custom_background')
    expect(selectArg).toContain('custom_equipment')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/modules/character/character.service.test.ts --testNamePattern="selects custom_species" -t "selects custom_species" 2>&1 | tail -20
```

Expected: FAIL — `custom_species` not found in select string

- [ ] **Step 3: Update CharacterWithRelations in character.types.ts**

Replace the existing `CharacterWithRelations` type:

```typescript
type CustomContentRef = { id: string; name: string; properties: Record<string, unknown> }

export type CharacterWithRelations = DBCharacter & {
  class: DBClass | null
  subclass: DBSubclass | null
  species: DBSpecies | null
  background: DBBackground | null
  custom_species: CustomContentRef | null
  custom_background: CustomContentRef | null
  character_spells: Array<{
    id: string
    spell_id: string | null
    custom_content_id: string | null
    is_prepared: boolean
    slots_expended: Record<string, number>
    spell: DBSpell | null
  }>
  character_equipment: Array<{
    id: string
    equipment_id: string | null
    custom_content_id: string | null
    quantity: number
    is_equipped: boolean
    equipment: DBEquipment | null
    custom_equipment: CustomContentRef | null
  }>
}
```

- [ ] **Step 4: Update SHEET_SELECT in character.service.ts**

Replace the existing `SHEET_SELECT` constant:

```typescript
const SHEET_SELECT = `
  *,
  class:classes(*),
  subclass:subclasses(*),
  species:species(*),
  background:backgrounds(*),
  custom_species:user_content!characters_custom_species_id_fkey(id, name, properties),
  custom_background:user_content!characters_custom_background_id_fkey(id, name, properties),
  character_spells(id, spell_id, custom_content_id, is_prepared, slots_expended, spell:spells(*)),
  character_equipment(id, equipment_id, custom_content_id, quantity, is_equipped, equipment:equipment(*), custom_equipment:user_content!character_equipment_custom_content_id_fkey(id, name, properties))
`
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/modules/character/character.service.test.ts 2>&1 | tail -15
```

Expected: All tests pass (previously passing tests + new `getCharacter` test)

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/modules/character/character.types.ts src/modules/character/character.service.ts __tests__/modules/character/character.service.test.ts
git commit -m "feat: join custom species/background/equipment in SHEET_SELECT"
```

---

### Task 2: Fix Overview tab — custom names and Add Condition UI

**Files:**
- Modify: `app/(app)/characters/[id]/index.tsx`

The overview currently reads `character.species?.name` and `character.background?.name` — both null when custom content is used. Also, there's no way to add conditions (only remove via `ConditionBadge`).

- [ ] **Step 1: Write failing TypeScript check (baseline)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: Clean baseline (no errors before our change)

- [ ] **Step 2: Fix custom names and add condition UI in index.tsx**

Full replacement of `app/(app)/characters/[id]/index.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations, DBCharacter, ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { HPBar } from '@/components/character/HPBar'
import { ConditionBadge } from '@/components/character/ConditionBadge'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

export default function OverviewTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [conditionPickerOpen, setConditionPickerOpen] = useState(false)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  async function applyDamage(amount: number) {
    if (!character) return
    const newHP = Math.max(0, character.hp_current - amount)
    const updated = await updateCharacter(id, { hp_current: newHP }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function applyHeal(amount: number) {
    if (!character) return
    const newHP = Math.min(character.hp_max, character.hp_current + amount)
    const updated = await updateCharacter(id, { hp_current: newHP }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function setTempHP(amount: number) {
    if (!character) return
    const updated = await updateCharacter(id, { temp_hp: amount }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, temp_hp: updated.temp_hp } : prev)
  }

  async function removeCondition(condition: string) {
    if (!character) return
    const newConditions = character.conditions.filter((c) => c !== condition)
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
  }

  async function addCondition(condition: string) {
    if (!character || character.conditions.includes(condition)) return
    const newConditions = [...character.conditions, condition]
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
    setConditionPickerOpen(false)
  }

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const speciesName = character.species?.name ?? character.custom_species?.name ?? '—'
  const backgroundName = character.background?.name ?? character.custom_background?.name ?? '—'

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-2xl font-bold text-text">{character.name}</Text>
          <Text className="text-muted text-sm">
            Level {character.level} {character.class?.name ?? '—'}
            {character.subclass ? ` (${character.subclass.name})` : ''}
          </Text>
          <Text className="text-muted text-xs">{speciesName} · {backgroundName}</Text>
        </View>
        <TouchableOpacity
          className="bg-surface px-3 py-1 rounded-lg"
          onPress={() => router.push(`/(app)/characters/${id}/level-up`)}
        >
          <Text className="text-primary text-sm">Level Up</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-surface rounded-xl p-4 mb-3">
        <Text className="text-muted text-xs font-bold mb-3">HIT POINTS</Text>
        <HPBar
          hpCurrent={character.hp_current}
          hpMax={character.hp_max}
          tempHP={character.temp_hp}
          onDamage={applyDamage}
          onHeal={applyHeal}
          onSetTempHP={setTempHP}
        />
      </View>

      <View className="flex-row gap-3 mb-3">
        {[
          { label: 'AC', value: character.armor_class },
          { label: 'Initiative', value: formatModifier(getAbilityModifier(character.dexterity)) },
          { label: 'Speed', value: `${character.speed} ft` },
          { label: 'Prof', value: `+${profBonus}` },
        ].map(({ label, value }) => (
          <View key={label} className="flex-1 bg-surface rounded-xl p-3 items-center">
            <Text className="text-muted text-xs">{label}</Text>
            <Text className="text-text font-bold text-lg">{value}</Text>
          </View>
        ))}
      </View>

      <View className="bg-surface rounded-xl p-4 mb-3">
        <Text className="text-muted text-xs font-bold mb-3">ABILITY SCORES</Text>
        <View className="flex-row flex-wrap gap-2">
          {ABILITY_KEYS.map((key) => {
            const score = character[key]
            const mod = getAbilityModifier(score)
            return (
              <View key={key} className="items-center bg-overlay rounded-xl px-3 py-2 flex-1 min-w-[80px]">
                <Text className="text-muted text-xs">{ABILITY_LABELS[key].slice(0, 3).toUpperCase()}</Text>
                <Text className="text-text font-bold text-xl">{score}</Text>
                <Text className="text-primary text-sm">{formatModifier(mod)}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View className="bg-surface rounded-xl p-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-muted text-xs font-bold">CONDITIONS</Text>
          <TouchableOpacity onPress={() => setConditionPickerOpen(true)}>
            <Text className="text-primary text-xs">+ Add</Text>
          </TouchableOpacity>
        </View>
        {character.conditions.length === 0 ? (
          <Text className="text-muted text-xs">None</Text>
        ) : (
          <View className="flex-row flex-wrap">
            {character.conditions.map((c) => (
              <ConditionBadge key={c} condition={c} onRemove={() => removeCondition(c)} />
            ))}
          </View>
        )}
      </View>

      <Modal visible={conditionPickerOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-2xl p-4 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text font-bold text-lg">Add Condition</Text>
              <TouchableOpacity onPress={() => setConditionPickerOpen(false)}>
                <Text className="text-muted">Cancel</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const active = character.conditions.includes(c)
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => addCondition(c)}
                    disabled={active}
                    className={`px-3 py-2 rounded-full border ${active ? 'border-overlay bg-overlay opacity-40' : 'border-red bg-red/20'}`}
                  >
                    <Text className={`text-sm ${active ? 'text-muted' : 'text-red'}`}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 4: Run full test suite**

```bash
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: 59 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/(app)/characters/[id]/index.tsx
git commit -m "fix: show custom species/background names and add condition picker in overview"
```

---

### Task 3: Fix Skills tab — custom background skill proficiencies

The skills tab reads `character.background?.skill_proficiencies` — null for custom backgrounds. Custom backgrounds store `skill_proficiencies: string[]` inside `properties` JSONB in `user_content`.

**Files:**
- Modify: `app/(app)/characters/[id]/skills.tsx`

The proficiency check also uses `.includes(skill.name.toLowerCase().replace(/ /g, '-'))` — but background `skill_proficiencies` stores plain lowercase names like `"perception"`, `"stealth"`, not kebab-case. The replace is already a no-op for single-word skills and wrong for multi-word ones. Fix both.

- [ ] **Step 1: Baseline TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors

- [ ] **Step 2: Fix skills.tsx**

Full replacement of `app/(app)/characters/[id]/skills.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { CharacterWithRelations, AbilityKey } from '@/modules/character/character.types'

type Skill = { name: string; ability: AbilityKey; profKey: string }

// profKey is the lowercase identifier stored in background.skill_proficiencies
const SKILLS: Skill[] = [
  { name: 'Acrobatics',      ability: 'dexterity',     profKey: 'acrobatics' },
  { name: 'Animal Handling', ability: 'wisdom',        profKey: 'animal handling' },
  { name: 'Arcana',          ability: 'intelligence',  profKey: 'arcana' },
  { name: 'Athletics',       ability: 'strength',      profKey: 'athletics' },
  { name: 'Deception',       ability: 'charisma',      profKey: 'deception' },
  { name: 'History',         ability: 'intelligence',  profKey: 'history' },
  { name: 'Insight',         ability: 'wisdom',        profKey: 'insight' },
  { name: 'Intimidation',    ability: 'charisma',      profKey: 'intimidation' },
  { name: 'Investigation',   ability: 'intelligence',  profKey: 'investigation' },
  { name: 'Medicine',        ability: 'wisdom',        profKey: 'medicine' },
  { name: 'Nature',          ability: 'intelligence',  profKey: 'nature' },
  { name: 'Perception',      ability: 'wisdom',        profKey: 'perception' },
  { name: 'Performance',     ability: 'charisma',      profKey: 'performance' },
  { name: 'Persuasion',      ability: 'charisma',      profKey: 'persuasion' },
  { name: 'Religion',        ability: 'intelligence',  profKey: 'religion' },
  { name: 'Sleight of Hand', ability: 'dexterity',     profKey: 'sleight of hand' },
  { name: 'Stealth',         ability: 'dexterity',     profKey: 'stealth' },
  { name: 'Survival',        ability: 'wisdom',        profKey: 'survival' },
]

export default function SkillsTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)

  // SRD backgrounds store skill_proficiencies as string[]; custom backgrounds store them in properties JSONB
  const bgSkills: string[] = character.background?.skill_proficiencies
    ?? (character.custom_background?.properties as { skill_proficiencies?: string[] } | null)?.skill_proficiencies
    ?? []
  const bgSkillsLower = bgSkills.map((s) => s.toLowerCase())

  const wisdomMod = getAbilityModifier(character.wisdom)
  const perceptionProficient = bgSkillsLower.includes('perception')
  const passivePerception = 10 + wisdomMod + (perceptionProficient ? profBonus : 0)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center">
        <Text className="text-text font-medium">Passive Perception</Text>
        <Text className="text-primary font-bold text-lg">{passivePerception}</Text>
      </View>

      {SKILLS.map((skill) => {
        const abilityMod = getAbilityModifier(character[skill.ability])
        const isProficient = bgSkillsLower.includes(skill.profKey)
        const total = abilityMod + (isProficient ? profBonus : 0)
        return (
          <View key={skill.name} className="flex-row items-center py-3 border-b border-overlay">
            <View className={`w-3 h-3 rounded-full mr-3 ${isProficient ? 'bg-primary' : 'bg-overlay'}`} />
            <Text className="text-text flex-1">{skill.name}</Text>
            <Text className="text-muted text-xs mr-3">{skill.ability.slice(0, 3).toUpperCase()}</Text>
            <Text className={`font-bold w-8 text-right ${total >= 0 ? 'text-text' : 'text-red'}`}>
              {formatModifier(total)}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 4: Run full test suite**

```bash
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: 59 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/(app)/characters/[id]/skills.tsx
git commit -m "fix: resolve custom background skill proficiencies in skills tab"
```

---

### Task 4: Fix Inventory tab — custom equipment names

`character_equipment` rows can have either `equipment_id` (SRD item) or `custom_content_id` (custom item). The current code falls back to `'Custom Item'` instead of the actual custom item name.

**Files:**
- Modify: `app/(app)/characters/[id]/inventory.tsx`

- [ ] **Step 1: Baseline TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors

- [ ] **Step 2: Fix inventory.tsx**

Full replacement of `app/(app)/characters/[id]/inventory.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { supabase } from '@/lib/supabase'
import { CharacterWithRelations } from '@/modules/character/character.types'

type EquipmentRow = CharacterWithRelations['character_equipment'][number]

export default function InventoryTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setItems((data as CharacterWithRelations).character_equipment))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  async function toggleEquipped(item: EquipmentRow) {
    const { error } = await supabase
      .from('character_equipment')
      .update({ is_equipped: !item.is_equipped })
      .eq('id', item.id)
    if (error) { Alert.alert('Error', error.message); return }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_equipped: !i.is_equipped } : i))
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const equipped   = items.filter((i) => i.is_equipped)
  const unequipped = items.filter((i) => !i.is_equipped)

  function renderItem(item: EquipmentRow) {
    const itemName = item.equipment?.name ?? item.custom_equipment?.name ?? 'Unknown Item'
    const isCustom = !!item.custom_content_id
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => toggleEquipped(item)}
        className={`rounded-xl p-3 mb-2 flex-row justify-between items-center ${item.is_equipped ? 'bg-surface border border-primary' : 'bg-surface border border-transparent'}`}
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={`font-medium ${item.is_equipped ? 'text-primary' : 'text-text'}`}>
              {itemName}
            </Text>
            {isCustom && (
              <View className="bg-overlay px-2 py-0.5 rounded-full">
                <Text className="text-muted text-xs">Custom</Text>
              </View>
            )}
          </View>
          <Text className="text-muted text-xs mt-0.5">
            {item.equipment?.category ?? 'Custom'} · qty: {item.quantity}
          </Text>
        </View>
        <View className={`w-5 h-5 rounded-full border-2 ${item.is_equipped ? 'bg-primary border-primary' : 'border-overlay'}`} />
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {items.length === 0 ? (
        <Text className="text-muted text-center mt-8">No equipment yet.</Text>
      ) : (
        <>
          {equipped.length > 0 && (
            <>
              <Text className="text-muted text-xs font-bold mb-2">EQUIPPED</Text>
              {equipped.map(renderItem)}
            </>
          )}
          {unequipped.length > 0 && (
            <>
              <Text className="text-muted text-xs font-bold mt-4 mb-2">IN PACK</Text>
              {unequipped.map(renderItem)}
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 4: Run full test suite**

```bash
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: 59 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/(app)/characters/[id]/inventory.tsx
git commit -m "fix: show custom equipment names in inventory tab"
```
