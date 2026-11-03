-- Order and turn RPCs. All security definer, return the refreshed combat row, and (except the
-- GM-only entry RPCs' lookup, below) lock the combat first so simultaneous taps resolve to one
-- outcome. Error codes (P0001): not_authenticated, not_member, no_active_combat, not_allowed,
-- not_active, not_your_turn, invalid_target, invalid_initiative, invalid_position.
--
-- Entry-id RPCs (set_initiative, move_entry, set_current_entry) check "is the caller this
-- entry's GM" BEFORE looking anything else up, and a caller who is not gets one answer whatever
-- the id is (a real hidden entry, an entry of another campaign, a random uuid): `not_allowed`,
-- or `invalid_target` when they GM some campaign. Nothing about an entry can be probed.
--
-- Internal helpers are revoked from authenticated; do not call them through that role.

-- Internal: where a new/changed initiative goes (D4). Scans the current order (excluding
-- p_exclude): the first row whose initiative is empty or lower, else last; empty goes last.
-- The result is a position in the order with p_exclude removed.
create or replace function public.combat_insert_position(p_combat_id uuid, p_initiative int, p_exclude uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
  v_pos int;
begin
  select count(*)::int into v_n from public.combat_entries e
   where e.combat_id = p_combat_id and e.id is distinct from p_exclude;
  if p_initiative is null then
    return v_n + 1;
  end if;

  select o.rn into v_pos
    from (
      select e.initiative, (row_number() over (order by e.position))::int as rn
        from public.combat_entries e
       where e.combat_id = p_combat_id and e.id is distinct from p_exclude
    ) o
   where o.initiative is null or o.initiative < p_initiative
   order by o.rn limit 1;
  return coalesce(v_pos, v_n + 1);
end;
$$;

-- Internal: moves one entry to p_to (clamped to 1..n), shifting the others; positions stay
-- dense and the turn pointer (is_current) is untouched.
create or replace function public.combat_place_entry(p_combat_id uuid, p_entry_id uuid, p_to int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
  v_to int;
begin
  select count(*)::int into v_n from public.combat_entries where combat_id = p_combat_id;
  v_to := greatest(1, least(p_to, v_n));

  update public.combat_entries e
     set position = n.np
    from (
      select o.id, (case when o.rn >= v_to then o.rn + 1 else o.rn end) as np
        from (
          select x.id, (row_number() over (order by x.position))::int as rn
            from public.combat_entries x
           where x.combat_id = p_combat_id and x.id <> p_entry_id
        ) o
      union all
      select p_entry_id, v_to
    ) n
   where e.id = n.id;
end;
$$;

-- Internal: the turn moves to the next row; past the last row it wraps to the first and the
-- round increases.
create or replace function public.combat_advance(p_combat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cur uuid;
  v_next record;
begin
  select e.id into v_cur from public.combat_entries e
   where e.combat_id = p_combat_id and e.is_current;

  select * into v_next from public.combat_next_entry(p_combat_id, v_cur);
  if not found then
    return;
  end if;

  update public.combat_entries set is_current = false where combat_id = p_combat_id and is_current;
  update public.combat_entries set is_current = true where id = v_next.entry_id;
  if v_next.wrapped then
    update public.combats set round = round + 1, rev = rev + 1 where id = p_combat_id;
  end if;
end;
$$;

-- Internal: the combat of an entry, locked, for a caller who must be that campaign's GM.
create or replace function public.combat_lock_for_entry(p_entry_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_e record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select e.combat_id, e.campaign_id into v_e from public.combat_entries e where e.id = p_entry_id;
  if not found or not public.is_campaign_gm(v_e.campaign_id) then
    if exists (select 1 from public.campaigns c where c.gm_id = auth.uid()) then
      raise exception 'invalid_target' using errcode = 'P0001';
    end if;
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  return public.lock_combat(v_e.combat_id);
end;
$$;

create or replace function public.set_initiative(p_entry_id uuid, p_initiative int)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.combat_lock_for_entry(p_entry_id);
begin
  if not exists (select 1 from public.combat_entries where id = p_entry_id and combat_id = v_c.id) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  if p_initiative is not null and p_initiative not between -20 and 99 then
    raise exception 'invalid_initiative' using errcode = 'P0001';
  end if;

  update public.combat_entries set initiative = p_initiative where id = p_entry_id;

  if v_c.status = 'rolling' then
    -- Roll call: the whole order re-sorts (highest first, stable by current position).
    update public.combat_entries e
       set position = r.rn
      from (
        select x.id, (row_number() over (order by x.initiative desc nulls last, x.position))::int as rn
          from public.combat_entries x where x.combat_id = v_c.id
      ) r
     where e.id = r.id;
  else
    perform public.combat_place_entry(
      v_c.id, p_entry_id, public.combat_insert_position(v_c.id, p_initiative, p_entry_id));
  end if;

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

create or replace function public.move_entry(p_entry_id uuid, p_to_position int)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.combat_lock_for_entry(p_entry_id);
  v_n int;
begin
  if not exists (select 1 from public.combat_entries where id = p_entry_id and combat_id = v_c.id) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  select count(*)::int into v_n from public.combat_entries where combat_id = v_c.id;
  if p_to_position is null or p_to_position < 1 or p_to_position > v_n then
    raise exception 'invalid_position' using errcode = 'P0001';
  end if;

  perform public.combat_place_entry(v_c.id, p_entry_id, p_to_position);

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- GM only. Moves the highlight down the list; past the last row it wraps and `round` increases.
-- A tap whose expected entry is no longer current (a player's End Turn got there first) is a
-- no-op: the caller refetches.
create or replace function public.next_turn(p_combat_id uuid, p_expected_entry_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_cur uuid;
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_c.status <> 'active' then
    raise exception 'not_active' using errcode = 'P0001';
  end if;

  select e.id into v_cur from public.combat_entries e where e.combat_id = v_c.id and e.is_current;
  if v_cur is distinct from p_expected_entry_id
     or not exists (select 1 from public.combat_entries where combat_id = v_c.id) then
    return v_c;
  end if;

  perform public.combat_advance(v_c.id);
  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- A player ends their own turn: the turn passes to the next row (same wrap rule).
create or replace function public.end_my_turn(p_combat_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
begin
  if not exists (
    select 1 from public.combat_entries e
     where e.combat_id = v_c.id and e.kind = 'player' and e.user_id = auth.uid() and e.is_current
  ) then
    raise exception 'not_your_turn' using errcode = 'P0001';
  end if;

  perform public.combat_advance(v_c.id);
  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- GM only: any row becomes current (skip, go back). The round does not change.
create or replace function public.set_current_entry(p_entry_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.combat_lock_for_entry(p_entry_id);
begin
  if not exists (select 1 from public.combat_entries where id = p_entry_id and combat_id = v_c.id) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  update public.combat_entries set is_current = false where combat_id = v_c.id and is_current;
  update public.combat_entries set is_current = true where id = p_entry_id;

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- GM only: the current row swaps with the next and the next becomes current. A stale expected
-- id, a single row, or a current row that is already last (nothing to swap past) is a no-op.
create or replace function public.delay_turn(p_combat_id uuid, p_expected_entry_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_cur record;
  v_next record;
  v_next_pos int;
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_c.status <> 'active' then
    raise exception 'not_active' using errcode = 'P0001';
  end if;

  select e.id, e.position into v_cur from public.combat_entries e
   where e.combat_id = v_c.id and e.is_current;
  if not found or v_cur.id is distinct from p_expected_entry_id then
    return v_c;
  end if;

  select * into v_next from public.combat_next_entry(v_c.id, v_cur.id);
  if not found or v_next.wrapped or v_next.entry_id = v_cur.id then
    return v_c;
  end if;

  select e.position into v_next_pos from public.combat_entries e where e.id = v_next.entry_id;
  update public.combat_entries
     set position = case when id = v_cur.id then v_next_pos else v_cur.position end
   where id in (v_cur.id, v_next.entry_id);
  update public.combat_entries set is_current = false where id = v_cur.id;
  update public.combat_entries set is_current = true where id = v_next.entry_id;

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

revoke execute on function public.combat_insert_position(uuid, int, uuid) from public, anon, authenticated;
revoke execute on function public.combat_place_entry(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.combat_advance(uuid) from public, anon, authenticated;
revoke execute on function public.combat_lock_for_entry(uuid) from public, anon, authenticated;

revoke execute on function public.set_initiative(uuid, int) from public, anon;
revoke execute on function public.move_entry(uuid, int) from public, anon;
revoke execute on function public.next_turn(uuid, uuid) from public, anon;
revoke execute on function public.end_my_turn(uuid) from public, anon;
revoke execute on function public.set_current_entry(uuid) from public, anon;
revoke execute on function public.delay_turn(uuid, uuid) from public, anon;
grant execute on function public.set_initiative(uuid, int) to authenticated, service_role;
grant execute on function public.move_entry(uuid, int) to authenticated, service_role;
grant execute on function public.next_turn(uuid, uuid) to authenticated, service_role;
grant execute on function public.end_my_turn(uuid) to authenticated, service_role;
grant execute on function public.set_current_entry(uuid) to authenticated, service_role;
grant execute on function public.delay_turn(uuid, uuid) to authenticated, service_role;
