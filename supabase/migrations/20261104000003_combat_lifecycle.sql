-- Combat lifecycle: entering combat creates the combat in `rolling` (roll call), the GM starts
-- it, and ending combat or the session ends the combat and discards its entries (enemies
-- included, D12). Party membership changes keep a live combat's entries in step.
-- Error codes (SQLSTATE P0001): not_authenticated, not_member, no_active_session,
-- no_active_combat, not_allowed, not_rolling.

-- Internal: ends the session's live combat and discards its entries and order rows in the same
-- transaction. The combats row is updated first so its Realtime event is the signal.
create or replace function public.combat_end_for_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.combats
     set status = 'ended', turn_entry_id = null, gm_turn = false, rev = rev + 1
   where session_id = p_session_id and status <> 'ended';

  delete from public.combat_entries e
   using public.combats c
   where e.combat_id = c.id and c.session_id = p_session_id and c.status = 'ended';
  delete from public.combat_order o
   using public.combats c
   where o.combat_id = c.id and c.session_id = p_session_id and c.status = 'ended';
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

  perform public.combat_end_for_session(v_s.id);

  update public.sessions
     set status = 'ended', ended_at = now(),
         in_combat = false, combat_started_by = null, current_turn_user_id = null
   where id = v_s.id
  returning * into v_s;
  return v_s;
end;
$$;

-- Enters or ends combat. Any active member may enter: that creates the combat in `rolling`
-- with an entry per active member who has a character (a no-op when one is already live).
-- Ending is for the GM or whoever entered combat, and discards the combat.
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
       set in_combat = false, combat_started_by = null, current_turn_user_id = null
     where id = v_s.id
    returning * into v_s;
  end if;
  return v_s;
end;
$$;

-- GM only: locks the order in. rolling -> active, round 1, the first row holds the turn.
create or replace function public.start_combat(p_combat_id uuid)
returns public.combats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.combats := public.lock_combat(p_combat_id);
begin
  if not public.is_campaign_gm(v_c.campaign_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_c.status <> 'rolling' then
    raise exception 'not_rolling' using errcode = 'P0001';
  end if;

  update public.combats set status = 'active', round = 1, rev = rev + 1 where id = v_c.id;
  update public.combat_entries set is_current = false where combat_id = v_c.id and is_current;
  update public.combat_entries set is_current = true
   where id = (select e.id from public.combat_entries e where e.combat_id = v_c.id order by e.position limit 1);

  perform public.refresh_combat(v_c.id);
  select * into v_c from public.combats where id = v_c.id;
  return v_c;
end;
$$;

-- Members whose membership ends (row deleted, character detached, no longer active) lose any
-- turn they hold in the old session turn, and their entry leaves a live combat (passing the
-- turn on if they held it), so a banner can't outlive the player's place in the campaign.
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
    update public.sessions
       set current_turn_user_id = null
     where campaign_id = old.campaign_id and current_turn_user_id = old.user_id;

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

-- A member who becomes active with a character joins a live combat (no initiative, last).
create or replace function public.combat_sync_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cid uuid;
begin
  if new.status = 'active' and new.character_id is not null then
    for v_cid in
      select id from public.combats where campaign_id = new.campaign_id and status <> 'ended'
    loop
      perform 1 from public.combats where id = v_cid for update;
      perform public.refresh_combat(v_cid);
    end loop;
  end if;
  return null;
end;
$$;

revoke execute on function public.combat_sync_member() from public, anon, authenticated;
revoke execute on function public.combat_end_for_session(uuid) from public, anon, authenticated;

create trigger campaign_members_sync_combat
  after insert or update on public.campaign_members
  for each row execute function public.combat_sync_member();

revoke execute on function public.end_session(uuid) from public, anon;
revoke execute on function public.set_combat(uuid, boolean) from public, anon;
revoke execute on function public.start_combat(uuid) from public, anon;
grant execute on function public.end_session(uuid) to authenticated, service_role;
grant execute on function public.set_combat(uuid, boolean) to authenticated, service_role;
grant execute on function public.start_combat(uuid) to authenticated, service_role;
