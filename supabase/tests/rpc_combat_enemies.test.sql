-- Enemy RPCs: add_enemies (xN), update_enemy, remove_entry, apply_enemy_hp (damage/heal/temp,
-- bulk), undo_enemy_hp. Ids come from a temp table via t_id('name').
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(129);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('inv'), ('out'), ('gm2'), ('s1'), ('s2'), ('c1'), ('c2'),
  ('campA'), ('campB'), ('ch1'), ('e_p1'), ('rand');
grant all on k to authenticated;
create temp table snap (rev int, updated_at timestamptz, tid text);

create function public.t_id(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from pg_temp.k where name = p_name
$$;
create function public.t_as(p_name text) returns void language sql security definer set search_path = '' as $$
  select set_config('request.jwt.claims', case when p_name is null then '{}'
    else json_build_object('sub', (select id from pg_temp.k where name = p_name), 'role', 'authenticated')::text end, true)
$$;
create function public.t_save(p_name text, p_id uuid) returns uuid language sql security definer set search_path = '' as $$
  insert into pg_temp.k (name, id) values (p_name, p_id) returning id
$$;
-- entry id of an enemy by name within a combat ('c1'/'c2')
create function public.t_eid(p_combat text, p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combat_entries where combat_id = (select id from pg_temp.k where name = p_combat) and name = p_name
$$;
create function public.t_ids(p_combat text, p_prefix text) returns uuid[] language sql security definer set search_path = '' as $$
  select array_agg(id order by name) from public.combat_entries
   where combat_id = (select id from pg_temp.k where name = p_combat) and name like p_prefix || ' %'
$$;
-- 'hp/max+temp'
create function public.t_hp(p_combat text, p_name text) returns text language sql security definer set search_path = '' as $$
  select hp || '/' || max_hp || '+' || temp_hp from public.combat_entries
   where combat_id = (select id from pg_temp.k where name = p_combat) and name = p_name
$$;
create function public.t_order(p_combat text) returns text language sql security definer set search_path = '' as $$
  select string_agg(coalesce(e.name, ch.name), ',' order by e.position)
    from public.combat_entries e left join public.characters ch on ch.id = e.character_id
   where e.combat_id = (select id from pg_temp.k where name = p_combat)
$$;
create function public.t_vis(p_combat text) returns text language sql security definer set search_path = '' as $$
  select string_agg(coalesce(o.name, ch.name), ',' order by o.position)
    from public.combat_order o left join public.characters ch on ch.id = o.character_id
   where o.combat_id = (select id from pg_temp.k where name = p_combat)
$$;
create function public.t_state(p_combat text) returns text language sql security definer set search_path = '' as $$
  select coalesce((select coalesce(e.name, ch.name) from public.combat_entries e left join public.characters ch on ch.id = e.character_id
                    where e.combat_id = c.id and e.is_current), '-') || '|' || c.round
    from public.combats c where c.id = (select id from pg_temp.k where name = p_combat)
$$;
create function public.t_positions(p_combat text) returns int[] language sql security definer set search_path = '' as $$
  select coalesce(array_agg(position order by position), '{}') from public.combat_entries
   where combat_id = (select id from pg_temp.k where name = p_combat)
$$;
create function public.t_snap() returns void language sql security definer set search_path = '' as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select rev, updated_at, ctid::text from public.combats where id = (select id from pg_temp.k where name = 'c1')
$$;
-- true when the c1 combats row was not written at all since t_snap() (ctid changes on any update)
create function public.t_same() returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from public.combats c, pg_temp.snap s where c.id = (select id from pg_temp.k where name = 'c1')
    and c.rev = s.rev and c.updated_at = s.updated_at and c.ctid::text = s.tid)
$$;
create function public.t_rev_delta() returns int language sql security definer set search_path = '' as $$
  select c.rev - s.rev from public.combats c, pg_temp.snap s where c.id = (select id from pg_temp.k where name = 'c1')
$$;
grant execute on function public.t_id(text), public.t_as(text), public.t_save(text, uuid), public.t_eid(text, text),
  public.t_ids(text, text), public.t_hp(text, text), public.t_order(text), public.t_vis(text), public.t_state(text),
  public.t_positions(text), public.t_snap(), public.t_same(), public.t_rev_delta() to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@enemy.local', json_build_object('username', 'enemy_' || name)::jsonb
  from k where name in ('gm', 'p1', 'inv', 'out', 'gm2');
insert into public.characters (id, owner_id, system_id, name) values (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'P1');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Enemy A', 'ENMAAA'),
  (public.t_id('campB'), 'dnd5e-2024', public.t_id('gm2'), 'Enemy B', 'ENMBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active'),
  (public.t_id('campA'), public.t_id('inv'), 'player', null, 'invited'),
  (public.t_id('campB'), public.t_id('gm2'), 'gm', null, 'active');
insert into public.sessions (id, campaign_id, opened_by, in_combat) values
  (public.t_id('s1'), public.t_id('campA'), public.t_id('p1'), true),
  (public.t_id('s2'), public.t_id('campB'), public.t_id('gm2'), true);
insert into public.combats (id, session_id, campaign_id, status) values
  (public.t_id('c1'), public.t_id('s1'), public.t_id('campA'), 'active'),
  (public.t_id('c2'), public.t_id('s2'), public.t_id('campB'), 'active');
-- c1: P1 (18) holds the turn. c2: four enemies A..D, B holds the turn.
insert into public.combat_entries (id, combat_id, campaign_id, kind, user_id, character_id, initiative, position, is_current) values
  (public.t_id('e_p1'), public.t_id('c1'), public.t_id('campA'), 'player', public.t_id('p1'), public.t_id('ch1'), 18, 1, true);
insert into public.combat_entries (combat_id, campaign_id, kind, name, max_hp, hp, position, is_current)
select public.t_id('c2'), public.t_id('campB'), 'enemy', n, 5, 5, i, n = 'B'
  from (values ('A', 1), ('B', 2), ('C', 3), ('D', 4)) v (n, i);
select public.refresh_combat(public.t_id('c1'));
select public.refresh_combat(public.t_id('c2'));

set local role authenticated;

-- ---- add_enemies
select public.t_as('p1');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'Goblin', 3, 7, 15, 13, 'n', false)$$, 'P0001', 'not_allowed', 'a player cannot add enemies');
select public.t_as('inv');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'Goblin', 3, 7, 15, 13, 'n', false)$$, 'P0001', 'not_member', 'an invited member is not a member');
select public.t_as('gm');
select is(cardinality(public.add_enemies(public.t_id('c1'), 'Goblin', 3, 7, 15, 13, 'n', false)), 3, 'Goblin x3 returns three ids');
select is((select string_agg(name, ',' order by name) from public.combat_entries where combat_id = public.t_id('c1') and name like 'Goblin%'), 'Goblin 1,Goblin 2,Goblin 3', 'names are numbered 1..3');
select is((select count(distinct group_id)::int from public.combat_entries where combat_id = public.t_id('c1') and name like 'Goblin%' and group_id is not null), 1, 'the copies share one group');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_id('c1') and name like 'Goblin%' and hp = 7 and max_hp = 7 and initiative = 15 and group_id is not null), 3, 'hp 7/7 and initiative 15 each');
select is(public.t_order('c1'), 'P1,Goblin 1,Goblin 2,Goblin 3', 'they sit after the higher initiative, in order');
select is(cardinality(public.add_enemies(public.t_id('c1'), 'Goblin', 2, 7, 15, null, null, false)), 2, 'a second Goblin x2');
select is((select string_agg(name, ',' order by name) from public.combat_entries where combat_id = public.t_id('c1') and name like 'Goblin%'), 'Goblin 1,Goblin 2,Goblin 3,Goblin 4,Goblin 5', 'numbering continues after the highest');
select is(public.t_order('c1'), 'P1,Goblin 1,Goblin 2,Goblin 3,Goblin 4,Goblin 5', 'the new copies follow the old ones');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Wolf', 1, 11, null, null, null, false)$$, 'a single Wolf with no initiative');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_id('c1') and name = 'Wolf' and group_id is null), 1, 'count 1 keeps the plain name and no group');
select is(public.t_order('c1'), 'P1,Goblin 1,Goblin 2,Goblin 3,Goblin 4,Goblin 5,Wolf', 'no initiative sits at the end');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Ogre', 1, 59, 20, 17, 'has the key', true)$$, 'a hidden Ogre');
select is(public.t_vis('c1'), 'P1,Goblin 1,Goblin 2,Goblin 3,Goblin 4,Goblin 5,Wolf', 'the hidden ogre has no order row');
select is(public.t_order('c1'), 'Ogre,P1,Goblin 1,Goblin 2,Goblin 3,Goblin 4,Goblin 5,Wolf', 'but it is in the truth, first by initiative');
select is(public.t_state('c1'), 'P1|1', 'adding while P1 holds the turn leaves it there');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 0, 5, 1, 1, null, false)$$, 'P0001', 'invalid_enemy', 'count 0');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 21, 5, 1, 1, null, false)$$, 'P0001', 'invalid_enemy', 'count 21');
select throws_ok($$select public.add_enemies(public.t_id('c1'), '   ', 1, 5, 1, 1, null, false)$$, 'P0001', 'invalid_enemy', 'blank name');
select throws_ok($$select public.add_enemies(public.t_id('c1'), repeat('x', 61), 1, 5, 1, 1, null, false)$$, 'P0001', 'invalid_enemy', '61-character name');
select throws_ok($$select public.add_enemies(public.t_id('c1'), repeat('x', 59), 2, 5, 1, 1, null, false)$$, 'P0001', 'invalid_enemy', 'a numbered name that would pass 60 characters');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 0, 1, 1, null, false)$$, 'P0001', 'invalid_enemy', 'max hp 0');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 1, 41, null, false)$$, 'P0001', 'invalid_enemy', 'ac 41');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 1, 1, repeat('n', 501), false)$$, 'P0001', 'invalid_enemy', 'notes over 500 characters');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 100, 1, null, false)$$, 'P0001', 'invalid_initiative', 'initiative 100');

