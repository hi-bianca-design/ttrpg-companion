-- Dev-only: fills a campaign with fake players so the GM page and Party page can be tested.
-- NOT a migration and not run by `supabase db reset`. Run it yourself against a LOCAL or DEV
-- database only, never production:
--   psql "$DEV_DATABASE_URL" -v campaign_name='The Lost Mine' -f supabase/dev/seed-test-party.sql
-- The campaign must already exist and use dnd5e-2024. Re-running is safe: everything is
-- keyed on fixed ids and the fake accounts cannot sign in (no password).
-- Remove it all:  delete from auth.users where email like '%@seed.local';

select set_config('seed.campaign', :'campaign_name', false);

begin;

do $$
declare
  cid uuid;
  u uuid;
  ch uuid;
  r record;
  cls uuid;
begin
  select id into cid from public.campaigns
   where name = current_setting('seed.campaign') and system_id = 'dnd5e-2024' limit 1;
  if cid is null then
    raise exception 'No dnd5e-2024 campaign named %', current_setting('seed.campaign');
  end if;

  for r in select * from (values
    (1, 'Mira Vance',     'rogue',    3, 22, 24, '{}'::text[],              '{"strength":8,"dexterity":17,"constitution":12,"intelligence":13,"wisdom":10,"charisma":14}'),
    (2, 'Torin Ashgrove', 'fighter',  3, 9,  31, '{prone}'::text[],         '{"strength":17,"dexterity":12,"constitution":15,"intelligence":8,"wisdom":10,"charisma":11}'),
    (3, 'Ash Brightwater','cleric',   3, 4,  24, '{frightened,poisoned}',   '{"strength":10,"dexterity":10,"constitution":14,"intelligence":10,"wisdom":17,"charisma":12}'),
    (4, 'Pip Thistledown','wizard',   3, 18, 18, '{}'::text[],              '{"strength":8,"dexterity":14,"constitution":12,"intelligence":17,"wisdom":12,"charisma":10}')
  ) as t(n, name, class_slug, level, hp, hp_max, conds, stats)
  loop
    u  := ('5eed0000-0000-0000-0000-00000000000' || r.n)::uuid;
    ch := ('5eed1000-0000-0000-0000-00000000000' || r.n)::uuid;

    insert into auth.users (id, email, raw_user_meta_data)
    values (u, 'seed' || r.n || '@seed.local', jsonb_build_object('username', 'seed_player_' || r.n))
    on conflict (id) do nothing;

    insert into public.characters (id, owner_id, system_id, name, level, stats, resources, conditions, details)
    values (ch, u, 'dnd5e-2024', r.name, r.level, r.stats::jsonb,
      jsonb_build_object(
        'hp', jsonb_build_object('current', r.hp, 'max', r.hp_max),
        'spell_slots', jsonb_build_object('tiers', '{}'::jsonb),
        'hit_dice', jsonb_build_object('current', r.level, 'max', r.level),
        'death_saves_success', jsonb_build_object('tiers', jsonb_build_object('1', jsonb_build_object('max', 3, 'used', 0))),
        'death_saves_failure', jsonb_build_object('tiers', jsonb_build_object('1', jsonb_build_object('max', 3, 'used', 0)))),
      r.conds, '{}'::jsonb)
    on conflict (id) do update
      set name = excluded.name, level = excluded.level, resources = excluded.resources, conditions = excluded.conditions;

    select id into cls from public.content
     where system_id = 'dnd5e-2024' and kind = 'class' and slug = r.class_slug and owner_id is null limit 1;
    if cls is not null then
      insert into public.character_picks (character_id, content_id, kind, acquired_at_level)
      values (ch, cls, 'class', 1) on conflict do nothing;
    end if;

    insert into public.campaign_members (campaign_id, user_id, role, character_id, status)
    values (cid, u, 'player', ch, 'active')
    on conflict (campaign_id, user_id) do update set character_id = excluded.character_id, status = 'active';
  end loop;
end $$;

commit;
