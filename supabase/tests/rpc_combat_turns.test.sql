-- Order and turn RPCs: set_initiative, move_entry, next_turn, end_my_turn, set_current_entry,
-- delay_turn, and the stale-tap guards. Ids come from a temp table via t_id('name').
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(84);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('p2'), ('p3'), ('inv'), ('out'), ('gm2'), ('p4'),
  ('c1'), ('c2'), ('c3'), ('c4'), ('s1'), ('s2'), ('s3'), ('s4'), ('campA'), ('campB'),
  ('ch1'), ('ch2'), ('ch4'), ('e_p1'), ('e_p2'), ('e_gob'), ('e_wolf'), ('e_ogre'), ('e_solo'), ('e_old'), ('rand');
grant all on k to authenticated;

create function public.t_id(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from pg_temp.k where name = p_name
$$;
create function public.t_as(p_name text) returns void language sql security definer set search_path = '' as $$
  select set_config('request.jwt.claims', case when p_name is null then '{}'
    else json_build_object('sub', (select id from pg_temp.k where name = p_name), 'role', 'authenticated')::text end, true)
$$;
-- 'P1,Goblin,...' in position order
create function public.t_order(p_combat text) returns text language sql security definer set search_path = '' as $$
  select string_agg(coalesce(e.name, ch.name), ',' order by e.position)
    from public.combat_entries e left join public.characters ch on ch.id = e.character_id
   where e.combat_id = (select id from pg_temp.k where name = p_combat)
$$;
-- 'Current|round'
create function public.t_state(p_combat text) returns text language sql security definer set search_path = '' as $$
  select coalesce((select coalesce(e.name, ch.name) from public.combat_entries e left join public.characters ch on ch.id = e.character_id
                    where e.combat_id = c.id and e.is_current), '-') || '|' || c.round
    from public.combats c where c.id = (select id from pg_temp.k where name = p_combat)
$$;
create function public.t_positions(p_combat text) returns int[] language sql security definer set search_path = '' as $$
  select array_agg(position order by position) from public.combat_entries
   where combat_id = (select id from pg_temp.k where name = p_combat)
$$;
grant execute on function public.t_id(text), public.t_as(text), public.t_order(text), public.t_state(text), public.t_positions(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@turns.local', json_build_object('username', 'turns_' || name)::jsonb
  from k where name in ('gm', 'p1', 'p2', 'p3', 'inv', 'out', 'gm2', 'p4');
insert into public.characters (id, owner_id, system_id, name) values
  (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'P1'),
  (public.t_id('ch2'), public.t_id('p2'), 'dnd5e-2024', 'P2'),
  (public.t_id('ch4'), public.t_id('p4'), 'dnd5e-2024', 'P4');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Turns A', 'TRNAAA'),
  (public.t_id('campB'), 'dnd5e-2024', public.t_id('gm2'), 'Turns B', 'TRNBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active'),
  (public.t_id('campA'), public.t_id('p2'), 'player', public.t_id('ch2'), 'active'),
  (public.t_id('campA'), public.t_id('p3'), 'player', null, 'active'),
  (public.t_id('campA'), public.t_id('inv'), 'player', null, 'invited'),
  (public.t_id('campB'), public.t_id('gm2'), 'gm', null, 'active'),
  (public.t_id('campB'), public.t_id('p4'), 'player', null, 'active');
insert into public.sessions (id, campaign_id, opened_by, in_combat) values
  (public.t_id('s1'), public.t_id('campA'), public.t_id('p1'), true),
  (public.t_id('s2'), public.t_id('campB'), public.t_id('p4'), true);
-- c1: campaign A, rolling. c2: campaign B, active with one enemy.
insert into public.combats (id, session_id, campaign_id, status) values
  (public.t_id('c1'), public.t_id('s1'), public.t_id('campA'), 'rolling'),
  (public.t_id('c2'), public.t_id('s2'), public.t_id('campB'), 'active');
insert into public.combat_entries (id, combat_id, campaign_id, kind, user_id, character_id, name, max_hp, hp, position, is_current) values
  (public.t_id('e_p1'), public.t_id('c1'), public.t_id('campA'), 'player', public.t_id('p1'), public.t_id('ch1'), null, null, null, 1, false),
  (public.t_id('e_gob'), public.t_id('c1'), public.t_id('campA'), 'enemy', null, null, 'Goblin', 7, 7, 2, false),
  (public.t_id('e_p2'), public.t_id('c1'), public.t_id('campA'), 'player', public.t_id('p2'), public.t_id('ch2'), null, null, null, 3, false),
  (public.t_id('e_solo'), public.t_id('c2'), public.t_id('campB'), 'enemy', null, null, 'Solo', 3, 3, 1, true);
select public.refresh_combat(public.t_id('c1'));
select public.refresh_combat(public.t_id('c2'));

set local role authenticated;

-- ---- rolling: set_initiative re-sorts the whole order
select public.t_as('p1');
select throws_ok($$select public.set_initiative(public.t_id('e_p1'), 18)$$, 'P0001', 'not_allowed', 'a player cannot set initiative');
select public.t_as('gm');
select throws_ok($$select public.set_initiative(public.t_id('e_p1'), 100)$$, 'P0001', 'invalid_initiative', '100 is not a valid initiative');
select throws_ok($$select public.set_initiative(public.t_id('e_p1'), -21)$$, 'P0001', 'invalid_initiative', '-21 is not a valid initiative');
select throws_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_p1'))$$, 'P0001', 'not_active', 'next_turn while rolling is refused');
select lives_ok($$select public.set_initiative(public.t_id('e_p2'), 12)$$, 'P2 rolls 12');
select is(public.t_order('c1'), 'P2,P1,Goblin', 'a rolled number sorts above blanks');
select lives_ok($$select public.set_initiative(public.t_id('e_p1'), 18); select public.set_initiative(public.t_id('e_gob'), 15)$$, 'P1 18, Goblin 15');
select is(public.t_order('c1'), 'P1,Goblin,P2', 'highest first');
reset role;
insert into public.combat_entries (id, combat_id, campaign_id, kind, name, max_hp, hp, position)
  values (public.t_id('e_wolf'), public.t_id('c1'), public.t_id('campA'), 'enemy', 'Wolf', 11, 11, 4);
set local role authenticated;
select is(public.t_order('c1'), 'P1,Goblin,P2,Wolf', 'a blank row sits last');
select lives_ok($$select public.set_initiative(public.t_id('e_p2'), 15)$$, 'P2 ties the Goblin at 15');
select is(public.t_order('c1'), 'P1,Goblin,P2,Wolf', 'a tie keeps the earlier row first');
select lives_ok($$select public.set_initiative(public.t_id('e_wolf'), 15)$$, 'Wolf also rolls 15');
select is(public.t_order('c1'), 'P1,Goblin,P2,Wolf', 'three-way tie stays in the existing order');

-- ---- active: only the changed entry is re-placed, the pointer stays put
reset role;
update public.combats set status = 'active' where id = public.t_id('c1');
update public.combat_entries set is_current = true where id = public.t_id('e_gob');
select public.refresh_combat(public.t_id('c1'));
set local role authenticated;
select public.t_as('gm');
select lives_ok($$select public.set_initiative(public.t_id('e_gob'), 5)$$, 'the current Goblin changes to 5');
select is(public.t_order('c1'), 'P1,P2,Wolf,Goblin', 'it is re-placed after the higher rows');
select is(public.t_state('c1'), 'Goblin|1', 'the current entry is unchanged');
reset role;
insert into public.combat_entries (id, combat_id, campaign_id, kind, name, max_hp, hp, position)
  values (public.t_id('e_ogre'), public.t_id('c1'), public.t_id('campA'), 'enemy', 'Ogre', 59, 59, 5);
set local role authenticated;
select public.t_as('gm');
select lives_ok($$select public.set_initiative(public.t_id('e_ogre'), 20)$$, 'a new enemy rolls 20');
select is(public.t_order('c1'), 'Ogre,P1,P2,Wolf,Goblin', 'it is inserted first');
select is(public.t_state('c1'), 'Goblin|1', 'the pointer did not move');

-- ---- move_entry
select public.t_as('p1');
select throws_ok($$select public.move_entry(public.t_id('e_p2'), 1)$$, 'P0001', 'not_allowed', 'a player cannot move rows');
select public.t_as('gm');
select throws_ok($$select public.move_entry(public.t_id('e_p2'), 0)$$, 'P0001', 'invalid_position', 'position 0 is refused');
select throws_ok($$select public.move_entry(public.t_id('e_p2'), 6)$$, 'P0001', 'invalid_position', 'position n+1 is refused');
select lives_ok($$select public.move_entry(public.t_id('e_p2'), 1)$$, 'P2 moves to the top');
select is(public.t_order('c1'), 'P2,Ogre,P1,Wolf,Goblin', 'order after the move');
select is(public.t_positions('c1'), array[1,2,3,4,5], 'positions stay dense and unique');
select is(public.t_state('c1'), 'Goblin|1', 'the current entry is unchanged by a move');
reset role;
update public.combat_entries set hidden = true where id = public.t_id('e_ogre');
set local role authenticated;
select public.t_as('gm');
select lives_ok($$select public.move_entry(public.t_id('e_ogre'), 5)$$, 'the hidden ogre moves last');
select is((select array_agg(position order by position) from public.combat_order where combat_id = public.t_id('c1')), array[1,2,3,4], 'visible positions stay dense');

-- ---- next_turn (order now P2,P1,Wolf,Goblin,Ogre)
select lives_ok($$select public.set_current_entry(public.t_id('e_p2'))$$, 'the GM sets P2 current');
select public.t_as('p1');
select throws_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_p2'))$$, 'P0001', 'not_allowed', 'a player cannot call next_turn');
select public.t_as('gm');
select lives_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_p2'))$$, 'next turn');
select is(public.t_state('c1'), 'P1|1', 'P2 -> P1, same round');
select lives_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_p1'));
  select public.next_turn(public.t_id('c1'), public.t_id('e_wolf'));
  select public.next_turn(public.t_id('c1'), public.t_id('e_gob'))$$, 'three more turns');
select is(public.t_state('c1'), 'Ogre|1', 'down to the last row, still round 1');
select lives_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_ogre'))$$, 'past the last row');
select is(public.t_state('c1'), 'P2|2', 'it wraps to the first row and the round increases');
select lives_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_gob'))$$, 'a stale next_turn');
select is(public.t_state('c1'), 'P2|2', 'a stale expected id changes nothing');
select throws_ok($$select public.next_turn(public.t_id('c2'), public.t_id('e_solo'))$$, 'P0001', 'not_member', 'another campaign''s GM is not a member here');

-- one entry: every next_turn is a new round; delay is a no-op; zero entries change nothing
select public.t_as('gm2');
select lives_ok($$select public.next_turn(public.t_id('c2'), public.t_id('e_solo')); select public.next_turn(public.t_id('c2'), public.t_id('e_solo'))$$, 'two turns with one entry');
select is(public.t_state('c2'), 'Solo|3', 'every turn of a one-row combat is a new round');
select lives_ok($$select public.delay_turn(public.t_id('c2'), public.t_id('e_solo'))$$, 'delay with one entry');
select is(public.t_state('c2'), 'Solo|3', 'delay with one entry is a no-op');
reset role;
delete from public.combat_entries where id = public.t_id('e_solo');
set local role authenticated;
select public.t_as('gm2');
select lives_ok($$select public.next_turn(public.t_id('c2'), public.t_id('e_solo'))$$, 'next_turn with no entries');
select is((select round from public.combats where id = public.t_id('c2')), 3, 'no entries: the combat is unchanged');

-- race: the holder's end_my_turn beats a stale GM next_turn
select public.t_as('gm');
select lives_ok($$select public.set_current_entry(public.t_id('e_p1'))$$, 'the GM gives P1 the turn');
select is(public.t_state('c1'), 'P1|2', 'set_current_entry does not change the round');
select public.t_as('p1');
select lives_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'P1 ends their turn');
select is(public.t_state('c1'), 'Wolf|2', 'the turn passed to the next row');
select public.t_as('gm');
select lives_ok($$select public.next_turn(public.t_id('c1'), public.t_id('e_p1'))$$, 'the GM taps next with a stale expected id');
select is(public.t_state('c1'), 'Wolf|2', 'the stale tap did nothing');

