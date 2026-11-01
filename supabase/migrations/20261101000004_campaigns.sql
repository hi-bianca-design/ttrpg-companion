-- campaigns and campaign_members.

-- 6-character uppercase alphanumeric invite code, retried until unused.
create or replace function public.gen_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 36), 1);
    end loop;
    exit when not exists (select 1 from public.campaigns c where c.invite_code = v_code);
  end loop;
  return v_code;
end;
$$;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  system_id text not null references public.game_systems (id) on delete restrict,
  gm_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(name) > 0),
  description text,
  invite_code text not null unique default public.gen_invite_code()
    check (invite_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_system_id_idx on public.campaigns (system_id);
create index campaigns_gm_id_idx on public.campaigns (gm_id);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.campaign_members (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'player' check (role in ('gm', 'player')),
  character_id uuid references public.characters (id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index campaign_members_user_id_idx on public.campaign_members (user_id);
create index campaign_members_character_id_idx on public.campaign_members (character_id);

create trigger campaign_members_set_updated_at
  before update on public.campaign_members
  for each row execute function public.set_updated_at();

-- Integrity for membership rows written by end users (RLS decides *which* rows; this
-- decides *what* may change):
--  * campaign_id and user_id of an existing row never change;
--  * role changes only by the campaign's GM;
--  * only the member themselves attaches/changes their character or accepts an invite
--    (invited -> active); a row a GM creates for someone else is forced to
--    status 'invited' with no character;
--  * an attached character must belong to the member and match the campaign's system.
-- Skipped for privileged callers with no auth.uid() (service role, migrations, seed).
create or replace function public.campaign_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_char_system text;
begin
  if v_uid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id <> v_uid then
      new.status := 'invited';
      new.character_id := null;
    end if;
  else
    if (new.user_id, new.campaign_id) is distinct from (old.user_id, old.campaign_id) then
      raise exception 'membership rows cannot be moved' using errcode = '42501';
    end if;
    if new.role is distinct from old.role and not public.is_campaign_gm(old.campaign_id) then
      raise exception 'only the GM can change roles' using errcode = '42501';
    end if;
    if new.user_id <> v_uid
       and (new.character_id is distinct from old.character_id
            or (old.status = 'invited' and new.status = 'active')) then
      raise exception 'only the member can pick a character or accept an invite'
        using errcode = '42501';
    end if;
  end if;

  if new.character_id is not null
     and (tg_op = 'INSERT' or new.character_id is distinct from old.character_id) then
    select ch.owner_id, ch.system_id into v_owner, v_char_system
      from public.characters ch where ch.id = new.character_id;
    if v_owner is distinct from new.user_id then
      raise exception 'not_your_character' using errcode = 'P0001';
    end if;
    if v_char_system is distinct from (select c.system_id from public.campaigns c where c.id = new.campaign_id) then
      raise exception 'system_mismatch' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.campaign_members_guard() from public, anon, authenticated;

create trigger campaign_members_guard
  before insert or update on public.campaign_members
  for each row execute function public.campaign_members_guard();

-- content.campaign_id -> campaigns (content is created before campaigns).
alter table public.content
  add constraint content_campaign_id_fkey
  foreign key (campaign_id) references public.campaigns (id) on delete cascade;
