-- Enemy card fields: defense_label, attacks, xp, conditions on combat_entries; add_enemies takes
-- the first three (defaulted), update_enemy patches all four. Players hold none of them.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(30);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('campA'), ('s1'), ('c1'), ('ch1'), ('e_p1');
grant all on k to authenticated;

create function public.t_id(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from pg_temp.k where name = p_name
$$;
create function public.t_as(p_name text) returns void language sql security definer set search_path = '' as $$
  select set_config('request.jwt.claims', case when p_name is null then '{}'
    else json_build_object('sub', (select id from pg_temp.k where name = p_name), 'role', 'authenticated')::text end, true)
$$;
create function public.t_eid(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from public.combat_entries where combat_id = (select id from pg_temp.k where name = 'c1') and name = p_name
$$;
grant execute on function public.t_id(text), public.t_as(text), public.t_eid(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@card.local', json_build_object('username', 'card_' || name)::jsonb
  from k where name in ('gm', 'p1');
insert into public.characters (id, owner_id, system_id, name) values (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'P1');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Card A', 'CRDAAA');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active');
insert into public.sessions (id, campaign_id, opened_by, in_combat) values
  (public.t_id('s1'), public.t_id('campA'), public.t_id('p1'), true);
insert into public.combats (id, session_id, campaign_id, status) values
  (public.t_id('c1'), public.t_id('s1'), public.t_id('campA'), 'active');
insert into public.combat_entries (id, combat_id, campaign_id, kind, user_id, character_id, initiative, position, is_current) values
  (public.t_id('e_p1'), public.t_id('c1'), public.t_id('campA'), 'player', public.t_id('p1'), public.t_id('ch1'), 18, 1, true);
select public.refresh_combat(public.t_id('c1'));

-- ---- player shape (as the table owner: the check itself, not the RPCs)
select is((select defense_label is null and attacks = '[]'::jsonb and xp is null and conditions = '{}'
             from public.combat_entries where id = public.t_id('e_p1')), true, 'a player entry has empty defaults for every new column');
select throws_ok($$update public.combat_entries set defense_label = 'AC' where id = public.t_id('e_p1')$$, '23514', null, 'a player cannot hold a defense label');
select throws_ok($$update public.combat_entries set attacks = '[{"name":"Bite","toHit":"+4","damage":"1d4"}]' where id = public.t_id('e_p1')$$, '23514', null, 'a player cannot hold attacks');
select throws_ok($$update public.combat_entries set xp = 10 where id = public.t_id('e_p1')$$, '23514', null, 'a player cannot hold xp');
select throws_ok($$update public.combat_entries set conditions = '{prone}' where id = public.t_id('e_p1')$$, '23514', null, 'a player cannot hold conditions');

set local role authenticated;
select public.t_as('gm');

-- ---- add_enemies
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Wolf', 2, 11, 12, 13, null, false,
  'AC', '[{"name":"Bite","toHit":"+4","damage":"2d4+2"}]'::jsonb, 50)$$, 'add with defense label, attacks and xp');
select is((select count(*)::int from public.combat_entries where combat_id = public.t_id('c1') and name like 'Wolf %'
            and defense_label = 'AC' and xp = 50 and attacks = '[{"name":"Bite","toHit":"+4","damage":"2d4+2"}]'::jsonb), 2, 'every copy stores all three');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Rat', 1, 4, 5, 10, null, false)$$, 'the old 8-argument call still works');
select is((select defense_label is null and attacks = '[]'::jsonb and xp is null and conditions = '{}'
             from public.combat_entries where combat_id = public.t_id('c1') and name = 'Rat'), true, 'omitted card fields default to null / empty');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Blank', 1, 4, 5, 10, null, false, '   ', null, null)$$, 'a blank label and null attacks are accepted');
select is((select defense_label is null and attacks = '[]'::jsonb from public.combat_entries
            where combat_id = public.t_id('c1') and name = 'Blank'), true, 'blank label stores null, null attacks store []');

