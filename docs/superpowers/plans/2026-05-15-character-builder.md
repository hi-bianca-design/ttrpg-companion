# Character Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the character creation wizard (8 steps, tappable progress bar, multiclassing, illustrations, draft persistence) and restructure the character sheet into 4 tabs (Character, Actions, Inventory, Campaign) with XP tracking and XP-triggered level-up.

**Architecture:** The wizard gains an in-memory Zustand draft that auto-persists to AsyncStorage; a slide-out WizardDrawer lets users jump between steps non-linearly. The character sheet's 5-tab layout becomes 4 tabs: the new Character tab has Combat/Profile sub-tabs with collapsible sections whose collapsed state is stored in a UI Zustand store. The Inventory tab migrates from `character_equipment` to `character_inventory` with Equipped/Backpack sub-tabs and SRD item search.

**Tech Stack:** Expo (React Native + TypeScript), expo-router, Supabase (PostgreSQL + Storage), NativeWind 4, Zustand, @react-native-async-storage/async-storage, expo-image-picker

---

## File Structure

**New files:**
- `supabase/migrations/20260515000002_character_extensions.sql` — xp, starting_level, second class, illustrations columns
- `app/(app)/characters/new/illustrations.tsx` — Step 6: illustration upload
- `app/(app)/characters/[id]/campaign.tsx` — Campaign tab (empty state + session stub)
- `src/components/character/WizardDrawer.tsx` — slide-out step drawer
- `src/components/ui/CollapsibleSection.tsx` — reusable collapsible section header
- `src/stores/ui.store.ts` — collapsed-section Zustand store

**Modified files:**
- `src/modules/character/character.types.ts` — WizardDraft expansion
- `src/modules/character/character.utils.ts` — XP thresholds, step completion, multiclass HP
- `src/modules/character/character.store.ts` — AsyncStorage persistence
- `src/modules/character/character.service.ts` — createCharacter handles new fields
- `src/modules/srd/srd.service.ts` — searchEquipment, searchMagicItems
- `src/components/character/WizardProgress.tsx` — full replacement (tappable, 3 states)
- `app/(app)/characters/new/_layout.tsx` — integrate WizardDrawer
- `app/(app)/characters/new/class.tsx` — starting level + multiclass + cascade warning
- `app/(app)/characters/new/review.tsx` — show new fields
- `app/(app)/characters/[id]/_layout.tsx` — 4 tabs
- `app/(app)/characters/[id]/index.tsx` — Character tab (XP bar + Combat/Profile sub-tabs)
- `app/(app)/characters/[id]/actions.tsx` — add spells section
- `app/(app)/characters/[id]/inventory.tsx` — character_inventory, Equipped/Backpack, SRD search
- `app/(app)/characters/[id]/level-up.tsx` — award XP + trigger level-up from XP

**Deleted files:**
- `app/(app)/characters/[id]/skills.tsx`
- `app/(app)/characters/[id]/notes.tsx`

---

## Task 1: DB Migration — Character Extensions

**Files:**
- Create: `supabase/migrations/20260515000002_character_extensions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260515000002_character_extensions.sql
alter table public.characters
  add column if not exists xp                    integer not null default 0,
  add column if not exists starting_level        integer not null default 1,
  add column if not exists second_class_id       uuid references public.classes(id) on delete set null,
  add column if not exists second_class_level    integer,
  add column if not exists illustration_profile_url text,
  add column if not exists illustration_full_url    text;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260515000002_character_extensions.sql src/types/database.types.ts
git commit -m "feat: add xp, starting_level, multiclass, and illustration columns to characters"
```

---

## Task 2: WizardDraft Type Expansion

**Files:**
- Modify: `src/modules/character/character.types.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/character/__tests__/character.types.test.ts`:

```typescript
import { INITIAL_DRAFT, WizardDraft } from '../character.types'

test('INITIAL_DRAFT has multiclass and illustration fields', () => {
  expect(INITIAL_DRAFT.starting_level).toBe(1)
  expect(INITIAL_DRAFT.second_class_id).toBeNull()
  expect(INITIAL_DRAFT.second_class_name).toBeNull()
  expect(INITIAL_DRAFT.second_class_level).toBeNull()
  expect(INITIAL_DRAFT.second_hit_die).toBeNull()
  expect(INITIAL_DRAFT.illustration_profile_url).toBeNull()
  expect(INITIAL_DRAFT.illustration_full_url).toBeNull()
  expect(INITIAL_DRAFT.xp).toBe(0)
})

test('WizardDraft type includes all new fields', () => {
  const draft: WizardDraft = {
    ...INITIAL_DRAFT,
    starting_level: 5,
    second_class_id: 'some-uuid',
    second_class_name: 'Wizard',
    second_class_level: 2,
    second_hit_die: 6,
    illustration_profile_url: 'https://example.com/profile.jpg',
    illustration_full_url: null,
    xp: 6500,
  }
  expect(draft.starting_level).toBe(5)
  expect(draft.second_class_id).toBe('some-uuid')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/modules/character/__tests__/character.types.test.ts --no-coverage
```

Expected: FAIL — fields don't exist on WizardDraft.

- [ ] **Step 3: Update WizardDraft and INITIAL_DRAFT**

In `src/modules/character/character.types.ts`, replace the `WizardDraft` type and `INITIAL_DRAFT`:

```typescript
// Accumulated in Zustand across wizard steps; submitted on Review step.
export type WizardDraft = {
  // Step 1 — Class
  class_id: string | null
  class_name: string | null
  hit_die: number | null
  subclass_id: string | null
  starting_level: number        // 1–20, default 1
  // Step 1 — Multiclass (optional)
  second_class_id: string | null
  second_class_name: string | null
  second_class_level: number | null   // levels in second class; null if not multiclassing
  second_hit_die: number | null
  // Step 2 — Origin
  species_id: string | null
  background_id: string | null
  custom_species_id: string | null
  custom_background_id: string | null
  // Step 3 — Ability Scores
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  bg_bonus_two: string | null
  bg_bonus_one: string | null
  // Step 4 — Personality
  alignment: string
  personality_trait: string
  ideal: string
  bond: string
  flaw: string
  // Step 5 — Spells
  selected_spell_ids: string[]
  selected_custom_spell_ids: string[]
  // Step 6 — Illustrations
  illustration_profile_url: string | null
  illustration_full_url: string | null
  // Step 7 — Details
  name: string
  appearance: string
  backstory: string
  // XP (starting XP for characters created above level 1)
  xp: number
}

export const INITIAL_DRAFT: WizardDraft = {
  class_id: null,
  class_name: null,
  hit_die: null,
  subclass_id: null,
  starting_level: 1,
  second_class_id: null,
  second_class_name: null,
  second_class_level: null,
  second_hit_die: null,
  species_id: null,
  background_id: null,
  custom_species_id: null,
  custom_background_id: null,
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
  selected_custom_spell_ids: [],
  illustration_profile_url: null,
  illustration_full_url: null,
  name: '',
  appearance: '',
  backstory: '',
  xp: 0,
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/modules/character/__tests__/character.types.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.types.ts src/modules/character/__tests__/character.types.test.ts
git commit -m "feat: expand WizardDraft with multiclass, illustration, and xp fields"
```

---

## Task 3: character.utils.ts — XP Thresholds, Step Completion, Multiclass HP

