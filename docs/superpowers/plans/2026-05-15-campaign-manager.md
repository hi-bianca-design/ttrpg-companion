# Campaign Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Campaign Manager module — campaign creation, invite-link join flow, party management, in-session DM controls (initiative tracker, rests, XP awards), session end flow, and session history.

**Architecture:** The `campaigns` and `campaign_members` tables are extended with settings and invite tokens. Three new tables handle initiative entries, in-session XP awards, and session-end snapshots. The campaign page is a single screen that detects an active session and switches between management and session-mode layouts. Realtime subscriptions (for live HP/conditions) are deferred to the Session Console plan — this plan covers service functions and DM-driven UI only.

**Tech Stack:** Expo (React Native + TypeScript), expo-router, Supabase (PostgreSQL + RLS + RPC), NativeWind 4, Zustand

---

## File Structure

**New files:**
- `supabase/migrations/20260515000004_campaign_extensions.sql`
- `src/modules/campaign/campaign.types.ts`
- `src/modules/campaign/campaign.service.ts`
- `src/modules/campaign/member.service.ts`
- `src/modules/campaign/session.service.ts`
- `app/(app)/campaigns/_layout.tsx`
- `app/(app)/campaigns/index.tsx`
- `app/(app)/campaigns/new.tsx`
- `app/(app)/campaigns/[id]/index.tsx`
- `app/(app)/campaigns/[id]/session-end.tsx`
- `app/(app)/campaigns/[id]/history/[sessionId].tsx`
- `app/invite/[token].tsx`

**Modified files:**
- `app/(app)/_layout.tsx` — add Campaigns tab
- `app/_layout.tsx` — exempt `/invite/` from auth redirect

---

## Task 1: DB Migration — Campaign Extensions

**Files:**
- Create: `supabase/migrations/20260515000004_campaign_extensions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260515000004_campaign_extensions.sql

-- 1. Extend campaigns table
alter table public.campaigns
  add column if not exists character_approval boolean not null default false,
  add column if not exists hp_visibility      boolean not null default true,
  add column if not exists invite_token       text unique,
  add column if not exists invite_token_generated_at timestamptz,
  add column if not exists max_players        integer not null default 6;

-- 2. Extend campaign_members — expand status set and add joined_at
alter table public.campaign_members
  drop constraint campaign_members_status_check,
  add  constraint campaign_members_status_check
    check (status in ('pending','active','removed'));
alter table public.campaign_members
  add column if not exists joined_at timestamptz default now();

-- 3. Extend sessions
alter table public.sessions
  add column if not exists session_number  integer not null default 1,
  add column if not exists shared_notes   text not null default '',
  add column if not exists rest_pending   text check (rest_pending in ('short','long'));

-- 4. Initiative entries (players + NPCs in order)
create table if not exists public.initiative_entries (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid references public.sessions on delete cascade not null,
  name                text not null,
  initiative          integer not null,
  sort_order          integer not null default 0,
  is_active_turn      boolean not null default false,
  is_player_character boolean not null default false,
  character_id        uuid references public.characters on delete cascade,
  hp_current          integer,
  hp_max              integer,
  created_at          timestamptz default now()
);
create index if not exists initiative_entries_session_id_idx on public.initiative_entries(session_id);

-- 5. In-session XP awards
create table if not exists public.session_xp_awards (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions on delete cascade not null,
  character_id uuid references public.characters on delete cascade,  -- null = whole party
  amount       integer not null check (amount > 0),
  note         text,
  awarded_at   timestamptz default now()
);
create index if not exists session_xp_awards_session_id_idx on public.session_xp_awards(session_id);

-- 6. Session-end snapshots (for session history)
create table if not exists public.session_snapshots (
  session_id       uuid references public.sessions on delete cascade,
  character_id     uuid references public.characters on delete cascade,
  hp_at_end        integer not null,
  level_at_end     integer not null,
  xp_awarded       integer not null default 0,
  conditions_at_end text[] not null default '{}',
  primary key (session_id, character_id)
);

-- 7. RLS for new tables
alter table public.initiative_entries  enable row level security;
alter table public.session_xp_awards   enable row level security;
alter table public.session_snapshots   enable row level security;

create policy "Session members read initiative entries"
  on public.initiative_entries for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = initiative_entries.session_id
        and (cm.user_id = auth.uid() or c.dm_id = auth.uid())
        and cm.status = 'active'
    )
  );

create policy "DMs manage initiative entries"
  on public.initiative_entries for all
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = initiative_entries.session_id and c.dm_id = auth.uid()
    )
  );

create policy "Session members read xp awards"
  on public.session_xp_awards for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = session_xp_awards.session_id
        and (cm.user_id = auth.uid() or c.dm_id = auth.uid())
        and cm.status = 'active'
    )
  );

create policy "DMs manage xp awards"
  on public.session_xp_awards for all
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_xp_awards.session_id and c.dm_id = auth.uid()
    )
  );

create policy "Campaign members read snapshots"
  on public.session_snapshots for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = session_snapshots.session_id
        and (cm.user_id = auth.uid() or c.dm_id = auth.uid())
    )
  );

create policy "DMs insert snapshots"
  on public.session_snapshots for insert
  with check (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_id and c.dm_id = auth.uid()
    )
  );

-- 8. Public campaign preview function (callable by anon for invite link preview)
create or replace function public.get_campaign_preview(p_token text)
returns json language plpgsql security definer as $$
declare result json;
begin
  select json_build_object(
    'id',                 c.id,
    'name',               c.name,
    'description',        c.description,
    'dm_display_name',    coalesce(u.display_name, u.username),
    'party_size',         count(cm.user_id) filter (where cm.status = 'active'),
    'character_approval', c.character_approval,
    'token_valid',        true
  )
  into result
  from public.campaigns c
  join public.users u on u.id = c.dm_id
  left join public.campaign_members cm on cm.campaign_id = c.id
  where c.invite_token = p_token
  group by c.id, c.name, c.description, u.display_name, u.username, c.character_approval;

  if result is null then
    return json_build_object('token_valid', false);
  end if;
  return result;
end;
$$;
grant execute on function public.get_campaign_preview(text) to anon, authenticated;
```

- [ ] **Step 2: Apply and regenerate types**

```bash
npx supabase db push
npx supabase gen types typescript --local > src/types/database.types.ts
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260515000004_campaign_extensions.sql src/types/database.types.ts
git commit -m "feat: campaign extensions — settings, invite tokens, initiative entries, XP awards, session snapshots"
```

---

## Task 2: campaign.types.ts

**Files:**
- Create: `src/modules/campaign/campaign.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
import { Database } from '@/types/database.types'

export type DBCampaign         = Database['public']['Tables']['campaigns']['Row']
export type DBCampaignMember   = Database['public']['Tables']['campaign_members']['Row']
export type DBSession          = Database['public']['Tables']['sessions']['Row']
export type DBInitiativeEntry  = Database['public']['Tables']['initiative_entries']['Row']
export type DBSessionXPAward   = Database['public']['Tables']['session_xp_awards']['Row']
export type DBSessionSnapshot  = Database['public']['Tables']['session_snapshots']['Row']

export type MemberStatus = 'pending' | 'active' | 'removed'

export type MemberWithDetails = DBCampaignMember & {
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  character: {
    id: string; name: string; level: number
    class: { name: string; hit_die: number } | null
  } | null
}

export type CampaignWithRelations = DBCampaign & {
  dm: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  campaign_members: MemberWithDetails[]
  active_session: DBSession | null
}

export type CampaignPreview = {
  id: string
  name: string
  description: string | null
  dm_display_name: string
  party_size: number
  character_approval: boolean
  token_valid: boolean
}

export type SessionDetail = DBSession & {
  session_xp_awards: DBSessionXPAward[]
  session_snapshots: Array<DBSessionSnapshot & {
    character: { name: string; class: { name: string } | null } | null
  }>
}

export type CreateCampaignInput = {
  name: string
  description?: string
  character_approval?: boolean
  hp_visibility?: boolean
}

export type AddInitiativeEntryInput = {
  name: string
  initiative: number
  is_player_character: boolean
  character_id?: string
  hp_max?: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/campaign/campaign.types.ts
git commit -m "feat: add campaign module types"
```