-- end_my_turn
select public.t_as('p2');
select throws_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'P0001', 'not_your_turn', 'a non-holder cannot end the turn');
select public.t_as('gm');
select throws_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'P0001', 'not_your_turn', 'the GM has no player row to end');
select public.t_as('p3');
select throws_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'P0001', 'not_your_turn', 'a member with no entry cannot end the turn');
select public.t_as('inv');
select throws_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'P0001', 'not_member', 'an invited member is not a member');
select public.t_as('gm');
select public.set_current_entry(public.t_id('e_p1'));
select public.t_as('p1');
select lives_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'the holder ends their turn');
select throws_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'P0001', 'not_your_turn', 'a second end_my_turn in a row is refused');
select public.t_as('gm');
select public.move_entry(public.t_id('e_p1'), 5);
select public.set_current_entry(public.t_id('e_p1'));
select public.t_as('p1');
select lives_ok($$select public.end_my_turn(public.t_id('c1'))$$, 'the last row ends their turn');
select is(public.t_state('c1'), 'P2|3', 'it wraps to the first row with a new round');

-- set_current_entry
select public.t_as('gm');
select lives_ok($$select public.set_current_entry(public.t_id('e_ogre'))$$, 'the GM gives the hidden ogre the turn');
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = public.t_id('c1')$$,
  $$values (null::uuid, true)$$, 'players see gm_turn and no id');
