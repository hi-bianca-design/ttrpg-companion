-- characters, character_picks, character_items. System-agnostic: system-specific shapes
-- live in the jsonb columns and are validated by the system module in src/systems/.

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  system_id text not null references public.game_systems (id) on delete restrict,
  name text not null check (length(name) > 0),
  level integer not null default 1 check (level >= 1),
  portrait_url text,
  stats jsonb not null default '{}'::jsonb,
  resources jsonb not null default '{}'::jsonb,
  conditions text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index characters_owner_id_idx on public.characters (owner_id);
create index characters_system_id_idx on public.characters (system_id);

create trigger characters_set_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- What a character is and knows (class, species, feats, spells, ...).
create table public.character_picks (
  character_id uuid not null references public.characters (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  kind text not null, -- denormalised from content.kind for querying
  state jsonb not null default '{}'::jsonb,
  acquired_at_level integer not null default 1 check (acquired_at_level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (character_id, content_id)
);

create index character_picks_content_id_idx on public.character_picks (content_id);

create trigger character_picks_set_updated_at
  before update on public.character_picks
  for each row execute function public.set_updated_at();

-- What a character carries. Same item may appear more than once (e.g. different notes).
create table public.character_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 0),
  equipped boolean not null default false,
  attuned boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_items_character_id_idx on public.character_items (character_id);
create index character_items_content_id_idx on public.character_items (content_id);

create trigger character_items_set_updated_at
  before update on public.character_items
  for each row execute function public.set_updated_at();
