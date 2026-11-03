-- Enemy RPCs (GM only). Error codes (P0001): not_authenticated, not_member, no_active_combat,
-- not_allowed, invalid_enemy, invalid_initiative, invalid_patch, invalid_target, invalid_mode,
-- invalid_amount. Entry-id RPCs use combat_lock_for_entry (see the turns migration), so a
-- non-GM learns nothing about an entry id. Hit-point changes are not part of the player
-- projection and never write the `combats` row.

-- GM only. Adds count copies of an enemy ("Goblin 1..N", numbered after the highest existing
-- "Goblin k" in this combat), sharing one group and one initiative. hp starts at max_hp.
-- Allowed while rolling and while active; each copy is placed by the initiative rule, so the
-- turn pointer never moves.
create or replace function public.add_enemies(
  p_combat_id uuid, p_name text, p_count int, p_max_hp int, p_initiative int,
  p_ac int, p_notes text, p_hidden boolean
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
     or (v_notes is not null and char_length(v_notes) > 500) then
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
      (combat_id, campaign_id, kind, name, max_hp, hp, ac, notes, hidden, group_id, initiative, position)
    values (v_c.id, v_c.campaign_id, 'enemy',
            case when p_count = 1 then v_name else v_name || ' ' || (v_k + i)::text end,
            p_max_hp, p_max_hp, p_ac, v_notes, coalesce(p_hidden, false), v_group, p_initiative, v_n + 1)
    returning id into v_id;
    perform public.combat_place_entry(
      v_c.id, v_id, public.combat_insert_position(v_c.id, p_initiative, v_id));
    v_ids := v_ids || v_id;
  end loop;

  perform public.refresh_combat(v_c.id);
  return v_ids;
end;
$$;

-- GM only. Patch keys: name, max_hp, hp, ac, notes, hidden (anything else is invalid_patch).
-- Lowering max_hp clamps hp; hp is clamped to 0..max_hp. A typed hp or max_hp correction
-- forgets the row's last damage batch, so an older undo cannot overwrite it.
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
begin
  select * into v_e from public.combat_entries where id = p_entry_id and combat_id = v_c.id;
  if not found or v_e.kind <> 'enemy' then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_patch' using errcode = 'P0001';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('name', 'max_hp', 'hp', 'ac', 'notes', 'hidden') then
      raise exception 'invalid_patch' using errcode = 'P0001';
    end if;
  end loop;
  if (p_patch ? 'name' and jsonb_typeof(p_patch -> 'name') <> 'string')
     or (p_patch ? 'max_hp' and jsonb_typeof(p_patch -> 'max_hp') <> 'number')
     or (p_patch ? 'hp' and jsonb_typeof(p_patch -> 'hp') <> 'number')
     or (p_patch ? 'ac' and jsonb_typeof(p_patch -> 'ac') not in ('number', 'null'))
     or (p_patch ? 'notes' and jsonb_typeof(p_patch -> 'notes') not in ('string', 'null'))
     or (p_patch ? 'hidden' and jsonb_typeof(p_patch -> 'hidden') <> 'boolean') then
    raise exception 'invalid_patch' using errcode = 'P0001';
  end if;
  if (p_patch ? 'max_hp' and (p_patch ->> 'max_hp') !~ '^-?[0-9]{1,9}$')
     or (p_patch ? 'hp' and (p_patch ->> 'hp') !~ '^-?[0-9]{1,9}$')
     or (p_patch ? 'ac' and jsonb_typeof(p_patch -> 'ac') = 'number' and (p_patch ->> 'ac') !~ '^-?[0-9]{1,9}$') then
    raise exception 'invalid_enemy' using errcode = 'P0001';
  end if;

  v_name := case when p_patch ? 'name' then btrim(p_patch ->> 'name') else v_e.name end;
  v_max := case when p_patch ? 'max_hp' then (p_patch ->> 'max_hp')::int else v_e.max_hp end;
  v_ac := case when p_patch ? 'ac' then (p_patch ->> 'ac')::int else v_e.ac end;
  v_notes := case when p_patch ? 'notes' then nullif(btrim(coalesce(p_patch ->> 'notes', '')), '') else v_e.notes end;
  v_hidden := case when p_patch ? 'hidden' then (p_patch ->> 'hidden')::boolean else v_e.hidden end;
  if char_length(v_name) not between 1 and 60
     or v_max < 1
     or (v_ac is not null and v_ac not between 0 and 40)
     or (v_notes is not null and char_length(v_notes) > 500) then
    raise exception 'invalid_enemy' using errcode = 'P0001';
  end if;
  v_hp := case when p_patch ? 'hp' then (p_patch ->> 'hp')::int else v_e.hp end;
  v_hp := greatest(0, least(v_hp, v_max));
  v_batch := case when p_patch ? 'hp' or p_patch ? 'max_hp' then null else v_e.last_batch end;

  update public.combat_entries
     set name = v_name, max_hp = v_max, hp = v_hp, ac = v_ac, notes = v_notes,
         hidden = v_hidden, last_batch = v_batch
   where id = p_entry_id;

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- GM only. Enemies only. Removing the current entry first advances the turn (wrap rule).
create or replace function public.remove_entry(p_entry_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.combat_lock_for_entry(p_entry_id);
begin
  if not exists (
    select 1 from public.combat_entries where id = p_entry_id and combat_id = v_c.id and kind = 'enemy'
  ) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  perform public.combat_delete_entries(v_c.id, array[p_entry_id]);

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- GM only. Applies one amount to every listed enemy, as a delta under the combat lock, and
-- returns a batch id for undo. All ids must be enemy entries of this combat or nothing is
-- applied. The arithmetic mirrors adjustPool/setTemp in src/systems/resources.ts; keep the two
-- in step:
--   damage: temp hit points absorb first, the rest comes off hp, floor 0
--   heal:   hp + amount, capped at max_hp; temp hit points are unchanged
--   temp:   keeps the larger of the old and new value
-- Not part of the player projection: this never writes the `combats` row.
create or replace function public.apply_enemy_hp(p_combat_id uuid, p_entry_ids uuid[], p_mode text, p_amount int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_batch uuid := gen_random_uuid();
  v_ids uuid[];
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_mode is null or p_mode not in ('damage', 'heal', 'temp') then
    raise exception 'invalid_mode' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select array_agg(distinct x) into v_ids from unnest(coalesce(p_entry_ids, '{}')) x;
  if v_ids is null
     or (select count(*) from public.combat_entries e
          where e.id = any (v_ids) and e.combat_id = v_c.id and e.kind = 'enemy') <> cardinality(v_ids) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  update public.combat_entries e
     set prev_hp = e.hp,
         prev_temp = e.temp_hp,
         last_batch = v_batch,
         hp = case p_mode
                when 'damage' then greatest(0, (e.hp::bigint - (p_amount - least(e.temp_hp, p_amount)))::int)
                when 'heal' then least(e.max_hp::bigint, e.hp::bigint + p_amount)::int
                else e.hp end,
         temp_hp = case p_mode
                when 'damage' then e.temp_hp - least(e.temp_hp, p_amount)
                when 'temp' then greatest(e.temp_hp, p_amount)
                else e.temp_hp end
   where e.id = any (v_ids) and e.combat_id = v_c.id;

  return v_batch;
end;
$$;

-- GM only. Restores hp and temp hp of the rows whose latest change is still this batch;
-- rows changed since are left alone. Returns how many rows were restored.
create or replace function public.undo_enemy_hp(p_combat_id uuid, p_batch uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_n int;
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  update public.combat_entries
     set hp = prev_hp, temp_hp = prev_temp, last_batch = null
   where combat_id = v_c.id and last_batch = p_batch;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.add_enemies(uuid, text, int, int, int, int, text, boolean) from public, anon;
revoke execute on function public.update_enemy(uuid, jsonb) from public, anon;
revoke execute on function public.remove_entry(uuid) from public, anon;
revoke execute on function public.apply_enemy_hp(uuid, uuid[], text, int) from public, anon;
revoke execute on function public.undo_enemy_hp(uuid, uuid) from public, anon;
grant execute on function public.add_enemies(uuid, text, int, int, int, int, text, boolean) to authenticated, service_role;
grant execute on function public.update_enemy(uuid, jsonb) to authenticated, service_role;
grant execute on function public.remove_entry(uuid) to authenticated, service_role;
grant execute on function public.apply_enemy_hp(uuid, uuid[], text, int) to authenticated, service_role;
grant execute on function public.undo_enemy_hp(uuid, uuid) to authenticated, service_role;
