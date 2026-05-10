-- campaign_items: items created by a DM, scoped to their campaign
create table public.campaign_items (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid references public.campaigns on delete cascade not null,
  created_by       uuid references public.users on delete restrict not null,
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
  constraint exactly_one_item_source check (
    (equipment_id      is not null)::int +
    (magic_item_id     is not null)::int +
    (campaign_item_id  is not null)::int +
    (custom_content_id is not null)::int = 1
  )
);

-- Pre-flight guard: ensure no rows violate the XOR constraint before migrating.
do $$
begin
  if exists (
    select 1 from public.character_equipment
    where
      -- both null: violates "at least one" side of XOR
      (equipment_id is null and custom_content_id is null)
      -- both non-null: violates "at most one" side of XOR
      or (equipment_id is not null and custom_content_id is not null)
  ) then
    raise exception 'character_equipment has rows that violate the XOR constraint; clean up before migrating';
  end if;
end $$;

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
create index on public.character_inventory (character_id);
create index on public.character_inventory (equipment_id)      where equipment_id      is not null;
create index on public.character_inventory (magic_item_id)     where magic_item_id     is not null;
create index on public.character_inventory (campaign_item_id)  where campaign_item_id  is not null;
create index on public.character_inventory (custom_content_id) where custom_content_id is not null;
