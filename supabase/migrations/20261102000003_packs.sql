-- Packs: sellable bundles of official content (and later themes and art).
--   packs               the catalog; clients read published rows only
--   pack_entitlements   who owns what; written only by the service role (webhook / dev script)
--   content.pack_id     official content that belongs to a pack is readable only with an
--                       active entitlement. Content already on a sheet the caller owns stays
--                       readable after a lapse, but nothing new can be added (can_reference_content).

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null check (length(name) > 0),
  description text,
  kind text not null check (kind in ('content', 'theme', 'art')),
  system_id text references public.game_systems (id) on delete restrict,
  artist_credit text,
  cover_url text,
  store_product_id text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pack_entitlements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_id uuid not null references public.packs (id) on delete restrict,
  source text not null check (source in ('purchase', 'subscription', 'grant')),
  expires_at timestamptz,
  granted_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

create index pack_entitlements_pack_id_idx on public.pack_entitlements (pack_id);

-- Only official content can belong to a pack.
alter table public.content
  add column pack_id uuid references public.packs (id) on delete restrict,
  add constraint content_pack_is_official check (pack_id is null or owner_id is null);

create index content_pack_id_idx on public.content (pack_id) where pack_id is not null;

alter table public.packs enable row level security;
alter table public.pack_entitlements enable row level security;

-- True when the caller has an active entitlement for the pack.
create or replace function public.owns_pack(p_pack_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pack_entitlements e
     where e.pack_id = p_pack_id
       and e.user_id = auth.uid()
       and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Content on the picks/items of characters the caller owns, so a lapsed entitlement never
-- strips a sheet. Mirrors campaign_sheet_content_ids for the caller's own characters.
create or replace function public.own_sheet_content_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.content_id from public.character_picks p
   where p.character_id in (select ch.id from public.characters ch where ch.owner_id = auth.uid())
  union
  select i.content_id from public.character_items i
   where i.character_id in (select ch.id from public.characters ch where ch.owner_id = auth.uid());
$$;

-- True when this exact content is already on this character's picks or items. Lets an update that
-- leaves content_id unchanged pass the update policies after a lapse (equip, quantity, notes),
-- while repointing a row at other pack content still has to pass can_reference_content.
create or replace function public.has_sheet_content(p_character_id uuid, p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.character_picks p
     where p.character_id = p_character_id and p.content_id = p_content_id
  ) or exists (
    select 1 from public.character_items i
     where i.character_id = p_character_id and i.content_id = p_content_id
  );
$$;

-- Adds the pack rule to the official branch: official rows that belong to a pack need an
-- entitlement. Everything else about "may put this on a sheet" is unchanged.
create or replace function public.can_reference_content(p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.content c
     where c.id = p_content_id
       and (
         (c.owner_id is null and (c.pack_id is null or public.owns_pack(c.pack_id)))
         or c.owner_id = auth.uid()
         or (c.campaign_id is not null and public.is_campaign_member(c.campaign_id))
       )
  );
$$;

revoke execute on function public.owns_pack(uuid) from public, anon;
revoke execute on function public.has_sheet_content(uuid, uuid) from public, anon;
revoke execute on function public.own_sheet_content_ids() from public, anon;
grant execute on function public.owns_pack(uuid) to authenticated, service_role;
grant execute on function public.has_sheet_content(uuid, uuid) to authenticated, service_role;
grant execute on function public.own_sheet_content_ids() to authenticated, service_role;

drop policy content_select on public.content;
create policy content_select on public.content
  for select to authenticated
  using (
    (owner_id is null and (pack_id is null or public.owns_pack(pack_id)))
    or owner_id = (select auth.uid())
    or (campaign_id is not null and public.is_campaign_member(campaign_id))
    or id in (select public.campaign_sheet_content_ids())
    or id in (select public.own_sheet_content_ids())
  );

-- Read-only for clients: no insert/update/delete policies, so only the service role writes.
create policy packs_select on public.packs
  for select to authenticated using (published);
create policy pack_entitlements_select on public.pack_entitlements
  for select to authenticated using (user_id = (select auth.uid()));

-- Updates may keep content already on the sheet even if its pack has lapsed (otherwise a lapse
-- would block equipping, quantity and notes edits). Inserts are unchanged: new content still has
-- to pass can_reference_content.
drop policy character_picks_update on public.character_picks;
create policy character_picks_update on public.character_picks
  for update to authenticated
  using (public.owns_character(character_id))
  with check (
    public.owns_character(character_id)
    and (public.can_reference_content(content_id) or public.has_sheet_content(character_id, content_id))
  );

drop policy character_items_update on public.character_items;
create policy character_items_update on public.character_items
  for update to authenticated
  using (public.owns_character(character_id))
  with check (
    public.owns_character(character_id)
    and (public.can_reference_content(content_id) or public.has_sheet_content(character_id, content_id))
  );
