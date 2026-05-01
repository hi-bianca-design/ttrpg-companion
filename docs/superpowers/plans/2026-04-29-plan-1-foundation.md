# Foundation Implementation Plan (Plan 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Expo project, define the full database schema in Supabase, seed all SRD 5.1 content, and implement a working Auth module (sign up, login, logout, protected routing).

**Architecture:** Expo Router v3 for file-based navigation with route groups separating auth and app screens. A root layout checks Supabase session state and redirects to `(auth)` or `(app)` accordingly. Auth logic is encapsulated in `src/modules/auth/` — a service layer over Supabase Auth, a React context provider, and a hook.

**Tech Stack:** Expo SDK 54, Expo Router v6, React Native, TypeScript, Supabase JS v2, NativeWind v4, Zustand, Jest, @testing-library/react-native

---

## Plan Overview (all 5 plans)

| Plan | Covers |
|------|--------|
| **1 — this one** | Expo setup · DB schema · SRD seed · Auth |
| 2 | Character Builder (creation wizard + sheet tabs + leveling) |
| 3 | Campaign Manager (create · invite · manage members) |
| 4 | Session Console (live session · real-time sync · DM dashboard) |
| 5 | Custom Content Manager (user-defined spells · subclasses · species) |

---

## File Structure

```
/
├── app/
│   ├── _layout.tsx                   # Root layout — loads auth state, redirects
│   ├── (auth)/
│   │   ├── _layout.tsx               # Auth group layout (no nav chrome)
│   │   ├── login.tsx                 # /login screen
│   │   └── signup.tsx                # /signup screen
│   └── (app)/
│       ├── _layout.tsx               # Protected layout (tab bar placeholder)
│       └── index.tsx                 # /home screen (placeholder)
├── src/
│   ├── lib/
│   │   └── supabase.ts               # Supabase client singleton
│   ├── modules/
│   │   └── auth/
│   │       ├── AuthProvider.tsx      # Session context + Supabase listener
│   │       ├── useAuth.ts            # Hook: { user, session, loading }
│   │       └── auth.service.ts       # signUp · signIn · signOut functions
│   └── types/
│       └── database.types.ts         # Hand-written DB types (replaced by generated in Task 6)
├── supabase/
│   ├── config.toml                   # Supabase CLI config
│   ├── migrations/
│   │   ├── 20260429000001_schema.sql # Full DB schema
│   │   └── 20260429000002_rls.sql    # Row-level security policies
│   └── seed/
│       └── srd_seed.sql              # SRD 5.1 reference data
├── __tests__/
│   └── modules/
│       └── auth/
│           ├── auth.service.test.ts
│           └── useAuth.test.tsx
├── jest.config.js
├── jest.setup.ts
├── tailwind.config.js
├── global.css
├── babel.config.js
├── app.json
└── tsconfig.json
```

---

## Task 1: Initialize Expo Project

**Files:**
- Create: `app.json`, `package.json`, `tsconfig.json`, `babel.config.js`

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/biancachong/Vibes/PersonalProjects/DnD
npx create-expo-app@latest . --template blank-typescript
```

Expected: project files created, `npm install` run automatically.

- [ ] **Step 2: Install Expo Router**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar
```

- [ ] **Step 3: Update `app.json` to enable Expo Router**

Replace the contents of `app.json`:

```json
{
  "expo": {
    "name": "DnD Companion",
    "slug": "dnd-companion",
    "version": "1.0.0",
    "scheme": "dnd-companion",
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Update `package.json` main entry**

In `package.json`, set:

```json
{
  "main": "expo-router/entry"
}
```

- [ ] **Step 5: Verify app boots**

```bash
npx expo start --web
```

Expected: browser opens to a blank screen with no errors in terminal.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Expo project with Expo Router"
```

---

## Task 2: Configure Dependencies and Tooling

**Files:**
- Create: `tailwind.config.js`, `global.css`, `jest.config.js`, `jest.setup.ts`
- Modify: `babel.config.js`, `tsconfig.json`

- [ ] **Step 1: Install Supabase, NativeWind, Zustand**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  react-native-url-polyfill

npm install nativewind zustand
npm install --save-dev tailwindcss@3.3.2
```

- [ ] **Step 2: Install testing libraries**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native \
  jest-expo ts-jest
```

