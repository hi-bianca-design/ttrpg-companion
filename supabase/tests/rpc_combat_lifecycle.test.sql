-- set_combat / end_session / start_combat and membership sync of the live combat.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(48);

-- Fixtures (as the superuser). GM and p3 have no character; inv is invited (with a character).
insert into auth.users (id, email, raw_user_meta_data) values
  ('a9000000-0000-0000-0000-00000000000a', 'gm@life.local', '{"username":"life_gm"}'),
  ('b9000000-0000-0000-0000-00000000000b', 'p1@life.local', '{"username":"life_p1"}'),
  ('b9000000-0000-0000-0000-00000000000c', 'p2@life.local', '{"username":"life_p2"}'),
  ('b9000000-0000-0000-0000-00000000000d', 'p3@life.local', '{"username":"life_p3"}'),
  ('b9000000-0000-0000-0000-00000000000e', 'p4@life.local', '{"username":"life_p4"}'),
  ('c9000000-0000-0000-0000-00000000000c', 'inv@life.local', '{"username":"life_inv"}'),
  ('d9000000-0000-0000-0000-00000000000d', 'out@life.local', '{"username":"life_out"}');
insert into public.characters (id, owner_id, system_id, name) values
  ('f9000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'Life Hero 1'),
  ('f9000000-0000-0000-0000-000000000002', 'b9000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'Life Hero 2'),
  ('f9000000-0000-0000-0000-000000000003', 'c9000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'Life Hero Inv'),
  ('f9000000-0000-0000-0000-000000000004', 'b9000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'Life Hero 4');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('e9000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'a9000000-0000-0000-0000-00000000000a', 'Life Game', 'LIFAAA');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  ('e9000000-0000-0000-0000-00000000000e', 'a9000000-0000-0000-0000-00000000000a', 'gm', null, 'active'),
  ('e9000000-0000-0000-0000-00000000000e', 'b9000000-0000-0000-0000-00000000000b', 'player', 'f9000000-0000-0000-0000-000000000001', 'active'),
  ('e9000000-0000-0000-0000-00000000000e', 'b9000000-0000-0000-0000-00000000000c', 'player', 'f9000000-0000-0000-0000-000000000002', 'active'),
  ('e9000000-0000-0000-0000-00000000000e', 'b9000000-0000-0000-0000-00000000000d', 'player', null, 'active'),
  ('e9000000-0000-0000-0000-00000000000e', 'c9000000-0000-0000-0000-00000000000c', 'player', 'f9000000-0000-0000-0000-000000000003', 'invited');

-- Test helpers (rolled back with the rest)
create function public.t_sid() returns uuid language sql security definer set search_path = '' as $$
  select id from public.sessions where campaign_id = 'e9000000-0000-0000-0000-00000000000e' and status = 'active'
$$;
create function public.t_cid() returns uuid language sql security definer set search_path = '' as $$
  select id from public.combats where campaign_id = 'e9000000-0000-0000-0000-00000000000e' and status <> 'ended'
$$;
grant execute on function public.t_sid(), public.t_cid() to authenticated;
create temp table k (name text primary key, id uuid);
grant all on k to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"b9000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok($$select public.open_session('e9000000-0000-0000-0000-00000000000e')$$, 'p1 opens a session');
select is((select in_combat from public.set_combat(public.t_sid(), true)), true, 'p1 enters combat');
reset role;
select is((select count(*)::int from public.combats where campaign_id = 'e9000000-0000-0000-0000-00000000000e' and status <> 'ended'), 1, 'one live combat');
select is((select started_by from public.combats where id = public.t_cid()), 'b9000000-0000-0000-0000-00000000000b'::uuid, 'started_by is the player who entered');
select is((select status from public.combats where id = public.t_cid()), 'rolling', 'a new combat is rolling');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_cid()), 2, 'one entry per active member with a character');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_cid() and initiative is not null), 0, 'all initiatives are null');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_cid()
  and user_id in ('a9000000-0000-0000-0000-00000000000a', 'b9000000-0000-0000-0000-00000000000d', 'c9000000-0000-0000-0000-00000000000c')), 0,
  'GM, character-less and invited members get no entry');