---

## Task 3: campaign.service.ts

**Files:**
- Create: `src/modules/campaign/campaign.service.ts`
- Test: `src/modules/campaign/__tests__/campaign.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/modules/campaign/__tests__/campaign.service.test.ts
import { generateInviteToken } from '../campaign.service'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: { invite_token: 'tok-123' }, error: null })) })) })) })),
    })),
  },
}))

test('generateInviteToken returns a token string', async () => {
  const token = await generateInviteToken('campaign-id')
  expect(typeof token).toBe('string')
  expect(token.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/modules/campaign/__tests__/campaign.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create campaign.service.ts**

```typescript
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import {
  DBCampaign, CampaignWithRelations, CampaignPreview, CreateCampaignInput,
} from './campaign.types'

type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

const CAMPAIGN_SELECT = `
  *,
  dm:users!campaigns_dm_id_fkey(id, username, display_name, avatar_url),
  campaign_members(
    *,
    user:users!campaign_members_user_id_fkey(id, username, display_name, avatar_url),
    character:characters(id, name, level, class:classes(name, hit_die))
  ),
  active_session:sessions(*)
`

export async function createCampaign(
  dmId: string,
  input: CreateCampaignInput
): Promise<DBCampaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      dm_id: dmId,
      name: input.name,
      description: input.description ?? null,
      character_approval: input.character_approval ?? false,
      hp_visibility: input.hp_visibility ?? true,
    } satisfies CampaignInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getCampaign(id: string): Promise<CampaignWithRelations> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  // Filter active_session: only return sessions with status 'active'
  const campaign = data as CampaignWithRelations & { active_session: any }
  const activeSessions = Array.isArray(campaign.active_session)
    ? campaign.active_session.filter((s: any) => s.status === 'active')
    : []
  return { ...campaign, active_session: activeSessions[0] ?? null }
}

export async function getMyCampaigns(userId: string): Promise<DBCampaign[]> {
  // Campaigns where user is DM or active member
  const [{ data: dmCampaigns }, { data: memberCampaigns }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('dm_id', userId).order('created_at', { ascending: false }),
    supabase
      .from('campaign_members')
      .select('campaign_id, campaigns(*)')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  const dmList = dmCampaigns ?? []
  const memberList = (memberCampaigns ?? [])
    .map((m: any) => m.campaigns)
    .filter(Boolean)
    .filter((c: any) => !dmList.find((d) => d.id === c.id))

  return [...dmList, ...memberList]
}

export async function updateCampaign(
  id: string,
  updates: Partial<Pick<CampaignUpdate, 'name' | 'description' | 'character_approval' | 'hp_visibility'>>
): Promise<DBCampaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function generateInviteToken(campaignId: string): Promise<string> {
  // Generate a random token using built-in crypto
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  const token = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('')

  const { data, error } = await supabase
    .from('campaigns')
    .update({
      invite_token: token,
      invite_token_generated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select('invite_token')
    .single()
  if (error) throw new Error(error.message)
  return data.invite_token!
}

export async function getCampaignPreview(token: string): Promise<CampaignPreview> {
  const { data, error } = await supabase.rpc('get_campaign_preview', { p_token: token })
  if (error) throw new Error(error.message)
  return data as CampaignPreview
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/modules/campaign/__tests__/campaign.service.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/campaign/campaign.service.ts src/modules/campaign/__tests__/campaign.service.test.ts
git commit -m "feat: add campaign service (create, get, invite token, preview)"
```

---

## Task 4: member.service.ts

**Files:**
- Create: `src/modules/campaign/member.service.ts`
- Test: `src/modules/campaign/__tests__/member.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { getActiveMembers, joinCampaign } from '../member.service'

const mockFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

beforeEach(() => {
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ data: [], error: null }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue({
          data: { campaign_id: 'c1', user_id: 'u1', character_id: 'ch1', status: 'active' },
          error: null,
        }),
      }),
    }),
  })
})

test('joinCampaign returns member with correct status', async () => {
  const member = await joinCampaign('c1', 'u1', 'ch1', false)
  expect(member.status).toBe('active')
})

test('joinCampaign sets status to pending when approval required', async () => {
  mockFrom.mockReturnValue({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue({
          data: { campaign_id: 'c1', user_id: 'u1', character_id: 'ch1', status: 'pending' },
          error: null,
        }),
      }),
    }),
  })
  const member = await joinCampaign('c1', 'u1', 'ch1', true)
  expect(member.status).toBe('pending')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/modules/campaign/__tests__/member.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create member.service.ts**

```typescript
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { DBCampaignMember, MemberWithDetails } from './campaign.types'

type MemberInsert = Database['public']['Tables']['campaign_members']['Insert']

const MEMBER_SELECT = `
  *,
  user:users!campaign_members_user_id_fkey(id, username, display_name, avatar_url),
  character:characters(id, name, level, class:classes(name, hit_die))
`

export async function joinCampaign(
  campaignId: string,
  userId: string,
  characterId: string,
  requiresApproval: boolean
): Promise<DBCampaignMember> {
  const { data, error } = await supabase
    .from('campaign_members')
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      character_id: characterId,
      status: requiresApproval ? 'pending' : 'active',
    } satisfies MemberInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getActiveMembers(campaignId: string): Promise<MemberWithDetails[]> {
  const { data, error } = await supabase
    .from('campaign_members')
    .select(MEMBER_SELECT)
    .eq('campaign_id', campaignId)
    .eq('status', 'active')
  if (error) throw new Error(error.message)
  return data as MemberWithDetails[]
}

export async function getAllMembers(campaignId: string): Promise<MemberWithDetails[]> {
  const { data, error } = await supabase
    .from('campaign_members')
    .select(MEMBER_SELECT)
    .eq('campaign_id', campaignId)
    .neq('status', 'removed')
  if (error) throw new Error(error.message)
  return data as MemberWithDetails[]
}

export async function approveMember(campaignId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_members')
    .update({ status: 'active' })
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function rejectMember(campaignId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_members')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function removeMember(campaignId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_members')
    .update({ status: 'removed' })
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getMyMembership(
  campaignId: string,
  userId: string
): Promise<DBCampaignMember | null> {
  const { data } = await supabase
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/modules/campaign/__tests__/member.service.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/campaign/member.service.ts src/modules/campaign/__tests__/member.service.test.ts
git commit -m "feat: add member service (join, approve, reject, remove)"
```

---

## Task 5: session.service.ts

**Files:**
- Create: `src/modules/campaign/session.service.ts`
- Test: `src/modules/campaign/__tests__/session.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { startSession, awardXP } from '../session.service'

const mockSingle = jest.fn(() => ({ data: { id: 's1', status: 'active', session_number: 1 }, error: null }))
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }))
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: mockInsert,
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({ data: [], error: null })),
          order: jest.fn(() => ({ data: [], error: null })),
          maybeSingle: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

test('startSession returns a session with status active', async () => {
  const session = await startSession('campaign-1', 1)
  expect(session.status).toBe('active')
  expect(session.session_number).toBe(1)
})

test('awardXP inserts an XP award row', async () => {
  const award = await awardXP('session-1', 'char-1', 500, 'Defeated the goblin')
  expect(award).toBeDefined()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/modules/campaign/__tests__/session.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create session.service.ts**

```typescript
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import {
  DBSession, DBInitiativeEntry, DBSessionXPAward, SessionDetail,
  AddInitiativeEntryInput,
} from './campaign.types'

type SessionInsert = Database['public']['Tables']['sessions']['Insert']
type SessionUpdate = Database['public']['Tables']['sessions']['Update']
type InitiativeInsert = Database['public']['Tables']['initiative_entries']['Insert']
type XPInsert = Database['public']['Tables']['session_xp_awards']['Insert']
type SnapshotInsert = Database['public']['Tables']['session_snapshots']['Insert']

