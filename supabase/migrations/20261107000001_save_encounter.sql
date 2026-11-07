-- save_encounter: the one atomic write for the GM's "New encounter" form. A null p_encounter_id
-- creates; otherwise the encounter (which must belong to p_campaign_id) is updated and ALL of its
-- enemies are replaced, in the order of the p_enemies array (position = index + 1). Everything runs
-- in the function's single transaction, so a bad enemy leaves nothing half-written.
--
-- GM only (public.is_campaign_gm). Errors are the repo's coded P0001 messages:
--   not_allowed        caller is not this campaign's GM, or the encounter is not in this campaign
--   invalid_encounter  name not 1..80 characters, or a story note over 1000 characters
--   invalid_enemy      p_enemies is not an array of at most 30 objects, or an enemy breaks the table
--                      checks (name 1..60, count 1..20, max_hp >= 1, ac 0..40, xp >= 0, label <= 12,
--                      notes <= 500) or its attacks are not at most 6 { name, toHit, damage } objects
--                      (name 1..60, toHit <= 20, damage <= 40, all strings)
-- Text is trimmed; a blank note, label, or enemy note is stored as null. A missing defense_label
-- stays null (the form sends 'AC' by default). Deleting an encounter is a plain RLS delete.

create function public.save_encounter(
  p_campaign_id uuid, p_encounter_id uuid, p_name text,
  p_story_before text, p_story_why text, p_story_after text, p_enemies jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_before text := nullif(btrim(coalesce(p_story_before, '')), '');
  v_why text := nullif(btrim(coalesce(p_story_why, '')), '');
  v_after text := nullif(btrim(coalesce(p_story_after, '')), '');
  v_id uuid;
  v_e jsonb;
  v_pos int;
  v_count int;
  v_hp int;
  v_ac int;
  v_xp int;
  v_ename text;
  v_notes text;
  v_label text;
  v_hidden boolean;
  v_attacks jsonb;
  v_a jsonb;
  v_attack_list jsonb;
  v_aname text;
  v_tohit text;
  v_damage text;
begin
  if p_campaign_id is null or not public.is_campaign_gm(p_campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 1 and 80
     or char_length(v_before) > 1000 or char_length(v_why) > 1000 or char_length(v_after) > 1000 then
    raise exception 'invalid_encounter' using errcode = 'P0001';
  end if;
  if p_enemies is null or jsonb_typeof(p_enemies) <> 'array' or jsonb_array_length(p_enemies) > 30 then
    raise exception 'invalid_enemy' using errcode = 'P0001';
  end if;

  if p_encounter_id is null then
    insert into public.encounters (campaign_id, name, story_before, story_why, story_after)
    values (p_campaign_id, v_name, v_before, v_why, v_after)
    returning id into v_id;
  else
    -- lock the row so two saves of one encounter cannot interleave their enemy replacement
    select id into v_id from public.encounters
     where id = p_encounter_id and campaign_id = p_campaign_id for update;
    if not found then
      raise exception 'not_allowed' using errcode = 'P0001';
    end if;
    update public.encounters
       set name = v_name, story_before = v_before, story_why = v_why, story_after = v_after
     where id = v_id;
    delete from public.encounter_enemies where encounter_id = v_id;
  end if;

  v_pos := 0;
  for v_e in select value from jsonb_array_elements(p_enemies) loop
    v_pos := v_pos + 1;
    if jsonb_typeof(v_e) <> 'object' then
      raise exception 'invalid_enemy' using errcode = 'P0001';
    end if;
    -- type checks first, so no cast below can raise a raw cast error
    if jsonb_typeof(v_e -> 'name') is distinct from 'string'
       or (v_e ? 'count' and jsonb_typeof(v_e -> 'count') <> 'number')
       or jsonb_typeof(v_e -> 'max_hp') is distinct from 'number'
       or (v_e ? 'ac' and jsonb_typeof(v_e -> 'ac') not in ('number', 'null'))
       or (v_e ? 'xp' and jsonb_typeof(v_e -> 'xp') not in ('number', 'null'))
       or (v_e ? 'defense_label' and jsonb_typeof(v_e -> 'defense_label') not in ('string', 'null'))
       or (v_e ? 'notes' and jsonb_typeof(v_e -> 'notes') not in ('string', 'null'))
       or (v_e ? 'hidden' and jsonb_typeof(v_e -> 'hidden') not in ('boolean', 'null'))
       or (v_e ? 'attacks' and jsonb_typeof(v_e -> 'attacks') not in ('array', 'null')) then
      raise exception 'invalid_enemy' using errcode = 'P0001';
    end if;
    if (v_e ? 'count' and (v_e ->> 'count') !~ '^[0-9]{1,9}$')
       or (v_e ->> 'max_hp') !~ '^[0-9]{1,9}$'
       or (jsonb_typeof(v_e -> 'ac') = 'number' and (v_e ->> 'ac') !~ '^[0-9]{1,9}$')
       or (jsonb_typeof(v_e -> 'xp') = 'number' and (v_e ->> 'xp') !~ '^[0-9]{1,9}$') then
      raise exception 'invalid_enemy' using errcode = 'P0001';
    end if;

    v_ename := btrim(v_e ->> 'name');
    v_count := coalesce((v_e ->> 'count')::int, 1);
    v_hp := (v_e ->> 'max_hp')::int;
    v_ac := (v_e ->> 'ac')::int;
    v_xp := (v_e ->> 'xp')::int;
    v_label := nullif(btrim(coalesce(v_e ->> 'defense_label', '')), '');
    v_notes := nullif(btrim(coalesce(v_e ->> 'notes', '')), '');
    v_hidden := coalesce((v_e ->> 'hidden')::boolean, false);
    v_attacks := coalesce(nullif(v_e -> 'attacks', 'null'::jsonb), '[]'::jsonb);
    if char_length(v_ename) not between 1 and 60
       or v_count not between 1 and 20
       or v_hp < 1
       or (v_ac is not null and v_ac not between 0 and 40)
       or (v_label is not null and char_length(v_label) > 12)
       or (v_notes is not null and char_length(v_notes) > 500)
       or jsonb_array_length(v_attacks) > 6 then
      raise exception 'invalid_enemy' using errcode = 'P0001';
    end if;

    -- each attack: an object of strings; rebuilt trimmed, in order
    v_attack_list := '[]'::jsonb;
    for v_a in select value from jsonb_array_elements(v_attacks) loop
      if jsonb_typeof(v_a) <> 'object'
         or jsonb_typeof(v_a -> 'name') is distinct from 'string'
         or jsonb_typeof(v_a -> 'toHit') is distinct from 'string'
         or jsonb_typeof(v_a -> 'damage') is distinct from 'string' then
        raise exception 'invalid_enemy' using errcode = 'P0001';
      end if;
      v_aname := btrim(v_a ->> 'name');
      v_tohit := btrim(v_a ->> 'toHit');
      v_damage := btrim(v_a ->> 'damage');
      if char_length(v_aname) not between 1 and 60 or char_length(v_tohit) > 20 or char_length(v_damage) > 40 then
        raise exception 'invalid_enemy' using errcode = 'P0001';
      end if;
      v_attack_list := v_attack_list || jsonb_build_array(jsonb_build_object('name', v_aname, 'toHit', v_tohit, 'damage', v_damage));
    end loop;

    insert into public.encounter_enemies
      (encounter_id, campaign_id, name, count, max_hp, defense_label, ac, attacks, xp, notes, hidden, position)
    values (v_id, p_campaign_id, v_ename, v_count, v_hp, v_label, v_ac, v_attack_list, v_xp, v_notes, v_hidden, v_pos);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.save_encounter(uuid, uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_encounter(uuid, uuid, text, text, text, text, jsonb) to authenticated, service_role;
