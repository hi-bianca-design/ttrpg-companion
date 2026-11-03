-- refresh_combat / combat_next_entry: party sync, the player-safe projection, turn projection,
-- and rev bumps only when a player-visible thing changed. Internal functions, called as superuser.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- Fixtures
insert into auth.users (id, email, raw_user_meta_data) values
  ('a8000000-0000-0000-0000-00000000000a', 'gm@proj.local', '{"username":"proj_gm"}'),
  ('b8000000-0000-0000-0000-00000000000b', 'p1@proj.local', '{"username":"proj_p1"}'),
  ('b8000000-0000-0000-0000-00000000000c', 'p2@proj.local', '{"username":"proj_p2"}'),
  ('b8000000-0000-0000-0000-00000000000d', 'p3@proj.local', '{"username":"proj_p3"}'),
  ('b8000000-0000-0000-0000-00000000000e', 'p4@proj.local', '{"username":"proj_p4"}'),
  ('a8000000-0000-0000-0000-0000000000a2', 'gm2@proj.local', '{"username":"proj_gm2"}');
insert into public.characters (id, owner_id, system_id, name) values
  ('f8000000-0000-0000-0000-000000000001', 'b8000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'Proj Hero 1'),
  ('f8000000-0000-0000-0000-000000000002', 'b8000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'Proj Hero 2'),
  ('f8000000-0000-0000-0000-000000000003', 'b8000000-0000-0000-0000-00000000000d', 'dnd5e-2024', 'Proj Hero 3'),
  ('f8000000-0000-0000-0000-000000000004', 'b8000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'Proj Hero 4');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('e8000000-0000-0000-0000-00000000000e', 'dnd5e-2024', 'a8000000-0000-0000-0000-00000000000a', 'Proj Game', 'PRJAAA'),
  ('e8000000-0000-0000-0000-0000000000e2', 'dnd5e-2024', 'a8000000-0000-0000-0000-0000000000a2', 'Proj Game 2', 'PRJBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  ('e8000000-0000-0000-0000-00000000000e', 'a8000000-0000-0000-0000-00000000000a', 'gm', null, 'active'),
  ('e8000000-0000-0000-0000-00000000000e', 'b8000000-0000-0000-0000-00000000000b', 'player', 'f8000000-0000-0000-0000-000000000001', 'active'),
  ('e8000000-0000-0000-0000-00000000000e', 'b8000000-0000-0000-0000-00000000000c', 'player', 'f8000000-0000-0000-0000-000000000002', 'active'),
  ('e8000000-0000-0000-0000-0000000000e2', 'a8000000-0000-0000-0000-0000000000a2', 'gm', null, 'active'),
  ('e8000000-0000-0000-0000-0000000000e2', 'b8000000-0000-0000-0000-00000000000e', 'player', 'f8000000-0000-0000-0000-000000000004', 'active');
insert into public.sessions (id, campaign_id, opened_by, in_combat) values
  ('51800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'b8000000-0000-0000-0000-00000000000b', true),
  ('51800000-0000-0000-0000-000000000002', 'e8000000-0000-0000-0000-0000000000e2', 'b8000000-0000-0000-0000-00000000000e', true);
insert into public.combats (id, session_id, campaign_id, status) values
  ('c0800000-0000-0000-0000-000000000001', '51800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'rolling'),
  ('c0800000-0000-0000-0000-000000000002', '51800000-0000-0000-0000-000000000002', 'e8000000-0000-0000-0000-0000000000e2', 'active');
-- P1 (18), Hidden Ogre (15), Goblin (12), P2 (9) at positions 1..4; P1 holds the turn.
insert into public.combat_entries (id, combat_id, campaign_id, kind, user_id, character_id, name, max_hp, hp, ac, notes, hidden, initiative, position, is_current) values
  ('e1800000-0000-0000-0000-000000000001', 'c0800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'player', 'b8000000-0000-0000-0000-00000000000b', 'f8000000-0000-0000-0000-000000000001', null, null, null, null, null, false, 18, 1, true),
  ('e1800000-0000-0000-0000-000000000002', 'c0800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'enemy', null, null, 'Hidden Ogre', 59, 59, 17, 'has the key', true, 15, 2, false),
  ('e1800000-0000-0000-0000-000000000003', 'c0800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'enemy', null, null, 'Goblin', 7, 7, 13, null, false, 12, 3, false),
  ('e1800000-0000-0000-0000-000000000004', 'c0800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'player', 'b8000000-0000-0000-0000-00000000000c', 'f8000000-0000-0000-0000-000000000002', null, null, null, null, null, false, 9, 4, false),
  ('e1800000-0000-0000-0000-000000000005', 'c0800000-0000-0000-0000-000000000002', 'e8000000-0000-0000-0000-0000000000e2', 'player', 'b8000000-0000-0000-0000-00000000000e', 'f8000000-0000-0000-0000-000000000004', null, null, null, null, null, false, 10, 1, true);

-- rolling: nothing is projected, even with entries and a current flag
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.combat_order where combat_id = 'c0800000-0000-0000-0000-000000000001'), 0, 'rolling: the order projection stays empty');
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000001'$$,
  $$values (null::uuid, false)$$, 'rolling: no turn projection');

-- active: dense visible order without the ogre
update public.combats set status = 'active' where id = 'c0800000-0000-0000-0000-000000000001';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select results_eq($$select id, position from public.combat_order where combat_id = 'c0800000-0000-0000-0000-000000000001' order by position$$,
  $$values ('e1800000-0000-0000-0000-000000000001'::uuid, 1), ('e1800000-0000-0000-0000-000000000003'::uuid, 2), ('e1800000-0000-0000-0000-000000000004'::uuid, 3)$$,
  'active: order rows are P1, Goblin, P2 at dense positions 1..3');
select is((select count(*)::int from public.combat_order o where o.combat_id = 'c0800000-0000-0000-0000-000000000001'
  and (o.id = 'e1800000-0000-0000-0000-000000000002' or to_jsonb(o)::text ilike '%Ogre%')), 0, 'the ogre''s id and name are in no order row');
select is((select count(*)::int from public.combats c where c.id = 'c0800000-0000-0000-0000-000000000001'
  and (to_jsonb(c)::text ilike '%e1800000-0000-0000-0000-000000000002%' or to_jsonb(c)::text ilike '%Ogre%')), 0, 'the ogre is not in the combats row');

-- turn projection
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000001'$$,
  $$values ('e1800000-0000-0000-0000-000000000001'::uuid, false)$$, 'current = P1 projects its id');
update public.combat_entries set is_current = false where combat_id = 'c0800000-0000-0000-0000-000000000001';
update public.combat_entries set is_current = true where id = 'e1800000-0000-0000-0000-000000000002';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000001'$$,
  $$values (null::uuid, true)$$, 'current = hidden ogre projects gm_turn, no id');
update public.combat_entries set is_current = false where combat_id = 'c0800000-0000-0000-0000-000000000001';
update public.combat_entries set is_current = true where id = 'e1800000-0000-0000-0000-000000000003';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000001'$$,
  $$values ('e1800000-0000-0000-0000-000000000003'::uuid, false)$$, 'current = visible goblin projects its id');

-- reveal / hide while the ogre holds the turn
update public.combat_entries set is_current = false where combat_id = 'c0800000-0000-0000-0000-000000000001';
update public.combat_entries set is_current = true where id = 'e1800000-0000-0000-0000-000000000002';
update public.combat_entries set hidden = false where id = 'e1800000-0000-0000-0000-000000000002';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.combat_order where combat_id = 'c0800000-0000-0000-0000-000000000001'), 4, 'reveal: four order rows');
select is((select position from public.combat_order where id = 'e1800000-0000-0000-0000-000000000002'), 2, 'reveal: the ogre appears at its place');
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000001'$$,
  $$values ('e1800000-0000-0000-0000-000000000002'::uuid, false)$$, 'reveal: the pointer moves from gm_turn to its row');
update public.combat_entries set hidden = true where id = 'e1800000-0000-0000-0000-000000000002';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.combat_order where id = 'e1800000-0000-0000-0000-000000000002'), 0, 'hide: its row is deleted again');
select is((select gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000001'), true, 'hide: gm_turn is true again');

-- pointer stability: an entry inserted at position 2 does not move the turn
update public.combat_entries set position = position + 1 where combat_id = 'c0800000-0000-0000-0000-000000000001' and position >= 2;
insert into public.combat_entries (id, combat_id, campaign_id, kind, name, max_hp, hp, initiative, position)
  values ('e1800000-0000-0000-0000-0000000000f1', 'c0800000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-00000000000e', 'enemy', 'Wolf', 11, 11, 16, 2);
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select id from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000001' and is_current), 'e1800000-0000-0000-0000-000000000002'::uuid, 'inserting a row leaves the same entry current');
delete from public.combat_entries where id = 'e1800000-0000-0000-0000-0000000000f1';
update public.combat_entries set position = position - 1 where combat_id = 'c0800000-0000-0000-0000-000000000001' and position > 2;
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');

-- rev: only player-visible changes bump it. ctid changes on every row update, so it proves "no write".
create temp table snap as select rev, updated_at, ctid::text as tid from public.combats where id = 'c0800000-0000-0000-0000-000000000001';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.combats c, snap s where c.id = 'c0800000-0000-0000-0000-000000000001'
  and c.rev = s.rev and c.updated_at = s.updated_at and c.ctid::text = s.tid), 1, 'refresh with nothing changed writes nothing');