// ── Session lifecycle ──────────────────────────────────────────────────────

export async function startSession(
  campaignId: string,
  sessionNumber: number
): Promise<DBSession> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      campaign_id: campaignId,
      status: 'active',
      session_number: sessionNumber,
      started_at: new Date().toISOString(),
    } satisfies SessionInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getActiveSession(campaignId: string): Promise<DBSession | null> {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

export async function getSessionHistory(campaignId: string): Promise<DBSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'ended')
    .order('session_number', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const [{ data: session, error }, { data: awards }, { data: snapshots }] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('session_xp_awards').select('*').eq('session_id', sessionId),
    supabase
      .from('session_snapshots')
      .select('*, character:characters(name, class:classes(name))')
      .eq('session_id', sessionId),
  ])
  if (error) throw new Error(error.message)
  return {
    ...session!,
    session_xp_awards: awards ?? [],
    session_snapshots: snapshots ?? [],
  } as SessionDetail
}

export async function endSession(
  sessionId: string,
  snapshots: SnapshotInsert[]
): Promise<void> {
  const { error: updateError } = await supabase
    .from('sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() } satisfies SessionUpdate)
    .eq('id', sessionId)
  if (updateError) throw new Error(updateError.message)

  if (snapshots.length > 0) {
    const { error: snapError } = await supabase
      .from('session_snapshots')
      .insert(snapshots)
    if (snapError) throw new Error(snapError.message)
  }
}

export async function updateSessionNotes(sessionId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ shared_notes: notes })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function callRest(
  sessionId: string,
  restType: 'short' | 'long'
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ rest_pending: restType } satisfies SessionUpdate)
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function clearRest(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ rest_pending: null } satisfies SessionUpdate)
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

// ── XP ────────────────────────────────────────────────────────────────────

