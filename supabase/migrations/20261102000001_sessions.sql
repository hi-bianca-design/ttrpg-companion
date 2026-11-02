-- sessions: one row per play session of a campaign. Readable by active members only; all
-- writes go through the session RPCs (next migration), so no insert/update/delete policies.

-- True when the caller is the campaign's GM or has an *active* membership row. Unlike
-- is_campaign_member(), invited-but-not-accepted users do not count.
create or replace function public.is_active_campaign_member(p_campaign_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id and c.gm_id = auth.uid()
  ) or exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign_id and m.user_id = auth.uid() and m.status = 'active'
  );
end;
$$;

revoke execute on function public.is_active_campaign_member(uuid) from public, anon;
grant execute on function public.is_active_campaign_member(uuid) to authenticated, service_role;

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  in_combat boolean not null default false,
  combat_started_by uuid references public.profiles (id) on delete set null,
  current_turn_user_id uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_combat_requires_active check (in_combat = false or status = 'active'),
  constraint sessions_turn_requires_combat check (current_turn_user_id is null or in_combat),
  constraint sessions_ended_at_matches_status check ((status = 'ended') = (ended_at is not null))
);

create unique index sessions_one_active_per_campaign
  on public.sessions (campaign_id) where status = 'active';
create index sessions_campaign_id_idx on public.sessions (campaign_id);
create index sessions_opened_by_idx on public.sessions (opened_by);
create index sessions_combat_started_by_idx on public.sessions (combat_started_by);
create index sessions_current_turn_user_id_idx on public.sessions (current_turn_user_id);

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

alter table public.sessions enable row level security;

create policy sessions_select on public.sessions
  for select to authenticated
  using (public.is_active_campaign_member(campaign_id));

-- Members whose membership ends (row deleted, character detached, no longer active) lose
-- any turn they hold, so a banner can't outlive the player's place in the campaign.
create or replace function public.sessions_clear_turn_on_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     or new.character_id is null
     or new.status <> 'active' then
    update public.sessions
       set current_turn_user_id = null
     where campaign_id = old.campaign_id and current_turn_user_id = old.user_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.sessions_clear_turn_on_leave() from public, anon, authenticated;

create trigger campaign_members_clear_turn
  after update or delete on public.campaign_members
  for each row execute function public.sessions_clear_turn_on_leave();

alter publication supabase_realtime add table public.sessions;