-- ---- apply_enemy_hp acceptance numbers (T is a 30 hp enemy)
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'T', 1, 30, null, null, null, false)$$, 'a 30 hp enemy');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'T'), '{"hp": 22}')$$, 'typed correction to 22');
select is(public.t_hp('c1', 'T'), '22/30+0', 'at 22/30');
select lives_ok($$select public.t_save('b_a', public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', 7, gen_random_uuid()))$$, 'damage 7');
select is(public.t_hp('c1', 'T'), '15/30+0', '22/30 damage 7 -> 15/30');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', 20, gen_random_uuid())$$, 'damage 20');
select is(public.t_hp('c1', 'T'), '0/30+0', '15/30 damage 20 -> 0/30');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'heal', 50, gen_random_uuid())$$, 'heal 50');
select is(public.t_hp('c1', 'T'), '30/30+0', 'heal is capped at max');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'T'), '{"hp": 12}'); select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'temp', 5, gen_random_uuid()); select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', 7, gen_random_uuid())$$, 'temp 5 then damage 7 at 12 hp');
select is(public.t_hp('c1', 'T'), '10/30+0', 'temp absorbs first: temp 0, hp 10');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'temp', 4, gen_random_uuid()); select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'heal', 3, gen_random_uuid())$$, 'temp 4 then heal 3');
select is(public.t_hp('c1', 'T'), '13/30+4', 'heal leaves temp unchanged');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'temp', 8, gen_random_uuid())$$, 'temp 8 over 4');
select is(public.t_hp('c1', 'T'), '13/30+8', 'temp keeps the larger (8)');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'temp', 3, gen_random_uuid())$$, 'temp 3 over 8');
select is(public.t_hp('c1', 'T'), '13/30+8', 'temp keeps the larger (still 8)');

