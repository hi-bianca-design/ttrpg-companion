-- Encounters and their enemies are GM only: the GM reads and writes them, an active non-GM member
-- and a non-member see nothing and cannot insert. Shape checks (count 1..20, attacks <= 6) hold.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temp table k (name text primary key, id uuid not null default gen_random_uuid());
insert into k (name) values ('gm'), ('p1'), ('out'), ('campA'), ('ch1'), ('enc1'), ('en1');
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
select id, name || '@enc.local', json_build_object('username', 'enc_' || name)::jsonb
  from k where name in ('gm', 'p1', 'out');
insert into public.characters (id, owner_id, system_id, name) values (public.t_id('ch1'), public.t_id('p1'), 'dnd5e-2024', 'P1');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  (public.t_id('campA'), 'dnd5e-2024', public.t_id('gm'), 'Enc A', 'ENCAAA');
insert into public.campaign_members (campaign_id, user_id, role, character_id, status) values
  (public.t_id('campA'), public.t_id('gm'), 'gm', null, 'active'),
  (public.t_id('campA'), public.t_id('p1'), 'player', public.t_id('ch1'), 'active');

set local role authenticated;

-- ---- the GM
select public.t_as('gm');
select lives_ok($$insert into public.encounters (id, campaign_id, name, story_before, story_why, story_after)
  values (public.t_id('enc1'), public.t_id('campA'), 'Wolf ambush', 'before', 'why', 'after')$$, 'the GM inserts an encounter');
select lives_ok($$insert into public.encounter_enemies (id, encounter_id, campaign_id, name, count, max_hp, defense_label, ac, attacks, xp, notes, hidden, position)
  values (public.t_id('en1'), public.t_id('enc1'), public.t_id('campA'), 'Wolf', 3, 11, 'AC', 13,
          '[{"name":"Bite","toHit":"+4","damage":"2d4+2"}]'::jsonb, 50, 'pack tactics', false, 1)$$, 'the GM inserts an enemy');
select is((select count(*)::int from public.encounters), 1, 'the GM reads the encounter');
select is((select count(*)::int from public.encounter_enemies), 1, 'the GM reads the enemy');
select lives_ok($$update public.encounters set name = 'Wolf ambush 2' where id = public.t_id('enc1')$$, 'the GM updates an encounter');
select isnt((select updated_at from public.encounters where id = public.t_id('enc1')), null, 'updated_at is set');

-- ---- shape checks
select throws_ok($$insert into public.encounter_enemies (encounter_id, campaign_id, name, count, max_hp, position)
  values (public.t_id('enc1'), public.t_id('campA'), 'Rat', 21, 4, 2)$$, '23514', null, 'count = 21 is rejected');
select throws_ok($$insert into public.encounter_enemies (encounter_id, campaign_id, name, count, max_hp, position)
  values (public.t_id('enc1'), public.t_id('campA'), 'Rat', 0, 4, 2)$$, '23514', null, 'count = 0 is rejected');
select throws_ok($$insert into public.encounter_enemies (encounter_id, campaign_id, name, count, max_hp, attacks, position)
  values (public.t_id('enc1'), public.t_id('campA'), 'Rat', 1, 4, '[1,2,3,4,5,6,7]'::jsonb, 2)$$, '23514', null, 'seven attacks are rejected');
select throws_ok($$insert into public.encounter_enemies (encounter_id, campaign_id, name, count, max_hp, attacks, position)
  values (public.t_id('enc1'), public.t_id('campA'), 'Rat', 1, 4, '{}'::jsonb, 2)$$, '23514', null, 'attacks must be an array');

-- ---- an active non-GM member
select public.t_as('p1');
select is((select count(*)::int from public.encounters), 0, 'a player selects no encounters');
select is((select count(*)::int from public.encounter_enemies), 0, 'a player selects no encounter enemies');
select throws_ok($$insert into public.encounters (campaign_id, name) values (public.t_id('campA'), 'Sneaky')$$, '42501', null, 'a player cannot insert an encounter');
select throws_ok($$insert into public.encounter_enemies (encounter_id, campaign_id, name, count, max_hp, position)
  values (public.t_id('enc1'), public.t_id('campA'), 'Sneaky', 1, 4, 3)$$, '42501', null, 'a player cannot insert an enemy');

-- ---- a non-member
select public.t_as('out');
select is((select count(*)::int from public.encounters) + (select count(*)::int from public.encounter_enemies), 0, 'a non-member sees nothing');

-- ---- cascade (back as the GM)
select public.t_as('gm');
delete from public.encounters where id = public.t_id('enc1');
select is((select count(*)::int from public.encounter_enemies), 0, 'deleting an encounter deletes its enemies');
select is((select count(*)::int from public.encounters), 0, 'the encounter is gone');

select * from finish();
rollback;
