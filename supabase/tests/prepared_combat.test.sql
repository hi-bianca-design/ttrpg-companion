-- Prepared launch (start_prepared_combat), reinforcements (add_encounter_enemies) and the
-- auto-skip of downed enemies in combat_next_entry. Everything is driven through the public RPCs
-- as the real roles; ids come from a temp table via t_id('name').
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(86);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('p2'), ('inv'), ('gm2'), ('gm3'), ('p3'),
  ('campA'), ('campB'), ('campC'), ('ch1'), ('ch2'), ('ch3'), ('s1'), ('s2'), ('s3'),
  ('e1'), ('ew'), ('eb'), ('eB'), ('ebw'), ('eC'), ('er'), ('eH'), ('eh'), ('rand');
grant all on k to authenticated;
create temp table snap (label text primary key, v jsonb);
grant all on snap to authenticated;

create function public.t_id(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from pg_temp.k where name = p_name
$$;
create function public.t_as(p_name text) returns void language sql security definer set search_path = '' as $$
  select set_config('request.jwt.claims', case when p_name is null then '{}'
    else json_build_object('sub', (select id from pg_temp.k where name = p_name), 'role', 'authenticated')::text end, true)
$$;
create function public.t_save(p_name text, p_id uuid) returns uuid language sql security definer set search_path = '' as $$
  insert into pg_temp.k (name, id) values (p_name, p_id)
  on conflict (name) do update set id = excluded.id returning id
$$;
-- the live combat of a session ('s1', 's3')
create function public.t_cid(p_session text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combats where session_id = (select id from pg_temp.k where name = p_session) and status <> 'ended'
$$;
create function public.t_eid(p_session text, p_name text) returns uuid language sql security definer set search_path = '' as $$
  select e.id from public.combat_entries e left join public.characters ch on ch.id = e.character_id
   where e.combat_id = public.t_cid(p_session) and coalesce(e.name, ch.name) = p_name
$$;
-- the GM's truth, by position
create function public.t_order(p_session text) returns text language sql security definer set search_path = '' as $$
  select string_agg(coalesce(e.name, ch.name), ',' order by e.position)
    from public.combat_entries e left join public.characters ch on ch.id = e.character_id
   where e.combat_id = public.t_cid(p_session)
$$;
-- what a player is shown, by position
create function public.t_vis(p_session text) returns text language sql security definer set search_path = '' as $$
  select string_agg(coalesce(o.name, ch.name), ',' order by o.position)
    from public.combat_order o left join public.characters ch on ch.id = o.character_id
   where o.combat_id = public.t_cid(p_session)
$$;
-- 'current name|round|status'
create function public.t_state(p_session text) returns text language sql security definer set search_path = '' as $$
  select coalesce((select coalesce(e.name, ch.name) from public.combat_entries e left join public.characters ch on ch.id = e.character_id
                    where e.combat_id = c.id and e.is_current), '-') || '|' || c.round || '|' || c.status
    from public.combats c where c.id = public.t_cid(p_session)
$$;
create function public.t_positions(p_session text) returns int[] language sql security definer set search_path = '' as $$
  select coalesce(array_agg(position order by position), '{}') from public.combat_entries where combat_id = public.t_cid(p_session)
$$;
create function public.t_encounter_rows() returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]') from public.encounter_enemies x
$$;
create function public.t_snap(p_label text, p_v jsonb) returns void language sql security definer set search_path = '' as $$
  insert into pg_temp.snap values (p_label, p_v) on conflict (label) do update set v = excluded.v
$$;
create function public.t_snapped(p_label text) returns jsonb language sql security definer set search_path = '' as $$
  select v from pg_temp.snap where label = p_label
$$;
create function public.t_hp0(p_session text, p_name text) returns void language sql security definer set search_path = '' as $$
  update public.combat_entries set hp = 0 where id = public.t_eid(p_session, p_name)
$$;
-- the combats row as a player's Realtime would see it (rev, updated_at, physical row)
create function public.t_row(p_session text) returns text language sql security definer set search_path = '' as $$
  select c.rev || '|' || c.updated_at || '|' || c.ctid::text from public.combats c where c.id = public.t_cid(p_session)
$$;
create function public.t_current(p_session text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combat_entries where combat_id = public.t_cid(p_session) and is_current
$$;
grant execute on function public.t_id(text), public.t_as(text), public.t_save(text, uuid), public.t_cid(text),
  public.t_eid(text, text), public.t_order(text), public.t_vis(text), public.t_state(text), public.t_positions(text),
  public.t_encounter_rows(), public.t_snap(text, jsonb), public.t_snapped(text), public.t_hp0(text, text),
  public.t_current(text), public.t_row(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@prep.local', json_build_object('username', 'prep_' || name)::jsonb
  from k where name in ('gm', 'p1', 'p2', 'inv', 'gm2', 'gm3', 'p3');
-- P1 is down (0 hit points on the sheet): the turn order must not skip a player.
insert into public.characters (id, owner_id, system_id, name, resources) values
  (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'P1', '{"hp": {"current": 0, "max": 10}}'),
  (public.t_id('ch2'), public.t_id('p2'), 'dnd5e-2024', 'P2', '{}'),
  (public.t_id('ch3'), public.t_id('p3'), 'dnd5e-2024', 'P3', '{}');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Prep A', 'PREPAA'),
  (public.t_id('campB'), 'dnd5e-2024', public.t_id('gm2'), 'Prep B', 'PREPBB'),
  (public.t_id('campC'), 'dnd5e-2024', public.t_id('gm3'), 'Prep C', 'PREPCC');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active'),
  (public.t_id('campA'), public.t_id('p2'), 'player', public.t_id('ch2'), 'active'),
  (public.t_id('campA'), public.t_id('inv'), 'player', null, 'invited'),
  (public.t_id('campB'), public.t_id('gm2'), 'gm', null, 'active'),
  (public.t_id('campC'), public.t_id('gm3'), 'gm', null, 'active'),
  (public.t_id('campC'), public.t_id('p3'), 'player', public.t_id('ch3'), 'active');
insert into public.sessions (id, campaign_id, opened_by) values
  (public.t_id('s1'), public.t_id('campA'), public.t_id('gm')),
  (public.t_id('s2'), public.t_id('campB'), public.t_id('gm2')),
  (public.t_id('s3'), public.t_id('campC'), public.t_id('gm3'));
-- e1 (campA): Wolf x3 with a full card, then a Goblin Boss the encounter marks hidden.
insert into public.encounters (id, campaign_id, name, story_before) values
  (public.t_id('e1'), public.t_id('campA'), 'Wolf ambush', 'a secret story'),
  (public.t_id('eB'), public.t_id('campB'), 'Other table', null),
  (public.t_id('eC'), public.t_id('campC'), 'Rats', null),
  (public.t_id('eH'), public.t_id('campA'), 'Lurkers', null);
insert into public.encounter_enemies (id, encounter_id, campaign_id, name, count, max_hp, defense_label, ac, attacks, xp, notes, hidden, position) values
  (public.t_id('ew'), public.t_id('e1'), public.t_id('campA'), 'Wolf', 3, 11, 'AC', 13,
   '[{"name": "Bite", "toHit": "+4", "damage": "2d4+2"}]', 50, 'pack tactics', false, 1),
  (public.t_id('eb'), public.t_id('e1'), public.t_id('campA'), 'Goblin Boss', 1, 21, null, 17, '[]', 200, null, true, 2),
  (public.t_id('ebw'), public.t_id('eB'), public.t_id('campB'), 'Bandit', 2, 9, null, 12, '[]', null, null, false, 1),
  (public.t_id('er'), public.t_id('eC'), public.t_id('campC'), 'Rat', 2, 3, null, 10, '[]', null, null, false, 1),
  (public.t_id('eh'), public.t_id('eH'), public.t_id('campA'), 'Lurker', 2, 30, null, 15, '[]', null, 'secret', true, 1);
select public.t_snap('encounters', public.t_encounter_rows());

-- ---- grants
select ok(has_function_privilege('authenticated', 'public.start_prepared_combat(uuid, uuid[], text[], text[])', 'execute'), 'start_prepared_combat is callable by authenticated');
select ok(has_function_privilege('authenticated', 'public.add_encounter_enemies(uuid, uuid)', 'execute'), 'add_encounter_enemies is callable by authenticated');
select ok(not has_function_privilege('anon', 'public.start_prepared_combat(uuid, uuid[], text[], text[])', 'execute'), 'start_prepared_combat is not callable by anon');
select ok(not has_function_privilege('anon', 'public.add_encounter_enemies(uuid, uuid)', 'execute'), 'add_encounter_enemies is not callable by anon');
select ok(not has_function_privilege('authenticated', 'public.combat_add_encounter_enemies(uuid, uuid)', 'execute'), 'the internal copier is not callable by authenticated');
select ok(not has_function_privilege('anon', 'public.combat_add_encounter_enemies(uuid, uuid)', 'execute'), 'nor by anon');

set local role authenticated;

-- ---- start_prepared_combat: refusals (nothing is created)
select public.t_as(null);
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], '{}', '{}')$$, 'P0001', 'not_authenticated', 'anonymous caller');
select public.t_as('p1');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], '{}', '{}')$$, 'P0001', 'not_allowed', 'a player cannot launch');
select public.t_as('inv');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], '{}', '{}')$$, 'P0001', 'not_member', 'an invited member is not a member');
select public.t_as('gm2');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], '{}', '{}')$$, 'P0001', 'not_member', 'another campaign''s GM is not a member');
select public.t_as('gm');
select throws_ok($$select public.start_prepared_combat(public.t_id('rand'), '{}', '{}', '{}')$$, 'P0001', 'no_active_session', 'an unknown session');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('rand')], '{}', '{}')$$, 'P0001', 'invalid_target', 'an unknown encounter');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('eB')], '{}', '{}')$$, 'P0001', 'invalid_target', 'another campaign''s encounter');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[null]::uuid[], '{}', '{}')$$, 'P0001', 'invalid_target', 'a null encounter id');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], array['enemy:' || public.t_id('ew') || ':4'], '{}')$$, 'P0001', 'invalid_target', 'a copy number past the count');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], array['player:' || public.t_id('ch3')], '{}')$$, 'P0001', 'invalid_target', 'a character outside the party');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], array['player:' || public.t_id('ch1'), 'player:' || public.t_id('ch1')], '{}')$$, 'P0001', 'invalid_target', 'a key listed twice');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], array['nonsense'], '{}')$$, 'P0001', 'invalid_target', 'a malformed key');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], '{}', array['player:' || public.t_id('ch1')])$$, 'P0001', 'invalid_target', 'a player cannot be hidden');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), '{}', '{}', array['enemy:' || public.t_id('ew') || ':1'])$$, 'P0001', 'invalid_target', 'hiding an enemy of an encounter not launched');
select is(public.t_cid('s1'), null, 'the refused launches created no combat');
select is((select in_combat from public.sessions where id = public.t_id('s1')), false, 'and left the session out of combat');

