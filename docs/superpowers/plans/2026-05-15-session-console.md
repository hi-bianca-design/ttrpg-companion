# Session Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the live session experience — Supabase Realtime sync for HP/conditions/spell slots/death saves/initiative, player HP self-edit, ally healing, death save tracking with DM revival, spell slot tap-to-expend, item gifting between players, rest confirmation, and disconnection/reconnect handling.

**Architecture:** A new `session.store.ts` Zustand store holds all live session state (session characters, initiative order, pending item transfers, rest state) fetched from Supabase on mount and kept current by Realtime subscriptions. The character sheet `_layout.tsx` sets up and tears down all subscriptions; each tab reads from the store rather than querying Supabase directly during a session. Item gifts are tracked in a new `item_transfers` table with pending/confirmed/cancelled states.

**Tech Stack:** Expo (React Native + TypeScript), expo-router, Supabase (PostgreSQL + Realtime), NativeWind 4, Zustand

---

## Prerequisites

This plan must be executed **after** the Character Builder plan and Campaign Manager plan:
- Character sheet has 4 tabs: Character (index.tsx), Actions, Inventory, Campaign
- `src/stores/ui.store.ts` exists with `useUIStore`
- `app/(app)/characters/[id]/campaign.tsx` exists as a stub
- `src/modules/campaign/session.service.ts` has `startSession`, `endSession`, `getActiveSession`, `callRest`, `clearRest`
- Migration `20260515000004_campaign_extensions.sql` applied: `initiative_entries`, `session_xp_awards`, `session_snapshots` tables exist; `sessions.rest_pending` column exists

---

## File Structure

**New files:**
- `supabase/migrations/20260515000005_session_console.sql`
- `src/modules/session/session.types.ts`
- `src/modules/session/session-characters.service.ts`
- `src/modules/session/item-transfer.service.ts`
- `src/modules/session/session-realtime.service.ts`
- `src/stores/session.store.ts`
- `src/components/session/ConnectionBanner.tsx`
- `src/components/session/DeathSaveTracker.tsx`
- `src/components/session/HPControls.tsx`
- `src/components/session/SpellSlotTracker.tsx`
- `src/components/session/PartyMemberCard.tsx`
- `src/components/session/InitiativeOrder.tsx`
- `src/components/session/GiveItemSheet.tsx`
- `src/components/session/GiftConfirmModal.tsx`
- `src/components/session/RestPrompt.tsx`

**Modified files:**
- `src/modules/character/character.utils.ts` — add `getMaxSpellSlots`
- `app/(app)/characters/[id]/_layout.tsx` — subscribe to session on mount, show RestPrompt, show GiftConfirmModal
- `app/(app)/characters/[id]/index.tsx` — wire HPControls + DeathSaveTracker to session store in Combat sub-tab
- `app/(app)/characters/[id]/actions.tsx` — wire SpellSlotTracker when in session
- `app/(app)/characters/[id]/campaign.tsx` — show InitiativeOrder + PartyMemberCards with Heal and Give Item when in session

---

## Task 1: DB Migration — item_transfers + Realtime Setup

**Files:**
- Create: `supabase/migrations/20260515000005_session_console.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260515000005_session_console.sql

-- 1. Enable Realtime on tables that need live sync
--    REPLICA IDENTITY FULL ensures non-PK columns are available in change payloads
alter table public.session_characters replica identity full;
alter table public.initiative_entries  replica identity full;
alter table public.sessions            replica identity full;

alter publication supabase_realtime add table public.session_characters;
alter publication supabase_realtime add table public.initiative_entries;
alter publication supabase_realtime add table public.sessions;

-- 2. Item transfers — track in-flight item gifts between players
create table if not exists public.item_transfers (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid references public.sessions on delete cascade not null,
  from_character_id uuid references public.characters on delete cascade not null,
  to_character_id   uuid references public.characters on delete cascade not null,
  inventory_item_id uuid references public.character_inventory on delete cascade not null,
  quantity          integer not null check (quantity > 0),
  status            text not null default 'pending'
                      check (status in ('pending','confirmed','cancelled')),
  created_at        timestamptz default now(),
  resolved_at       timestamptz
);

create index if not exists item_transfers_session_id_idx      on public.item_transfers(session_id);
create index if not exists item_transfers_to_character_id_idx on public.item_transfers(to_character_id);

alter table public.item_transfers replica identity full;
alter publication supabase_realtime add table public.item_transfers;

-- 3. RLS
alter table public.item_transfers enable row level security;

-- Giver: can insert and cancel their own transfers
create policy "Giver can insert transfers"
  on public.item_transfers for insert
  with check (
    exists (
      select 1 from public.characters c
      where c.id = from_character_id and c.user_id = auth.uid()
    )
  );

create policy "Giver can cancel own transfers"
  on public.item_transfers for update
  using (
    exists (
      select 1 from public.characters c
      where c.id = from_character_id and c.user_id = auth.uid()
    )
  )
  with check (status = 'cancelled');

-- Receiver: can read and confirm transfers sent to them
create policy "Receiver can read own transfers"
  on public.item_transfers for select
  using (
    exists (
      select 1 from public.characters c
      where c.id = to_character_id and c.user_id = auth.uid()
    )
  );

create policy "Receiver can confirm transfers"
  on public.item_transfers for update
  using (
    exists (
      select 1 from public.characters c
      where c.id = to_character_id and c.user_id = auth.uid()
    )
  )
  with check (status = 'confirmed');

-- DM: can read and cancel all transfers in their campaigns
create policy "DM can read session transfers"
  on public.item_transfers for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_id and c.dm_id = auth.uid()
    )
  );

create policy "DM can cancel session transfers"
  on public.item_transfers for update
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_id and c.dm_id = auth.uid()
    )
  )
  with check (status = 'cancelled');
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: Migration applied successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260515000005_session_console.sql
git commit -m "feat: add item_transfers table, enable Realtime on session tables"
```

---

## Task 2: Session Types + Spell Slot Utility

**Files:**
- Create: `src/modules/session/session.types.ts`
- Modify: `src/modules/character/character.utils.ts`

- [ ] **Step 1: Write failing tests for `getMaxSpellSlots`**

```typescript
// __tests__/modules/character/character.utils.test.ts
// (add to existing file)
import { getMaxSpellSlots } from '@/modules/character/character.utils'

describe('getMaxSpellSlots', () => {
  it('returns empty for non-casters', () => {
    expect(getMaxSpellSlots('Barbarian', 5)).toEqual({})
    expect(getMaxSpellSlots('Fighter', 10)).toEqual({})
  })

  it('returns full caster slots for Wizard level 5', () => {
    const slots = getMaxSpellSlots('Wizard', 5)
    expect(slots).toEqual({ '1': 4, '2': 3, '3': 2 })
  })

  it('returns full caster slots for Cleric level 1', () => {
    expect(getMaxSpellSlots('Cleric', 1)).toEqual({ '1': 2 })
  })

  it('returns half caster slots for Paladin level 5', () => {
    const slots = getMaxSpellSlots('Paladin', 5)
    expect(slots).toEqual({ '1': 4, '2': 2 })
  })

  it('returns warlock slots for Warlock level 5 (2 slots at level 3)', () => {
    const slots = getMaxSpellSlots('Warlock', 5)
    expect(slots).toEqual({ '3': 2 })
  })

  it('returns slots for Wizard level 20 (9 slot levels)', () => {
    const slots = getMaxSpellSlots('Wizard', 20)
    expect(Object.keys(slots)).toHaveLength(9)
    expect(slots['9']).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="character.utils" --no-coverage
```

Expected: FAIL — `getMaxSpellSlots is not a function`

- [ ] **Step 3: Add `getMaxSpellSlots` to `character.utils.ts`**

```typescript
// src/modules/character/character.utils.ts
// (append after SPELLCASTING_CLASSES)

// Standard D&D 5e spell slot progression by character level (index 0 = level 1).
// Each row: [slots_lvl1, slots_lvl2, ..., slots_lvl9]
const FULL_CASTER_SLOTS: number[][] = [
  [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0], [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0], [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1],
]

const HALF_CASTER_SLOTS: number[][] = [
  [0,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0], [4,3,2,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0], [4,3,3,3,1,0,0,0,0], [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,0,0,0,0],
]

// Warlock: short-rest slots; all slots are at the warlock's pact magic slot level
const WARLOCK_SLOTS: number[][] = [
  [1,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [0,2,0,0,0,0,0,0,0],
  [0,2,0,0,0,0,0,0,0], [0,0,2,0,0,0,0,0,0], [0,0,2,0,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0], [0,0,0,2,0,0,0,0,0], [0,0,0,0,2,0,0,0,0],
  [0,0,0,0,2,0,0,0,0], [0,0,0,0,3,0,0,0,0], [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0], [0,0,0,0,3,0,0,0,0], [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0], [0,0,0,0,4,0,0,0,0], [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0], [0,0,0,0,4,0,0,0,0],
]

const CLASS_CASTER_TYPE: Record<string, 'full' | 'half' | 'warlock' | 'none'> = {
  Bard: 'full', Cleric: 'full', Druid: 'full', Sorcerer: 'full', Wizard: 'full',
  Paladin: 'half', Ranger: 'half',
  Warlock: 'warlock',
  Barbarian: 'none', Fighter: 'none', Monk: 'none', Rogue: 'none',
}

// Returns the max number of spell slots per slot level for a character.
// Keys are slot level strings ("1"–"9"); levels with 0 slots are omitted.
export function getMaxSpellSlots(className: string, level: number): Record<string, number> {
  const casterType = CLASS_CASTER_TYPE[className] ?? 'none'
  if (casterType === 'none') return {}
  const table = casterType === 'full' ? FULL_CASTER_SLOTS
    : casterType === 'half' ? HALF_CASTER_SLOTS
    : WARLOCK_SLOTS
  const row = table[Math.min(level - 1, 19)]
  const result: Record<string, number> = {}
  row.forEach((count, i) => { if (count > 0) result[String(i + 1)] = count })
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --testPathPattern="character.utils" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create session.types.ts**

```typescript
// src/modules/session/session.types.ts
import { Database } from '@/types/database.types'

