# Custom Content Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to create private custom species, backgrounds, spells, subclasses, feats, and equipment that appear alongside SRD options in character creation.

**Architecture:** A `user_content` module owns all CRUD against the existing `user_content` Supabase table. Adapter functions convert custom entries to SRD-compatible shapes, tagged with `is_custom: true`. Merged getter functions combine SRD + custom results; wizard steps call these instead of bare SRD functions. A new "Content" tab provides list/create/edit UI with a Stack navigator.

**Tech Stack:** Expo Router v3 (file-based routing, Stack), Supabase JS v2, TypeScript, NativeWind v4 (Catppuccin Mocha: bg-base, bg-surface, bg-overlay, text-text, text-muted, text-primary), Jest + @testing-library/react-native.

---

## File Map

**New files:**
- `src/modules/user_content/user_content.types.ts` — DBUserContent alias, per-type properties interfaces, WithCustom helper, CONTENT_TYPE_LABELS
- `src/modules/user_content/user_content.service.ts` — CRUD + adapters + merged getters (getSpeciesAll, getBackgroundsAll, getSpellsAll)
- `__tests__/modules/user_content/user_content.service.test.ts` — unit tests
- `app/(app)/content/_layout.tsx` — Stack navigator
- `app/(app)/content/index.tsx` — list grouped by type, delete on long-press
- `app/(app)/content/new.tsx` — type selector + dynamic form
- `app/(app)/content/[id].tsx` — pre-filled edit form + delete

**Modified files:**
- `app/(app)/_layout.tsx` — add Content tab
- `app/(app)/characters/new/origin.tsx` — use getBackgroundsAll + getSpeciesAll, show Custom badge
- `app/(app)/characters/new/spells.tsx` — use getSpellsAll, show Custom badge

---

## Task 1: User Content Types

**Files:**
- Create: `src/modules/user_content/user_content.types.ts`

- [ ] **Step 1: Create the types file**

Create `src/modules/user_content/user_content.types.ts`:

```typescript
import { Database } from '@/types/database.types'

export type DBUserContent = Database['public']['Tables']['user_content']['Row']
export type ContentType = DBUserContent['content_type']

export interface SubclassProperties {
  class_id: string
  features: string
}

export interface SpeciesProperties {
  speed: number
  traits: string[]
}

export interface BackgroundProperties {
  skill_proficiencies: string[]
  feature: string
}

export interface SpellProperties {
  level: number
  school: string
  casting_time: string
  range: string
  components: string
  duration: string
  classes: string[]
  is_ritual: boolean
  requires_concentration: boolean
}

export interface FeatProperties {
  prerequisites: string
  benefits: string
}

export interface EquipmentProperties {
  category: string
  cost: string
  weight: string
}

// Tags a SRD type with an optional is_custom marker for UI badge display.
export type WithCustom<T> = T & { is_custom?: boolean }

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  subclass:   'Subclass',
  spell:      'Spell',
  species:    'Species',
  background: 'Background',
  feat:       'Feat',
  equipment:  'Equipment',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/user_content/user_content.types.ts
git commit -m "feat: add user content types"
```

---

## Task 2: User Content Service Tests (TDD)

**Files:**
- Test: `__tests__/modules/user_content/user_content.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/user_content/user_content.service.test.ts`:

