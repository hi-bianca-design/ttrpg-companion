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

-- True when the caller owns the character, or shares a campaign it is in (GM or member).
-- security definer to avoid characters <-> campaign_members policy recursion.
create or replace function public.can_view_character(p_character_id uuid)
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
  ) or exists (
    select 1 from public.campaign_members m
    where m.character_id = p_character_id and public.is_campaign_member(m.campaign_id)
  );
end;
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

revoke execute on function public.can_view_character(uuid) from public, anon;
revoke execute on function public.owns_character(uuid) from public, anon;
grant execute on function public.can_view_character(uuid) to authenticated, service_role;
grant execute on function public.owns_character(uuid) to authenticated, service_role;

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

-- content: official, own, or campaign-scoped to a campaign I'm in.
create policy content_select on public.content
  for select to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or (campaign_id is not null and public.is_campaign_member(campaign_id))
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
  using (owner_id = (select auth.uid()) or public.can_view_character(id));
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

-- character_picks / character_items follow their character.
create policy character_picks_select on public.character_picks
  for select to authenticated using (public.can_view_character(character_id));
create policy character_picks_insert on public.character_picks
  for insert to authenticated with check (public.owns_character(character_id));
create policy character_picks_update on public.character_picks
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));
create policy character_picks_delete on public.character_picks
  for delete to authenticated using (public.owns_character(character_id));

create policy character_items_select on public.character_items
  for select to authenticated using (public.can_view_character(character_id));
create policy character_items_insert on public.character_items
  for insert to authenticated with check (public.owns_character(character_id));
create policy character_items_update on public.character_items
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));
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
