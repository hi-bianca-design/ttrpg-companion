-- Enemy card fields (GM only, like the rest of combat_entries): the label shown beside the
-- defense number, up to six attacks, the XP it is worth, and its condition chips. Players never
-- see any of it: combat_order and refresh_combat are untouched, and a player entry must keep
-- every new column at its default.
--
--   defense_label  text           <= 12 characters (e.g. 'AC'), null when unset
--   attacks        jsonb          array of at most 6 { name, toHit, damage } objects
--   xp             int            >= 0, null when unset
--   conditions     text[]         at most 12 entries of 1..30 characters

-- Every entry of a conditions array is 1..30 characters and there are at most 12. A check
-- constraint cannot hold a subquery, so this lives in a function.
create function public.combat_conditions_ok(p_conditions text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_conditions) <= 12
     and coalesce((select bool_and(c is not null and char_length(c) between 1 and 30)
                     from unnest(p_conditions) c), true)
$$;

alter table public.combat_entries
  add column defense_label text,
  add column attacks jsonb not null default '[]'::jsonb,
  add column xp int,
  add column conditions text[] not null default '{}';

alter table public.combat_entries
  add constraint combat_entries_defense_label_len check (defense_label is null or char_length(defense_label) between 1 and 12),
  add constraint combat_entries_attacks_shape check (jsonb_typeof(attacks) = 'array' and jsonb_array_length(attacks) <= 6),
  add constraint combat_entries_xp_nonneg check (xp is null or xp >= 0),
  add constraint combat_entries_conditions_shape check (public.combat_conditions_ok(conditions));

alter table public.combat_entries drop constraint combat_entries_player_shape;
alter table public.combat_entries
  add constraint combat_entries_player_shape check (
    kind <> 'player' or (
      user_id is not null and character_id is not null
      and name is null and max_hp is null and hp is null and ac is null and notes is null
      and defense_label is null and attacks = '[]'::jsonb and xp is null and conditions = '{}'
    )
  );

