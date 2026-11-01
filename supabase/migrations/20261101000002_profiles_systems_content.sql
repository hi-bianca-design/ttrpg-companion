-- profiles, game_systems and the generic content table.

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (length(username) between 1 and 64),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates a profile for every new auth user. username comes from sign-up metadata;
-- when absent or taken, falls back to the email local-part + 4 random digits (retried
-- until unique).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_base text;
begin
  if v_username is null
     or exists (select 1 from public.profiles p where p.username = v_username) then
    v_base := coalesce(nullif(lower(split_part(coalesce(new.email, ''), '@', 1)), ''), 'user');
    v_base := left(v_base, 59);
    loop
      v_username := v_base || lpad(floor(random() * 10000)::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles p where p.username = v_username);
    end loop;
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    v_username,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- game_systems --------------------------------------------------------------
create table public.game_systems (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null,
  version text,
  license text not null,
  attribution text not null
);

-- content -------------------------------------------------------------------
-- Every piece of game content, official SRD and homebrew alike.
--   owner_id null            -> official row (writable only by service role / seed)
--   owner_id set, campaign null -> the owner's homebrew
--   campaign_id set          -> a GM's campaign-scoped item (owner_id = the GM)
-- content.campaign_id's FK to campaigns is added in the campaigns migration.
create table public.content (
  id uuid primary key default gen_random_uuid(),
  system_id text not null references public.game_systems (id) on delete restrict,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (length(name) > 0),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  summary text,
  description text,
  data jsonb not null default '{}'::jsonb,
  parent_id uuid references public.content (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete cascade,
  campaign_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_campaign_requires_owner check (campaign_id is null or owner_id is not null)
);

create unique index content_official_slug_key
  on public.content (system_id, kind, slug)
  where owner_id is null and campaign_id is null;
create unique index content_owner_slug_key
  on public.content (owner_id, system_id, kind, slug)
  where owner_id is not null;
create index content_system_kind_idx on public.content (system_id, kind);
create index content_parent_id_idx on public.content (parent_id);
create index content_owner_id_idx on public.content (owner_id);
create index content_campaign_id_idx on public.content (campaign_id);

create trigger content_set_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();