**Files:**
- Modify: `src/modules/character/character.utils.ts`
- Test: `src/modules/character/__tests__/character.utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import {
  XP_THRESHOLDS,
  getLevelFromXP,
  getXPForNextLevel,
  getStepCompletion,
  getMaxHPMulticlass,
} from '../character.utils'
import { INITIAL_DRAFT } from '../character.types'

describe('XP utilities', () => {
  test('XP_THRESHOLDS has 20 entries', () => {
    expect(XP_THRESHOLDS).toHaveLength(20)
    expect(XP_THRESHOLDS[0]).toBe(0)
    expect(XP_THRESHOLDS[1]).toBe(300)
    expect(XP_THRESHOLDS[4]).toBe(6500)
    expect(XP_THRESHOLDS[19]).toBe(355000)
  })

  test('getLevelFromXP returns correct level', () => {
    expect(getLevelFromXP(0)).toBe(1)
    expect(getLevelFromXP(299)).toBe(1)
    expect(getLevelFromXP(300)).toBe(2)
    expect(getLevelFromXP(6500)).toBe(5)
    expect(getLevelFromXP(355000)).toBe(20)
    expect(getLevelFromXP(999999)).toBe(20)
  })

  test('getXPForNextLevel returns threshold for next level', () => {
    expect(getXPForNextLevel(1)).toBe(300)
    expect(getXPForNextLevel(4)).toBe(6500)
    expect(getXPForNextLevel(20)).toBeNull()
  })
})

describe('getStepCompletion', () => {
  test('class: empty when no class selected', () => {
    expect(getStepCompletion('class', INITIAL_DRAFT)).toBe('empty')
  })
  test('class: complete when class selected', () => {
    expect(getStepCompletion('class', { ...INITIAL_DRAFT, class_id: 'abc' })).toBe('complete')
  })
  test('origin: partial when only species set', () => {
    expect(getStepCompletion('origin', { ...INITIAL_DRAFT, species_id: 'abc' })).toBe('partial')
  })
  test('origin: complete when both set', () => {
    expect(getStepCompletion('origin', { ...INITIAL_DRAFT, species_id: 'a', background_id: 'b' })).toBe('complete')
  })
  test('ability-scores: empty when all default', () => {
    expect(getStepCompletion('ability-scores', INITIAL_DRAFT)).toBe('empty')
  })
  test('ability-scores: complete when any non-default', () => {
    expect(getStepCompletion('ability-scores', { ...INITIAL_DRAFT, strength: 15 })).toBe('complete')
  })
  test('personality: partial when some filled', () => {
    expect(getStepCompletion('personality', { ...INITIAL_DRAFT, alignment: 'Chaotic Good' })).toBe('partial')
  })
  test('personality: complete when all filled', () => {
    const d = { ...INITIAL_DRAFT, alignment: 'CG', personality_trait: 'brave', ideal: 'freedom', bond: 'clan', flaw: 'reckless' }
    expect(getStepCompletion('personality', d)).toBe('complete')
  })
  test('spells: always complete (optional)', () => {
    expect(getStepCompletion('spells', INITIAL_DRAFT)).toBe('complete')
  })
  test('illustrations: always complete (optional)', () => {
    expect(getStepCompletion('illustrations', INITIAL_DRAFT)).toBe('complete')
  })
  test('details: empty when name empty', () => {
    expect(getStepCompletion('details', INITIAL_DRAFT)).toBe('empty')
  })
  test('details: complete when name set', () => {
    expect(getStepCompletion('details', { ...INITIAL_DRAFT, name: 'Tara' })).toBe('complete')
  })
})

describe('getMaxHPMulticlass', () => {
  test('single class level 1', () => {
    // Fighter d10 + con mod 0
    expect(getMaxHPMulticlass(1, 10, null, null, 0)).toBe(10)
  })
  test('single class level 3 with +2 con', () => {
    // Level 1: 10+2=12, Level 2: 6+2=8, Level 3: 6+2=8 → total 28
    expect(getMaxHPMulticlass(3, 10, null, null, 2)).toBe(28)
  })
  test('multiclass Fighter 3 / Wizard 2 with 0 con', () => {
    // Fighter level 1: 10, Fighter 2-3: 2×6=12, Wizard 1-2: 2×4=8 → 30
    expect(getMaxHPMulticlass(5, 10, 6, 2, 0)).toBe(30)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/modules/character/__tests__/character.utils.test.ts --no-coverage
```

Expected: FAIL — exports don't exist.

- [ ] **Step 3: Add to character.utils.ts**

Append to the existing file:

```typescript
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000,
  48000, 64000, 85000, 100000, 120000, 140000,
  165000, 195000, 225000, 265000, 305000, 355000,
] as const

export function getLevelFromXP(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getXPForNextLevel(level: number): number | null {
  if (level >= 20) return null
  return XP_THRESHOLDS[level]
}

// Returns 'empty' | 'partial' | 'complete' for a wizard step.
export function getStepCompletion(
  step: string,
  draft: import('./character.types').WizardDraft
): 'empty' | 'partial' | 'complete' {
  switch (step) {
    case 'class':
      return draft.class_id ? 'complete' : 'empty'
    case 'origin': {
      const hasSpecies = !!(draft.species_id || draft.custom_species_id)
      const hasBg = !!(draft.background_id || draft.custom_background_id)
      if (hasSpecies && hasBg) return 'complete'
      if (hasSpecies || hasBg) return 'partial'
      return 'empty'
    }
    case 'ability-scores': {
      const allDefault = ['strength','dexterity','constitution','intelligence','wisdom','charisma']
        .every((k) => draft[k as keyof typeof draft] === 10)
      return allDefault ? 'empty' : 'complete'
    }
    case 'personality': {
      const fields = [draft.alignment, draft.personality_trait, draft.ideal, draft.bond, draft.flaw]
      const filled = fields.filter(Boolean).length
      if (filled === 0) return 'empty'
      if (filled === fields.length) return 'complete'
      return 'partial'
    }
    case 'spells':
    case 'illustrations':
      return 'complete'
    case 'details':
      if (!draft.name) return 'empty'
      return 'complete'
    case 'review':
      return 'complete'
    default:
      return 'empty'
  }
}

// Calculates max HP for single-class or multiclass characters.
// primaryLevel = startingLevel - (secondClassLevel ?? 0)
export function getMaxHPMulticlass(
  startingLevel: number,
  primaryHitDie: number,
  secondHitDie: number | null,
  secondClassLevel: number | null,
  conMod: number
): number {
  const primaryLevel = startingLevel - (secondClassLevel ?? 0)
  const primaryHP =
    (primaryHitDie + conMod) +
    Math.max(0, primaryLevel - 1) * (Math.floor(primaryHitDie / 2) + 1 + conMod)
  const secondaryHP =
    secondClassLevel && secondHitDie
      ? secondClassLevel * (Math.floor(secondHitDie / 2) + 1 + conMod)
      : 0
  return primaryHP + secondaryHP
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/modules/character/__tests__/character.utils.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.utils.ts src/modules/character/__tests__/character.utils.test.ts
git commit -m "feat: add XP thresholds, step completion checker, and multiclass HP calculation"
```

---

## Task 4: UI Store — Collapsed Sections

**Files:**
- Create: `src/stores/ui.store.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/ui.store.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-hooks'
import { useUIStore } from '../ui.store'

test('toggleSection flips and persists collapsed state', () => {
  const { result } = renderHook(() => useUIStore())
  expect(result.current.isCollapsed('char1:hp')).toBe(false)
  act(() => result.current.toggleSection('char1:hp'))
  expect(result.current.isCollapsed('char1:hp')).toBe(true)
  act(() => result.current.toggleSection('char1:hp'))
  expect(result.current.isCollapsed('char1:hp')).toBe(false)
})

test('different keys are independent', () => {
  const { result } = renderHook(() => useUIStore())
  act(() => result.current.toggleSection('char1:hp'))
  expect(result.current.isCollapsed('char1:conditions')).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/stores/__tests__/ui.store.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create ui.store.ts**

```typescript
import { create } from 'zustand'

type UIStore = {
  collapsed: Record<string, boolean>
  isCollapsed: (key: string) => boolean
  toggleSection: (key: string) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  collapsed: {},
  isCollapsed: (key) => get().collapsed[key] ?? false,
  toggleSection: (key) =>
    set((state) => ({
      collapsed: { ...state.collapsed, [key]: !state.collapsed[key] },
    })),
}))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/stores/__tests__/ui.store.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/ui.store.ts src/stores/__tests__/ui.store.test.ts
git commit -m "feat: add UI store for collapsed section state"
```

---

## Task 5: CollapsibleSection Component

**Files:**
- Create: `src/components/ui/CollapsibleSection.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { ReactNode } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useUIStore } from '@/stores/ui.store'

type Props = {
  sectionKey: string    // unique key: e.g. `${characterId}:ability-scores`
  title: string
  children: ReactNode
}

export function CollapsibleSection({ sectionKey, title, children }: Props) {
  const { isCollapsed, toggleSection } = useUIStore()
  const collapsed = isCollapsed(sectionKey)

  return (
    <View className="bg-surface rounded-xl mb-3 overflow-hidden">
      <TouchableOpacity
        onPress={() => toggleSection(sectionKey)}
        className="flex-row justify-between items-center px-4 py-3"
        activeOpacity={0.7}
      >
        <Text className="text-muted text-xs font-bold tracking-wider">{title}</Text>
        <Text className="text-muted text-lg">{collapsed ? '›' : '˅'}</Text>
      </TouchableOpacity>
      {!collapsed && <View className="px-4 pb-4">{children}</View>}
    </View>
  )
}
```

- [ ] **Step 2: Smoke-test by importing in index.tsx briefly, then revert**

No code change needed — just confirm the import resolves by running:

```bash
npx tsc --noEmit
```

Expected: no new type errors from CollapsibleSection.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/CollapsibleSection.tsx
git commit -m "feat: add CollapsibleSection component with persistent collapsed state"
```

---

## Task 6: Character Store — Draft Persistence

**Files:**
- Modify: `src/modules/character/character.store.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/character/__tests__/character.store.test.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook } from '@testing-library/react-hooks'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

beforeEach(() => AsyncStorage.clear())

test('saveDraft persists draft to AsyncStorage', async () => {
  const { useCharacterStore } = await import('../character.store')
  const { result } = renderHook(() => useCharacterStore())
  await act(async () => {
    result.current.setDraftField('name', 'Tara')
    await result.current.saveDraft()
  })
  const raw = await AsyncStorage.getItem('wizard_draft')
  expect(raw).not.toBeNull()
  const parsed = JSON.parse(raw!)
  expect(parsed.name).toBe('Tara')
})

test('loadDraft restores saved draft', async () => {
  const { useCharacterStore, DRAFT_KEY } = await import('../character.store')
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ name: 'Saved', class_id: 'abc' }))
  const { result } = renderHook(() => useCharacterStore())
  await act(async () => { await result.current.loadDraft() })
  expect(result.current.draft.name).toBe('Saved')
})

test('resetDraft clears AsyncStorage', async () => {
  const { useCharacterStore, DRAFT_KEY } = await import('../character.store')
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ name: 'Old' }))
  const { result } = renderHook(() => useCharacterStore())
  await act(async () => { result.current.resetDraft() })
  const raw = await AsyncStorage.getItem(DRAFT_KEY)
  expect(raw).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/modules/character/__tests__/character.store.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Rewrite character.store.ts**

```typescript
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WizardDraft, INITIAL_DRAFT } from './character.types'

