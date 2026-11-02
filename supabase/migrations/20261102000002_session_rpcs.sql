-- Session RPCs. All security definer and act strictly on behalf of auth.uid(); errors are
-- raised with SQLSTATE P0001 and a stable message: not_authenticated, not_member,
-- no_active_session, not_allowed, not_in_combat, invalid_turn_target, not_your_turn.
-- Each transition locks the session row so simultaneous taps resolve to one outcome.

-- Internal: the caller's view of an active session, locked for update. Order of checks:
-- authenticated -> session exists and is active -> caller is an active campaign member.
-- Not granted to API roles; the RPCs below call it as the function owner.
create or replace function public.lock_active_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_s from public.sessions where id = p_session_id for update;
  if not found or v_s.status <> 'active' then
    raise exception 'no_active_session' using errcode = 'P0001';
  end if;

  if not public.is_active_campaign_member(v_s.campaign_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  return v_s;
end;
$$;

-- Opens a session for the campaign, or returns the one already active (two people tapping at
-- once both end up in the same session). Any active member may open.
create or replace function public.open_session(p_campaign_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.sessions;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if not public.is_active_campaign_member(p_campaign_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  select * into v_s from public.sessions
   where campaign_id = p_campaign_id and status = 'active';
  if found then
    return v_s;
  end if;

  begin
    insert into public.sessions (campaign_id, opened_by)
    values (p_campaign_id, v_uid)
    returning * into v_s;
  exception when unique_violation then
    select * into v_s from public.sessions
     where campaign_id = p_campaign_id and status = 'active';
  end;
  return v_s;
end;
$$;

-- Ends the session (and combat, and any turn). GM or the member who opened it.
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

  update public.sessions
     set status = 'ended', ended_at = now(),
         in_combat = false, combat_started_by = null, current_turn_user_id = null
   where id = v_s.id
  returning * into v_s;
  return v_s;
end;
$$;

-- Enters or ends combat. Any active member may enter (no-op if already in combat). Ending
-- is for the GM or whoever entered combat, and clears the turn.
create or replace function public.set_combat(p_session_id uuid, p_in_combat boolean)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions := public.lock_active_session(p_session_id);
begin
  if p_in_combat then
    if v_s.in_combat then
      return v_s;
    end if;
    update public.sessions
       set in_combat = true, combat_started_by = auth.uid()
     where id = v_s.id
    returning * into v_s;
  else
    if not v_s.in_combat then
      return v_s;
    end if;
    if not (public.is_campaign_gm(v_s.campaign_id) or v_s.combat_started_by = auth.uid()) then
      raise exception 'not_allowed' using errcode = 'P0001';
    end if;
    update public.sessions
       set in_combat = false, combat_started_by = null, current_turn_user_id = null
     where id = v_s.id
    returning * into v_s;
  end if;
  return v_s;
end;
$$;

-- GM only: gives the turn to an active member with a character, or clears it (p_user_id null).
create or replace function public.set_turn(p_session_id uuid, p_user_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions := public.lock_active_session(p_session_id);
begin
  if not public.is_campaign_gm(v_s.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if not v_s.in_combat then
    raise exception 'not_in_combat' using errcode = 'P0001';
  end if;
  if p_user_id is not null and not exists (
    select 1 from public.campaign_members m
     where m.campaign_id = v_s.campaign_id and m.user_id = p_user_id
       and m.status = 'active' and m.character_id is not null
  ) then
    raise exception 'invalid_turn_target' using errcode = 'P0001';
  end if;

  update public.sessions set current_turn_user_id = p_user_id
   where id = v_s.id
  returning * into v_s;
  return v_s;
end;
$$;

-- The turn holder ends their own turn; nobody holds the turn until the GM picks the next.
create or replace function public.end_turn(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.sessions := public.lock_active_session(p_session_id);
begin
  if v_s.current_turn_user_id is distinct from auth.uid() then
    raise exception 'not_your_turn' using errcode = 'P0001';
  end if;

  update public.sessions set current_turn_user_id = null
   where id = v_s.id
  returning * into v_s;
  return v_s;
end;
$$;

revoke execute on function public.lock_active_session(uuid) from public, anon, authenticated;
revoke execute on function public.open_session(uuid) from public, anon;
revoke execute on function public.end_session(uuid) from public, anon;
revoke execute on function public.set_combat(uuid, boolean) from public, anon;
revoke execute on function public.set_turn(uuid, uuid) from public, anon;
revoke execute on function public.end_turn(uuid) from public, anon;
grant execute on function public.open_session(uuid) to authenticated, service_role;
grant execute on function public.end_session(uuid) to authenticated, service_role;
grant execute on function public.set_combat(uuid, boolean) to authenticated, service_role;
grant execute on function public.set_turn(uuid, uuid) to authenticated, service_role;
grant execute on function public.end_turn(uuid) to authenticated, service_role;