export async function awardXP(
  sessionId: string,
  characterId: string | null,
  amount: number,
  note?: string
): Promise<DBSessionXPAward> {
  const { data, error } = await supabase
    .from('session_xp_awards')
    .insert({
      session_id:   sessionId,
      character_id: characterId,
      amount,
      note:         note ?? null,
    } satisfies XPInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getSessionXPAwards(sessionId: string): Promise<DBSessionXPAward[]> {
  const { data, error } = await supabase
    .from('session_xp_awards')
    .select('*')
    .eq('session_id', sessionId)
    .order('awarded_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

// ── Initiative tracker ────────────────────────────────────────────────────

export async function getInitiativeOrder(sessionId: string): Promise<DBInitiativeEntry[]> {
  const { data, error } = await supabase
    .from('initiative_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('initiative', { ascending: false })
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function addInitiativeEntry(
  sessionId: string,
  input: AddInitiativeEntryInput,
  sortOrder: number
): Promise<DBInitiativeEntry> {
  const { data, error } = await supabase
    .from('initiative_entries')
    .insert({
      session_id:          sessionId,
      name:                input.name,
      initiative:          input.initiative,
      sort_order:          sortOrder,
      is_active_turn:      false,
      is_player_character: input.is_player_character,
      character_id:        input.character_id ?? null,
      hp_current:          input.hp_max ?? null,
      hp_max:              input.hp_max ?? null,
    } satisfies InitiativeInsert)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function removeInitiativeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('initiative_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function advanceTurn(
  sessionId: string,
  entries: DBInitiativeEntry[]
): Promise<string> {
  const activeIdx = entries.findIndex((e) => e.is_active_turn)
  const nextIdx = activeIdx === -1 ? 0 : (activeIdx + 1) % entries.length
  const nextEntry = entries[nextIdx]

  // Clear all active turns, set the next one
  await supabase
    .from('initiative_entries')
    .update({ is_active_turn: false })
    .eq('session_id', sessionId)

  await supabase
    .from('initiative_entries')
    .update({ is_active_turn: true })
    .eq('id', nextEntry.id)

  return nextEntry.id
}

export async function updateNPCHP(
  entryId: string,
  hpCurrent: number
): Promise<void> {
  const { error } = await supabase
    .from('initiative_entries')
    .update({ hp_current: hpCurrent })
    .eq('id', entryId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/modules/campaign/__tests__/session.service.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/campaign/session.service.ts src/modules/campaign/__tests__/session.service.test.ts
git commit -m "feat: add session service (start/end, XP awards, initiative tracker)"
```

---

## Task 6: App Layout — Add Campaigns Tab

**Files:**
- Modify: `app/(app)/_layout.tsx`

- [ ] **Step 1: Add Campaigns tab**

```typescript
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
      <Tabs.Screen name="index"      options={{ href: null }} />
      <Tabs.Screen name="characters" options={{ title: 'Characters', tabBarLabel: 'Characters' }} />
      <Tabs.Screen name="campaigns"  options={{ title: 'Campaigns',  tabBarLabel: 'Campaigns' }} />
      <Tabs.Screen name="content"    options={{ title: 'Content',    tabBarLabel: 'Content' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create campaigns Stack layout**

Create `app/(app)/campaigns/_layout.tsx`:

```typescript
import { Stack } from 'expo-router'

export default function CampaignsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/session-end" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/history/[sessionId]" />
    </Stack>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/_layout.tsx app/\(app\)/campaigns/_layout.tsx
git commit -m "feat: add Campaigns tab to app navigation"
```

---

## Task 7: Campaign List + Create Campaign Screens

**Files:**
- Create: `app/(app)/campaigns/index.tsx`
- Create: `app/(app)/campaigns/new.tsx`

- [ ] **Step 1: Create campaign list screen**

```typescript
// app/(app)/campaigns/index.tsx
import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { getMyCampaigns } from '@/modules/campaign/campaign.service'
import { DBCampaign } from '@/modules/campaign/campaign.types'

export default function CampaignListScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<DBCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await getMyCampaigns(user.id)
      setCampaigns(data)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load campaigns')
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Campaigns</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/campaigns/new')}
          className="bg-primary px-4 py-2 rounded-xl"
        >
          <Text className="text-base font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {campaigns.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🗺️</Text>
          <Text className="text-text font-bold text-xl text-center mb-2">No campaigns yet</Text>
          <Text className="text-muted text-sm text-center mb-8">
            Create a campaign as DM, or join one using an invite link from your DM.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {campaigns.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push(`/(app)/campaigns/${c.id}`)}
              className="bg-surface rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-text font-bold text-lg">{c.name}</Text>
                  {c.description ? (
                    <Text className="text-muted text-sm mt-1" numberOfLines={2}>{c.description}</Text>
                  ) : null}
                </View>
                {c.dm_id === user?.id && (
                  <View className="bg-primary/20 px-2 py-1 rounded-full ml-2">
                    <Text className="text-primary text-xs font-medium">DM</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create campaign creation screen**

```typescript
// app/(app)/campaigns/new.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { createCampaign } from '@/modules/campaign/campaign.service'

export default function NewCampaignScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [characterApproval, setCharacterApproval] = useState(false)
  const [hpVisibility, setHpVisibility] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { Alert.alert('Name required', 'Give your campaign a name.'); return }
    if (!user) return
    setSaving(true)
    try {
      const campaign = await createCampaign(user.id, {
        name: trimmed,
        description: description.trim() || undefined,
        character_approval: characterApproval,
        hp_visibility: hpVisibility,
      })
      router.replace(`/(app)/campaigns/${campaign.id}`)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create campaign')
      setSaving(false)
    }
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-text">New Campaign</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-muted text-xs font-bold mb-2">CAMPAIGN NAME *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Curse of Strahd"
            placeholderTextColor="#6c7086"
            className="text-text text-base"
          />
        </View>

        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-muted text-xs font-bold mb-2">DESCRIPTION</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional — shown to players on the invite screen"
            placeholderTextColor="#6c7086"
            multiline
            numberOfLines={3}
            className="text-text text-sm"
            textAlignVertical="top"
          />
        </View>

        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-muted text-xs font-bold mb-4">SETTINGS</Text>

          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-text font-medium">Character approval</Text>
              <Text className="text-muted text-xs mt-0.5">
                Review characters before players join the party
              </Text>
            </View>
            <Switch
              value={characterApproval}
              onValueChange={setCharacterApproval}
              trackColor={{ true: '#cba6f7' }}
            />
          </View>

          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-text font-medium">HP visibility</Text>
              <Text className="text-muted text-xs mt-0.5">
                Party members can see each other's HP
              </Text>
            </View>
            <Switch
              value={hpVisibility}
              onValueChange={setHpVisibility}
              trackColor={{ true: '#cba6f7' }}
            />
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${!name.trim() || saving ? 'bg-overlay' : 'bg-primary'}`}
          onPress={handleCreate}
          disabled={!name.trim() || saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${name.trim() ? 'text-base' : 'text-muted'}`}>
                Create Campaign →
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/campaigns/index.tsx app/\(app\)/campaigns/new.tsx
git commit -m "feat: campaign list and create campaign screens"
```

---

## Task 8: Public Invite Preview Screen + Root Layout Update

**Files:**
- Create: `app/invite/[token].tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update root _layout.tsx to allow invite route**

Read the current `app/_layout.tsx` first. In the auth redirect logic, add a check for the invite path. Find the redirect logic and add:

```typescript
const segments = useSegments()
const isInviteRoute = segments[0] === 'invite'

// In the redirect guard, add this at the top:
if (isInviteRoute) return  // let invite page render for anyone
```

The full guard block should look like:

```typescript
// After loading check:
if (isInviteRoute) {
  // no redirect — invite page is publicly accessible
} else if (!user) {
  router.replace('/(auth)/login')
} else if (user && !profile && !inUsernameSetup) {
  router.replace('/(auth)/username-setup')
}
```

- [ ] **Step 2: Create the public invite preview screen**

```typescript
// app/invite/[token].tsx
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCampaignPreview } from '@/modules/campaign/campaign.service'
import { joinCampaign } from '@/modules/campaign/member.service'
import { getCharacters } from '@/modules/character/character.service'
import { useAuth } from '@/modules/auth/useAuth'
import { CampaignPreview } from '@/modules/campaign/campaign.types'

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [preview, setPreview] = useState<CampaignPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [characters, setCharacters] = useState<any[]>([])
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getCampaignPreview(token)
        setPreview(data)
        if (user) {
          const chars = await getCharacters(user.id)
          setCharacters(chars)
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load campaign preview.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, user])

  async function handleJoin() {
    if (!user || !selectedCharId || !preview?.id) return
    setJoining(true)
    try {
      await joinCampaign(preview.id, user.id, selectedCharId, preview.character_approval)
      if (preview.character_approval) {
        Alert.alert(
          'Request sent',
          'Your character is pending DM approval. You\'ll be notified when approved.',
          [{ text: 'OK', onPress: () => router.replace('/(app)/campaigns') }]
        )
      } else {
        router.replace(`/(app)/campaigns/${preview.id}`)
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not join campaign')
      setJoining(false)
    }
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  if (!preview?.token_valid) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-8">
        <Text className="text-4xl mb-4">🔗</Text>
        <Text className="text-text font-bold text-xl text-center mb-2">Invite link not valid</Text>
        <Text className="text-muted text-sm text-center">
          This invite link has expired or been revoked. Ask your DM for a new link.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}>
        {/* Campaign preview */}
        <View className="bg-surface rounded-2xl p-6 mb-6">
          <Text className="text-primary text-xs font-bold mb-2">CAMPAIGN INVITE</Text>
          <Text className="text-text font-bold text-2xl mb-1">{preview.name}</Text>
          <Text className="text-muted text-sm mb-4">DM: {preview.dm_display_name}</Text>
          {preview.description ? (
            <Text className="text-text text-sm mb-4">{preview.description}</Text>
          ) : null}
          <View className="flex-row gap-4">
            <View className="bg-overlay rounded-xl px-3 py-2">
              <Text className="text-muted text-xs">Party</Text>
              <Text className="text-text font-bold">{preview.party_size} / 6</Text>
            </View>
            {preview.character_approval && (
              <View className="bg-overlay rounded-xl px-3 py-2">
                <Text className="text-muted text-xs">Character approval</Text>
                <Text className="text-text font-bold">Required</Text>
              </View>
            )}
          </View>
        </View>

        {/* Not logged in */}
        {!user && (
          <View>
            <TouchableOpacity
              onPress={() => router.push(`/(auth)/signup?returnTo=/invite/${token}`)}
              className="bg-primary rounded-xl py-3 items-center mb-3"
            >
              <Text className="text-base font-semibold">Create account to join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(auth)/login?returnTo=/invite/${token}`)}
              className="bg-surface rounded-xl py-3 items-center"
            >
              <Text className="text-text font-semibold">Log in to join</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logged in — character selection */}
        {user && (
          <>
            <Text className="text-muted text-xs font-bold mb-3">SELECT YOUR CHARACTER</Text>

            {characters.length === 0 ? (
              <View className="bg-surface rounded-xl p-4 mb-4">
                <Text className="text-text text-sm">
                  You don't have any characters yet.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/characters/new/class')}
                  className="mt-3"
                >
                  <Text className="text-primary text-sm">Create a character →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              characters.map((char) => (
                <TouchableOpacity
                  key={char.id}
                  onPress={() => setSelectedCharId(char.id)}
                  className={`rounded-xl p-4 mb-3 border-2 ${selectedCharId === char.id ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
                >
                  <Text className={`font-bold ${selectedCharId === char.id ? 'text-primary' : 'text-text'}`}>
                    {char.name}
                  </Text>
                  <Text className="text-muted text-sm mt-0.5">
                    Level {char.level} {char.class?.name ?? '—'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {user && selectedCharId && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
          <TouchableOpacity
            className={`rounded-xl py-3 items-center ${joining ? 'bg-overlay' : 'bg-primary'}`}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining
              ? <ActivityIndicator color="#cba6f7" />
              : <Text className="text-base font-semibold">
                  {preview.character_approval ? 'Request to join →' : 'Join campaign →'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/invite/\[token\].tsx app/_layout.tsx
git commit -m "feat: public invite preview screen and root layout invite route exemption"
```

---

## Task 9: Campaign Page — DM Out-of-Session View

**Files:**
- Create: `app/(app)/campaigns/[id]/index.tsx`

This is the largest screen. It renders differently based on: (1) DM vs player, (2) active session vs no session. This task covers the DM out-of-session view — party management, invite link, and "Start Session" CTA.

- [ ] **Step 1: Create the campaign page**

```typescript
// app/(app)/campaigns/[id]/index.tsx
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Share, Modal,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { getCampaign, generateInviteToken, updateCampaign } from '@/modules/campaign/campaign.service'
import { approveMember, rejectMember, removeMember } from '@/modules/campaign/member.service'
import { startSession, getSessionHistory } from '@/modules/campaign/session.service'
import { CampaignWithRelations, DBSession, MemberWithDetails } from '@/modules/campaign/campaign.types'

// ── Sub-components ──────────────────────────────────────────────────────────

function PendingMemberCard({
  member, onApprove, onReject,
}: { member: MemberWithDetails; onApprove: () => void; onReject: () => void }) {
  return (
    <View className="bg-yellow/10 border border-yellow/30 rounded-xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-text font-bold">{member.character?.name ?? 'Unknown'}</Text>
          <Text className="text-muted text-xs">
            Level {member.character?.level} {member.character?.class?.name ?? '—'} · {member.user.display_name ?? member.user.username}
          </Text>
        </View>
        <View className="bg-yellow/20 px-2 py-1 rounded-full">
          <Text className="text-yellow text-xs font-medium">Pending</Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={onApprove} className="flex-1 bg-primary rounded-lg py-2 items-center">
          <Text className="text-base font-medium text-sm">Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReject} className="flex-1 bg-overlay rounded-lg py-2 items-center">
          <Text className="text-muted text-sm">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function ActiveMemberCard({
  member, isDM, onRemove,
}: { member: MemberWithDetails; isDM: boolean; onRemove: () => void }) {
  return (
    <View className="bg-surface rounded-xl p-4 mb-3 flex-row justify-between items-center">
      <View>
        <Text className="text-text font-bold">{member.character?.name ?? 'Unknown'}</Text>
        <Text className="text-muted text-xs">
          Level {member.character?.level} {member.character?.class?.name ?? '—'} · {member.user.display_name ?? member.user.username}
        </Text>
      </View>
      {isDM && (
        <TouchableOpacity
          onPress={onRemove}
          className="bg-overlay px-3 py-1 rounded-lg"
        >
          <Text className="text-red text-sm">Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function CampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<CampaignWithRelations | null>(null)
  const [history, setHistory] = useState<DBSession[]>([])
  const [loading, setLoading] = useState(true)
  const [startingSession, setStartingSession] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [generatingToken, setGeneratingToken] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([
        getCampaign(id),
        getSessionHistory(id),
      ])
      setCampaign(c)
      setHistory(h)
      setInviteToken(c.invite_token ?? null)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load campaign')
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading || !campaign) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const isDM = campaign.dm_id === user?.id
  const activeSession = campaign.active_session
  const pendingMembers = campaign.campaign_members.filter((m) => m.status === 'pending')
  const activeMembers  = campaign.campaign_members.filter((m) => m.status === 'active')

  // If a session is active, redirect to session mode (same route, different layout)
  // This is handled inline below via `activeSession` check.

  async function handleGenerateInvite() {
    setGeneratingToken(true)
    try {
      const token = await generateInviteToken(id)
      setInviteToken(token)
    } catch (e) {
      Alert.alert('Error', 'Could not generate invite link.')
    } finally {
      setGeneratingToken(false)
    }
  }

  async function handleShareInvite() {
    if (!inviteToken) return
    await Share.share({ message: `Join my D&D campaign! dndapp://invite/${inviteToken}` })
  }

  async function handleStartSession() {
    setStartingSession(true)
    try {
      const nextNumber = history.length + 1
      await startSession(id, nextNumber)
      load() // re-fetch to get active session
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not start session')
      setStartingSession(false)
    }
  }

  async function handleRemoveMember(member: MemberWithDetails) {
    Alert.alert(
      'Remove player',
      `Remove ${member.user.display_name ?? member.user.username} from the campaign? Their history is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeMember(id, member.user_id)
            load()
          },
        },
      ]
    )
  }

  // ── Session mode (DM in-session view) ─────────────────────────────────────
  if (activeSession) {
    return (
      <DMSessionView
        campaign={campaign}
        session={activeSession}
        activeMembers={activeMembers}
        onEndSession={() => router.push(`/(app)/campaigns/${id}/session-end`)}
        onRefresh={load}
      />
    )
  }

  // ── Management view (DM out-of-session) ────────────────────────────────────
  return (
    <View className="flex-1 bg-base">
      {/* Header */}
      <View className="px-4 pt-12 pb-4">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary">←</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-text flex-1" numberOfLines={1}>
            {campaign.name}
          </Text>
          {isDM && (
            <View className="bg-primary/20 px-2 py-1 rounded-full">
              <Text className="text-primary text-xs font-medium">DM</Text>
            </View>
          )}
        </View>
        {campaign.description ? (
          <Text className="text-muted text-sm ml-7">{campaign.description}</Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Pending approvals (DM only) */}
        {isDM && pendingMembers.length > 0 && (
          <View className="mb-4">
            <Text className="text-muted text-xs font-bold mb-2">PENDING APPROVAL</Text>
            {pendingMembers.map((m) => (
              <PendingMemberCard
                key={m.user_id}
                member={m}
                onApprove={async () => { await approveMember(id, m.user_id); load() }}
                onReject={async () => { await rejectMember(id, m.user_id); load() }}
              />
            ))}
          </View>
        )}

        {/* Party */}
        <Text className="text-muted text-xs font-bold mb-2">
          PARTY ({activeMembers.length}/{campaign.max_players})
        </Text>
        {activeMembers.length === 0 ? (
          <View className="bg-surface rounded-xl p-4 mb-4">
            <Text className="text-muted text-sm">No players yet. Share the invite link to get started.</Text>
          </View>
        ) : (
          activeMembers.map((m) => (
            <ActiveMemberCard
              key={m.user_id}
              member={m}
              isDM={isDM}
              onRemove={() => handleRemoveMember(m)}
            />
          ))
        )}

        {/* Invite link (DM only) */}
        {isDM && (
          <View className="bg-surface rounded-xl p-4 mb-4 mt-2">
            <Text className="text-muted text-xs font-bold mb-3">INVITE LINK</Text>
            {inviteToken ? (
              <>
                <View className="bg-overlay rounded-lg px-3 py-2 mb-3">
                  <Text className="text-text text-sm" numberOfLines={1} selectable>
                    dndapp://invite/{inviteToken}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleShareInvite}
                    className="flex-1 bg-primary rounded-lg py-2 items-center"
                  >
                    <Text className="text-base font-medium text-sm">Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert(
                      'Regenerate link?',
                      'The current link will stop working immediately.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Regenerate', onPress: handleGenerateInvite },
                      ]
                    )}
                    className="bg-overlay rounded-lg px-4 py-2 items-center"
                  >
                    {generatingToken
                      ? <ActivityIndicator color="#6c7086" size="small" />
                      : <Text className="text-muted text-sm">Regenerate</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleGenerateInvite}
                className="bg-primary rounded-lg py-2 items-center"
                disabled={generatingToken}
              >
                {generatingToken
                  ? <ActivityIndicator color="#1e1e2e" size="small" />
                  : <Text className="text-base font-semibold">Generate invite link</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Session history */}
        {history.length > 0 && (
          <View className="mt-2">
            <Text className="text-muted text-xs font-bold mb-2">SESSION HISTORY</Text>
            {history.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => router.push(`/(app)/campaigns/${id}/history/${s.id}`)}
                className="bg-surface rounded-xl p-4 mb-2 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-text font-medium">Session {s.session_number}</Text>
                  <Text className="text-muted text-xs mt-0.5">
                    {new Date(s.started_at ?? s.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text className="text-muted">›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {history.length === 0 && (
          <View className="bg-surface rounded-xl p-4 mt-2">
            <Text className="text-muted text-xs font-bold mb-1">SESSION HISTORY</Text>
            <Text className="text-muted text-sm">No sessions yet. Start your first session below.</Text>
          </View>
        )}
      </ScrollView>

      {/* Start Session CTA (DM only) */}
      {isDM && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
          <TouchableOpacity
            className={`rounded-xl py-3 items-center ${startingSession ? 'bg-overlay' : 'bg-primary'}`}
            onPress={handleStartSession}
            disabled={startingSession}
          >
            {startingSession
              ? <ActivityIndicator color="#cba6f7" />
              : <Text className="text-base font-semibold">▶  Start Session</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create DMSessionView component (in the same file, above the default export)**

```typescript
// Add above the `export default function CampaignScreen()` in the same file

import { useEffect, useRef } from 'react'
import {
  getInitiativeOrder, addInitiativeEntry, removeInitiativeEntry,
  advanceTurn, awardXP, callRest, updateNPCHP,
} from '@/modules/campaign/session.service'
import { DBInitiativeEntry, AddInitiativeEntryInput } from '@/modules/campaign/campaign.types'

function DMSessionView({
  campaign, session, activeMembers, onEndSession, onRefresh,
}: {
  campaign: CampaignWithRelations
  session: DBSession
  activeMembers: MemberWithDetails[]
  onEndSession: () => void
  onRefresh: () => void
}) {
  const [entries, setEntries] = useState<DBInitiativeEntry[]>([])
  const [addingEntry, setAddingEntry] = useState(false)
  const [newEntryName, setNewEntryName] = useState('')
  const [newEntryInit, setNewEntryInit] = useState('')
  const [newEntryHP, setNewEntryHP] = useState('')
  const [addEntryModal, setAddEntryModal] = useState(false)
  const [xpModal, setXpModal] = useState(false)
  const [xpAmount, setXpAmount] = useState('')
  const [xpNote, setXpNote] = useState('')
  const [xpTarget, setXpTarget] = useState<string | 'party'>('party')

  const loadEntries = useCallback(async () => {
    const data = await getInitiativeOrder(session.id)
    setEntries(data)
  }, [session.id])

  useEffect(() => { loadEntries() }, [loadEntries])

  async function handleAddNPC() {
    if (!newEntryName || !newEntryInit) return
    setAddingEntry(true)
    try {
      await addInitiativeEntry(session.id, {
        name: newEntryName,
        initiative: parseInt(newEntryInit, 10),
        is_player_character: false,
        hp_max: newEntryHP ? parseInt(newEntryHP, 10) : undefined,
      }, entries.length)
      setNewEntryName(''); setNewEntryInit(''); setNewEntryHP('')
      setAddEntryModal(false)
      loadEntries()
    } finally {
      setAddingEntry(false)
    }
  }

  async function handleAddPlayer(member: MemberWithDetails) {
    const init = parseInt(await promptInitiative(member.character?.name ?? 'Player'), 10)
    if (isNaN(init)) return
    await addInitiativeEntry(session.id, {
      name: member.character?.name ?? 'Player',
      initiative: init,
      is_player_character: true,
      character_id: member.character?.id,
    }, entries.length)
    loadEntries()
  }

  async function handleAdvanceTurn() {
    const nextId = await advanceTurn(session.id, entries)
    loadEntries()
  }

  async function handleAwardXP() {
    const amount = parseInt(xpAmount, 10)
    if (isNaN(amount) || amount <= 0) return
    await awardXP(session.id, xpTarget === 'party' ? null : xpTarget, amount, xpNote || undefined)
    setXpModal(false); setXpAmount(''); setXpNote('')
  }

  return (
    <View className="flex-1 bg-base">
      {/* Session status bar */}
      <View className="bg-surface px-4 pt-12 pb-3 flex-row justify-between items-center">
        <View>
          <Text className="text-text font-bold">{campaign.name}</Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <View className="w-2 h-2 rounded-full bg-green" />
            <Text className="text-muted text-xs">Session {session.session_number} · Active</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onEndSession} className="bg-red/20 px-3 py-1 rounded-lg">
          <Text className="text-red text-sm font-medium">End Session</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Initiative tracker */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-muted text-xs font-bold">INITIATIVE ORDER</Text>
            <TouchableOpacity onPress={() => setAddEntryModal(true)}>
              <Text className="text-primary text-sm">+ Add</Text>
            </TouchableOpacity>
          </View>

          {entries.length === 0 ? (
            <View className="bg-surface rounded-xl p-4">
              <Text className="text-muted text-sm text-center">No entries yet. Add players and NPCs.</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                onLongPress={() => Alert.alert(
                  entry.name,
                  'Remove from initiative?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => { removeInitiativeEntry(entry.id); loadEntries() } },
                  ]
                )}
                className={`bg-surface rounded-xl p-3 mb-2 flex-row items-center ${entry.is_active_turn ? 'border-2 border-primary' : ''}`}
              >
                <View className="w-10 h-10 rounded-full bg-overlay items-center justify-center mr-3">
                  <Text className="text-text font-bold">{entry.initiative}</Text>
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${entry.is_active_turn ? 'text-primary' : 'text-text'}`}>
                    {entry.name}
                  </Text>
                  {!entry.is_player_character && entry.hp_max != null && (
                    <Text className="text-muted text-xs">
                      HP: {entry.hp_current} / {entry.hp_max}
                    </Text>
                  )}
                </View>
                {entry.is_player_character && (
                  <View className="bg-blue/20 px-2 py-0.5 rounded-full">
                    <Text className="text-blue text-xs">Player</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}

          {entries.length > 0 && (
            <TouchableOpacity
              onPress={handleAdvanceTurn}
              className="bg-primary rounded-xl py-3 items-center mt-2"
            >
              <Text className="text-base font-semibold">Next Turn →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Party overview */}
        <Text className="text-muted text-xs font-bold mb-2">PARTY</Text>
        {activeMembers.map((m) => (
          <View key={m.user_id} className="bg-surface rounded-xl p-4 mb-2">
            <Text className="text-text font-bold">{m.character?.name ?? 'Unknown'}</Text>
            <Text className="text-muted text-xs">
              Level {m.character?.level} {m.character?.class?.name ?? '—'}
            </Text>
          </View>
        ))}

        {/* Session controls */}
        <Text className="text-muted text-xs font-bold mb-2 mt-4">SESSION CONTROLS</Text>
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            onPress={() => Alert.alert('Short Rest', 'Call a short rest for all players?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Call Rest', onPress: () => callRest(session.id, 'short') },
            ])}
            className="flex-1 bg-surface rounded-xl py-3 items-center"
          >
            <Text className="text-text font-medium text-sm">Short Rest</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Long Rest', 'Call a long rest for all players?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Call Rest', onPress: () => callRest(session.id, 'long') },
            ])}
            className="flex-1 bg-surface rounded-xl py-3 items-center"
          >
            <Text className="text-text font-medium text-sm">Long Rest</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => setXpModal(true)}
          className="bg-surface rounded-xl py-3 items-center"
        >
          <Text className="text-text font-medium">Award XP</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add entry modal */}
      <Modal visible={addEntryModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-2xl p-6 pb-10">
            <Text className="text-text font-bold text-lg mb-4">Add to Initiative</Text>
            <Text className="text-muted text-xs font-bold mb-2">PLAYERS</Text>
            {activeMembers.map((m) => (
              <TouchableOpacity
                key={m.user_id}
                onPress={() => { handleAddPlayer(m); setAddEntryModal(false) }}
                className="bg-overlay rounded-xl p-3 mb-2 flex-row justify-between"
              >
                <Text className="text-text">{m.character?.name}</Text>
                <Text className="text-primary">+ Add</Text>
              </TouchableOpacity>
            ))}
            <Text className="text-muted text-xs font-bold mt-4 mb-2">CUSTOM NPC</Text>
            <TextInput value={newEntryName} onChangeText={setNewEntryName}
              placeholder="NPC name" placeholderTextColor="#6c7086"
              className="bg-overlay text-text rounded-xl px-3 py-2 mb-2" />
            <View className="flex-row gap-2 mb-3">
              <TextInput value={newEntryInit} onChangeText={setNewEntryInit}
                placeholder="Initiative" placeholderTextColor="#6c7086" keyboardType="number-pad"
                className="flex-1 bg-overlay text-text rounded-xl px-3 py-2" />
              <TextInput value={newEntryHP} onChangeText={setNewEntryHP}
                placeholder="Max HP (opt)" placeholderTextColor="#6c7086" keyboardType="number-pad"
                className="flex-1 bg-overlay text-text rounded-xl px-3 py-2" />
            </View>
            <TouchableOpacity onPress={handleAddNPC}
              className={`rounded-xl py-3 items-center ${newEntryName && newEntryInit ? 'bg-primary' : 'bg-overlay'}`}
              disabled={!newEntryName || !newEntryInit || addingEntry}>
              <Text className={`font-semibold ${newEntryName && newEntryInit ? 'text-base' : 'text-muted'}`}>
                Add NPC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddEntryModal(false)} className="items-center mt-3">
              <Text className="text-muted">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Award XP modal */}
      <Modal visible={xpModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-2xl p-6 pb-10">
            <Text className="text-text font-bold text-lg mb-4">Award XP</Text>
            <Text className="text-muted text-xs font-bold mb-2">RECIPIENT</Text>
            <TouchableOpacity
              onPress={() => setXpTarget('party')}
              className={`flex-row items-center p-3 rounded-xl mb-2 border ${xpTarget === 'party' ? 'border-primary bg-overlay' : 'border-transparent bg-overlay/50'}`}
            >
              <View className={`w-4 h-4 rounded-full border-2 mr-3 ${xpTarget === 'party' ? 'bg-primary border-primary' : 'border-muted'}`} />
              <Text className="text-text">Whole party</Text>
            </TouchableOpacity>
            {activeMembers.map((m) => (
              <TouchableOpacity
                key={m.user_id}
                onPress={() => setXpTarget(m.character?.id ?? 'party')}
                className={`flex-row items-center p-3 rounded-xl mb-2 border ${xpTarget === m.character?.id ? 'border-primary bg-overlay' : 'border-transparent bg-overlay/50'}`}
              >
                <View className={`w-4 h-4 rounded-full border-2 mr-3 ${xpTarget === m.character?.id ? 'bg-primary border-primary' : 'border-muted'}`} />
                <Text className="text-text">{m.character?.name}</Text>
              </TouchableOpacity>
            ))}
            <TextInput value={xpAmount} onChangeText={setXpAmount}
              placeholder="XP amount" placeholderTextColor="#6c7086" keyboardType="number-pad"
              className="bg-overlay text-text rounded-xl px-3 py-2 mb-2 mt-3" />
            <TextInput value={xpNote} onChangeText={setXpNote}
              placeholder="Note (optional)" placeholderTextColor="#6c7086"
              className="bg-overlay text-text rounded-xl px-3 py-2 mb-4" />
            <TouchableOpacity onPress={handleAwardXP}
              className={`rounded-xl py-3 items-center ${xpAmount ? 'bg-primary' : 'bg-overlay'}`}
              disabled={!xpAmount}>
              <Text className={`font-semibold ${xpAmount ? 'text-base' : 'text-muted'}`}>Award XP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setXpModal(false)} className="items-center mt-3">
              <Text className="text-muted">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// Helper: prompt for initiative value (simple Alert.prompt)
async function promptInitiative(name: string): Promise<string> {
  return new Promise((resolve) => {
    Alert.prompt(`${name}'s initiative`, 'Enter initiative roll:', resolve, 'plain-text', '', 'number-pad')
  })
}
```

Also add the missing imports at the top of the file:
```typescript
import { TextInput } from 'react-native'
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/campaigns/\[id\]/index.tsx
git commit -m "feat: campaign page with DM management view and in-session initiative/XP controls"
```

---

## Task 10: Session End Flow (3-Step)

**Files:**
- Create: `app/(app)/campaigns/[id]/session-end.tsx`

The session end screen is a 3-step modal: (1) Condition review, (2) XP confirmation, (3) Summary + close.

- [ ] **Step 1: Create session-end.tsx**

```typescript
// app/(app)/campaigns/[id]/session-end.tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCampaign } from '@/modules/campaign/campaign.service'
import { getSessionXPAwards, endSession, getActiveSession } from '@/modules/campaign/session.service'
import { updateCharacter } from '@/modules/character/character.service'
import { getLevelFromXP, getXPForNextLevel } from '@/modules/character/character.utils'
import {
  CampaignWithRelations, DBSession, DBSessionXPAward, MemberWithDetails,
} from '@/modules/campaign/campaign.types'

type Step = 'conditions' | 'xp' | 'summary'

export default function SessionEndScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<CampaignWithRelations | null>(null)
  const [session, setSession] = useState<DBSession | null>(null)
  const [xpAwards, setXpAwards] = useState<DBSessionXPAward[]>([])
  const [step, setStep] = useState<Step>('conditions')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Condition decisions: per character, map of condition → 'persist' | 'clear'
  const [conditionDecisions, setConditionDecisions] = useState<
    Record<string, Record<string, 'persist' | 'clear'>>
  >({})

  // XP adjustments (editable per character)
  const [xpEdits, setXpEdits] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      const [c, s] = await Promise.all([
        getCampaign(id),
        getActiveSession(id),
      ])
      setCampaign(c)
      setSession(s)
      if (s) {
        const awards = await getSessionXPAwards(s.id)
        setXpAwards(awards)
        // Init XP per character
        const totals: Record<string, number> = {}
        for (const m of c.campaign_members.filter((m) => m.status === 'active')) {
          const charId = m.character?.id
          if (!charId) continue
          const partyAwards = awards.filter((a) => a.character_id === null)
          const charAwards  = awards.filter((a) => a.character_id === charId)
          totals[charId] = [...partyAwards, ...charAwards].reduce((s, a) => s + a.amount, 0)
        }
        setXpEdits(totals)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading || !campaign || !session) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const activeMembers = campaign.campaign_members.filter((m) => m.status === 'active')

  function toggleCondition(charId: string, condition: string) {
    setConditionDecisions((prev) => {
      const charDecisions = prev[charId] ?? {}
      const current = charDecisions[condition] ?? 'clear'
      return {
        ...prev,
        [charId]: { ...charDecisions, [condition]: current === 'clear' ? 'persist' : 'clear' },
      }
    })
  }

  async function handleFinish() {
    setSaving(true)
    try {
      // 1. Apply condition decisions to character records
      for (const m of activeMembers) {
        const char = m.character
        if (!char) continue
        const decisions = conditionDecisions[char.id] ?? {}
        const persistedConditions = Object.entries(decisions)
          .filter(([, v]) => v === 'persist')
          .map(([c]) => c)
        // Update character conditions to only persisted ones
        await updateCharacter(char.id, { conditions: persistedConditions })
      }

      // 2. Apply XP to character records and write snapshots
      const snapshots = []
      for (const m of activeMembers) {
        const char = m.character
        if (!char) continue
        const xpToAdd = xpEdits[char.id] ?? 0
        const charData = await updateCharacter(char.id, { xp: ((char as any).xp ?? 0) + xpToAdd } as any)
        snapshots.push({
          session_id: session.id,
          character_id: char.id,
          hp_at_end: (charData as any).hp_current ?? 0,
          level_at_end: charData.level,
          xp_awarded: xpToAdd,
          conditions_at_end: (charData as any).conditions ?? [],
        })
      }

      // 3. End session
      await endSession(session.id, snapshots)
      setStep('summary')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not end session')
    } finally {
      setSaving(false)
    }
  }

  // ── Step 1: Condition review ───────────────────────────────────────────────
  if (step === 'conditions') {
    return (
      <View className="flex-1 bg-base">
        <View className="px-4 pt-12 pb-4">
          <Text className="text-muted text-xs font-bold mb-1">STEP 1 OF 3</Text>
          <Text className="text-2xl font-bold text-text">Review Conditions</Text>
          <Text className="text-muted text-sm mt-1">
            Choose which conditions carry over between sessions.
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {activeMembers.map((m) => {
            const conditions = (m.character as any)?.conditions ?? []
            if (conditions.length === 0) return null
            const charId = m.character?.id ?? ''
            return (
              <View key={m.user_id} className="bg-surface rounded-xl p-4 mb-4">
                <Text className="text-text font-bold mb-3">{m.character?.name}</Text>
                {conditions.map((c: string) => {
                  const decision = conditionDecisions[charId]?.[c] ?? 'clear'
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => toggleCondition(charId, c)}
                      className="flex-row items-center justify-between py-2 border-b border-overlay/30"
                    >
                      <Text className="text-text">{c}</Text>
                      <View className={`px-3 py-1 rounded-full ${decision === 'persist' ? 'bg-red/20' : 'bg-overlay'}`}>
                        <Text className={`text-sm ${decision === 'persist' ? 'text-red' : 'text-muted'}`}>
                          {decision === 'persist' ? 'Persist' : 'Clear'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
          })}
          {activeMembers.every((m) => ((m.character as any)?.conditions ?? []).length === 0) && (
            <View className="bg-surface rounded-xl p-6 items-center">
              <Text className="text-muted text-sm">No active conditions across the party.</Text>
            </View>
          )}
        </ScrollView>
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
          <TouchableOpacity onPress={() => setStep('xp')} className="bg-primary rounded-xl py-3 items-center">
            <Text className="text-base font-semibold">Next: XP Confirmation →</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Step 2: XP confirmation ───────────────────────────────────────────────
  if (step === 'xp') {
    return (
      <View className="flex-1 bg-base">
        <View className="px-4 pt-12 pb-4">
          <Text className="text-muted text-xs font-bold mb-1">STEP 2 OF 3</Text>
          <Text className="text-2xl font-bold text-text">Confirm XP</Text>
          <Text className="text-muted text-sm mt-1">Adjust XP before it's applied to characters.</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* XP award breakdown */}
          {xpAwards.length > 0 && (
            <View className="bg-surface rounded-xl p-4 mb-4">
              <Text className="text-muted text-xs font-bold mb-3">AWARDED DURING SESSION</Text>
              {xpAwards.map((a) => {
                const recipient = a.character_id
                  ? activeMembers.find((m) => m.character?.id === a.character_id)?.character?.name ?? 'Unknown'
                  : 'Party'
                return (
                  <View key={a.id} className="flex-row justify-between py-1.5 border-b border-overlay/30">
                    <Text className="text-text text-sm">{recipient}</Text>
                    <Text className="text-text text-sm">+{a.amount} XP{a.note ? ` · ${a.note}` : ''}</Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* Per-character totals (editable) */}
          <Text className="text-muted text-xs font-bold mb-2">TOTAL PER CHARACTER</Text>
          {activeMembers.map((m) => {
            const charId = m.character?.id ?? ''
            const total = xpEdits[charId] ?? 0
            return (
              <View key={m.user_id} className="bg-surface rounded-xl p-4 mb-3 flex-row justify-between items-center">
                <View>
                  <Text className="text-text font-bold">{m.character?.name}</Text>
                  <Text className="text-muted text-xs">Level {m.character?.level}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => setXpEdits((p) => ({ ...p, [charId]: Math.max(0, total - 50) }))}
                    className="w-8 h-8 bg-overlay rounded-full items-center justify-center"
                  >
                    <Text className="text-text font-bold">−</Text>
                  </TouchableOpacity>
                  <Text className="text-primary font-bold w-20 text-center">+{total} XP</Text>
                  <TouchableOpacity
                    onPress={() => setXpEdits((p) => ({ ...p, [charId]: total + 50 }))}
                    className="w-8 h-8 bg-overlay rounded-full items-center justify-center"
                  >
                    <Text className="text-text font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </ScrollView>
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay flex-row gap-3">
          <TouchableOpacity onPress={() => setStep('conditions')} className="bg-overlay rounded-xl py-3 px-6 items-center">
            <Text className="text-muted font-medium">← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFinish}
            disabled={saving}
            className={`flex-1 rounded-xl py-3 items-center ${saving ? 'bg-overlay' : 'bg-primary'}`}
          >
            {saving
              ? <ActivityIndicator color="#cba6f7" />
              : <Text className="text-base font-semibold">Confirm & End Session →</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Step 3: Summary ───────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4">
        <Text className="text-muted text-xs font-bold mb-1">STEP 3 OF 3</Text>
        <Text className="text-2xl font-bold text-text">Session Complete</Text>
        <Text className="text-muted text-sm mt-1">Session {session.session_number} has ended.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {activeMembers.map((m) => {
          const charId = m.character?.id ?? ''
          const xp = xpEdits[charId] ?? 0
          return (
            <View key={m.user_id} className="bg-surface rounded-xl p-4 mb-3">
              <Text className="text-text font-bold">{m.character?.name}</Text>
              <Text className="text-muted text-xs mt-0.5">Level {m.character?.level}</Text>
              <Text className="text-primary text-sm mt-1">+{xp} XP awarded</Text>
            </View>
          )
        })}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          onPress={() => router.replace(`/(app)/campaigns/${id}`)}
          className="bg-primary rounded-xl py-3 items-center"
        >
          <Text className="text-base font-semibold">Close Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/campaigns/\[id\]/session-end.tsx
git commit -m "feat: 3-step session end flow (condition review, XP confirmation, summary)"
```

---

## Task 11: Session History Detail Screen

**Files:**
- Create: `app/(app)/campaigns/[id]/history/[sessionId].tsx`

- [ ] **Step 1: Create the history detail screen**

```typescript
// app/(app)/campaigns/[id]/history/[sessionId].tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getSessionDetail } from '@/modules/campaign/session.service'
import { SessionDetail } from '@/modules/campaign/campaign.types'

export default function SessionHistoryScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessionDetail(sessionId)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading || !detail) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const duration = detail.ended_at && detail.started_at
    ? Math.round((new Date(detail.ended_at).getTime() - new Date(detail.started_at).getTime()) / 60000)
    : null

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-bold text-text">Session {detail.session_number}</Text>
          <Text className="text-muted text-sm">
            {new Date(detail.started_at ?? detail.created_at).toLocaleDateString()}
            {duration != null ? ` · ${duration} min` : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Party snapshot */}
        {detail.session_snapshots.length > 0 && (
          <View className="mb-4">
            <Text className="text-muted text-xs font-bold mb-2">PARTY AT SESSION END</Text>
            {detail.session_snapshots.map((snap) => (
              <View key={snap.character_id} className="bg-surface rounded-xl p-4 mb-2">
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-text font-bold">
                      {snap.character?.name ?? 'Unknown'}
                    </Text>
                    <Text className="text-muted text-xs">
                      Level {snap.level_at_end} {snap.character?.class?.name ?? '—'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-text text-sm">HP: {snap.hp_at_end}</Text>
                    <Text className="text-primary text-sm">+{snap.xp_awarded} XP</Text>
                  </View>
                </View>
                {snap.conditions_at_end.length > 0 && (
                  <Text className="text-red text-xs mt-2">
                    Conditions: {snap.conditions_at_end.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* XP awards during session */}
        {detail.session_xp_awards.length > 0 && (
          <View className="mb-4">
            <Text className="text-muted text-xs font-bold mb-2">XP AWARDED</Text>
            <View className="bg-surface rounded-xl p-4">
              {detail.session_xp_awards.map((a) => (
                <View key={a.id} className="flex-row justify-between py-1.5 border-b border-overlay/30">
                  <Text className="text-text text-sm">{a.note ?? 'Award'}</Text>
                  <Text className="text-primary text-sm">+{a.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Shared notes */}
        {detail.shared_notes && (
          <View>
            <Text className="text-muted text-xs font-bold mb-2">SHARED NOTES</Text>
            <View className="bg-surface rounded-xl p-4">
              <Text className="text-text text-sm">{detail.shared_notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/campaigns/\[id\]/history/\[sessionId\].tsx
git commit -m "feat: session history detail screen with party snapshot and XP summary"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Campaign creation (name, description, character_approval, hp_visibility toggles)
- ✅ Invite link generation/regeneration (invalidates old link automatically)
- ✅ Campaign preview screen (public, callable by anon via RPC) — shows name, DM, party size, description
- ✅ New users → signup with returnTo → land back on invite screen
- ✅ Character selection on join (player picks character before accepting)
- ✅ Character approval flow (pending members shown at top, DM approves/rejects)
- ✅ Party management (view all active members, DM can remove with confirmation)
- ✅ Initiative tracker (add players + NPCs, advance turn, remove entries)
- ✅ NPC optional HP tracking (hp_max field on initiative entry)
- ✅ XP awards (in-session, per character or whole party, with note)
- ✅ Session end flow (3 steps: condition review → XP confirmation → summary)
- ✅ Condition review: DM toggles persist/clear per condition per character
- ✅ XP confirmation: adjustable per character before applying
- ✅ Session history: list + detail with party snapshot, XP, shared notes
- ✅ Max 6 players enforced in DB (max_players column, validated in join UI)
- ✅ Soft player removal (status = 'removed', history preserved)
- ✅ Campaign page transforms into session mode (same route, DMSessionView component)
- ✅ Short/Long rest: DM calls, sets rest_pending on session (player prompt in Session Console plan)

**Deferred to Session Console plan:**
- Supabase Realtime subscriptions (live HP, conditions, initiative updates for players)
- Player HP controls in-session
- Death save tracker + DM revival
- Ally healing
- Item gifting
- Player disconnection handling + reconnect
- Player rest confirmation prompt + Hit Dice spending UI
- Character sheet Campaign tab populated with live party/initiative data