-- GM only. Same as before, plus the card fields. The three new parameters default so existing
-- eight-argument callers keep working; a blank label is stored as null and null attacks as [].
drop function public.add_enemies(uuid, text, int, int, int, int, text, boolean);
create function public.add_enemies(
  p_combat_id uuid, p_name text, p_count int, p_max_hp int, p_initiative int,
  p_ac int, p_notes text, p_hidden boolean,
  p_defense_label text default null, p_attacks jsonb default '[]'::jsonb, p_xp int default null
)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_name text := btrim(coalesce(p_name, ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_label text := nullif(btrim(coalesce(p_defense_label, '')), '');
  v_attacks jsonb := coalesce(p_attacks, '[]'::jsonb);
  v_k int := 0;
  v_group uuid;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_n int;
  i int;
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_count is null or p_count < 1 or p_count > 20
     or char_length(v_name) not between 1 and 60
     or p_max_hp is null or p_max_hp < 1
     or (p_ac is not null and p_ac not between 0 and 40)
     or (v_notes is not null and char_length(v_notes) > 500)
     or (v_label is not null and char_length(v_label) > 12)
     or jsonb_typeof(v_attacks) <> 'array' or jsonb_array_length(v_attacks) > 6
     or (p_xp is not null and p_xp < 0) then
    raise exception 'invalid_enemy' using errcode = 'P0001';
  end if;
  if p_initiative is not null and p_initiative not between -20 and 99 then
    raise exception 'invalid_initiative' using errcode = 'P0001';
  end if;

  if p_count > 1 then
    select coalesce(max(substr(e.name, char_length(v_name) + 2)::int), 0) into v_k
      from public.combat_entries e
     where e.combat_id = v_c.id and e.kind = 'enemy'
       and left(e.name, char_length(v_name) + 1) = v_name || ' '
       and substr(e.name, char_length(v_name) + 2) ~ '^[0-9]{1,9}$';
    if char_length(v_name || ' ' || (v_k + p_count)::text) > 60 then
      raise exception 'invalid_enemy' using errcode = 'P0001';
    end if;
    v_group := gen_random_uuid();
  end if;

  for i in 1..p_count loop
    select count(*)::int into v_n from public.combat_entries where combat_id = v_c.id;
    insert into public.combat_entries
      (combat_id, campaign_id, kind, name, max_hp, hp, ac, notes, hidden, group_id, initiative, position,
       defense_label, attacks, xp)
    values (v_c.id, v_c.campaign_id, 'enemy',
            case when p_count = 1 then v_name else v_name || ' ' || (v_k + i)::text end,
            p_max_hp, p_max_hp, p_ac, v_notes, coalesce(p_hidden, false), v_group, p_initiative, v_n + 1,
            v_label, v_attacks, p_xp)
    returning id into v_id;
    perform public.combat_place_entry(
      v_c.id, v_id, public.combat_insert_position(v_c.id, p_initiative, v_id));
    v_ids := v_ids || v_id;
  end loop;

  perform public.refresh_combat(v_c.id);
  return v_ids;
end;
$$;

-- GM only. Patch keys: name, max_hp, hp, ac, notes, hidden, defense_label, attacks, xp,
-- conditions (anything else is invalid_patch). Lowering max_hp clamps hp; hp is clamped to
-- 0..max_hp. A typed hp or max_hp correction forgets the row's last damage batch, so an older
-- undo cannot overwrite it.
create or replace function public.update_enemy(p_entry_id uuid, p_patch jsonb)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.combat_lock_for_entry(p_entry_id);
  v_e public.combat_entries;
  v_key text;
  v_name text;
  v_max int;
  v_hp int;
  v_ac int;
  v_notes text;
  v_hidden boolean;
  v_batch uuid;
  v_label text;
  v_attacks jsonb;
  v_xp int;
  v_conditions text[];
begin
  select * into v_e from public.combat_entries where id = p_entry_id and combat_id = v_c.id;
  if not found or v_e.kind <> 'enemy' then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_patch' using errcode = 'P0001';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('name', 'max_hp', 'hp', 'ac', 'notes', 'hidden', 'defense_label', 'attacks', 'xp', 'conditions') then
      raise exception 'invalid_patch' using errcode = 'P0001';
    end if;
  end loop;
  if (p_patch ? 'name' and jsonb_typeof(p_patch -> 'name') <> 'string')
     or (p_patch ? 'max_hp' and jsonb_typeof(p_patch -> 'max_hp') <> 'number')
     or (p_patch ? 'hp' and jsonb_typeof(p_patch -> 'hp') <> 'number')
     or (p_patch ? 'ac' and jsonb_typeof(p_patch -> 'ac') not in ('number', 'null'))
     or (p_patch ? 'notes' and jsonb_typeof(p_patch -> 'notes') not in ('string', 'null'))
     or (p_patch ? 'hidden' and jsonb_typeof(p_patch -> 'hidden') <> 'boolean')
     or (p_patch ? 'defense_label' and jsonb_typeof(p_patch -> 'defense_label') not in ('string', 'null'))
     or (p_patch ? 'attacks' and jsonb_typeof(p_patch -> 'attacks') <> 'array')
     or (p_patch ? 'xp' and jsonb_typeof(p_patch -> 'xp') not in ('number', 'null'))
     or (p_patch ? 'conditions' and jsonb_typeof(p_patch -> 'conditions') <> 'array') then
    raise exception 'invalid_patch' using errcode = 'P0001';
  end if;
  -- Every condition is a string (checked after the array type check above, so it never runs on a non-array).
  if p_patch ? 'conditions'
     and exists (select 1 from jsonb_array_elements(p_patch -> 'conditions') c where jsonb_typeof(c) <> 'string') then
    raise exception 'invalid_patch' using errcode = 'P0001';
  end if;
  if (p_patch ? 'max_hp' and (p_patch ->> 'max_hp') !~ '^-?[0-9]{1,9}$')
     or (p_patch ? 'hp' and (p_patch ->> 'hp') !~ '^-?[0-9]{1,9}$')
     or (p_patch ? 'ac' and jsonb_typeof(p_patch -> 'ac') = 'number' and (p_patch ->> 'ac') !~ '^-?[0-9]{1,9}$')
     or (p_patch ? 'xp' and jsonb_typeof(p_patch -> 'xp') = 'number' and (p_patch ->> 'xp') !~ '^-?[0-9]{1,9}$') then
    raise exception 'invalid_enemy' using errcode = 'P0001';
  end if;

  v_name := case when p_patch ? 'name' then btrim(p_patch ->> 'name') else v_e.name end;
  v_max := case when p_patch ? 'max_hp' then (p_patch ->> 'max_hp')::int else v_e.max_hp end;
  v_ac := case when p_patch ? 'ac' then (p_patch ->> 'ac')::int else v_e.ac end;
  v_notes := case when p_patch ? 'notes' then nullif(btrim(coalesce(p_patch ->> 'notes', '')), '') else v_e.notes end;
  v_hidden := case when p_patch ? 'hidden' then (p_patch ->> 'hidden')::boolean else v_e.hidden end;
  v_label := case when p_patch ? 'defense_label' then nullif(btrim(coalesce(p_patch ->> 'defense_label', '')), '') else v_e.defense_label end;
  v_attacks := case when p_patch ? 'attacks' then p_patch -> 'attacks' else v_e.attacks end;
  v_xp := case when p_patch ? 'xp' then (p_patch ->> 'xp')::int else v_e.xp end;
  v_conditions := case when p_patch ? 'conditions'
                       then coalesce(array(select jsonb_array_elements_text(p_patch -> 'conditions')), '{}')
                       else v_e.conditions end;
  if char_length(v_name) not between 1 and 60
     or v_max < 1
     or (v_ac is not null and v_ac not between 0 and 40)
     or (v_notes is not null and char_length(v_notes) > 500)
     or (v_label is not null and char_length(v_label) > 12)
     or jsonb_array_length(v_attacks) > 6
     or (v_xp is not null and v_xp < 0)
     or not public.combat_conditions_ok(v_conditions) then
    raise exception 'invalid_enemy' using errcode = 'P0001';
  end if;
  v_hp := case when p_patch ? 'hp' then (p_patch ->> 'hp')::int else v_e.hp end;
  v_hp := greatest(0, least(v_hp, v_max));
  v_batch := case when p_patch ? 'hp' or p_patch ? 'max_hp' then null else v_e.last_batch end;

  update public.combat_entries
     set name = v_name, max_hp = v_max, hp = v_hp, ac = v_ac, notes = v_notes,
         hidden = v_hidden, last_batch = v_batch,
         defense_label = v_label, attacks = v_attacks, xp = v_xp, conditions = v_conditions
   where id = p_entry_id;

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

revoke execute on function public.combat_conditions_ok(text[]) from public, anon;
grant execute on function public.combat_conditions_ok(text[]) to authenticated, service_role;
revoke execute on function public.add_enemies(uuid, text, int, int, int, int, text, boolean, text, jsonb, int) from public, anon;
grant execute on function public.add_enemies(uuid, text, int, int, int, int, text, boolean, text, jsonb, int) to authenticated, service_role;