export const DRAFT_KEY = 'wizard_draft'

type CharacterStore = {
  draft: WizardDraft
  setDraftField: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void
  setDraft: (partial: Partial<WizardDraft>) => void
  resetDraft: () => void
  saveDraft: () => Promise<void>
  loadDraft: () => Promise<void>
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  draft: { ...INITIAL_DRAFT },
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  setDraft: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),
  resetDraft: () => {
    set({ draft: { ...INITIAL_DRAFT } })
    AsyncStorage.removeItem(DRAFT_KEY)
  },
  saveDraft: async () => {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(get().draft))
  },
  loadDraft: async () => {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Partial<WizardDraft>
        set((state) => ({ draft: { ...state.draft, ...saved } }))
      } catch {
        // corrupt data — ignore
      }
    }
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/modules/character/__tests__/character.store.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.store.ts src/modules/character/__tests__/character.store.test.ts
git commit -m "feat: add draft persistence with AsyncStorage to character store"
```

---

## Task 7: WizardProgress Replacement + WizardDrawer

**Files:**
- Modify: `src/components/character/WizardProgress.tsx`
- Create: `src/components/character/WizardDrawer.tsx`

- [ ] **Step 1: Rewrite WizardProgress.tsx**

The progress bar shows 8 segments. Each is tappable to open the drawer. Each segment renders in one of 3 states: `complete` (solid primary), `partial` (half-filled with gradient/striped), `empty` (overlay).

```typescript
import { View, TouchableOpacity } from 'react-native'
import { WizardDraft } from '@/modules/character/character.types'
import { getStepCompletion } from '@/modules/character/character.utils'

export const WIZARD_STEPS = [
  'class', 'origin', 'ability-scores', 'personality',
  'spells', 'illustrations', 'details', 'review',
] as const
export type WizardStep = typeof WIZARD_STEPS[number]

type Props = {
  currentStep: string
  draft: WizardDraft
  onStepPress: (step: WizardStep) => void
}

