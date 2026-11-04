-- combats / combat_entries / combat_order: who can read what, no direct writes, constraints,
-- realtime publication, lock_combat.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(51);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a7000000-0000-0000-0000-00000000000a', 'gm@cmb.local', '{"username":"cmb_gm"}'),
  ('b7000000-0000-0000-0000-00000000000b', 'p1@cmb.local', '{"username":"cmb_p1"}'),
  ('b7000000-0000-0000-0000-00000000000c', 'p2@cmb.local', '{"username":"cmb_p2"}'),
  ('c7000000-0000-0000-0000-00000000000c', 'inv@cmb.local', '{"username":"cmb_inv"}'),
  ('d7000000-0000-0000-0000-00000000000d', 'out@cmb.local', '{"username":"cmb_out"}'),
  ('a7000000-0000-0000-0000-0000000000a2', 'gm2@cmb.local', '{"username":"cmb_gm2"}');
insert into public.characters (id, owner_id, system_id, name) values
  ('f7000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'Cmb Hero 1'),
  ('f7000000-0000-0000-0000-000000000002', 'b7000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'Cmb Hero 2');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('e7000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'a7000000-0000-0000-0000-00000000000a', 'Cmb Game', 'CMBAAA'),
  ('e7000000-0000-0000-0000-0000000000e2', 'dnd5e-2024', 'a7000000-0000-0000-0000-0000000000a2', 'Other Game', 'CMBBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  ('e7000000-0000-0000-0000-00000000000e', 'a7000000-0000-0000-0000-00000000000a', 'gm', null, 'active'),
  ('e7000000-0000-0000-0000-00000000000e', 'b7000000-0000-0000-0000-00000000000b', 'player', 'f7000000-0000-0000-0000-000000000001', 'active'),
  ('e7000000-0000-0000-0000-00000000000e', 'b7000000-0000-0000-0000-00000000000c', 'player', 'f7000000-0000-0000-0000-000000000002', 'active'),
  ('e7000000-0000-0000-0000-00000000000e', 'c7000000-0000-0000-0000-00000000000c', 'player', null, 'invited'),
  ('e7000000-0000-0000-0000-0000000000e2', 'a7000000-0000-0000-0000-0000000000a2', 'gm', null, 'active');
insert into public.sessions (id, campaign_id, opened_by, in_combat) values
  ('51700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'b7000000-0000-0000-0000-00000000000b', true);

insert into public.combats (id, session_id, campaign_id, status) values
  ('c0700000-0000-0000-0000-000000000001', '51700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'active');
insert into public.combat_entries (id, combat_id, campaign_id, kind, user_id, character_id, name, max_hp, hp, ac, notes, hidden, initiative, position, is_current) values
  ('e1700000-0000-0000-0000-000000000001', 'c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'player', 'b7000000-0000-0000-0000-00000000000b', 'f7000000-0000-0000-0000-000000000001', null, null, null, null, null, false, 18, 1, true),
  ('e1700000-0000-0000-0000-000000000002', 'c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', null, null, 'Visible Goblin', 7, 7, 13, 'secret plan', false, 12, 2, false),
  ('e1700000-0000-0000-0000-000000000003', 'c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', null, null, 'Hidden Ogre', 59, 59, 17, 'has the key', true, 15, 3, false);
insert into public.combat_order (id, combat_id, campaign_id, kind, user_id, character_id, name, initiative, position) values
  ('e1700000-0000-0000-0000-000000000001', 'c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'player', 'b7000000-0000-0000-0000-00000000000b', 'f7000000-0000-0000-0000-000000000001', null, 18, 1),
  ('e1700000-0000-0000-0000-000000000002', 'c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', null, null, 'Visible Goblin', 12, 2);

-- Test helper (rolled back with the rest): rows affected by a statement run as the caller (RLS applies).
create function public.t_rows(q text) returns int language plpgsql as $$
declare n int;
begin execute q; get diagnostics n = row_count; return n; end $$;
grant execute on function public.t_rows(text) to authenticated;

-- combats: members read
set local role authenticated;
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.combats), 1, 'GM sees the combat');
set local request.jwt.claims to '{"sub":"b7000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.combats), 1, 'active player sees the combat');
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.combats), 0, 'invited member does not see the combat');
set local request.jwt.claims to '{"sub":"d7000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.combats), 0, 'outsider does not see the combat');
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.combats), 0, 'another campaign''s GM does not see the combat');

-- combat_entries: GM only
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.combat_entries), 3, 'GM sees all three entries');
set local request.jwt.claims to '{"sub":"b7000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.combat_entries), 0, 'player p1 sees no entries (hp, ac, notes, hidden unreadable)');
set local request.jwt.claims to '{"sub":"b7000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.combat_entries), 0, 'player p2 sees no entries');
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.combat_entries), 0, 'invited member sees no entries');
set local request.jwt.claims to '{"sub":"d7000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.combat_entries), 0, 'outsider sees no entries');
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.combat_entries), 0, 'another campaign''s GM sees no entries');

-- combat_order: members read, the hidden enemy has no row
set local request.jwt.claims to '{"sub":"b7000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.combat_order), 2, 'player sees the two visible order rows');
select is((select count(*)::int from public.combat_order where id = 'e1700000-0000-0000-0000-000000000003'), 0, 'no order row for the hidden ogre');
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.combat_order), 0, 'invited member sees no order');
set local request.jwt.claims to '{"sub":"d7000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.combat_order), 0, 'outsider sees no order');
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.combat_order), 0, 'another campaign''s GM sees no order');

