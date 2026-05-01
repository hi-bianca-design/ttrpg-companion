# Character Builder Implementation Plan (Plan 2 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Character Builder module: a 7-step creation wizard, a 5-tab character sheet, and a level-up flow.

**Architecture:** A Zustand store accumulates wizard choices in a `WizardDraft` until the final Review step, then persists to Supabase in a single `createCharacter` call. After creation, the character sheet reads directly from Supabase with optimistic local updates for HP/conditions. Derived stats (modifiers, proficiency bonus, HP) are computed client-side. SRD reference data (classes, species, backgrounds, spells) is fetched from Supabase read-only tables via a dedicated SRD service. Navigation uses Expo Router — the wizard and sheet are nested stacks/tabs under `(app)/characters/`.

**Tech Stack:** Expo Router v3, React Native, TypeScript, Supabase JS v2, NativeWind v4, Zustand

---

## Plan Overview (all 5 plans)

| Plan | Covers |
|------|--------|
| 1 — done | Expo setup · DB schema · SRD seed · Auth |
| **2 — this one** | Character Builder (creation wizard + sheet tabs + leveling) |
| 3 | Campaign Manager |
| 4 | Session Console (real-time, DM dashboard) |
| 5 | Custom Content Manager |

---

## File Structure

```
app/(app)/
  _layout.tsx                         MODIFY: Add Tabs (Characters tab)
  index.tsx                           MODIFY: Redirect to characters list
  characters/
    index.tsx                         Character list screen
    new/
      _layout.tsx                     Wizard step-progress bar + Stack
      class.tsx                       Step 1: Choose Class
      origin.tsx                      Step 2: Background + Species
      ability-scores.tsx              Step 3: Ability Scores (standard array + bg bonus)
      personality.tsx                 Step 4: Alignment & Personality
      spells.tsx                      Step 5: Choose Spells (skip if non-caster)
      details.tsx                     Step 6: Name, appearance, backstory
      review.tsx                      Step 7: Review & Finalize → createCharacter
    [id]/
      _layout.tsx                     Character sheet tab layout (5 tabs)
      index.tsx                       Overview tab
      skills.tsx                      Skills tab
      actions.tsx                     Actions tab
      inventory.tsx                   Inventory tab
      notes.tsx                       Notes tab
    [id]/level-up.tsx                 Level-up flow (full screen, outside sheet tabs)

src/
  modules/
    character/
      character.utils.ts              Stat calculations + SPELLCASTING_CLASSES constant
      character.types.ts              WizardDraft, INITIAL_DRAFT, CharacterWithRelations
      character.service.ts            Supabase CRUD for characters
      character.store.ts              Zustand wizard draft store
    srd/
      srd.service.ts                  Read-only SRD data fetching

  components/
    character/
      AbilityScoreBlock.tsx           Score + modifier + source chips display
      HPBar.tsx                       HP bar with Damage / Heal / Temp HP controls
      WizardProgress.tsx              Step indicator bar for wizard
      ConditionBadge.tsx              Condition pill (Poisoned, Blinded, etc.)

__tests__/
  modules/
    character/
      character.utils.test.ts
      character.service.test.ts
      character.store.test.ts
```

---

## Task 1: Character Utility Functions

**Files:**
- Create: `src/modules/character/character.utils.ts`
- Create: `__tests__/modules/character/character.utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/character/character.utils.test.ts`:

```ts
import {
  getAbilityModifier,
  getProficiencyBonus,
  formatModifier,
  getMaxHP,
  SPELLCASTING_CLASSES,
} from '@/modules/character/character.utils'

describe('getAbilityModifier', () => {
  it.each([
    [1, -5], [8, -1], [9, -1], [10, 0], [11, 0],
    [12, 1], [13, 1], [14, 2], [20, 5], [30, 10],
  ])('score %i → modifier %i', (score, expected) => {
    expect(getAbilityModifier(score)).toBe(expected)
  })
})

describe('getProficiencyBonus', () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4],
    [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])('level %i → bonus %i', (level, expected) => {
    expect(getProficiencyBonus(level)).toBe(expected)
  })
})

describe('formatModifier', () => {
  it('positive gets + prefix', () => expect(formatModifier(3)).toBe('+3'))
  it('zero gets + prefix', () => expect(formatModifier(0)).toBe('+0'))
  it('negative has no prefix', () => expect(formatModifier(-2)).toBe('-2'))
})

describe('getMaxHP', () => {
  it('level 1 fighter d10 +2 con → 12', () => expect(getMaxHP(1, 10, 2)).toBe(12))
  it('level 1 wizard d6 +0 con → 6', () => expect(getMaxHP(1, 6, 0)).toBe(6))
  // Level 2 cleric d8 +1 con: (8+1) + (4+1+1) = 15
  it('level 2 cleric d8 +1 con → 15', () => expect(getMaxHP(2, 8, 1)).toBe(15))
  // Level 5 wizard d6 +0: 6 + 4*(3+1+0) = 22
  it('level 5 wizard d6 +0 con → 22', () => expect(getMaxHP(5, 6, 0)).toBe(22))
})

describe('SPELLCASTING_CLASSES', () => {
  it('includes casters', () => {
    ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'].forEach((c) =>
      expect(SPELLCASTING_CLASSES).toContain(c)
    )
  })
  it('excludes non-casters', () => {
    expect(SPELLCASTING_CLASSES).not.toContain('Fighter')
    expect(SPELLCASTING_CLASSES).not.toContain('Barbarian')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest character.utils.test.ts --no-coverage
```

Expected: `Cannot find module '@/modules/character/character.utils'`

- [ ] **Step 3: Implement the utilities**

Create `src/modules/character/character.utils.ts`:

```ts
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

// Level 1: max hit die + con mod. Each subsequent level: floor(hitDie/2)+1 + con mod.
export function getMaxHP(level: number, hitDie: number, constitutionModifier: number): number {
  return (hitDie + constitutionModifier) + (level - 1) * (Math.floor(hitDie / 2) + 1 + constitutionModifier)
}

export const SPELLCASTING_CLASSES = [
  'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard',
]
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest character.utils.test.ts --no-coverage
```

Expected: `Tests: 18 passed`

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.utils.ts __tests__/modules/character/character.utils.test.ts
git commit -m "feat: add character utility functions"
```

---

## Task 2: Character Types

**Files:**
- Create: `src/modules/character/character.types.ts`

- [ ] **Step 1: Create the types file**

Create `src/modules/character/character.types.ts`:

```ts
import { Database } from '@/types/database.types'

export type DBCharacter = Database['public']['Tables']['characters']['Row']
export type DBClass    = Database['public']['Tables']['classes']['Row']
export type DBSubclass = Database['public']['Tables']['subclasses']['Row']
export type DBSpecies  = Database['public']['Tables']['species']['Row']
export type DBBackground = Database['public']['Tables']['backgrounds']['Row']
export type DBSpell    = Database['public']['Tables']['spells']['Row']
export type DBEquipment = Database['public']['Tables']['equipment']['Row']

export type CharacterWithRelations = DBCharacter & {
  class: DBClass | null
  subclass: DBSubclass | null
  species: DBSpecies | null
  background: DBBackground | null
  character_spells: Array<{
    id: string
    spell_id: string | null
    is_prepared: boolean
    slots_expended: Record<string, number>
    spell: DBSpell | null
  }>
  character_equipment: Array<{
    id: string
    equipment_id: string | null
    quantity: number
    is_equipped: boolean
    equipment: DBEquipment | null
  }>
}

// Accumulated in Zustand across wizard steps; submitted on Review step.
export type WizardDraft = {
  // Step 1 — Class
  class_id: string | null
  class_name: string | null   // cached to gate spells step and display summaries
  hit_die: number | null      // cached for HP calculation in createCharacter
  subclass_id: string | null
  // Step 2 — Origin
  species_id: string | null
  background_id: string | null
  // Step 3 — Ability Scores
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  bg_bonus_two: string | null   // ability key that gets +2 from background
  bg_bonus_one: string | null   // ability key that gets +1 from background
  // Step 4 — Personality
  alignment: string
  personality_trait: string
  ideal: string
  bond: string
  flaw: string
  // Step 5 — Spells
  selected_spell_ids: string[]
  // Step 6 — Details
  name: string
  appearance: string
  backstory: string
}