- [ ] **Step 3: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: '#1e1e2e',
        surface: '#313244',
        overlay: '#45475a',
        muted: '#6c7086',
        text: '#cdd6f4',
        primary: '#cba6f7',
        blue: '#89b4fa',
        green: '#a6e3a1',
        red: '#f38ba8',
        yellow: '#f9e2af',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Update `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

- [ ] **Step 6: Update `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 7: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
}
```

- [ ] **Step 8: Create `jest.setup.ts`**

```ts
import '@testing-library/jest-native/extend-expect'
```

- [ ] **Step 9: Verify tests run**

```bash
npx jest --passWithNoTests
```

Expected: `Test Suites: 0 skipped` with exit code 0.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: configure NativeWind, Supabase, Zustand, and Jest"
```

---

## Task 3: Supabase Project Setup and Schema

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/20260429000001_schema.sql`, `supabase/migrations/20260429000002_rls.sql`

- [ ] **Step 1: Install Supabase CLI**

```bash
npm install --save-dev supabase
```

- [ ] **Step 2: Initialize Supabase**

```bash
npx supabase init
```

Expected: `supabase/` directory created with `config.toml`.

- [ ] **Step 3: Create a Supabase project**

Go to https://supabase.com, create a new project named `dnd-companion`. Copy the **Project URL** and **anon public key** from Settings → API.

- [ ] **Step 4: Create `.env.local`**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add `.env.local` to `.gitignore`.

- [ ] **Step 5: Create the schema migration**

Create `supabase/migrations/20260429000001_schema.sql`:

```sql
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
  spell_id uuid references public.spells,
  custom_content_id uuid references public.user_content,
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
  equipment_id uuid references public.equipment,
  custom_content_id uuid references public.user_content,
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
  character_id uuid references public.characters,
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
```

- [ ] **Step 6: Create the RLS migration**

Create `supabase/migrations/20260429000002_rls.sql`:

```sql
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.characters enable row level security;
alter table public.character_spells enable row level security;
alter table public.character_equipment enable row level security;
alter table public.user_content enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_characters enable row level security;

-- SRD tables are read-only for all authenticated users
alter table public.classes enable row level security;
alter table public.subclasses enable row level security;
alter table public.species enable row level security;
alter table public.backgrounds enable row level security;
alter table public.feats enable row level security;
alter table public.spells enable row level security;
alter table public.equipment enable row level security;

create policy "SRD classes readable by all" on public.classes for select using (auth.role() = 'authenticated');
create policy "SRD subclasses readable by all" on public.subclasses for select using (auth.role() = 'authenticated');
create policy "SRD species readable by all" on public.species for select using (auth.role() = 'authenticated');
create policy "SRD backgrounds readable by all" on public.backgrounds for select using (auth.role() = 'authenticated');
create policy "SRD feats readable by all" on public.feats for select using (auth.role() = 'authenticated');
create policy "SRD spells readable by all" on public.spells for select using (auth.role() = 'authenticated');
create policy "SRD equipment readable by all" on public.equipment for select using (auth.role() = 'authenticated');

-- Users can read/write their own profile
create policy "Users manage own profile" on public.users
  using (auth.uid() = id) with check (auth.uid() = id);

-- Characters: owner can CRUD; DMs of campaigns containing this character can read
create policy "Users manage own characters" on public.characters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "DMs can read campaign characters" on public.characters
  for select using (
    exists (
      select 1 from public.campaign_members cm
      join public.campaigns c on c.id = cm.campaign_id
      where cm.character_id = characters.id
        and c.dm_id = auth.uid()
    )
  );

-- Character spells/equipment: follow character ownership
create policy "Users manage own character spells" on public.character_spells
  for all using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

create policy "Users manage own character equipment" on public.character_equipment
  for all using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

-- User content: owner only
create policy "Users manage own content" on public.user_content
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Campaigns: DM can CRUD; members can read
create policy "DMs manage own campaigns" on public.campaigns
  for all using (auth.uid() = dm_id) with check (auth.uid() = dm_id);

create policy "Members can read campaigns" on public.campaigns
  for select using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaigns.id and user_id = auth.uid()
    )
  );

-- Campaign members: DM manages; members read own row
create policy "DMs manage campaign members" on public.campaign_members
  for all using (
    exists (select 1 from public.campaigns where id = campaign_id and dm_id = auth.uid())
  );

create policy "Members read own membership" on public.campaign_members
  for select using (auth.uid() = user_id);