-- No direct writes, for the GM and for a player: inserts refused; updates/deletes match no rows.
set local request.jwt.claims to '{"sub":"b7000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$insert into public.combats (session_id, campaign_id) values ('51700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e')$$, '42501', null, 'player cannot insert a combat');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'X', 1, 1, 9)$$, '42501', null, 'player cannot insert an entry');
select throws_ok($$insert into public.combat_order (combat_id, campaign_id, kind, name, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'X', 9)$$, '42501', null, 'player cannot insert an order row');
select is(public.t_rows('update public.combats set round = 5'), 0, 'player update of combats matches no rows');
select is(public.t_rows('update public.combat_entries set hp = 0'), 0, 'player update of entries matches no rows');
select is(public.t_rows('update public.combat_order set position = position'), 0, 'player update of order matches no rows');
select is(public.t_rows('delete from public.combats'), 0, 'player delete of combats matches no rows');
select is(public.t_rows('delete from public.combat_entries'), 0, 'player delete of entries matches no rows');
select is(public.t_rows('delete from public.combat_order'), 0, 'player delete of order matches no rows');
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$insert into public.combats (session_id, campaign_id) values ('51700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e')$$, '42501', null, 'GM cannot insert a combat');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'X', 1, 1, 9)$$, '42501', null, 'GM cannot insert an entry');
select throws_ok($$insert into public.combat_order (combat_id, campaign_id, kind, name, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'X', 9)$$, '42501', null, 'GM cannot insert an order row');
select is(public.t_rows('update public.combat_entries set hp = 0'), 0, 'GM update of entries matches no rows');
select is(public.t_rows('delete from public.combat_entries'), 0, 'GM delete of entries matches no rows');
select is(public.t_rows('update public.combats set round = 5'), 0, 'GM update of combats matches no rows');
reset role;
set local request.jwt.claims to '{}';

-- Exact column lists: a later column on a player-readable table fails here and must be reviewed.
select columns_are('public', 'combat_order',
  array['id','combat_id','campaign_id','kind','user_id','character_id','name','initiative','position'],
  'combat_order has exactly the player-safe columns');
select columns_are('public', 'combats',
  array['id','session_id','campaign_id','status','round','turn_entry_id','rev','started_by','created_at','updated_at'],
  'combats has exactly its reviewed columns');

-- Publication
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combats'), 'combats is published to realtime');
select ok(not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_entries'), 'combat_entries is not published');
select ok(not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_order'), 'combat_order is not published');

-- Constraints (as the superuser)
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'Zero', 0, 0, 10)$$, '23514', null, 'enemy max_hp 0 is refused');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', '   ', 5, 5, 10)$$, '23514', null, 'blank enemy name is refused');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'Over', 5, 6, 10)$$, '23514', null, 'hp above max_hp is refused');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, ac, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'Tank', 5, 5, 41, 10)$$, '23514', null, 'ac 41 is refused');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position, is_current) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'enemy', 'Second', 5, 5, 10, true)$$, '23505', null, 'two current entries in one combat are refused');
select throws_ok($$insert into public.combat_entries (combat_id, campaign_id, kind, user_id, character_id, name, position) values ('c0700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'player', 'b7000000-0000-0000-0000-00000000000c', 'f7000000-0000-0000-0000-000000000002', 'Named', 10)$$, '23514', null, 'a player entry with a name is refused');
select throws_ok($$insert into public.combats (session_id, campaign_id) values ('51700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e')$$, '23505', null, 'a second live combat for the session is refused');
select lives_ok($$insert into public.combats (id, session_id, campaign_id, status) values ('c0700000-0000-0000-0000-000000000002', '51700000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-00000000000e', 'ended')$$, 'an ended combat beside a live one is allowed');

-- lock_combat
set local role authenticated;
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.lock_combat('c0700000-0000-0000-0000-000000000001')$$, 'P0001', 'not_member', 'invited member cannot lock a combat');
set local request.jwt.claims to '{"sub":"d7000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select throws_ok($$select public.lock_combat('c0700000-0000-0000-0000-000000000001')$$, 'P0001', 'not_member', 'outsider cannot lock a combat');
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.lock_combat('c0700000-0000-0000-0000-000000000002')$$, 'P0001', 'no_active_combat', 'an ended combat cannot be locked');
set local request.jwt.claims to '{}';
select throws_ok($$select public.lock_combat('c0700000-0000-0000-0000-000000000001')$$, 'P0001', 'not_authenticated', 'unauthenticated lock is refused');
reset role;

-- Cascade: deleting the session removes combats, entries and order rows
delete from public.sessions where id = '51700000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.combats where campaign_id = 'e7000000-0000-0000-0000-00000000000e'), 0, 'session delete cascades to combats');
select is((select count(*)::int from public.combat_entries where campaign_id = 'e7000000-0000-0000-0000-00000000000e'), 0, 'session delete cascades to entries');
select is((select count(*)::int from public.combat_order where campaign_id = 'e7000000-0000-0000-0000-00000000000e'), 0, 'session delete cascades to order rows');

select * from finish();
rollback;
