-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.characters enable row level security;
alter table public.character_spells enable row level security;
alter table public.character_equipment enable row level security;
alter table public.user_content enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_characters enable row level security;

-- SRD tables are read-only for all authenticated users
alter table public.classes enable row level security;
alter table public.subclasses enable row level security;
alter table public.species enable row level security;
alter table public.backgrounds enable row level security;
alter table public.feats enable row level security;
alter table public.spells enable row level security;
alter table public.equipment enable row level security;

create policy "SRD classes readable by all" on public.classes for select using (auth.role() = 'authenticated');
create policy "SRD subclasses readable by all" on public.subclasses for select using (auth.role() = 'authenticated');
create policy "SRD species readable by all" on public.species for select using (auth.role() = 'authenticated');
create policy "SRD backgrounds readable by all" on public.backgrounds for select using (auth.role() = 'authenticated');
create policy "SRD feats readable by all" on public.feats for select using (auth.role() = 'authenticated');
create policy "SRD spells readable by all" on public.spells for select using (auth.role() = 'authenticated');
create policy "SRD equipment readable by all" on public.equipment for select using (auth.role() = 'authenticated');

-- Users can read/write their own profile
create policy "Users manage own profile" on public.users
  using (auth.uid() = id) with check (auth.uid() = id);

-- Characters: owner can CRUD; DMs of campaigns containing this character can read
create policy "Users manage own characters" on public.characters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "DMs can read campaign characters" on public.characters
  for select using (
    exists (
      select 1 from public.campaign_members cm
      join public.campaigns c on c.id = cm.campaign_id
      where cm.character_id = characters.id
        and c.dm_id = auth.uid()
    )
  );

-- Character spells/equipment: follow character ownership
create policy "Users manage own character spells" on public.character_spells
  for all using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

create policy "Users manage own character equipment" on public.character_equipment
  for all using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

-- User content: owner only
create policy "Users manage own content" on public.user_content
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Campaigns: DM can CRUD; members can read
create policy "DMs manage own campaigns" on public.campaigns
  for all using (auth.uid() = dm_id) with check (auth.uid() = dm_id);

create policy "Members can read campaigns" on public.campaigns
  for select using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaigns.id and user_id = auth.uid()
    )
  );

-- Campaign members: DM manages; members read own row
create policy "DMs manage campaign members" on public.campaign_members
  for all using (
    exists (select 1 from public.campaigns where id = campaign_id and dm_id = auth.uid())
  );

create policy "Members read own membership" on public.campaign_members
  for select using (auth.uid() = user_id);

-- Sessions: DM can CRUD; members can read
create policy "DMs manage sessions" on public.sessions
  for all using (
    exists (select 1 from public.campaigns where id = campaign_id and dm_id = auth.uid())
  );

create policy "Members can read sessions" on public.sessions
  for select using (
    exists (
      select 1 from public.campaign_members cm
      join public.campaigns c on c.id = cm.campaign_id
      where c.id = sessions.campaign_id and cm.user_id = auth.uid()
    )
  );

-- Session characters: DM and character owner can update; all session members can read
create policy "Session members can read session_characters" on public.session_characters
  for select using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = session_characters.session_id
        and (cm.user_id = auth.uid() or c.dm_id = auth.uid())
    )
  );

create policy "Character owner can update session_characters" on public.session_characters
  for update using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

create policy "DMs can update any session_character" on public.session_characters
  for update using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_characters.session_id and c.dm_id = auth.uid()
    )
  );

-- DM can insert session_characters when starting a session
create policy "DMs can insert session_characters" on public.session_characters
  for insert with check (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_id and c.dm_id = auth.uid()
    )
  );

-- Auto-create user profile on signup
-- Uses username from auth metadata if provided, otherwise derives from email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1) || '_' || substr(gen_random_uuid()::text, 1, 6)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
