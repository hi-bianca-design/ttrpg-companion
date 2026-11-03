-- Lets a signed-in player see which campaign an invite code opens, before joining it.
-- Anyone holding the code can already join, so showing the campaign's name and system
-- exposes nothing new. Errors: invalid_code.
create or replace function public.preview_campaign_invite(p_code text)
returns table (id uuid, name text, system_id text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  return query
    select c.id, c.name, c.system_id
      from public.campaigns c
     where c.invite_code = upper(trim(coalesce(p_code, '')));

  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.preview_campaign_invite(text) from public, anon;
grant execute on function public.preview_campaign_invite(text) to authenticated, service_role;
