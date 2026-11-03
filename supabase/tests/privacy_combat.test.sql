-- Privacy, end to end: one fight driven only through the public RPCs as the real roles, then
-- every non-GM's view of combats / combat_order / combat_entries / sessions is searched for the
-- hidden ogre and for enemy hit points, armor class and notes. A failure here is a real leak:
-- fix the migration that owns it, never this test.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(90);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('p2'), ('inv'), ('out'), ('gm2'), ('pB'), ('ch1'), ('ch2'), ('chB'),
  ('campA'), ('campB'), ('rand'), ('rand2');
grant all on k to authenticated;
create temp table snap (rev int, updated_at timestamptz, tid text);
grant all on snap to authenticated;

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
create function public.t_sid() returns uuid language sql security definer set search_path = '' as $$
  select id from public.sessions where campaign_id = (select id from pg_temp.k where name = 'campA') and status = 'active'
$$;
create function public.t_cid() returns uuid language sql security definer set search_path = '' as $$
  select id from pg_temp.k where name = 'c'
$$;
create function public.t_eid(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combat_entries where combat_id = (select id from pg_temp.k where name = 'c') and (name = p_name or (kind = 'player' and p_name = 'P1' and user_id = (select id from pg_temp.k where name = 'p1')) or (kind = 'player' and p_name = 'P2' and user_id = (select id from pg_temp.k where name = 'p2')))
$$;
-- Everything the caller can read, as one string (SECURITY INVOKER: row-level security applies).
create function public.t_dump() returns text language sql as $$
  select coalesce((select string_agg(to_jsonb(c)::text, '') from public.combats c), '')
      || coalesce((select string_agg(to_jsonb(o)::text, '') from public.combat_order o), '')
      || coalesce((select string_agg(to_jsonb(e)::text, '') from public.combat_entries e), '')
      || coalesce((select string_agg(to_jsonb(s)::text, '') from public.sessions s), '')
$$;
create function public.t_secrets() returns text[] language sql security definer set search_path = '' as $$
  select array['Ogre Secretmark', (select id::text from public.combat_entries where name = 'Ogre Secretmark'),
    'has the key', 'visible note', '"hp"', '"max_hp"', '"temp_hp"', '"ac"', '"notes"', '"hidden"', '"group_id"']
$$;
-- how many secrets appear in the caller's view (0 expected)
create function public.t_leaks() returns int language sql as $$
  select count(*)::int from unnest(public.t_secrets()) s where position(lower(s) in lower(public.t_dump())) > 0
$$;
create function public.t_snap() returns void language sql security definer set search_path = '' as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select rev, updated_at, ctid::text from public.combats where id = (select id from pg_temp.k where name = 'c')
$$;
create function public.t_same() returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from public.combats c, pg_temp.snap s where c.id = (select id from pg_temp.k where name = 'c')
    and c.rev = s.rev and c.updated_at = s.updated_at and c.ctid::text = s.tid)
$$;
grant execute on function public.t_id(text), public.t_as(text), public.t_save(text, uuid), public.t_sid(), public.t_cid(),
  public.t_eid(text), public.t_dump(), public.t_secrets(), public.t_leaks(), public.t_snap(), public.t_same() to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@priv.local', json_build_object('username', 'priv_' || name)::jsonb
  from k where name in ('gm', 'p1', 'p2', 'inv', 'out', 'gm2', 'pB');
insert into public.characters (id, owner_id, system_id, name) values
  (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'Hero One'),
  (public.t_id('ch2'), public.t_id('p2'), 'dnd5e-2024', 'Hero Two'),
  (public.t_id('chB'), public.t_id('pB'), 'dnd5e-2024', 'Hero B');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Priv A', 'PRVAAA'),
  (public.t_id('campB'), 'dnd5e-2024', public.t_id('gm2'), 'Priv B', 'PRVBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active'),
  (public.t_id('campA'), public.t_id('p2'), 'player', public.t_id('ch2'), 'active'),
  (public.t_id('campA'), public.t_id('inv'), 'player', null, 'invited'),
  (public.t_id('campB'), public.t_id('gm2'), 'gm', null, 'active'),
  (public.t_id('campB'), public.t_id('pB'), 'player', public.t_id('chB'), 'active');

