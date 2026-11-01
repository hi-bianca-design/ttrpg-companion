-- Foundation: extensions and shared helper functions used by later migrations.

create extension if not exists pgcrypto with schema extensions;

-- Shared updated_at trigger for every mutable table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Campaign membership helpers. security definer so RLS policies can call them without
-- recursing into campaign_members' own policies. plpgsql because the tables they read
-- are created in a later migration (plpgsql bodies are resolved at call time).

-- True when the caller is the campaign's GM or has any membership row (invited or active).
create or replace function public.is_campaign_member(p_campaign_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id and c.gm_id = auth.uid()
  ) or exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign_id and m.user_id = auth.uid()
  );
end;
$$;

-- True when the caller is the campaign's GM.
create or replace function public.is_campaign_gm(p_campaign_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id and c.gm_id = auth.uid()
  );
end;
$$;

revoke execute on function public.is_campaign_member(uuid) from public, anon;
revoke execute on function public.is_campaign_gm(uuid) from public, anon;
grant execute on function public.is_campaign_member(uuid) to authenticated, service_role;
grant execute on function public.is_campaign_gm(uuid) to authenticated, service_role;
