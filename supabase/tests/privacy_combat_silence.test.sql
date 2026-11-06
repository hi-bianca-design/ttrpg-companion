-- While a combat is active, GM actions on hidden enemies must change nothing a player can read
-- (no combats write, no order change), a wrap from a hidden last row looks exactly like a wrap
-- from a visible one, and anon has no access to any combat table or function.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(30);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('p2'), ('gm2'), ('pB'), ('ch1'), ('ch2'), ('chB'), ('campA'), ('campB'), ('mark');
grant all on k to authenticated;
create temp table fp (label text primary key, v text);
create temp table ro (label text primary key, round int, rev int, pointer uuid);

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
create function public.t_cid(p_camp text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combats where campaign_id = (select id from pg_temp.k where name = p_camp) and status <> 'ended'
$$;
create function public.t_sid(p_camp text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.sessions where campaign_id = (select id from pg_temp.k where name = p_camp) and status = 'active'
$$;
-- campaign A's entry by enemy name, or by 'P1'/'P2'
create function public.t_eid(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combat_entries where combat_id = public.t_cid('campA')
   and (name = p_name or (p_name = 'P1' and user_id = (select id from pg_temp.k where name = 'p1'))
                      or (p_name = 'P2' and user_id = (select id from pg_temp.k where name = 'p2')))
$$;
create function public.t_beid(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combat_entries where combat_id = public.t_cid('campB')
   and (name = p_name or (p_name = 'PB' and user_id = (select id from pg_temp.k where name = 'pB')))
$$;
-- Everything a player of campaign A can read about the fight, row versions included (ctid changes on any write).
create function public.t_fp() returns text language sql security definer set search_path = '' as $$
  select md5(
    coalesce((select string_agg(to_jsonb(c)::text || c.ctid::text, '|') from public.combats c where c.id = public.t_cid('campA')), '') ||
    coalesce((select string_agg(to_jsonb(o)::text || o.ctid::text, '|' order by o.position) from public.combat_order o where o.combat_id = public.t_cid('campA')), '') ||
    coalesce((select string_agg(to_jsonb(s)::text || s.ctid::text, '|') from public.sessions s where s.campaign_id = (select id from pg_temp.k where name = 'campA')), ''))
$$;
create function public.t_mark(p_label text) returns void language sql security definer set search_path = '' as $$
  insert into pg_temp.fp values (p_label, public.t_fp()) on conflict (label) do update set v = excluded.v
$$;
create function public.t_silent(p_label text) returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from pg_temp.fp where label = p_label and v = public.t_fp())
$$;
create function public.t_ro(p_label text, p_camp text) returns void language sql security definer set search_path = '' as $$
  insert into pg_temp.ro select p_label, round, rev, turn_entry_id from public.combats where id = public.t_cid(p_camp)
$$;
create function public.t_anon_count(p_table text) returns int language plpgsql as $$
declare n int;
begin execute format('select count(*) from public.%I', p_table) into n; return n;
exception when insufficient_privilege then return -1; end $$;
grant execute on function public.t_id(text), public.t_as(text), public.t_save(text, uuid), public.t_cid(text), public.t_sid(text),
  public.t_eid(text), public.t_beid(text), public.t_fp(), public.t_mark(text), public.t_silent(text), public.t_ro(text, text),
  public.t_anon_count(text) to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@silent.local', json_build_object('username', 'silent_' || name)::jsonb from k where name in ('gm', 'p1', 'p2', 'gm2', 'pB');
insert into public.characters (id, owner_id, system_id, name) values
  (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'Hero One'),
  (public.t_id('ch2'), public.t_id('p2'), 'dnd5e-2024', 'Hero Two'),
  (public.t_id('chB'), public.t_id('pB'), 'dnd5e-2024', 'Hero B');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Silent A', 'SLNAAA'),
  (public.t_id('campB'), 'dnd5e-2024', public.t_id('gm2'), 'Silent B', 'SLNBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active'),
  (public.t_id('campA'), public.t_id('p2'), 'player', public.t_id('ch2'), 'active'),
  (public.t_id('campB'), public.t_id('gm2'), 'gm', null, 'active'),
  (public.t_id('campB'), public.t_id('pB'), 'player', public.t_id('chB'), 'active');

-- Campaign A: P1 18, hidden Lurk 16, hidden Wisp 14, visible Imp 12, P2 9, hidden Last 5 (last row).
set local role authenticated;
select public.t_as('p1');
select public.open_session(public.t_id('campA'));
select public.set_combat(public.t_sid('campA'), true);
select public.t_as('gm');
select public.add_enemies(public.t_cid('campA'), 'Lurk', 1, 9, 16, 12, 'n', true);
select public.add_enemies(public.t_cid('campA'), 'Wisp', 1, 9, 14, 12, 'n', true);
select public.add_enemies(public.t_cid('campA'), 'Imp', 1, 9, 12, 12, 'n', false);
select public.add_enemies(public.t_cid('campA'), 'Last', 1, 9, 5, 12, 'n', true);
select public.set_initiative(public.t_eid('P1'), 18);
select public.set_initiative(public.t_eid('P2'), 9);
select public.start_combat(public.t_cid('campA'));
-- Campaign B: Hero B 10, visible Rat 5 (last row).
select public.t_as('pB');
select public.open_session(public.t_id('campB'));
select public.set_combat(public.t_sid('campB'), true);
select public.t_as('gm2');
select public.add_enemies(public.t_cid('campB'), 'Rat', 1, 4, 5, 10, null, false);
select public.set_initiative(public.t_beid('PB'), 10);
select public.start_combat(public.t_cid('campB'));

-- ---- I4: hidden-only GM actions are silent
select public.t_as('gm');
select public.t_mark('add');
select lives_ok($$select public.add_enemies(public.t_cid('campA'), 'Lurker', 2, 3, 3, 10, null, true)$$, 'add hidden enemies');
select ok(public.t_silent('add'), 'add_enemies hidden=true changes nothing a player can read');
select public.t_mark('init');
select lives_ok($$select public.set_initiative(public.t_eid('Wisp'), 17)$$, 'set a hidden initiative');
select ok(public.t_silent('init'), 'set_initiative on a hidden entry changes nothing a player can read');
select public.t_mark('move');
select lives_ok($$select public.move_entry(public.t_eid('Last'), 2)$$, 'move a hidden entry');
select ok(public.t_silent('move'), 'move_entry on a hidden entry changes nothing a player can read');
select public.t_mark('remove');
select lives_ok($$select public.remove_entry(public.t_eid('Lurker 1'))$$, 'remove a non-current hidden enemy');
select ok(public.t_silent('remove'), 'remove_entry of a non-current hidden enemy changes nothing a player can read');
-- order is now P1, Last, Wisp, Lurk, Imp, P2, Lurker 2, with P1 current
select public.t_mark('cur');
select lives_ok($$select public.set_current_entry(public.t_eid('Last'))$$, 'a hidden enemy takes the turn');
select ok(public.t_silent('cur'), 'handing the turn to a hidden enemy changes nothing a player can read');
select public.t_mark('hh');
select lives_ok($$select public.next_turn(public.t_cid('campA'), public.t_eid('Last'))$$, 'next turn, hidden to hidden');
select ok(public.t_silent('hh'), 'next_turn from one hidden row to another changes nothing a player can read');
select lives_ok($$select public.t_save('b_undo', public.apply_enemy_hp(public.t_cid('campA'), array[public.t_eid('Imp'), public.t_eid('Lurk')], 'damage', 3, gen_random_uuid()))$$, 'damage a visible and a hidden enemy');
select public.t_mark('undo');
select is(public.undo_enemy_hp(public.t_cid('campA'), (select id from pg_temp.k where name = 'b_undo')), 2, 'a real undo restores both rows');
select ok(public.t_silent('undo'), 'a real undo_enemy_hp changes nothing a player can read');

-- ---- I2: the pointer stays put, and a wrap from a hidden last row looks like one from a visible row
select public.t_as('p1');
select is((select turn_entry_id from public.combats where id = public.t_cid('campA')), public.t_eid('P1'), 'players still see P1 as the holder while the GM plays hidden rows');
select public.t_as('gm');
-- walk A to its last row (hidden Lurker 2), the pointer on the last visible holder P2 (the row before it)
select public.next_turn(public.t_cid('campA'), (select id from public.combat_entries where combat_id = public.t_cid('campA') and is_current));
select public.next_turn(public.t_cid('campA'), (select id from public.combat_entries where combat_id = public.t_cid('campA') and is_current));
select public.next_turn(public.t_cid('campA'), (select id from public.combat_entries where combat_id = public.t_cid('campA') and is_current));
select public.next_turn(public.t_cid('campA'), (select id from public.combat_entries where combat_id = public.t_cid('campA') and is_current));
select is((select name from public.combat_entries where combat_id = public.t_cid('campA') and is_current), 'Lurker 2', 'A is on its last, hidden row');
select is((select turn_entry_id from public.combats where id = public.t_cid('campA')), public.t_eid('P2'), 'the player pointer is on the last visible holder, P2');
select public.t_ro('A_before', 'campA');
select public.next_turn(public.t_cid('campA'), public.t_eid('Lurker 2'));
select public.t_ro('A_after', 'campA');
-- B: the last row is visible
select public.t_as('gm2');
select public.set_current_entry(public.t_beid('Rat'));
select public.t_ro('B_before', 'campB');
select public.next_turn(public.t_cid('campB'), public.t_beid('Rat'));
select public.t_ro('B_after', 'campB');
reset role;
select is((select round - 1 from pg_temp.ro where label = 'A_after'), (select round from pg_temp.ro where label = 'A_before'), 'the hidden wrap adds exactly one round');
select is((select pointer from pg_temp.ro where label = 'A_after'), public.t_eid('P1'), 'and puts the pointer on the first row');
select is((select a.rev - b.rev from pg_temp.ro a, pg_temp.ro b where a.label = 'A_after' and b.label = 'A_before'),
          (select a.rev - b.rev from pg_temp.ro a, pg_temp.ro b where a.label = 'B_after' and b.label = 'B_before'),
          'a wrap from a hidden last row writes the same change (rev delta) as one from a visible last row');
select is((select round - 1 from pg_temp.ro where label = 'B_after'), (select round from pg_temp.ro where label = 'B_before'), 'the visible wrap also adds one round');
select is((select pointer from pg_temp.ro where label = 'B_after'), public.t_beid('PB'), 'and puts the pointer on the first row');

-- ---- anon: no access to any combat table or function
-- One aggregate assertion (lists any offender), so new combat functions never change the plan.
create function public.t_combat_fns() returns setof oid language sql security definer set search_path = '' as $$
  select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and (p.proname like 'combat\_%' or p.proname in ('lock_combat', 'refresh_combat', 'start_combat', 'set_initiative', 'move_entry', 'next_turn',
          'end_my_turn', 'set_current_entry', 'delay_turn', 'add_enemies', 'update_enemy', 'remove_entry', 'apply_enemy_hp', 'undo_enemy_hp',
          'set_combat', 'end_session', 'start_prepared_combat', 'add_encounter_enemies'))
$$;
select is((select coalesce(array_agg(f::regprocedure::text order by f::regprocedure::text), '{}') from public.t_combat_fns() f
            where has_function_privilege('anon', f, 'execute')),
          '{}'::text[], 'no combat function is executable by anon');
select cmp_ok((select count(*)::int from public.t_combat_fns()), '>=', 28, 'the anon check covered every combat function');
select is((select array_agg(p.proname::text order by p.proname) from public.t_combat_fns() f join pg_catalog.pg_proc p on p.oid = f
            where p.proname in ('start_prepared_combat', 'add_encounter_enemies')),
          array['add_encounter_enemies', 'start_prepared_combat'], 'the check includes start_prepared_combat and add_encounter_enemies');
set local role anon;
select cmp_ok(public.t_anon_count(t), '<=', 0, 'anon reads no rows of ' || t) from (values ('combats'), ('combat_order'), ('combat_entries'), ('combat_hp_batches')) v (t);
reset role;

set constraints all immediate;
select * from finish();
rollback;
