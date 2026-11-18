-- save_encounter: atomic create/replace of an encounter and its enemies, GM only.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(32);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('out'), ('gm2'), ('campA'), ('campB'), ('ch1'), ('encB');
grant all on k to authenticated;

create function public.t_id(p_name text) returns uuid language sql security definer set search_path = '' as $$
  select id from pg_temp.k where name = p_name
$$;
create function public.t_as(p_name text) returns void language sql security definer set search_path = '' as $$
  select set_config('request.jwt.claims', case when p_name is null then '{}'
    else json_build_object('sub', (select id from pg_temp.k where name = p_name), 'role', 'authenticated')::text end, true)
$$;
grant execute on function public.t_id(text), public.t_as(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
select id, name || '@se.local', json_build_object('username', 'se_' || name)::jsonb
  from k where name in ('gm', 'p1', 'out', 'gm2');
insert into public.characters (id, owner_id, system_id, name) values (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'P1');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'SE A', 'SEAAAA'),
  (public.t_id('campB'), 'dnd5e-2024', public.t_id('gm2'), 'SE B', 'SEBBBB');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active'),
  (public.t_id('campB'), public.t_id('gm2'), 'gm', null, 'active');
-- an encounter in campaign B, to prove campaign A's GM cannot touch it
insert into public.encounters (id, campaign_id, name) values (public.t_id('encB'), public.t_id('campB'), 'Other camp');

-- the GM's own saves land in k so later tests can find them
create function public.t_keep(p_name text, p_id uuid) returns uuid language sql security definer set search_path = '' as $$
  insert into pg_temp.k (name, id) values (p_name, p_id) on conflict (name) do update set id = excluded.id returning id
$$;
grant execute on function public.t_keep(text, uuid) to authenticated;

set local role authenticated;

-- ---- surface
select is((select prosecdef from pg_proc where oid = 'public.save_encounter(uuid,uuid,text,text,text,text,jsonb)'::regprocedure), true, 'save_encounter is security definer');
select is(has_function_privilege('anon', 'public.save_encounter(uuid,uuid,text,text,text,text,jsonb)', 'execute'), false, 'anon cannot execute it');
select is(has_function_privilege('authenticated', 'public.save_encounter(uuid,uuid,text,text,text,text,jsonb)', 'execute'), true, 'authenticated can execute it');