-- bulk
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Gob', 4, 7, null, null, null, false)$$, 'four Gobs at 7/7');
select lives_ok($$select public.t_save('b_bulk', public.apply_enemy_hp(public.t_id('c1'), public.t_ids('c1', 'Gob'), 'damage', 5, gen_random_uuid()))$$, 'bulk damage 5');
select is((select string_agg(public.t_hp('c1', 'Gob ' || i), ',' order by i) from generate_series(1, 4) i), '2/7+0,2/7+0,2/7+0,2/7+0', 'all four are at 2/7');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Gob', 2, 7, null, null, null, false)$$, 'two more Gobs arrive later');
select is(public.t_hp('c1', 'Gob 5') || ',' || public.t_hp('c1', 'Gob 6'), '7/7+0,7/7+0', 'the newcomers are untouched');

-- invalid input
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', 0, gen_random_uuid())$$, 'P0001', 'invalid_amount', 'amount 0');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', -1, gen_random_uuid())$$, 'P0001', 'invalid_amount', 'amount -1');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'crit', 5, gen_random_uuid())$$, 'P0001', 'invalid_mode', 'mode crit');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T'), public.t_id('e_p1')], 'damage', 5, gen_random_uuid())$$, 'P0001', 'invalid_target', 'a player entry in the list');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T'), public.t_eid('c2', 'A')], 'damage', 5, gen_random_uuid())$$, 'P0001', 'invalid_target', 'another combat''s entry in the list');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), '{}'::uuid[], 'damage', 5, gen_random_uuid())$$, 'P0001', 'invalid_target', 'an empty list');
select is(public.t_hp('c1', 'T'), '13/30+8', 'nothing was applied by the refused calls');
select public.t_as('p1');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', 5, gen_random_uuid())$$, 'P0001', 'not_allowed', 'a player cannot apply damage');
select public.t_as('gm');
select is(pg_typeof(public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'heal', 1, gen_random_uuid()))::text, 'uuid', 'it returns a batch uuid');