-- ---- the GM builds a fight through the public RPCs
set local role authenticated;
select public.t_as('p1');
select lives_ok($$select public.open_session(public.t_id('campA'))$$, 'p1 opens a session');
select lives_ok($$select public.set_combat(public.t_sid(), true)$$, 'p1 enters combat');
reset role;
select public.t_save('c', (select id from public.combats where campaign_id = public.t_id('campA') and status <> 'ended'));
set local role authenticated;
select public.t_as('gm');
select lives_ok($$select public.add_enemies(public.t_cid(), 'Visible Goblin', 1, 7, 12, 13, 'visible note', false)$$, 'the GM adds a visible goblin');
select lives_ok($$select public.add_enemies(public.t_cid(), 'Ogre Secretmark', 1, 59, 15, 17, 'has the key', true)$$, 'and a hidden ogre');
select lives_ok($$select public.set_initiative(public.t_eid('P1'), 18); select public.set_initiative(public.t_eid('P2'), 9)$$, 'roll call numbers');
select lives_ok($$select public.start_combat(public.t_cid())$$, 'the GM starts combat');
select lives_ok($$select public.set_current_entry(public.t_eid('Ogre Secretmark'))$$, 'the turn goes to the hidden ogre');

-- ---- nothing leaks into any non-GM's view
select public.t_as('p1');
select cmp_ok(length(public.t_dump()), '>', 100, 'sanity: p1 does see the combat and order rows');
select is(public.t_leaks(), 0, 'p1 sees none of the secrets');
select public.t_as('p2');
select is(public.t_leaks(), 0, 'p2 sees none of the secrets');
select public.t_as('inv');
select is(public.t_leaks(), 0, 'the invited member sees none of the secrets');
select is(public.t_dump(), '', 'the invited member sees no rows at all');
select public.t_as('out');
select is(public.t_dump(), '', 'the outsider sees no rows at all');
select public.t_as('gm2');
select is(public.t_dump(), '', 'another campaign''s GM sees no rows at all');
select public.t_as('pB');
select is(public.t_dump(), '', 'another campaign''s player sees no rows at all');
select public.t_as('gm');
select cmp_ok(public.t_leaks(), '>', 0, 'sanity: the search does find the secrets in the GM''s own view');

select public.t_as('p1');
select is((select count(*)::int from public.combat_entries), 0, 'p1 reads no entries');
select public.t_as('p2');
select is((select count(*)::int from public.combat_entries), 0, 'p2 reads no entries');
select public.t_as('inv');
select is((select count(*)::int from public.combat_entries), 0, 'invited reads no entries');
select public.t_as('out');
select is((select count(*)::int from public.combat_entries), 0, 'outsider reads no entries');
select public.t_as('gm2');
select is((select count(*)::int from public.combat_entries) + (select count(*)::int from public.combat_order) + (select count(*)::int from public.combats), 0, 'the other GM reads no combat, order or entries of campaign A');
select public.t_as('pB');
select is((select count(*)::int from public.combat_entries), 0, 'the other campaign''s player reads no entries');

select public.t_as('p1');
select is((select array_agg(k order by k) from (select distinct jsonb_object_keys(to_jsonb(o)) k from public.combat_order o) x),
  array['campaign_id','character_id','combat_id','id','initiative','kind','name','position','user_id'], 'order rows have exactly the player-safe keys');

-- ---- the ogre holds the turn: players see only gm_turn, with no gap in the order
select results_eq($$select turn_entry_id is null, gm_turn from public.combats where id = public.t_cid()$$, $$values (true, true)$$, 'p1 sees gm_turn and no turn id');
select is((select array_agg(position order by position) from public.combat_order where combat_id = public.t_cid()), array[1,2,3], 'three visible rows at positions 1..3');
select public.t_as('gm');
select lives_ok($$select public.next_turn(public.t_cid(), public.t_eid('Ogre Secretmark'))$$, 'next turn');
select public.t_as('p1');
select results_eq($$select not gm_turn, turn_entry_id in (select id from public.combat_order) from public.combats where id = public.t_cid()$$, $$values (true, true)$$, 'the turn is now a visible row');
select public.t_as('gm');
select public.set_current_entry(public.t_eid('Ogre Secretmark'));
select lives_ok($$select public.update_enemy(public.t_eid('Ogre Secretmark'), '{"hidden": false}')$$, 'reveal the ogre');
select public.t_as('p1');
select is((select count(*)::int from public.combat_order where name = 'Ogre Secretmark' and position = 2), 1, 'after the reveal it appears in the order');
select public.t_as('gm');
select lives_ok($$select public.update_enemy(public.t_eid('Ogre Secretmark'), '{"hidden": true}')$$, 'hide it again');
select public.t_as('p1');
select is((select count(*)::int from public.combat_order where name = 'Ogre Secretmark'), 0, 'its row is gone');
select results_eq($$select gm_turn, turn_entry_id is null from public.combats where id = public.t_cid()$$, $$values (true, true)$$, 'and gm_turn follows the pointer');
select is(public.t_leaks(), 0, 'still no secrets after the reveal and hide');