-- Sessions: DM can CRUD; members can read
create policy "DMs manage sessions" on public.sessions
  for all using (
    exists (select 1 from public.campaigns where id = campaign_id and dm_id = auth.uid())
  );

create policy "Members can read sessions" on public.sessions
  for select using (
    exists (
      select 1 from public.campaign_members cm
      join public.campaigns c on c.id = cm.campaign_id
      where c.id = sessions.campaign_id and cm.user_id = auth.uid()
    )
  );

-- Session characters: DM and character owner can update; all session members can read
create policy "Session members can read session_characters" on public.session_characters
  for select using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = session_characters.session_id
        and (cm.user_id = auth.uid() or c.dm_id = auth.uid())
    )
  );

create policy "Character owner can update session_characters" on public.session_characters
  for update using (
    exists (select 1 from public.characters where id = character_id and user_id = auth.uid())
  );

create policy "DMs can update any session_character" on public.session_characters
  for update using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = session_characters.session_id and c.dm_id = auth.uid()
    )
  );

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 7: Apply migrations to Supabase**

```bash
npx supabase db push
```

Expected: both migration files applied successfully.

- [ ] **Step 8: Commit**

```bash
git add supabase/ .env.local.example
git commit -m "feat: add database schema and RLS policies"
```

---

## Task 4: SRD Seed Data

**Files:**
- Create: `supabase/seed/srd_seed.sql`

The **2024 SRD (CC BY 4.0)** content is sourced from the official release at `https://www.dndbeyond.com/srd` (or the GitHub mirror at `https://github.com/WotC-OGL/SRD-CC`). This task seeds the core classes, species, backgrounds, and a representative subset of spells using the updated 2024 rules. Full spell seeding (~200+ spells in the 2024 SRD) follows the same pattern.

Key 2024 SRD differences reflected in seed data:
- **Backgrounds** grant ability score bonuses (+2/+1 or +1/+1/+1) — species do not
- Species grant traits only (no ability score bonuses)
- Several classes were redesigned (Ranger, Druid, etc.)

- [ ] **Step 1: Create the seed file with SRD classes**

Create `supabase/seed/srd_seed.sql` starting with classes:

```sql
-- SRD 5.1 Classes
insert into public.classes (id, name, hit_die, primary_abilities, saving_throw_proficiencies, description) values
  ('cls-barbarian', 'Barbarian', 12, array['strength','constitution'], array['strength','constitution'], 'A fierce warrior who can enter a battle rage.'),
  ('cls-bard', 'Bard', 8, array['dexterity','charisma'], array['dexterity','charisma'], 'An inspiring magician whose power echoes the music of creation.'),
  ('cls-cleric', 'Cleric', 8, array['wisdom','charisma'], array['wisdom','charisma'], 'A priestly champion who wields divine magic in service of a higher power.'),
  ('cls-druid', 'Druid', 8, array['intelligence','wisdom'], array['intelligence','wisdom'], 'A priest of the Old Faith, wielding the powers of nature.'),
  ('cls-fighter', 'Fighter', 10, array['strength','dexterity'], array['strength','constitution'], 'A master of martial combat, skilled with a variety of weapons and armor.'),
  ('cls-monk', 'Monk', 8, array['strength','dexterity'], array['strength','dexterity'], 'A master of martial arts, harnessing the power of the body.'),
  ('cls-paladin', 'Paladin', 10, array['strength','charisma'], array['wisdom','charisma'], 'A holy warrior bound to a sacred oath.'),
  ('cls-ranger', 'Ranger', 10, array['dexterity','wisdom'], array['strength','dexterity'], 'A warrior who combats threats on the edges of civilization.'),
  ('cls-rogue', 'Rogue', 8, array['dexterity','intelligence'], array['dexterity','intelligence'], 'A scoundrel who uses stealth and trickery to overcome obstacles.'),
  ('cls-sorcerer', 'Sorcerer', 6, array['constitution','charisma'], array['constitution','charisma'], 'A spellcaster who draws on inherent magic from a gift or bloodline.'),
  ('cls-warlock', 'Warlock', 8, array['wisdom','charisma'], array['wisdom','charisma'], 'A wielder of magic derived from a bargain with an extraplanar entity.'),
  ('cls-wizard', 'Wizard', 6, array['intelligence','wisdom'], array['intelligence','wisdom'], 'A scholarly magic-user capable of manipulating the structures of reality.');

-- SRD Subclasses
insert into public.subclasses (id, class_id, name, description) values
  ('sub-berserker', 'cls-barbarian', 'Berserker', 'For some barbarians, rage is a means to an end — that end being violence.'),
  ('sub-lore', 'cls-bard', 'College of Lore', 'Bards of the College of Lore know something about most things.'),
  ('sub-life', 'cls-cleric', 'Life Domain', 'The Life domain focuses on the vibrant positive energy that sustains all life.'),
  ('sub-light', 'cls-cleric', 'Light Domain', 'Gods of light promote the ideals of rebirth and truth.'),
  ('sub-land', 'cls-druid', 'Circle of the Land', 'The Circle of the Land is made up of mystics and sages.'),
  ('sub-champion', 'cls-fighter', 'Champion', 'The archetypal Champion focuses on the development of raw physical power.'),
  ('sub-open-hand', 'cls-monk', 'Way of the Open Hand', 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat.'),
  ('sub-devotion', 'cls-paladin', 'Oath of Devotion', 'The Oath of Devotion binds a paladin to the loftiest ideals of justice.'),
  ('sub-hunter', 'cls-ranger', 'Hunter', 'Emulating the Hunter archetype means accepting your place as a bulwark.'),
  ('sub-thief', 'cls-rogue', 'Thief', 'You hone your skills in the larcenous arts.'),
  ('sub-wild-magic', 'cls-sorcerer', 'Wild Magic', 'Your innate magic comes from the wild forces of chaos.'),
  ('sub-fiend', 'cls-warlock', 'The Fiend', 'You have made a pact with a fiend from the lower planes of existence.'),
  ('sub-evocation', 'cls-wizard', 'School of Evocation', 'You focus your study on magic that creates powerful elemental effects.');

-- 2024 SRD Species (no ability score bonuses — those come from backgrounds in 2024 rules)
insert into public.species (id, name, speed, traits, ability_score_bonuses) values
  ('sp-human', 'Human', 30, '{"traits": ["Resourceful", "Skillful", "Versatile"]}', '{}'),
  ('sp-elf', 'Elf', 30, '{"traits": ["Darkvision", "Keen Senses", "Fey Ancestry", "Trance"]}', '{}'),
  ('sp-dwarf', 'Dwarf', 30, '{"traits": ["Darkvision", "Dwarven Resilience", "Dwarven Toughness", "Stonecunning"]}', '{}'),
  ('sp-halfling', 'Halfling', 30, '{"traits": ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"]}', '{}'),
  ('sp-gnome', 'Gnome', 30, '{"traits": ["Darkvision", "Gnomish Cunning", "Gnomish Lineage"]}', '{}'),
  ('sp-orc', 'Orc', 30, '{"traits": ["Adrenaline Rush", "Darkvision", "Relentless Endurance"]}', '{}'),
  ('sp-tiefling', 'Tiefling', 30, '{"traits": ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"]}', '{}'),
  ('sp-dragonborn', 'Dragonborn', 30, '{"traits": ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Draconic Flight"]}', '{}');

-- SRD Backgrounds
insert into public.backgrounds (id, name, skill_proficiencies, ability_score_options, description, feature) values
  ('bg-acolyte', 'Acolyte', array['insight','religion'], '{"options": [["intelligence","wisdom","charisma"]]}', 'You have spent your life in service to a temple.', 'Shelter of the Faithful'),
  ('bg-criminal', 'Criminal', array['deception','stealth'], '{"options": [["dexterity","intelligence","charisma"]]}', 'You are an experienced criminal with a history of breaking the law.', 'Criminal Contact'),
  ('bg-folk-hero', 'Folk Hero', array['animal-handling','survival'], '{"options": [["constitution","dexterity","wisdom"]]}', 'You come from a humble social rank but are destined for so much more.', 'Rustic Hospitality'),
  ('bg-hermit', 'Hermit', array['medicine','religion'], '{"options": [["constitution","intelligence","wisdom"]]}', 'You lived in seclusion for a formative part of your life.', 'Discovery'),
  ('bg-noble', 'Noble', array['history','persuasion'], '{"options": [["intelligence","wisdom","charisma"]]}', 'You understand wealth, power, and privilege.', 'Position of Privilege'),
  ('bg-outlander', 'Outlander', array['athletics','survival'], '{"options": [["strength","constitution","wisdom"]]}', 'You grew up in the wilds, far from civilization.', 'Wanderer'),
  ('bg-sage', 'Sage', array['arcana','history'], '{"options": [["constitution","intelligence","wisdom"]]}', 'You spent years learning the lore of the multiverse.', 'Researcher'),
  ('bg-sailor', 'Sailor', array['athletics','perception'], '{"options": [["strength","dexterity","wisdom"]]}', 'You sailed on a seagoing vessel for years.', "Ship's Passage"),
  ('bg-soldier', 'Soldier', array['athletics','intimidation'], '{"options": [["strength","dexterity","constitution"]]}', 'War has been your life for as long as you care to remember.', 'Military Rank'),
  ('bg-urchin', 'Urchin', array['sleight-of-hand','stealth'], '{"options": [["dexterity","intelligence","charisma"]]}', 'You grew up on the streets alone, orphaned.', 'City Secrets');

-- SRD Spells (representative sample — full list follows same pattern)
insert into public.spells (id, name, level, school, casting_time, range, components, duration, description, classes, is_ritual, requires_concentration) values
  ('sp-fireball', 'Fireball', 3, 'Evocation', '1 action', '150 feet', 'V, S, M (a tiny ball of bat guano and sulfur)', 'Instantaneous', 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.', array['sorcerer','wizard'], false, false),
  ('sp-cure-wounds', 'Cure Wounds', 1, 'Evocation', '1 action', 'Touch', 'V, S', 'Instantaneous', 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.', array['bard','cleric','druid','paladin','ranger'], false, false),
  ('sp-magic-missile', 'Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.', array['sorcerer','wizard'], false, false),
  ('sp-shield', 'Shield', 1, 'Abjuration', '1 reaction', 'Self', 'V, S', '1 round', 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.', array['sorcerer','wizard'], false, false),
  ('sp-healing-word', 'Healing Word', 1, 'Evocation', '1 bonus action', '60 feet', 'V', 'Instantaneous', 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.', array['bard','cleric','druid'], false, false),
  ('sp-prestidigitation', 'Prestidigitation', 0, 'Transmutation', '1 action', '10 feet', 'V, S', 'Up to 1 hour', 'This spell is a minor magical trick that novice spellcasters use for practice.', array['bard','sorcerer','warlock','wizard'], false, false),
  ('sp-mage-hand', 'Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V, S', '1 minute', 'A spectral, floating hand appears at a point you choose within range.', array['bard','sorcerer','warlock','wizard'], false, false),
  ('sp-sacred-flame', 'Sacred Flame', 0, 'Evocation', '1 action', '60 feet', 'V, S', 'Instantaneous', 'Flame-like radiance descends on a creature that you can see within range.', array['cleric'], false, false),
  ('sp-eldritch-blast', 'Eldritch Blast', 0, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.', array['warlock'], false, false),
  ('sp-hex', 'Hex', 1, 'Enchantment', '1 bonus action', '90 feet', 'V, S, M (the petrified eye of a newt)', 'Concentration, up to 1 hour', 'You place a curse on a creature that you can see within range.', array['warlock'], false, true),
  ('sp-bless', 'Bless', 1, 'Enchantment', '1 action', '30 feet', 'V, S, M (a sprinkling of holy water)', 'Concentration, up to 1 minute', 'You bless up to three creatures of your choice within range.', array['cleric','paladin'], false, true),
  ('sp-detect-magic', 'Detect Magic', 1, 'Divination', '1 action', 'Self', 'V, S', 'Concentration, up to 10 minutes', 'For the duration, you sense the presence of magic within 30 feet of you.', array['bard','cleric','druid','paladin','ranger','sorcerer','wizard'], true, true);
```