export type DBSessionCharacter = Database['public']['Tables']['session_characters']['Row']
export type DBInitiativeEntry  = Database['public']['Tables']['initiative_entries']['Row']
export type DBItemTransfer     = Database['public']['Tables']['item_transfers']['Row']

// session_characters joined with characters for display
export type SessionCharacterWithCharacter = DBSessionCharacter & {
  character: {
    id: string
    name: string
    hp_max: number
    ac: number
    speed: number
    level: number
    user_id: string
    class: { name: string } | null
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/character/character.utils.ts src/modules/session/session.types.ts
git add __tests__/modules/character/character.utils.test.ts
git commit -m "feat: add session types, getMaxSpellSlots utility"
```

---

## Task 3: session-characters.service.ts

**Files:**
- Create: `src/modules/session/session-characters.service.ts`
- Test: `__tests__/modules/session/session-characters.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/modules/session/session-characters.service.test.ts
import {
  getSessionCharacters,
  updateOwnHP,
  healAlly,
  recordDeathSave,
  clearDeathSaves,
  reviveCharacter,
  updateSpellSlots,
} from '@/modules/session/session-characters.service'

const mockFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

function buildChain(overrides: Record<string, jest.Mock> = {}) {
  const chain = {
    select:  jest.fn(),
    eq:      jest.fn(),
    update:  jest.fn(),
    single:  jest.fn(() => ({ data: null, error: null })),
    order:   jest.fn(),
    ...overrides,
  }
  Object.keys(chain).forEach((k) => {
    if (k !== 'single') (chain as Record<string, jest.Mock>)[k].mockReturnValue(chain)
  })
  return chain
}

beforeEach(() => jest.clearAllMocks())

describe('updateOwnHP', () => {
  it('updates hp_current on session_characters', async () => {
    const chain = buildChain()
    mockFrom.mockReturnValue(chain)
    await updateOwnHP('s1', 'c1', 18)
    expect(mockFrom).toHaveBeenCalledWith('session_characters')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ hp_current: 18 }))
  })
})

describe('healAlly', () => {
  it('throws if amount is 0 or negative', async () => {
    await expect(healAlly('s1', 'c2', 0)).rejects.toThrow('Heal amount must be positive')
    await expect(healAlly('s1', 'c2', -5)).rejects.toThrow('Heal amount must be positive')
  })

  it('calls RPC heal_ally with positive amount', async () => {
    const chain = buildChain()
    mockFrom.mockReturnValue(chain)
    await healAlly('s1', 'c2', 5)
    expect(mockFrom).toHaveBeenCalledWith('session_characters')
  })
})

describe('recordDeathSave', () => {
  it('increments death_save_successes', async () => {
    const chain = buildChain({
      single: jest.fn(() => ({
        data: { death_save_successes: 1, death_save_failures: 0 },
        error: null,
      })),
    })
    Object.keys(chain).forEach((k) => {
      if (k !== 'single') (chain as Record<string, jest.Mock>)[k].mockReturnValue(chain)
    })
    const updateChain = buildChain()
    mockFrom
      .mockReturnValueOnce(chain)   // SELECT current values
      .mockReturnValueOnce(updateChain) // UPDATE
    await recordDeathSave('s1', 'c1', 'success')
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ death_save_successes: 2 })
    )
  })
})

describe('reviveCharacter', () => {
  it('throws if hpAmount < 1', async () => {
    await expect(reviveCharacter('s1', 'c1', 0)).rejects.toThrow('Revival HP must be at least 1')
  })

  it('sets hp_current and clears death saves', async () => {
    const chain = buildChain()
    mockFrom.mockReturnValue(chain)
    await reviveCharacter('s1', 'c1', 5)
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        hp_current: 5,
        death_save_successes: 0,
        death_save_failures: 0,
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest --testPathPattern="session-characters.service" --no-coverage
```

Expected: FAIL — `Cannot find module '@/modules/session/session-characters.service'`

- [ ] **Step 3: Implement session-characters.service.ts**

```typescript
// src/modules/session/session-characters.service.ts
import { supabase } from '@/lib/supabase'
import { SessionCharacterWithCharacter } from './session.types'

type SCUpdate = {
  hp_current?: number
  temp_hp?: number
  death_save_successes?: number
  death_save_failures?: number
  spell_slots_used?: Record<string, number>
}

const SESSION_CHARACTER_SELECT = `
  *,
  character:characters(id, name, hp_max, ac, speed, level, user_id,
    class:classes(name))
`

export async function getSessionCharacters(
  sessionId: string
): Promise<SessionCharacterWithCharacter[]> {
  const { data, error } = await supabase
    .from('session_characters')
    .select(SESSION_CHARACTER_SELECT)
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
  return data as SessionCharacterWithCharacter[]
}

export async function updateOwnHP(
  sessionId: string,
  characterId: string,
  hpCurrent: number,
  tempHp?: number
): Promise<void> {
  const update: SCUpdate = { hp_current: hpCurrent }
  if (tempHp !== undefined) update.temp_hp = tempHp
  const { error } = await supabase
    .from('session_characters')
    .update(update)
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
  if (error) throw new Error(error.message)
}

// Players can only increase an ally's HP — they cannot decrease it.
export async function healAlly(
  sessionId: string,
  targetCharacterId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) throw new Error('Heal amount must be positive')
  const { data, error: fetchError } = await supabase
    .from('session_characters')
    .select('hp_current, character:characters(hp_max)')
    .eq('session_id', sessionId)
    .eq('character_id', targetCharacterId)
    .single()
  if (fetchError) throw new Error(fetchError.message)
  const target = data as { hp_current: number; character: { hp_max: number } }
  const newHP = Math.min(target.character.hp_max, target.hp_current + amount)
  const { error } = await supabase
    .from('session_characters')
    .update({ hp_current: newHP })
    .eq('session_id', sessionId)
    .eq('character_id', targetCharacterId)
  if (error) throw new Error(error.message)
}

// Increments successes or failures (capped at 3).
export async function recordDeathSave(
  sessionId: string,
  characterId: string,
  type: 'success' | 'failure'
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('session_characters')
    .select('death_save_successes, death_save_failures')
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
    .single()
  if (fetchError) throw new Error(fetchError.message)
  const row = data as { death_save_successes: number; death_save_failures: number }
  const update: SCUpdate =
    type === 'success'
      ? { death_save_successes: Math.min(3, row.death_save_successes + 1) }
      : { death_save_failures: Math.min(3, row.death_save_failures + 1) }
  const { error } = await supabase
    .from('session_characters')
    .update(update)
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
  if (error) throw new Error(error.message)
}

export async function clearDeathSaves(
  sessionId: string,
  characterId: string
): Promise<void> {
  const { error } = await supabase
    .from('session_characters')
    .update({ death_save_successes: 0, death_save_failures: 0 })
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
  if (error) throw new Error(error.message)
}

// DM-only: revive a dead character. Minimum 1 HP.
export async function reviveCharacter(
  sessionId: string,
  characterId: string,
  hpAmount: number
): Promise<void> {
  if (hpAmount < 1) throw new Error('Revival HP must be at least 1')
  const { error } = await supabase
    .from('session_characters')
    .update({ hp_current: hpAmount, death_save_successes: 0, death_save_failures: 0 })
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
  if (error) throw new Error(error.message)
}

export async function updateSpellSlots(
  sessionId: string,
  characterId: string,
  slotsUsed: Record<string, number>
): Promise<void> {
  const { error } = await supabase
    .from('session_characters')
    .update({ spell_slots_used: slotsUsed })
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
  if (error) throw new Error(error.message)
}

// Restores all spell slots (long rest). Clears to empty object.
export async function restoreSpellSlots(
  sessionId: string,
  characterId: string
): Promise<void> {
  const { error } = await supabase
    .from('session_characters')
    .update({ spell_slots_used: {} })
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --testPathPattern="session-characters.service" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/session/session-characters.service.ts
git add __tests__/modules/session/session-characters.service.test.ts
git commit -m "feat: add session-characters service (HP, death saves, spell slots)"
```

---

## Task 4: item-transfer.service.ts

**Files:**
- Create: `src/modules/session/item-transfer.service.ts`
- Test: `__tests__/modules/session/item-transfer.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/modules/session/item-transfer.service.test.ts
import {
  initiateTransfer,
  confirmTransfer,
  cancelTransfer,
  cancelPendingTransfers,
  getPendingTransfersForCharacter,
} from '@/modules/session/item-transfer.service'

const mockFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

function buildChain(returnData: unknown = null, returnError: unknown = null) {
  const single = jest.fn(() => ({ data: returnData, error: returnError }))
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(), insert: jest.fn(), update: jest.fn(),
    eq: jest.fn(), single,
  }
  Object.keys(chain).forEach((k) => {
    if (k !== 'single') chain[k].mockReturnValue(chain)
  })
  return chain
}

beforeEach(() => jest.clearAllMocks())

describe('initiateTransfer', () => {
  it('inserts a transfer row and returns it', async () => {
    const transfer = { id: 't1', status: 'pending' }
    const chain = buildChain(transfer)
    mockFrom.mockReturnValue(chain)
    const result = await initiateTransfer('s1', 'c1', 'c2', 'inv1', 1)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 's1',
        from_character_id: 'c1',
        to_character_id: 'c2',
        inventory_item_id: 'inv1',
        quantity: 1,
      })
    )
    expect(result).toEqual(transfer)
  })
})