-- hit points never touch the combats row
select public.t_snap();
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Ogre')], 'damage', 10, gen_random_uuid()); select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Goblin 1')], 'damage', 3, gen_random_uuid())$$, 'damage a hidden and a visible enemy');
select ok(public.t_same(), 'the combats row was not written (rev, updated_at, ctid identical)');

-- ---- undo
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Imp', 4, 7, null, null, null, false)$$, 'four Imps');
select lives_ok($$select public.t_save('b_imp', public.apply_enemy_hp(public.t_id('c1'), public.t_ids('c1', 'Imp'), 'damage', 5, gen_random_uuid()))$$, 'bulk damage');
select public.t_as('p1');
select throws_ok($$select public.undo_enemy_hp(public.t_id('c1'), public.t_id('b_imp'))$$, 'P0001', 'not_allowed', 'a player cannot undo');
select public.t_as('gm');
select is(public.undo_enemy_hp(public.t_id('c1'), public.t_id('b_imp')), 4, 'a bulk undo restores all four');
select is((select string_agg(public.t_hp('c1', 'Imp ' || i), ',' order by i) from generate_series(1, 4) i), '7/7+0,7/7+0,7/7+0,7/7+0', 'all Imps are back at 7/7');
select is(public.undo_enemy_hp(public.t_id('c1'), public.t_id('b_imp')), 0, 'undoing the same batch again restores nothing');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'temp', 9, gen_random_uuid())$$, 'T gets temp 9');
select lives_ok($$select public.t_save('b_t', public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'T')], 'damage', 10, gen_random_uuid()))$$, 'and takes 10');
select is(public.t_hp('c1', 'T'), '13/30+0', 'temp 9 absorbed, 1 from hp');
select is(public.undo_enemy_hp(public.t_id('c1'), public.t_id('b_t')), 1, 'undo restores hp and temp');
select is(public.t_hp('c1', 'T'), '14/30+9', 'back to 14/30 with temp 9');
-- a stale undo: Gob 1 gets a newer batch
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Gob 1')], 'damage', 1, gen_random_uuid())$$, 'Gob 1 takes a newer hit');
select is(public.undo_enemy_hp(public.t_id('c1'), public.t_id('b_bulk')), 3, 'undoing the older bulk batch restores only the three untouched Gobs');
select is((select string_agg(public.t_hp('c1', 'Gob ' || i), ',' order by i) from generate_series(1, 4) i), '1/7+0,7/7+0,7/7+0,7/7+0', 'Gob 1 keeps the newer state');