```typescript
import {
  getUserContent,
  createUserContent,
  updateUserContent,
  deleteUserContent,
  getSpeciesAll,
  getBackgroundsAll,
  getSpellsAll,
} from '@/modules/user_content/user_content.service'
import { ContentType } from '@/modules/user_content/user_content.types'

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
    })),
  },
}))

jest.mock('@/modules/srd/srd.service', () => ({
  getSpecies: jest.fn(),
  getBackgrounds: jest.fn(),
  getSpellsForClass: jest.fn(),
}))

import { supabase } from '@/lib/supabase'
import { getSpecies, getBackgrounds, getSpellsForClass } from '@/modules/srd/srd.service'

beforeEach(() => {
  jest.clearAllMocks()
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq, select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSingle.mockResolvedValue({ data: null, error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('getUserContent', () => {
  it('queries user_content filtered by user_id', async () => {
    await getUserContent('user-1')
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('throws when Supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getUserContent('user-1')).rejects.toThrow('DB error')
  })
})

describe('createUserContent', () => {
  it('inserts into user_content and returns the new row', async () => {
    const row = { id: 'uc1', user_id: 'user-1', content_type: 'spell' as ContentType, name: 'Fireball', description: null, properties: {}, created_at: '' }
    mockSingle.mockResolvedValue({ data: row, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })
    const result = await createUserContent('user-1', { content_type: 'spell', name: 'Fireball', description: null, properties: {} })
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(result.name).toBe('Fireball')
  })

  it('throws when insert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(
      createUserContent('user-1', { content_type: 'spell', name: 'Test', description: null, properties: {} })
    ).rejects.toThrow('Insert failed')
  })
})

describe('updateUserContent', () => {
  it('updates the record and returns the updated row', async () => {
    const row = { id: 'uc1', user_id: 'user-1', content_type: 'spell' as ContentType, name: 'Updated', description: null, properties: {}, created_at: '' }
    mockSingle.mockResolvedValue({ data: row, error: null })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq, order: mockOrder })
    mockSelect.mockReturnValue({ single: mockSingle })
    const result = await updateUserContent('uc1', { name: 'Updated', description: null, properties: {} })
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(result.name).toBe('Updated')
  })
})

describe('deleteUserContent', () => {
  it('calls delete on user_content with the id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await deleteUserContent('uc1')
    expect(supabase.from).toHaveBeenCalledWith('user_content')
    expect(mockEq).toHaveBeenCalledWith('id', 'uc1')
  })

  it('throws when delete fails', async () => {
    mockEq.mockResolvedValue({ error: { message: 'Delete failed' } })
    await expect(deleteUserContent('uc1')).rejects.toThrow('Delete failed')
  })
})

describe('getSpeciesAll', () => {
  it('merges SRD species with custom species', async () => {
    const srdSpecies = [{ id: 's1', name: 'Human', speed: 30, traits: {}, ability_score_bonuses: {} }]
    const customContent = [{
      id: 'uc1', user_id: 'user-1', content_type: 'species' as ContentType,
      name: 'Catfolk', description: 'A cat-like humanoid',
      properties: { speed: 35, traits: ['Darkvision'] }, created_at: '',
    }]
    ;(getSpecies as jest.Mock).mockResolvedValue(srdSpecies)
    mockOrder.mockResolvedValue({ data: customContent, error: null })

    const result = await getSpeciesAll('user-1')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Human')
    expect(result[0].is_custom).toBeFalsy()
    expect(result[1].name).toBe('Catfolk')
    expect(result[1].is_custom).toBe(true)
    expect(result[1].speed).toBe(35)
  })
})

describe('getBackgroundsAll', () => {
  it('merges SRD backgrounds with custom backgrounds', async () => {
    const srdBgs = [{ id: 'bg1', name: 'Acolyte', skill_proficiencies: ['Insight'], ability_score_options: {}, description: null, feature: null }]
    const customContent = [{
      id: 'uc2', user_id: 'user-1', content_type: 'background' as ContentType,
      name: 'Wanderer', description: null,
      properties: { skill_proficiencies: ['Survival', 'Athletics'], feature: 'Know the land' }, created_at: '',
    }]
    ;(getBackgrounds as jest.Mock).mockResolvedValue(srdBgs)
    mockOrder.mockResolvedValue({ data: customContent, error: null })

    const result = await getBackgroundsAll('user-1')
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('Wanderer')
    expect(result[1].is_custom).toBe(true)
    expect(result[1].skill_proficiencies).toEqual(['Survival', 'Athletics'])
  })
})

describe('getSpellsAll', () => {
  it('merges SRD spells with custom spells for the given class', async () => {
    const srdSpells = [{
      id: 'sp1', name: 'Magic Missile', level: 1, school: 'Evocation',
      casting_time: 'Action', range: '120 ft', components: 'V, S',
      duration: 'Instantaneous', description: '', classes: ['wizard'],
      is_ritual: false, requires_concentration: false,
    }]
    const allCustom = [
      {
        id: 'uc3', user_id: 'user-1', content_type: 'spell' as ContentType,
        name: 'Custom Bolt', description: 'A custom bolt',
        properties: { level: 2, school: 'Evocation', casting_time: 'Action', range: '60 ft', components: 'V', duration: 'Instantaneous', classes: ['wizard'], is_ritual: false, requires_concentration: false },
        created_at: '',
      },
      {
        id: 'uc4', user_id: 'user-1', content_type: 'species' as ContentType,
        name: 'Elf', description: null, properties: { speed: 30, traits: [] }, created_at: '',
      },
    ]
    ;(getSpellsForClass as jest.Mock).mockResolvedValue(srdSpells)
    mockOrder.mockResolvedValue({ data: allCustom, error: null })

    const result = await getSpellsAll('user-1', 'Wizard')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Magic Missile')
    expect(result[1].name).toBe('Custom Bolt')
    expect(result[1].is_custom).toBe(true)
  })

  it('excludes custom spells whose classes array does not include the requested class', async () => {
    const allCustom = [{
      id: 'uc5', user_id: 'user-1', content_type: 'spell' as ContentType,
      name: 'Cleric Only', description: null,
      properties: { level: 1, school: 'Divination', casting_time: 'Action', range: 'Self', components: 'V', duration: '1 minute', classes: ['cleric'], is_ritual: false, requires_concentration: false },
      created_at: '',
    }]
    ;(getSpellsForClass as jest.Mock).mockResolvedValue([])
    mockOrder.mockResolvedValue({ data: allCustom, error: null })

    const result = await getSpellsAll('user-1', 'Wizard')
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/modules/user_content/user_content.service.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/modules/user_content/user_content.service'"

- [ ] **Step 3: Commit**

```bash
git add __tests__/modules/user_content/user_content.service.test.ts
git commit -m "test: add failing tests for user content service"
```

---

## Task 3: User Content Service

**Files:**
- Create: `src/modules/user_content/user_content.service.ts`

- [ ] **Step 1: Create the service**

Create `src/modules/user_content/user_content.service.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { getSpecies, getBackgrounds, getSpellsForClass } from '@/modules/srd/srd.service'
import { DBSpecies, DBBackground, DBSpell } from '@/modules/character/character.types'
import {
  DBUserContent,
  WithCustom,
  SpeciesProperties,
  BackgroundProperties,
  SpellProperties,
} from './user_content.types'

