-- Privacy follow-up from the Phase 2a review.
--
-- I2: a hidden enemy holding the turn must not change anything a player can read. The "GM's
--     turn" projection (`gm_turn`) is retired: while a hidden enemy plays, `turn_entry_id` stays
--     on the last visible holder and no combats row is written.
-- I1: the player projection renames a ×N group's visible copies densely 1..n, so the number of
--     hidden copies is never inferable. The GM's entries keep the real, unique names.
-- I3: apply_enemy_hp takes a client-generated batch id and is idempotent per batch.
-- M1/M2: set_current_entry and end_my_turn require an active combat; end_my_turn takes the round
--     the client saw and is a no-op when it is stale.

alter table public.combats drop constraint combats_turn_xor_gm_turn;
alter table public.combats drop column gm_turn;

-- Batches already applied, so a retried or double-tapped apply_enemy_hp is a no-op. No policies:
-- nobody reads this through the API; the security-definer function is the only writer.
create table public.combat_hp_batches (
  combat_id uuid not null references public.combats (id) on delete cascade,
  batch_id uuid not null,
  primary key (combat_id, batch_id)
);
alter table public.combat_hp_batches enable row level security;
revoke all on public.combat_hp_batches from anon, authenticated;

create or replace function public.combat_end_for_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.combats
     set status = 'ended', turn_entry_id = null, rev = rev + 1
   where session_id = p_session_id and status <> 'ended';

  delete from public.combat_entries e
   using public.combats c
   where e.combat_id = c.id and c.session_id = p_session_id and c.status = 'ended';
  delete from public.combat_order o
   using public.combats c
   where o.combat_id = c.id and c.session_id = p_session_id and c.status = 'ended';
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

  -- 2. The player-safe projection: visible entries only, dense positions, only while active.
  --    Copies of a ×N group (grouped, named "<base> <n>") are renamed densely over the visible
  --    ones in their real order, so hidden copies leave no gap in what a player sees.
  select coalesce(jsonb_agg(to_jsonb(o) order by o.position), '[]'::jsonb) into v_before
    from public.combat_order o where o.combat_id = p_combat_id;

  if v_c.status = 'active' then
    create temporary table if not exists pg_temp.combat_desired (
      id uuid, kind text, user_id uuid, character_id uuid, name text, initiative int, position int
    ) on commit drop;
    truncate pg_temp.combat_desired;
    insert into pg_temp.combat_desired
    select v.id, v.kind, v.user_id, v.character_id,
           case when v.base is null then v.name
                else v.base || ' ' || (row_number() over (partition by v.base order by v.num, v.position))::text end,
           v.initiative, (row_number() over (order by v.position))::int
      from (
        select e.id, e.kind, e.user_id, e.character_id, e.name, e.initiative, e.position,
               case when e.kind = 'enemy' and e.group_id is not null and e.name ~ ' [0-9]{1,9}$'
                    then regexp_replace(e.name, ' [0-9]{1,9}$', '') end as base,
               substring(e.name from ' ([0-9]{1,9})$')::int as num
          from public.combat_entries e
         where e.combat_id = p_combat_id and not e.hidden
      ) v;

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

  -- 3. The turn pointer. A visible holder is projected by id. While a hidden enemy holds the
  --    turn the pointer does not move: it stays on the last visible holder (so nothing a player
  --    reads changes). If that row is no longer visible (the holder was hidden, or removed) it
  --    falls back to the nearest visible row before the current one, never a hidden id.
  if v_c.status = 'active' then
    select e.id, e.hidden, e.position into v_cur from public.combat_entries e
     where e.combat_id = p_combat_id and e.is_current;
    if found then
      if not v_cur.hidden then
        v_turn := v_cur.id;
      elsif v_c.turn_entry_id is not null
            and exists (select 1 from pg_temp.combat_desired d where d.id = v_c.turn_entry_id) then
        v_turn := v_c.turn_entry_id;
      else
        select d.id into v_turn
          from pg_temp.combat_desired d
          join public.combat_entries e on e.id = d.id
         where e.position < v_cur.position
         order by e.position desc limit 1;
      end if;
    end if;
  end if;

  -- 4. Write the combat row only when a player-visible thing changed.
  if v_before is distinct from v_after or v_c.turn_entry_id is distinct from v_turn then
    update public.combats set turn_entry_id = v_turn, rev = rev + 1 where id = p_combat_id;
  end if;
end;
$$;

-- GM only: any row becomes current (skip, go back). The round does not change. Active only.
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
  if v_c.status <> 'active' then
    raise exception 'not_active' using errcode = 'P0001';
  end if;

  update public.combat_entries set is_current = false where combat_id = v_c.id and is_current;
  update public.combat_entries set is_current = true where id = p_entry_id;

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- A player ends their own turn. `p_expected_round` is the round the client was showing: if the
-- round has moved on (a double tap across a wrap, or the GM's Next turn came first and the turn
-- came back round to them) the call is a no-op and the client refetches.
drop function public.end_my_turn(uuid);
create or replace function public.end_my_turn(p_combat_id uuid, p_expected_round int)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
begin
  if v_c.status <> 'active' then
    raise exception 'not_active' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.combat_entries e
     where e.combat_id = v_c.id and e.kind = 'player' and e.user_id = auth.uid() and e.is_current
  ) then
    raise exception 'not_your_turn' using errcode = 'P0001';
  end if;
  if p_expected_round is distinct from v_c.round then
    return v_c;
  end if;

  perform public.combat_advance(v_c.id);
  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- Idempotent per client-generated batch id: a repeat call with a batch already applied to this
-- combat changes nothing and returns that batch. Arithmetic is unchanged (see the original).
drop function public.apply_enemy_hp(uuid, uuid[], text, int);
create or replace function public.apply_enemy_hp(
  p_combat_id uuid, p_entry_ids uuid[], p_mode text, p_amount int, p_batch uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
  v_ids uuid[];
  v_new int;
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_batch is null then
    raise exception 'invalid_batch' using errcode = 'P0001';
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

  insert into public.combat_hp_batches (combat_id, batch_id) values (v_c.id, p_batch)
  on conflict do nothing;
  get diagnostics v_new = row_count;
  if v_new = 0 then
    return p_batch;
  end if;

  update public.combat_entries e
     set prev_hp = e.hp,
         prev_temp = e.temp_hp,
         last_batch = p_batch,
         hp = case p_mode
                when 'damage' then greatest(0, (e.hp::bigint - (p_amount - least(e.temp_hp, p_amount)))::int)
                when 'heal' then least(e.max_hp::bigint, e.hp::bigint + p_amount)::int
                else e.hp end,
         temp_hp = case p_mode
                when 'damage' then e.temp_hp - least(e.temp_hp, p_amount)
                when 'temp' then greatest(e.temp_hp, p_amount)
                else e.temp_hp end
   where e.id = any (v_ids) and e.combat_id = v_c.id;

  return p_batch;
end;
$$;

revoke execute on function public.end_my_turn(uuid, int) from public, anon;
grant execute on function public.end_my_turn(uuid, int) to authenticated, service_role;
revoke execute on function public.apply_enemy_hp(uuid, uuid[], text, int, uuid) from public, anon;
grant execute on function public.apply_enemy_hp(uuid, uuid[], text, int, uuid) to authenticated, service_role;