update public.combat_entries set hp = 1, notes = 'changed', ac = 5 where id = 'e1800000-0000-0000-0000-000000000002';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.combats c, snap s where c.id = 'c0800000-0000-0000-0000-000000000001'
  and c.rev = s.rev and c.updated_at = s.updated_at and c.ctid::text = s.tid), 1, 'hidden enemy hp, notes and ac changes write nothing');
update public.combat_entries set name = 'Goblin Boss' where id = 'e1800000-0000-0000-0000-000000000003';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select c.rev - s.rev from public.combats c, snap s where c.id = 'c0800000-0000-0000-0000-000000000001'), 1, 'renaming a visible enemy adds exactly one to rev');
update public.combat_entries set name = 'Goblin' where id = 'e1800000-0000-0000-0000-000000000003';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');

-- party sync: a member with a character and no entry is appended last, no initiative
insert into public.campaign_members (campaign_id, user_id, role, character_id, status)
  values ('e8000000-0000-0000-0000-00000000000e', 'b8000000-0000-0000-0000-00000000000d', 'player', 'f8000000-0000-0000-0000-000000000003', 'active');
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select results_eq($$select position, initiative from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000001' and user_id = 'b8000000-0000-0000-0000-00000000000d'$$,
  $$values (5, null::int)$$, 'a new member is appended last with a null initiative');