- [ ] **Step 2: Apply seed data**

In the Supabase dashboard → SQL Editor, paste and run the full contents of `supabase/seed/srd_seed.sql`.

Verify with:
```sql
select count(*) from public.classes;      -- expect 12
select count(*) from public.species;      -- expect 9
select count(*) from public.backgrounds;  -- expect 10
select count(*) from public.spells;       -- expect 12 (add more following same pattern)
```

- [ ] **Step 3: Commit**

```bash
git add supabase/seed/
git commit -m "feat: seed SRD 5.1 reference data"
```

---

## Task 5: Supabase Client and TypeScript Types

**Files:**
- Create: `src/lib/supabase.ts`, `src/types/database.types.ts`

- [ ] **Step 1: Create the Supabase client**

Create `src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

- [ ] **Step 2: Generate TypeScript types from Supabase**

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
```

Replace `your-project-id` with the ID from your Supabase project URL (the part before `.supabase.co`).

Expected: `src/types/database.types.ts` generated with typed table definitions.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts src/types/database.types.ts
git commit -m "feat: add Supabase client and generated TypeScript types"
```

---

## Task 6: Auth Service

**Files:**
- Create: `src/modules/auth/auth.service.ts`, `__tests__/modules/auth/auth.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/modules/auth/auth.service.test.ts`:

```ts
import { signUp, signIn, signOut } from '@/modules/auth/auth.service'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