select throws_ok($$select public.set_current_entry(public.t_id('e_solo'))$$, 'P0001', 'invalid_target', 'the GM cannot target an entry that is not theirs');
select throws_ok($$select public.set_current_entry(public.t_id('rand'))$$, 'P0001', 'invalid_target', 'a random id gives the GM the same error');
select public.t_as('p1');
select throws_ok($$select public.set_current_entry(public.t_id('e_ogre'))$$, 'P0001', 'not_allowed', 'a player cannot set the turn (real hidden id)');
select throws_ok($$select public.set_current_entry(public.t_id('rand'))$$, 'P0001', 'not_allowed', 'a player gets the same error for a random id');
select public.t_as('inv');
select throws_ok($$select public.set_current_entry(public.t_id('e_ogre'))$$, 'P0001', 'not_allowed', 'an invited member gets the same error too');

-- delay_turn (order now P2,Wolf,Goblin,Ogre,P1; the ogre holds the turn)
select public.t_as('gm');
select public.set_current_entry(public.t_id('e_p2'));
select public.t_as('p1');
select throws_ok($$select public.delay_turn(public.t_id('c1'), public.t_id('e_p2'))$$, 'P0001', 'not_allowed', 'a player cannot delay');
select public.t_as('gm');
select lives_ok($$select public.delay_turn(public.t_id('c1'), public.t_id('e_p2'))$$, 'the GM delays P2');
select is(public.t_order('c1'), 'Wolf,P2,Goblin,Ogre,P1', 'the current row swapped with the next');
select is(public.t_state('c1'), 'Wolf|3', 'the former next now holds the turn');
select lives_ok($$select public.delay_turn(public.t_id('c1'), public.t_id('e_p2'))$$, 'a stale delay');
select is(public.t_order('c1') || '/' || public.t_state('c1'), 'Wolf,P2,Goblin,Ogre,P1/Wolf|3', 'a stale delay changes nothing');
select public.set_current_entry(public.t_id('e_p1'));
select lives_ok($$select public.delay_turn(public.t_id('c1'), public.t_id('e_p1'))$$, 'delaying the last row');
select is(public.t_order('c1') || '/' || public.t_state('c1'), 'Wolf,P2,Goblin,Ogre,P1/P1|3', 'the last row cannot be delayed past the end of the round');