select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 1, 1, null, false, null,
  '[{"name":"a"},{"name":"b"},{"name":"c"},{"name":"d"},{"name":"e"},{"name":"f"},{"name":"g"}]'::jsonb, null)$$, 'P0001', 'invalid_enemy', 'seven attacks');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 1, 1, null, false, null, '{"name":"Bite"}'::jsonb, null)$$, 'P0001', 'invalid_enemy', 'attacks must be an array');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 1, 1, null, false, null, null, -1)$$, 'P0001', 'invalid_enemy', 'negative xp');
select throws_ok($$select public.add_enemies(public.t_id('c1'), 'X', 1, 5, 1, 1, null, false, repeat('x', 13), null, null)$$, 'P0001', 'invalid_enemy', 'a 13-character defense label');
select lives_ok($$select public.add_enemies(public.t_id('c1'), 'Six', 1, 5, 1, 1, null, false, null,
  '[{"name":"a"},{"name":"b"},{"name":"c"},{"name":"d"},{"name":"e"},{"name":"f"}]'::jsonb, 0)$$, 'six attacks and xp 0 are the limits');

-- ---- update_enemy
select lives_ok($$select public.update_enemy(public.t_eid('Rat'), '{"xp": 75}')$$, 'patch xp');
select is((select xp from public.combat_entries where id = public.t_eid('Rat')), 75, 'xp changed');
select lives_ok($$select public.update_enemy(public.t_eid('Rat'), '{"defense_label": "Def", "attacks": [{"name":"Nip","toHit":"+1","damage":"1"}], "conditions": ["prone","poisoned"]}')$$, 'patch label, attacks and conditions');
select is((select defense_label || '|' || (attacks -> 0 ->> 'name') || '|' || array_to_string(conditions, ',')
             from public.combat_entries where id = public.t_eid('Rat')), 'Def|Nip|prone,poisoned', 'all three changed');
select is((select xp from public.combat_entries where id = public.t_eid('Rat')), 75, 'untouched xp stays');
select lives_ok($$select public.update_enemy(public.t_eid('Rat'), '{"xp": null, "defense_label": null, "attacks": [], "conditions": []}')$$, 'patch back to empty');
select is((select defense_label is null and xp is null and attacks = '[]'::jsonb and conditions = '{}'
             from public.combat_entries where id = public.t_eid('Rat')), true, 'cleared');
select throws_ok($$select public.update_enemy(public.t_eid('Rat'), '{"xp": -1}')$$, 'P0001', 'invalid_enemy', 'patch negative xp');
select throws_ok($$select public.update_enemy(public.t_eid('Rat'), '{"xp": "ten"}')$$, 'P0001', 'invalid_patch', 'patch xp of the wrong type');
select throws_ok($$select public.update_enemy(public.t_eid('Rat'), '{"conditions": "prone"}')$$, 'P0001', 'invalid_patch', 'conditions must be an array');
select throws_ok($$select public.update_enemy(public.t_eid('Rat'), '{"conditions": [1]}')$$, 'P0001', 'invalid_patch', 'conditions must be strings');
select throws_ok($$select public.update_enemy(public.t_eid('Rat'), jsonb_build_object('conditions', (select jsonb_agg('c' || g) from generate_series(1, 13) g)))$$, 'P0001', 'invalid_enemy', 'thirteen conditions');
select throws_ok($$select public.update_enemy(public.t_eid('Rat'), jsonb_build_object('conditions', jsonb_build_array(repeat('x', 31))))$$, 'P0001', 'invalid_enemy', 'a 31-character condition');

-- ---- privacy: the existing GM-only RLS covers the new columns
select public.t_as('p1');
select is((select count(*)::int from public.combat_entries where kind = 'enemy'), 0, 'a player reads no enemy entry, so none of the card fields');

select * from finish();
rollback;
