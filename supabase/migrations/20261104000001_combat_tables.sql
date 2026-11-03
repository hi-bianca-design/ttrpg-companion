-- Combat (battle order with enemies). Three tables with a server-enforced privacy split:
--   combats        members read   one row per fight; holds no enemy data
--   combat_entries GM reads only  the truth: party rows and enemy rows (hp, ac, notes, hidden)
--   combat_order   members read   the projection a player may see; a hidden enemy has no row
-- All writes go through security-definer RPCs, so there are no insert/update/delete policies.
-- Only `combats` is published to Realtime, and clients use it as a refetch signal, never as data.

create table public.combats (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  status text not null default 'rolling' check (status in ('rolling', 'active', 'ended')),
  round int not null default 1 check (round >= 1),
  -- Projection of the current entry: set only when its holder is a player or a visible enemy.
  turn_entry_id uuid,
  -- True only when the current entry is a hidden enemy (players see a generic "GM's turn").
  gm_turn boolean not null default false,
  rev int not null default 0,
  started_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combats_turn_xor_gm_turn check (not (turn_entry_id is not null and gm_turn))
);

create unique index combats_one_live_per_session on public.combats (session_id) where status <> 'ended';
create index combats_session_id_idx on public.combats (session_id);
create index combats_campaign_id_idx on public.combats (campaign_id);
create index combats_started_by_idx on public.combats (started_by);

create trigger combats_set_updated_at
  before update on public.combats
  for each row execute function public.set_updated_at();

create table public.combat_entries (
  id uuid primary key default gen_random_uuid(),
  combat_id uuid not null references public.combats (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('player', 'enemy')),
  user_id uuid references public.profiles (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  name text,
  max_hp int,
  hp int,
  temp_hp int not null default 0,
  ac int,
  notes text,
  hidden boolean not null default false,
  group_id uuid,
  initiative int,
  position int not null,
  is_current boolean not null default false,
  last_batch uuid,
  prev_hp int,
  prev_temp int,
  constraint combat_entries_player_shape check (
    kind <> 'player' or (
      user_id is not null and character_id is not null
      and name is null and max_hp is null and hp is null and ac is null and notes is null
    )
  ),
  constraint combat_entries_enemy_shape check (
    kind <> 'enemy' or (
      user_id is null and character_id is null
      and name is not null and char_length(btrim(name)) between 1 and 60
      and max_hp is not null and max_hp >= 1
      and hp is not null and hp between 0 and max_hp
      and temp_hp >= 0
      and (ac is null or ac between 0 and 40)
      and (notes is null or char_length(notes) <= 500)
    )
  )
);

alter table public.combat_entries
  add constraint combat_entries_position_unique unique (combat_id, position) deferrable initially deferred;
create unique index combat_entries_one_current on public.combat_entries (combat_id) where is_current;
create unique index combat_entries_one_character on public.combat_entries (combat_id, character_id) where kind = 'player';
create index combat_entries_campaign_id_idx on public.combat_entries (campaign_id);
create index combat_entries_user_id_idx on public.combat_entries (user_id);
create index combat_entries_character_id_idx on public.combat_entries (character_id);

create table public.combat_order (
  id uuid primary key,
  combat_id uuid not null references public.combats (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('player', 'enemy')),
  user_id uuid references public.profiles (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  name text,
  initiative int,
  position int not null
);

alter table public.combat_order
  add constraint combat_order_position_unique unique (combat_id, position) deferrable initially deferred;
create index combat_order_campaign_id_idx on public.combat_order (campaign_id);
create index combat_order_user_id_idx on public.combat_order (user_id);
create index combat_order_character_id_idx on public.combat_order (character_id);

alter table public.combats enable row level security;
alter table public.combat_entries enable row level security;
alter table public.combat_order enable row level security;

create policy combats_select on public.combats
  for select to authenticated
  using (public.is_active_campaign_member(campaign_id));

create policy combat_order_select on public.combat_order
  for select to authenticated
  using (public.is_active_campaign_member(campaign_id));

create policy combat_entries_select on public.combat_entries
  for select to authenticated
  using (public.is_campaign_gm(campaign_id));

-- Internal: the caller's view of a live combat, locked for update. Order of checks:
-- authenticated -> combat exists and is not ended -> caller is an active campaign member.
-- Granted to authenticated on purpose (see lock_active_session): it re-checks auth itself.
create or replace function public.lock_combat(p_combat_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_c from public.combats where id = p_combat_id for update;
  if not found or v_c.status = 'ended' then
    raise exception 'no_active_combat' using errcode = 'P0001';
  end if;

  if not public.is_active_campaign_member(v_c.campaign_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  return v_c;
end;
$$;

revoke execute on function public.lock_combat(uuid) from public, anon;
grant execute on function public.lock_combat(uuid) to authenticated, service_role;

-- Realtime: the combat row only, as a signal. combat_entries and combat_order never go here.
alter publication supabase_realtime add table public.combats;
