# Character Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified character inventory system that links to SRD equipment, SRD magic items, DM-created campaign items, and player-created custom content — all in one character-scoped list.

**Architecture:** Two new tables: `campaign_items` (DM-created items scoped to a campaign) and `character_inventory` (unified item list with exactly-one-source CHECK constraint across 4 FKs). Existing `character_equipment` rows are migrated into `character_inventory`; `character_equipment` is kept but superseded. A new `inventory` module contains types and service functions; the character service is extended to load inventory via `SHEET_SELECT`.

**Tech Stack:** PostgreSQL (Supabase), TypeScript, Zustand, Jest, `@/lib/supabase` Supabase client, Expo SDK 52.

---

### Task 1: Database Schema Migration

**Files:**
- Create: `supabase/migrations/20260510000010_inventory_schema.sql`
- Create: `supabase/migrations/20260510000011_inventory_rls.sql`

- [ ] **Step 1: Write the schema migration**

Create `supabase/migrations/20260510000010_inventory_schema.sql`:

```sql
-- campaign_items: items created by a DM, scoped to their campaign
create table public.campaign_items (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid references public.campaigns on delete cascade not null,
  created_by       uuid references public.users not null,
  name             text not null,
  item_type        text not null,
  rarity           text check (rarity in ('Common','Uncommon','Rare','Very Rare','Legendary','Artifact','Varies')),
  requires_attunement boolean not null default false,
  attunement_condition text,
  description      text,
  properties       jsonb not null default '{}',
  created_at       timestamptz default now()
);

-- character_inventory: unified item list — exactly one FK source per row
create table public.character_inventory (
  id                uuid primary key default gen_random_uuid(),
  character_id      uuid references public.characters on delete cascade not null,
  -- item source — exactly one must be non-null (enforced by CHECK below)
  equipment_id      uuid references public.equipment on delete cascade,
  magic_item_id     uuid references public.magic_items on delete cascade,
  campaign_item_id  uuid references public.campaign_items on delete cascade,
  custom_content_id uuid references public.user_content on delete cascade,
  -- inventory metadata
  quantity          integer not null default 1 check (quantity > 0),
  is_equipped       boolean not null default false,
  is_attuned        boolean not null default false,
  notes             text not null default '',
  acquired_at       timestamptz default now(),
  check (
    (equipment_id      is not null)::int +
    (magic_item_id     is not null)::int +
    (campaign_item_id  is not null)::int +
    (custom_content_id is not null)::int = 1
  )
);

-- Migrate existing character_equipment rows into character_inventory.
-- character_equipment guarantees exactly one of (equipment_id, custom_content_id) is set,
-- so the CHECK constraint above is satisfied for all migrated rows.
insert into public.character_inventory
  (character_id, equipment_id, custom_content_id, quantity, is_equipped)
select
  character_id, equipment_id, custom_content_id, quantity, is_equipped
from public.character_equipment;

-- Indexes
create index on public.campaign_items (campaign_id);
create index on public.campaign_items (created_by);
create index on public.character_inventory (character_id);
create index on public.character_inventory (equipment_id)     where equipment_id      is not null;
create index on public.character_inventory (magic_item_id)    where magic_item_id     is not null;
create index on public.character_inventory (campaign_item_id) where campaign_item_id  is not null;
create index on public.character_inventory (custom_content_id) where custom_content_id is not null;
```

- [ ] **Step 2: Write the RLS migration**

Create `supabase/migrations/20260510000011_inventory_rls.sql`:

```sql
-- Enable RLS on new tables
alter table public.campaign_items     enable row level security;
alter table public.character_inventory enable row level security;

-- magic_items was created in 20260510000001 but RLS was not added there
alter table public.magic_items enable row level security;
create policy "SRD magic items readable by all"
  on public.magic_items for select using (auth.role() = 'authenticated');

-- campaign_items: DMs manage; campaign members read
create policy "DMs manage campaign items"
  on public.campaign_items for all
  using (
    exists (select 1 from public.campaigns where id = campaign_id and dm_id = auth.uid())
  )
  with check (
    exists (select 1 from public.campaigns where id = campaign_id and dm_id = auth.uid())
  );

create policy "Members can read campaign items"
  on public.campaign_items for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaign_items.campaign_id and user_id = auth.uid()
    )
  );

-- character_inventory: character owner can CRUD; campaign DMs can read
create policy "Users manage own character inventory"
  on public.character_inventory for all
  using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

create policy "DMs can read campaign character inventory"
  on public.character_inventory for select
  using (
    exists (
      select 1 from public.characters ch
      join public.campaign_members cm on cm.character_id = ch.id
      join public.campaigns c on c.id = cm.campaign_id
      where ch.id = character_inventory.character_id
        and c.dm_id = auth.uid()
    )
  );
```