-- ---- update_enemy
select public.t_snap();
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin 1'), '{"name": "Goblin Boss"}')$$, 'rename a visible enemy');
select is(public.t_rev_delta(), 1, 'a visible rename adds exactly one to rev');
select ok(exists (select 1 from public.combat_order where combat_id = public.t_id('c1') and name = 'Goblin Boss'), 'and the order row carries the new name');
select public.t_snap();
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin Boss'), '{"notes": "limping", "ac": 9, "hp": 4}')$$, 'change notes, ac and hp');
select ok(public.t_same(), 'notes, ac and hp changes do not write the combats row');
select throws_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin Boss'), '{"initiative": 3}')$$, 'P0001', 'invalid_patch', 'an unknown key');
select throws_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin Boss'), '{"name": 5}')$$, 'P0001', 'invalid_patch', 'a wrongly typed value');
select throws_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin Boss'), '{"name": " "}')$$, 'P0001', 'invalid_enemy', 'a blank name');
select throws_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin Boss'), '{"max_hp": 0}')$$, 'P0001', 'invalid_enemy', 'max hp 0');
select throws_ok($$select public.update_enemy(public.t_id('e_p1'), '{"name": "x"}')$$, 'P0001', 'invalid_target', 'a player entry');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin 2'), '{"max_hp": 5}')$$, 'lower max hp on a 7/7 enemy');
select is(public.t_hp('c1', 'Goblin 2'), '5/5+0', 'hp is clamped to the new max');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin 2'), '{"hp": 99}')$$, 'hp 99');
select is(public.t_hp('c1', 'Goblin 2'), '5/5+0', 'hp is clamped to max');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Goblin 2'), '{"hp": -3}')$$, 'hp -3');
select is(public.t_hp('c1', 'Goblin 2'), '0/5+0', 'hp is clamped to 0');
select ok(exists (select 1 from public.combat_order where combat_id = public.t_id('c1') and name = 'Goblin 2'), 'an enemy at 0 hp stays in the order');
-- hidden toggles
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Ogre'), '{"hidden": false}')$$, 'reveal the ogre');
select ok(public.t_vis('c1') like 'Ogre,P1,Goblin Boss,%', 'it appears at its place, first by initiative');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Ogre'), '{"hidden": true}')$$, 'hide it again');
select ok(public.t_vis('c1') like 'P1,Goblin Boss,%' and public.t_vis('c1') not like '%Ogre%', 'its row is gone');
select lives_ok($$select public.set_current_entry(public.t_eid('c1', 'Ogre'))$$, 'the hidden ogre takes the turn');
select results_eq($$select turn_entry_id = public.t_id('e_p1') from public.combats where id = public.t_id('c1')$$, $$values (true)$$, 'the pointer stays on the last visible holder (P1)');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Ogre'), '{"hidden": false}')$$, 'reveal the turn holder');
select results_eq($$select turn_entry_id = public.t_eid('c1', 'Ogre') from public.combats where id = public.t_id('c1')$$, $$values (true)$$, 'the pointer moves onto its row');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Ogre'), '{"hidden": true}')$$, 'hide the turn holder');
select results_eq($$select turn_entry_id is null from public.combats where id = public.t_id('c1')$$, $$values (true)$$, 'and, with no visible row before it, the pointer clears rather than naming the hidden id');