select is((select count(*)::int from public.combat_order where combat_id = 'c0800000-0000-0000-0000-000000000001' and user_id = 'b8000000-0000-0000-0000-00000000000d'), 1, 'the new member is in the projection');
update public.campaign_members set status = 'invited' where user_id = 'b8000000-0000-0000-0000-00000000000d';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000001' and user_id = 'b8000000-0000-0000-0000-00000000000d'), 0, 'an invited member''s entry is removed');

-- the holder leaves: the turn passes to the next row
update public.combat_entries set is_current = false where combat_id = 'c0800000-0000-0000-0000-000000000001';
update public.combat_entries set is_current = true where id = 'e1800000-0000-0000-0000-000000000001';
update public.campaign_members set status = 'invited' where user_id = 'b8000000-0000-0000-0000-00000000000b';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select id from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000001' and is_current), 'e1800000-0000-0000-0000-000000000002'::uuid, 'the leaving holder passes the turn to the next row');
select is((select round from public.combats where id = 'c0800000-0000-0000-0000-000000000001'), 1, 'no wrap, no new round');
select is((select array_agg(position order by position) from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000001'), array[1,2,3], 'positions are dense after removal');

-- the last-position holder leaves: wrap to position 1 and a new round
update public.combat_entries set is_current = false where combat_id = 'c0800000-0000-0000-0000-000000000001';
update public.combat_entries set is_current = true where id = 'e1800000-0000-0000-0000-000000000004';
update public.campaign_members set status = 'invited' where user_id = 'b8000000-0000-0000-0000-00000000000c';
select public.refresh_combat('c0800000-0000-0000-0000-000000000001');
select is((select id from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000001' and is_current), 'e1800000-0000-0000-0000-000000000002'::uuid, 'the last-position holder leaving wraps to position 1');
select is((select round from public.combats where id = 'c0800000-0000-0000-0000-000000000001'), 2, 'the wrap adds a round');

-- the only entry leaves: no current, no pointer
update public.campaign_members set status = 'invited' where user_id = 'b8000000-0000-0000-0000-00000000000e';
select public.refresh_combat('c0800000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000002'), 0, 'the only entry is removed');
select results_eq($$select turn_entry_id, gm_turn from public.combats where id = 'c0800000-0000-0000-0000-000000000002'$$,
  $$values (null::uuid, false)$$, 'no entries means no turn pointer');

-- combat_next_entry
select results_eq($$select entry_id, wrapped from public.combat_next_entry('c0800000-0000-0000-0000-000000000001', 'e1800000-0000-0000-0000-000000000002')$$,
  $$values ('e1800000-0000-0000-0000-000000000003'::uuid, false)$$, 'next entry in the middle');
insert into public.combat_entries (id, combat_id, campaign_id, kind, name, max_hp, hp, position)
  values ('e1800000-0000-0000-0000-0000000000f2', 'c0800000-0000-0000-0000-000000000002', 'e8000000-0000-0000-0000-0000000000e2', 'enemy', 'Solo', 3, 3, 1);
select results_eq($$select entry_id, wrapped from public.combat_next_entry('c0800000-0000-0000-0000-000000000001', 'e1800000-0000-0000-0000-000000000003')$$,
  $$values ('e1800000-0000-0000-0000-000000000002'::uuid, true)$$, 'from the last position it wraps to position 1');
select results_eq($$select entry_id, wrapped from public.combat_next_entry('c0800000-0000-0000-0000-000000000002', 'e1800000-0000-0000-0000-0000000000f2')$$,
  $$values ('e1800000-0000-0000-0000-0000000000f2'::uuid, true)$$, 'with one entry it returns that entry, wrapped');
delete from public.combat_entries where combat_id = 'c0800000-0000-0000-0000-000000000002';
select is_empty($$select * from public.combat_next_entry('c0800000-0000-0000-0000-000000000002', null)$$, 'with no entries it returns no row');

-- privileges
select ok(not has_function_privilege('authenticated', 'public.refresh_combat(uuid)', 'execute'), 'refresh_combat is not executable by authenticated');
select ok(not has_function_privilege('authenticated', 'public.combat_next_entry(uuid, uuid)', 'execute'), 'combat_next_entry is not executable by authenticated');
select ok(not has_function_privilege('authenticated', 'public.combat_renumber(uuid)', 'execute'), 'combat_renumber is not executable by authenticated');
select ok(not has_function_privilege('authenticated', 'public.combat_delete_entries(uuid, uuid[])', 'execute'), 'combat_delete_entries is not executable by authenticated');

set constraints all immediate;
select * from finish();
rollback;