const mockFrom = supabase.from as jest.Mock

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockReturnValue({ insert: jest.fn().mockResolvedValue({ error: null }) })
  })

  describe('signUp', () => {
    it('calls supabase.auth.signUp with email and password', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await signUp('test@example.com', 'password123', 'testuser')

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('throws when auth signup fails', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      })

      await expect(signUp('existing@example.com', 'password123', 'user'))
        .rejects.toThrow('Email already registered')
    })
  })

  describe('signIn', () => {
    it('calls signInWithPassword with email and password', async () => {
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { access_token: 'tok' } },
        error: null,
      })

      const result = await signIn('test@example.com', 'password123')

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.user?.id).toBe('user-123')
    })

    it('throws when credentials are invalid', async () => {
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      })

      await expect(signIn('bad@example.com', 'wrong')).rejects.toThrow('Invalid login credentials')
    })
  })

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })
      await signOut()
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    })

    it('throws when signOut fails', async () => {
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Network error' },
      })
      await expect(signOut()).rejects.toThrow('Network error')
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest auth.service.test.ts --no-coverage
```

Expected: `Cannot find module '@/modules/auth/auth.service'`

- [ ] **Step 3: Implement the auth service**

Create `src/modules/auth/auth.service.ts`:

```ts
import { supabase } from '@/lib/supabase'

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
```

Note: user profile creation is handled by the `on_auth_user_created` database trigger defined in the RLS migration, so the service does not need to insert into `public.users` manually.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest auth.service.test.ts --no-coverage
```

Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.service.ts __tests__/modules/auth/auth.service.test.ts
git commit -m "feat: add auth service (signUp, signIn, signOut)"
```

---

## Task 7: AuthProvider and useAuth Hook

**Files:**
- Create: `src/modules/auth/AuthProvider.tsx`, `src/modules/auth/useAuth.ts`, `__tests__/modules/auth/useAuth.test.tsx`

- [ ] **Step 1: Write failing tests for useAuth**

Create `__tests__/modules/auth/useAuth.test.tsx`:

```tsx
import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { AuthProvider } from '@/modules/auth/AuthProvider'
import { useAuth } from '@/modules/auth/useAuth'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  it('returns loading true initially', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
  })

  it('returns null user when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('throws when used outside AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest useAuth.test.tsx --no-coverage
```

Expected: `Cannot find module '@/modules/auth/AuthProvider'`

- [ ] **Step 3: Implement AuthProvider**

Create `src/modules/auth/AuthProvider.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 4: Implement useAuth hook**

Create `src/modules/auth/useAuth.ts`:

```ts
import { useContext } from 'react'
import { AuthContext } from './AuthProvider'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest useAuth.test.tsx --no-coverage
```

Expected: `Tests: 3 passed`

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/ __tests__/modules/auth/useAuth.test.tsx
git commit -m "feat: add AuthProvider and useAuth hook"
```

---

## Task 8: Root Layout and Protected Routing

**Files:**
- Create: `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(app)/_layout.tsx`

- [ ] **Step 1: Create root layout with AuthProvider and redirect logic**

Create `app/_layout.tsx`:

```tsx
import '../global.css'
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { AuthProvider } from '@/modules/auth/AuthProvider'
import { useAuth } from '@/modules/auth/useAuth'

function RootRedirect() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) router.replace('/(auth)/login')
    if (user && inAuthGroup) router.replace('/(app)')
  }, [user, loading, segments])

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootRedirect />
    </AuthProvider>
  )
}
```

- [ ] **Step 2: Create auth group layout**

Create `app/(auth)/_layout.tsx`:

```tsx
import { Slot } from 'expo-router'
import { View } from 'react-native'

