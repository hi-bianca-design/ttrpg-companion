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