insert into k values ('first', public.t_cid());
set local role authenticated;
set local request.jwt.claims to '{"sub":"b9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select lives_ok($$select public.set_combat(public.t_sid(), true)$$, 'a second player entering is fine');
reset role;
select is(public.t_cid(), (select id from k where name = 'first'), 'the second call returns the same combat');
select is((select count(*)::int from public.combats where campaign_id = 'e9000000-0000-0000-0000-00000000000e' and status <> 'ended'), 1, 'still one live combat');

set local role authenticated;
set local request.jwt.claims to '{"sub":"c9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.set_combat(public.t_sid(), true)$$, 'P0001', 'not_member', 'invited member cannot enter combat');
set local request.jwt.claims to '{"sub":"d9000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select throws_ok($$select public.set_combat(public.t_sid(), true)$$, 'P0001', 'not_member', 'outsider cannot enter combat');
set local request.jwt.claims to '{}';
select throws_ok($$select public.set_combat(public.t_sid(), true)$$, 'P0001', 'not_authenticated', 'unauthenticated call is refused');

-- start_combat
set local request.jwt.claims to '{"sub":"b9000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.start_combat(public.t_cid())$$, 'P0001', 'not_allowed', 'a player cannot start combat');
set local request.jwt.claims to '{"sub":"c9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.start_combat(public.t_cid())$$, 'P0001', 'not_member', 'invited member cannot start combat');
set local request.jwt.claims to '{"sub":"a9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.start_combat('c0900000-0000-0000-0000-0000000000ff')$$, 'P0001', 'no_active_combat', 'unknown combat id');
select is((select status from public.start_combat(public.t_cid())), 'active', 'the GM starts combat');
reset role;
select is((select round from public.combats where id = public.t_cid()), 1, 'round 1');
select is((select position from public.combat_entries where combat_id = public.t_cid() and is_current), 1, 'the position-1 entry is current');
select is((select count(*)::int from public.combat_order where combat_id = public.t_cid()), 2, 'the order projection is filled');
set local role authenticated;
set local request.jwt.claims to '{"sub":"a9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$select public.start_combat(public.t_cid())$$, 'P0001', 'not_rolling', 'starting twice is refused');

-- ending: GM or starter only
set local request.jwt.claims to '{"sub":"b9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.set_combat(public.t_sid(), false)$$, 'P0001', 'not_allowed', 'a non-starter player cannot end combat');
set local request.jwt.claims to '{"sub":"a9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.set_combat(public.t_sid(), false)$$, 'the GM ends combat');
reset role;
select is((select status from public.combats where id = (select id from k where name = 'first')), 'ended', 'the combat is ended');
select is((select count(*)::int from public.combat_entries where combat_id = (select id from k where name = 'first')), 0, 'ending deletes the entries');
select is((select count(*)::int from public.combat_order where combat_id = (select id from k where name = 'first')), 0, 'ending deletes the order rows');
select results_eq($$select turn_entry_id from public.combats where id = (select id from k where name = 'first')$$,
  $$values (null::uuid)$$, 'ending clears the turn pointer');
select is((select in_combat from public.sessions where campaign_id = 'e9000000-0000-0000-0000-00000000000e' and status = 'active'), false, 'sessions.in_combat is false');

-- the starter may end it; entering again creates a new combat
set local role authenticated;
set local request.jwt.claims to '{"sub":"b9000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok($$select public.set_combat(public.t_sid(), true)$$, 'entering again after it ended');
reset role;
select isnt(public.t_cid(), (select id from k where name = 'first'), 'a new combat has a new id');
set local role authenticated;
select lives_ok($$select public.set_combat(public.t_sid(), false)$$, 'the starter ends their own combat');
reset role;
select is((select count(*)::int from public.combats where campaign_id = 'e9000000-0000-0000-0000-00000000000e' and status <> 'ended'), 0, 'no live combat after the starter ended it');

