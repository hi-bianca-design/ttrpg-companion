-- RPCs for campaign creation and joining. Both are security definer and act strictly
-- on behalf of auth.uid(); errors are raised with SQLSTATE P0001 and a stable message.

-- Creates a campaign and the caller's GM membership row in one transaction.
create or replace function public.create_campaign(
  p_name text,
  p_system_id text,
  p_description text default null
)
returns public.campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign public.campaigns;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  insert into public.campaigns (system_id, gm_id, name, description)
  values (p_system_id, v_uid, p_name, p_description)
  returning * into v_campaign;

  insert into public.campaign_members (campaign_id, user_id, role, status)
  values (v_campaign.id, v_uid, 'gm', 'active');

  return v_campaign;
end;
$$;

-- Joins the campaign with invite code p_code as a player, optionally bringing a character.
-- An existing 'invited' row is activated; an existing 'active' row is already_member.
-- Errors: invalid_code, already_member, not_your_character, system_mismatch.
create or replace function public.join_campaign(p_code text, p_character_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign public.campaigns;
  v_status text;
  v_char public.characters;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_campaign from public.campaigns c
   where c.invite_code = upper(trim(coalesce(p_code, '')));
  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select m.status into v_status from public.campaign_members m
   where m.campaign_id = v_campaign.id and m.user_id = v_uid;
  if v_status = 'active' then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  if p_character_id is not null then
    select * into v_char from public.characters ch where ch.id = p_character_id;
    if not found or v_char.owner_id <> v_uid then
      raise exception 'not_your_character' using errcode = 'P0001';
    end if;
    if v_char.system_id <> v_campaign.system_id then
      raise exception 'system_mismatch' using errcode = 'P0001';
    end if;
  end if;

  if v_status = 'invited' then
    update public.campaign_members
       set status = 'active', character_id = coalesce(p_character_id, character_id)
     where campaign_id = v_campaign.id and user_id = v_uid;
  else
    insert into public.campaign_members (campaign_id, user_id, role, character_id, status)
    values (v_campaign.id, v_uid, 'player', p_character_id, 'active');
  end if;

  return v_campaign.id;
end;
$$;

revoke execute on function public.create_campaign(text, text, text) from public, anon;
revoke execute on function public.join_campaign(text, uuid) from public, anon;
grant execute on function public.create_campaign(text, text, text) to authenticated, service_role;
grant execute on function public.join_campaign(text, uuid) to authenticated, service_role;