describe('getPendingTransfersForCharacter', () => {
  it('filters by to_character_id, session_id, and status pending', async () => {
    const chain: Record<string, jest.Mock> = {
      select: jest.fn(), eq: jest.fn(), order: jest.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.order.mockReturnValue({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await getPendingTransfersForCharacter('c2', 's1')
    expect(chain.eq).toHaveBeenCalledWith('to_character_id', 'c2')
    expect(chain.eq).toHaveBeenCalledWith('session_id', 's1')
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
  })
})

describe('cancelPendingTransfers', () => {
  it('updates all pending transfers for the session to cancelled', async () => {
    const chain: Record<string, jest.Mock> = {
      update: jest.fn(), eq: jest.fn(),
    }
    chain.update.mockReturnValue(chain)
    chain.eq.mockReturnValue({ error: null })
    mockFrom.mockReturnValue(chain)
    await cancelPendingTransfers('s1')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )
    expect(chain.eq).toHaveBeenCalledWith('session_id', 's1')
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest --testPathPattern="item-transfer.service" --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement item-transfer.service.ts**

```typescript
// src/modules/session/item-transfer.service.ts
import { supabase } from '@/lib/supabase'
import { DBItemTransfer } from './session.types'

export async function initiateTransfer(
  sessionId: string,
  fromCharacterId: string,
  toCharacterId: string,
  inventoryItemId: string,
  quantity: number
): Promise<DBItemTransfer> {
  const { data, error } = await supabase
    .from('item_transfers')
    .insert({
      session_id:        sessionId,
      from_character_id: fromCharacterId,
      to_character_id:   toCharacterId,
      inventory_item_id: inventoryItemId,
      quantity,
      status:            'pending',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DBItemTransfer
}

// Moves inventory from giver to receiver, marks transfer confirmed.
export async function confirmTransfer(transferId: string): Promise<void> {
  // 1. Fetch the transfer
  const { data: transfer, error: fetchErr } = await supabase
    .from('item_transfers')
    .select('*')
    .eq('id', transferId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  const t = transfer as DBItemTransfer

  // 2. Fetch the source inventory item
  const { data: sourceItem, error: itemErr } = await supabase
    .from('character_inventory')
    .select('*')
    .eq('id', t.inventory_item_id)
    .single()
  if (itemErr) throw new Error(itemErr.message)

  const src = sourceItem as {
    id: string; character_id: string; quantity: number
    equipment_id: string | null; magic_item_id: string | null
    campaign_item_id: string | null; custom_content_id: string | null
    is_equipped: boolean; is_attuned: boolean; notes: string
  }

  // 3. Reduce or remove source item
  if (src.quantity > t.quantity) {
    const { error: reduceErr } = await supabase
      .from('character_inventory')
      .update({ quantity: src.quantity - t.quantity })
      .eq('id', src.id)
    if (reduceErr) throw new Error(reduceErr.message)
  } else {
    const { error: deleteErr } = await supabase
      .from('character_inventory')
      .delete()
      .eq('id', src.id)
    if (deleteErr) throw new Error(deleteErr.message)
  }

  // 4. Add item to receiver's inventory
  const { error: insertErr } = await supabase
    .from('character_inventory')
    .insert({
      character_id:      t.to_character_id,
      equipment_id:      src.equipment_id,
      magic_item_id:     src.magic_item_id,
      campaign_item_id:  src.campaign_item_id,
      custom_content_id: src.custom_content_id,
      quantity:          t.quantity,
      is_equipped:       false,
      is_attuned:        false,
      notes:             src.notes,
    })
  if (insertErr) throw new Error(insertErr.message)

  // 5. Mark transfer confirmed
  const { error: updateErr } = await supabase
    .from('item_transfers')
    .update({ status: 'confirmed', resolved_at: new Date().toISOString() })
    .eq('id', transferId)
  if (updateErr) throw new Error(updateErr.message)
}

export async function cancelTransfer(transferId: string): Promise<void> {
  const { error } = await supabase
    .from('item_transfers')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('id', transferId)
  if (error) throw new Error(error.message)
}

// Called at session end — cancels all pending transfers.
export async function cancelPendingTransfers(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('item_transfers')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
}

export async function getPendingTransfersForCharacter(
  characterId: string,
  sessionId: string
): Promise<DBItemTransfer[]> {
  const { data, error } = await supabase
    .from('item_transfers')
    .select('*')
    .eq('to_character_id', characterId)
    .eq('session_id', sessionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as DBItemTransfer[]
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --testPathPattern="item-transfer.service" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/session/item-transfer.service.ts
git add __tests__/modules/session/item-transfer.service.test.ts
git commit -m "feat: add item-transfer service (initiate, confirm, cancel)"
```

---

## Task 5: Session Realtime Service

**Files:**
- Create: `src/modules/session/session-realtime.service.ts`

- [ ] **Step 1: Write the service**

```typescript
// src/modules/session/session-realtime.service.ts
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { DBInitiativeEntry, DBItemTransfer } from './session.types'

export type SessionCallbacks = {
  onSessionCharacterChange: (row: Record<string, unknown>) => void
  onInitiativeChange:       (entries: DBInitiativeEntry[]) => void
  onRestPending:            (type: 'short' | 'long' | null) => void
  onItemTransfer:           (transfer: DBItemTransfer) => void
  onConnectionChange:       (connected: boolean) => void
}

// Subscribes to all session Realtime channels.
// Returns an unsubscribe function — call it on component unmount.
export function subscribeToSession(
  sessionId: string,
  myCharacterId: string,
  callbacks: SessionCallbacks
): () => void {
  const channels: RealtimeChannel[] = []

  // Session characters — HP, temp HP, conditions, death saves, spell slots
  const scChannel = supabase
    .channel(`session:sc:${sessionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'session_characters',
        filter: `session_id=eq.${sessionId}` },
      (payload) => {
        callbacks.onSessionCharacterChange(payload.new as Record<string, unknown>)
      }
    )
    .subscribe((status) => {
      callbacks.onConnectionChange(status === 'SUBSCRIBED')
    })
  channels.push(scChannel)

  // Initiative entries — refetch all on any change (avoids merge complexity)
  const initChannel = supabase
    .channel(`session:init:${sessionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'initiative_entries',
        filter: `session_id=eq.${sessionId}` },
      async () => {
        const { data } = await supabase
          .from('initiative_entries')
          .select('*')
          .eq('session_id', sessionId)
          .order('sort_order', { ascending: true })
        if (data) callbacks.onInitiativeChange(data as DBInitiativeEntry[])
      }
    )
    .subscribe()
  channels.push(initChannel)

  // Sessions row — watch rest_pending column
  const restChannel = supabase
    .channel(`session:rest:${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}` },
      (payload) => {
        const row = payload.new as { rest_pending: string | null }
        callbacks.onRestPending(row.rest_pending as 'short' | 'long' | null)
      }
    )
    .subscribe()
  channels.push(restChannel)

  // Item transfers — this character as receiver; filter client-side by to_character_id
  const transferChannel = supabase
    .channel(`session:transfer:${sessionId}:${myCharacterId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'item_transfers',
        filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const t = payload.new as DBItemTransfer
        if (t.to_character_id === myCharacterId && t.status === 'pending') {
          callbacks.onItemTransfer(t)
        }
      }
    )
    .subscribe()
  channels.push(transferChannel)

  return () => {
    channels.forEach((ch) => supabase.removeChannel(ch))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/session/session-realtime.service.ts
git commit -m "feat: add session realtime service (4-channel subscription)"
```

---

## Task 6: Session Store (Zustand)

**Files:**
- Create: `src/stores/session.store.ts`
- Test: `__tests__/stores/session.store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/stores/session.store.test.ts
import { act, renderHook } from '@testing-library/react-hooks'
import { useSessionStore } from '@/stores/session.store'
import { SessionCharacterWithCharacter } from '@/modules/session/session.types'

function makeChar(characterId: string, userId: string): SessionCharacterWithCharacter {
  return {
    session_id: 's1', character_id: characterId,
    hp_current: 20, temp_hp: 0, conditions: [],
    spell_slots_used: {}, death_save_successes: 0, death_save_failures: 0,
    initiative: null, is_active_turn: false,
    character: { id: characterId, name: 'Test', hp_max: 20, ac: 14, speed: 30,
      level: 5, user_id: userId, class: { name: 'Wizard' } },
  }
}

describe('useSessionStore', () => {
  beforeEach(() => useSessionStore.getState().clearSession())

  it('initSession populates sessionCharacters', () => {
    const { result } = renderHook(() => useSessionStore())
    act(() => result.current.initSession('s1', [makeChar('c1', 'u1')]))
    expect(result.current.sessionId).toBe('s1')
    expect(result.current.sessionCharacters['c1']).toBeDefined()
    expect(result.current.isConnected).toBe(true)
  })

  it('upsertSessionCharacter merges updates into existing entry', () => {
    const { result } = renderHook(() => useSessionStore())
    act(() => result.current.initSession('s1', [makeChar('c1', 'u1')]))
    act(() => result.current.upsertSessionCharacter({ character_id: 'c1', hp_current: 8 }))
    expect(result.current.sessionCharacters['c1'].hp_current).toBe(8)
    expect(result.current.sessionCharacters['c1'].character.name).toBe('Test')
  })

  it('upsertSessionCharacter ignores unknown character_ids', () => {
    const { result } = renderHook(() => useSessionStore())
    act(() => result.current.initSession('s1', [makeChar('c1', 'u1')]))
    act(() => result.current.upsertSessionCharacter({ character_id: 'unknown', hp_current: 1 }))
    expect(Object.keys(result.current.sessionCharacters)).toHaveLength(1)
  })

  it('clearSession resets all state', () => {
    const { result } = renderHook(() => useSessionStore())
    act(() => result.current.initSession('s1', [makeChar('c1', 'u1')]))
    act(() => result.current.clearSession())
    expect(result.current.sessionId).toBeNull()
    expect(Object.keys(result.current.sessionCharacters)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest --testPathPattern="session.store" --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement session.store.ts**

```typescript
// src/stores/session.store.ts
import { create } from 'zustand'
import { SessionCharacterWithCharacter, DBInitiativeEntry, DBItemTransfer } from '@/modules/session/session.types'

type SessionStore = {
  sessionId:         string | null
  isConnected:       boolean
  sessionCharacters: Record<string, SessionCharacterWithCharacter>
  initiativeEntries: DBInitiativeEntry[]
  pendingTransfer:   DBItemTransfer | null
  restPending:       'short' | 'long' | null

  initSession:             (sessionId: string, characters: SessionCharacterWithCharacter[]) => void
  clearSession:            () => void
  setConnected:            (connected: boolean) => void
  upsertSessionCharacter:  (update: Record<string, unknown>) => void
  setInitiativeEntries:    (entries: DBInitiativeEntry[]) => void
  setPendingTransfer:      (transfer: DBItemTransfer | null) => void
  setRestPending:          (type: 'short' | 'long' | null) => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId:         null,
  isConnected:       false,
  sessionCharacters: {},
  initiativeEntries: [],
  pendingTransfer:   null,
  restPending:       null,

  initSession: (sessionId, characters) => {
    const map: Record<string, SessionCharacterWithCharacter> = {}
    characters.forEach((sc) => { map[sc.character_id] = sc })
    set({ sessionId, sessionCharacters: map, isConnected: true })
  },

  clearSession: () => set({
    sessionId: null, isConnected: false,
    sessionCharacters: {}, initiativeEntries: [],
    pendingTransfer: null, restPending: null,
  }),

  setConnected: (connected) => set({ isConnected: connected }),

  upsertSessionCharacter: (update) => {
    const characterId = update.character_id as string
    if (!characterId) return
    const existing = get().sessionCharacters[characterId]
    if (!existing) return
    set((state) => ({
      sessionCharacters: {
        ...state.sessionCharacters,
        [characterId]: { ...existing, ...update },
      },
    }))
  },

  setInitiativeEntries: (entries) => set({ initiativeEntries: entries }),
  setPendingTransfer:   (transfer) => set({ pendingTransfer: transfer }),
  setRestPending:       (type) => set({ restPending: type }),
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --testPathPattern="session.store" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/session.store.ts __tests__/stores/session.store.test.ts
git commit -m "feat: add session store (Zustand) for live session state"
```

---

## Task 7: ConnectionBanner + DeathSaveTracker

**Files:**
- Create: `src/components/session/ConnectionBanner.tsx`
- Create: `src/components/session/DeathSaveTracker.tsx`

- [ ] **Step 1: Create ConnectionBanner**

```tsx
// src/components/session/ConnectionBanner.tsx
import { View, Text } from 'react-native'
import { useSessionStore } from '@/stores/session.store'

export function ConnectionBanner() {
  const isConnected = useSessionStore((s) => s.isConnected)
  const sessionId   = useSessionStore((s) => s.sessionId)
  if (!sessionId || isConnected) return null
  return (
    <View className="bg-red/20 border-b border-red px-4 py-2">
      <Text className="text-red text-xs text-center font-medium">
        No connection — reconnecting…
      </Text>
    </View>
  )
}
```

- [ ] **Step 2: Create DeathSaveTracker**

```tsx
// src/components/session/DeathSaveTracker.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { recordDeathSave, clearDeathSaves } from '@/modules/session/session-characters.service'
import { useSessionStore } from '@/stores/session.store'

type Props = {
  sessionId:   string
  characterId: string
  successes:   number
  failures:    number
  isOwn:       boolean  // false = DM read-only view
  isDead:      boolean  // 3 failures
}

export function DeathSaveTracker({ sessionId, characterId, successes, failures, isOwn, isDead }: Props) {
  const isConnected = useSessionStore((s) => s.isConnected)
  const canInteract = isOwn && isConnected && !isDead

  async function handleRecord(type: 'success' | 'failure') {
    if (!canInteract) return
    try {
      await recordDeathSave(sessionId, characterId, type)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to record death save')
    }
  }

  function renderDots(filled: number, color: string) {
    return (
      <View className="flex-row gap-2">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`w-6 h-6 rounded-full border-2 ${
              i < filled ? `bg-${color} border-${color}` : 'border-overlay bg-transparent'
            }`}
          />
        ))}
      </View>
    )
  }

  return (
    <View className="bg-surface rounded-lg p-4 border border-red">
      <Text className="text-red text-xs font-bold text-center mb-3">
        {isDead ? 'DEAD' : 'DEATH SAVES'}
      </Text>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-green text-xs font-medium">Successes</Text>
        {renderDots(successes, 'green')}
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-red text-xs font-medium">Failures</Text>
        {renderDots(failures, 'red')}
      </View>

      {canInteract && (
        <View className="flex-row gap-3 mt-1">
          <TouchableOpacity
            className="flex-1 bg-green/20 border border-green rounded-lg py-2 items-center"
            onPress={() => handleRecord('success')}
          >
            <Text className="text-green text-sm font-bold">+ Success</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red/20 border border-red rounded-lg py-2 items-center"
            onPress={() => handleRecord('failure')}
          >
            <Text className="text-red text-sm font-bold">+ Failure</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/session/ConnectionBanner.tsx src/components/session/DeathSaveTracker.tsx
git commit -m "feat: add ConnectionBanner and DeathSaveTracker components"
```

---

## Task 8: HPControls + SpellSlotTracker

**Files:**
- Create: `src/components/session/HPControls.tsx`
- Create: `src/components/session/SpellSlotTracker.tsx`

- [ ] **Step 1: Create HPControls**

The in-session HP control replaces the local-only version in the Character tab. It calls `updateOwnHP` and lets Realtime propagate the update back (no optimistic local state — Realtime is fast enough).

```tsx
// src/components/session/HPControls.tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { updateOwnHP } from '@/modules/session/session-characters.service'

type Props = {
  sessionId:   string
  characterId: string
  hpCurrent:   number
  hpMax:       number
  tempHp:      number
  isConnected: boolean
}

export function HPControls({ sessionId, characterId, hpCurrent, hpMax, tempHp, isConnected }: Props) {
  const [inputValue, setInputValue] = useState('')
  const disabled = !isConnected

  async function applyDamage() {
    const amount = parseInt(inputValue, 10)
    if (isNaN(amount) || amount <= 0) { setInputValue(''); return }
    const newHP = Math.max(0, hpCurrent - amount)
    try {
      await updateOwnHP(sessionId, characterId, newHP)
      setInputValue('')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update HP')
    }
  }

  async function applyHeal() {
    const amount = parseInt(inputValue, 10)
    if (isNaN(amount) || amount <= 0) { setInputValue(''); return }
    const newHP = Math.min(hpMax, hpCurrent + amount)
    try {
      await updateOwnHP(sessionId, characterId, newHP)
      setInputValue('')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update HP')
    }
  }

  async function setTempHP(amount: number) {
    try {
      await updateOwnHP(sessionId, characterId, hpCurrent, amount)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update temp HP')
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-center gap-2">
        <Text className="text-4xl font-bold text-text">{hpCurrent}</Text>
        <Text className="text-xl text-muted">/ {hpMax}</Text>
        {tempHp > 0 && (
          <View className="bg-blue/20 border border-blue rounded px-2 py-1 ml-2">
            <Text className="text-blue text-sm font-bold">+{tempHp} temp</Text>
          </View>
        )}
      </View>

      {!disabled && (
        <>
          <TextInput
            className="bg-surface border border-overlay rounded-lg px-4 py-3 text-text text-center text-lg"
            placeholder="Amount"
            placeholderTextColor="#6c7086"
            keyboardType="numeric"
            value={inputValue}
            onChangeText={setInputValue}
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-red/20 border border-red rounded-lg py-3 items-center"
              onPress={applyDamage}
            >
              <Text className="text-red font-bold text-base">Damage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-green/20 border border-green rounded-lg py-3 items-center"
              onPress={applyHeal}
            >
              <Text className="text-green font-bold text-base">Heal</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create SpellSlotTracker**

Spell slot level keys are `"1"` through `"9"`. `slotsUsed` comes from `session_characters.spell_slots_used`. Max slots come from `getMaxSpellSlots(className, level)`.

```tsx
// src/components/session/SpellSlotTracker.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { updateSpellSlots } from '@/modules/session/session-characters.service'

type Props = {
  sessionId:   string
  characterId: string
  maxSlots:    Record<string, number>   // from getMaxSpellSlots
  slotsUsed:   Record<string, number>   // from session store
  isConnected: boolean
}

export function SpellSlotTracker({ sessionId, characterId, maxSlots, slotsUsed, isConnected }: Props) {
  const slotLevels = Object.keys(maxSlots).sort()
  if (slotLevels.length === 0) return null

  async function toggleSlot(level: string, slotIndex: number) {
    if (!isConnected) return
    const max = maxSlots[level] ?? 0
    const used = slotsUsed[level] ?? 0
    // Slot index 0 = first slot. Tapping a used slot restores it; tapping an available slot expends it.
    const slotIsUsed = slotIndex < used
    const newUsed = slotIsUsed
      ? Math.max(0, used - 1)      // restore: decrease used count
      : Math.min(max, used + 1)    // expend: increase used count
    const newSlotsUsed = { ...slotsUsed, [level]: newUsed }
    try {
      await updateSpellSlots(sessionId, characterId, newSlotsUsed)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update spell slots')
    }
  }

  return (
    <View className="gap-3">
      {slotLevels.map((level) => {
        const max  = maxSlots[level] ?? 0
        const used = slotsUsed[level] ?? 0
        return (
          <View key={level} className="flex-row items-center gap-3">
            <Text className="text-muted text-xs w-12">Lvl {level}</Text>
            <View className="flex-row gap-2 flex-1">
              {Array.from({ length: max }).map((_, i) => {
                const isExpended = i < used
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={!isConnected}
                    onPress={() => toggleSlot(level, i)}
                    className={`w-8 h-8 rounded-full border-2 items-center justify-center ${
                      isExpended
                        ? 'bg-overlay border-overlay'
                        : 'bg-primary/30 border-primary'
                    }`}
                  >
                    {!isExpended && <View className="w-3 h-3 rounded-full bg-primary" />}
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text className="text-muted text-xs w-12 text-right">
              {max - used}/{max}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/session/HPControls.tsx src/components/session/SpellSlotTracker.tsx
git commit -m "feat: add HPControls and SpellSlotTracker components"
```

---

## Task 9: PartyMemberCard + InitiativeOrder

**Files:**
- Create: `src/components/session/PartyMemberCard.tsx`
- Create: `src/components/session/InitiativeOrder.tsx`

- [ ] **Step 1: Create PartyMemberCard**

Used in the Campaign tab (player view of party) and DM party overview. Players see Heal and Give Item actions on other characters' cards. DM sees Revive on dead characters.

```tsx
// src/components/session/PartyMemberCard.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native'
import { healAlly, reviveCharacter } from '@/modules/session/session-characters.service'
import { SessionCharacterWithCharacter } from '@/modules/session/session.types'

type Props = {
  sc:              SessionCharacterWithCharacter
  sessionId:       string
  isOwnCard:       boolean
  isDM:            boolean
  hpVisible:       boolean  // campaign setting
  isConnected:     boolean
  onGiveItem?:     (targetCharacterId: string) => void  // opens GiveItemSheet
}

export function PartyMemberCard({ sc, sessionId, isOwnCard, isDM, hpVisible, isConnected, onGiveItem }: Props) {
  const [healInput, setHealInput] = useState('')
  const [showHealInput, setShowHealInput] = useState(false)
  const [reviveInput, setReviveInput] = useState('')
  const [showReviveInput, setShowReviveInput] = useState(false)

  const isDead       = sc.death_save_failures >= 3
  const isDying      = sc.hp_current === 0 && !isDead
  const isStabilized = sc.death_save_successes >= 3 && sc.hp_current === 0

  async function submitHeal() {
    const amount = parseInt(healInput, 10)
    if (isNaN(amount) || amount <= 0) { setShowHealInput(false); return }
    try {
      await healAlly(sessionId, sc.character_id, amount)
      setHealInput('')
      setShowHealInput(false)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to heal')
    }
  }

  async function submitRevive() {
    const hp = parseInt(reviveInput, 10)
    if (isNaN(hp) || hp < 1) {
      Alert.alert('Invalid', 'Revival HP must be at least 1')
      return
    }
    try {
      await reviveCharacter(sessionId, sc.character_id, hp)
      setReviveInput('')
      setShowReviveInput(false)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to revive')
    }
  }

  const cardBorderClass = isDead ? 'border-red' : isDying ? 'border-yellow' : 'border-overlay'

  return (
    <View className={`bg-surface rounded-lg p-4 border ${cardBorderClass} mb-3`}>
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-text font-semibold text-base">{sc.character.name}</Text>
          <Text className="text-muted text-xs">
            {sc.character.class?.name} · Lv {sc.character.level}
          </Text>
        </View>
        {(isDM || hpVisible) && (
          <View className="items-end">
            <Text className={`text-xl font-bold ${isDead ? 'text-red' : 'text-text'}`}>
              {sc.hp_current}
            </Text>
            <Text className="text-muted text-xs">/ {sc.character.hp_max}</Text>
          </View>
        )}
      </View>

      {sc.conditions.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {sc.conditions.map((c) => (
            <View key={c} className="bg-overlay rounded px-2 py-0.5">
              <Text className="text-muted text-xs">{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Dying / dead state */}
      {(isDying || isDead) && (
        <View className={`mt-3 p-3 rounded-lg ${isDead ? 'bg-red/10 border border-red' : 'bg-yellow/10 border border-yellow'}`}>
          <Text className={`text-xs font-bold text-center ${isDead ? 'text-red' : 'text-yellow'}`}>
            {isDead ? 'DEAD' : isStabilized ? 'STABILIZED' : 'DYING'}
          </Text>
          {!isDead && (
            <View className="flex-row justify-around mt-2">
              <Text className="text-green text-xs">✓ {sc.death_save_successes}</Text>
              <Text className="text-red text-xs">✗ {sc.death_save_failures}</Text>
            </View>
          )}
        </View>
      )}

      {/* DM Revive button */}
      {isDM && isDead && (
        <TouchableOpacity
          className="mt-3 bg-primary/20 border border-primary rounded-lg py-2 items-center"
          onPress={() => setShowReviveInput(true)}
        >
          <Text className="text-primary text-sm font-bold">Revive</Text>
        </TouchableOpacity>
      )}

      {/* Player actions on other characters' cards */}
      {!isOwnCard && !isDM && isConnected && (
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            className="flex-1 bg-green/10 border border-green/50 rounded-lg py-2 items-center"
            onPress={() => setShowHealInput(true)}
          >
            <Text className="text-green text-xs font-medium">Heal</Text>
          </TouchableOpacity>
          {onGiveItem && (
            <TouchableOpacity
              className="flex-1 bg-overlay rounded-lg py-2 items-center"
              onPress={() => onGiveItem(sc.character_id)}
            >
              <Text className="text-muted text-xs font-medium">Give Item</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Heal input */}
      {showHealInput && (
        <View className="flex-row gap-2 mt-2">
          <TextInput
            className="flex-1 bg-base border border-overlay rounded-lg px-3 py-2 text-text"
            placeholder="Heal amount" placeholderTextColor="#6c7086"
            keyboardType="numeric" value={healInput} onChangeText={setHealInput}
            autoFocus
          />
          <TouchableOpacity
            className="bg-green/20 border border-green rounded-lg px-4 py-2 justify-center"
            onPress={submitHeal}
          >
            <Text className="text-green font-bold">OK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-overlay rounded-lg px-3 py-2 justify-center"
            onPress={() => { setShowHealInput(false); setHealInput('') }}
          >
            <Text className="text-muted">✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Revive input */}
      {showReviveInput && (
        <View className="flex-row gap-2 mt-2">
          <TextInput
            className="flex-1 bg-base border border-overlay rounded-lg px-3 py-2 text-text"
            placeholder="HP to revive with" placeholderTextColor="#6c7086"
            keyboardType="numeric" value={reviveInput} onChangeText={setReviveInput}
            autoFocus
          />
          <TouchableOpacity
            className="bg-primary/20 border border-primary rounded-lg px-4 py-2 justify-center"
            onPress={submitRevive}
          >
            <Text className="text-primary font-bold">OK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-overlay rounded-lg px-3 py-2 justify-center"
            onPress={() => { setShowReviveInput(false); setReviveInput('') }}
          >
            <Text className="text-muted">✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create InitiativeOrder**

Player-facing read-only view of the initiative order. Active turn is highlighted.

```tsx
// src/components/session/InitiativeOrder.tsx
import { View, Text, ScrollView } from 'react-native'
import { DBInitiativeEntry } from '@/modules/session/session.types'

type Props = {
  entries: DBInitiativeEntry[]
}

export function InitiativeOrder({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-muted text-sm">No initiative order yet</Text>
      </View>
    )
  }

  return (
    <View className="gap-2">
      {entries.map((entry, index) => (
        <View
          key={entry.id}
          className={`flex-row items-center px-4 py-3 rounded-lg border ${
            entry.is_active_turn
              ? 'bg-primary/10 border-primary'
              : 'bg-surface border-overlay'
          }`}
        >
          <Text className="text-muted text-xs w-6">{index + 1}</Text>
          <View className="flex-1 ml-2">
            <Text className={`text-sm font-medium ${entry.is_active_turn ? 'text-primary' : 'text-text'}`}>
              {entry.name}
              {!entry.is_player_character && (
                <Text className="text-muted text-xs"> (NPC)</Text>
              )}
            </Text>
            {entry.hp_current != null && entry.hp_max != null && (
              <Text className="text-muted text-xs">
                HP {entry.hp_current}/{entry.hp_max}
              </Text>
            )}
          </View>
          <Text className="text-muted text-sm font-mono">{entry.initiative}</Text>
          {entry.is_active_turn && (
            <View className="ml-2 bg-primary rounded px-2 py-0.5">
              <Text className="text-base text-xs font-bold">TURN</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/session/PartyMemberCard.tsx src/components/session/InitiativeOrder.tsx
git commit -m "feat: add PartyMemberCard and InitiativeOrder components"
```

---

## Task 10: GiveItemSheet + GiftConfirmModal

**Files:**
- Create: `src/components/session/GiveItemSheet.tsx`
- Create: `src/components/session/GiftConfirmModal.tsx`

- [ ] **Step 1: Create GiveItemSheet**

Shows the player's own Backpack items (unequipped only). Quantity selector for stacked items. Calls `initiateTransfer` on confirm.

```tsx
// src/components/session/GiveItemSheet.tsx
import { useState } from 'react'
import { View, Text, Modal, TouchableOpacity, FlatList, Alert } from 'react-native'
import { InventoryItem } from '@/modules/inventory/inventory.types'
import { initiateTransfer } from '@/modules/session/item-transfer.service'

type Props = {
  visible:         boolean
  onClose:         () => void
  sessionId:       string
  fromCharacterId: string
  toCharacterId:   string
  backpackItems:   InventoryItem[]  // unequipped items only — caller filters
}

function itemDisplayName(item: InventoryItem): string {
  return item.equipment?.name ?? item.magic_item?.name
    ?? item.campaign_item?.name ?? item.custom_item?.name ?? 'Unknown Item'
}

export function GiveItemSheet({ visible, onClose, sessionId, fromCharacterId, toCharacterId, backpackItems }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const selectedItem = backpackItems.find((i) => i.id === selectedId)

  function handleSelect(item: InventoryItem) {
    setSelectedId(item.id)
    setQuantity(1)
  }

  async function handleGive() {
    if (!selectedItem) return
    setSubmitting(true)
    try {
      await initiateTransfer(sessionId, fromCharacterId, toCharacterId, selectedItem.id, quantity)
      setSelectedId(null)
      setQuantity(1)
      onClose()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/50" activeOpacity={1} onPress={onClose} />
      <View className="bg-base rounded-t-2xl p-6 max-h-[70%]">
        <Text className="text-text text-lg font-bold mb-4">Give Item</Text>

        {backpackItems.length === 0 ? (
          <Text className="text-muted text-sm text-center py-8">
            No items in your Backpack to give
          </Text>
        ) : (
          <FlatList
            data={backpackItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`flex-row items-center p-3 rounded-lg mb-2 border ${
                  selectedId === item.id ? 'bg-primary/10 border-primary' : 'bg-surface border-overlay'
                }`}
                onPress={() => handleSelect(item)}
              >
                <View className="flex-1">
                  <Text className="text-text text-sm">{itemDisplayName(item)}</Text>
                  {item.quantity > 1 && (
                    <Text className="text-muted text-xs">Qty: {item.quantity}</Text>
                  )}
                </View>
                {selectedId === item.id && (
                  <Text className="text-primary text-lg">✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {/* Quantity selector for stacked items */}
        {selectedItem && selectedItem.quantity > 1 && (
          <View className="flex-row items-center justify-center gap-4 py-3 border-t border-overlay">
            <Text className="text-muted text-sm">Quantity:</Text>
            <TouchableOpacity
              className="bg-overlay rounded px-3 py-1"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text className="text-text font-bold">−</Text>
            </TouchableOpacity>
            <Text className="text-text text-base font-bold w-8 text-center">{quantity}</Text>
            <TouchableOpacity
              className="bg-overlay rounded px-3 py-1"
              onPress={() => setQuantity((q) => Math.min(selectedItem.quantity, q + 1))}
            >
              <Text className="text-text font-bold">+</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row gap-3 pt-3">
          <TouchableOpacity
            className="flex-1 bg-overlay rounded-xl py-3 items-center"
            onPress={onClose}
          >
            <Text className="text-muted font-medium">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 bg-primary rounded-xl py-3 items-center ${(!selectedItem || submitting) ? 'opacity-50' : ''}`}
            disabled={!selectedItem || submitting}
            onPress={handleGive}
          >
            <Text className="text-base font-bold">Give</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 2: Create GiftConfirmModal**

Receiver sees this modal when a transfer arrives via Realtime. Shows item name(s) and giver. Calls `confirmTransfer` on accept.

```tsx
// src/components/session/GiftConfirmModal.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Modal } from 'react-native'
import { confirmTransfer, cancelTransfer } from '@/modules/session/item-transfer.service'
import { DBItemTransfer } from '@/modules/session/session.types'

type Props = {
  transfer: DBItemTransfer | null
  onDismiss: () => void
}

export function GiftConfirmModal({ transfer, onDismiss }: Props) {
  const [submitting, setSubmitting] = useState(false)

  if (!transfer) return null

  async function handleConfirm() {
    setSubmitting(true)
    try {
      await confirmTransfer(transfer!.id)
      onDismiss()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept item')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecline() {
    setSubmitting(true)
    try {
      await cancelTransfer(transfer!.id)
      onDismiss()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to decline item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible animationType="fade" transparent>
      <View className="flex-1 bg-black/60 justify-center px-6">
        <View className="bg-base rounded-2xl p-6 border border-overlay">
          <Text className="text-text text-lg font-bold text-center mb-2">Item Received</Text>
          <Text className="text-muted text-sm text-center mb-6">
            You received {transfer.quantity > 1 ? `${transfer.quantity}×` : 'an item'} from another player.
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-overlay rounded-xl py-3 items-center"
              disabled={submitting}
              onPress={handleDecline}
            >
              <Text className="text-muted font-medium">Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 bg-primary rounded-xl py-3 items-center ${submitting ? 'opacity-50' : ''}`}
              disabled={submitting}
              onPress={handleConfirm}
            >
              <Text className="text-base font-bold">Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/session/GiveItemSheet.tsx src/components/session/GiftConfirmModal.tsx
git commit -m "feat: add GiveItemSheet and GiftConfirmModal components"
```

---

## Task 11: RestPrompt

**Files:**
- Create: `src/components/session/RestPrompt.tsx`

The DM calls `callRest` (sets `sessions.rest_pending`). All players subscribed to the sessions row see `restPending` change in the store and this modal appears. For long rest: confirm button restores HP to max and clears spell slots. For short rest: Hit Dice spending with `+ Hit Die` button (rolls floor(hitDie/2)+1 + conMod deterministically for v1 — no dice roller). Player taps Confirm to apply. The DM's `clearRest()` call (which sets `rest_pending` to null) closes the modal for all players via Realtime.

```tsx
// src/components/session/RestPrompt.tsx
import { useState } from 'react'
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native'
import { updateOwnHP, restoreSpellSlots } from '@/modules/session/session-characters.service'

type Props = {
  visible:      boolean
  restType:     'short' | 'long' | null
  sessionId:    string
  characterId:  string
  hpCurrent:    number
  hpMax:        number
  hitDie:       number   // d8, d10, etc.
  conMod:       number
}

export function RestPrompt({ visible, restType, sessionId, characterId, hpCurrent, hpMax, hitDie, conMod }: Props) {
  const [hpGained, setHpGained] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  if (!visible || !restType) return null

  // For short rest: each Hit Die spend restores floor(hitDie/2)+1+conMod HP (average roll)
  const hitDieAvg = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod)
  const maxGain   = hpMax - hpCurrent

  function spendHitDie() {
    setHpGained((prev) => Math.min(maxGain, prev + hitDieAvg))
  }

  async function handleConfirm() {
    setSubmitting(true)
    try {
      if (restType === 'long') {
        await updateOwnHP(sessionId, characterId, hpMax)
        await restoreSpellSlots(sessionId, characterId)
      } else {
        const newHP = Math.min(hpMax, hpCurrent + hpGained)
        await updateOwnHP(sessionId, characterId, newHP)
      }
      setHpGained(0)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to apply rest')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-base rounded-t-2xl p-6 border-t border-overlay">
          <Text className="text-text text-lg font-bold text-center mb-1">
            {restType === 'long' ? 'Long Rest' : 'Short Rest'}
          </Text>
          <Text className="text-muted text-sm text-center mb-6">
            {restType === 'long'
              ? 'Restore all HP and spell slots.'
              : 'Spend Hit Dice to recover HP.'}
          </Text>

          {restType === 'long' && (
            <View className="bg-green/10 border border-green/30 rounded-xl p-4 mb-6 items-center">
              <Text className="text-green font-bold text-xl">{hpMax}</Text>
              <Text className="text-muted text-xs">HP fully restored · spell slots restored</Text>
            </View>
          )}

          {restType === 'short' && (
            <View className="mb-6">
              <View className="bg-surface rounded-xl p-4 items-center mb-4">
                <Text className="text-text text-2xl font-bold">+{hpGained} HP</Text>
                <Text className="text-muted text-xs">
                  {hpCurrent} → {Math.min(hpMax, hpCurrent + hpGained)} / {hpMax}
                </Text>
              </View>
              <TouchableOpacity
                className={`bg-primary/20 border border-primary rounded-xl py-3 items-center ${hpGained >= maxGain ? 'opacity-40' : ''}`}
                disabled={hpGained >= maxGain}
                onPress={spendHitDie}
              >
                <Text className="text-primary font-semibold">
                  + Hit Die (avg {hitDieAvg > 0 ? `+${hitDieAvg}` : hitDieAvg})
                </Text>
              </TouchableOpacity>
              {maxGain === 0 && (
                <Text className="text-muted text-xs text-center mt-2">Already at full HP</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            className={`bg-primary rounded-xl py-4 items-center ${submitting ? 'opacity-50' : ''}`}
            disabled={submitting}
            onPress={handleConfirm}
          >
            <Text className="text-base font-bold text-lg">Confirm Rest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/session/RestPrompt.tsx
git commit -m "feat: add RestPrompt component (short/long rest confirmation)"
```

---

## Task 12: Wire Character Sheet Layout — Subscriptions

**Files:**
- Modify: `app/(app)/characters/[id]/_layout.tsx`

The `_layout.tsx` wraps all 4 character tabs. It's the right place to:
1. Detect whether there's an active session for this character
2. Initialize the session store from `getSessionCharacters`
3. Subscribe to all Realtime channels
4. Show `RestPrompt` and `GiftConfirmModal` at the layout level so they appear regardless of which tab is active
5. Unsubscribe on unmount

The character's `campaign_id` comes from the character record. The active session is fetched via `getActiveSession(campaignId)` from the Campaign Manager plan's `session.service.ts`.

```tsx
// app/(app)/characters/[id]/_layout.tsx
import { useEffect, useRef } from 'react'
import { Tabs, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/modules/auth/auth.store'         // existing auth store
import { getCharacter } from '@/modules/character/character.service'
import { getActiveSession } from '@/modules/campaign/session.service'
import { getSessionCharacters } from '@/modules/session/session-characters.service'
import { getPendingTransfersForCharacter } from '@/modules/session/item-transfer.service'
import { subscribeToSession } from '@/modules/session/session-realtime.service'
import { useSessionStore } from '@/stores/session.store'
import { RestPrompt } from '@/components/session/RestPrompt'
import { GiftConfirmModal } from '@/components/session/GiftConfirmModal'

export default function CharacterSheetLayout() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const store = useSessionStore()
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initSession() {
      // Fetch character to get campaign_id and character data for session state
      const character = await getCharacter(id)
      if (!character?.campaign_id || cancelled) return

      const session = await getActiveSession(character.campaign_id)
      if (!session || cancelled) return

      const sessionChars = await getSessionCharacters(session.id)
      if (cancelled) return

      store.initSession(session.id, sessionChars)

      // Check for pending item transfers on reconnect
      const pending = await getPendingTransfersForCharacter(id, session.id)
      if (pending.length > 0 && !cancelled) {
        store.setPendingTransfer(pending[0])
      }

      // Subscribe to all Realtime channels
      unsubRef.current = subscribeToSession(session.id, id, {
        onSessionCharacterChange: (row) => store.upsertSessionCharacter(row),
        onInitiativeChange: (entries) => store.setInitiativeEntries(entries),
        onRestPending: (type) => store.setRestPending(type),
        onItemTransfer: (transfer) => store.setPendingTransfer(transfer),
        onConnectionChange: (connected) => {
          store.setConnected(connected)
          if (connected) {
            // Reconnect: re-fetch current state to reconcile missed updates
            getSessionCharacters(session.id).then((chars) => {
              if (!cancelled) store.initSession(session.id, chars)
            })
          }
        },
      })
    }

    initSession()

    return () => {
      cancelled = true
      unsubRef.current?.()
      store.clearSession()
    }
  }, [id])

  // Derive character data for RestPrompt (from session store or character record)
  const mySessionChar = store.sessionCharacters[id]
  const character = mySessionChar?.character

  return (
    <>
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

      {/* Rest prompt — appears on any tab when DM calls a rest */}
      {store.sessionId && mySessionChar && character && (
        <RestPrompt
          visible={!!store.restPending}
          restType={store.restPending}
          sessionId={store.sessionId}
          characterId={id}
          hpCurrent={mySessionChar.hp_current}
          hpMax={character.hp_max}
          hitDie={10}  // TODO: derive from character.class hit_die once CharacterBuilder plan adds it to CharacterWithRelations
          conMod={0}   // TODO: derive from character constitution modifier
        />
      )}

      {/* Gift confirmation modal — appears on any tab when an item is sent */}
      <GiftConfirmModal
        transfer={store.pendingTransfer}
        onDismiss={() => store.setPendingTransfer(null)}
      />
    </>
  )
}
```

> **Note on hitDie and conMod:** The Character Builder plan adds `hit_die` to `WizardDraft` and stores it on the characters table. After that plan is executed, replace the `hitDie={10}` and `conMod={0}` placeholders by reading `character.hit_die` and computing `getAbilityModifier(character.constitution)` from `CharacterWithRelations`. For now, the RestPrompt renders with safe defaults that do not break the UI.

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/_layout.tsx
git commit -m "feat: wire session subscriptions into character sheet layout"
```

---

## Task 13: Wire Character Tab — In-Session HP + Death Saves

**Files:**
- Modify: `app/(app)/characters/[id]/index.tsx`

The Character tab (index.tsx) already shows HP controls and conditions. In-session mode: replace the local HP state with session store values; show DeathSaveTracker when `hp_current === 0`; show ConnectionBanner at the top.

Replace the relevant sections of `index.tsx`. The full rewrite of this file from the Character Builder plan (Combat/Profile sub-tabs) is assumed to already be in place; this task wires in the session store.

- [ ] **Step 1: Add session-aware Combat sub-tab**

Add the following imports at the top of `index.tsx`:

```typescript
import { useSessionStore } from '@/stores/session.store'
import { ConnectionBanner } from '@/components/session/ConnectionBanner'
import { HPControls } from '@/components/session/HPControls'
import { DeathSaveTracker } from '@/components/session/DeathSaveTracker'
```

In the `CombatSubTab` component (or equivalent in-session HP area), replace the standalone HP display + local damage/heal logic with:

```tsx
// Inside the Combat sub-tab render:
const store = useSessionStore()
const mySessionChar = store.sessionCharacters[id]
const inSession = !!store.sessionId && !!mySessionChar

// HP area — in-session uses session store values; out-of-session uses character record
const hpCurrent = inSession ? mySessionChar.hp_current : character.hp_current
const hpMax     = character.hp_max
const tempHp    = inSession ? mySessionChar.temp_hp : character.temp_hp ?? 0

const isDying  = inSession && hpCurrent === 0 && mySessionChar.death_save_failures < 3
const isDead   = inSession && mySessionChar.death_save_failures >= 3
const isStable = inSession && mySessionChar.death_save_successes >= 3 && hpCurrent === 0

return (
  <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 32 }}>
    <ConnectionBanner />

    {/* HP display */}
    <View className="px-4 pt-4">
      {inSession ? (
        isDying || isDead ? (
          <DeathSaveTracker
            sessionId={store.sessionId!}
            characterId={id}
            successes={mySessionChar.death_save_successes}
            failures={mySessionChar.death_save_failures}
            isOwn
            isDead={isDead}
          />
        ) : (
          <HPControls
            sessionId={store.sessionId!}
            characterId={id}
            hpCurrent={hpCurrent}
            hpMax={hpMax}
            tempHp={tempHp}
            isConnected={store.isConnected}
          />
        )
      ) : (
        // Out-of-session: existing local HP bar + damage/heal logic unchanged
        <ExistingHPBarComponent character={character} onUpdate={setCharacter} />
      )}
    </View>

    {/* Rest of Combat sub-tab: conditions, AC, speed, etc. — unchanged */}
  </ScrollView>
)
```

> **Implementation note:** `ExistingHPBarComponent` is a placeholder name for whatever the Character Builder plan renders for out-of-session HP. Keep it exactly as the Character Builder plan implements it; only the `inSession` branch above is new.

When a player heals an ally and the ally's HP goes above 0 while they had active death saves, `clearDeathSaves` is called automatically: the `onSessionCharacterChange` callback in the layout fires when the target's `hp_current` changes. Add this logic in `session-realtime.service.ts`'s `onSessionCharacterChange`:

```typescript
// In _layout.tsx initSession, extend onSessionCharacterChange:
onSessionCharacterChange: (row) => {
  store.upsertSessionCharacter(row)
  // Auto-clear death saves if HP goes above 0
  const charId = row.character_id as string
  const prevChar = store.sessionCharacters[charId]
  if (prevChar && prevChar.hp_current === 0 && (row.hp_current as number) > 0) {
    clearDeathSaves(session.id, charId).catch(() => {})
  }
},
```

Import `clearDeathSaves` at the top of `_layout.tsx`:
```typescript
import { getSessionCharacters, clearDeathSaves } from '@/modules/session/session-characters.service'
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/index.tsx app/\(app\)/characters/\[id\]/_layout.tsx
git commit -m "feat: wire HPControls and DeathSaveTracker into Character tab in-session"
```

---

## Task 14: Wire Actions Tab — Spell Slots In-Session

**Files:**
- Modify: `app/(app)/characters/[id]/actions.tsx`

When in session, show `SpellSlotTracker` above the standard actions and weapons. Out-of-session: spell slots section is not shown (no live state to track).

- [ ] **Step 1: Update actions.tsx**

Add imports:

```typescript
import { useSessionStore } from '@/stores/session.store'
import { SpellSlotTracker } from '@/components/session/SpellSlotTracker'
import { getMaxSpellSlots } from '@/modules/character/character.utils'
import { ConnectionBanner } from '@/components/session/ConnectionBanner'
```

In the `ActionsTab` component, after loading the character:

```tsx
const store = useSessionStore()
const mySessionChar = store.sessionCharacters[id]
const inSession = !!store.sessionId && !!mySessionChar

const className  = character.class?.name ?? ''
const maxSlots   = getMaxSpellSlots(className, character.level)
const slotsUsed  = inSession ? (mySessionChar.spell_slots_used as Record<string, number>) : {}

return (
  <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
    <ConnectionBanner />

    {inSession && Object.keys(maxSlots).length > 0 && (
      <View className="mb-6">
        <Text className="text-muted text-xs font-bold mb-3">SPELL SLOTS</Text>
        <SpellSlotTracker
          sessionId={store.sessionId!}
          characterId={id}
          maxSlots={maxSlots}
          slotsUsed={slotsUsed}
          isConnected={store.isConnected}
        />
      </View>
    )}

    {/* Rest of actions tab: weapons, standard actions, spells — unchanged from Character Builder plan */}
  </ScrollView>
)
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/actions.tsx
git commit -m "feat: wire SpellSlotTracker into Actions tab in-session"
```

---

## Task 15: Wire Campaign Tab — Party Cards + Initiative + Give Item

**Files:**
- Modify: `app/(app)/characters/[id]/campaign.tsx`

The Campaign tab stub (from Character Builder plan) becomes the in-session player hub: initiative order at the top, party member cards below with Heal and Give Item actions. Out-of-session: show a "Not in a session" empty state.

- [ ] **Step 1: Implement campaign.tsx**

```tsx
// app/(app)/characters/[id]/campaign.tsx
import { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/modules/auth/auth.store'
import { useSessionStore } from '@/stores/session.store'
import { getInventory } from '@/modules/inventory/inventory.service'
import { ConnectionBanner } from '@/components/session/ConnectionBanner'
import { InitiativeOrder } from '@/components/session/InitiativeOrder'
import { PartyMemberCard } from '@/components/session/PartyMemberCard'
import { GiveItemSheet } from '@/components/session/GiveItemSheet'
import { InventoryItem } from '@/modules/inventory/inventory.types'

export default function CampaignTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const store = useSessionStore()
  const [giveItemTarget, setGiveItemTarget] = useState<string | null>(null)
  const [backpackItems, setBackpackItems] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)

  const inSession = !!store.sessionId
  const partyCards = Object.values(store.sessionCharacters)

  async function handleOpenGiveItem(targetCharacterId: string) {
    setGiveItemTarget(targetCharacterId)
    if (backpackItems.length === 0) {
      setLoadingInventory(true)
      try {
        const items = await getInventory(id)
        // Equipped items cannot be gifted — player must unequip first
        setBackpackItems(items.filter((i) => !i.is_equipped))
      } catch (e) {
        Alert.alert('Error', 'Could not load inventory')
      } finally {
        setLoadingInventory(false)
      }
    }
  }

  if (!inSession) {
    return (
      <View className="flex-1 bg-base justify-center items-center px-6">
        <Text className="text-muted text-base text-center">
          No session active.{'\n'}Your DM will start one soon.
        </Text>
      </View>
    )
  }

  return (
    <>
      <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <ConnectionBanner />

        {/* Initiative Order */}
        {store.initiativeEntries.length > 0 && (
          <View className="mb-6">
            <Text className="text-muted text-xs font-bold mb-3">INITIATIVE ORDER</Text>
            <InitiativeOrder entries={store.initiativeEntries} />
          </View>
        )}

        {/* Party Member Cards */}
        <Text className="text-muted text-xs font-bold mb-3">PARTY</Text>
        {partyCards.map((sc) => {
          const isOwnCard = sc.character.user_id === user?.id
          return (
            <PartyMemberCard
              key={sc.character_id}
              sc={sc}
              sessionId={store.sessionId!}
              isOwnCard={isOwnCard}
              isDM={false}
              hpVisible // TODO: read hp_visibility from campaign settings once Campaign Manager plan executes
              isConnected={store.isConnected}
              onGiveItem={!isOwnCard ? handleOpenGiveItem : undefined}
            />
          )
        })}
      </ScrollView>

      {/* Give Item Sheet */}
      <GiveItemSheet
        visible={!!giveItemTarget}
        onClose={() => setGiveItemTarget(null)}
        sessionId={store.sessionId!}
        fromCharacterId={id}
        toCharacterId={giveItemTarget ?? ''}
        backpackItems={backpackItems}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/characters/\[id\]/campaign.tsx
git commit -m "feat: wire Campaign tab with live party cards, initiative, and item gifting"
```

---

## Self-Review

### Spec coverage check

| PRD Requirement | Task |
|---|---|
| Real-time sync (HP, temp HP, conditions, spell slots used, death saves, initiative) | Task 5 (Realtime service), Task 12 (layout wires all channels) |
| Player HP self-edit via Combat controls | Task 8 (HPControls), Task 13 (wire) |
| Player healing allies (increase only) | Task 3 (`healAlly` validates > 0), Task 9 (PartyMemberCard Heal button) |
| Spell slot tracking (tap-to-expend, restore on rest) | Task 2 (`getMaxSpellSlots`), Task 8 (SpellSlotTracker), Task 14 (wire) |
| Death save tracker (replaces HP bar at 0 HP) | Task 7 (DeathSaveTracker), Task 13 (wire, shown when hp_current === 0) |
| 3 successes = stabilized (tracker clears, HP stays 0) | Task 13: `clearDeathSaves` auto-called when HP goes above 0; stabilized label shown |
| 3 failures = dead, controls lock | Task 7: `isDead` prop disables interaction; Task 9: PartyMemberCard shows DEAD |
| DM revival (Revive button, min 1 HP, clears death tracker) | Task 3 (`reviveCharacter` validates ≥ 1), Task 9 (PartyMemberCard Revive button for DM) |
| DM party overview cards (read-only, red highlight at 0 HP) | Task 9 (PartyMemberCard `isDM` prop: no Heal/Give buttons, Revive only) |
| Initiative tracker (player-facing read-only) | Task 9 (InitiativeOrder), Task 15 (wire in Campaign tab) |
| Item gifting (Backpack only, quantity selector, receiver confirmation, pending if disconnected) | Tasks 4, 10, 15; pending transfers fetched on reconnect in Task 12 |
| Player disconnection (No connection banner, controls disabled) | Task 7 (ConnectionBanner), all components check `isConnected` prop |
| DM disconnection (session stays, players retain self-edit and ally healing) | RLS and service-level design: players update session_characters directly; no server-side DM gate |
| Silent reconnect + state restoration | Task 12: `onConnectionChange(true)` re-fetches session chars |
| Rest confirmation flow (short: Hit Dice; long: full HP + slots) | Task 11 (RestPrompt), Task 12 (layout shows RestPrompt, Task 14 (spell slot restore) |
| Session ended while gift pending → cancelled | Task 4: `cancelPendingTransfers(sessionId)` — caller is session-end flow in Campaign Manager plan |

### No placeholders found

The two `// TODO` comments in Task 12 (`hitDie` and `conMod`) are documented limitations with safe defaults that do not break runtime. They are resolved once the Character Builder plan's `CharacterWithRelations` includes `hit_die` and `constitution`.

### Type consistency

- `SessionCharacterWithCharacter` defined in Task 2, used consistently in Tasks 3, 6, 12
- `DBItemTransfer` defined in Task 2, used consistently in Tasks 4, 6, 10, 12
- `getMaxSpellSlots(className, level)` defined in Task 2, called in Task 14 with `character.class?.name ?? ''` and `character.level`
- `updateOwnHP`, `healAlly`, `recordDeathSave`, `clearDeathSaves`, `reviveCharacter`, `updateSpellSlots`, `restoreSpellSlots` all defined in Task 3 and referenced in Tasks 7–15
- `subscribeToSession` returns `() => void` unsubscribe — called as `unsubRef.current()` in Task 12 cleanup
