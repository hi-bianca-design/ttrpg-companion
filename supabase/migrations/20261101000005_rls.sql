-- Row level security (spec §5.4). Policies wrap auth.uid() in a scalar subquery so it is
-- evaluated once per statement rather than per row.

alter table public.profiles enable row level security;
alter table public.game_systems enable row level security;
alter table public.content enable row level security;
alter table public.characters enable row level security;
alter table public.character_picks enable row level security;
alter table public.character_items enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;

-- Characters the caller sees through campaigns (not their own): characters on an active
-- membership row of a campaign where the caller is GM or an *active* member. Invited
-- users see nobody's characters until they accept.
-- security definer to avoid characters <-> campaign_members policy recursion.
create or replace function public.campaign_visible_character_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.character_id
    from public.campaign_members m
   where m.status = 'active'
     and m.character_id is not null
     and m.campaign_id in (
       select c.id from public.campaigns c where c.gm_id = auth.uid()
       union
       select me.campaign_id from public.campaign_members me
        where me.user_id = auth.uid() and me.status = 'active'
     );
$$;

-- True when the caller owns the character or sees it through a campaign.
create or replace function public.can_view_character(p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.characters ch
     where ch.id = p_character_id and ch.owner_id = auth.uid()
  ) or p_character_id in (select public.campaign_visible_character_ids());
$$;

-- Content referenced by the picks/items of characters the caller sees through a campaign,
-- so a GM or fellow member can resolve another player's homebrew on that player's sheet
-- (and nothing else of theirs).
create or replace function public.campaign_sheet_content_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.content_id from public.character_picks p
   where p.character_id in (select public.campaign_visible_character_ids())
  union
  select i.content_id from public.character_items i
   where i.character_id in (select public.campaign_visible_character_ids());
$$;

-- True when the caller may put this content on a sheet: official, their own homebrew, or
-- campaign-scoped content of a campaign they are GM or a member of. Deliberately excludes
-- the sheet-derived visibility in content_select, so a pick/item can't be used to read
-- someone else's private homebrew (FK checks alone bypass RLS).
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
         c.owner_id is null
         or c.owner_id = auth.uid()
         or (c.campaign_id is not null and public.is_campaign_member(c.campaign_id))
       )
  );
$$;

-- True when the caller owns the character.
create or replace function public.owns_character(p_character_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.characters ch
    where ch.id = p_character_id and ch.owner_id = auth.uid()
  );
end;
$$;

revoke execute on function public.campaign_visible_character_ids() from public, anon;
revoke execute on function public.can_view_character(uuid) from public, anon;
revoke execute on function public.campaign_sheet_content_ids() from public, anon;
revoke execute on function public.owns_character(uuid) from public, anon;
revoke execute on function public.can_reference_content(uuid) from public, anon;
grant execute on function public.campaign_visible_character_ids() to authenticated, service_role;
grant execute on function public.can_view_character(uuid) to authenticated, service_role;
grant execute on function public.campaign_sheet_content_ids() to authenticated, service_role;
grant execute on function public.owns_character(uuid) to authenticated, service_role;
grant execute on function public.can_reference_content(uuid) to authenticated, service_role;

-- profiles: any signed-in user can read (usernames show in campaigns); edit only your own.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- game_systems: public read (licence/attribution); writes via service role only.
create policy game_systems_select on public.game_systems
  for select to anon, authenticated using (true);

-- content: official, own, campaign-scoped to a campaign I'm in, or on the sheet of a
-- character I see through a campaign.
create policy content_select on public.content
  for select to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or (campaign_id is not null and public.is_campaign_member(campaign_id))
    or id in (select public.campaign_sheet_content_ids())
  );
-- Writes: my own homebrew, or campaign items in campaigns where I'm GM.
create policy content_insert on public.content
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (campaign_id is null or public.is_campaign_gm(campaign_id))
  );
create policy content_update on public.content
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    and (campaign_id is null or public.is_campaign_gm(campaign_id))
  )
  with check (
    owner_id = (select auth.uid())
    and (campaign_id is null or public.is_campaign_gm(campaign_id))
  );
create policy content_delete on public.content
  for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and (campaign_id is null or public.is_campaign_gm(campaign_id))
  );

-- characters: full access for the owner; read for GM / members of a campaign it is in.
create policy characters_select on public.characters
  for select to authenticated
  using (owner_id = (select auth.uid()) or id in (select public.campaign_visible_character_ids()));
create policy characters_insert on public.characters
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy characters_update on public.characters
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy characters_delete on public.characters
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- character_picks / character_items follow their character; writes may only reference
-- content the owner can read directly (can_reference_content).
create policy character_picks_select on public.character_picks
  for select to authenticated using (public.can_view_character(character_id));
create policy character_picks_insert on public.character_picks
  for insert to authenticated
  with check (public.owns_character(character_id) and public.can_reference_content(content_id));
create policy character_picks_update on public.character_picks
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id) and public.can_reference_content(content_id));
create policy character_picks_delete on public.character_picks
  for delete to authenticated using (public.owns_character(character_id));

create policy character_items_select on public.character_items
  for select to authenticated using (public.can_view_character(character_id));
create policy character_items_insert on public.character_items
  for insert to authenticated
  with check (public.owns_character(character_id) and public.can_reference_content(content_id));
create policy character_items_update on public.character_items
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id) and public.can_reference_content(content_id));
create policy character_items_delete on public.character_items
  for delete to authenticated using (public.owns_character(character_id));

-- campaigns: read for members; write for the GM.
create policy campaigns_select on public.campaigns
  for select to authenticated
  using (gm_id = (select auth.uid()) or public.is_campaign_member(id));
create policy campaigns_insert on public.campaigns
  for insert to authenticated
  with check (gm_id = (select auth.uid()));
create policy campaigns_update on public.campaigns
  for update to authenticated
  using (gm_id = (select auth.uid()))
  with check (gm_id = (select auth.uid()));
create policy campaigns_delete on public.campaigns
  for delete to authenticated
  using (gm_id = (select auth.uid()));

-- campaign_members: read for members; write for the GM; a player may update or leave
-- their own row (role/user/campaign changes are blocked by campaign_members_guard).
create policy campaign_members_select on public.campaign_members
  for select to authenticated
  using (public.is_campaign_member(campaign_id));
create policy campaign_members_insert on public.campaign_members
  for insert to authenticated
  with check (public.is_campaign_gm(campaign_id));
create policy campaign_members_update on public.campaign_members
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_campaign_gm(campaign_id))
  with check (user_id = (select auth.uid()) or public.is_campaign_gm(campaign_id));
create policy campaign_members_delete on public.campaign_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_campaign_gm(campaign_id));