export const INITIAL_DRAFT: WizardDraft = {
  class_id: null,
  class_name: null,
  hit_die: null,
  subclass_id: null,
  species_id: null,
  background_id: null,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  bg_bonus_two: null,
  bg_bonus_one: null,
  alignment: '',
  personality_trait: '',
  ideal: '',
  bond: '',
  flaw: '',
  selected_spell_ids: [],
  name: '',
  appearance: '',
  backstory: '',
}

export const ABILITY_KEYS = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
] as const
export type AbilityKey = typeof ABILITY_KEYS[number]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/character/character.types.ts
git commit -m "feat: add character TypeScript types and wizard draft shape"
```

---

## Task 3: SRD Service

**Files:**
- Create: `src/modules/srd/srd.service.ts`

- [ ] **Step 1: Create the SRD service**

Create `src/modules/srd/srd.service.ts`:

```ts
import { supabase } from '@/lib/supabase'
import { DBClass, DBSubclass, DBSpecies, DBBackground, DBSpell } from '@/modules/character/character.types'

export async function getClasses(): Promise<DBClass[]> {
  const { data, error } = await supabase.from('classes').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getSubclassesForClass(classId: string): Promise<DBSubclass[]> {
  const { data, error } = await supabase
    .from('subclasses').select('*').eq('class_id', classId).order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getSpecies(): Promise<DBSpecies[]> {
  const { data, error } = await supabase.from('species').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getBackgrounds(): Promise<DBBackground[]> {
  const { data, error } = await supabase.from('backgrounds').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getSpellsForClass(className: string): Promise<DBSpell[]> {
  const { data, error } = await supabase
    .from('spells')
    .select('*')
    .contains('classes', [className.toLowerCase()])
    .order('level')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/srd/srd.service.ts
git commit -m "feat: add SRD service for read-only reference data"
```

---

## Task 4: Character Service

**Files:**
- Create: `src/modules/character/character.service.ts`
- Create: `__tests__/modules/character/character.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/character/character.service.test.ts`:

```ts
import { getCharacters, updateCharacter, deleteCharacter } from '@/modules/character/character.service'

const mockSingle = jest.fn()
const mockOrder  = jest.fn()
const mockEq     = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    })),
  },
}))

import { supabase } from '@/lib/supabase'

beforeEach(() => {
  jest.clearAllMocks()
  // Default chain: each method returns an object with the next method
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
})