export async function getUserContent(userId: string): Promise<DBUserContent[]> {
  const { data, error } = await supabase
    .from('user_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as DBUserContent[]
}

export async function createUserContent(
  userId: string,
  data: Pick<DBUserContent, 'content_type' | 'name' | 'description' | 'properties'>
): Promise<DBUserContent> {
  const { data: row, error } = await supabase
    .from('user_content')
    .insert({ ...data, user_id: userId } as DBUserContent)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as DBUserContent
}

export async function updateUserContent(
  id: string,
  data: Pick<DBUserContent, 'name' | 'description' | 'properties'>
): Promise<DBUserContent> {
  const { data: row, error } = await supabase
    .from('user_content')
    .update(data as DBUserContent)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as DBUserContent
}

export async function deleteUserContent(id: string): Promise<void> {
  const { error } = await supabase.from('user_content').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Adapters ---

function customToSpecies(item: DBUserContent): WithCustom<DBSpecies> {
  const props = item.properties as SpeciesProperties
  return {
    id: item.id,
    name: item.name,
    speed: props.speed ?? 30,
    traits: { traits: props.traits ?? [] },
    ability_score_bonuses: {},
    is_custom: true,
  }
}

function customToBackground(item: DBUserContent): WithCustom<DBBackground> {
  const props = item.properties as BackgroundProperties
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    skill_proficiencies: props.skill_proficiencies ?? [],
    // Allow all 6 abilities for the background +2/+1 bonus in the ability scores step.
    ability_score_options: { options: [['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']] },
    feature: props.feature ?? null,
    is_custom: true,
  }
}

function customToSpell(item: DBUserContent): WithCustom<DBSpell> {
  const props = item.properties as SpellProperties
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    level: props.level ?? 0,
    school: props.school ?? '',
    casting_time: props.casting_time ?? 'Action',
    range: props.range ?? '30 ft',
    components: props.components ?? 'V, S',
    duration: props.duration ?? 'Instantaneous',
    classes: props.classes ?? [],
    is_ritual: props.is_ritual ?? false,
    requires_concentration: props.requires_concentration ?? false,
    is_custom: true,
  }
}

// --- Merged getters ---

export async function getSpeciesAll(userId: string): Promise<WithCustom<DBSpecies>[]> {
  const [srdSpecies, customContent] = await Promise.all([getSpecies(), getUserContent(userId)])
  const customSpecies = customContent
    .filter((c) => c.content_type === 'species')
    .map(customToSpecies)
  return [...srdSpecies, ...customSpecies]
}

export async function getBackgroundsAll(userId: string): Promise<WithCustom<DBBackground>[]> {
  const [srdBgs, customContent] = await Promise.all([getBackgrounds(), getUserContent(userId)])
  const customBgs = customContent
    .filter((c) => c.content_type === 'background')
    .map(customToBackground)
  return [...srdBgs, ...customBgs]
}

