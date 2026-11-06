-- Encounters: a GM's prepared fights, GM only (RLS), never in the realtime publication.
-- An encounter holds three story beats; its enemies mirror the enemy fields of combat_entries
-- (a later RPC copies them into a combat). Players never see any of it.

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  story_before text check (story_before is null or char_length(story_before) <= 1000),
  story_why text check (story_why is null or char_length(story_why) <= 1000),
  story_after text check (story_after is null or char_length(story_after) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lets encounter_enemies prove its campaign_id matches its encounter's
  constraint encounters_id_campaign_unique unique (id, campaign_id)
);
create index encounters_campaign_id_idx on public.encounters (campaign_id);

create trigger encounters_set_updated_at
  before update on public.encounters
  for each row execute function public.set_updated_at();

create table public.encounter_enemies (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null,
  campaign_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  count int not null default 1 check (count between 1 and 20),
  max_hp int not null check (max_hp >= 1),
  defense_label text check (defense_label is null or char_length(defense_label) between 1 and 12),
  ac int check (ac is null or ac between 0 and 40),
  attacks jsonb not null default '[]'::jsonb,
  xp int check (xp is null or xp >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  hidden boolean not null default false,
  position int not null default 0,
  constraint encounter_enemies_attacks_shape check (jsonb_typeof(attacks) = 'array' and jsonb_array_length(attacks) <= 6),
  constraint encounter_enemies_encounter_fk foreign key (encounter_id, campaign_id)
    references public.encounters (id, campaign_id) on delete cascade
);
create index encounter_enemies_encounter_id_idx on public.encounter_enemies (encounter_id);
create index encounter_enemies_campaign_id_idx on public.encounter_enemies (campaign_id);

alter table public.encounters enable row level security;
alter table public.encounter_enemies enable row level security;

create policy encounters_select on public.encounters
  for select to authenticated using (public.is_campaign_gm(campaign_id));
create policy encounters_insert on public.encounters
  for insert to authenticated with check (public.is_campaign_gm(campaign_id));
create policy encounters_update on public.encounters
  for update to authenticated using (public.is_campaign_gm(campaign_id)) with check (public.is_campaign_gm(campaign_id));
create policy encounters_delete on public.encounters
  for delete to authenticated using (public.is_campaign_gm(campaign_id));

create policy encounter_enemies_select on public.encounter_enemies
  for select to authenticated using (public.is_campaign_gm(campaign_id));
create policy encounter_enemies_insert on public.encounter_enemies
  for insert to authenticated with check (public.is_campaign_gm(campaign_id));
create policy encounter_enemies_update on public.encounter_enemies
  for update to authenticated using (public.is_campaign_gm(campaign_id)) with check (public.is_campaign_gm(campaign_id));
create policy encounter_enemies_delete on public.encounter_enemies
  for delete to authenticated using (public.is_campaign_gm(campaign_id));