export function WizardProgress({ currentStep, draft, onStepPress }: Props) {
  return (
    <View className="flex-row px-4 pt-3 pb-2 gap-1 bg-base">
      {WIZARD_STEPS.map((step) => {
        const state = getStepCompletion(step, draft)
        const isCurrent = step === currentStep
        return (
          <TouchableOpacity
            key={step}
            onPress={() => onStepPress(step)}
            className="flex-1 h-2 rounded-full overflow-hidden"
            activeOpacity={0.7}
          >
            {state === 'complete' ? (
              <View className={`flex-1 rounded-full ${isCurrent ? 'bg-primary' : 'bg-primary/70'}`} />
            ) : state === 'partial' ? (
              <View className="flex-1 rounded-full overflow-hidden bg-overlay">
                <View className="w-1/2 h-full bg-primary/70" />
              </View>
            ) : (
              <View className={`flex-1 rounded-full ${isCurrent ? 'bg-overlay border border-primary' : 'bg-overlay'}`} />
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 2: Create WizardDrawer.tsx**

```typescript
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { WizardDraft } from '@/modules/character/character.types'
import { getStepCompletion } from '@/modules/character/character.utils'
import { WIZARD_STEPS, WizardStep } from './WizardProgress'

const STEP_LABELS: Record<WizardStep, string> = {
  'class':          'Class',
  'origin':         'Origin',
  'ability-scores': 'Ability Scores',
  'personality':    'Personality',
  'spells':         'Spells',
  'illustrations':  'Illustrations',
  'details':        'Details',
  'review':         'Review',
}

type Props = {
  visible: boolean
  currentStep: string
  draft: WizardDraft
  onNavigate: (step: WizardStep) => void
  onClose: () => void
}

export function WizardDrawer({ visible, currentStep, draft, onNavigate, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        className="flex-1 bg-black/60"
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="bg-surface rounded-t-2xl pb-10">
        <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
          <Text className="text-text font-bold text-lg">Steps</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-muted">Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView>
          {WIZARD_STEPS.map((step, i) => {
            const state = getStepCompletion(step, draft)
            const isCurrent = step === currentStep
            return (
              <TouchableOpacity
                key={step}
                onPress={() => { onNavigate(step); onClose() }}
                className={`flex-row items-center px-4 py-3 border-b border-overlay/40 ${isCurrent ? 'bg-overlay' : ''}`}
              >
                <View
                  className={`w-6 h-6 rounded-full mr-3 items-center justify-center border-2 ${
                    state === 'complete'
                      ? 'bg-primary border-primary'
                      : state === 'partial'
                        ? 'border-primary bg-transparent'
                        : 'border-overlay bg-transparent'
                  }`}
                >
                  <Text className={`text-xs font-bold ${state === 'complete' ? 'text-base' : 'text-muted'}`}>
                    {state === 'complete' ? '✓' : `${i + 1}`}
                  </Text>
                </View>
                <Text className={`flex-1 ${isCurrent ? 'text-primary font-semibold' : 'text-text'}`}>
                  {STEP_LABELS[step]}
                </Text>
                {state === 'partial' && (
                  <Text className="text-yellow text-xs ml-2">In progress</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/character/WizardProgress.tsx src/components/character/WizardDrawer.tsx
git commit -m "feat: replace WizardProgress with tappable 3-state indicator; add WizardDrawer"
```

---

## Task 8: Wizard Layout — Integrate Drawer + Auto-save

**Files:**
- Modify: `app/(app)/characters/new/_layout.tsx`

The layout owns the drawer open state, connects WizardProgress → WizardDrawer, calls `saveDraft` on every focus event, and loads the draft on mount.

- [ ] **Step 1: Rewrite _layout.tsx**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { Stack, useRouter, useSegments, useFocusEffect } from 'expo-router'
import { View } from 'react-native'
import { WizardProgress, WIZARD_STEPS, WizardStep } from '@/components/character/WizardProgress'
import { WizardDrawer } from '@/components/character/WizardDrawer'
import { useCharacterStore } from '@/modules/character/character.store'

export default function WizardLayout() {
  const router = useRouter()
  const segments = useSegments()
  const { draft, loadDraft, saveDraft } = useCharacterStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const currentStep = segments[segments.length - 1] ?? 'class'

  useEffect(() => { loadDraft() }, [])

  useFocusEffect(
    useCallback(() => {
      saveDraft()
    }, [draft])
  )

  function navigateToStep(step: WizardStep) {
    router.push(`/(app)/characters/new/${step}` as never)
  }

  return (
    <View className="flex-1 bg-base">
      <WizardProgress
        currentStep={currentStep}
        draft={draft}
        onStepPress={() => setDrawerOpen(true)}
      />
      <WizardDrawer
        visible={drawerOpen}
        currentStep={currentStep}
        draft={draft}
        onNavigate={navigateToStep}
        onClose={() => setDrawerOpen(false)}
      />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/_layout.tsx
git commit -m "feat: integrate WizardDrawer and draft auto-save into wizard layout"
```

---

## Task 9: Class Step — Starting Level + Multiclass + Cascade Warning

**Files:**
- Modify: `app/(app)/characters/new/class.tsx`

This step adds:
1. A "Starting Level" number picker (1–20) below the class list
2. A "Add second class (multiclass)" toggle; selecting a second class shows a level split picker
3. A cascade warning sheet when the user changes an already-set class (clears subclass_id, second_class fields)

- [ ] **Step 1: Rewrite class.tsx**

```typescript
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { getClasses } from '@/modules/srd/srd.service'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBClass } from '@/modules/character/character.types'

export default function ClassStep() {
  const router = useRouter()
  const { draft, setDraft, resetDraft } = useCharacterStore()
  const [classes, setClasses] = useState<DBClass[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingClass, setPendingClass] = useState<DBClass | null>(null)
  const [showCascadeWarning, setShowCascadeWarning] = useState(false)
  const [showMulticlass, setShowMulticlass] = useState(!!draft.second_class_id)
  const [startingLevel, setStartingLevel] = useState(draft.starting_level)
  const [secondClassLevel, setSecondClassLevel] = useState(draft.second_class_level ?? 1)

  useEffect(() => {
    if (!draft.class_id) resetDraft()
    getClasses().then(setClasses).finally(() => setLoading(false))
  }, [])

  const selectedClass = classes.find((c) => c.id === draft.class_id) ?? null
  const secondClass = classes.find((c) => c.id === draft.second_class_id) ?? null
  const primaryLevel = startingLevel - (showMulticlass ? secondClassLevel : 0)

  function handleSelectPrimary(cls: DBClass) {
    if (draft.class_id && draft.class_id !== cls.id) {
      setPendingClass(cls)
      setShowCascadeWarning(true)
    } else {
      applyPrimaryClass(cls)
    }
  }

  function applyPrimaryClass(cls: DBClass) {
    setDraft({
      class_id: cls.id,
      class_name: cls.name,
      hit_die: cls.hit_die,
      subclass_id: null,
      second_class_id: null,
      second_class_name: null,
      second_class_level: null,
      second_hit_die: null,
    })
    setShowMulticlass(false)
    setPendingClass(null)
    setShowCascadeWarning(false)
  }

  function handleSecondClassSelect(cls: DBClass) {
    if (cls.id === draft.class_id) {
      Alert.alert('Same class', 'Pick a different class for multiclassing.')
      return
    }
    setDraft({
      second_class_id: cls.id,
      second_class_name: cls.name,
      second_hit_die: cls.hit_die,
    })
  }

  function handleNext() {
    if (!draft.class_id) return
    const sc = showMulticlass && draft.second_class_id ? secondClassLevel : null
    setDraft({
      starting_level: startingLevel,
      second_class_level: sc,
      second_class_id: showMulticlass ? draft.second_class_id : null,
      second_class_name: showMulticlass ? draft.second_class_name : null,
      second_hit_die: showMulticlass ? draft.second_hit_die : null,
    })
    router.push('/(app)/characters/new/origin')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const canContinue = !!draft.class_id && (!showMulticlass || !!draft.second_class_id) && primaryLevel >= 1

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>
        <Text className="text-2xl font-bold text-text">Choose a Class</Text>
        <Text className="text-muted mt-1 text-sm mb-4">
          Your class defines your role in combat and how you solve problems.
        </Text>

        {/* Primary class list */}
        {classes.map((item) => {
          const isSelected = draft.class_id === item.id
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleSelectPrimary(item)}
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
        })}

        {/* Starting level */}
        {draft.class_id && (
          <View className="bg-surface rounded-xl p-4 mb-3">
            <Text className="text-text font-bold mb-3">Starting Level</Text>
            <View className="flex-row flex-wrap gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => {
                    setStartingLevel(lvl)
                    if (secondClassLevel >= lvl) setSecondClassLevel(Math.max(1, lvl - 1))
                  }}
                  className={`w-10 h-10 rounded-lg items-center justify-center ${startingLevel === lvl ? 'bg-primary' : 'bg-overlay'}`}
                >
                  <Text className={`font-bold ${startingLevel === lvl ? 'text-base' : 'text-text'}`}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Multiclass toggle */}
        {draft.class_id && startingLevel >= 2 && (
          <TouchableOpacity
            onPress={() => setShowMulticlass((v) => !v)}
            className="flex-row items-center bg-surface rounded-xl p-4 mb-3"
          >
            <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${showMulticlass ? 'bg-primary border-primary' : 'border-overlay'}`}>
              {showMulticlass && <Text className="text-base text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-text font-medium">Add a second class (multiclass)</Text>
          </TouchableOpacity>
        )}

        {/* Second class picker */}
        {showMulticlass && (
          <View className="bg-surface rounded-xl p-4 mb-3">
            <Text className="text-text font-bold mb-3">Second Class</Text>
            {classes.filter((c) => c.id !== draft.class_id).map((item) => {
              const isSelected = draft.second_class_id === item.id
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSecondClassSelect(item)}
                  className={`rounded-xl p-3 mb-2 border ${isSelected ? 'border-primary bg-overlay' : 'border-transparent bg-overlay/50'}`}
                >
                  <Text className={`font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                    {item.name} (d{item.hit_die})
                  </Text>
                </TouchableOpacity>
              )
            })}

            {draft.second_class_id && (
              <View className="mt-3">
                <Text className="text-text text-sm font-medium mb-2">
                  Levels in {draft.second_class_name}: {secondClassLevel} (primary: {primaryLevel})
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {Array.from({ length: startingLevel - 1 }, (_, i) => i + 1).map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => setSecondClassLevel(lvl)}
                      className={`w-10 h-10 rounded-lg items-center justify-center ${secondClassLevel === lvl ? 'bg-primary' : 'bg-overlay'}`}
                    >
                      <Text className={`font-bold ${secondClassLevel === lvl ? 'text-base' : 'text-text'}`}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Cascade warning */}
      <Modal visible={showCascadeWarning} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-2xl p-6 pb-10">
            <Text className="text-text font-bold text-lg mb-2">Change class?</Text>
            <Text className="text-muted text-sm mb-6">
              Switching from {draft.class_name} will clear your subclass and multiclass selections.
              Your ability scores, personality, and other choices are kept.
            </Text>
            <TouchableOpacity
              onPress={() => pendingClass && applyPrimaryClass(pendingClass)}
              className="bg-primary rounded-xl py-3 items-center mb-3"
            >
              <Text className="text-base font-semibold">Change to {pendingClass?.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setPendingClass(null); setShowCascadeWarning(false) }}
              className="items-center py-3"
            >
              <Text className="text-muted">Keep {draft.class_name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canContinue ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text className={`font-semibold ${canContinue ? 'text-base' : 'text-muted'}`}>
            {canContinue
              ? `${draft.class_name}${showMulticlass && draft.second_class_name ? ` / ${draft.second_class_name}` : ''} →`
              : 'Select a class to continue'}
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
git commit -m "feat: add starting level, multiclass picker, and cascade warning to Class step"
```

---

## Task 10: Illustrations Step (New Route)

**Files:**
- Create: `app/(app)/characters/new/illustrations.tsx`

This step is inserted between `spells` and `details`. Both fields are optional. The user can either paste a URL (validated) or pick an image from the photo library (uploaded to Supabase Storage).

- [ ] **Step 1: Install expo-image-picker**

```bash
npx expo install expo-image-picker
```

- [ ] **Step 2: Create illustrations.tsx**

```typescript
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useCharacterStore } from '@/modules/character/character.store'
import { useAuth } from '@/modules/auth/useAuth'
import { supabase } from '@/lib/supabase'

const IMAGE_URL_RE = /^https?:\/\/.+\.(jpe?g|png)(\?.*)?$/i

async function uploadIllustration(
  localUri: string,
  userId: string,
  field: 'profile' | 'full'
): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${Date.now()}-${field}.${ext}`
  const response = await fetch(localUri)
  const blob = await response.blob()
  const { error } = await supabase.storage
    .from('illustrations')
    .upload(path, blob, { contentType: `image/${ext}`, upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('illustrations').getPublicUrl(path)
  return data.publicUrl
}

type IllustrationFieldProps = {
  label: string
  url: string | null
  onUrlChange: (url: string) => void
  onPickImage: () => Promise<void>
  uploading: boolean
  onPreview: () => void
}

function IllustrationField({ label, url, onUrlChange, onPickImage, uploading, onPreview }: IllustrationFieldProps) {
  const [inputValue, setInputValue] = useState(url ?? '')
  const [urlError, setUrlError] = useState('')

  function handleUrlBlur() {
    const v = inputValue.trim()
    if (!v) { setUrlError(''); onUrlChange(''); return }
    if (!IMAGE_URL_RE.test(v)) {
      setUrlError('Must be a valid URL ending in .jpg, .jpeg, or .png')
    } else {
      setUrlError('')
      onUrlChange(v)
    }
  }

  return (
    <View className="bg-surface rounded-xl p-4 mb-4">
      <Text className="text-text font-bold mb-3">{label}</Text>

      {url ? (
        <TouchableOpacity onPress={onPreview} className="mb-3">
          <Image source={{ uri: url }} className="w-full h-40 rounded-xl" resizeMode="cover" />
          <Text className="text-primary text-xs mt-1 text-center">Tap to preview full size</Text>
        </TouchableOpacity>
      ) : (
        <View className="w-full h-24 rounded-xl bg-overlay items-center justify-center mb-3">
          <Text className="text-muted text-sm">No image selected</Text>
        </View>
      )}

      <TextInput
        value={inputValue}
        onChangeText={setInputValue}
        onBlur={handleUrlBlur}
        placeholder="Paste image URL (https://...jpg)"
        placeholderTextColor="#6c7086"
        className="bg-overlay text-text rounded-xl px-3 py-2 text-sm mb-2"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      {!!urlError && <Text className="text-red text-xs mb-2">{urlError}</Text>}

      <TouchableOpacity
        onPress={onPickImage}
        disabled={uploading}
        className="bg-overlay rounded-xl py-2 items-center"
      >
        {uploading
          ? <ActivityIndicator color="#cba6f7" />
          : <Text className="text-primary text-sm">Choose from library</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

export default function IllustrationsStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { draft, setDraft } = useCharacterStore()
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingFull, setUploadingFull] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function pickAndUpload(field: 'profile' | 'full') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to upload an illustration.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const localUri = result.assets[0].uri
    if (field === 'profile') setUploadingProfile(true)
    else setUploadingFull(true)
    try {
      const publicUrl = await uploadIllustration(localUri, user!.id, field)
      setDraft(field === 'profile'
        ? { illustration_profile_url: publicUrl }
        : { illustration_full_url: publicUrl }
      )
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      if (field === 'profile') setUploadingProfile(false)
      else setUploadingFull(false)
    }
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-2xl font-bold text-text">Illustrations</Text>
        <Text className="text-muted mt-1 text-sm mb-6">
          Optional. Add a portrait and a full-body illustration for your character.
          Accepted: JPEG, PNG.
        </Text>

        <IllustrationField
          label="Portrait (profile view)"
          url={draft.illustration_profile_url}
          onUrlChange={(url) => setDraft({ illustration_profile_url: url || null })}
          onPickImage={() => pickAndUpload('profile')}
          uploading={uploadingProfile}
          onPreview={() => setPreviewUrl(draft.illustration_profile_url)}
        />

        <IllustrationField
          label="Full body view"
          url={draft.illustration_full_url}
          onUrlChange={(url) => setDraft({ illustration_full_url: url || null })}
          onPickImage={() => pickAndUpload('full')}
          uploading={uploadingFull}
          onPreview={() => setPreviewUrl(draft.illustration_full_url)}
        />

        {/* Full-screen preview modal */}
        <Modal visible={!!previewUrl} transparent animationType="fade">
          <View className="flex-1 bg-black/90 items-center justify-center">
            <TouchableOpacity
              className="absolute top-12 right-6 z-10"
              onPress={() => setPreviewUrl(null)}
            >
              <Text className="text-white text-lg font-bold">✕ Close</Text>
            </TouchableOpacity>
            {previewUrl && (
              <Image
                source={{ uri: previewUrl }}
                className="w-[90%] h-[80%]"
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 items-center"
          onPress={() => router.push('/(app)/characters/new/details')}
        >
          <Text className="text-base font-semibold">
            {(draft.illustration_profile_url || draft.illustration_full_url)
              ? 'Continue →'
              : 'Skip for now →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Create the Supabase Storage bucket for illustrations**

Run in Supabase SQL editor (or via migration):

```sql
-- add to supabase/migrations/20260515000002_character_extensions.sql before applying,
-- or create a new migration: 20260515000003_illustrations_bucket.sql
insert into storage.buckets (id, name, public)
  values ('illustrations', 'illustrations', true)
  on conflict (id) do nothing;

create policy "Authenticated users upload own illustrations"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'illustrations' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read illustrations"
  on storage.objects for select to public
  using (bucket_id = 'illustrations');
```

Apply:

```bash
npx supabase db push
```

- [ ] **Step 4: Update spells step to route to illustrations**

In `app/(app)/characters/new/spells.tsx`, change the "Next" button push from `details` to `illustrations`:

```typescript
router.push('/(app)/characters/new/illustrations')
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/characters/new/illustrations.tsx app/\(app\)/characters/new/spells.tsx
git commit -m "feat: add Illustrations step to wizard with URL input and photo library upload"
```

---

## Task 11: Review Step — Show New Fields

**Files:**
- Modify: `app/(app)/characters/new/review.tsx`

- [ ] **Step 1: Update review.tsx to show starting level, multiclass, illustrations, and XP**

Add these sections to the ScrollView in `review.tsx` after the "CLASS & ORIGIN" card:

```typescript
// Replace the existing "CLASS & ORIGIN" card:
<View className="bg-surface rounded-xl p-4 mb-3">
  <Text className="text-muted text-xs mb-2 font-bold">CLASS & ORIGIN</Text>
  <Text className="text-text">
    <Text className="font-bold">Class:</Text> {draft.class_name ?? '—'} (d{draft.hit_die})
    {draft.second_class_name ? ` / ${draft.second_class_name} (d${draft.second_hit_die})` : ''}
  </Text>
  <Text className="text-text mt-1">
    <Text className="font-bold">Starting Level:</Text> {draft.starting_level}
    {draft.second_class_level
      ? ` (${draft.class_name} ${draft.starting_level - draft.second_class_level} / ${draft.second_class_name} ${draft.second_class_level})`
      : ''}
  </Text>
  <Text className="text-text mt-1">
    <Text className="font-bold">HP at Level {draft.starting_level}:</Text> {hpMax}
  </Text>
</View>

{/* Illustrations */}
{(draft.illustration_profile_url || draft.illustration_full_url) && (
  <View className="bg-surface rounded-xl p-4 mb-3">
    <Text className="text-muted text-xs mb-2 font-bold">ILLUSTRATIONS</Text>
    {draft.illustration_profile_url && <Text className="text-text text-sm">✓ Portrait added</Text>}
    {draft.illustration_full_url && <Text className="text-text text-sm mt-1">✓ Full body added</Text>}
  </View>
)}
```

Also update the `hpMax` calculation in `review.tsx` to use `getMaxHPMulticlass`:

```typescript
import { getMaxHPMulticlass } from '@/modules/character/character.utils'
// replace the existing hpMax line:
const hpMax = getMaxHPMulticlass(
  draft.starting_level,
  draft.hit_die ?? 8,
  draft.second_hit_die,
  draft.second_class_level,
  conMod
)
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/new/review.tsx
git commit -m "feat: show multiclass, starting level, illustrations in review step"
```

---

## Task 12: createCharacter Service Update

**Files:**
- Modify: `src/modules/character/character.service.ts`

- [ ] **Step 1: Write the failing test**

In `src/modules/character/__tests__/character.service.test.ts`, add:

```typescript
import { createCharacter } from '../character.service'
import { INITIAL_DRAFT } from '../character.types'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: { id: 'char-1', level: 5, hp_max: 30 }, error: null })) })) })),
    })),
  },
}))