-- ---- enemy edits do not touch the combats row (no event, no timing hint)
select public.t_as('gm');
select public.t_snap();
select lives_ok($$select 1;
  select public.apply_enemy_hp(public.t_cid(), array[public.t_eid('Ogre Secretmark'), public.t_eid('Visible Goblin')], 'damage', 4);
  select public.update_enemy(public.t_eid('Ogre Secretmark'), '{"notes": "new secret", "ac": 18}');
  select public.update_enemy(public.t_eid('Visible Goblin'), '{"notes": "new visible", "ac": 12, "hp": 5}');
  select public.undo_enemy_hp(public.t_cid(), public.t_id('rand'))$$, 'damage, notes, ac and undo on hidden and visible enemies');
select ok(public.t_same(), 'none of it wrote the combats row');

-- ---- probing: a player gets the same answer for a real hidden id and a random one
select public.t_as('p1');
select throws_ok($$select public.update_enemy(public.t_eid('Ogre Secretmark'), '{"hp": 1}')$$, 'P0001', 'not_allowed', 'update_enemy, real hidden id');
select throws_ok($$select public.update_enemy(public.t_id('rand'), '{"hp": 1}')$$, 'P0001', 'not_allowed', 'update_enemy, random id');
select throws_ok($$select public.remove_entry(public.t_eid('Ogre Secretmark'))$$, 'P0001', 'not_allowed', 'remove_entry, real hidden id');
select throws_ok($$select public.remove_entry(public.t_id('rand'))$$, 'P0001', 'not_allowed', 'remove_entry, random id');
select throws_ok($$select public.set_current_entry(public.t_eid('Ogre Secretmark'))$$, 'P0001', 'not_allowed', 'set_current_entry, real hidden id');
select throws_ok($$select public.set_current_entry(public.t_id('rand'))$$, 'P0001', 'not_allowed', 'set_current_entry, random id');
select throws_ok($$select public.apply_enemy_hp(public.t_cid(), array[public.t_eid('Ogre Secretmark')], 'damage', 1)$$, 'P0001', 'not_allowed', 'apply_enemy_hp, real hidden id');
select throws_ok($$select public.apply_enemy_hp(public.t_cid(), array[public.t_id('rand')], 'damage', 1)$$, 'P0001', 'not_allowed', 'apply_enemy_hp, random id');
select throws_ok($$select public.set_initiative(public.t_eid('Ogre Secretmark'), 5)$$, 'P0001', 'not_allowed', 'set_initiative, real hidden id');
select throws_ok($$select public.set_initiative(public.t_id('rand'), 5)$$, 'P0001', 'not_allowed', 'set_initiative, random id');
select throws_ok($$select public.move_entry(public.t_eid('Ogre Secretmark'), 1)$$, 'P0001', 'not_allowed', 'move_entry, real hidden id');
select throws_ok($$select public.move_entry(public.t_id('rand'), 1)$$, 'P0001', 'not_allowed', 'move_entry, random id');
-- other campaign's GM and player, and the invited/outsider callers, get the same uniform answer too
select public.t_as('inv');
select throws_ok($$select public.update_enemy(public.t_eid('Ogre Secretmark'), '{"hp": 1}')$$, 'P0001', 'not_allowed', 'invited: update_enemy, real hidden id');
select throws_ok($$select public.update_enemy(public.t_id('rand'), '{"hp": 1}')$$, 'P0001', 'not_allowed', 'invited: update_enemy, random id');
select public.t_as('out');
select throws_ok($$select public.set_current_entry(public.t_eid('Ogre Secretmark'))$$, 'P0001', 'not_allowed', 'outsider: set_current_entry, real hidden id');
select throws_ok($$select public.set_current_entry(public.t_id('rand'))$$, 'P0001', 'not_allowed', 'outsider: set_current_entry, random id');
select public.t_as('gm2');
select throws_ok($$select public.remove_entry(public.t_eid('Ogre Secretmark'))$$, 'P0001', 'invalid_target', 'another GM: remove_entry, real hidden id');
select throws_ok($$select public.remove_entry(public.t_id('rand'))$$, 'P0001', 'invalid_target', 'another GM: remove_entry, random id');