-- ---- launch: Wolf x3 in the given order
select lives_ok($$select public.t_save('c1', (public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')],
  array['enemy:' || public.t_id('ew') || ':2', 'player:' || public.t_id('ch1'), 'enemy:' || public.t_id('ew') || ':1',
        'enemy:' || public.t_id('ew') || ':3', 'player:' || public.t_id('ch2'), 'enemy:' || public.t_id('eb') || ':1'],
  '{}')).id)$$, 'the GM launches the encounter');
select is(public.t_cid('s1'), public.t_id('c1'), 'it returns the new live combat');
select is(public.t_order('s1'), 'Wolf 2,P1,Wolf 1,Wolf 3,P2,Goblin Boss', 'entries sit in the given order');
select is(public.t_state('s1'), 'Wolf 2|1|active', 'the combat is active, round 1, position 1 current');
select is(public.t_positions('s1'), '{1,2,3,4,5,6}'::int[], 'positions are dense');
select is((select in_combat from public.sessions where id = public.t_id('s1')), true, 'the session is in combat');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_id('c1') and name like 'Wolf %'
            and max_hp = 11 and hp = 11 and ac = 13 and defense_label = 'AC' and xp = 50 and notes = 'pack tactics'
            and attacks = '[{"name": "Bite", "toHit": "+4", "damage": "2d4+2"}]'::jsonb and conditions = '{}'
            and initiative is null and not hidden), 3, 'each wolf copies the card at full hit points');
