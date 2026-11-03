-- characters is published to Realtime, and the select policy that decides who receives its
-- change events lets party members see each other's characters but nobody else's.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a7000000-0000-0000-0000-00000000000a', 'gm@live.local', '{"username":"live_gm"}'),
  ('b7000000-0000-0000-0000-00000000000b', 'p1@live.local', '{"username":"live_p1"}'),
  ('c7000000-0000-0000-0000-00000000000c', 'p2@live.local', '{"username":"live_p2"}'),
  ('d7000000-0000-0000-0000-00000000000d', 'inv@live.local', '{"username":"live_inv"}'),
  ('f7000000-0000-0000-0000-00000000000f', 'out@live.local', '{"username":"live_out"}');

insert into public.characters (id, owner_id, system_id, name) values
  ('f7100000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'Mira'),
  ('f7100000-0000-0000-0000-000000000002', 'c7000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'Torin');

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('e7000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'a7000000-0000-0000-0000-00000000000a', 'Live Game', 'LIVAAA');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  ('e7000000-0000-0000-0000-00000000000e', 'a7000000-0000-0000-0000-00000000000a', 'gm', null, 'active'),
  ('e7000000-0000-0000-0000-00000000000e', 'b7000000-0000-0000-0000-00000000000b', 'player', 'f7100000-0000-0000-0000-000000000001', 'active'),
  ('e7000000-0000-0000-0000-00000000000e', 'c7000000-0000-0000-0000-00000000000c', 'player', 'f7100000-0000-0000-0000-000000000002', 'active'),
  ('e7000000-0000-0000-0000-00000000000e', 'd7000000-0000-0000-0000-00000000000d', 'player', null, 'invited');

select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'characters'),
  'characters is published to realtime');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.characters), 2, 'the GM sees both party characters');

set local request.jwt.claims to '{"sub":"b7000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.characters), 2, 'a player sees their own and their teammate''s character');
select is((select count(*)::int from public.characters where id = 'f7100000-0000-0000-0000-000000000002'), 1, 'a player can read a teammate''s character');
select is((select count(*)::int from public.characters where id = 'f7100000-0000-0000-0000-000000000002' and name = 'Torin'), 1, 'and its name');

set local request.jwt.claims to '{"sub":"d7000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.characters), 0, 'an invited member sees no party characters');

set local request.jwt.claims to '{"sub":"f7000000-0000-0000-0000-00000000000f","role":"authenticated"}';
select is((select count(*)::int from public.characters), 0, 'an outsider sees no party characters');

select * from finish();
rollback;
