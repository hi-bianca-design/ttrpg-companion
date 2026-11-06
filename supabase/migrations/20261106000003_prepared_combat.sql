-- Prepared combat (Flow A): the GM launches one or more prepared encounters straight into an
-- active fight, in an order they arranged on the review screen, and can bring an encounter in
-- later as reinforcements. The turn order also skips enemies at 0 hit points.
--
-- Entry keys (the review screen's row ids, used by p_order and p_hidden_keys):
--   player:<character_id>                 a party member's entry
--   enemy:<encounter_enemy_id>:<n>        copy n (1-based) of an encounter enemy launched now
--
-- Privacy is unchanged: players read only combats and combat_order, which refresh_combat builds.
-- Copies are ordinary enemy entries (a ×N group shares a group_id and is named "<name> <k>"), so a
-- hidden copy gets no combat_order row and the visible copies of its group are renumbered densely,
-- exactly as for add_enemies. Encounters themselves stay GM-only and are never modified here.
--
-- Error codes (P0001): not_authenticated, not_member, no_active_session, no_active_combat,
-- not_allowed, not_rolling, invalid_target, invalid_enemy. No new codes.
--
-- Internal helpers are revoked from authenticated; do not call them through that role.

-- Internal: copies every enemy of an encounter into a combat, in the encounter's own order, at
-- the bottom of the order with no initiative and full hit points. A count above 1 becomes a
-- group named "<name> <k>", numbered after the highest "<name> <k>" already in the combat; a
-- count of 1 keeps the bare name. hidden follows the encounter enemy. Returns each copy's entry
-- id and its key. The caller must hold the combat lock and have checked the caller is the GM.
-- An encounter that is unknown or belongs to another campaign raises invalid_target.
create or replace function public.combat_add_encounter_enemies(p_combat_id uuid, p_encounter_id uuid)
returns table (entry_id uuid, key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_x public.encounter_enemies;
  v_name text;
  v_k int;
  v_group uuid;
  v_id uuid;
  v_n int;
  i int;
begin
  select c.campaign_id into v_campaign from public.combats c where c.id = p_combat_id;
  if p_encounter_id is null or v_campaign is null or not exists (
    select 1 from public.encounters en where en.id = p_encounter_id and en.campaign_id = v_campaign
  ) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  for v_x in
    select * from public.encounter_enemies x
     where x.encounter_id = p_encounter_id and x.campaign_id = v_campaign
     order by x.position, x.id
  loop
    v_name := btrim(v_x.name);
    v_k := 0;
    v_group := null;
    if char_length(v_name) not between 1 and 60 then
      raise exception 'invalid_enemy' using errcode = 'P0001';
    end if;

    if v_x.count > 1 then
      select coalesce(max(substr(e.name, char_length(v_name) + 2)::int), 0) into v_k
        from public.combat_entries e
       where e.combat_id = p_combat_id and e.kind = 'enemy'
         and left(e.name, char_length(v_name) + 1) = v_name || ' '
         and substr(e.name, char_length(v_name) + 2) ~ '^[0-9]{1,9}$';
      if char_length(v_name || ' ' || (v_k + v_x.count)::text) > 60 then
        raise exception 'invalid_enemy' using errcode = 'P0001';
      end if;
      v_group := gen_random_uuid();
    end if;

    for i in 1..v_x.count loop
      select count(*)::int into v_n from public.combat_entries e where e.combat_id = p_combat_id;
      insert into public.combat_entries
        (combat_id, campaign_id, kind, name, max_hp, hp, ac, notes, hidden, group_id, initiative, position,
         defense_label, attacks, xp)
      values (p_combat_id, v_campaign, 'enemy',
              case when v_x.count = 1 then v_name else v_name || ' ' || (v_k + i)::text end,
              v_x.max_hp, v_x.max_hp, v_x.ac, nullif(btrim(coalesce(v_x.notes, '')), ''), v_x.hidden, v_group,
              null, v_n + 1, nullif(btrim(coalesce(v_x.defense_label, '')), ''), v_x.attacks, v_x.xp)
      returning id into v_id;
      perform public.combat_place_entry(p_combat_id, v_id, v_n + 1);

      entry_id := v_id;
      key := 'enemy:' || v_x.id::text || ':' || i::text;
      return next;
    end loop;
  end loop;
end;
$$;

-- GM only. Launches the session's fight from prepared encounters: reuses the live `rolling`
-- combat (or creates one, entering combat as set_combat does), copies each encounter's enemies
-- (an encounter listed twice is copied once), places the entries in p_order (keys not listed go
-- last, in their current order), hides exactly the new copies whose keys are in p_hidden_keys,
-- then starts the combat exactly as start_combat does (active, round 1, position 1 current).
-- Every key must name an entry of this launch and appear at most once in p_order; a player key
-- cannot be hidden. A live combat that is already active raises not_rolling.
create or replace function public.start_prepared_combat(
  p_session_id uuid, p_encounter_ids uuid[], p_order text[], p_hidden_keys text[]
)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions := public.lock_active_session(p_session_id);
  v_c public.combats;
  v_order text[] := coalesce(p_order, '{}');
  v_hidden text[] := coalesce(p_hidden_keys, '{}');
  v_eid uuid;
begin
  if not public.is_campaign_gm(v_s.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  select * into v_c from public.combats where session_id = v_s.id and status <> 'ended' for update;
  if found and v_c.status <> 'rolling' then
    raise exception 'not_rolling' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_encounter_ids, '{}')) x
     where x is null
        or not exists (select 1 from public.encounters en where en.id = x and en.campaign_id = v_s.campaign_id)
  ) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  if v_c.id is null then
    if not v_s.in_combat then
      update public.sessions set in_combat = true, combat_started_by = auth.uid() where id = v_s.id;
    end if;
    insert into public.combats (session_id, campaign_id, started_by)
    values (v_s.id, v_s.campaign_id, auth.uid())
    returning * into v_c;
  end if;

  -- Party entries follow the campaign's active members (as on any refresh).
  perform public.refresh_combat(v_c.id);

  create temporary table if not exists pg_temp.combat_prepared_keys (
    key text primary key, entry_id uuid not null, kind text not null
  ) on commit drop;
  truncate pg_temp.combat_prepared_keys;

  insert into pg_temp.combat_prepared_keys (key, entry_id, kind)
  select 'player:' || e.character_id::text, e.id, 'player'
    from public.combat_entries e
   where e.combat_id = v_c.id and e.kind = 'player';

  for v_eid in
    select u.x from unnest(coalesce(p_encounter_ids, '{}')) with ordinality u (x, n)
     group by u.x order by min(u.n)
  loop
    insert into pg_temp.combat_prepared_keys (key, entry_id, kind)
    select a.key, a.entry_id, 'enemy' from public.combat_add_encounter_enemies(v_c.id, v_eid) a;
  end loop;

  -- Every key is known, listed at most once; only enemy keys can be hidden.
  if exists (select 1 from unnest(v_order) o (key)
              where o.key is null or not exists (select 1 from pg_temp.combat_prepared_keys pk where pk.key = o.key))
     or (select count(distinct o.key) from unnest(v_order) o (key)) <> cardinality(v_order)
     or exists (select 1 from unnest(v_hidden) h (key)
                 where h.key is null
                    or not exists (select 1 from pg_temp.combat_prepared_keys pk where pk.key = h.key and pk.kind = 'enemy')) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  update public.combat_entries e
     set hidden = pk.key = any (v_hidden)
    from pg_temp.combat_prepared_keys pk
   where pk.entry_id = e.id and pk.kind = 'enemy';

  update public.combat_entries e
     set position = r.rn
    from (
      select x.id, (row_number() over (order by o.n nulls last, x.position))::int as rn
        from public.combat_entries x
        left join pg_temp.combat_prepared_keys pk on pk.entry_id = x.id
        left join unnest(v_order) with ordinality o (key, n) on o.key = pk.key
       where x.combat_id = v_c.id
    ) r
   where e.id = r.id and e.position <> r.rn;

  -- Starts it exactly as start_combat does (it re-checks the GM and `rolling`, and refreshes).
  return public.start_combat(v_c.id);
