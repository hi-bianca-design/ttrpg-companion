-- sessions: members-only reads, no direct writes, table constraints, turn cleanup, realtime.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a4000000-0000-0000-0000-00000000000a', 'gm@sess.local', '{"username":"sess_gm"}'),
  ('b4000000-0000-0000-0000-00000000000b', 'p@sess.local', '{"username":"sess_player"}'),
  ('c4000000-0000-0000-0000-00000000000c', 'i@sess.local', '{"username":"sess_invited"}'),
  ('d4000000-0000-0000-0000-00000000000d', 'o@sess.local', '{"username":"sess_outsider"}');

insert into public.characters (id, owner_id, system_id, name) values
  ('f4000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'Sess Hero');

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('e4000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'a4000000-0000-0000-0000-00000000000a', 'Sess Game', 'SESAAA');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  ('e4000000-0000-0000-0000-00000000000e', 'a4000000-0000-0000-0000-00000000000a', 'gm', null, 'active'),
  ('e4000000-0000-0000-0000-00000000000e', 'b4000000-0000-0000-0000-00000000000b', 'player', 'f4000000-0000-0000-0000-000000000001', 'active'),
  ('e4000000-0000-0000-0000-00000000000e', 'c4000000-0000-0000-0000-00000000000c', 'player', null, 'invited');

insert into public.sessions (id, campaign_id, opened_by) values
  ('51000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-00000000000e', 'b4000000-0000-0000-0000-00000000000b');

-- Reads
set local role authenticated;
set local request.jwt.claims to '{"sub":"a4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.sessions), 1, 'GM sees the campaign session');

set local request.jwt.claims to '{"sub":"b4000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.sessions), 1, 'active player sees the campaign session');

set local request.jwt.claims to '{"sub":"c4000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.sessions), 0, 'invited member does not see the session');

set local request.jwt.claims to '{"sub":"d4000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.sessions), 0, 'outsider does not see the session');

-- No direct writes (even for the GM): inserts are refused; updates and deletes match no rows.
set local request.jwt.claims to '{"sub":"a4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$insert into public.sessions (campaign_id, opened_by) values ('e4000000-0000-0000-0000-00000000000e', 'a4000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'GM cannot insert a session directly');
select lives_ok($$update public.sessions set in_combat = true$$, 'direct update is a no-op, not an error');
select is((select in_combat from public.sessions), false, 'direct update changed nothing');
select lives_ok($$delete from public.sessions$$, 'direct delete is a no-op, not an error');
select is((select count(*)::int from public.sessions), 1, 'direct delete removed nothing');
reset role;
set local request.jwt.claims to '{}';

-- Constraints (as the superuser)
select throws_ok(
  $$insert into public.sessions (campaign_id, opened_by) values ('e4000000-0000-0000-0000-00000000000e', 'a4000000-0000-0000-0000-00000000000a')$$,
  '23505', null, 'a second active session for the campaign is refused');
select throws_ok(
  $$insert into public.sessions (campaign_id, opened_by, status, ended_at, in_combat)
    values ('e4000000-0000-0000-0000-00000000000e', 'a4000000-0000-0000-0000-00000000000a', 'ended', now(), true)$$,
  '23514', null, 'an ended session cannot be in combat');
select throws_ok(
  $$insert into public.sessions (campaign_id, opened_by, status, ended_at, current_turn_user_id)
    values ('e4000000-0000-0000-0000-00000000000e', 'a4000000-0000-0000-0000-00000000000a', 'ended', now(), 'b4000000-0000-0000-0000-00000000000b')$$,
  '23514', null, 'a turn requires combat');
select throws_ok(
  $$insert into public.sessions (campaign_id, opened_by, status)
    values ('e4000000-0000-0000-0000-00000000000e', 'a4000000-0000-0000-0000-00000000000a', 'ended')$$,
  '23514', null, 'an ended session needs ended_at');

-- Turn cleanup when the holder leaves
update public.sessions set in_combat = true, combat_started_by = 'b4000000-0000-0000-0000-00000000000b',
  current_turn_user_id = 'b4000000-0000-0000-0000-00000000000b';
update public.campaign_members set role = 'gm' where user_id = 'a4000000-0000-0000-0000-00000000000a';
select is((select current_turn_user_id from public.sessions), 'b4000000-0000-0000-0000-00000000000b'::uuid,
  'an unrelated membership change keeps the turn');
update public.campaign_members set character_id = null where user_id = 'b4000000-0000-0000-0000-00000000000b';
select is((select current_turn_user_id from public.sessions), null, 'detaching the character clears the turn');
update public.campaign_members set character_id = 'f4000000-0000-0000-0000-000000000001' where user_id = 'b4000000-0000-0000-0000-00000000000b';
update public.sessions set current_turn_user_id = 'b4000000-0000-0000-0000-00000000000b';
update public.campaign_members set status = 'invited' where user_id = 'b4000000-0000-0000-0000-00000000000b';
select is((select current_turn_user_id from public.sessions), null, 'losing active status clears the turn');
update public.campaign_members set status = 'active' where user_id = 'b4000000-0000-0000-0000-00000000000b';
update public.sessions set current_turn_user_id = 'b4000000-0000-0000-0000-00000000000b';
delete from public.campaign_members where user_id = 'b4000000-0000-0000-0000-00000000000b';
select is((select current_turn_user_id from public.sessions), null, 'leaving the campaign clears the turn');

select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'),
  'sessions is published to realtime');

select * from finish();
rollback;
