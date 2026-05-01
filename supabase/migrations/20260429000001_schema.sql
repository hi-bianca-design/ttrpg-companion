-- Users profile (extends Supabase Auth)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- SRD Reference Tables (read-only, seeded once)
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hit_die integer not null,
  primary_abilities text[] not null,
  saving_throw_proficiencies text[] not null,
  description text,
  features jsonb default '{}'
);

create table public.subclasses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes not null,
  name text not null,
  description text,
  features jsonb default '{}'
);

create table public.species (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  speed integer not null default 30,
  traits jsonb default '{}',
  ability_score_bonuses jsonb default '{}'
);

create table public.backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  skill_proficiencies text[] not null,
  ability_score_options jsonb default '{}',
  description text,
  feature text
);

create table public.feats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prerequisites jsonb default '{}',
  benefits text not null,
  ability_score_bonuses jsonb default '{}'
);

create table public.spells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level integer not null check (level >= 0 and level <= 9),
  school text not null,
  casting_time text not null,
  range text not null,
  components text not null,
  duration text not null,
  description text not null,
  classes text[] not null,
  is_ritual boolean default false,
  requires_concentration boolean default false
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  cost text,
  weight numeric,
  properties jsonb default '{}'
);

-- User Custom Content
create table public.user_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users not null,
  content_type text not null check (
    content_type in ('subclass','spell','species','background','feat','equipment')
  ),
  name text not null,
  description text,
  properties jsonb default '{}',
  created_at timestamptz default now()
);

-- Character Domain
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users not null,
  name text not null,
  level integer not null default 1 check (level >= 1 and level <= 20),
  class_id uuid references public.classes,
  subclass_id uuid references public.subclasses,
  species_id uuid references public.species,
  background_id uuid references public.backgrounds,
  alignment text,
  strength integer not null check (strength >= 1 and strength <= 30),
  dexterity integer not null check (dexterity >= 1 and dexterity <= 30),
  constitution integer not null check (constitution >= 1 and constitution <= 30),
  intelligence integer not null check (intelligence >= 1 and intelligence <= 30),
  wisdom integer not null check (wisdom >= 1 and wisdom <= 30),
  charisma integer not null check (charisma >= 1 and charisma <= 30),
  hp_max integer not null,
  hp_current integer not null,
  temp_hp integer not null default 0,
  armor_class integer not null,
  speed integer not null default 30,
  proficiency_bonus integer not null default 2,
  death_save_successes integer not null default 0 check (death_save_successes >= 0 and death_save_successes <= 3),
  death_save_failures integer not null default 0 check (death_save_failures >= 0 and death_save_failures <= 3),
  conditions text[] default '{}',
  notes text default '',
  created_at timestamptz default now()
);

create table public.character_spells (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references public.characters on delete cascade not null,
  spell_id uuid references public.spells on delete set null,
  custom_content_id uuid references public.user_content on delete set null,
  is_prepared boolean default false,
  slots_expended jsonb default '{}',
  check (
    (spell_id is not null and custom_content_id is null) or
    (spell_id is null and custom_content_id is not null)
  )
);

create table public.character_equipment (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references public.characters on delete cascade not null,
  equipment_id uuid references public.equipment on delete set null,
  custom_content_id uuid references public.user_content on delete set null,
  quantity integer not null default 1,
  is_equipped boolean not null default false,
  check (
    (equipment_id is not null and custom_content_id is null) or
    (equipment_id is null and custom_content_id is not null)
  )
);

-- Campaign Domain
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dm_id uuid references public.users not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table public.campaign_members (
  campaign_id uuid references public.campaigns on delete cascade,
  user_id uuid references public.users,
  character_id uuid references public.characters,
  status text not null check (status in ('invited','active')),
  primary key (campaign_id, user_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns not null,
  status text not null check (status in ('lobby','active','ended')) default 'lobby',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- Real-time subscriptions fire on this table
create table public.session_characters (
  session_id uuid references public.sessions on delete cascade,
  character_id uuid references public.characters not null,
  hp_current integer not null,
  temp_hp integer not null default 0,
  conditions text[] default '{}',
  spell_slots_used jsonb default '{}',
  death_save_successes integer not null default 0 check (death_save_successes >= 0 and death_save_successes <= 3),
  death_save_failures integer not null default 0 check (death_save_failures >= 0 and death_save_failures <= 3),
  initiative integer,
  is_active_turn boolean default false,
  primary key (session_id, character_id)
);

-- Indexes for FK columns used in RLS policies and joins
create index on public.subclasses (class_id);
create index on public.user_content (user_id);
create index on public.characters (user_id);
create index on public.character_spells (character_id);
create index on public.character_equipment (character_id);
create index on public.campaign_members (user_id);
create index on public.campaign_members (character_id);
create index on public.campaigns (dm_id);
create index on public.sessions (campaign_id);
create index on public.session_characters (session_id);
create index on public.session_characters (character_id);