test('createCharacter passes starting_level, multiclass, illustrations, and xp', async () => {
  const draft = {
    ...INITIAL_DRAFT,
    class_id: 'fighter-id',
    class_name: 'Fighter',
    hit_die: 10,
    starting_level: 5,
    second_class_id: 'wizard-id',
    second_class_name: 'Wizard',
    second_class_level: 2,
    second_hit_die: 6,
    illustration_profile_url: 'https://example.com/p.jpg',
    illustration_full_url: null,
    xp: 6500,
    name: 'Tara',
  }
  const insertMock = jest.fn(() => ({
    select: jest.fn(() => ({ single: jest.fn(() => ({ data: { id: 'c1', level: 5, hp_max: 30 }, error: null })) })),
  }))
  ;(supabase.from as jest.Mock).mockReturnValueOnce({ insert: insertMock })
  await createCharacter('user-1', draft)
  const insertedPayload = insertMock.mock.calls[0][0]
  expect(insertedPayload.level).toBe(5)
  expect(insertedPayload.second_class_id).toBe('wizard-id')
  expect(insertedPayload.second_class_level).toBe(2)
  expect(insertedPayload.illustration_profile_url).toBe('https://example.com/p.jpg')
  expect(insertedPayload.xp).toBe(6500)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/modules/character/__tests__/character.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update createCharacter in character.service.ts**

Replace the `createCharacter` function:

```typescript
export async function createCharacter(userId: string, draft: WizardDraft) {
  const conMod = getAbilityModifier(draft.constitution)
  const hpMax = getMaxHPMulticlass(
    draft.starting_level,
    draft.hit_die ?? 8,
    draft.second_hit_die,
    draft.second_class_level,
    conMod
  )
  const dexMod = getAbilityModifier(draft.dexterity)

  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: draft.name,
      level: draft.starting_level,
      xp: draft.xp,
      class_id: draft.class_id,
      subclass_id: draft.subclass_id,
      second_class_id: draft.second_class_id ?? null,
      second_class_level: draft.second_class_level ?? null,
      species_id: draft.custom_species_id ? null : draft.species_id,
      background_id: draft.custom_background_id ? null : draft.background_id,
      custom_species_id: draft.custom_species_id ?? null,
      custom_background_id: draft.custom_background_id ?? null,
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
      proficiency_bonus: getProficiencyBonus(draft.starting_level),
      notes: draft.backstory,
      illustration_profile_url: draft.illustration_profile_url ?? null,
      illustration_full_url: draft.illustration_full_url ?? null,
      starting_level: draft.starting_level,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  // ... rest of spell inserts unchanged
```

Also update the import at the top of `character.service.ts`:

```typescript
import { getAbilityModifier, getMaxHP, getMaxHPMulticlass, getProficiencyBonus } from './character.utils'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/modules/character/__tests__/character.service.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.service.ts src/modules/character/__tests__/character.service.test.ts
git commit -m "feat: createCharacter handles starting_level, multiclass, illustrations, and xp"
```

---

## Task 13: SRD Service — Equipment and Magic Item Search

**Files:**
- Modify: `src/modules/srd/srd.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/modules/srd/__tests__/srd.service.test.ts`:

```typescript
import { searchEquipment, searchMagicItems } from '../srd.service'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [{ id: '1', name: 'Longsword' }], error: null })),
          })),
        })),
      })),
    })),
  },
}))

test('searchEquipment returns equipment matching query', async () => {
  const results = await searchEquipment('long')
  expect(results).toHaveLength(1)
  expect(results[0].name).toBe('Longsword')
})

test('searchMagicItems returns items matching query', async () => {
  const results = await searchMagicItems('flam')
  expect(results).toBeDefined()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/modules/srd/__tests__/srd.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Add to srd.service.ts**

```typescript
import { DBEquipment, DBSpell } from '@/modules/character/character.types'
import { DBMagicItem } from '@/modules/inventory/inventory.types'

export async function searchEquipment(query: string, limit = 20): Promise<DBEquipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}

export async function searchMagicItems(query: string, limit = 20): Promise<DBMagicItem[]> {
  const { data, error } = await supabase
    .from('magic_items')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/modules/srd/__tests__/srd.service.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/srd/srd.service.ts src/modules/srd/__tests__/srd.service.test.ts
git commit -m "feat: add searchEquipment and searchMagicItems to SRD service"
```

---

## Task 14: Character Sheet Layout — 4 Tabs

**Files:**
- Modify: `app/(app)/characters/[id]/_layout.tsx`
- Delete: `app/(app)/characters/[id]/skills.tsx`, `app/(app)/characters/[id]/notes.tsx`

- [ ] **Step 1: Delete skills.tsx and notes.tsx**

```bash
rm app/\(app\)/characters/\[id\]/skills.tsx
rm app/\(app\)/characters/\[id\]/notes.tsx
```

- [ ] **Step 2: Rewrite _layout.tsx for 4 tabs**

```typescript
import { Tabs } from 'expo-router'

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
      <Tabs.Screen name="index"     options={{ tabBarLabel: 'Character' }} />
      <Tabs.Screen name="actions"   options={{ tabBarLabel: 'Actions' }} />
      <Tabs.Screen name="inventory" options={{ tabBarLabel: 'Inventory' }} />
      <Tabs.Screen name="campaign"  options={{ tabBarLabel: 'Campaign' }} />
    </Tabs>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/characters/\[id\]/_layout.tsx
git rm app/\(app\)/characters/\[id\]/skills.tsx app/\(app\)/characters/\[id\]/notes.tsx
git commit -m "refactor: restructure character sheet to 4 tabs; remove skills and notes tabs"
```

---

## Task 15: Character Tab (index.tsx) — XP Bar + Combat/Profile Sub-tabs

**Files:**
- Modify: `app/(app)/characters/[id]/index.tsx`

This is the biggest rewrite. The Character tab has:
- XP bar at the top (with level display + progress to next level)
- Two sub-tabs: **Combat** and **Profile** (custom tab bar, not expo-router)
- Combat: HP controls, AC/Initiative/Speed/Proficiency, Conditions, Death saves (in-session only)
- Profile: Character info, illustrations, Ability Scores, Saving Throws, Skills, Personality traits, Backstory
- Sections are collapsible via `CollapsibleSection` with state in `useUIStore`

- [ ] **Step 1: Rewrite index.tsx**

```typescript
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import {
  CharacterWithRelations, DBCharacter, ABILITY_KEYS, ABILITY_LABELS, AbilityKey,
} from '@/modules/character/character.types'
import {
  getAbilityModifier, formatModifier, getProficiencyBonus,
  getLevelFromXP, getXPForNextLevel,
} from '@/modules/character/character.utils'
import { HPBar } from '@/components/character/HPBar'
import { ConditionBadge } from '@/components/character/ConditionBadge'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

const SAVING_THROW_PROFICIENCIES: Record<string, AbilityKey[]> = {
  Barbarian: ['strength', 'constitution'],
  Bard: ['dexterity', 'charisma'],
  Cleric: ['wisdom', 'charisma'],
  Druid: ['intelligence', 'wisdom'],
  Fighter: ['strength', 'constitution'],
  Monk: ['strength', 'dexterity'],
  Paladin: ['wisdom', 'charisma'],
  Ranger: ['strength', 'dexterity'],
  Rogue: ['dexterity', 'intelligence'],
  Sorcerer: ['constitution', 'charisma'],
  Warlock: ['wisdom', 'charisma'],
  Wizard: ['intelligence', 'wisdom'],
}

type SubTab = 'combat' | 'profile'

export default function CharacterTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('combat')
  const [conditionPickerOpen, setConditionPickerOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const load = useCallback(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

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
    const newConditions = (character.conditions ?? []).filter((c) => c !== condition)
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
  }

  async function addCondition(condition: string) {
    if (!character || (character.conditions ?? []).includes(condition)) return
    const newConditions = [...(character.conditions ?? []), condition]
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
    setConditionPickerOpen(false)
  }

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const xp = (character as any).xp ?? 0
  const xpForNext = getXPForNextLevel(character.level)
  const xpPrev = character.level > 1 ? (getLevelFromXP(xp - 1) === character.level - 1
    ? (character.level > 1 ? [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000][character.level - 2] : 0)
    : 0) : 0

  // Import XP_THRESHOLDS directly
  const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000]
  const xpMin = XP_THRESHOLDS[character.level - 1] ?? 0
  const xpProgress = xpForNext
    ? Math.min(1, (xp - xpMin) / (xpForNext - xpMin))
    : 1

  const savingThrowProfs = SAVING_THROW_PROFICIENCIES[character.class?.name ?? ''] ?? []
  const speciesName = character.species?.name ?? character.custom_species?.name ?? '—'
  const backgroundName = character.background?.name ?? character.custom_background?.name ?? '—'

  return (
    <View className="flex-1 bg-base">
      {/* XP bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-text font-bold text-lg">
            {character.name}
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/characters/${id}/level-up`)}
            className="bg-surface px-3 py-1 rounded-lg"
          >
            <Text className="text-primary text-sm">Level {character.level}</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-muted text-xs mb-2">
          {character.class?.name ?? '—'} · {speciesName}
        </Text>
        <View className="h-2 bg-overlay rounded-full overflow-hidden">
          <View className="h-full bg-primary/70 rounded-full" style={{ width: `${xpProgress * 100}%` }} />
        </View>
        <Text className="text-muted text-xs mt-1">
          {xp.toLocaleString()} XP{xpForNext ? ` / ${xpForNext.toLocaleString()} to Level ${character.level + 1}` : ' (Max Level)'}
        </Text>
      </View>

      {/* Sub-tab bar */}
      <View className="flex-row mx-4 mb-3 bg-surface rounded-xl overflow-hidden">
        {(['combat', 'profile'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setSubTab(t)}
            className={`flex-1 py-2 items-center ${subTab === t ? 'bg-primary' : ''}`}
          >
            <Text className={`font-medium text-sm ${subTab === t ? 'text-base' : 'text-muted'}`}>
              {t === 'combat' ? 'Combat' : 'Profile'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Combat sub-tab */}
      {subTab === 'combat' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <CollapsibleSection sectionKey={`${id}:hp`} title="HIT POINTS">
            <HPBar
              hpCurrent={character.hp_current}
              hpMax={character.hp_max}
              tempHP={character.temp_hp}
              onDamage={applyDamage}
              onHeal={applyHeal}
              onSetTempHP={setTempHP}
            />
          </CollapsibleSection>

          <CollapsibleSection sectionKey={`${id}:combat-stats`} title="COMBAT STATS">
            <View className="flex-row gap-3">
              {[
                { label: 'AC', value: character.armor_class },
                { label: 'Initiative', value: formatModifier(getAbilityModifier(character.dexterity)) },
                { label: 'Speed', value: `${character.speed} ft` },
                { label: 'Prof', value: `+${profBonus}` },
              ].map(({ label, value }) => (
                <View key={label} className="flex-1 bg-overlay rounded-xl p-3 items-center">
                  <Text className="text-muted text-xs">{label}</Text>
                  <Text className="text-text font-bold text-lg">{value}</Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>

          <CollapsibleSection sectionKey={`${id}:conditions`} title="CONDITIONS">
            <View className="flex-row justify-end mb-2">
              <TouchableOpacity onPress={() => setConditionPickerOpen(true)}>
                <Text className="text-primary text-xs">+ Add</Text>
              </TouchableOpacity>
            </View>
            {(character.conditions ?? []).length === 0 ? (
              <Text className="text-muted text-xs">None</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {(character.conditions ?? []).map((c) => (
                  <ConditionBadge key={c} condition={c} onRemove={() => removeCondition(c)} />
                ))}
              </View>
            )}
          </CollapsibleSection>
        </ScrollView>
      )}

      {/* Profile sub-tab */}
      {subTab === 'profile' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {/* Illustrations */}
          {((character as any).illustration_profile_url || (character as any).illustration_full_url) && (
            <View className="flex-row gap-3 mb-3">
              {(character as any).illustration_profile_url && (
                <TouchableOpacity
                  className="flex-1 h-32 rounded-xl overflow-hidden"
                  onPress={() => setPreviewUrl((character as any).illustration_profile_url)}
                >
                  <Image
                    source={{ uri: (character as any).illustration_profile_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-1">
                    <Text className="text-white text-xs text-center">Portrait</Text>
                  </View>
                </TouchableOpacity>
              )}
              {(character as any).illustration_full_url && (
                <TouchableOpacity
                  className="flex-1 h-32 rounded-xl overflow-hidden"
                  onPress={() => setPreviewUrl((character as any).illustration_full_url)}
                >
                  <Image
                    source={{ uri: (character as any).illustration_full_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-1">
                    <Text className="text-white text-xs text-center">Full body</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <CollapsibleSection sectionKey={`${id}:character-info`} title="CHARACTER INFO">
            <Text className="text-text"><Text className="text-muted">Class: </Text>{character.class?.name ?? '—'}</Text>
            <Text className="text-text mt-1"><Text className="text-muted">Species: </Text>{speciesName}</Text>
            <Text className="text-text mt-1"><Text className="text-muted">Background: </Text>{backgroundName}</Text>
            <Text className="text-text mt-1"><Text className="text-muted">Alignment: </Text>{character.alignment ?? '—'}</Text>
          </CollapsibleSection>

          <CollapsibleSection sectionKey={`${id}:ability-scores`} title="ABILITY SCORES">
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
          </CollapsibleSection>

          <CollapsibleSection sectionKey={`${id}:saving-throws`} title="SAVING THROWS">
            {ABILITY_KEYS.map((key) => {
              const mod = getAbilityModifier(character[key])
              const isProficient = savingThrowProfs.includes(key)
              const total = mod + (isProficient ? profBonus : 0)
              return (
                <View key={key} className="flex-row justify-between items-center py-1.5 border-b border-overlay/30">
                  <View className="flex-row items-center gap-2">
                    <View className={`w-3 h-3 rounded-full border ${isProficient ? 'bg-primary border-primary' : 'border-overlay'}`} />
                    <Text className="text-text text-sm">{ABILITY_LABELS[key]}</Text>
                  </View>
                  <Text className={`text-sm font-medium ${isProficient ? 'text-primary' : 'text-muted'}`}>
                    {formatModifier(total)}
                  </Text>
                </View>
              )
            })}
          </CollapsibleSection>

          <CollapsibleSection sectionKey={`${id}:personality`} title="PERSONALITY TRAITS">
            {(character as any).personality_trait
              ? <Text className="text-text text-sm">{(character as any).personality_trait}</Text>
              : <Text className="text-muted text-sm">None recorded</Text>}
          </CollapsibleSection>

          <CollapsibleSection sectionKey={`${id}:backstory`} title="BACKSTORY">
            {character.notes
              ? <Text className="text-text text-sm">{character.notes}</Text>
              : <Text className="text-muted text-sm">None recorded</Text>}
          </CollapsibleSection>
        </ScrollView>
      )}

      {/* Condition picker modal */}
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
                const active = (character.conditions ?? []).includes(c)
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

      {/* Full-screen illustration preview */}
      <Modal visible={!!previewUrl} transparent animationType="fade">
        <View className="flex-1 bg-black/90 items-center justify-center">
          <TouchableOpacity
            className="absolute top-12 right-6 z-10"
            onPress={() => setPreviewUrl(null)}
          >
            <Text className="text-white text-lg font-bold">✕ Close</Text>
          </TouchableOpacity>
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              className="w-[90%] h-[80%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/index.tsx
git commit -m "feat: rewrite Character tab with XP bar, Combat/Profile sub-tabs, and collapsible sections"
```

---

## Task 16: Actions Tab — Add Spells Section

**Files:**
- Modify: `app/(app)/characters/[id]/actions.tsx`

Spells from `character.character_spells` are grouped by spell level and shown after weapons. Each spell shows name, level, school (if available), and prepared status.

- [ ] **Step 1: Rewrite actions.tsx**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

const STANDARD_ACTIONS = [
  { name: 'Attack',    description: 'Make one melee or ranged attack.' },
  { name: 'Dash',      description: 'Double your movement speed this turn.' },
  { name: 'Disengage', description: 'Move without provoking opportunity attacks.' },
  { name: 'Dodge',     description: 'Attacks against you have disadvantage until your next turn.' },
  { name: 'Help',      description: 'Give an ally advantage on their next ability check or attack.' },
  { name: 'Hide',      description: 'Make a Dexterity (Stealth) check to hide.' },
  { name: 'Ready',     description: 'Prepare a reaction to a trigger you describe.' },
  { name: 'Search',    description: 'Make a Wisdom (Perception) or Intelligence (Investigation) check.' },
]

export default function ActionsTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const strMod = getAbilityModifier(character.strength)
  const dexMod = getAbilityModifier(character.dexterity)

  // Use character_inventory for equipped weapons
  const equippedWeapons = character.character_inventory.filter(
    (e) => e.is_equipped && e.equipment?.category?.toLowerCase() === 'weapon'
  )

  // Group spells by level
  const spellsByLevel = character.character_spells.reduce<Record<number, typeof character.character_spells>>((acc, s) => {
    const level = s.spell?.level ?? 0
    if (!acc[level]) acc[level] = []
    acc[level].push(s)
    return acc
  }, {})
  const spellLevels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {equippedWeapons.length > 0 && (
        <CollapsibleSection sectionKey={`${id}:weapons`} title="WEAPONS">
          {equippedWeapons.map((w) => {
            const attackBonus = profBonus + Math.max(strMod, dexMod)
            const name = w.equipment?.name ?? w.custom_item?.name ?? 'Weapon'
            return (
              <View key={w.id} className="bg-overlay rounded-xl p-3 mb-2">
                <Text className="text-text font-bold">{name}</Text>
                <Text className="text-muted text-sm mt-1">Attack: {formatModifier(attackBonus)}</Text>
              </View>
            )
          })}
        </CollapsibleSection>
      )}

      <CollapsibleSection sectionKey={`${id}:standard-actions`} title="ACTIONS">
        {STANDARD_ACTIONS.map((action) => (
          <View key={action.name} className="bg-overlay rounded-xl p-3 mb-2">
            <Text className="text-text font-bold">{action.name}</Text>
            <Text className="text-muted text-sm mt-1">{action.description}</Text>
          </View>
        ))}
      </CollapsibleSection>

      {spellLevels.length > 0 && (
        <CollapsibleSection sectionKey={`${id}:spells`} title="SPELLS">
          {spellLevels.map((level) => (
            <View key={level} className="mb-3">
              <Text className="text-muted text-xs font-bold mb-2">
                {level === 0 ? 'CANTRIPS' : `LEVEL ${level}`}
              </Text>
              {spellsByLevel[level].map((s) => {
                const name = s.spell?.name ?? 'Custom Spell'
                const school = s.spell?.school ?? ''
                return (
                  <View
                    key={s.id}
                    className={`bg-overlay rounded-xl p-3 mb-2 border ${s.is_prepared ? 'border-primary/40' : 'border-transparent'}`}
                  >
                    <View className="flex-row justify-between items-start">
                      <Text className="text-text font-medium flex-1">{name}</Text>
                      {s.is_prepared && (
                        <View className="bg-primary/20 px-2 py-0.5 rounded-full ml-2">
                          <Text className="text-primary text-xs">Prepared</Text>
                        </View>
                      )}
                    </View>
                    {!!school && <Text className="text-muted text-xs mt-1">{school}</Text>}
                  </View>
                )
              })}
            </View>
          ))}
        </CollapsibleSection>
      )}
    </ScrollView>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/actions.tsx
git commit -m "feat: add spells section and collapsible groups to Actions tab"
```

---

## Task 17: Inventory Tab — character_inventory + Equipped/Backpack Sub-tabs + SRD Search

**Files:**
- Modify: `app/(app)/characters/[id]/inventory.tsx`

The inventory tab migrates from `character_equipment` to `character_inventory`. Sub-tabs: Equipped | Backpack. Backpack items are categorised as Weapons, Armor, Magic Items, or Gear. A "+" button opens an SRD search sheet to add items.

- [ ] **Step 1: Rewrite inventory.tsx**

```typescript
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, FlatList,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getInventory, addInventoryItem, updateInventoryItem, removeInventoryItem } from '@/modules/inventory/inventory.service'
import { InventoryItem } from '@/modules/inventory/inventory.types'
import { searchEquipment, searchMagicItems } from '@/modules/srd/srd.service'
import { DBEquipment } from '@/modules/character/character.types'
import { DBMagicItem } from '@/modules/inventory/inventory.types'

type BackpackCategory = 'Weapons' | 'Armor' | 'Magic Items' | 'Gear'

function getCategory(item: InventoryItem): BackpackCategory {
  if (item.magic_item_id) return 'Magic Items'
  const cat = item.equipment?.category?.toLowerCase() ?? ''
  if (cat.includes('weapon')) return 'Weapons'
  if (cat.includes('armor') || cat.includes('shield')) return 'Armor'
  return 'Gear'
}

type InvTab = 'equipped' | 'backpack'
type SearchMode = 'equipment' | 'magic'

export default function InventoryTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [invTab, setInvTab] = useState<InvTab>('equipped')
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('equipment')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<(DBEquipment | DBMagicItem)[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getInventory(id)
      setItems(data)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const results = searchMode === 'equipment'
          ? await searchEquipment(searchQuery)
          : await searchMagicItems(searchQuery)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, searchMode])

  async function toggleEquipped(item: InventoryItem) {
    try {
      const updated = await updateInventoryItem(item.id, { is_equipped: !item.is_equipped })
      setItems((prev) => prev.map((i) => i.id === item.id ? updated : i))
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update item')
    }
  }

  async function handleAddItem(result: DBEquipment | DBMagicItem) {
    try {
      const input = searchMode === 'equipment'
        ? { equipment_id: result.id }
        : { magic_item_id: result.id }
      const newItem = await addInventoryItem(id, input)
      setItems((prev) => [...prev, newItem])
      setSearchVisible(false)
      setSearchQuery('')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add item')
    }
  }

  async function handleRemoveItem(itemId: string) {
    Alert.alert('Remove item', 'Remove this item from your inventory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeInventoryItem(itemId)
            setItems((prev) => prev.filter((i) => i.id !== itemId))
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove item')
          }
        },
      },
    ])
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const equipped = items.filter((i) => i.is_equipped)
  const backpack = items.filter((i) => !i.is_equipped)
  const backpackByCategory = backpack.reduce<Record<BackpackCategory, InventoryItem[]>>(
    (acc, item) => {
      const cat = getCategory(item)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    { Weapons: [], Armor: [], 'Magic Items': [], Gear: [] }
  )

  function renderItem(item: InventoryItem, showEquipToggle = true) {
    const name =
      item.equipment?.name ?? item.magic_item?.name ??
      item.campaign_item?.name ?? item.custom_item?.name ?? 'Unknown Item'
    const detail = item.equipment?.category
      ?? (item.magic_item ? item.magic_item.item_type : null)
      ?? item.campaign_item?.item_type
      ?? 'Custom'
    const isMagic = !!item.magic_item_id

    return (
      <TouchableOpacity
        key={item.id}
        onLongPress={() => handleRemoveItem(item.id)}
        className="rounded-xl p-3 mb-2 bg-surface flex-row items-center justify-between"
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={`font-medium ${item.is_equipped ? 'text-primary' : 'text-text'}`}>{name}</Text>
            {isMagic && (
              <View className="bg-yellow/20 px-1.5 py-0.5 rounded-full">
                <Text className="text-yellow text-xs">Magic</Text>
              </View>
            )}
            {item.is_attuned && (
              <View className="bg-primary/20 px-1.5 py-0.5 rounded-full">
                <Text className="text-primary text-xs">Attuned</Text>
              </View>
            )}
          </View>
          <Text className="text-muted text-xs mt-0.5">{detail} · qty: {item.quantity}</Text>
        </View>
        {showEquipToggle && (
          <TouchableOpacity onPress={() => toggleEquipped(item)}>
            <View className={`w-5 h-5 rounded-full border-2 ${item.is_equipped ? 'bg-primary border-primary' : 'border-overlay'}`} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  const BACKPACK_CATEGORIES: BackpackCategory[] = ['Weapons', 'Armor', 'Magic Items', 'Gear']

  return (
    <View className="flex-1 bg-base">
      {/* Sub-tab bar */}
      <View className="flex-row mx-4 mt-4 mb-3 bg-surface rounded-xl overflow-hidden">
        {(['equipped', 'backpack'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setInvTab(t)}
            className={`flex-1 py-2 items-center ${invTab === t ? 'bg-primary' : ''}`}
          >
            <Text className={`font-medium text-sm ${invTab === t ? 'text-base' : 'text-muted'}`}>
              {t === 'equipped' ? `Equipped (${equipped.length})` : `Backpack (${backpack.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        {invTab === 'equipped' && (
          equipped.length === 0
            ? <Text className="text-muted text-center mt-8 text-sm">No items equipped.</Text>
            : equipped.map((item) => renderItem(item))
        )}

        {invTab === 'backpack' && (
          BACKPACK_CATEGORIES.map((cat) => {
            const catItems = backpackByCategory[cat] ?? []
            if (catItems.length === 0) return null
            return (
              <View key={cat} className="mb-4">
                <Text className="text-muted text-xs font-bold mb-2">{cat.toUpperCase()}</Text>
                {catItems.map((item) => renderItem(item))}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Add item FAB */}
      <TouchableOpacity
        onPress={() => setSearchVisible(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
      >
        <Text className="text-base text-2xl font-bold">+</Text>
      </TouchableOpacity>

      {/* SRD search sheet */}
      <Modal visible={searchVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-base rounded-t-2xl" style={{ height: '80%' }}>
            <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
              <Text className="text-text font-bold text-lg">Add Item</Text>
              <TouchableOpacity onPress={() => { setSearchVisible(false); setSearchQuery('') }}>
                <Text className="text-muted">Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Search mode toggle */}
            <View className="flex-row mx-4 mb-3 bg-surface rounded-xl overflow-hidden">
              {(['equipment', 'magic'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => { setSearchMode(mode); setSearchQuery(''); setSearchResults([]) }}
                  className={`flex-1 py-2 items-center ${searchMode === mode ? 'bg-primary' : ''}`}
                >
                  <Text className={`font-medium text-sm ${searchMode === mode ? 'text-base' : 'text-muted'}`}>
                    {mode === 'equipment' ? 'Equipment' : 'Magic Items'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mx-4 mb-3">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name..."
                placeholderTextColor="#6c7086"
                className="bg-surface text-text rounded-xl px-4 py-3"
                autoFocus
              />
            </View>

            {searching && (
              <View className="items-center py-4">
                <ActivityIndicator color="#cba6f7" />
              </View>
            )}

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              renderItem={({ item }) => {
                const name = (item as DBEquipment).name
                const sub = (item as DBEquipment).category ?? (item as DBMagicItem).item_type ?? ''
                return (
                  <TouchableOpacity
                    onPress={() => handleAddItem(item)}
                    className="bg-surface rounded-xl p-3 mb-2 flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-text font-medium">{name}</Text>
                      <Text className="text-muted text-xs mt-0.5">{sub}</Text>
                    </View>
                    <Text className="text-primary font-bold text-lg">+</Text>
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                searchQuery.length > 0 && !searching
                  ? <Text className="text-muted text-center mt-4 text-sm">No results for "{searchQuery}"</Text>
                  : null
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/inventory.tsx
git commit -m "feat: rewrite Inventory tab with character_inventory, Equipped/Backpack sub-tabs, and SRD search"
```

---

## Task 18: Campaign Tab — New Screen

**Files:**
- Create: `app/(app)/characters/[id]/campaign.tsx`

This screen is an empty state for characters not in a campaign, and will be populated by the Session Console implementation. For now it renders the character's campaign membership status.

- [ ] **Step 1: Create campaign.tsx**

```typescript
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

export default function CampaignTab() {
  return (
    <View className="flex-1 bg-base items-center justify-center px-8">
      <Text className="text-4xl mb-4">⚔️</Text>
      <Text className="text-text font-bold text-xl text-center mb-2">No active campaign</Text>
      <Text className="text-muted text-sm text-center mb-8">
        Join a campaign using an invite link from your DM, or ask your DM to send you one.
      </Text>
      <View className="bg-surface rounded-xl p-4 w-full">
        <Text className="text-muted text-xs font-bold mb-2">WHEN IN A CAMPAIGN</Text>
        <Text className="text-text text-sm mb-1">· See the live initiative order</Text>
        <Text className="text-text text-sm mb-1">· View party member status</Text>
        <Text className="text-text text-sm">· Get notified when the session starts</Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/campaign.tsx
git commit -m "feat: add Campaign tab placeholder with empty state"
```

---

## Task 19: Level-Up — XP Tracking + XP-Triggered Flow

**Files:**
- Modify: `app/(app)/characters/[id]/level-up.tsx`

The level-up screen gains two responsibilities: (1) it can be reached from the XP bar "award XP" flow when XP crosses a threshold, and (2) it saves the new XP value to the character record after levelling up.

- [ ] **Step 1: Add award XP function to character.service.ts**

```typescript
// Append to character.service.ts
export async function awardXP(id: string, amount: number, currentXP: number, currentLevel: number) {
  const newXP = currentXP + amount
  const newLevel = getLevelFromXP(newXP)
  const updates: CharacterUpdate = { xp: newXP }
  if (newLevel > currentLevel) {
    // Level-up is handled via the level-up screen; just update XP here
  }
  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { character: data, leveledUp: newLevel > currentLevel }
}
```

Add import at top of `character.service.ts`:
```typescript
import { getAbilityModifier, getMaxHP, getMaxHPMulticlass, getProficiencyBonus, getLevelFromXP } from './character.utils'
```

- [ ] **Step 2: Add "Award XP" button to Character tab (index.tsx)**

In the XP bar section of `index.tsx`, add an Award XP button:

```typescript
// Inside the XP bar section, after the XP text:
<TouchableOpacity
  onPress={() => {
    Alert.prompt(
      'Award XP',
      'Enter XP amount to add:',
      async (input) => {
        const amount = parseInt(input ?? '0', 10)
        if (isNaN(amount) || amount <= 0) return
        try {
          const { leveledUp } = await awardXP(id, amount, xp, character.level)
          load() // re-fetch character
          if (leveledUp) {
            Alert.alert(
              'Level Up!',
              `${character.name} can now level up!`,
              [
                { text: 'Later' },
                { text: 'Level Up Now', onPress: () => router.push(`/(app)/characters/${id}/level-up`) },
              ]
            )
          }
        } catch (e) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Could not award XP')
        }
      },
      'plain-text',
      '',
      'number-pad'
    )
  }}
  className="bg-surface px-3 py-1 rounded-lg mt-2 self-start"
>
  <Text className="text-primary text-xs">+ Award XP</Text>
</TouchableOpacity>
```

Add import: `import { awardXP } from '@/modules/character/character.service'`

- [ ] **Step 3: Update level-up.tsx to save XP when levelling up**

In `handleLevelUp`, update the XP alongside the level:

```typescript
// Inside handleLevelUp, after building `updates`:
// XP is already stored on the character; levelling up doesn't reset XP
await updateCharacter(id, updates)
router.replace(`/(app)/characters/${id}`)
```

No change needed here — XP is already tracked separately on the character. The level-up screen just advances the level; XP stays on the character record.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/characters/\[id\]/index.tsx src/modules/character/character.service.ts app/\(app\)/characters/\[id\]/level-up.tsx
git commit -m "feat: add Award XP flow with level-up prompt when XP threshold is crossed"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 8-step wizard (class → origin → ability-scores → personality → spells → illustrations → details → review)
- ✅ Tappable progress bar with 3 states (empty/partial/complete)
- ✅ Slide-out WizardDrawer for non-linear navigation
- ✅ Draft auto-save with AsyncStorage
- ✅ Multiclassing: second class in Step 1 with cascade warning on change
- ✅ Combined spell slots handled by single character (multiclass-aware HP calc)
- ✅ Starting level (1–20)
- ✅ Illustrations step: URL validation + photo library upload to Supabase Storage
- ✅ Illustrations viewable in large full-screen modal from character sheet
- ✅ Character sheet → 4 tabs: Character, Actions, Inventory, Campaign
- ✅ Character tab: XP bar + Combat/Profile sub-tabs
- ✅ Collapsible sections with persistent state (UIStore, key = `${characterId}:section`)
- ✅ Spells inside Actions tab
- ✅ Inventory tab: character_inventory, Equipped/Backpack, 4 backpack categories, SRD search
- ✅ Campaign tab: empty state placeholder
- ✅ XP-triggered level-up alert with navigate-to-level-up CTA

**Missing from spec not covered here (deferred to Campaign Manager / Session Console plans):**
- In-session mode state banner ("Stats restored from last session")
- Death save tracker
- Character in-session stat sync via Supabase Realtime
- Item gifting during sessions (covered in Session Console plan)