-- combat-id RPCs: invited, outsider and another campaign's player are not members
select public.t_as('inv');
select throws_ok(sql, 'P0001', 'not_member', 'invited: ' || sql) from (values
  ($$select public.start_combat(public.t_cid())$$), ($$select public.next_turn(public.t_cid(), public.t_id('rand'))$$),
  ($$select public.end_my_turn(public.t_cid())$$), ($$select public.delay_turn(public.t_cid(), public.t_id('rand'))$$),
  ($$select public.add_enemies(public.t_cid(), 'X', 1, 1, 1, 1, null, false)$$),
  ($$select public.apply_enemy_hp(public.t_cid(), array[public.t_id('rand')], 'damage', 1)$$),
  ($$select public.undo_enemy_hp(public.t_cid(), public.t_id('rand'))$$)) v (sql);
select public.t_as('out');
select throws_ok(sql, 'P0001', 'not_member', 'outsider: ' || sql) from (values
  ($$select public.start_combat(public.t_cid())$$), ($$select public.next_turn(public.t_cid(), public.t_id('rand'))$$),
  ($$select public.end_my_turn(public.t_cid())$$), ($$select public.delay_turn(public.t_cid(), public.t_id('rand'))$$),
  ($$select public.add_enemies(public.t_cid(), 'X', 1, 1, 1, 1, null, false)$$),
  ($$select public.apply_enemy_hp(public.t_cid(), array[public.t_id('rand')], 'damage', 1)$$),
  ($$select public.undo_enemy_hp(public.t_cid(), public.t_id('rand'))$$)) v (sql);
select public.t_as('pB');
select throws_ok(sql, 'P0001', 'not_member', 'other campaign player: ' || sql) from (values
  ($$select public.start_combat(public.t_cid())$$), ($$select public.next_turn(public.t_cid(), public.t_id('rand'))$$),
  ($$select public.end_my_turn(public.t_cid())$$), ($$select public.delay_turn(public.t_cid(), public.t_id('rand'))$$),
  ($$select public.add_enemies(public.t_cid(), 'X', 1, 1, 1, 1, null, false)$$),
  ($$select public.apply_enemy_hp(public.t_cid(), array[public.t_id('rand')], 'damage', 1)$$),
  ($$select public.undo_enemy_hp(public.t_cid(), public.t_id('rand'))$$)) v (sql);

-- ---- privileges and publication
reset role;
select ok(not has_function_privilege('authenticated', sig, 'execute'), sig || ' is not executable by authenticated') from (values
  ('public.refresh_combat(uuid)'), ('public.combat_next_entry(uuid, uuid)'), ('public.combat_insert_position(uuid, int, uuid)'),
  ('public.combat_renumber(uuid)'), ('public.combat_place_entry(uuid, uuid, int)'), ('public.combat_advance(uuid)'),
  ('public.combat_lock_for_entry(uuid)'), ('public.combat_delete_entries(uuid, uuid[])'),
  ('public.combat_end_for_session(uuid)'), ('public.combat_sync_member()')) v (sig);
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combats'), 'combats is published');
select ok(not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('combat_entries', 'combat_order')), 'combat_entries and combat_order are not published');

-- ---- ending combat leaves nothing, even for the GM
set local role authenticated;
select public.t_as('gm');
select lives_ok($$select public.set_combat(public.t_sid(), false)$$, 'the GM ends combat');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_cid()), 0, 'no entries remain, even for the GM');
select is((select count(*)::int from public.combat_order where combat_id = public.t_cid()), 0, 'no order rows remain');
select results_eq($$select status, turn_entry_id is null, gm_turn from public.combats where id = public.t_cid()$$, $$values ('ended', true, false)$$, 'the combat is ended with no turn pointer');

set constraints all immediate;
select * from finish();
rollback;