-- end_session ends the combat the same way
set local role authenticated;
select lives_ok($$select public.set_combat(public.t_sid(), true)$$, 'p1 enters combat again');
reset role;
insert into k values ('second', public.t_cid());
set local role authenticated;
set local request.jwt.claims to '{"sub":"a9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.end_session(public.t_sid())$$, 'the GM ends the session');
select throws_ok($$select public.start_combat((select id from k where name = 'second'))$$, 'P0001', 'no_active_combat', 'RPCs on the ended combat raise no_active_combat');
reset role;
select is((select count(*)::int from public.combat_entries where combat_id = (select id from k where name = 'second')), 0, 'end_session deleted the entries');

-- membership sync of a live combat
set local role authenticated;
set local request.jwt.claims to '{"sub":"b9000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok($$select public.open_session('e9000000-0000-0000-0000-00000000000e')$$, 'a new session');
select lives_ok($$select public.set_combat(public.t_sid(), true)$$, 'and a new combat');
set local request.jwt.claims to '{"sub":"a9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.start_combat(public.t_cid())$$, 'started');
reset role;
set local request.jwt.claims to '{}';  -- privileged caller: the membership guard trigger skips
-- p1 is position 1 and current; p2 position 2. p1 leaves.
delete from public.campaign_members where user_id = 'b9000000-0000-0000-0000-00000000000b';
select is((select count(*)::int from public.combat_entries where combat_id = public.t_cid() and user_id = 'b9000000-0000-0000-0000-00000000000b'), 0, 'the leaving member''s entry is gone');
select is((select user_id from public.combat_entries where combat_id = public.t_cid() and is_current), 'b9000000-0000-0000-0000-00000000000c'::uuid, 'the turn passed on to p2');
-- p1 rejoins: appended last with no initiative (the insert trigger)
insert into public.campaign_members (campaign_id, user_id, role, character_id, status)
  values ('e9000000-0000-0000-0000-00000000000e', 'b9000000-0000-0000-0000-00000000000b', 'player', 'f9000000-0000-0000-0000-000000000001', 'active');
select results_eq($$select position, initiative from public.combat_entries where combat_id = public.t_cid() and user_id = 'b9000000-0000-0000-0000-00000000000b'$$,
  $$values (2, null::int)$$, 'a rejoining member is appended last with a null initiative');
-- the last-position holder leaves: wrap and a new round
update public.combat_entries set is_current = false where combat_id = public.t_cid();
update public.combat_entries set is_current = true where combat_id = public.t_cid() and user_id = 'b9000000-0000-0000-0000-00000000000b';
delete from public.campaign_members where user_id = 'b9000000-0000-0000-0000-00000000000b';
select is((select user_id from public.combat_entries where combat_id = public.t_cid() and is_current), 'b9000000-0000-0000-0000-00000000000c'::uuid, 'the last-position holder leaving wraps to position 1');
select is((select round from public.combats where id = public.t_cid()), 2, 'the wrap adds a round');
-- a character attached later joins the fight
insert into public.campaign_members (campaign_id, user_id, role, character_id, status)
  values ('e9000000-0000-0000-0000-00000000000e', 'b9000000-0000-0000-0000-00000000000e', 'player', null, 'active');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_cid() and user_id = 'b9000000-0000-0000-0000-00000000000e'), 0, 'a member without a character has no entry');
update public.campaign_members set character_id = 'f9000000-0000-0000-0000-000000000004' where user_id = 'b9000000-0000-0000-0000-00000000000e';
select results_eq($$select initiative from public.combat_entries where combat_id = public.t_cid() and user_id = 'b9000000-0000-0000-0000-00000000000e'$$,
  $$values (null::int)$$, 'attaching a character appends an entry with a null initiative');
select is((select count(*)::int from public.combat_order where combat_id = public.t_cid() and user_id = 'b9000000-0000-0000-0000-00000000000e'), 1, 'and it is in the projection');

set constraints all immediate;
select * from finish();
rollback;