- [ ] **Step 3: Apply the schema migration**

Use the Supabase MCP tool:
```
mcp__supabase__apply_migration
  name: "20260510000010_inventory_schema"
  query: <contents of 20260510000010_inventory_schema.sql>
```

Expected: migration applied successfully, no errors.

- [ ] **Step 4: Apply the RLS migration**

```
mcp__supabase__apply_migration
  name: "20260510000011_inventory_rls"
  query: <contents of 20260510000011_inventory_rls.sql>
```

Expected: migration applied successfully, no errors.

- [ ] **Step 5: Verify tables exist**

Run via `mcp__supabase__execute_sql`:
```sql
select count(*) from public.campaign_items;
select count(*) from public.character_inventory;
-- Should match count in character_equipment (migrated rows)
select count(*) from public.character_equipment;
```

- [ ] **Step 6: Regenerate TypeScript types**

Use `mcp__supabase__generate_typescript_types`. Write the output to `src/types/database.types.ts`.

Alternatively via CLI:
```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> --schema public > src/types/database.types.ts
```

The new types should include `campaign_items` and `character_inventory` table Row/Insert/Update definitions.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260510000010_inventory_schema.sql \
        supabase/migrations/20260510000011_inventory_rls.sql \
        src/types/database.types.ts
git commit -m "feat: add campaign_items and character_inventory tables with RLS"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/modules/inventory/inventory.types.ts`

- [ ] **Step 1: Write inventory.types.ts**

This file exports all types needed by the inventory and campaign-items services.

```typescript
import { Database } from '@/types/database.types'
import { DBEquipment } from '@/modules/character/character.types'

// Raw DB row types from generated types
export type DBMagicItem    = Database['public']['Tables']['magic_items']['Row']
export type DBCampaignItem = Database['public']['Tables']['campaign_items']['Row']
export type DBInventoryRow = Database['public']['Tables']['character_inventory']['Row']

type CustomContentRef = { id: string; name: string; properties: Record<string, unknown> }

// A fully-joined inventory row (what getInventory returns)
export type InventoryItem = DBInventoryRow & {
  equipment:     DBEquipment    | null
  magic_item:    DBMagicItem    | null
  campaign_item: DBCampaignItem | null
  custom_item:   CustomContentRef | null
}

// Input for adding an item — exactly one of the four ID fields must be provided
export type AddInventoryItemInput = {
  equipment_id?:      string
  magic_item_id?:     string
  campaign_item_id?:  string
  custom_content_id?: string
  quantity?:          number
  is_equipped?:       boolean
  is_attuned?:        boolean
  notes?:             string
}

// Fields that can be updated after an item is in the inventory
export type UpdateInventoryItemInput = {
  quantity?:    number
  is_equipped?: boolean
  is_attuned?:  boolean
  notes?:       string
}

// Input for creating a DM campaign item
export type CreateCampaignItemInput = {
  name:                string
  item_type:           string
  rarity?:             DBCampaignItem['rarity']
  requires_attunement?: boolean
  attunement_condition?: string
  description?:        string
  properties?:         Record<string, unknown>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/inventory/inventory.types.ts
git commit -m "feat: add inventory TypeScript types"
```

---

### Task 3: Campaign Items Service

**Files:**
- Create: `src/modules/campaign/campaign-items.service.ts`
- Create: `__tests__/modules/campaign/campaign-items.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/campaign/campaign-items.service.test.ts`:

```typescript
import {
  getCampaignItems,
  createCampaignItem,
  updateCampaignItem,
  deleteCampaignItem,
} from '@/modules/campaign/campaign-items.service'

const mockSingle = jest.fn()
const mockEq     = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockOrder  = jest.fn()

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
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq, select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('getCampaignItems', () => {
  it('queries campaign_items filtered by campaign_id', async () => {
    await getCampaignItems('campaign-1')
    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockEq).toHaveBeenCalledWith('campaign_id', 'campaign-1')
  })

  it('throws on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getCampaignItems('campaign-1')).rejects.toThrow('DB error')
  })
})