-- an ended combat refuses everything, including stragglers
reset role;
update public.combats set status = 'ended' where id = public.t_id('c2');
insert into public.combat_entries (id, combat_id, campaign_id, kind, name, max_hp, hp, position)
  values (public.t_id('e_old'), public.t_id('c2'), public.t_id('campB'), 'enemy', 'Old', 1, 1, 1);
set local role authenticated;
select public.t_as('gm2');
select throws_ok($$select public.next_turn(public.t_id('c2'), public.t_id('e_old'))$$, 'P0001', 'no_active_combat', 'next_turn on an ended combat');
select throws_ok($$select public.delay_turn(public.t_id('c2'), public.t_id('e_old'))$$, 'P0001', 'no_active_combat', 'delay_turn on an ended combat');
select throws_ok($$select public.set_initiative(public.t_id('e_old'), 5)$$, 'P0001', 'no_active_combat', 'set_initiative on an ended combat');
select throws_ok($$select public.move_entry(public.t_id('e_old'), 1)$$, 'P0001', 'no_active_combat', 'move_entry on an ended combat');
select throws_ok($$select public.set_current_entry(public.t_id('e_old'))$$, 'P0001', 'no_active_combat', 'set_current_entry on an ended combat');
select public.t_as('p4');
select throws_ok($$select public.end_my_turn(public.t_id('c2'))$$, 'P0001', 'no_active_combat', 'end_my_turn on an ended combat');
reset role;

-- internal helpers are not callable by authenticated
select ok(not has_function_privilege('authenticated', 'public.combat_insert_position(uuid, int, uuid)', 'execute'), 'combat_insert_position is internal');
select ok(not has_function_privilege('authenticated', 'public.combat_place_entry(uuid, uuid, int)', 'execute'), 'combat_place_entry is internal');
select ok(not has_function_privilege('authenticated', 'public.combat_advance(uuid)', 'execute'), 'combat_advance is internal');
select ok(not has_function_privilege('authenticated', 'public.combat_lock_for_entry(uuid)', 'execute'), 'combat_lock_for_entry is internal');

set constraints all immediate;
select * from finish();
rollback;