-- ---- hidden xN copies never show through the numbering a player sees (I1)
select public.t_as('gm');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Fiend', 3, 5, null, null, null, true)$$, 'three hidden Fiends');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Fiend', 2, 5, null, null, null, false)$$, 'then two visible Fiends');
select is((select string_agg(name, ',' order by name) from public.combat_entries where combat_id = public.t_id('c1') and name like 'Fiend%'), 'Fiend 1,Fiend 2,Fiend 3,Fiend 4,Fiend 5', 'the GM keeps the real, unique names');
select is((select string_agg(name, ',' order by position) from public.combat_order where combat_id = public.t_id('c1') and name like 'Fiend%'), 'Fiend 1,Fiend 2', 'players see Fiend 1 and Fiend 2: the hidden count is not inferable');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Fiend 2'), '{"hidden": false}')$$, 'reveal a hidden Fiend');
select is((select string_agg(name, ',' order by position) from public.combat_order where combat_id = public.t_id('c1') and name like 'Fiend%'), 'Fiend 1,Fiend 2,Fiend 3', 'the revealed copy takes its place in the dense numbering');
select lives_ok($$select public.update_enemy(public.t_eid('c1', 'Fiend 2'), '{"hidden": true}')$$, 'hide it again');
select is((select string_agg(name, ',' order by position) from public.combat_order where combat_id = public.t_id('c1') and name like 'Fiend%'), 'Fiend 1,Fiend 2', 'and the numbering closes up again');

-- ---- apply_enemy_hp is idempotent per client batch id (I3)
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Idem', 1, 20, null, null, null, false)$$, 'a 20 hp enemy');
select lives_ok($$select public.t_save('b_idem', gen_random_uuid())$$, 'a client batch id');
select is(public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Idem')], 'damage', 5, public.t_id('b_idem')), public.t_id('b_idem'), 'the call returns the client batch id');
select is(public.t_hp('c1', 'Idem'), '15/20+0', 'damage applied once');
select is(public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Idem')], 'damage', 5, public.t_id('b_idem')), public.t_id('b_idem'), 'a repeat returns the same batch');
select is(public.t_hp('c1', 'Idem'), '15/20+0', 'a repeat with the same batch id changes nothing');
select is(public.undo_enemy_hp(public.t_id('c1'), public.t_id('b_idem')), 1, 'undo still restores the batch');
select lives_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Idem')], 'damage', 5, public.t_id('b_idem'))$$, 'a late retry after the undo');
select is(public.t_hp('c1', 'Idem'), '20/20+0', 'a retry after an undo is still a no-op');
select throws_ok($$select public.apply_enemy_hp(public.t_id('c1'), array[public.t_eid('c1', 'Idem')], 'damage', 5, null)$$, 'P0001', 'invalid_batch', 'a missing batch id is refused');

-- ---- remove_entry (c2: A,B,C,D with B current)
select public.t_as('gm');
select throws_ok($$select public.remove_entry(public.t_id('e_p1'))$$, 'P0001', 'invalid_target', 'a player entry cannot be removed');
select public.t_as('p1');
select throws_ok($$select public.remove_entry(public.t_eid('c1', 'Wolf'))$$, 'P0001', 'not_allowed', 'a player cannot remove an enemy');
select public.t_as('gm2');
select lives_ok($$select public.remove_entry(public.t_eid('c2', 'C'))$$, 'remove a non-current enemy');
select is(public.t_state('c2') || '/' || public.t_positions('c2')::text, 'B|1/{1,2,3}', 'the current entry stays and positions are dense');
select lives_ok($$select public.remove_entry(public.t_eid('c2', 'B'))$$, 'remove the current enemy');
select is(public.t_state('c2'), 'D|1', 'the turn passes to the next row');
select lives_ok($$select public.remove_entry(public.t_eid('c2', 'D'))$$, 'remove the current last-position enemy');
select is(public.t_state('c2'), 'A|2', 'the turn wraps to position 1 with a new round');
select lives_ok($$select public.remove_entry(public.t_eid('c2', 'A'))$$, 'remove the only entry');
select is(public.t_state('c2') || '/' || public.t_positions('c2')::text, '-|2/{}', 'nothing is current and nothing is left');
select is(public.t_order('c1') is not null, true, 'the other combat is untouched');

set constraints all immediate;
select * from finish();
rollback;