describe('createCampaignItem', () => {
  it('inserts into campaign_items with campaign_id and created_by', async () => {
    const created = { id: 'item-1', name: 'Sword of Plot', campaign_id: 'campaign-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq, order: mockOrder })

    const result = await createCampaignItem('campaign-1', 'dm-user-1', {
      name: 'Sword of Plot',
      item_type: 'weapon',
    })

    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: 'campaign-1',
        created_by:  'dm-user-1',
        name:        'Sword of Plot',
        item_type:   'weapon',
      })
    )
    expect(result.id).toBe('item-1')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(
      createCampaignItem('campaign-1', 'dm-1', { name: 'X', item_type: 'misc' })
    ).rejects.toThrow('insert failed')
  })
})

describe('updateCampaignItem', () => {
  it('updates a campaign item by id', async () => {
    const updated = { id: 'item-1', name: 'Sword of Plot (Updated)' }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq })
    mockSelect.mockReturnValue({ single: mockSingle })

    const result = await updateCampaignItem('item-1', { name: 'Sword of Plot (Updated)' })
    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockEq).toHaveBeenCalledWith('id', 'item-1')
    expect(result.name).toBe('Sword of Plot (Updated)')
  })
})

describe('deleteCampaignItem', () => {
  it('deletes a campaign item by id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await deleteCampaignItem('item-1')
    expect(supabase.from).toHaveBeenCalledWith('campaign_items')
    expect(mockEq).toHaveBeenCalledWith('id', 'item-1')
  })

  it('throws on error', async () => {
    mockEq.mockResolvedValue({ error: { message: 'delete failed' } })
    await expect(deleteCampaignItem('item-1')).rejects.toThrow('delete failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/modules/campaign/campaign-items.service.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/modules/campaign/campaign-items.service'`

- [ ] **Step 3: Implement campaign-items.service.ts**

Create `src/modules/campaign/campaign-items.service.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { DBCampaignItem, CreateCampaignItemInput } from '@/modules/inventory/inventory.types'

type CampaignItemInsert = Database['public']['Tables']['campaign_items']['Insert']
type CampaignItemUpdate = Database['public']['Tables']['campaign_items']['Update']

export async function getCampaignItems(campaignId: string): Promise<DBCampaignItem[]> {
  const { data, error } = await supabase
    .from('campaign_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createCampaignItem(
  campaignId: string,
  createdBy: string,
  input: CreateCampaignItemInput
): Promise<DBCampaignItem> {
  const { data, error } = await supabase
    .from('campaign_items')
    .insert({
      campaign_id:          campaignId,
      created_by:           createdBy,
      name:                 input.name,
      item_type:            input.item_type,
      rarity:               input.rarity ?? null,
      requires_attunement:  input.requires_attunement ?? false,
      attunement_condition: input.attunement_condition ?? null,
      description:          input.description ?? null,
      properties:           input.properties ?? {},
    } satisfies CampaignItemInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateCampaignItem(
  id: string,
  updates: Partial<CreateCampaignItemInput>
): Promise<DBCampaignItem> {
  const { data, error } = await supabase
    .from('campaign_items')
    .update(updates as CampaignItemUpdate)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCampaignItem(id: string): Promise<void> {
  const { error } = await supabase.from('campaign_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/modules/campaign/campaign-items.service.test.ts --no-coverage
```

Expected: PASS — 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/campaign/campaign-items.service.ts \
        __tests__/modules/campaign/campaign-items.service.test.ts
git commit -m "feat: add campaign items service with CRUD and tests"
```

---

### Task 4: Inventory Service

**Files:**
- Create: `src/modules/inventory/inventory.service.ts`
- Create: `__tests__/modules/inventory/inventory.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/inventory/inventory.service.test.ts`:

```typescript
import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
} from '@/modules/inventory/inventory.service'

const mockSingle = jest.fn()
const mockEq     = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockOrder  = jest.fn()

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
  mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, eq: mockEq, select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('getInventory', () => {
  it('queries character_inventory filtered by character_id', async () => {
    await getInventory('char-1')
    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockEq).toHaveBeenCalledWith('character_id', 'char-1')
  })

  it('throws on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getInventory('char-1')).rejects.toThrow('DB error')
  })
})

describe('addInventoryItem', () => {
  it('inserts into character_inventory with equipment_id', async () => {
    const created = { id: 'inv-1', character_id: 'char-1', equipment_id: 'eq-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq, order: mockOrder })

    const result = await addInventoryItem('char-1', { equipment_id: 'eq-1', quantity: 2 })

    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        character_id: 'char-1',
        equipment_id: 'eq-1',
        quantity:     2,
      })
    )
    expect(result.id).toBe('inv-1')
  })

  it('inserts with magic_item_id', async () => {
    const created = { id: 'inv-2', character_id: 'char-1', magic_item_id: 'mi-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })

    await addInventoryItem('char-1', { magic_item_id: 'mi-1' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ magic_item_id: 'mi-1' })
    )
  })

  it('inserts with campaign_item_id', async () => {
    const created = { id: 'inv-3', character_id: 'char-1', campaign_item_id: 'ci-1' }
    mockSingle.mockResolvedValue({ data: created, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })

    await addInventoryItem('char-1', { campaign_item_id: 'ci-1' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_item_id: 'ci-1' })
    )
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(
      addInventoryItem('char-1', { equipment_id: 'eq-1' })
    ).rejects.toThrow('insert failed')
  })
})

describe('updateInventoryItem', () => {
  it('updates an inventory row by id', async () => {
    const updated = { id: 'inv-1', is_equipped: true }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle, eq: mockEq })
    mockSelect.mockReturnValue({ single: mockSingle })

    const result = await updateInventoryItem('inv-1', { is_equipped: true })
    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockEq).toHaveBeenCalledWith('id', 'inv-1')
    expect(result.is_equipped).toBe(true)
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    mockEq.mockReturnValue({ select: mockSelect, single: mockSingle })
    mockSelect.mockReturnValue({ single: mockSingle })
    await expect(updateInventoryItem('inv-1', { quantity: 3 })).rejects.toThrow('update failed')
  })
})

describe('removeInventoryItem', () => {
  it('deletes an inventory row by id', async () => {
    mockEq.mockResolvedValue({ error: null })
    await removeInventoryItem('inv-1')
    expect(supabase.from).toHaveBeenCalledWith('character_inventory')
    expect(mockEq).toHaveBeenCalledWith('id', 'inv-1')
  })

  it('throws on error', async () => {
    mockEq.mockResolvedValue({ error: { message: 'delete failed' } })
    await expect(removeInventoryItem('inv-1')).rejects.toThrow('delete failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/modules/inventory/inventory.service.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/modules/inventory/inventory.service'`

- [ ] **Step 3: Implement inventory.service.ts**

Create `src/modules/inventory/inventory.service.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import {
  InventoryItem,
  AddInventoryItemInput,
  UpdateInventoryItemInput,
} from './inventory.types'

type InventoryInsert = Database['public']['Tables']['character_inventory']['Insert']
type InventoryUpdate = Database['public']['Tables']['character_inventory']['Update']

const INVENTORY_SELECT = `
  *,
  equipment:equipment(*),
  magic_item:magic_items(*),
  campaign_item:campaign_items(*),
  custom_item:user_content!character_inventory_custom_content_id_fkey(id, name, properties)
`

export async function getInventory(characterId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('character_inventory')
    .select(INVENTORY_SELECT)
    .eq('character_id', characterId)
    .order('acquired_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as InventoryItem[]
}

export async function addInventoryItem(
  characterId: string,
  input: AddInventoryItemInput
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('character_inventory')
    .insert({
      character_id:     characterId,
      equipment_id:     input.equipment_id      ?? null,
      magic_item_id:    input.magic_item_id     ?? null,
      campaign_item_id: input.campaign_item_id  ?? null,
      custom_content_id: input.custom_content_id ?? null,
      quantity:         input.quantity    ?? 1,
      is_equipped:      input.is_equipped ?? false,
      is_attuned:       input.is_attuned  ?? false,
      notes:            input.notes       ?? '',
    } satisfies InventoryInsert)
    .select(INVENTORY_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return data as InventoryItem
}

export async function updateInventoryItem(
  id: string,
  updates: UpdateInventoryItemInput
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('character_inventory')
    .update(updates as InventoryUpdate)
    .eq('id', id)
    .select(INVENTORY_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return data as InventoryItem
}

export async function removeInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('character_inventory').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/modules/inventory/inventory.service.test.ts --no-coverage
```

Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory/inventory.service.ts \
        __tests__/modules/inventory/inventory.service.test.ts
git commit -m "feat: add inventory service with add/update/remove/get and tests"
```

---

### Task 5: Update Character Service to Include Inventory

**Files:**
- Modify: `src/modules/character/character.service.ts`
- Modify: `src/modules/character/character.types.ts`
- Modify: `__tests__/modules/character/character.service.test.ts`

The character's full sheet (loaded by `getCharacter`) should include the inventory. This task extends `SHEET_SELECT` and the `CharacterWithRelations` type.

- [ ] **Step 1: Update `CharacterWithRelations` in character.types.ts**

In `src/modules/character/character.types.ts`, add after the imports:

```typescript
import { DBMagicItem, DBCampaignItem } from '@/modules/inventory/inventory.types'
```

Then replace the `CharacterWithRelations` definition (currently ends at `character_equipment` array) by adding `character_inventory` alongside `character_equipment`:

Replace the full `CharacterWithRelations` type block:

```typescript
// OLD block to remove:
// export type CharacterWithRelations = DBCharacter & {
//   class: DBClass | null
//   ...
//   character_equipment: Array<{...}>
// }
```

With:

```typescript
export type { DBMagicItem, DBCampaignItem } from '@/modules/inventory/inventory.types'

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
  character_inventory: Array<{
    id: string
    equipment_id: string | null
    magic_item_id: string | null
    campaign_item_id: string | null
    custom_content_id: string | null
    quantity: number
    is_equipped: boolean
    is_attuned: boolean
    notes: string
    acquired_at: string | null
    equipment: DBEquipment | null
    magic_item: DBMagicItem | null
    campaign_item: DBCampaignItem | null
    custom_item: CustomContentRef | null
  }>
}
```

- [ ] **Step 2: Update `SHEET_SELECT` in character.service.ts**

In `src/modules/character/character.service.ts`, update `SHEET_SELECT` to add `character_inventory`:

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
  character_equipment(id, equipment_id, custom_content_id, quantity, is_equipped, equipment:equipment(*), custom_equipment:user_content!character_equipment_custom_content_id_fkey(id, name, properties)),
  character_inventory(id, equipment_id, magic_item_id, campaign_item_id, custom_content_id, quantity, is_equipped, is_attuned, notes, acquired_at, equipment:equipment(*), magic_item:magic_items(*), campaign_item:campaign_items(*), custom_item:user_content!character_inventory_custom_content_id_fkey(id, name, properties))
`
```

- [ ] **Step 3: Run the existing character service tests**

```bash
npx jest __tests__/modules/character/character.service.test.ts --no-coverage
```

Expected: PASS — existing tests still pass (SHEET_SELECT change doesn't affect mocked tests).

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All suites pass (campaign-items, inventory, character services, etc.).

- [ ] **Step 5: Commit**

```bash
git add src/modules/character/character.service.ts \
        src/modules/character/character.types.ts
git commit -m "feat: include character_inventory in character sheet select and types"
```

---

## Self-Review

**Spec coverage:**
- ✅ Character has an inventory (`character_inventory` table)
- ✅ Inventory links to SRD equipment (`equipment_id`)
- ✅ Inventory links to SRD magic items (`magic_item_id`)
- ✅ Inventory links to DM-created campaign items (`campaign_item_id`)
- ✅ Inventory links to player custom content (`custom_content_id`)
- ✅ Only one source FK per row (CHECK constraint)
- ✅ DM can create/update/delete campaign items (campaign-items service)
- ✅ Character owner manages their inventory (RLS + inventory service)
- ✅ Existing character_equipment data migrated to character_inventory
- ✅ Character sheet (getCharacter) includes full inventory with joins

**Type consistency check:**
- `AddInventoryItemInput` fields (`equipment_id`, `magic_item_id`, etc.) match `character_inventory` column names ✅
- `InventoryItem` join aliases (`equipment`, `magic_item`, `campaign_item`, `custom_item`) match `INVENTORY_SELECT` aliases ✅
- `CharacterWithRelations.character_inventory` array shape matches `SHEET_SELECT` projection ✅
- `CreateCampaignItemInput` fields match `campaign_items` column names ✅

**No placeholder scan:** All steps contain actual code. No "TBD", no "similar to above", no "add error handling". ✅