-- ---- create (GM)
select public.t_as('gm');
select lives_ok($$select public.t_keep('enc1', public.save_encounter(public.t_id('campA'), null, '  Wolf ambush  ', 'before', ' ', 'after',
  '[{"name":"Wolf","count":3,"max_hp":11,"defense_label":"AC","ac":13,"xp":50,"notes":"pack","hidden":false,
     "attacks":[{"name":"Bite","toHit":"+4","damage":"2d4+2"}]},
    {"name":"Alpha","count":1,"max_hp":30,"ac":15,"hidden":true}]'::jsonb))$$, 'the GM creates an encounter with two enemies');
select is((select name from public.encounters where id = public.t_id('enc1')), 'Wolf ambush', 'the name is trimmed');
select is((select story_why from public.encounters where id = public.t_id('enc1')), null, 'a blank story note is stored as null');
select is((select story_before from public.encounters where id = public.t_id('enc1')), 'before', 'a story note is stored');
select is((select string_agg(name || ':' || position, ',' order by position) from public.encounter_enemies where encounter_id = public.t_id('enc1')),
  'Wolf:1,Alpha:2', 'enemies are stored in array order, positions 1..n');
select is((select count from public.encounter_enemies where encounter_id = public.t_id('enc1') and name = 'Wolf'), 3, 'count is stored');
select is((select hidden from public.encounter_enemies where encounter_id = public.t_id('enc1') and name = 'Alpha'), true, 'hidden is stored');
select is((select attacks from public.encounter_enemies where encounter_id = public.t_id('enc1') and name = 'Wolf'),
  '[{"name":"Bite","toHit":"+4","damage":"2d4+2"}]'::jsonb, 'attacks are stored');
select is((select attacks from public.encounter_enemies where encounter_id = public.t_id('enc1') and name = 'Alpha'), '[]'::jsonb, 'missing attacks default to []');
select is((select campaign_id from public.encounter_enemies where encounter_id = public.t_id('enc1') and name = 'Alpha'), public.t_id('campA'), 'enemies carry the campaign id');
select lives_ok($$select public.save_encounter(public.t_id('campA'), null, 'Empty', null, null, null, '[]'::jsonb)$$, 'an encounter with no enemies is allowed');

-- ---- replace (same id, enemies replaced in one go)
select lives_ok($$select public.save_encounter(public.t_id('campA'), public.t_id('enc1'), 'Wolf ambush II', null, 'why', null,
  '[{"name":"Dire wolf","count":1,"max_hp":37,"ac":14}]'::jsonb)$$, 'the GM replaces an encounter');
select is((select count(*)::int from public.encounters where campaign_id = public.t_id('campA') and name = 'Wolf ambush II'), 1, 'it is the same row, renamed');
select is((select story_before from public.encounters where id = public.t_id('enc1')), null, 'replace clears a note that is now null');
select is((select string_agg(name, ',') from public.encounter_enemies where encounter_id = public.t_id('enc1')), 'Dire wolf', 'the old enemies are gone');

-- ---- validation: nothing is written when it fails (atomic)
select throws_ok($$select public.save_encounter(public.t_id('campA'), public.t_id('enc1'), 'Renamed', null, null, null,
  '[{"name":"Ok","count":1,"max_hp":5},{"name":"Bad","count":21,"max_hp":5}]'::jsonb)$$, 'P0001', 'invalid_enemy', 'a bad second enemy is rejected');
select is((select name from public.encounters where id = public.t_id('enc1')), 'Wolf ambush II', 'a failed replace leaves the encounter name alone');
select is((select string_agg(name, ',') from public.encounter_enemies where encounter_id = public.t_id('enc1')), 'Dire wolf', 'a failed replace leaves the enemies alone');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, '   ', null, null, null, '[]'::jsonb)$$, 'P0001', 'invalid_encounter', 'a blank name is rejected');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, repeat('x', 81), null, null, null, '[]'::jsonb)$$, 'P0001', 'invalid_encounter', 'an 81-character name is rejected');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'N', repeat('x', 1001), null, null, '[]'::jsonb)$$, 'P0001', 'invalid_encounter', 'a 1001-character note is rejected');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'N', null, null, null, '{}'::jsonb)$$, 'P0001', 'invalid_enemy', 'enemies must be an array');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'N', null, null, null, '[{"name":"R","count":1,"max_hp":0}]'::jsonb)$$, 'P0001', 'invalid_enemy', 'max_hp 0 is rejected');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'N', null, null, null,
  '[{"name":"R","count":1,"max_hp":4,"attacks":[1,2,3,4,5,6,7]}]'::jsonb)$$, 'P0001', 'invalid_enemy', 'seven attacks are rejected');

select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'N', null, null, null,
  '[{"name":"R","count":1,"max_hp":4,"attacks":[{"name":"Bite","toHit":4,"damage":"1d4"}]}]'::jsonb)$$, 'P0001', 'invalid_enemy', 'an attack with a non-string field is rejected');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'N', null, null, null, '["Wolf"]'::jsonb)$$, 'P0001', 'invalid_enemy', 'an enemy that is not an object is rejected');

-- ---- who may call it
select throws_ok($$select public.save_encounter(public.t_id('campA'), public.t_id('encB'), 'Hijack', null, null, null, '[]'::jsonb)$$, 'P0001', 'not_allowed', 'an encounter of another campaign cannot be replaced through this campaign');
select public.t_as('p1');
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'Sneaky', null, null, null, '[]'::jsonb)$$, 'P0001', 'not_allowed', 'a player cannot save an encounter');
select public.t_as(null);
select throws_ok($$select public.save_encounter(public.t_id('campA'), null, 'Anon', null, null, null, '[]'::jsonb)$$, 'P0001', 'not_allowed', 'a signed-out caller cannot save an encounter');

select * from finish();
rollback;