export async function getSpellsAll(userId: string, className: string): Promise<WithCustom<DBSpell>[]> {
  const lowerName = className.toLowerCase()
  const [srdSpells, customContent] = await Promise.all([getSpellsForClass(className), getUserContent(userId)])
  const customSpells = customContent
    .filter((c) => c.content_type === 'spell')
    .filter((c) => {
      const props = c.properties as SpellProperties
      return (props.classes ?? []).map((cl) => cl.toLowerCase()).includes(lowerName)
    })
    .map(customToSpell)
  return [...srdSpells, ...customSpells]
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx jest __tests__/modules/user_content/user_content.service.test.ts --no-coverage
```

Expected: 12 tests PASS

- [ ] **Step 3: Run full suite to check for regressions**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/user_content/user_content.service.ts
git commit -m "feat: add user content service with CRUD and merged getters"
```

---

## Task 4: Content Tab + List Screen

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Create: `app/(app)/content/_layout.tsx`
- Create: `app/(app)/content/index.tsx`

- [ ] **Step 1: Add Content tab to app layout**

Replace `app/(app)/_layout.tsx` with:

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
      <Tabs.Screen
        name="content"
        options={{ title: 'Content', tabBarLabel: 'Content' }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create the content stack layout**

Create `app/(app)/content/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function ContentLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
}
```

- [ ] **Step 3: Create the content list screen**

Create `app/(app)/content/index.tsx`:

```tsx
import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { getUserContent, deleteUserContent } from '@/modules/user_content/user_content.service'
import { DBUserContent, ContentType, CONTENT_TYPE_LABELS } from '@/modules/user_content/user_content.types'

const CONTENT_TYPE_ORDER: ContentType[] = ['subclass', 'species', 'background', 'spell', 'feat', 'equipment']

export default function ContentScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<DBUserContent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await getUserContent(user.id)
      setItems(data)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => {
    load()
    return () => {}
  }, [load]))

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserContent(id)
            setItems((prev) => prev.filter((i) => i.id !== id))
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
          }
        },
      },
    ])
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const grouped = CONTENT_TYPE_ORDER.reduce<Partial<Record<ContentType, DBUserContent[]>>>(
    (acc, type) => {
      const group = items.filter((i) => i.content_type === type)
      if (group.length > 0) acc[type] = group
      return acc
    },
    {}
  )

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">My Content</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-lg"
          onPress={() => router.push('/(app)/content/new')}
        >
          <Text className="text-base font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-muted text-center mb-4">No custom content yet.</Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-xl"
            onPress={() => router.push('/(app)/content/new')}
          >
            <Text className="text-base font-semibold">Add Your First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {(Object.entries(grouped) as [ContentType, DBUserContent[]][]).map(([type, group]) => (
            <View key={type} className="mb-6">
              <Text className="text-muted text-xs font-bold mb-2">{CONTENT_TYPE_LABELS[type].toUpperCase()}</Text>
              {group.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="bg-surface rounded-xl p-4 mb-2"
                  onPress={() => router.push(`/(app)/content/${item.id}`)}
                  onLongPress={() => confirmDelete(item.id, item.name)}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityHint="Tap to edit. Long press to delete."
                >
                  <Text className="text-text font-bold">{item.name}</Text>
                  {item.description && (
                    <Text className="text-muted text-sm mt-1" numberOfLines={2}>{item.description}</Text>
                  )}
                  <Text className="text-overlay text-xs mt-1">Long-press to delete</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/_layout.tsx app/\(app\)/content/_layout.tsx app/\(app\)/content/index.tsx
git commit -m "feat: add Content tab with custom content list screen"
```

---

## Task 5: Content Create Form

**Files:**
- Create: `app/(app)/content/new.tsx`

- [ ] **Step 1: Create the new content form**

Create `app/(app)/content/new.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { createUserContent } from '@/modules/user_content/user_content.service'
import { ContentType, CONTENT_TYPE_LABELS } from '@/modules/user_content/user_content.types'
import { getClasses } from '@/modules/srd/srd.service'
import { DBClass } from '@/modules/character/character.types'

const CONTENT_TYPES: ContentType[] = ['subclass', 'species', 'background', 'spell', 'feat', 'equipment']

export default function NewContentScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [props, setProps] = useState<Record<string, unknown>>({})
  const [classes, setClasses] = useState<DBClass[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getClasses().then(setClasses).catch(() => {})
  }, [])

  function setProp(key: string, value: unknown) {
    setProps((prev) => ({ ...prev, [key]: value }))
  }

  function handleTypeSelect(type: ContentType) {
    setContentType(type)
    setProps({})
  }

  function buildProperties(): Record<string, unknown> {
    switch (contentType) {
      case 'subclass':
        return { class_id: props.class_id ?? '', features: props.features ?? '' }
      case 'species':
        return {
          speed: Number(props.speed ?? 30),
          traits: ((props.traits_text as string) ?? '').split('\n').map((t) => t.trim()).filter(Boolean),
        }
      case 'background':
        return {
          skill_proficiencies: ((props.skills_text as string) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          feature: props.feature ?? '',
        }
      case 'spell':
        return {
          level: Number(props.level ?? 0),
          school: props.school ?? '',
          casting_time: props.casting_time ?? 'Action',
          range: props.range ?? '30 ft',
          components: props.components ?? 'V, S',
          duration: props.duration ?? 'Instantaneous',
          classes: ((props.classes_text as string) ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean),
          is_ritual: Boolean(props.is_ritual),
          requires_concentration: Boolean(props.requires_concentration),
        }
      case 'feat':
        return { prerequisites: props.prerequisites ?? '', benefits: props.benefits ?? '' }
      case 'equipment':
        return { category: props.category ?? '', cost: props.cost ?? '', weight: props.weight ?? '' }
      default:
        return {}
    }
  }

  async function handleSave() {
    if (!user || !contentType || !name.trim()) return
    setSaving(true)
    try {
      await createUserContent(user.id, {
        content_type: contentType,
        name: name.trim(),
        description: description.trim() || null,
        properties: buildProperties(),
      })
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!contentType && name.trim().length > 0

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-primary">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-text mb-1">New Custom Entry</Text>
        <Text className="text-muted text-sm mb-6">Add content from books you own.</Text>

        <Text className="text-muted text-xs font-bold mb-2">TYPE</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CONTENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => handleTypeSelect(type)}
              className={`px-3 py-2 rounded-lg border ${contentType === type ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
            >
              <Text className={`font-medium ${contentType === type ? 'text-base' : 'text-text'}`}>
                {CONTENT_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {contentType && (
          <>
            <Text className="text-muted text-xs font-bold mb-1">NAME *</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={name}
              onChangeText={setName}
              placeholder="Entry name"
              placeholderTextColor="#6c7086"
            />

            <Text className="text-muted text-xs font-bold mb-1">DESCRIPTION</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-6"
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description"
              placeholderTextColor="#6c7086"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {contentType === 'subclass' && (
              <>
                <Text className="text-muted text-xs font-bold mb-2">CLASS</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {classes.map((cls) => (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => setProp('class_id', cls.id)}
                      className={`px-3 py-2 rounded-lg border ${props.class_id === cls.id ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
                    >
                      <Text className={`text-sm ${props.class_id === cls.id ? 'text-base font-bold' : 'text-text'}`}>
                        {cls.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-muted text-xs font-bold mb-1">FEATURES</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.features as string) ?? ''}
                  onChangeText={(v) => setProp('features', v)}
                  placeholder="Describe the subclass features..."
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'species' && (
              <>
                <Text className="text-muted text-xs font-bold mb-1">SPEED (FT)</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.speed as string) ?? '30'}
                  onChangeText={(v) => setProp('speed', v)}
                  keyboardType="number-pad"
                  placeholderTextColor="#6c7086"
                />
                <Text className="text-muted text-xs font-bold mb-1">TRAITS (one per line)</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.traits_text as string) ?? ''}
                  onChangeText={(v) => setProp('traits_text', v)}
                  placeholder={'Darkvision\nFey Ancestry'}
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'background' && (
              <>
                <Text className="text-muted text-xs font-bold mb-1">SKILL PROFICIENCIES (comma-separated)</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.skills_text as string) ?? ''}
                  onChangeText={(v) => setProp('skills_text', v)}
                  placeholder="Insight, History"
                  placeholderTextColor="#6c7086"
                />
                <Text className="text-muted text-xs font-bold mb-1">BACKGROUND FEATURE</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.feature as string) ?? ''}
                  onChangeText={(v) => setProp('feature', v)}
                  placeholder="Describe the background feature..."
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'spell' && (
              <>
                <Text className="text-muted text-xs font-bold mb-2">LEVEL</Text>
                <View className="flex-row gap-2 mb-4 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => setProp('level', lvl)}
                      className={`w-9 h-9 rounded-lg items-center justify-center ${props.level === lvl ? 'bg-primary' : 'bg-surface'}`}
                    >
                      <Text className={`font-bold ${props.level === lvl ? 'text-base' : 'text-text'}`}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {[
                  { label: 'SCHOOL', key: 'school', placeholder: 'Evocation' },
                  { label: 'CASTING TIME', key: 'casting_time', placeholder: 'Action' },
                  { label: 'RANGE', key: 'range', placeholder: '30 ft' },
                  { label: 'COMPONENTS', key: 'components', placeholder: 'V, S' },
                  { label: 'DURATION', key: 'duration', placeholder: 'Instantaneous' },
                  { label: 'CLASSES (comma-separated)', key: 'classes_text', placeholder: 'wizard, sorcerer' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} className="mb-4">
                    <Text className="text-muted text-xs font-bold mb-1">{label}</Text>
                    <TextInput
                      className="bg-surface text-text rounded-xl px-4 py-3"
                      value={(props[key] as string) ?? ''}
                      onChangeText={(v) => setProp(key, v)}
                      placeholder={placeholder}
                      placeholderTextColor="#6c7086"
                    />
                  </View>
                ))}
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-text">Ritual</Text>
                  <Switch
                    value={Boolean(props.is_ritual)}
                    onValueChange={(v) => setProp('is_ritual', v)}
                    trackColor={{ false: '#45475a', true: '#cba6f7' }}
                    thumbColor="#cdd6f4"
                  />
                </View>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-text">Concentration</Text>
                  <Switch
                    value={Boolean(props.requires_concentration)}
                    onValueChange={(v) => setProp('requires_concentration', v)}
                    trackColor={{ false: '#45475a', true: '#cba6f7' }}
                    thumbColor="#cdd6f4"
                  />
                </View>
              </>
            )}

            {contentType === 'feat' && (
              <>
                <Text className="text-muted text-xs font-bold mb-1">PREREQUISITES</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.prerequisites as string) ?? ''}
                  onChangeText={(v) => setProp('prerequisites', v)}
                  placeholder="e.g. Strength 13 or higher"
                  placeholderTextColor="#6c7086"
                />
                <Text className="text-muted text-xs font-bold mb-1">BENEFITS</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.benefits as string) ?? ''}
                  onChangeText={(v) => setProp('benefits', v)}
                  placeholder="Describe the feat benefits..."
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'equipment' && (
              <>
                {[
                  { label: 'CATEGORY', key: 'category', placeholder: 'Weapon' },
                  { label: 'COST',     key: 'cost',     placeholder: '25 gp' },
                  { label: 'WEIGHT',   key: 'weight',   placeholder: '4 lb' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} className="mb-4">
                    <Text className="text-muted text-xs font-bold mb-1">{label}</Text>
                    <TextInput
                      className="bg-surface text-text rounded-xl px-4 py-3"
                      value={(props[key] as string) ?? ''}
                      onChangeText={(v) => setProp(key, v)}
                      placeholder={placeholder}
                      placeholderTextColor="#6c7086"
                    />
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canSave && !saving ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${canSave ? 'text-base' : 'text-muted'}`}>Save Entry →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/content/new.tsx
git commit -m "feat: add custom content create form"
```

---

## Task 6: Content Edit Screen

**Files:**
- Create: `app/(app)/content/[id].tsx`

- [ ] **Step 1: Create the edit screen**

Create `app/(app)/content/[id].tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { updateUserContent, deleteUserContent } from '@/modules/user_content/user_content.service'
import { getClasses } from '@/modules/srd/srd.service'
import { DBClass } from '@/modules/character/character.types'
import {
  DBUserContent,
  CONTENT_TYPE_LABELS,
  SubclassProperties,
  SpeciesProperties,
  BackgroundProperties,
  SpellProperties,
  FeatProperties,
  EquipmentProperties,
} from '@/modules/user_content/user_content.types'

export default function EditContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<DBUserContent | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [props, setProps] = useState<Record<string, unknown>>({})
  const [classes, setClasses] = useState<DBClass[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('user_content').select('*').eq('id', id).single(),
      getClasses(),
    ]).then(([{ data, error }, clsData]) => {
      if (error) { Alert.alert('Error', error.message); return }
      const entry = data as DBUserContent
      setItem(entry)
      setName(entry.name)
      setDescription(entry.description ?? '')
      setClasses(clsData)
      setProps(initPropsFromEntry(entry))
    }).catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  function setProp(key: string, value: unknown) {
    setProps((prev) => ({ ...prev, [key]: value }))
  }

  function buildProperties(): Record<string, unknown> {
    switch (item?.content_type) {
      case 'subclass':
        return { class_id: props.class_id ?? '', features: props.features ?? '' }
      case 'species':
        return {
          speed: Number(props.speed ?? 30),
          traits: ((props.traits_text as string) ?? '').split('\n').map((t) => t.trim()).filter(Boolean),
        }
      case 'background':
        return {
          skill_proficiencies: ((props.skills_text as string) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          feature: props.feature ?? '',
        }
      case 'spell':
        return {
          level: Number(props.level ?? 0),
          school: props.school ?? '',
          casting_time: props.casting_time ?? 'Action',
          range: props.range ?? '30 ft',
          components: props.components ?? 'V, S',
          duration: props.duration ?? 'Instantaneous',
          classes: ((props.classes_text as string) ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean),
          is_ritual: Boolean(props.is_ritual),
          requires_concentration: Boolean(props.requires_concentration),
        }
      case 'feat':
        return { prerequisites: props.prerequisites ?? '', benefits: props.benefits ?? '' }
      case 'equipment':
        return { category: props.category ?? '', cost: props.cost ?? '', weight: props.weight ?? '' }
      default:
        return {}
    }
  }

  async function handleSave() {
    if (!item || !name.trim()) return
    setSaving(true)
    try {
      await updateUserContent(id, {
        name: name.trim(),
        description: description.trim() || null,
        properties: buildProperties(),
      })
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    Alert.alert('Delete', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserContent(id)
            router.back()
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
          }
        },
      },
    ])
  }

  if (loading || !item) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary">← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete}>
            <Text className="text-red font-medium">Delete</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-bold text-text mb-1">
          Edit {CONTENT_TYPE_LABELS[item.content_type]}
        </Text>
        <Text className="text-muted text-sm mb-6">{item.content_type}</Text>

        <Text className="text-muted text-xs font-bold mb-1">NAME *</Text>
        <TextInput
          className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#6c7086"
        />

        <Text className="text-muted text-xs font-bold mb-1">DESCRIPTION</Text>
        <TextInput
          className="bg-surface text-text rounded-xl px-4 py-3 mb-6"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#6c7086"
        />

        {item.content_type === 'subclass' && (
          <>
            <Text className="text-muted text-xs font-bold mb-2">CLASS</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setProp('class_id', cls.id)}
                  className={`px-3 py-2 rounded-lg border ${props.class_id === cls.id ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
                >
                  <Text className={`text-sm ${props.class_id === cls.id ? 'text-base font-bold' : 'text-text'}`}>{cls.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-muted text-xs font-bold mb-1">FEATURES</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={(props.features as string) ?? ''}
              onChangeText={(v) => setProp('features', v)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'species' && (
          <>
            <Text className="text-muted text-xs font-bold mb-1">SPEED (FT)</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={String(props.speed ?? '30')}
              onChangeText={(v) => setProp('speed', v)}
              keyboardType="number-pad"
              placeholderTextColor="#6c7086"
            />
            <Text className="text-muted text-xs font-bold mb-1">TRAITS (one per line)</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={(props.traits_text as string) ?? ''}
              onChangeText={(v) => setProp('traits_text', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'background' && (
          <>
            <Text className="text-muted text-xs font-bold mb-1">SKILL PROFICIENCIES (comma-separated)</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={(props.skills_text as string) ?? ''}
              onChangeText={(v) => setProp('skills_text', v)}
              placeholderTextColor="#6c7086"
            />
            <Text className="text-muted text-xs font-bold mb-1">BACKGROUND FEATURE</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={(props.feature as string) ?? ''}
              onChangeText={(v) => setProp('feature', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'spell' && (
          <>
            <Text className="text-muted text-xs font-bold mb-2">LEVEL</Text>
            <View className="flex-row gap-2 mb-4 flex-wrap">
              {[0,1,2,3,4,5,6,7,8,9].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setProp('level', lvl)}
                  className={`w-9 h-9 rounded-lg items-center justify-center ${props.level === lvl ? 'bg-primary' : 'bg-surface'}`}
                >
                  <Text className={`font-bold ${props.level === lvl ? 'text-base' : 'text-text'}`}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {[
              { label: 'SCHOOL', key: 'school' },
              { label: 'CASTING TIME', key: 'casting_time' },
              { label: 'RANGE', key: 'range' },
              { label: 'COMPONENTS', key: 'components' },
              { label: 'DURATION', key: 'duration' },
              { label: 'CLASSES (comma-separated)', key: 'classes_text' },
            ].map(({ label, key }) => (
              <View key={key} className="mb-4">
                <Text className="text-muted text-xs font-bold mb-1">{label}</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3"
                  value={(props[key] as string) ?? ''}
                  onChangeText={(v) => setProp(key, v)}
                  placeholderTextColor="#6c7086"
                />
              </View>
            ))}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text">Ritual</Text>
              <Switch
                value={Boolean(props.is_ritual)}
                onValueChange={(v) => setProp('is_ritual', v)}
                trackColor={{ false: '#45475a', true: '#cba6f7' }}
                thumbColor="#cdd6f4"
              />
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text">Concentration</Text>
              <Switch
                value={Boolean(props.requires_concentration)}
                onValueChange={(v) => setProp('requires_concentration', v)}
                trackColor={{ false: '#45475a', true: '#cba6f7' }}
                thumbColor="#cdd6f4"
              />
            </View>
          </>
        )}

        {item.content_type === 'feat' && (
          <>
            <Text className="text-muted text-xs font-bold mb-1">PREREQUISITES</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={(props.prerequisites as string) ?? ''}
              onChangeText={(v) => setProp('prerequisites', v)}
              placeholderTextColor="#6c7086"
            />
            <Text className="text-muted text-xs font-bold mb-1">BENEFITS</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={(props.benefits as string) ?? ''}
              onChangeText={(v) => setProp('benefits', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'equipment' && (
          <>
            {['category', 'cost', 'weight'].map((key) => (
              <View key={key} className="mb-4">
                <Text className="text-muted text-xs font-bold mb-1">{key.toUpperCase()}</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3"
                  value={(props[key] as string) ?? ''}
                  onChangeText={(v) => setProp(key, v)}
                  placeholderTextColor="#6c7086"
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${name.trim() && !saving ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${name.trim() ? 'text-base' : 'text-muted'}`}>Save Changes →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

function initPropsFromEntry(entry: DBUserContent): Record<string, unknown> {
  switch (entry.content_type) {
    case 'subclass': {
      const p = entry.properties as SubclassProperties
      return { class_id: p.class_id ?? '', features: p.features ?? '' }
    }
    case 'species': {
      const p = entry.properties as SpeciesProperties
      return { speed: String(p.speed ?? 30), traits_text: (p.traits ?? []).join('\n') }
    }
    case 'background': {
      const p = entry.properties as BackgroundProperties
      return { skills_text: (p.skill_proficiencies ?? []).join(', '), feature: p.feature ?? '' }
    }
    case 'spell': {
      const p = entry.properties as SpellProperties
      return {
        level: p.level ?? 0,
        school: p.school ?? '',
        casting_time: p.casting_time ?? '',
        range: p.range ?? '',
        components: p.components ?? '',
        duration: p.duration ?? '',
        classes_text: (p.classes ?? []).join(', '),
        is_ritual: p.is_ritual ?? false,
        requires_concentration: p.requires_concentration ?? false,
      }
    }
    case 'feat': {
      const p = entry.properties as FeatProperties
      return { prerequisites: p.prerequisites ?? '', benefits: p.benefits ?? '' }
    }
    case 'equipment': {
      const p = entry.properties as EquipmentProperties
      return { category: p.category ?? '', cost: p.cost ?? '', weight: p.weight ?? '' }
    }
    default:
      return {}
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/content/[id].tsx"
git commit -m "feat: add custom content edit screen"
```

---

## Task 7: Wire Origin Wizard Step

**Files:**
- Modify: `app/(app)/characters/new/origin.tsx`

Replace the full file content:

- [ ] **Step 1: Update origin.tsx**

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBBackground, DBSpecies } from '@/modules/character/character.types'
import { WithCustom } from '@/modules/user_content/user_content.types'
import { getSpeciesAll, getBackgroundsAll } from '@/modules/user_content/user_content.service'

export default function OriginStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { setDraft } = useCharacterStore()
  const [backgrounds, setBackgrounds] = useState<WithCustom<DBBackground>[]>([])
  const [species, setSpecies] = useState<WithCustom<DBSpecies>[]>([])
  const [selectedBg, setSelectedBg] = useState<WithCustom<DBBackground> | null>(null)
  const [selectedSp, setSelectedSp] = useState<WithCustom<DBSpecies> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([getBackgroundsAll(user.id), getSpeciesAll(user.id)])
      .then(([bgs, sps]) => { setBackgrounds(bgs); setSpecies(sps) })
      .finally(() => setLoading(false))
  }, [user])

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
              <View className="flex-row items-center gap-2">
                <Text className={`font-bold flex-1 ${isSelected ? 'text-primary' : 'text-text'}`}>{bg.name}</Text>
                {bg.is_custom && (
                  <View className="bg-overlay px-2 py-0.5 rounded-full">
                    <Text className="text-muted text-xs">Custom</Text>
                  </View>
                )}
              </View>
              <Text className="text-muted text-sm mt-1">{bg.description}</Text>
              <Text className="text-green text-xs mt-1">Skills: {bg.skill_proficiencies.join(', ')}</Text>
            </TouchableOpacity>
          )
        })}

        <Text className="text-lg font-bold text-text mt-4 mb-3">Species</Text>
        {species.map((sp) => {
          const isSelected = selectedSp?.id === sp.id
          const traits = ((sp.traits as { traits?: string[] } | null)?.traits) ?? []
          return (
            <TouchableOpacity
              key={sp.id}
              onPress={() => setSelectedSp(sp)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className={`font-bold flex-1 ${isSelected ? 'text-primary' : 'text-text'}`}>{sp.name}</Text>
                {sp.is_custom && (
                  <View className="bg-overlay px-2 py-0.5 rounded-full">
                    <Text className="text-muted text-xs">Custom</Text>
                  </View>
                )}
              </View>
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
            {canProceed && selectedBg && selectedSp
              ? `${selectedBg.name} · ${selectedSp.name} →`
              : 'Select background and species'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/characters/new/origin.tsx
git commit -m "feat: merge custom species and backgrounds into origin wizard step"
```

---

## Task 8: Wire Spells Wizard Step

**Files:**
- Modify: `app/(app)/characters/new/spells.tsx`

Replace the full file content:

- [ ] **Step 1: Update spells.tsx**

```tsx
import { useEffect, useState } from 'react'
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBSpell } from '@/modules/character/character.types'
import { WithCustom } from '@/modules/user_content/user_content.types'
import { getSpellsAll } from '@/modules/user_content/user_content.service'

type SpellSection = { title: string; data: WithCustom<DBSpell>[] }

export default function SpellsStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { draft, setDraft } = useCharacterStore()
  const [sections, setSections] = useState<SpellSection[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(draft.selected_spell_ids))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!draft.class_name) { router.replace('/(app)/characters/new/details'); return }
    if (!user) return
    getSpellsAll(user.id, draft.class_name).then((spells) => {
      const byLevel: Record<number, WithCustom<DBSpell>[]> = {}
      spells.forEach((s) => { byLevel[s.level] ??= []; byLevel[s.level].push(s) })
      setSections(
        Object.entries(byLevel)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([level, data]) => ({
            title: level === '0' ? 'Cantrips' : `Level ${level}`,
            data,
          }))
      )
    }).finally(() => setLoading(false))
  }, [draft.class_name, user])

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
                <View className="flex-row gap-2 items-center">
                  {item.is_custom && (
                    <View className="bg-overlay px-2 py-0.5 rounded-full">
                      <Text className="text-muted text-xs">Custom</Text>
                    </View>
                  )}
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
            {selected.size > 0
              ? `Continue with ${selected.size} spell${selected.size !== 1 ? 's' : ''} →`
              : 'Skip Spells →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/characters/new/spells.tsx
git commit -m "feat: merge custom spells into spells wizard step with Custom badge"
```