select is((select count(distinct group_id)::int from public.combat_entries where combat_id = public.t_id('c1') and name like 'Wolf %' and group_id is not null), 1, 'the wolves share one group');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_id('c1') and name = 'Goblin Boss' and group_id is null and not hidden), 1, 'a count of 1 keeps the bare name, no group, and p_hidden_keys (empty) decides visibility');
select is(public.t_vis('s1'), 'Wolf 2,P1,Wolf 1,Wolf 3,P2,Goblin Boss', 'players see the same order');
select is(public.t_encounter_rows(), public.t_snapped('encounters'), 'the encounter''s own rows are unchanged');
select throws_ok($$select public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')], '{}', '{}')$$, 'P0001', 'not_rolling', 'a second launch while active');

-- ---- add_encounter_enemies (reinforcements)
select public.t_as('p1');
select throws_ok($$select public.add_encounter_enemies(public.t_id('c1'), public.t_id('e1'))$$, 'P0001', 'not_allowed', 'a player cannot add reinforcements');
select throws_ok($$select public.add_encounter_enemies(public.t_id('c1'), public.t_id('rand'))$$, 'P0001', 'not_allowed', 'a player probing an unknown encounter gets the same answer');
select public.t_as('gm');
select throws_ok($$select public.add_encounter_enemies(public.t_id('c1'), public.t_id('rand'))$$, 'P0001', 'invalid_target', 'an unknown encounter');
select throws_ok($$select public.add_encounter_enemies(public.t_id('c1'), public.t_id('eB'))$$, 'P0001', 'invalid_target', 'another campaign''s encounter');
select throws_ok($$select public.add_encounter_enemies(public.t_id('rand'), public.t_id('e1'))$$, 'P0001', 'no_active_combat', 'an unknown combat');
select is(cardinality(public.add_encounter_enemies(public.t_id('c1'), public.t_id('e1'))), 4, 'the same encounter again adds four copies');
select is(public.t_order('s1'), 'Wolf 2,P1,Wolf 1,Wolf 3,P2,Goblin Boss,Wolf 4,Wolf 5,Wolf 6,Goblin Boss', 'named Wolf 4..6 and placed at the bottom');
select is(public.t_state('s1'), 'Wolf 2|1|active', 'the turn did not move');
select is((select count(distinct group_id)::int from public.combat_entries where combat_id = public.t_id('c1') and name in ('Wolf 4', 'Wolf 5', 'Wolf 6')), 1, 'the new wolves share a new group');
select is((select count(distinct group_id)::int from public.combat_entries where combat_id = public.t_id('c1') and name like 'Wolf %'), 2, 'separate from the first pack');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_id('c1') and name = 'Goblin Boss' and hidden), 1, 'the new Goblin Boss follows the encounter''s hidden flag');
select is(public.t_vis('s1'), 'Wolf 2,P1,Wolf 1,Wolf 3,P2,Goblin Boss,Wolf 4,Wolf 5,Wolf 6', 'the hidden boss has no order row');
select is(public.t_encounter_rows(), public.t_snapped('encounters'), 'the encounter''s rows are still unchanged');
select lives_ok($$select public.t_snap('row', to_jsonb(public.t_row('s1')))$$, 'snapshot the combats row');
select is(cardinality(public.add_encounter_enemies(public.t_id('c1'), public.t_id('eH'))), 2, 'an all-hidden encounter adds two copies');
select is(public.t_row('s1'), public.t_snapped('row') #>> '{}', 'and writes nothing a player can see (combats row untouched)');
select public.t_as('p1');
select is((select count(*)::int from public.combat_entries), 0, 'a player still reads no entries');
select is((select count(*)::int from public.combat_order where name like 'Lurker%'), 0, 'no lurker is in the order');
select is((select count(*)::int from public.encounter_enemies) + (select count(*)::int from public.encounters), 0, 'nor any encounter');
select is((select count(*)::int from public.combat_order where name = 'Goblin Boss'), 1, 'and only the visible boss in the order');

-- ---- hidden keys: Wolf 2 hidden, visible copies renumbered densely
select public.t_as('gm');
select lives_ok($$select public.set_combat(public.t_id('s1'), false)$$, 'the GM ends that combat');
select lives_ok($$select public.t_save('c2', (public.start_prepared_combat(public.t_id('s1'), array[public.t_id('e1')],
  array['player:' || public.t_id('ch1'), 'player:' || public.t_id('ch2')], array['enemy:' || public.t_id('ew') || ':2'])).id)$$, 'launch with Wolf 2 hidden');
select is(public.t_order('s1'), 'P1,P2,Wolf 1,Wolf 2,Wolf 3,Goblin Boss', 'unlisted keys go last in their natural order');
select is((select string_agg(name, ',' order by position) from public.combat_entries where combat_id = public.t_id('c2') and hidden), 'Wolf 2', 'only Wolf 2 is hidden (the boss too follows p_hidden_keys)');
select is(public.t_vis('s1'), 'P1,P2,Wolf 1,Wolf 2,Goblin Boss', 'players see the visible wolves renumbered 1..2');
select ok(not exists (select 1 from public.combat_order where id = public.t_eid('s1', 'Wolf 2')), 'the hidden wolf has no combat_order row');
select is((select array_agg(position order by position) from public.combat_order where combat_id = public.t_id('c2')), '{1,2,3,4,5}'::int[], 'order positions are dense');

-- ---- zero encounters, party-only order, reusing a rolling combat
select lives_ok($$select public.set_combat(public.t_id('s1'), false)$$, 'end it');
select public.t_as('p1');
select lives_ok($$select public.set_combat(public.t_id('s1'), true)$$, 'a player enters combat (roll call)');
select lives_ok($$select public.t_save('c3', public.t_cid('s1'))$$, 'the rolling combat');
select public.t_as('gm');
select is((public.start_prepared_combat(public.t_id('s1'), '{}', array['player:' || public.t_id('ch2'), 'player:' || public.t_id('ch1')], '{}')).id,
          public.t_id('c3'), 'a party-only launch reuses the rolling combat');
select is(public.t_order('s1'), 'P2,P1', 'in the given order');
select is(public.t_state('s1'), 'P2|1|active', 'and starts it');

-- ---- next_turn skips downed enemies, never downed players
select is(cardinality(public.add_encounter_enemies(public.t_id('c3'), public.t_id('e1'))), 4, 'reinforcements arrive');
select is(public.t_order('s1'), 'P2,P1,Wolf 1,Wolf 2,Wolf 3,Goblin Boss', 'at the bottom');
select public.t_hp0('s1', 'Wolf 1');
select public.t_hp0('s1', 'Wolf 3');
select lives_ok($$select public.next_turn(public.t_id('c3'), public.t_current('s1'))$$, 'next turn from P2');
select is(public.t_state('s1'), 'P1|1|active', 'a downed player still gets the turn');
select lives_ok($$select public.next_turn(public.t_id('c3'), public.t_current('s1'))$$, 'next turn from P1');
select is(public.t_state('s1'), 'Wolf 2|1|active', 'Wolf 1 (0 hp) is skipped');
select lives_ok($$select public.next_turn(public.t_id('c3'), public.t_current('s1'))$$, 'next turn from Wolf 2');
select is(public.t_state('s1'), 'Goblin Boss|1|active', 'Wolf 3 (0 hp) is skipped');
select public.t_hp0('s1', 'Goblin Boss');
select lives_ok($$select public.set_current_entry(public.t_eid('s1', 'Wolf 1'))$$, 'the GM can still stop on a downed enemy');
select is(public.t_state('s1'), 'Wolf 1|1|active', 'Wolf 1 holds the turn');
select lives_ok($$select public.next_turn(public.t_id('c3'), public.t_current('s1'))$$, 'next turn from Wolf 1');
select is(public.t_state('s1'), 'Wolf 2|1|active', 'lands on the next live entry');
select lives_ok($$select public.next_turn(public.t_id('c3'), public.t_current('s1'))$$, 'next turn from Wolf 2 past downed Wolf 3 and Goblin Boss');
select is(public.t_state('s1'), 'P2|2|active', 'skipping past the end wraps and adds a round');

-- ---- every other entry is a downed enemy: the next position, no hang (campC: P3 + Rat x2)
select public.t_as('gm3');
select lives_ok($$select public.start_prepared_combat(public.t_id('s3'), array[public.t_id('eC')], '{}', '{}')$$, 'launch the rats');
select public.t_hp0('s3', 'Rat 1');
select public.t_hp0('s3', 'Rat 2');
select lives_ok($$select public.next_turn(public.t_cid('s3'), public.t_current('s3'))$$, 'next turn from P3 with both rats down');
select is(public.t_state('s3'), 'Rat 1|1|active', 'lands on the next position regardless');
select lives_ok($$select public.next_turn(public.t_cid('s3'), public.t_current('s3'))$$, 'next turn from Rat 1');
select is(public.t_state('s3'), 'P3|2|active', 'skips Rat 2 and wraps to P3');

set constraints all immediate;
select * from finish();
rollback;
