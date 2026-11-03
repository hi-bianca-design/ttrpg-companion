-- RPCs: open_session, end_session, set_combat (the manual turn picker, set_turn/end_turn, is retired: the turn lives in the combat order).
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Fixtures (as the superuser; RLS bypassed). GM has no character; p1/p2 do; inv is invited.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a5000000-0000-0000-0000-00000000000a', 'gm@rpcs.local', '{"username":"rpcs_gm"}'),
  ('b5000000-0000-0000-0000-00000000000b', 'p1@rpcs.local', '{"username":"rpcs_p1"}'),
  ('c5000000-0000-0000-0000-00000000000c', 'p2@rpcs.local', '{"username":"rpcs_p2"}'),
  ('d5000000-0000-0000-0000-00000000000d', 'inv@rpcs.local', '{"username":"rpcs_inv"}'),
  ('f5000000-0000-0000-0000-00000000000f', 'out@rpcs.local', '{"username":"rpcs_out"}');
insert into public.characters (id, owner_id, system_id, name) values
  ('a6000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'P1 Hero'),
  ('a6000000-0000-0000-0000-000000000002', 'c5000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'P2 Hero');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('e5000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'a5000000-0000-0000-0000-00000000000a', 'RPC Game', 'RPCAAA');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  ('e5000000-0000-0000-0000-00000000000e', 'a5000000-0000-0000-0000-00000000000a', 'gm', null, 'active'),
  ('e5000000-0000-0000-0000-00000000000e', 'b5000000-0000-0000-0000-00000000000b', 'player', 'a6000000-0000-0000-0000-000000000001', 'active'),
  ('e5000000-0000-0000-0000-00000000000e', 'c5000000-0000-0000-0000-00000000000c', 'player', 'a6000000-0000-0000-0000-000000000002', 'active'),
  ('e5000000-0000-0000-0000-00000000000e', 'd5000000-0000-0000-0000-00000000000d', 'player', null, 'invited');

-- Test helper (rolled back with the rest): id of the campaign's active session.
create function public.t_sid() returns uuid language sql security definer set search_path = '' as $$
  select id from public.sessions where campaign_id = 'e5000000-0000-0000-0000-00000000000e' and status = 'active'
$$;
grant execute on function public.t_sid() to authenticated;

set local role authenticated;

-- open_session
set local request.jwt.claims to '{"sub":"d5000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select throws_ok($$select public.open_session('e5000000-0000-0000-0000-00000000000e')$$, 'P0001', 'not_member', 'invited member cannot open a session');
set local request.jwt.claims to '{"sub":"f5000000-0000-0000-0000-00000000000f","role":"authenticated"}';
select throws_ok($$select public.open_session('e5000000-0000-0000-0000-00000000000e')$$, 'P0001', 'not_member', 'outsider cannot open a session');
set local request.jwt.claims to '{}';
select throws_ok($$select public.open_session('e5000000-0000-0000-0000-00000000000e')$$, 'P0001', 'not_authenticated', 'unauthenticated call is refused');
set local request.jwt.claims to '{"sub":"b5000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select opened_by from public.open_session('e5000000-0000-0000-0000-00000000000e')), 'b5000000-0000-0000-0000-00000000000b'::uuid, 'a player can open a session');
set local request.jwt.claims to '{"sub":"a5000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select id from public.open_session('e5000000-0000-0000-0000-00000000000e')), public.t_sid(), 'opening again returns the active session');
select is((select count(*)::int from public.sessions), 1, 'still exactly one session');

-- set_combat
set local request.jwt.claims to '{"sub":"d5000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select throws_ok($$select public.set_combat(public.t_sid(), true)$$, 'P0001', 'not_member', 'invited member cannot enter combat');
set local request.jwt.claims to '{"sub":"c5000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select combat_started_by from public.set_combat(public.t_sid(), true)), 'c5000000-0000-0000-0000-00000000000c'::uuid, 'a player can enter combat and is recorded as the starter');
set local request.jwt.claims to '{"sub":"b5000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select combat_started_by from public.set_combat(public.t_sid(), true)), 'c5000000-0000-0000-0000-00000000000c'::uuid, 'entering combat again changes nothing');
select throws_ok($$select public.set_combat(public.t_sid(), false)$$, 'P0001', 'not_allowed', 'another player cannot end combat');

-- ending combat clears the starter; the starter and the GM may end it
set local request.jwt.claims to '{"sub":"c5000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select in_combat from public.set_combat(public.t_sid(), false)), false, 'the starter can end combat');
select is((select combat_started_by is null from public.sessions where id = public.t_sid()), true, 'ending combat clears the starter');
set local request.jwt.claims to '{"sub":"a5000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.set_combat(public.t_sid(), true);
select is((select in_combat from public.set_combat(public.t_sid(), false)), false, 'the GM can end combat');

-- ending the session
set local request.jwt.claims to '{"sub":"c5000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.end_session(public.t_sid())$$, 'P0001', 'not_allowed', 'a player who did not open the session cannot end it');
set local request.jwt.claims to '{"sub":"b5000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.set_combat(public.t_sid(), true);
reset role;
create temp table t_ended as select public.t_sid() as id;
grant select on t_ended to authenticated;
set local role authenticated;
select is((select status from public.end_session((select id from t_ended))), 'ended', 'the opener can end the session');
select is((select in_combat::text || (ended_at is not null)::text from public.sessions where id = (select id from t_ended)), 'falsetrue', 'ending the session ends combat and records ended_at');

-- calls on the ended session
select throws_ok($$select public.end_session((select id from t_ended))$$, 'P0001', 'no_active_session', 'ending an ended session is refused');
select throws_ok($$select public.set_combat((select id from t_ended), true)$$, 'P0001', 'no_active_session', 'combat cannot start on an ended session');

-- a new session can be opened after one ended; the GM can end a session they did not open
select is((select count(*)::int from public.open_session('e5000000-0000-0000-0000-00000000000e') s where s.id <> (select id from t_ended)), 1, 'a new session opens after the last one ended');
set local request.jwt.claims to '{"sub":"a5000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select status from public.end_session(public.t_sid())), 'ended', 'the GM can end a session they did not open');

reset role;
select ok(not (
  has_function_privilege('anon', 'public.open_session(uuid)', 'execute')
  or has_function_privilege('anon', 'public.end_session(uuid)', 'execute')
  or has_function_privilege('anon', 'public.set_combat(uuid, boolean)', 'execute')), 'anon cannot execute any session RPC');

-- The manual turn is gone: no column, no RPCs (the combat order holds the turn).
select hasnt_column('public', 'sessions', 'current_turn_user_id', 'sessions has no current_turn_user_id column');
select hasnt_function('public', 'set_turn', array['uuid', 'uuid'], 'set_turn no longer exists');
select hasnt_function('public', 'end_turn', array['uuid'], 'end_turn no longer exists');

-- authenticated keeps execute on the internal helper: a revoked-from-authenticated function is
-- a permission-denied path that crashed the local Postgres image when called through the API role.
select ok(has_function_privilege('authenticated', 'public.lock_active_session(uuid)', 'execute'),
  'authenticated can execute lock_active_session (it still checks auth and membership itself)');

select * from finish();
rollback;