end;
$$;

-- GM only, while rolling or active: brings an encounter's enemies in as reinforcements, at the
-- bottom of the order (the turn does not move), named after any copies already in the fight
-- ("Wolf 4..6" after "Wolf 1..3"), hidden as the encounter enemy says. Returns the new entry ids.
create or replace function public.add_encounter_enemies(p_combat_id uuid, p_encounter_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_ids uuid[];
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(a.entry_id order by a.n), '{}') into v_ids
    from public.combat_add_encounter_enemies(v_c.id, p_encounter_id) with ordinality a (entry_id, key, n);

  perform public.refresh_combat(v_c.id);
  return v_ids;
end;
$$;

-- Internal: the entry after p_from (by position), wrapping to the first with wrapped = true.
-- Enemies at 0 hit points are skipped (players never are: their hit points are not here). If
-- every entry other than p_from is a downed enemy, it returns the plain next position (wrapping
-- likewise), so the turn always moves and nothing loops. An unknown or null p_from starts from
-- before the first row. No row when there are no entries. set_current_entry does not use this,
-- so the GM can still put the turn on a downed enemy.
create or replace function public.combat_next_entry(p_combat_id uuid, p_from uuid)
returns table (entry_id uuid, wrapped boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pos int;
begin
  select e.position into v_pos from public.combat_entries e
   where e.id = p_from and e.combat_id = p_combat_id;

  return query
    select e.id, false from public.combat_entries e
     where e.combat_id = p_combat_id and e.position > coalesce(v_pos, 0)
       and not (e.kind = 'enemy' and e.hp = 0)
     order by e.position limit 1;
  if found then
    return;
  end if;

  return query
    select e.id, true from public.combat_entries e
     where e.combat_id = p_combat_id and e.id is distinct from p_from
       and not (e.kind = 'enemy' and e.hp = 0)
     order by e.position limit 1;
  if found then
    return;
  end if;

  -- Every other entry is a downed enemy (or there is no other entry): the plain next position.
  return query
    select e.id, false from public.combat_entries e
     where e.combat_id = p_combat_id and e.position > coalesce(v_pos, 0)
     order by e.position limit 1;
  if found then
    return;
  end if;

  return query
    select e.id, true from public.combat_entries e
     where e.combat_id = p_combat_id
     order by e.position limit 1;
end;
$$;

revoke execute on function public.combat_add_encounter_enemies(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.combat_next_entry(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.start_prepared_combat(uuid, uuid[], text[], text[]) from public, anon;
revoke execute on function public.add_encounter_enemies(uuid, uuid) from public, anon;
grant execute on function public.start_prepared_combat(uuid, uuid[], text[], text[]) to authenticated, service_role;
grant execute on function public.add_encounter_enemies(uuid, uuid) to authenticated, service_role;