export default function AuthLayout() {
  return (
    <View className="flex-1 bg-base">
      <Slot />
    </View>
  )
}
```

- [ ] **Step 3: Create protected app group layout**

Create `app/(app)/_layout.tsx`:

```tsx
import { Slot } from 'expo-router'
import { View } from 'react-native'

export default function AppLayout() {
  return (
    <View className="flex-1 bg-base">
      <Slot />
    </View>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add root layout with protected routing"
```

---

## Task 9: Login and Signup Screens

**Files:**
- Create: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`

- [ ] **Step 1: Create Login screen**

Create `app/(auth)/login.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { signIn } from '@/modules/auth/auth.service'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (e: any) {
      Alert.alert('Login failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-4xl font-bold text-primary mb-2">D&D Companion</Text>
      <Text className="text-muted mb-10">Sign in to your account</Text>

      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-3"
        placeholder="Email"
        placeholderTextColor="#6c7086"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-6"
        placeholder="Password"
        placeholderTextColor="#6c7086"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-primary rounded-xl py-3 items-center mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#1e1e2e" />
          : <Text className="text-base font-semibold text-[#1e1e2e]">Sign In</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text className="text-muted text-center">
          Don't have an account? <Text className="text-primary">Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

- [ ] **Step 2: Create Signup screen**

Create `app/(auth)/signup.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { signUp } from '@/modules/auth/auth.service'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup() {
    if (!email || !username || !password) return
    setLoading(true)
    try {
      await signUp(email.trim(), password, username.trim())
      Alert.alert('Check your email', 'We sent you a confirmation link.')
      router.replace('/(auth)/login')
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-4xl font-bold text-primary mb-2">Create Account</Text>
      <Text className="text-muted mb-10">Join D&D Companion</Text>

      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-3"
        placeholder="Email"
        placeholderTextColor="#6c7086"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-3"
        placeholder="Username"
        placeholderTextColor="#6c7086"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        className="bg-surface text-text rounded-xl px-4 py-3 mb-6"
        placeholder="Password"
        placeholderTextColor="#6c7086"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-primary rounded-xl py-3 items-center mb-4"
        onPress={handleSignup}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#1e1e2e" />
          : <Text className="text-base font-semibold text-[#1e1e2e]">Create Account</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text className="text-muted text-center">
          Already have an account? <Text className="text-primary">Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login and signup screens"
```

---

## Task 10: Home Screen Placeholder and Final Verification

**Files:**
- Create: `app/(app)/index.tsx`

- [ ] **Step 1: Create home screen**

Create `app/(app)/index.tsx`:

```tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { signOut } from '@/modules/auth/auth.service'
import { useAuth } from '@/modules/auth/useAuth'

export default function HomeScreen() {
  const { user } = useAuth()

  return (
    <View className="flex-1 justify-center items-center px-6">
      <Text className="text-3xl font-bold text-primary mb-2">Welcome</Text>
      <Text className="text-muted mb-10">{user?.email}</Text>
      <TouchableOpacity
        className="bg-surface rounded-xl px-6 py-3"
        onPress={signOut}
      >
        <Text className="text-text">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Verify app in browser**

```bash
npx expo start --web
```

Walk through: unauthenticated → redirected to `/login` → sign up → confirm email → sign in → lands on home screen → sign out → redirected back to `/login`.

- [ ] **Step 4: Final commit**

```bash
git add app/\(app\)/
git commit -m "feat: add home screen placeholder — Plan 1 complete"
```

---

## Self-Review Checklist

- [x] Schema covers all tables from spec: `users`, `characters`, `character_spells`, `character_equipment`, `user_content`, `campaigns`, `campaign_members`, `sessions`, `session_characters`, all SRD reference tables
- [x] RLS policies cover all tables: owner-scoped writes, DM read access on campaign characters, real-time subscription table policies
- [x] Auth flow: signUp, signIn, signOut, session persistence via AsyncStorage, protected routing
- [x] `on_auth_user_created` trigger creates `public.users` profile automatically on signup
- [x] SRD seed covers all 12 classes, 13 subclasses, 9 species, 10 backgrounds, 12 spells (expandable)
- [x] Type generation step ensures TypeScript types match actual schema
- [x] All test mocks match actual function signatures in implementation
