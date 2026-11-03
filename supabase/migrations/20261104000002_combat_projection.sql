-- Combat projection. refresh_combat is the one internal function every combat RPC calls before
-- returning: it syncs party entries with the campaign's active members, rebuilds the
-- player-safe `combat_order` from the truth in `combat_entries` (hidden enemies get no row),
-- projects the turn pointer, and bumps `combats.rev` only when something a player can see
-- changed. A no-change call writes nothing, so Realtime stays quiet.
--
-- Internal helpers are revoked from authenticated; do not call them through that role.

-- Internal: dense positions 1..n in the existing order.
create or replace function public.combat_renumber(p_combat_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.combat_entries e
     set position = n.rn
    from (
      select id, (row_number() over (order by position))::int as rn
        from public.combat_entries where combat_id = p_combat_id
    ) n
   where e.id = n.id and e.position <> n.rn;
$$;

-- Internal: the entry after p_from (by position), wrapping to position 1 with wrapped = true.
-- An unknown or null p_from starts from before the first row. No row when there are no entries.
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

-- Internal: deletes entries and keeps the turn sane. If the current entry is among them the
-- turn first moves to the next surviving row (wrapping to position 1, which adds a round while
-- the combat is active), or to none when nothing survives. Positions are renumbered densely.
create or replace function public.combat_delete_entries(p_combat_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_cur record;
  v_next uuid;
  v_wrapped boolean := false;
begin
  select status into v_status from public.combats where id = p_combat_id;

  select e.id, e.position into v_cur from public.combat_entries e
   where e.combat_id = p_combat_id and e.is_current;
  if found and v_cur.id = any (p_ids) then
    select e.id into v_next from public.combat_entries e
     where e.combat_id = p_combat_id and e.id <> all (p_ids) and e.position > v_cur.position
     order by e.position limit 1;
    if v_next is null then
      select e.id into v_next from public.combat_entries e
       where e.combat_id = p_combat_id and e.id <> all (p_ids)
       order by e.position limit 1;
      v_wrapped := v_next is not null;
    end if;
  end if;

  delete from public.combat_entries where combat_id = p_combat_id and id = any (p_ids);

  if v_next is not null then
    update public.combat_entries set is_current = true where id = v_next;
    if v_wrapped and v_status = 'active' then
      update public.combats set round = round + 1, rev = rev + 1 where id = p_combat_id;
    end if;
  end if;

  perform public.combat_renumber(p_combat_id);
end;
$$;

create or replace function public.refresh_combat(p_combat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats;
  v_stale uuid[];
  v_before jsonb;
  v_after jsonb;
  v_cur record;
  v_turn uuid;
  v_gm boolean := false;
begin
  select * into v_c from public.combats where id = p_combat_id;
  if not found then
    return;
  end if;

  -- 1. Party entries follow the campaign's active members who have a character.
  select coalesce(array_agg(e.id), '{}') into v_stale
    from public.combat_entries e
   where e.combat_id = p_combat_id and e.kind = 'player'
     and not exists (
       select 1 from public.campaign_members m
        where m.campaign_id = v_c.campaign_id and m.user_id = e.user_id
          and m.character_id = e.character_id and m.status = 'active');
  if cardinality(v_stale) > 0 then
    perform public.combat_delete_entries(p_combat_id, v_stale);
  end if;

  insert into public.combat_entries (combat_id, campaign_id, kind, user_id, character_id, position)
  select p_combat_id, v_c.campaign_id, 'player', m.user_id, m.character_id,
         coalesce((select max(e.position) from public.combat_entries e where e.combat_id = p_combat_id), 0)
           + (row_number() over (order by m.user_id))::int
    from public.campaign_members m
   where m.campaign_id = v_c.campaign_id and m.status = 'active' and m.character_id is not null
     and not exists (
       select 1 from public.combat_entries e
        where e.combat_id = p_combat_id and e.kind = 'player' and e.character_id = m.character_id);

  -- Re-read: the helpers above may have advanced the round.
  select * into v_c from public.combats where id = p_combat_id;

  -- 2. The player-safe projection: visible entries only, dense positions, and only while active.
  select coalesce(jsonb_agg(to_jsonb(o) order by o.position), '[]'::jsonb) into v_before
    from public.combat_order o where o.combat_id = p_combat_id;

  if v_c.status = 'active' then
    create temporary table if not exists pg_temp.combat_desired (
      id uuid, kind text, user_id uuid, character_id uuid, name text, initiative int, position int
    ) on commit drop;
    truncate pg_temp.combat_desired;
    insert into pg_temp.combat_desired
    select e.id, e.kind, e.user_id, e.character_id,
           case when e.kind = 'enemy' then e.name end,
           e.initiative, (row_number() over (order by e.position))::int
      from public.combat_entries e
     where e.combat_id = p_combat_id and not e.hidden;

    delete from public.combat_order o
     where o.combat_id = p_combat_id
       and not exists (select 1 from pg_temp.combat_desired d where d.id = o.id);

    insert into public.combat_order (id, combat_id, campaign_id, kind, user_id, character_id, name, initiative, position)
    select d.id, p_combat_id, v_c.campaign_id, d.kind, d.user_id, d.character_id, d.name, d.initiative, d.position
      from pg_temp.combat_desired d
    on conflict (id) do update
       set kind = excluded.kind, user_id = excluded.user_id, character_id = excluded.character_id,
           name = excluded.name, initiative = excluded.initiative, position = excluded.position
     where (public.combat_order.kind, public.combat_order.user_id, public.combat_order.character_id,
            public.combat_order.name, public.combat_order.initiative, public.combat_order.position)
           is distinct from
           (excluded.kind, excluded.user_id, excluded.character_id,
            excluded.name, excluded.initiative, excluded.position);
  else
    delete from public.combat_order where combat_id = p_combat_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.position), '[]'::jsonb) into v_after
    from public.combat_order o where o.combat_id = p_combat_id;

  -- 3. The turn pointer: a visible holder is projected by id, a hidden enemy only as gm_turn.
  if v_c.status = 'active' then
    select e.id, e.kind, e.hidden into v_cur from public.combat_entries e
     where e.combat_id = p_combat_id and e.is_current;
    if found then
      v_gm := v_cur.kind = 'enemy' and v_cur.hidden;
      v_turn := case when v_gm then null else v_cur.id end;
    end if;
  end if;

  -- 4. Write the combat row only when a player-visible thing changed.
  if v_before is distinct from v_after
     or v_c.turn_entry_id is distinct from v_turn
     or v_c.gm_turn is distinct from v_gm then
    update public.combats
       set turn_entry_id = v_turn, gm_turn = v_gm, rev = rev + 1
     where id = p_combat_id;
  end if;
end;
$$;

revoke execute on function public.combat_renumber(uuid) from public, anon, authenticated;
revoke execute on function public.combat_next_entry(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.combat_delete_entries(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.refresh_combat(uuid) from public, anon, authenticated;
