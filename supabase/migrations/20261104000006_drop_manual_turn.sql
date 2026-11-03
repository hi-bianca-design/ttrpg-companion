-- Retires the manual turn picker. The turn now lives in the combat order (combat_entries.is_current,
-- projected to combats.turn_entry_id), so sessions.current_turn_user_id, set_turn and the old end_turn
-- (replaced by end_my_turn) have no readers or callers left.

-- The three functions that assigned the column are replaced first, without it.
create or replace function public.end_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions := public.lock_active_session(p_session_id);
begin
  if not (public.is_campaign_gm(v_s.campaign_id) or v_s.opened_by = auth.uid()) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  perform public.combat_end_for_session(v_s.id);

  update public.sessions
     set status = 'ended', ended_at = now(),
         in_combat = false, combat_started_by = null
   where id = v_s.id
  returning * into v_s;
  return v_s;
end;
$$;

create or replace function public.set_combat(p_session_id uuid, p_in_combat boolean)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions := public.lock_active_session(p_session_id);
  v_cid uuid;
begin
  if p_in_combat then
    if not v_s.in_combat then
      update public.sessions
         set in_combat = true, combat_started_by = auth.uid()
       where id = v_s.id
      returning * into v_s;
    end if;

    -- The session row lock above serialises entrants, so at most one live combat is created.
    select id into v_cid from public.combats where session_id = v_s.id and status <> 'ended';
    if v_cid is null then
      insert into public.combats (session_id, campaign_id, started_by)
      values (v_s.id, v_s.campaign_id, auth.uid())
      returning id into v_cid;
      perform public.refresh_combat(v_cid);
    end if;
  else
    if not v_s.in_combat then
      return v_s;
    end if;
    if not (public.is_campaign_gm(v_s.campaign_id) or v_s.combat_started_by = auth.uid()) then
      raise exception 'not_allowed' using errcode = 'P0001';
    end if;

    perform public.combat_end_for_session(v_s.id);

    update public.sessions
       set in_combat = false, combat_started_by = null
     where id = v_s.id
    returning * into v_s;
  end if;
  return v_s;
end;
$$;

-- A member whose membership ends (row deleted, character detached, no longer active) leaves a live
-- combat, passing the turn on if they held it, so a banner can't outlive their place in the campaign.
create or replace function public.sessions_clear_turn_on_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cid uuid;
begin
  if tg_op = 'DELETE'
     or new.character_id is null
     or new.status <> 'active' then
    for v_cid in
      select id from public.combats where campaign_id = old.campaign_id and status <> 'ended'
    loop
      perform 1 from public.combats where id = v_cid for update;
      perform public.refresh_combat(v_cid);
    end loop;
  end if;
  return null;
end;
$$;

drop function public.set_turn(uuid, uuid);
drop function public.end_turn(uuid);

alter table public.sessions drop constraint sessions_turn_requires_combat;
drop index public.sessions_current_turn_user_id_idx;
alter table public.sessions drop column current_turn_user_id;