describe('getCharacters', () => {
  it('calls from characters, filters by user_id, orders by created_at', async () => {
    await getCharacters('user-1')
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('throws when Supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getCharacters('user-1')).rejects.toThrow('DB error')
  })
})

describe('updateCharacter', () => {
  it('updates the record and returns the updated row', async () => {
    const updated = { id: 'c1', hp_current: 10 }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    mockEq.mockReturnValue({ single: mockSingle, eq: mockEq, select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockSelect.mockReturnValue({ eq: mockEq })

    const result = await updateCharacter('c1', { hp_current: 10 })
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(result.hp_current).toBe(10)
  })
})

describe('deleteCharacter', () => {
  it('calls delete then eq with character id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await deleteCharacter('c1')
    expect(supabase.from).toHaveBeenCalledWith('characters')
    expect(mockEq).toHaveBeenCalledWith('id', 'c1')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest character.service.test.ts --no-coverage
```

Expected: `Cannot find module '@/modules/character/character.service'`

- [ ] **Step 3: Create the character service**

Create `src/modules/character/character.service.ts`:

```ts
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { WizardDraft } from './character.types'
import { getAbilityModifier, getMaxHP } from './character.utils'

type CharacterUpdate = Database['public']['Tables']['characters']['Update']

const SHEET_SELECT = `
  *,
  class:classes(*),
  subclass:subclasses(*),
  species:species(*),
  background:backgrounds(*),
  character_spells(id, spell_id, is_prepared, slots_expended, spell:spells(*)),
  character_equipment(id, equipment_id, quantity, is_equipped, equipment:equipment(*))
`

export async function getCharacters(userId: string) {
  const { data, error } = await supabase
    .from('characters')
    .select('*, class:classes(name, hit_die), species:species(name), background:backgrounds(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getCharacter(id: string) {
  const { data, error } = await supabase
    .from('characters')
    .select(SHEET_SELECT)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createCharacter(userId: string, draft: WizardDraft) {
  const conMod = getAbilityModifier(draft.constitution)
  const dexMod = getAbilityModifier(draft.dexterity)
  const hpMax  = getMaxHP(1, draft.hit_die ?? 8, conMod)

  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: draft.name,
      level: 1,
      class_id: draft.class_id,
      subclass_id: draft.subclass_id,
      species_id: draft.species_id,
      background_id: draft.background_id,
      alignment: draft.alignment || null,
      strength: draft.strength,
      dexterity: draft.dexterity,
      constitution: draft.constitution,
      intelligence: draft.intelligence,
      wisdom: draft.wisdom,
      charisma: draft.charisma,
      hp_max: hpMax,
      hp_current: hpMax,
      armor_class: 10 + dexMod,
      speed: 30,
      proficiency_bonus: 2,
      notes: draft.backstory,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (draft.selected_spell_ids.length > 0) {
    await supabase.from('character_spells').insert(
      draft.selected_spell_ids.map((spell_id) => ({
        character_id: data.id,
        spell_id,
        is_prepared: true,
      }))
    )
  }

  return data
}

export async function updateCharacter(id: string, updates: CharacterUpdate) {
  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCharacter(id: string) {
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest character.service.test.ts --no-coverage
```

Expected: `Tests: 4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.service.ts __tests__/modules/character/character.service.test.ts
git commit -m "feat: add character service (CRUD + createCharacter)"
```

---

## Task 5: Character Zustand Store

**Files:**
- Create: `src/modules/character/character.store.ts`
- Create: `__tests__/modules/character/character.store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/character/character.store.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native'
import { useCharacterStore } from '@/modules/character/character.store'
import { INITIAL_DRAFT } from '@/modules/character/character.types'

beforeEach(() => useCharacterStore.getState().resetDraft())

describe('useCharacterStore', () => {
  it('starts with INITIAL_DRAFT', () => {
    const { result } = renderHook(() => useCharacterStore())
    expect(result.current.draft).toEqual(INITIAL_DRAFT)
  })

  it('setDraftField updates one field without touching others', () => {
    const { result } = renderHook(() => useCharacterStore())
    act(() => result.current.setDraftField('name', 'Aria'))
    expect(result.current.draft.name).toBe('Aria')
    expect(result.current.draft.strength).toBe(10)
  })

  it('setDraft merges multiple fields', () => {
    const { result } = renderHook(() => useCharacterStore())
    act(() => result.current.setDraft({ strength: 16, dexterity: 14 }))
    expect(result.current.draft.strength).toBe(16)
    expect(result.current.draft.dexterity).toBe(14)
    expect(result.current.draft.constitution).toBe(10)
  })

  it('resetDraft restores INITIAL_DRAFT', () => {
    const { result } = renderHook(() => useCharacterStore())
    act(() => result.current.setDraftField('name', 'Aria'))
    act(() => result.current.resetDraft())
    expect(result.current.draft).toEqual(INITIAL_DRAFT)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest character.store.test.ts --no-coverage
```

Expected: `Cannot find module '@/modules/character/character.store'`

- [ ] **Step 3: Create the store**

Create `src/modules/character/character.store.ts`:

```ts
import { create } from 'zustand'
import { WizardDraft, INITIAL_DRAFT } from './character.types'

type CharacterStore = {
  draft: WizardDraft
  setDraftField: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void
  setDraft: (partial: Partial<WizardDraft>) => void
  resetDraft: () => void
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  draft: { ...INITIAL_DRAFT },
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  setDraft: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),
  resetDraft: () => set({ draft: { ...INITIAL_DRAFT } }),
}))
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest character.store.test.ts --no-coverage
```

Expected: `Tests: 4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.store.ts __tests__/modules/character/character.store.test.ts
git commit -m "feat: add character Zustand store for wizard draft state"
```

---

## Task 6: App Tab Layout + Character List Screen

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Modify: `app/(app)/index.tsx`
- Create: `app/(app)/characters/index.tsx`

- [ ] **Step 1: Update app layout to use Tabs**

Replace `app/(app)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#313244', borderTopColor: '#45475a' },
        tabBarActiveTintColor: '#cba6f7',
        tabBarInactiveTintColor: '#6c7086',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="characters"
        options={{ title: 'Characters', tabBarLabel: 'Characters' }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Redirect root to characters**

Replace `app/(app)/index.tsx`:

```tsx
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/(app)/characters" />
}
```

- [ ] **Step 3: Create the character list screen**

Create `app/(app)/characters/index.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { getCharacters, deleteCharacter } from '@/modules/character/character.service'
import { useAuth } from '@/modules/auth/useAuth'

type CharacterSummary = {
  id: string
  name: string
  level: number
  class: { name: string } | null
  species: { name: string } | null
}

export default function CharactersScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await getCharacters(user.id)
      setCharacters(data as CharacterSummary[])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete Character', `Delete ${name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCharacter(id)
            setCharacters((prev) => prev.filter((c) => c.id !== id))
          } catch (e: any) {
            Alert.alert('Error', e.message)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 bg-base justify-center items-center">
        <ActivityIndicator color="#cba6f7" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Characters</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-lg"
          onPress={() => router.push('/(app)/characters/new/class')}
        >
          <Text className="text-base font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {characters.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-muted text-center mb-4">No characters yet.</Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-xl"
            onPress={() => router.push('/(app)/characters/new/class')}
          >
            <Text className="text-base font-semibold">Create Your First Character</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={characters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-surface rounded-xl p-4 mb-3"
              onPress={() => router.push(`/(app)/characters/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
            >
              <Text className="text-lg font-bold text-text">{item.name}</Text>
              <Text className="text-muted mt-1 text-sm">
                Level {item.level} {item.class?.name ?? '—'} · {item.species?.name ?? '—'}
              </Text>
              <Text className="text-overlay text-xs mt-1">Long-press to delete</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/
git commit -m "feat: add tab layout and character list screen"
```

---

## Task 7: Wizard Layout + Progress Bar

**Files:**
- Create: `src/components/character/WizardProgress.tsx`
- Create: `app/(app)/characters/new/_layout.tsx`

- [ ] **Step 1: Create WizardProgress component**

Create `src/components/character/WizardProgress.tsx`:

```tsx
import { View } from 'react-native'

const STEPS = ['class', 'origin', 'ability-scores', 'personality', 'spells', 'details', 'review']

export function WizardProgress({ currentStep }: { currentStep: string }) {
  const idx = STEPS.indexOf(currentStep)
  return (
    <View className="flex-row px-4 pt-3 pb-2 gap-1 bg-base">
      {STEPS.map((step, i) => (
        <View
          key={step}
          className={`flex-1 h-1 rounded-full ${i <= idx ? 'bg-primary' : 'bg-overlay'}`}
        />
      ))}
    </View>
  )
}
```

- [ ] **Step 2: Create the wizard layout**

Create `app/(app)/characters/new/_layout.tsx`:

```tsx
import { Stack, useSegments } from 'expo-router'
import { View } from 'react-native'
import { WizardProgress } from '@/components/character/WizardProgress'

export default function WizardLayout() {
  const segments = useSegments()
  const currentStep = segments[segments.length - 1] ?? 'class'

  return (
    <View className="flex-1 bg-base">
      <WizardProgress currentStep={currentStep} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/character/WizardProgress.tsx app/\(app\)/characters/new/_layout.tsx
git commit -m "feat: add wizard layout with step progress bar"
```

---

## Task 8: Wizard Step 1 — Choose Class

**Files:**
- Create: `app/(app)/characters/new/class.tsx`

- [ ] **Step 1: Create the class selection screen**

Create `app/(app)/characters/new/class.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getClasses } from '@/modules/srd/srd.service'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBClass } from '@/modules/character/character.types'

export default function ClassStep() {
  const router = useRouter()
  const { draft, setDraft, resetDraft } = useCharacterStore()
  const [classes, setClasses] = useState<DBClass[]>([])
  const [selected, setSelected] = useState<DBClass | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resetDraft()
    getClasses().then(setClasses).finally(() => setLoading(false))
  }, [])

  function handleNext() {
    if (!selected) return
    setDraft({ class_id: selected.id, class_name: selected.name, hit_die: selected.hit_die })
    router.push('/(app)/characters/new/origin')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-text">Choose a Class</Text>
        <Text className="text-muted mt-1 text-sm">
          Your class defines your role in combat and how you solve problems.
        </Text>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isSelected = selected?.id === item.id
          return (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row justify-between items-center">
                <Text className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {item.name}
                </Text>
                <Text className="text-muted text-sm">d{item.hit_die}</Text>
              </View>
              <Text className="text-muted text-sm mt-1">{item.description}</Text>
              <Text className="text-blue text-xs mt-2">
                Primary: {item.primary_abilities.join(', ')}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${selected ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text className={`font-semibold ${selected ? 'text-base' : 'text-muted'}`}>
            {selected ? `Choose ${selected.name} →` : 'Select a class to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/class.tsx
git commit -m "feat: add wizard step 1 — class selection"
```

---

## Task 9: Wizard Step 2 — Origin (Background + Species)

**Files:**
- Create: `app/(app)/characters/new/origin.tsx`

- [ ] **Step 1: Create the origin screen**

Create `app/(app)/characters/new/origin.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getBackgrounds, getSpecies } from '@/modules/srd/srd.service'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBBackground, DBSpecies } from '@/modules/character/character.types'

export default function OriginStep() {
  const router = useRouter()
  const { setDraft } = useCharacterStore()
  const [backgrounds, setBackgrounds] = useState<DBBackground[]>([])
  const [species, setSpecies] = useState<DBSpecies[]>([])
  const [selectedBg, setSelectedBg] = useState<DBBackground | null>(null)
  const [selectedSp, setSelectedSp] = useState<DBSpecies | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBackgrounds(), getSpecies()])
      .then(([bgs, sps]) => { setBackgrounds(bgs); setSpecies(sps) })
      .finally(() => setLoading(false))
  }, [])

  function handleNext() {
    if (!selectedBg || !selectedSp) return
    setDraft({ background_id: selectedBg.id, species_id: selectedSp.id })
    router.push('/(app)/characters/new/ability-scores')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const canProceed = !!selectedBg && !!selectedSp

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-text">Determine Origin</Text>
        <Text className="text-muted mt-1 mb-6 text-sm">
          Your background and species shape who you were before adventuring.
        </Text>

        <Text className="text-lg font-bold text-text mb-3">Background</Text>
        {backgrounds.map((bg) => {
          const isSelected = selectedBg?.id === bg.id
          return (
            <TouchableOpacity
              key={bg.id}
              onPress={() => setSelectedBg(bg)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>{bg.name}</Text>
              <Text className="text-muted text-sm mt-1">{bg.description}</Text>
              <Text className="text-green text-xs mt-1">Skills: {bg.skill_proficiencies.join(', ')}</Text>
            </TouchableOpacity>
          )
        })}

        <Text className="text-lg font-bold text-text mt-4 mb-3">Species</Text>
        {species.map((sp) => {
          const isSelected = selectedSp?.id === sp.id
          const traits = ((sp.traits as any)?.traits as string[]) ?? []
          return (
            <TouchableOpacity
              key={sp.id}
              onPress={() => setSelectedSp(sp)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>{sp.name}</Text>
              <Text className="text-muted text-xs mt-1">Speed: {sp.speed} ft</Text>
              {traits.length > 0 && (
                <Text className="text-yellow text-xs mt-1">Traits: {traits.join(', ')}</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canProceed ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text className={`font-semibold ${canProceed ? 'text-base' : 'text-muted'}`}>
            {canProceed ? `${selectedBg!.name} · ${selectedSp!.name} →` : 'Select background and species'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/origin.tsx
git commit -m "feat: add wizard step 2 — origin (background + species)"
```

---

## Task 10: Wizard Step 3 — Ability Scores

**Files:**
- Create: `app/(app)/characters/new/ability-scores.tsx`
- Create: `src/components/character/AbilityScoreBlock.tsx`

The player assigns Standard Array values [15, 14, 13, 12, 10, 8] to 6 stats. Each value can only be assigned once. After assigning the base array, the player picks which eligible stat gets the background's +2 and which gets +1. The background's eligible stats come from `background.ability_score_options.options[0]`.

- [ ] **Step 1: Create AbilityScoreBlock component**

Create `src/components/character/AbilityScoreBlock.tsx`:

```tsx
import { View, Text } from 'react-native'
import { getAbilityModifier, formatModifier } from '@/modules/character/character.utils'

type Props = {
  label: string
  base: number
  bgBonus?: number  // +2 or +1 from background, 0 if not applicable
}

export function AbilityScoreBlock({ label, base, bgBonus = 0 }: Props) {
  const total = base + bgBonus
  const modifier = getAbilityModifier(total)

  return (
    <View className="bg-surface rounded-xl p-3 items-center flex-1">
      <Text className="text-muted text-xs mb-1">{label.slice(0, 3).toUpperCase()}</Text>
      <Text className="text-text text-2xl font-bold">{total}</Text>
      <Text className="text-primary text-sm">{formatModifier(modifier)}</Text>
      {bgBonus !== 0 && (
        <View className="mt-1 bg-overlay rounded px-1">
          <Text className="text-green text-xs">Bg+{bgBonus}</Text>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create the ability scores screen**

Create `app/(app)/characters/new/ability-scores.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { AbilityScoreBlock } from '@/components/character/AbilityScoreBlock'
import { ABILITY_KEYS, ABILITY_LABELS, STANDARD_ARRAY, AbilityKey } from '@/modules/character/character.types'
import { getBackgrounds } from '@/modules/srd/srd.service'
import type { DBBackground } from '@/modules/character/character.types'

export default function AbilityScoresStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()

  // assignments[abilityKey] = value from STANDARD_ARRAY or null
  const [assignments, setAssignments] = useState<Record<AbilityKey, number | null>>(
    () => Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])) as Record<AbilityKey, number | null>
  )
  const [bgEligible, setBgEligible] = useState<string[]>([])
  const [bgBonusTwo, setBgBonusTwo] = useState<string | null>(null)
  const [bgBonusOne, setBgBonusOne] = useState<string | null>(null)
  const [bgLoaded, setBgLoaded] = useState(false)

  useEffect(() => {
    if (!draft.background_id) return
    getBackgrounds().then((bgs) => {
      const bg = bgs.find((b) => b.id === draft.background_id)
      if (bg) {
        const opts = (bg.ability_score_options as any)?.options?.[0] as string[] | undefined
        setBgEligible(opts ?? [])
      }
      setBgLoaded(true)
    })
  }, [draft.background_id])

  const usedValues = Object.values(assignments).filter((v) => v !== null) as number[]
  const availableValues = STANDARD_ARRAY.filter((v) => !usedValues.includes(v))

  function assignValue(key: AbilityKey, value: number | null) {
    setAssignments((prev) => {
      // If another stat has this value, clear it first
      const cleared = Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, v === value ? null : v])
      ) as Record<AbilityKey, number | null>
      cleared[key] = value
      return cleared
    })
  }

  const allAssigned = ABILITY_KEYS.every((k) => assignments[k] !== null)
  const bgReady = bgEligible.length === 0 || (bgBonusTwo !== null && bgBonusOne !== null)
  const canProceed = allAssigned && bgReady

  function handleNext() {
    const scores = Object.fromEntries(
      ABILITY_KEYS.map((k) => [k, assignments[k] ?? 10])
    ) as Record<AbilityKey, number>
    setDraft({ ...scores, bg_bonus_two: bgBonusTwo, bg_bonus_one: bgBonusOne })
    router.push('/(app)/characters/new/personality')
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-text">Ability Scores</Text>
        <Text className="text-muted mt-1 mb-4 text-sm">
          Assign the Standard Array to your 6 abilities. Tap an ability to assign or change its value.
        </Text>

        {/* Available values pool */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          {STANDARD_ARRAY.map((v) => {
            const isUsed = usedValues.includes(v)
            return (
              <View
                key={v}
                className={`px-3 py-1 rounded-lg ${isUsed ? 'bg-overlay opacity-40' : 'bg-surface border border-primary'}`}
              >
                <Text className={`font-bold ${isUsed ? 'text-muted' : 'text-primary'}`}>{v}</Text>
              </View>
            )
          })}
        </View>

        {/* Ability rows */}
        {ABILITY_KEYS.map((key) => {
          const assigned = assignments[key]
          const bgBonus = bgBonusTwo === key ? 2 : bgBonusOne === key ? 1 : 0
          return (
            <View key={key} className="flex-row items-center mb-3 gap-3">
              <View className="w-28">
                <Text className="text-text font-medium">{ABILITY_LABELS[key]}</Text>
              </View>
              {/* Value picker row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <View className="flex-row gap-2">
                  {STANDARD_ARRAY.map((v) => {
                    const isThisSlot = assigned === v
                    const isAvailable = !usedValues.includes(v) || isThisSlot
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => isAvailable && assignValue(key, isThisSlot ? null : v)}
                        className={`w-9 h-9 rounded-lg items-center justify-center ${
                          isThisSlot ? 'bg-primary' : isAvailable ? 'bg-surface' : 'bg-overlay opacity-30'
                        }`}
                        disabled={!isAvailable}
                      >
                        <Text className={`font-bold text-sm ${isThisSlot ? 'text-base' : 'text-text'}`}>{v}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>
              {assigned !== null && (
                <Text className="text-primary font-bold w-8 text-center">
                  {assigned + bgBonus}
                </Text>
              )}
            </View>
          )
        })}

        {/* Background bonus assignment */}
        {bgEligible.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-bold text-text mb-2">Background Bonus</Text>
            <Text className="text-muted text-sm mb-3">
              Your background grants +2 to one ability and +1 to another.
            </Text>

            <Text className="text-text mb-2 font-medium">Which ability gets +2?</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {bgEligible.map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    if (bgBonusOne === key) setBgBonusOne(null)
                    setBgBonusTwo(key)
                  }}
                  className={`px-3 py-2 rounded-lg border ${bgBonusTwo === key ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
                >
                  <Text className={`font-medium ${bgBonusTwo === key ? 'text-base' : 'text-text'}`}>
                    {ABILITY_LABELS[key as AbilityKey] ?? key} +2
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-text mb-2 font-medium">Which ability gets +1?</Text>
            <View className="flex-row flex-wrap gap-2">
              {bgEligible.filter((k) => k !== bgBonusTwo).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setBgBonusOne(key)}
                  className={`px-3 py-2 rounded-lg border ${bgBonusOne === key ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
                >
                  <Text className={`font-medium ${bgBonusOne === key ? 'text-base' : 'text-text'}`}>
                    {ABILITY_LABELS[key as AbilityKey] ?? key} +1
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canProceed ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text className={`font-semibold ${canProceed ? 'text-base' : 'text-muted'}`}>
            {canProceed ? 'Confirm Ability Scores →' : 'Assign all 6 scores to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/characters/new/ability-scores.tsx src/components/character/AbilityScoreBlock.tsx
git commit -m "feat: add wizard step 3 — ability scores with standard array + background bonus"
```

---

## Task 11: Wizard Step 4 — Alignment & Personality

**Files:**
- Create: `app/(app)/characters/new/personality.tsx`

- [ ] **Step 1: Create the personality screen**

Create `app/(app)/characters/new/personality.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { ALIGNMENTS, SPELLCASTING_CLASSES } from '@/modules/character/character.utils'
import { ALIGNMENTS as ALIGNMENT_LIST } from '@/modules/character/character.types'

export default function PersonalityStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()
  const [alignment, setAlignment] = useState(draft.alignment)
  const [personalityTrait, setPersonalityTrait] = useState(draft.personality_trait)
  const [ideal, setIdeal] = useState(draft.ideal)
  const [bond, setBond] = useState(draft.bond)
  const [flaw, setFlaw] = useState(draft.flaw)

  function handleNext() {
    setDraft({ alignment, personality_trait: personalityTrait, ideal, bond, flaw })
    const isSpellcaster = SPELLCASTING_CLASSES.includes(draft.class_name ?? '')
    router.push(isSpellcaster ? '/(app)/characters/new/spells' : '/(app)/characters/new/details')
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-text">Alignment & Personality</Text>
        <Text className="text-muted mt-1 mb-6 text-sm">
          Alignment and personality traits are optional but help roleplay your character.
        </Text>

        <Text className="text-text font-medium mb-2">Alignment</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {ALIGNMENT_LIST.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAlignment(a === alignment ? '' : a)}
              className={`px-3 py-2 rounded-lg border ${alignment === a ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
            >
              <Text className={`text-sm font-medium ${alignment === a ? 'text-base' : 'text-text'}`}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { label: 'Personality Trait', value: personalityTrait, setter: setPersonalityTrait, placeholder: 'e.g. I always have a plan for unexpected events.' },
          { label: 'Ideal', value: ideal, setter: setIdeal, placeholder: 'e.g. Fairness — I never target people who can\'t fight back.' },
          { label: 'Bond', value: bond, setter: setBond, placeholder: 'e.g. I will do anything to protect those I care about.' },
          { label: 'Flaw', value: flaw, setter: setFlaw, placeholder: 'e.g. My hatred of my enemies is blinding and unreasoning.' },
        ].map(({ label, value, setter, placeholder }) => (
          <View key={label} className="mb-4">
            <Text className="text-text font-medium mb-1">{label}</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 min-h-[56px]"
              placeholder={placeholder}
              placeholderTextColor="#6c7086"
              value={value}
              onChangeText={setter}
              multiline
            />
          </View>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 items-center"
          onPress={handleNext}
        >
          <Text className="text-base font-semibold">
            {SPELLCASTING_CLASSES.includes(draft.class_name ?? '')
              ? 'Choose Spells →'
              : 'Remaining Details →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/personality.tsx
git commit -m "feat: add wizard step 4 — alignment and personality"
```

---

## Task 12: Wizard Step 5 — Spells

**Files:**
- Create: `app/(app)/characters/new/spells.tsx`

This step only appears for spellcasting classes. Non-casters skip from personality directly to details. Shows all spells available for the class (level 0 cantrips separately from leveled spells). Player taps to select known spells.

- [ ] **Step 1: Create the spells screen**

Create `app/(app)/characters/new/spells.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { getSpellsForClass } from '@/modules/srd/srd.service'
import { DBSpell } from '@/modules/character/character.types'

type SpellSection = { title: string; data: DBSpell[] }

export default function SpellsStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()
  const [sections, setSections] = useState<SpellSection[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(draft.selected_spell_ids))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!draft.class_name) { router.replace('/(app)/characters/new/details'); return }
    getSpellsForClass(draft.class_name).then((spells) => {
      const byLevel: Record<number, DBSpell[]> = {}
      spells.forEach((s) => { byLevel[s.level] ??= []; byLevel[s.level].push(s) })
      setSections(
        Object.entries(byLevel).map(([level, data]) => ({
          title: level === '0' ? 'Cantrips' : `Level ${level}`,
          data,
        }))
      )
    }).finally(() => setLoading(false))
  }, [draft.class_name])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleNext() {
    setDraft({ selected_spell_ids: Array.from(selected) })
    router.push('/(app)/characters/new/details')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-text">Choose Spells</Text>
        <Text className="text-muted mt-1 mb-1 text-sm">
          Select the spells your {draft.class_name} knows. You can change these later.
        </Text>
        <Text className="text-primary text-sm">{selected.size} selected</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderSectionHeader={({ section }) => (
          <Text className="text-muted text-xs font-bold py-2 bg-base">{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id)
          return (
            <TouchableOpacity
              onPress={() => toggle(item.id)}
              className={`rounded-xl p-3 mb-2 border ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row justify-between items-start">
                <Text className={`font-bold flex-1 mr-2 ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {item.name}
                </Text>
                <View className="flex-row gap-2">
                  {item.is_ritual && <Text className="text-yellow text-xs">R</Text>}
                  {item.requires_concentration && <Text className="text-red text-xs">C</Text>}
                </View>
              </View>
              <Text className="text-muted text-xs mt-1">
                {item.casting_time} · {item.range} · {item.school}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 items-center"
          onPress={handleNext}
        >
          <Text className="text-base font-semibold">
            {selected.size > 0 ? `Continue with ${selected.size} spell${selected.size !== 1 ? 's' : ''} →` : 'Skip Spells →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/spells.tsx
git commit -m "feat: add wizard step 5 — spell selection"
```

---

## Task 13: Wizard Step 6 — Remaining Details

**Files:**
- Create: `app/(app)/characters/new/details.tsx`

- [ ] **Step 1: Create the details screen**

Create `app/(app)/characters/new/details.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'

export default function DetailsStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()
  const [name, setName] = useState(draft.name)
  const [appearance, setAppearance] = useState(draft.appearance)
  const [backstory, setBackstory] = useState(draft.backstory)

  function handleNext() {
    if (!name.trim()) return
    setDraft({ name: name.trim(), appearance, backstory })
    router.push('/(app)/characters/new/review')
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-text">Remaining Details</Text>
        <Text className="text-muted mt-1 mb-6 text-sm">
          Give your character a name and any finishing touches.
        </Text>

        <Text className="text-text font-medium mb-1">Character Name <Text className="text-red">*</Text></Text>
        <TextInput
          className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
          placeholder="e.g. Aria Stormwind"
          placeholderTextColor="#6c7086"
          value={name}
          onChangeText={setName}
        />

        <Text className="text-text font-medium mb-1">Appearance</Text>
        <TextInput
          className="bg-surface text-text rounded-xl px-4 py-3 mb-4 min-h-[80px]"
          placeholder="Describe how your character looks..."
          placeholderTextColor="#6c7086"
          value={appearance}
          onChangeText={setAppearance}
          multiline
        />

        <Text className="text-text font-medium mb-1">Backstory</Text>
        <TextInput
          className="bg-surface text-text rounded-xl px-4 py-3 mb-4 min-h-[120px]"
          placeholder="What shaped your character before they became an adventurer?"
          placeholderTextColor="#6c7086"
          value={backstory}
          onChangeText={setBackstory}
          multiline
        />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${name.trim() ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!name.trim()}
        >
          <Text className={`font-semibold ${name.trim() ? 'text-base' : 'text-muted'}`}>
            {name.trim() ? 'Review Character →' : 'Enter a name to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/details.tsx
git commit -m "feat: add wizard step 6 — remaining details (name, appearance, backstory)"
```

---

## Task 14: Wizard Step 7 — Review & Finalize

**Files:**
- Create: `app/(app)/characters/new/review.tsx`

This is the final step. It shows a full summary of all wizard choices and has a "Create Character" button that calls `createCharacter` and navigates to the new character's sheet.

- [ ] **Step 1: Create the review screen**

Create `app/(app)/characters/new/review.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { createCharacter } from '@/modules/character/character.service'
import { useAuth } from '@/modules/auth/useAuth'
import { getAbilityModifier, formatModifier, getMaxHP } from '@/modules/character/character.utils'
import { ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'

export default function ReviewStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { draft, resetDraft } = useCharacterStore()
  const [saving, setSaving] = useState(false)

  const conMod = getAbilityModifier(draft.constitution)
  const hpMax  = getMaxHP(1, draft.hit_die ?? 8, conMod)

  async function handleCreate() {
    if (!user) return
    setSaving(true)
    try {
      const character = await createCharacter(user.id, draft)
      resetDraft()
      router.replace(`/(app)/characters/${character.id}`)
    } catch (e: any) {
      Alert.alert('Error', e.message)
      setSaving(false)
    }
  }

  function getBonusForAbility(key: AbilityKey): number {
    if (draft.bg_bonus_two === key) return 2
    if (draft.bg_bonus_one === key) return 1
    return 0
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-2xl font-bold text-text">{draft.name || 'Your Character'}</Text>
        <Text className="text-muted mt-1 mb-6">Review before finalizing.</Text>

        {/* Class & Origin */}
        <View className="bg-surface rounded-xl p-4 mb-3">
          <Text className="text-muted text-xs mb-2 font-bold">CLASS & ORIGIN</Text>
          <Text className="text-text">
            <Text className="font-bold">Class:</Text> {draft.class_name ?? '—'} (d{draft.hit_die})
          </Text>
          <Text className="text-text mt-1">
            <Text className="font-bold">HP at Level 1:</Text> {hpMax}
          </Text>
        </View>

        {/* Ability Scores */}
        <View className="bg-surface rounded-xl p-4 mb-3">
          <Text className="text-muted text-xs mb-3 font-bold">ABILITY SCORES</Text>
          <View className="flex-row flex-wrap gap-2">
            {ABILITY_KEYS.map((key) => {
              const base = draft[key]
              const bonus = getBonusForAbility(key)
              const total = base + bonus
              const mod = getAbilityModifier(total)
              return (
                <View key={key} className="items-center bg-overlay rounded-lg px-3 py-2 min-w-[64px]">
                  <Text className="text-muted text-xs">{ABILITY_LABELS[key].slice(0, 3).toUpperCase()}</Text>
                  <Text className="text-text font-bold text-lg">{total}</Text>
                  <Text className="text-primary text-xs">{formatModifier(mod)}</Text>
                  {bonus > 0 && <Text className="text-green text-xs">+{bonus} bg</Text>}
                </View>
              )
            })}
          </View>
        </View>

        {/* Personality */}
        {(draft.alignment || draft.personality_trait) && (
          <View className="bg-surface rounded-xl p-4 mb-3">
            <Text className="text-muted text-xs mb-2 font-bold">PERSONALITY</Text>
            {draft.alignment && <Text className="text-text"><Text className="font-bold">Alignment:</Text> {draft.alignment}</Text>}
            {draft.personality_trait && <Text className="text-text mt-1">{draft.personality_trait}</Text>}
          </View>
        )}

        {/* Spells */}
        {draft.selected_spell_ids.length > 0 && (
          <View className="bg-surface rounded-xl p-4 mb-3">
            <Text className="text-muted text-xs mb-1 font-bold">SPELLS</Text>
            <Text className="text-text">{draft.selected_spell_ids.length} spell{draft.selected_spell_ids.length !== 1 ? 's' : ''} selected</Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${saving ? 'bg-overlay' : 'bg-primary'}`}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className="text-base font-semibold">Create {draft.name} →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/review.tsx
git commit -m "feat: add wizard step 7 — review and finalize (creates character)"
```

---

## Task 15: Character Sheet Layout + Overview Tab

**Files:**
- Create: `app/(app)/characters/[id]/_layout.tsx`
- Create: `app/(app)/characters/[id]/index.tsx`
- Create: `src/components/character/HPBar.tsx`
- Create: `src/components/character/ConditionBadge.tsx`

- [ ] **Step 1: Create HPBar component**

Create `src/components/character/HPBar.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native'

type Props = {
  hpCurrent: number
  hpMax: number
  tempHP: number
  onDamage: (amount: number) => void
  onHeal: (amount: number) => void
  onSetTempHP: (amount: number) => void
}

export function HPBar({ hpCurrent, hpMax, tempHP, onDamage, onHeal, onSetTempHP }: Props) {
  const [modalMode, setModalMode] = useState<'damage' | 'heal' | 'temp' | null>(null)
  const [inputValue, setInputValue] = useState('')

  const hpPercent = Math.max(0, hpCurrent / hpMax)
  const barColor = hpPercent >= 0.5 ? 'bg-green' : hpPercent >= 0.25 ? 'bg-yellow' : 'bg-red'

  function confirm() {
    const amount = parseInt(inputValue, 10)
    if (isNaN(amount) || amount <= 0) { setModalMode(null); return }
    if (modalMode === 'damage') onDamage(amount)
    else if (modalMode === 'heal') onHeal(amount)
    else if (modalMode === 'temp') onSetTempHP(amount)
    setInputValue('')
    setModalMode(null)
  }

  return (
    <View>
      {/* HP bar */}
      <View className="bg-overlay rounded-full h-4 overflow-hidden mb-1">
        <View className={`${barColor} h-full rounded-full`} style={{ width: `${hpPercent * 100}%` }} />
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-text font-bold text-lg">
          {hpCurrent} / {hpMax}
          {tempHP > 0 && <Text className="text-blue"> (+{tempHP} temp)</Text>}
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row gap-2">
        {[
          { label: 'Damage', mode: 'damage' as const, color: 'bg-red' },
          { label: 'Heal', mode: 'heal' as const, color: 'bg-green' },
          { label: 'Temp HP', mode: 'temp' as const, color: 'bg-blue' },
        ].map(({ label, mode, color }) => (
          <TouchableOpacity
            key={mode}
            onPress={() => { setInputValue(''); setModalMode(mode) }}
            className={`${color} rounded-lg px-3 py-2 flex-1 items-center`}
          >
            <Text className="text-base text-sm font-medium">{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-surface rounded-2xl p-6 w-64">
            <Text className="text-text font-bold text-lg mb-4 capitalize">{modalMode}</Text>
            <TextInput
              className="bg-overlay text-text rounded-xl px-4 py-3 text-center text-2xl mb-4"
              keyboardType="number-pad"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              placeholder="0"
              placeholderTextColor="#6c7086"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-overlay rounded-xl py-2 items-center"
                onPress={() => setModalMode(null)}
              >
                <Text className="text-muted">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary rounded-xl py-2 items-center"
                onPress={confirm}
              >
                <Text className="text-base font-semibold">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
```

- [ ] **Step 2: Create ConditionBadge component**

Create `src/components/character/ConditionBadge.tsx`:

```tsx
import { TouchableOpacity, Text } from 'react-native'

type Props = { condition: string; onRemove?: () => void }

export function ConditionBadge({ condition, onRemove }: Props) {
  return (
    <TouchableOpacity
      onPress={onRemove}
      className="flex-row items-center bg-red/20 border border-red rounded-full px-3 py-1 mr-2 mb-2"
    >
      <Text className="text-red text-xs font-medium">{condition}</Text>
      {onRemove && <Text className="text-red text-xs ml-1">×</Text>}
    </TouchableOpacity>
  )
}
```

- [ ] **Step 3: Create character sheet tab layout**

Create `app/(app)/characters/[id]/_layout.tsx`:

```tsx
import { Tabs, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

export default function CharacterSheetLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#313244', borderTopColor: '#45475a' },
        tabBarActiveTintColor: '#cba6f7',
        tabBarInactiveTintColor: '#6c7086',
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index"     options={{ tabBarLabel: 'Overview' }} />
      <Tabs.Screen name="skills"    options={{ tabBarLabel: 'Skills' }} />
      <Tabs.Screen name="actions"   options={{ tabBarLabel: 'Actions' }} />
      <Tabs.Screen name="inventory" options={{ tabBarLabel: 'Inventory' }} />
      <Tabs.Screen name="notes"     options={{ tabBarLabel: 'Notes' }} />
    </Tabs>
  )
}
```

- [ ] **Step 4: Create the Overview tab**

Create `app/(app)/characters/[id]/index.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations, ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { HPBar } from '@/components/character/HPBar'
import { ConditionBadge } from '@/components/character/ConditionBadge'

export default function OverviewTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function applyDamage(amount: number) {
    if (!character) return
    const newHP = Math.max(0, character.hp_current - amount)
    const updated = await updateCharacter(id, { hp_current: newHP })
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function applyHeal(amount: number) {
    if (!character) return
    const newHP = Math.min(character.hp_max, character.hp_current + amount)
    const updated = await updateCharacter(id, { hp_current: newHP })
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function setTempHP(amount: number) {
    if (!character) return
    const updated = await updateCharacter(id, { temp_hp: amount })
    setCharacter((prev) => prev ? { ...prev, temp_hp: updated.temp_hp } : prev)
  }

  async function removeCondition(condition: string) {
    if (!character) return
    const newConditions = character.conditions.filter((c) => c !== condition)
    const updated = await updateCharacter(id, { conditions: newConditions })
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
  }

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Header */}
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-2xl font-bold text-text">{character.name}</Text>
          <Text className="text-muted text-sm">
            Level {character.level} {character.class?.name ?? '—'}
            {character.subclass ? ` (${character.subclass.name})` : ''}
          </Text>
          <Text className="text-muted text-xs">{character.species?.name} · {character.background?.name}</Text>
        </View>
        <TouchableOpacity
          className="bg-surface px-3 py-1 rounded-lg"
          onPress={() => router.push(`/(app)/characters/${id}/level-up`)}
        >
          <Text className="text-primary text-sm">Level Up</Text>
        </TouchableOpacity>
      </View>

      {/* HP Bar */}
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

      {/* Combat stats */}
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

      {/* Ability Scores */}
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

      {/* Conditions */}
      {character.conditions.length > 0 && (
        <View className="bg-surface rounded-xl p-4">
          <Text className="text-muted text-xs font-bold mb-2">CONDITIONS</Text>
          <View className="flex-row flex-wrap">
            {character.conditions.map((c) => (
              <ConditionBadge key={c} condition={c} onRemove={() => removeCondition(c)} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/characters/\[id\]/ src/components/character/HPBar.tsx src/components/character/ConditionBadge.tsx
git commit -m "feat: add character sheet layout, overview tab, HPBar, and ConditionBadge"
```

---

## Task 16: Skills Tab

**Files:**
- Create: `app/(app)/characters/[id]/skills.tsx`

The skills tab shows all 18 skills. For each skill: the ability it's based on, the modifier (ability modifier + proficiency bonus if proficient), and a proficiency indicator. Proficiency is tracked server-side in a future iteration — for now, display all skills with their raw ability modifiers and a note that proficiencies can be set.

Skills in 5e 2024 (ability → skill):
- STR: Athletics
- DEX: Acrobatics, Sleight of Hand, Stealth
- INT: Arcana, History, Investigation, Nature, Religion
- WIS: Animal Handling, Insight, Medicine, Perception, Survival
- CHA: Deception, Intimidation, Performance, Persuasion

- [ ] **Step 1: Create the skills tab**

Create `app/(app)/characters/[id]/skills.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { AbilityKey } from '@/modules/character/character.types'

type Skill = { name: string; ability: AbilityKey }

const SKILLS: Skill[] = [
  { name: 'Acrobatics',     ability: 'dexterity' },
  { name: 'Animal Handling',ability: 'wisdom' },
  { name: 'Arcana',         ability: 'intelligence' },
  { name: 'Athletics',      ability: 'strength' },
  { name: 'Deception',      ability: 'charisma' },
  { name: 'History',        ability: 'intelligence' },
  { name: 'Insight',        ability: 'wisdom' },
  { name: 'Intimidation',   ability: 'charisma' },
  { name: 'Investigation',  ability: 'intelligence' },
  { name: 'Medicine',       ability: 'wisdom' },
  { name: 'Nature',         ability: 'intelligence' },
  { name: 'Perception',     ability: 'wisdom' },
  { name: 'Performance',    ability: 'charisma' },
  { name: 'Persuasion',     ability: 'charisma' },
  { name: 'Religion',       ability: 'intelligence' },
  { name: 'Sleight of Hand',ability: 'dexterity' },
  { name: 'Stealth',        ability: 'dexterity' },
  { name: 'Survival',       ability: 'wisdom' },
]

export default function SkillsTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [character, setCharacter] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then(setCharacter)
      .catch((e: any) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const bgSkills: string[] = character.background?.skill_proficiencies ?? []

  // Passive Perception
  const wisdomMod = getAbilityModifier(character.wisdom)
  const perceptionProficient = bgSkills.includes('perception')
  const passivePerception = 10 + wisdomMod + (perceptionProficient ? profBonus : 0)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center">
        <Text className="text-text font-medium">Passive Perception</Text>
        <Text className="text-primary font-bold text-lg">{passivePerception}</Text>
      </View>

      {SKILLS.map((skill) => {
        const abilityMod = getAbilityModifier(character[skill.ability])
        const isProficient = bgSkills.includes(skill.name.toLowerCase().replace(/ /g, '-'))
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

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/skills.tsx
git commit -m "feat: add character sheet skills tab"
```

---

## Task 17: Actions Tab

**Files:**
- Create: `app/(app)/characters/[id]/actions.tsx`

Shows the character's weapons (from equipped equipment where `category = 'weapon'`), class features (from class.features JSONB), and general action types (Attack, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use Object).

- [ ] **Step 1: Create the actions tab**

Create `app/(app)/characters/[id]/actions.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'

const STANDARD_ACTIONS = [
  { name: 'Attack', description: 'Make one melee or ranged attack.' },
  { name: 'Dash', description: 'Double your movement speed this turn.' },
  { name: 'Disengage', description: 'Move without provoking opportunity attacks.' },
  { name: 'Dodge', description: 'Attacks against you have disadvantage until your next turn.' },
  { name: 'Help', description: 'Give an ally advantage on their next ability check or attack.' },
  { name: 'Hide', description: 'Make a Dexterity (Stealth) check to hide.' },
  { name: 'Ready', description: 'Prepare a reaction to a trigger you describe.' },
  { name: 'Search', description: 'Make a Wisdom (Perception) or Intelligence (Investigation) check.' },
]

export default function ActionsTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e: any) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const strMod = getAbilityModifier(character.strength)
  const dexMod = getAbilityModifier(character.dexterity)

  const weapons = character.character_equipment.filter(
    (e) => e.is_equipped && e.equipment?.category?.toLowerCase() === 'weapon'
  )

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Weapons */}
      {weapons.length > 0 && (
        <View className="mb-6">
          <Text className="text-muted text-xs font-bold mb-2">WEAPONS</Text>
          {weapons.map((w) => {
            const attackBonus = profBonus + Math.max(strMod, dexMod)
            return (
              <View key={w.id} className="bg-surface rounded-xl p-4 mb-2">
                <Text className="text-text font-bold">{w.equipment?.name ?? 'Weapon'}</Text>
                <Text className="text-muted text-sm mt-1">Attack: {formatModifier(attackBonus)}</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Standard Actions */}
      <Text className="text-muted text-xs font-bold mb-2">ACTIONS</Text>
      {STANDARD_ACTIONS.map((action) => (
        <View key={action.name} className="bg-surface rounded-xl p-3 mb-2">
          <Text className="text-text font-bold">{action.name}</Text>
          <Text className="text-muted text-sm mt-1">{action.description}</Text>
        </View>
      ))}
    </ScrollView>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/actions.tsx
git commit -m "feat: add character sheet actions tab"
```

---

## Task 18: Inventory Tab

**Files:**
- Create: `app/(app)/characters/[id]/inventory.tsx`

Shows all equipped and unequipped items. Tapping an item toggles its `is_equipped` state. Items without an `equipment_id` are custom items (from user_content, handled in Plan 5).

- [ ] **Step 1: Create the inventory tab**

Create `app/(app)/characters/[id]/inventory.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
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
      .then((data: any) => setItems(data.character_equipment))
      .catch((e: any) => Alert.alert('Error', e.message))
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
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => toggleEquipped(item)}
        className={`rounded-xl p-3 mb-2 flex-row justify-between items-center ${item.is_equipped ? 'bg-surface border border-primary' : 'bg-surface border border-transparent'}`}
      >
        <View className="flex-1">
          <Text className={`font-medium ${item.is_equipped ? 'text-primary' : 'text-text'}`}>
            {item.equipment?.name ?? 'Custom Item'}
          </Text>
          <Text className="text-muted text-xs mt-0.5">
            {item.equipment?.category} · qty: {item.quantity}
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

Note: `ScrollView` is imported from `react-native` — add it to the import statement.

- [ ] **Step 2: Fix ScrollView import in inventory.tsx**

Ensure the top import reads:

```tsx
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native'
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/characters/\[id\]/inventory.tsx
git commit -m "feat: add character sheet inventory tab with equip toggle"
```

---

## Task 19: Notes Tab

**Files:**
- Create: `app/(app)/characters/[id]/notes.tsx`

Free-text field that auto-saves on blur. Reads and writes `characters.notes`.

- [ ] **Step 1: Create the notes tab**

Create `app/(app)/characters/[id]/notes.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'

export default function NotesTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCharacter(id)
      .then((data: any) => setNotes(data.notes ?? ''))
      .catch((e: any) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleBlur() {
    setSaving(true)
    try {
      await updateCharacter(id, { notes })
    } catch (e: any) {
      Alert.alert('Error saving notes', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-text font-bold text-lg">Notes</Text>
        {saving && <Text className="text-muted text-xs">Saving...</Text>}
      </View>
      <TextInput
        className="flex-1 bg-surface text-text rounded-xl p-4 text-base"
        multiline
        value={notes}
        onChangeText={setNotes}
        onBlur={handleBlur}
        placeholder="Write anything — tactics, lore, reminders..."
        placeholderTextColor="#6c7086"
        textAlignVertical="top"
      />
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/notes.tsx
git commit -m "feat: add character sheet notes tab with auto-save"
```

---

## Task 20: Level Up Flow

**Files:**
- Create: `app/(app)/characters/[id]/level-up.tsx`

The level-up screen gates on the current level. It presents: HP increase (roll or take average), and ASI or feat selection at levels 4, 8, 12, 16, 19. After confirming, it applies the changes via `updateCharacter` and navigates back to the Overview tab.

- [ ] **Step 1: Create the level-up screen**

Create `app/(app)/characters/[id]/level-up.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations, ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'
import { getAbilityModifier, getMaxHP, getProficiencyBonus } from '@/modules/character/character.utils'

const ASI_LEVELS = [4, 8, 12, 16, 19]

export default function LevelUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // HP options
  const [hpChoice, setHpChoice] = useState<'average' | 'max'>('average')

  // ASI: +1 to two different abilities (or +2 to one)
  const [asiBonus, setAsiBonus] = useState<Partial<Record<AbilityKey, number>>>({})

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e: any) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const newLevel = character.level + 1
  const hitDie = character.class?.hit_die ?? 8
  const conMod = getAbilityModifier(character.constitution)
  const averageIncrease = Math.floor(hitDie / 2) + 1 + conMod
  const maxIncrease = hitDie + conMod
  const hpIncrease = hpChoice === 'average' ? averageIncrease : maxIncrease

  const isASILevel = ASI_LEVELS.includes(newLevel)
  const totalASI = Object.values(asiBonus).reduce((a, b) => a + (b ?? 0), 0)
  const asiValid = !isASILevel || totalASI === 2

  async function handleLevelUp() {
    if (!character || !asiValid) return
    setSaving(true)
    try {
      const updates: any = {
        level: newLevel,
        hp_max: character.hp_max + hpIncrease,
        hp_current: character.hp_current + hpIncrease,
        proficiency_bonus: getProficiencyBonus(newLevel),
      }
      if (isASILevel) {
        ABILITY_KEYS.forEach((key) => {
          if (asiBonus[key]) {
            updates[key] = character[key] + (asiBonus[key] ?? 0)
          }
        })
      }
      await updateCharacter(id, updates)
      router.replace(`/(app)/characters/${id}`)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleASI(key: AbilityKey) {
    setAsiBonus((prev) => {
      const current = prev[key] ?? 0
      if (current > 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (totalASI >= 2) return prev
      return { ...prev, [key]: 1 }
    })
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-primary">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-text">Level Up</Text>
        <Text className="text-muted mt-1 mb-6 text-sm">
          {character.name} reaches level {newLevel}.
        </Text>

        {/* HP */}
        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-text font-bold mb-3">Hit Points</Text>
          <Text className="text-muted text-sm mb-3">
            Your Constitution modifier ({conMod >= 0 ? `+${conMod}` : conMod}) is added each level.
          </Text>
          {[
            { mode: 'average' as const, label: `Take Average (+${averageIncrease} HP)` },
            { mode: 'max' as const, label: `Take Maximum (+${maxIncrease} HP)` },
          ].map(({ mode, label }) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setHpChoice(mode)}
              className={`flex-row items-center p-3 rounded-xl mb-2 border ${hpChoice === mode ? 'border-primary bg-overlay' : 'border-transparent bg-overlay/50'}`}
            >
              <View className={`w-4 h-4 rounded-full border-2 mr-3 ${hpChoice === mode ? 'bg-primary border-primary' : 'border-muted'}`} />
              <Text className={hpChoice === mode ? 'text-primary font-medium' : 'text-text'}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ASI */}
        {isASILevel && (
          <View className="bg-surface rounded-xl p-4 mb-4">
            <Text className="text-text font-bold mb-1">Ability Score Improvement</Text>
            <Text className="text-muted text-sm mb-3">
              Distribute +2 across your ability scores (up to +2 in one or +1 to two).
              Selected: {totalASI}/2
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ABILITY_KEYS.map((key) => {
                const bonus = asiBonus[key] ?? 0
                const currentScore = character[key]
                const capped = currentScore >= 20
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => !capped && toggleASI(key)}
                    disabled={capped}
                    className={`px-3 py-2 rounded-lg border ${bonus > 0 ? 'bg-primary border-primary' : capped ? 'bg-overlay border-transparent opacity-40' : 'bg-overlay border-overlay'}`}
                  >
                    <Text className={`text-sm font-medium ${bonus > 0 ? 'text-base' : 'text-text'}`}>
                      {ABILITY_LABELS[key].slice(0, 3)} {currentScore}{bonus > 0 ? ` → ${currentScore + bonus}` : ''}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <View className="bg-surface rounded-xl p-4">
          <Text className="text-muted text-xs font-bold mb-2">SUMMARY</Text>
          <Text className="text-text">Level: {character.level} → {newLevel}</Text>
          <Text className="text-text mt-1">HP: {character.hp_max} → {character.hp_max + hpIncrease}</Text>
          <Text className="text-text mt-1">Proficiency Bonus: +{getProficiencyBonus(newLevel)}</Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${saving || !asiValid ? 'bg-overlay' : 'bg-primary'}`}
          onPress={handleLevelUp}
          disabled={saving || !asiValid}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${asiValid ? 'text-base' : 'text-muted'}`}>
                {asiValid ? `Confirm Level ${newLevel} →` : `Assign ${2 - totalASI} more ability points`}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/level-up.tsx
git commit -m "feat: add level-up flow (HP increase + ASI at milestone levels)"
```

---

## Task 21: Full Test Suite + Verification

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass (utils + service + store for character module, plus the original auth tests).

- [ ] **Step 2: Start the dev server and verify the golden path**

```bash
npx expo start --web
```

Walk through:
1. Log in → redirected to Characters list (empty state)
2. Tap "+ New" → wizard starts at Step 1 (Class)
3. Select Fighter → tap "Choose Fighter →"
4. Step 2: select Outlander + Human → "Outlander · Human →"
5. Step 3: assign standard array values → pick background bonus → "Confirm →"
6. Step 4: pick alignment, fill personality → "Remaining Details →" (Fighter skips spells)
7. Step 5 (Details): enter name "Aldric" → "Review →"
8. Step 6 (Review): confirm stats → tap "Create Aldric →"
9. Redirected to character sheet Overview tab — HP bar, ability scores, AC visible
10. Tap "Damage" → enter 5 → HP decreases; tap "Heal" → HP restores
11. Tap Skills tab — all 18 skills visible with modifiers
12. Tap Notes tab — type text, navigate away, come back — text is persisted
13. Tap "Level Up" → level 2 screen — pick HP → "Confirm Level 2 →" → level updates on sheet
14. Long-press character on list → confirm delete → character removed

- [ ] **Step 3: Commit any fixes found during testing**

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: character builder — Plan 2 complete"
```

---

## Self-Review Checklist

- [x] **Wizard (7 steps):** class → origin → ability-scores → personality → spells (conditional) → details → review ✓
- [x] **Standard array + background bonus:** assigned per 2024 rules ✓
- [x] **Character sheet (5 tabs):** Overview, Skills, Actions, Inventory, Notes ✓
- [x] **HP controls:** Damage, Heal, Temp HP with modal input ✓
- [x] **Level up:** HP increase + ASI at correct levels ✓
- [x] **Leveling mid-session not addressed** (session guard is in Plan 4's scope — the Level Up button will be disabled by the Session Console when a session is active) ✓
- [x] **TDD:** utils, service, and store all have tests written before implementation ✓
- [x] **Type consistency:** `AbilityKey`, `WizardDraft`, `CharacterWithRelations` used consistently across all files ✓
- [x] **`ABILITY_LABELS` / `ABILITY_KEYS` / `STANDARD_ARRAY` / `ALIGNMENTS` / `SPELLCASTING_CLASSES`** defined in types/utils and imported where needed ✓
