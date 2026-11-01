# SRD 5.2.1 Database Population Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sparse placeholder SRD seed data with complete, accurate data from the 2024 SRD 5.2.1 PDF across all nine reference tables.

**Architecture:** Nine sequential Supabase migration files — one per content category. Each is self-contained: delete or update stale rows, then insert complete SRD content. Schema changes go first (Task 1), classes before subclasses (Task 3 depends on Task 2 class IDs), origin tables before character-level choices. Tasks 8–9 (Spells, Magic Items) are large and instruct the executor to extract remaining entries directly from the PDF using the provided `pdftotext` commands.

**Source PDF:** `/Users/biancachong/Desktop/SRD_CC_v5.2.1.pdf` — extract text with `pdftotext /Users/biancachong/Desktop/SRD_CC_v5.2.1.pdf -`

**Tech Stack:** PostgreSQL · Supabase CLI (`supabase db push`) · Existing schema in `supabase/migrations/20260429000001_schema.sql`

---

## Key Findings from PDF Audit

These discrepancies exist between the current seed and the actual SRD 5.2.1 content:

| Table | Current State | SRD Reality |
|---|---|---|
| `subclasses` | "Berserker", "Wild Magic", "The Fiend", "School of Evocation", "Way of the Open Hand" | Wrong names; "Wild Magic" isn't in SRD at all (should be "Draconic Sorcery"); "Light Domain" also not in SRD |
| `species` | 8 rows, no size/creature_type columns | 9 species (Goliath missing); needs `size` + `creature_type` columns |
| `backgrounds` | 9 rows (only 4 are in SRD) | Only Acolyte, Criminal, Sage, Soldier are in SRD 5.2.1; needs `tool_proficiency` column |
| `feats` | 0 rows | 15 feats: 4 Origin, 2 General, 4 Fighting Style, 7 Epic Boon |
| `equipment` | 0 rows | 46 weapons, 13 armor types, 80+ adventuring gear items |
| `spells` | 13 rows | ~316 spells |
| `magic_items` | Table doesn't exist | Table needed, ~120 items A–Z |

---

## File Structure

**New migrations (create these):**
- `supabase/migrations/20260510000001_srd_schema_updates.sql` — magic_items table + new columns on existing tables
- `supabase/migrations/20260510000002_srd_classes_seed.sql` — 12 classes with features JSONB
- `supabase/migrations/20260510000003_srd_subclasses_seed.sql` — 12 correct subclasses
- `supabase/migrations/20260510000004_srd_species_seed.sql` — 9 species with full traits
- `supabase/migrations/20260510000005_srd_backgrounds_seed.sql` — 4 SRD backgrounds
- `supabase/migrations/20260510000006_srd_feats_seed.sql` — 15 feats
- `supabase/migrations/20260510000007_srd_equipment_seed.sql` — weapons, armor, gear
- `supabase/migrations/20260510000008_srd_spells_seed.sql` — full spell list
- `supabase/migrations/20260510000009_srd_magic_items_seed.sql` — magic items A–Z

**Do not modify:**
- `supabase/migrations/20260429000001_schema.sql` — core schema, untouched
- `supabase/seed/srd_seed.sql` — superseded by these migrations; leave as-is to avoid conflicts

---

## Task 1: Schema Updates

**Files:**
- Create: `supabase/migrations/20260510000001_srd_schema_updates.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260510000001_srd_schema_updates.sql
BEGIN;

-- Add size and creature_type to species
ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS creature_type text NOT NULL DEFAULT 'Humanoid';

-- Add tool_proficiency to backgrounds
ALTER TABLE public.backgrounds
  ADD COLUMN IF NOT EXISTS tool_proficiency text;

-- Rename 'feature' to 'origin_feat' for clarity (2024 SRD backgrounds grant a feat, not a feature)
ALTER TABLE public.backgrounds RENAME COLUMN feature TO origin_feat;

-- Add unique constraint on feats.name (missing from original schema)
ALTER TABLE public.feats ADD CONSTRAINT feats_name_key UNIQUE (name);

-- Add unique constraint on equipment.name
ALTER TABLE public.equipment ADD CONSTRAINT equipment_name_key UNIQUE (name);

-- Magic Items table
CREATE TABLE public.magic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  item_type text NOT NULL,          -- 'Armor', 'Weapon', 'Wondrous Item', 'Ring', 'Rod', 'Staff', 'Wand', 'Potion', 'Scroll'
  rarity text NOT NULL CHECK (rarity IN ('Common','Uncommon','Rare','Very Rare','Legendary','Artifact','Varies')),
  requires_attunement boolean NOT NULL DEFAULT false,
  attunement_condition text,        -- e.g. 'by a spellcaster', NULL if no condition
  description text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'
);

-- Index for rarity filtering (common UI operation)
CREATE INDEX ON public.magic_items (rarity);

COMMIT;
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/biancachong/Vibes/PersonalProjects/DnD
supabase db push
```

Expected output: `Applying migration 20260510000001_srd_schema_updates.sql...`

- [ ] **Step 3: Verify**

```bash
supabase db execute --sql "
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'species' AND column_name IN ('size','creature_type');
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'backgrounds' AND column_name IN ('tool_proficiency','origin_feat');
  SELECT table_name FROM information_schema.tables
  WHERE table_name = 'magic_items';
"
```

Expected: 2 rows for species, 2 rows for backgrounds, 1 row for magic_items.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510000001_srd_schema_updates.sql
git commit -m "feat: add magic_items table and SRD schema columns"
```

---

## Task 2: Classes — Full Features JSONB

**Files:**
- Create: `supabase/migrations/20260510000002_srd_classes_seed.sql`

The `features` column stores class mechanics used by the character builder: level-by-level feature names, proficiencies, skill choices, and starting equipment options. The 12 class names and base stats are already correct; only `features` and `description` need updating.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260510000002_srd_classes_seed.sql
BEGIN;

-- ── BARBARIAN ──────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A fierce warrior of primal might who can enter a battle rage, channeling it into extraordinary attacks and resilience.',
  features = '{
    "level_features": {
      "1":  ["Rage","Unarmored Defense","Weapon Mastery"],
      "2":  ["Danger Sense","Reckless Attack"],
      "3":  ["Barbarian Subclass","Primal Knowledge"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Extra Attack","Fast Movement"],
      "6":  ["Subclass Feature"],
      "7":  ["Feral Instinct","Instinctive Pounce"],
      "8":  ["Ability Score Improvement"],
      "9":  ["Brutal Strike"],
      "10": ["Subclass Feature"],
      "11": ["Relentless Rage"],
      "12": ["Ability Score Improvement"],
      "13": ["Improved Brutal Strike"],
      "14": ["Subclass Feature"],
      "15": ["Persistent Rage"],
      "16": ["Ability Score Improvement"],
      "17": ["Improved Brutal Strike"],
      "18": ["Indomitable Might"],
      "19": ["Epic Boon"],
      "20": ["Primal Champion"]
    },
    "armor_training": ["Light Armor","Medium Armor","Shields"],
    "weapon_proficiencies": ["Simple Weapons","Martial Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 2, "from": ["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"]},
    "saving_throws": ["Strength","Constitution"],
    "starting_equipment_options": [
      "Option A: Greataxe, 4 Handaxes, Explorer''s Pack, 15 GP",
      "Option B: 75 GP"
    ]
  }'::jsonb
WHERE name = 'Barbarian';

-- ── BARD ───────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'An inspiring magician whose power echoes the music of creation. Bards weave magic through words, music, and performance.',
  primary_abilities = ARRAY['charisma'],
  saving_throw_proficiencies = ARRAY['dexterity','charisma'],
  features = '{
    "level_features": {
      "1":  ["Bardic Inspiration","Spellcasting"],
      "2":  ["Expertise","Jack of All Trades"],
      "3":  ["Bard Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Font of Inspiration"],
      "6":  ["Countercharm","Subclass Feature"],
      "7":  ["Expertise"],
      "8":  ["Ability Score Improvement"],
      "10": ["Magical Secrets","Subclass Feature"],
      "12": ["Ability Score Improvement"],
      "14": ["Subclass Feature"],
      "16": ["Ability Score Improvement"],
      "18": ["Superior Inspiration","Subclass Feature"],
      "19": ["Epic Boon"],
      "20": ["Words of Creation"]
    },
    "armor_training": ["Light Armor"],
    "weapon_proficiencies": ["Simple Weapons","Hand Crossbows","Longswords","Rapiers","Shortswords"],
    "tool_proficiencies": ["Three Musical Instruments of your choice"],
    "skill_choices": {"count": 3, "from": ["any"]},
    "saving_throws": ["Dexterity","Charisma"],
    "starting_equipment_options": [
      "Option A: Leather Armor, 2 Daggers, Musical Instrument (your choice), Entertainer''s Pack, 19 GP",
      "Option B: 75 GP"
    ]
  }'::jsonb
WHERE name = 'Bard';

-- ── CLERIC ─────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A priestly champion who wields divine magic in service of a higher power, healing allies and smiting foes.',
  primary_abilities = ARRAY['wisdom'],
  saving_throw_proficiencies = ARRAY['wisdom','charisma'],
  features = '{
    "level_features": {
      "1":  ["Spellcasting","Divine Order"],
      "2":  ["Channel Divinity"],
      "3":  ["Cleric Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Sear Undead"],
      "6":  ["Subclass Feature"],
      "7":  ["Blessed Strikes"],
      "8":  ["Ability Score Improvement"],
      "10": ["Divine Intervention"],
      "12": ["Ability Score Improvement"],
      "14": ["Improved Blessed Strikes"],
      "16": ["Ability Score Improvement"],
      "18": ["Subclass Feature"],
      "19": ["Epic Boon"],
      "20": ["Greater Divine Intervention"]
    },
    "armor_training": ["Light Armor","Medium Armor","Shields"],
    "weapon_proficiencies": ["Simple Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 2, "from": ["History","Insight","Medicine","Persuasion","Religion"]},
    "saving_throws": ["Wisdom","Charisma"],
    "starting_equipment_options": [
      "Option A: Chain Shirt, Shield, Mace, Holy Symbol, Priest''s Pack, 7 GP",
      "Option B: 110 GP"
    ]
  }'::jsonb
WHERE name = 'Cleric';

-- ── DRUID ──────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A priest of the Old Faith, wielding the powers of nature — moonlight, plants, fire, and lightning — and adopting animal forms.',
  primary_abilities = ARRAY['wisdom'],
  saving_throw_proficiencies = ARRAY['intelligence','wisdom'],
  features = '{
    "level_features": {
      "1":  ["Spellcasting","Druidic","Primal Order"],
      "2":  ["Wild Shape","Wild Companion"],
      "3":  ["Druid Subclass"],
      "4":  ["Ability Score Improvement","Wild Shape Improvement"],
      "5":  ["Wild Resurgence"],
      "6":  ["Subclass Feature"],
      "7":  ["Elemental Fury"],
      "8":  ["Ability Score Improvement"],
      "10": ["Subclass Feature"],
      "12": ["Ability Score Improvement"],
      "14": ["Subclass Feature"],
      "15": ["Improved Elemental Fury"],
      "16": ["Ability Score Improvement"],
      "18": ["Beast Spells","Subclass Feature"],
      "19": ["Epic Boon"],
      "20": ["Archdruid"]
    },
    "armor_training": ["Light Armor","Medium Armor","Shields"],
    "weapon_proficiencies": ["Simple Weapons","Scimitars"],
    "tool_proficiencies": ["Herbalism Kit"],
    "skill_choices": {"count": 2, "from": ["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"]},
    "saving_throws": ["Intelligence","Wisdom"],
    "starting_equipment_options": [
      "Option A: Leather Armor, Shield, Sickle, Druidic Focus (Quarterstaff), Explorer''s Pack, Herbalism Kit, 9 GP",
      "Option B: 50 GP"
    ]
  }'::jsonb
WHERE name = 'Druid';

-- ── FIGHTER ────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A master of martial combat, skilled with a variety of weapons and armor, capable of remarkable feats on the battlefield.',
  primary_abilities = ARRAY['strength','dexterity'],
  saving_throw_proficiencies = ARRAY['strength','constitution'],
  features = '{
    "level_features": {
      "1":  ["Fighting Style","Second Wind","Weapon Mastery"],
      "2":  ["Action Surge","Tactical Mind"],
      "3":  ["Fighter Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Extra Attack","Tactical Shift"],
      "6":  ["Ability Score Improvement"],
      "7":  ["Subclass Feature"],
      "8":  ["Ability Score Improvement"],
      "9":  ["Indomitable","Tactical Master"],
      "10": ["Subclass Feature"],
      "11": ["Two Extra Attacks"],
      "12": ["Ability Score Improvement"],
      "13": ["Studied Attacks"],
      "14": ["Ability Score Improvement"],
      "15": ["Subclass Feature"],
      "16": ["Ability Score Improvement"],
      "18": ["Subclass Feature"],
      "19": ["Epic Boon"],
      "20": ["Three Extra Attacks"]
    },
    "armor_training": ["Light Armor","Medium Armor","Heavy Armor","Shields"],
    "weapon_proficiencies": ["Simple Weapons","Martial Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 2, "from": ["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Persuasion","Perception","Survival"]},
    "saving_throws": ["Strength","Constitution"],
    "starting_equipment_options": [
      "Option A: Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer''s Pack, 4 GP",
      "Option B: Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer''s Pack, 11 GP",
      "Option C: 155 GP"
    ]
  }'::jsonb
WHERE name = 'Fighter';

-- ── MONK ───────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A master of martial arts, harnessing the power of the body and ki to perform amazing feats.',
  primary_abilities = ARRAY['dexterity','wisdom'],
  saving_throw_proficiencies = ARRAY['strength','dexterity'],
  features = '{
    "level_features": {
      "1":  ["Martial Arts","Unarmored Defense"],
      "2":  ["Monk''s Focus","Unarmored Movement","Uncanny Metabolism"],
      "3":  ["Deflect Attacks","Monk Subclass"],
      "4":  ["Ability Score Improvement","Slow Fall"],
      "5":  ["Extra Attack","Stunning Strike"],
      "6":  ["Empowered Strikes"],
      "7":  ["Evasion"],
      "8":  ["Ability Score Improvement"],
      "9":  ["Acrobatic Movement"],
      "10": ["Heightened Focus","Self-Restoration"],
      "12": ["Ability Score Improvement"],
      "13": ["Deflect Energy"],
      "14": ["Disciplined Survivor"],
      "15": ["Perfect Focus"],
      "16": ["Ability Score Improvement"],
      "18": ["Superior Defense"],
      "19": ["Epic Boon"],
      "20": ["Body and Mind"]
    },
    "armor_training": [],
    "weapon_proficiencies": ["Simple Weapons","Martial Weapons with the Light property"],
    "tool_proficiencies": ["Artisan''s Tools or Musical Instrument (your choice)"],
    "skill_choices": {"count": 2, "from": ["Acrobatics","Athletics","History","Insight","Religion","Stealth"]},
    "saving_throws": ["Strength","Dexterity"],
    "starting_equipment_options": [
      "Option A: Spear, 5 Daggers, Artisan''s Tools or Musical Instrument, Dungeoneer''s Pack, 9 GP",
      "Option B: 65 GP"
    ]
  }'::jsonb
WHERE name = 'Monk';

-- ── PALADIN ────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A holy warrior bound to a sacred oath, wielding divine magic and martial prowess to protect the innocent.',
  primary_abilities = ARRAY['strength','charisma'],
  saving_throw_proficiencies = ARRAY['wisdom','charisma'],
  features = '{
    "level_features": {
      "1":  ["Lay On Hands","Spellcasting","Weapon Mastery"],
      "2":  ["Fighting Style","Paladin''s Smite"],
      "3":  ["Channel Divinity","Paladin Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Extra Attack","Faithful Steed"],
      "6":  ["Aura of Protection"],
      "8":  ["Ability Score Improvement"],
      "10": ["Aura of Courage"],
      "11": ["Radiant Strikes"],
      "12": ["Ability Score Improvement"],
      "14": ["Restoring Touch"],
      "16": ["Ability Score Improvement"],
      "18": ["Aura Expansion"],
      "19": ["Epic Boon"],
      "20": ["Subclass Feature"]
    },
    "armor_training": ["Light Armor","Medium Armor","Heavy Armor","Shields"],
    "weapon_proficiencies": ["Simple Weapons","Martial Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 2, "from": ["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"]},
    "saving_throws": ["Wisdom","Charisma"],
    "starting_equipment_options": [
      "Option A: Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest''s Pack, 9 GP",
      "Option B: 150 GP"
    ]
  }'::jsonb
WHERE name = 'Paladin';

-- ── RANGER ─────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A warrior who combats threats on the edges of civilization, expert in tracking, nature, and ranged combat.',
  primary_abilities = ARRAY['dexterity','wisdom'],
  saving_throw_proficiencies = ARRAY['strength','dexterity'],
  features = '{
    "level_features": {
      "1":  ["Spellcasting","Favored Enemy","Weapon Mastery"],
      "2":  ["Deft Explorer","Fighting Style"],
      "3":  ["Ranger Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Extra Attack"],
      "6":  ["Roving"],
      "8":  ["Ability Score Improvement"],
      "9":  ["Expertise"],
      "10": ["Tireless"],
      "12": ["Ability Score Improvement"],
      "13": ["Relentless Hunter"],
      "14": ["Nature''s Veil"],
      "16": ["Ability Score Improvement"],
      "17": ["Precise Hunter"],
      "18": ["Feral Senses"],
      "19": ["Epic Boon"],
      "20": ["Foe Slayer"]
    },
    "armor_training": ["Light Armor","Medium Armor","Shields"],
    "weapon_proficiencies": ["Simple Weapons","Martial Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 3, "from": ["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"]},
    "saving_throws": ["Strength","Dexterity"],
    "starting_equipment_options": [
      "Option A: Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Druidic Focus (Quarterstaff), Explorer''s Pack, 7 GP",
      "Option B: 150 GP"
    ]
  }'::jsonb
WHERE name = 'Ranger';

-- ── ROGUE ──────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A scoundrel who uses stealth, trickery, and precise strikes to overcome obstacles and defeat foes.',
  primary_abilities = ARRAY['dexterity'],
  saving_throw_proficiencies = ARRAY['dexterity','intelligence'],
  features = '{
    "level_features": {
      "1":  ["Expertise","Sneak Attack","Thieves'' Cant","Weapon Mastery"],
      "2":  ["Cunning Action"],
      "3":  ["Rogue Subclass","Steady Aim"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Cunning Strike","Uncanny Dodge"],
      "7":  ["Evasion","Reliable Talent"],
      "8":  ["Ability Score Improvement"],
      "10": ["Ability Score Improvement"],
      "11": ["Improved Cunning Strike"],
      "12": ["Ability Score Improvement"],
      "14": ["Devious Strikes"],
      "15": ["Slippery Mind"],
      "16": ["Ability Score Improvement"],
      "18": ["Elusive"],
      "19": ["Epic Boon"],
      "20": ["Stroke of Luck"]
    },
    "armor_training": ["Light Armor"],
    "weapon_proficiencies": ["Simple Weapons","Hand Crossbows","Longswords","Rapiers","Shortswords"],
    "tool_proficiencies": ["Thieves'' Tools"],
    "skill_choices": {"count": 4, "from": ["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Persuasion","Sleight of Hand","Stealth"]},
    "saving_throws": ["Dexterity","Intelligence"],
    "starting_equipment_options": [
      "Option A: Leather Armor, 2 Daggers, Shortsword, Shortbow, 20 Arrows, Quiver, Thieves'' Tools, Burglar''s Pack, 8 GP",
      "Option B: 100 GP"
    ]
  }'::jsonb
WHERE name = 'Rogue';

-- ── SORCERER ───────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A spellcaster who draws on inherent magic from a gift or bloodline, bending spells with Metamagic.',
  primary_abilities = ARRAY['charisma'],
  saving_throw_proficiencies = ARRAY['constitution','charisma'],
  features = '{
    "level_features": {
      "1":  ["Spellcasting","Innate Sorcery"],
      "2":  ["Font of Magic","Metamagic"],
      "3":  ["Sorcerer Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Sorcerous Restoration"],
      "7":  ["Sorcery Incarnate"],
      "8":  ["Ability Score Improvement"],
      "12": ["Ability Score Improvement"],
      "16": ["Ability Score Improvement"],
      "19": ["Epic Boon"],
      "20": ["Arcane Apotheosis"]
    },
    "armor_training": [],
    "weapon_proficiencies": ["Simple Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 2, "from": ["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"]},
    "saving_throws": ["Constitution","Charisma"],
    "starting_equipment_options": [
      "Option A: Spear, 2 Daggers, Arcane Focus (crystal), Dungeoneer''s Pack, 28 GP",
      "Option B: 50 GP"
    ]
  }'::jsonb
WHERE name = 'Sorcerer';

-- ── WARLOCK ────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A wielder of magic derived from a bargain with an extraplanar entity, channeling eldritch power through Pact Magic.',
  primary_abilities = ARRAY['charisma'],
  saving_throw_proficiencies = ARRAY['wisdom','charisma'],
  features = '{
    "level_features": {
      "1":  ["Eldritch Invocations","Pact Magic"],
      "2":  ["Magical Cunning"],
      "3":  ["Warlock Subclass"],
      "4":  ["Ability Score Improvement"],
      "8":  ["Ability Score Improvement"],
      "9":  ["Contact Patron"],
      "11": ["Mystic Arcanum (Level 6 Spell)"],
      "12": ["Ability Score Improvement"],
      "13": ["Mystic Arcanum (Level 7 Spell)"],
      "15": ["Mystic Arcanum (Level 8 Spell)"],
      "16": ["Ability Score Improvement"],
      "17": ["Mystic Arcanum (Level 9 Spell)"],
      "19": ["Epic Boon"],
      "20": ["Eldritch Master"]
    },
    "armor_training": ["Light Armor"],
    "weapon_proficiencies": ["Simple Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 2, "from": ["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"]},
    "saving_throws": ["Wisdom","Charisma"],
    "starting_equipment_options": [
      "Option A: Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb), Book (occult lore), Scholar''s Pack, 15 GP",
      "Option B: 100 GP"
    ]
  }'::jsonb
WHERE name = 'Warlock';

-- ── WIZARD ─────────────────────────────────────────────────
UPDATE public.classes SET
  description = 'A scholarly magic-user capable of manipulating the structures of reality, preparing spells from a spellbook.',
  primary_abilities = ARRAY['intelligence'],
  saving_throw_proficiencies = ARRAY['intelligence','wisdom'],
  features = '{
    "level_features": {
      "1":  ["Spellcasting","Ritual Adept","Arcane Recovery"],
      "2":  ["Scholar"],
      "3":  ["Wizard Subclass"],
      "4":  ["Ability Score Improvement"],
      "5":  ["Memorize Spell"],
      "8":  ["Ability Score Improvement"],
      "12": ["Ability Score Improvement"],
      "16": ["Ability Score Improvement"],
      "18": ["Spell Mastery"],
      "19": ["Epic Boon"],
      "20": ["Signature Spells"]
    },
    "armor_training": [],
    "weapon_proficiencies": ["Simple Weapons"],
    "tool_proficiencies": [],
    "skill_choices": {"count": 3, "from": ["Arcana","History","Insight","Investigation","Medicine","Religion"]},
    "saving_throws": ["Intelligence","Wisdom"],
    "starting_equipment_options": [
      "Option A: 2 Daggers, Arcane Focus (Quarterstaff), Spellbook, Scholar''s Pack, 5 GP",
      "Option B: 55 GP"
    ]
  }'::jsonb
WHERE name = 'Wizard';

COMMIT;
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db push
supabase db execute --sql "SELECT name, jsonb_array_length(features->'level_features') as levels_defined FROM public.classes ORDER BY name;"
```

Expected: 12 rows, each showing 15–20 levels defined.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260510000002_srd_classes_seed.sql
git commit -m "feat: populate class features JSONB for all 12 SRD classes"
```

---

## Task 3: Subclasses — Fix Names and Add Features

**Files:**
- Create: `supabase/migrations/20260510000003_srd_subclasses_seed.sql`

**Issues to fix:** Wrong names ("Berserker" → "Path of the Berserker", "Wild Magic" → "Draconic Sorcery", "The Fiend" → "Fiend Patron", "School of Evocation" → "Evoker", "Way of the Open Hand" → "Warrior of the Open Hand"), and "Light Domain" is not in SRD 5.2.1 (delete it).

> ⚠️ **Risk:** If any `characters.subclass_id` references the deleted/renamed rows, those FK values will be NULLed. Check for active character data first.

- [ ] **Step 1: Check for character data using affected subclasses**

```bash
supabase db execute --sql "
  SELECT c.name as character, sc.name as subclass
  FROM public.characters c
  JOIN public.subclasses sc ON sc.id = c.subclass_id
  WHERE sc.name IN ('Berserker','Wild Magic','The Fiend','School of Evocation','Way of the Open Hand','Light Domain');
"
```

If any rows returned, note them — those characters will need their subclass_id updated after this migration.

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/20260510000003_srd_subclasses_seed.sql
BEGIN;

-- Delete ALL existing subclasses (re-insert with correct names and features)
-- Safe: only deletes from the reference table; characters.subclass_id will SET NULL
-- (subclasses FK on characters has no on-delete clause, so manually null it first)
UPDATE public.characters SET subclass_id = NULL
  WHERE subclass_id IN (SELECT id FROM public.subclasses);

DELETE FROM public.subclasses;

-- Helper: insert via class name lookup to avoid UUID hardcoding
-- ── BARBARIAN: Path of the Berserker ──────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Path of the Berserker',
  'Barbarians who walk the Path of the Berserker direct their Rage primarily toward violence, thrilling in the chaos of battle.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Frenzy"],
      "6":  ["Mindless Rage"],
      "10": ["Retaliation"],
      "14": ["Intimidating Presence"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Barbarian';

-- ── BARD: College of Lore ─────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'College of Lore',
  'Bards of the College of Lore know something about most things and use their knowledge and wit to aid their companions.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Bonus Proficiencies","Cutting Words"],
      "6":  ["Magical Discoveries"],
      "14": ["Peerless Skill"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Bard';

-- ── CLERIC: Life Domain ───────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Life Domain',
  'The Life domain focuses on the vibrant positive energy that sustains all life. Clerics of this domain are powerful healers.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Disciple of Life","Preserve Life"],
      "6":  ["Blessed Healer"],
      "17": ["Supreme Healing"]
    },
    "domain_spells": {
      "3":  ["Aid","Bless","Cure Wounds","Lesser Restoration"],
      "5":  ["Mass Healing Word","Revivify"],
      "7":  ["Aura of Life","Death Ward"],
      "9":  ["Greater Restoration","Mass Cure Wounds"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Cleric';

-- ── DRUID: Circle of the Land ─────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Circle of the Land',
  'The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites, drawing power from their chosen terrain.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Circle of the Land Spells","Land''s Aid"],
      "6":  ["Natural Recovery"],
      "10": ["Nature''s Ward"],
      "14": ["Nature''s Sanctuary"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Druid';

-- ── FIGHTER: Champion ─────────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Champion',
  'The Champion focuses on the development of raw physical power honed to deadly perfection. Those who model themselves on this archetype combine rigorous training with physical excellence.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Improved Critical","Remarkable Athlete"],
      "7":  ["Additional Fighting Style"],
      "10": ["Heroic Warrior"],
      "15": ["Superior Critical"],
      "18": ["Survivor"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Fighter';

-- ── MONK: Warrior of the Open Hand ───────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Warrior of the Open Hand',
  'Warriors of the Open Hand are the ultimate masters of martial arts combat, pushing their bodies to the limit and adapting their strikes to meet any challenge.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Open Hand Technique"],
      "6":  ["Wholeness of Body"],
      "11": ["Fleet Step"],
      "17": ["Quivering Palm"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Monk';

-- ── PALADIN: Oath of Devotion ─────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Oath of Devotion',
  'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. These paladins are known as holy knights or white knights.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Oath of Devotion Spells","Sacred Weapon"],
      "7":  ["Aura of Devotion"],
      "9":  ["Abjure Foes"],
      "20": ["Holy Nimbus"]
    },
    "oath_spells": {
      "3":  ["Protection from Evil and Good","Shield of Faith"],
      "5":  ["Aid","Zone of Truth"],
      "9":  ["Beacon of Hope","Dispel Magic"],
      "13": ["Freedom of Movement","Guardian of Faith"],
      "17": ["Commune","Flame Strike"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Paladin';

-- ── RANGER: Hunter ────────────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Hunter',
  'Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Hunter''s Lore","Hunter''s Prey"],
      "7":  ["Defensive Tactics"],
      "11": ["Superior Hunter''s Prey"],
      "15": ["Superior Hunter''s Defense"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Ranger';

-- ── ROGUE: Thief ──────────────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Thief',
  'You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Fast Hands","Second-Story Work"],
      "9":  ["Supreme Sneak"],
      "13": ["Use Magic Device"],
      "17": ["Thief''s Reflexes"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Rogue';

-- ── SORCERER: Draconic Sorcery ────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Draconic Sorcery',
  'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Draconic Resilience"],
      "6":  ["Elemental Affinity"],
      "14": ["Dragon Wings"],
      "18": ["Dragon Companion"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Sorcerer';

-- ── WARLOCK: Fiend Patron ─────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Fiend Patron',
  'You have made a pact with a fiend from the lower planes of existence, a powerful demon, devil, or other evil being. Your patron gives you power in exchange for service.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Dark One''s Blessing","Fiend Spells"],
      "6":  ["Dark One''s Own Luck"],
      "10": ["Fiendish Resilience"],
      "14": ["Hurl Through Hell"]
    },
    "expanded_spells": {
      "1":  ["Burning Hands","Command"],
      "2":  ["Blindness/Deafness","Scorching Ray"],
      "3":  ["Fireball","Stinking Cloud"],
      "4":  ["Fire Shield","Wall of Fire"],
      "5":  ["Flame Strike","Hallow"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Warlock';

-- ── WIZARD: Evoker ────────────────────────────────────────
INSERT INTO public.subclasses (class_id, name, description, features)
SELECT id,
  'Evoker',
  'You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid.',
  '{
    "subclass_level": 3,
    "level_features": {
      "3":  ["Potent Cantrip","Sculpt Spells"],
      "10": ["Empowered Evocation"],
      "14": ["Overchannel"]
    }
  }'::jsonb
FROM public.classes WHERE name = 'Wizard';

COMMIT;
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db push
supabase db execute --sql "SELECT sc.name, c.name as class FROM public.subclasses sc JOIN public.classes c ON c.id = sc.class_id ORDER BY c.name;"
```

Expected: 12 rows with correct names.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510000003_srd_subclasses_seed.sql
git commit -m "feat: fix subclass names and add features JSONB for all 12 SRD subclasses"
```

---

## Task 4: Character Origin — Species

**Files:**
- Create: `supabase/migrations/20260510000004_srd_species_seed.sql`

SRD 5.2.1 has 9 species. Current DB has 8 (missing **Goliath**, which has Speed 35). All need `size` and `creature_type` populated, and `traits` updated with full descriptions instead of just names.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260510000004_srd_species_seed.sql
BEGIN;

-- Update all existing species with size, creature_type, and full trait descriptions
-- Using ON CONFLICT (name) DO UPDATE to preserve existing IDs (safe for character FKs)

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Dragonborn', 30, 'Medium', 'Humanoid', '{
  "traits": [
    {"name": "Draconic Ancestry", "description": "Your lineage stems from a dragon progenitor. Choose a dragon type (Black, Blue, Brass, Bronze, Copper, Gold, Green, Red, Silver, or White). This determines your Breath Weapon damage type and Damage Resistance."},
    {"name": "Breath Weapon", "description": "When you take the Attack action, you can replace one attack with a 15-foot Cone or 30-foot Line (5 feet wide) breath. Each creature makes a Dexterity save (DC = 8 + Constitution modifier + Proficiency Bonus). Fail: 1d10 damage of your ancestry type; Success: half. Scales: 2d10 at level 5, 3d10 at level 11, 4d10 at level 17. Uses equal to Proficiency Bonus; recharge on Long Rest."},
    {"name": "Damage Resistance", "description": "You have Resistance to the damage type determined by your Draconic Ancestry."},
    {"name": "Darkvision", "description": "You have Darkvision with a range of 60 feet."},
    {"name": "Draconic Flight", "description": "Starting at character level 5, as a Bonus Action you sprout spectral wings for 10 minutes, gaining a Fly Speed equal to your Speed. Once per Long Rest."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Dwarf', 30, 'Medium', 'Humanoid', '{
  "traits": [
    {"name": "Darkvision", "description": "You have Darkvision with a range of 120 feet."},
    {"name": "Dwarven Resilience", "description": "You have Resistance to Poison damage and Advantage on saving throws to avoid or end the Poisoned condition."},
    {"name": "Dwarven Toughness", "description": "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level."},
    {"name": "Stonecunning", "description": "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes while on or touching a stone surface. Uses equal to Proficiency Bonus; recharge on Long Rest."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Elf', 30, 'Medium', 'Humanoid', '{
  "traits": [
    {"name": "Darkvision", "description": "You have Darkvision with a range of 60 feet (Drow lineage extends this to 120 feet)."},
    {"name": "Elven Lineage", "description": "Choose a lineage: Drow (Darkvision 120 ft, Dancing Lights cantrip; Faerie Fire at level 3; Darkness at level 5), High Elf (Prestidigitation cantrip, swap each Long Rest; Detect Magic at level 3; Misty Step at level 5), or Wood Elf (Speed 35, Druidcraft cantrip; Longstrider at level 3; Pass without Trace at level 5). Spell DC uses your chosen INT, WIS, or CHA."},
    {"name": "Fey Ancestry", "description": "You have Advantage on saving throws to avoid or end the Charmed condition."},
    {"name": "Keen Senses", "description": "You have proficiency in the Insight, Perception, or Survival skill (your choice)."},
    {"name": "Trance", "description": "You don''t need to sleep and magic can''t put you to sleep. You can finish a Long Rest in 4 hours of trancelike meditation."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Gnome', 30, 'Small', 'Humanoid', '{
  "traits": [
    {"name": "Darkvision", "description": "You have Darkvision with a range of 60 feet."},
    {"name": "Gnomish Cunning", "description": "You have Advantage on Intelligence, Wisdom, and Charisma saving throws."},
    {"name": "Gnomish Lineage", "description": "Choose a lineage. Forest Gnome: Minor Illusion cantrip + Speak with Animals (always prepared, cast without slot equal to Proficiency Bonus times per Long Rest). Rock Gnome: Mending and Prestidigitation cantrips + can craft a Tiny clockwork device (AC 5, 1 HP) with 10 min casting; up to 3 devices exist at once, falling apart after 8 hours. Spell DC uses your chosen INT, WIS, or CHA."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

-- NEW: Goliath (not currently in DB)
INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Goliath', 35, 'Medium', 'Humanoid', '{
  "traits": [
    {"name": "Giant Ancestry", "description": "Choose one supernatural benefit (uses equal to Proficiency Bonus; recharge Long Rest): Cloud''s Jaunt — teleport 30 ft as Bonus Action; Fire''s Burn — deal +1d10 Fire damage on a hit; Frost''s Chill — deal +1d6 Cold damage on a hit and reduce Speed by 10 ft until your next turn; Hill''s Tumble — give Prone condition to a Large or smaller creature on a hit; Stone''s Endurance — Reaction to roll 1d12 + CON modifier and reduce incoming damage by that total; Storm''s Thunder — Reaction to deal 1d8 Thunder to a creature within 60 ft that damaged you."},
    {"name": "Large Form", "description": "Starting at character level 5, as a Bonus Action you change your size to Large for 10 minutes (if space allows), gaining Advantage on Strength checks and +10 ft Speed. Once per Long Rest."},
    {"name": "Powerful Build", "description": "You have Advantage on checks to end the Grappled condition and count as one size larger for carrying capacity."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Halfling', 30, 'Small', 'Humanoid', '{
  "traits": [
    {"name": "Brave", "description": "You have Advantage on saving throws to avoid or end the Frightened condition."},
    {"name": "Halfling Nimbleness", "description": "You can move through the space of any creature that is a size larger than you, but can''t stop in the same space."},
    {"name": "Luck", "description": "When you roll a 1 on the d20 of a D20 Test, you can reroll the die and must use the new roll."},
    {"name": "Naturally Stealthy", "description": "You can take the Hide action even when obscured only by a creature that is at least one size larger than you."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Human', 30, 'Medium or Small', 'Humanoid', '{
  "traits": [
    {"name": "Resourceful", "description": "You gain Heroic Inspiration whenever you finish a Long Rest."},
    {"name": "Skillful", "description": "You gain proficiency in one skill of your choice."},
    {"name": "Versatile", "description": "You gain an Origin feat of your choice. Skilled is recommended."}
  ],
  "size_note": "Choose Medium (about 4–7 feet tall) or Small (about 2–4 feet tall) when you select this species."
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Orc', 30, 'Medium', 'Humanoid', '{
  "traits": [
    {"name": "Adrenaline Rush", "description": "You can take the Dash action as a Bonus Action, gaining Temporary Hit Points equal to your Proficiency Bonus. Uses equal to Proficiency Bonus; recharge on Short or Long Rest."},
    {"name": "Darkvision", "description": "You have Darkvision with a range of 120 feet."},
    {"name": "Relentless Endurance", "description": "When reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once per Long Rest."}
  ]
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

INSERT INTO public.species (name, speed, size, creature_type, traits, ability_score_bonuses) VALUES

('Tiefling', 30, 'Medium or Small', 'Humanoid', '{
  "traits": [
    {"name": "Darkvision", "description": "You have Darkvision with a range of 60 feet."},
    {"name": "Fiendish Legacy", "description": "Choose a legacy: Abyssal (Poison Resistance; Poison Spray cantrip; Ray of Sickness at level 3; Hold Person at level 5), Chthonic (Necrotic Resistance; Chill Touch cantrip; False Life at level 3; Ray of Enfeeblement at level 5), or Infernal (Fire Resistance; Fire Bolt cantrip; Hellish Rebuke at level 3; Darkness at level 5). Spell DC uses your chosen INT, WIS, or CHA."},
    {"name": "Otherworldly Presence", "description": "You know the Thaumaturgy cantrip, using the same spellcasting ability as your Fiendish Legacy trait."}
  ],
  "size_note": "Choose Medium (about 4–7 feet tall) or Small (about 3–4 feet tall) when you select this species."
}'::jsonb, '{}')

ON CONFLICT (name) DO UPDATE SET
  speed = EXCLUDED.speed, size = EXCLUDED.size, creature_type = EXCLUDED.creature_type,
  traits = EXCLUDED.traits, ability_score_bonuses = EXCLUDED.ability_score_bonuses;

COMMIT;
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db push
supabase db execute --sql "SELECT name, speed, size, creature_type FROM public.species ORDER BY name;"
```

Expected: 9 rows including Goliath (speed 35, size Medium).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260510000004_srd_species_seed.sql
git commit -m "feat: add Goliath species and update all 9 SRD species with full trait descriptions"
```

---

## Task 5: Character Origin — Backgrounds

**Files:**
- Create: `supabase/migrations/20260510000005_srd_backgrounds_seed.sql`

**SRD 5.2.1 contains exactly 4 backgrounds.** The current seed has 9: Folk Hero, Hermit, Noble, Outlander, Sailor, and Urchin are NOT in the SRD and must be removed.

> ⚠️ **Risk:** Characters using non-SRD backgrounds will have their `background_id` set to NULL. Check first.

- [ ] **Step 1: Check for characters using non-SRD backgrounds**

```bash
supabase db execute --sql "
  SELECT c.name as character, b.name as background
  FROM public.characters c JOIN public.backgrounds b ON b.id = c.background_id
  WHERE b.name IN ('Folk Hero','Hermit','Noble','Outlander','Sailor','Urchin');
"
```

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/20260510000005_srd_backgrounds_seed.sql
BEGIN;

-- Null out FK refs for non-SRD backgrounds before deleting
UPDATE public.characters SET background_id = NULL
  WHERE background_id IN (
    SELECT id FROM public.backgrounds
    WHERE name IN ('Folk Hero','Hermit','Noble','Outlander','Sailor','Urchin')
  );

-- Remove non-SRD backgrounds
DELETE FROM public.backgrounds
  WHERE name IN ('Folk Hero','Hermit','Noble','Outlander','Sailor','Urchin');

-- Upsert the 4 SRD backgrounds with complete data
-- Format: ability_score_options uses {"abilities": [...]} — player picks +2/+1 or +1/+1/+1 from the listed 3
INSERT INTO public.backgrounds
  (name, skill_proficiencies, ability_score_options, description, origin_feat, tool_proficiency)
VALUES
  (
    'Acolyte',
    ARRAY['insight','religion'],
    '{"abilities": ["intelligence","wisdom","charisma"]}'::jsonb,
    'You have spent your life in service to a temple, learning prayers, rites, and the tenets of your faith. The temple taught you to read and write.',
    'Magic Initiate (Cleric)',
    'Calligrapher''s Supplies'
  ),
  (
    'Criminal',
    ARRAY['sleight-of-hand','stealth'],
    '{"abilities": ["dexterity","constitution","intelligence"]}'::jsonb,
    'You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld.',
    'Alert',
    'Thieves'' Tools'
  ),
  (
    'Sage',
    ARRAY['arcana','history'],
    '{"abilities": ["constitution","intelligence","wisdom"]}'::jsonb,
    'You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you.',
    'Magic Initiate (Wizard)',
    'Calligrapher''s Supplies'
  ),
  (
    'Soldier',
    ARRAY['athletics','intimidation'],
    '{"abilities": ["strength","dexterity","constitution"]}'::jsonb,
    'War has been your life for as long as you can remember. You trained as a youth, studied the use of weapons and armor, learned basic survival techniques, and pledged yourself to a regiment.',
    'Savage Attacker',
    'Gaming Set (choose one kind)'
  )
ON CONFLICT (name) DO UPDATE SET
  skill_proficiencies   = EXCLUDED.skill_proficiencies,
  ability_score_options = EXCLUDED.ability_score_options,
  description           = EXCLUDED.description,
  origin_feat           = EXCLUDED.origin_feat,
  tool_proficiency      = EXCLUDED.tool_proficiency;

COMMIT;
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db push
supabase db execute --sql "SELECT name, skill_proficiencies, origin_feat, tool_proficiency FROM public.backgrounds ORDER BY name;"
```

Expected: 4 rows — Acolyte, Criminal, Sage, Soldier.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510000005_srd_backgrounds_seed.sql
git commit -m "feat: trim backgrounds to 4 SRD entries and populate full 2024 background data"
```

---

## Task 6: Feats

**Files:**
- Create: `supabase/migrations/20260510000006_srd_feats_seed.sql`

SRD 5.2.1 has 15 feats across 4 categories. Currently 0 are seeded.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260510000006_srd_feats_seed.sql
BEGIN;

-- ── ORIGIN FEATS (no prerequisites) ────────────────────────
INSERT INTO public.feats (name, prerequisites, benefits, ability_score_bonuses) VALUES

('Alert',
 '{}'::jsonb,
 'Initiative Proficiency: When you roll Initiative, add your Proficiency Bonus to the roll. Initiative Swap: Immediately after rolling Initiative, you can swap your Initiative with one willing ally in the same combat (neither can have Incapacitated).',
 '{}'::jsonb),

('Magic Initiate',
 '{"note": "Choose Cleric, Druid, or Wizard list when taken. Repeatable once per list."}'::jsonb,
 'Two Cantrips: Learn 2 cantrips from the chosen spell list. Level 1 Spell: Learn 1 level-1 spell from the same list; always prepared, cast once without a slot per Long Rest, or with spell slots. Spell Change: Replace one chosen spell on each level-up. Repeatable (different list each time).',
 '{}'::jsonb),

('Savage Attacker',
 '{}'::jsonb,
 'Once per turn when you hit a target with a weapon, roll the weapon''s damage dice twice and use either roll.',
 '{}'::jsonb),

('Skilled',
 '{}'::jsonb,
 'Gain proficiency in any combination of three skills or tools of your choice. Repeatable.',
 '{}'::jsonb),

-- ── GENERAL FEATS (Level 4+ prerequisite) ──────────────────
('Ability Score Improvement',
 '{"level": 4}'::jsonb,
 'Increase one ability score by 2, or two ability scores by 1 each. No score can exceed 20. Repeatable.',
 '{"options": "any", "amount": 2, "or_split": true}'::jsonb),

('Grappler',
 '{"level": 4, "ability": "Strength or Dexterity 13+"}'::jsonb,
 'Ability Score Increase: +1 to Strength or Dexterity (max 20). Punch and Grab: When you hit with an Unarmed Strike as part of the Attack action, you can use both the Damage and Grapple option (once per turn). Attack Advantage: You have Advantage on attack rolls against a creature you have Grappled. Fast Wrestler: No extra movement to move a Grappled creature of your size or smaller.',
 '{"options": ["strength","dexterity"], "amount": 1}'::jsonb),

-- ── FIGHTING STYLE FEATS (requires Fighting Style class feature) ──
('Archery',
 '{"feature": "Fighting Style"}'::jsonb,
 'You gain a +2 bonus to attack rolls you make with Ranged weapons.',
 '{}'::jsonb),

('Defense',
 '{"feature": "Fighting Style"}'::jsonb,
 'While wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.',
 '{}'::jsonb),

('Great Weapon Fighting',
 '{"feature": "Fighting Style"}'::jsonb,
 'When you roll damage for a Melee weapon attack with a Two-Handed or Versatile weapon held in two hands, treat any 1 or 2 on a damage die as a 3.',
 '{}'::jsonb),

('Two-Weapon Fighting',
 '{"feature": "Fighting Style"}'::jsonb,
 'When you make an extra attack using a weapon with the Light property, you can add your ability modifier to the damage of that attack even if you haven''t already added it.',
 '{}'::jsonb),

-- ── EPIC BOON FEATS (Level 19+ prerequisite) ───────────────
('Boon of Combat Prowess',
 '{"level": 19}'::jsonb,
 'Ability Score Increase: +1 to one ability score (max 30). Peerless Aim: When you miss with an attack roll, you can hit instead. Once per turn.',
 '{"options": "any", "amount": 1, "max": 30}'::jsonb),

('Boon of Dimensional Travel',
 '{"level": 19}'::jsonb,
 'Ability Score Increase: +1 to one ability score (max 30). Blink Steps: Immediately after you take the Attack action or Magic action, teleport up to 30 feet to an unoccupied space you can see.',
 '{"options": "any", "amount": 1, "max": 30}'::jsonb),

('Boon of Fate',
 '{"level": 19}'::jsonb,
 'Ability Score Increase: +1 to one ability score (max 30). Improve Fate: When you or a creature within 60 feet succeeds or fails a D20 Test, roll 2d4 and apply the total as a bonus or penalty to the d20 roll. Once per Initiative or Short/Long Rest.',
 '{"options": "any", "amount": 1, "max": 30}'::jsonb),

('Boon of Irresistible Offense',
 '{"level": 19}'::jsonb,
 'Ability Score Increase: +1 to Strength or Dexterity (max 30). Overcome Defenses: Your Bludgeoning, Piercing, and Slashing damage always ignores Resistance. Overwhelming Strike: On a nat-20 attack roll, deal bonus damage equal to the boosted ability score (same type as the attack).',
 '{"options": ["strength","dexterity"], "amount": 1, "max": 30}'::jsonb),

('Boon of Spell Recall',
 '{"level": 19, "feature": "Spellcasting"}'::jsonb,
 'Ability Score Increase: +1 to Intelligence, Wisdom, or Charisma (max 30). Free Casting: When you cast a spell with a level 1–4 slot, roll 1d4. If the result equals the slot level, the slot is not expended.',
 '{"options": ["intelligence","wisdom","charisma"], "amount": 1, "max": 30}'::jsonb),

('Boon of the Night Spirit',
 '{"level": 19}'::jsonb,
 'Ability Score Increase: +1 to one ability score (max 30). Merge with Shadows: While in Dim Light or Darkness, gain the Invisible condition as a Bonus Action (ends when you take any action, bonus action, or reaction). Shadowy Form: While in Dim Light or Darkness, Resistance to all damage except Psychic and Radiant.',
 '{"options": "any", "amount": 1, "max": 30}'::jsonb),

('Boon of Truesight',
 '{"level": 19}'::jsonb,
 'Ability Score Increase: +1 to one ability score (max 30). Truesight: You have Truesight with a range of 60 feet.',
 '{"options": "any", "amount": 1, "max": 30}'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  prerequisites        = EXCLUDED.prerequisites,
  benefits             = EXCLUDED.benefits,
  ability_score_bonuses = EXCLUDED.ability_score_bonuses;

COMMIT;
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db push
supabase db execute --sql "SELECT name, prerequisites->>'level' as min_level FROM public.feats ORDER BY name;"
```

Expected: 15 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260510000006_srd_feats_seed.sql
git commit -m "feat: seed all 15 SRD 5.2.1 feats (Origin, General, Fighting Style, Epic Boon)"
```

---

## Task 7: Equipment — Weapons and Armor

**Files:**
- Create: `supabase/migrations/20260510000007_srd_equipment_seed.sql`

Weapons and armor from SRD 5.2.1 pages 89–92. Properties JSONB stores mechanical data used by the character sheet.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260510000007_srd_equipment_seed.sql
BEGIN;

-- ── SIMPLE MELEE WEAPONS ───────────────────────────────────
INSERT INTO public.equipment (name, category, cost, weight, properties) VALUES
  ('Club',         'Simple Melee Weapon', '1 SP', 2,    '{"damage":"1d4","damage_type":"Bludgeoning","weapon_properties":["Light"],"mastery":"Slow"}'::jsonb),
  ('Dagger',       'Simple Melee Weapon', '2 GP', 1,    '{"damage":"1d4","damage_type":"Piercing","weapon_properties":["Finesse","Light","Thrown"],"range":"20/60","mastery":"Nick"}'::jsonb),
  ('Greatclub',    'Simple Melee Weapon', '2 SP', 10,   '{"damage":"1d8","damage_type":"Bludgeoning","weapon_properties":["Two-Handed"],"mastery":"Push"}'::jsonb),
  ('Handaxe',      'Simple Melee Weapon', '5 GP', 2,    '{"damage":"1d6","damage_type":"Slashing","weapon_properties":["Light","Thrown"],"range":"20/60","mastery":"Vex"}'::jsonb),
  ('Javelin',      'Simple Melee Weapon', '5 SP', 2,    '{"damage":"1d6","damage_type":"Piercing","weapon_properties":["Thrown"],"range":"30/120","mastery":"Slow"}'::jsonb),
  ('Light Hammer', 'Simple Melee Weapon', '2 GP', 2,    '{"damage":"1d4","damage_type":"Bludgeoning","weapon_properties":["Light","Thrown"],"range":"20/60","mastery":"Nick"}'::jsonb),
  ('Mace',         'Simple Melee Weapon', '5 GP', 4,    '{"damage":"1d6","damage_type":"Bludgeoning","weapon_properties":[],"mastery":"Sap"}'::jsonb),
  ('Quarterstaff', 'Simple Melee Weapon', '2 SP', 4,    '{"damage":"1d6","damage_type":"Bludgeoning","weapon_properties":["Versatile"],"versatile_damage":"1d8","mastery":"Topple"}'::jsonb),
  ('Sickle',       'Simple Melee Weapon', '1 GP', 2,    '{"damage":"1d4","damage_type":"Slashing","weapon_properties":["Light"],"mastery":"Nick"}'::jsonb),
  ('Spear',        'Simple Melee Weapon', '1 GP', 3,    '{"damage":"1d6","damage_type":"Piercing","weapon_properties":["Thrown","Versatile"],"range":"20/60","versatile_damage":"1d8","mastery":"Sap"}'::jsonb),
-- ── SIMPLE RANGED WEAPONS ──────────────────────────────────
  ('Dart',            'Simple Ranged Weapon', '5 CP',  0.25, '{"damage":"1d4","damage_type":"Piercing","weapon_properties":["Finesse","Thrown"],"range":"20/60","mastery":"Vex"}'::jsonb),
  ('Light Crossbow',  'Simple Ranged Weapon', '25 GP', 5,    '{"damage":"1d8","damage_type":"Piercing","weapon_properties":["Ammunition","Loading","Two-Handed"],"range":"80/320","ammunition_type":"Bolt","mastery":"Slow"}'::jsonb),
  ('Shortbow',        'Simple Ranged Weapon', '25 GP', 2,    '{"damage":"1d6","damage_type":"Piercing","weapon_properties":["Ammunition","Two-Handed"],"range":"80/320","ammunition_type":"Arrow","mastery":"Vex"}'::jsonb),
  ('Sling',           'Simple Ranged Weapon', '1 SP',  0,    '{"damage":"1d4","damage_type":"Bludgeoning","weapon_properties":["Ammunition"],"range":"30/120","ammunition_type":"Bullet","mastery":"Slow"}'::jsonb),
-- ── MARTIAL MELEE WEAPONS ──────────────────────────────────
  ('Battleaxe',   'Martial Melee Weapon', '10 GP', 4,  '{"damage":"1d8","damage_type":"Slashing","weapon_properties":["Versatile"],"versatile_damage":"1d10","mastery":"Topple"}'::jsonb),
  ('Flail',       'Martial Melee Weapon', '10 GP', 2,  '{"damage":"1d8","damage_type":"Bludgeoning","weapon_properties":[],"mastery":"Sap"}'::jsonb),
  ('Glaive',      'Martial Melee Weapon', '20 GP', 6,  '{"damage":"1d10","damage_type":"Slashing","weapon_properties":["Heavy","Reach","Two-Handed"],"mastery":"Graze"}'::jsonb),
  ('Greataxe',    'Martial Melee Weapon', '30 GP', 7,  '{"damage":"1d12","damage_type":"Slashing","weapon_properties":["Heavy","Two-Handed"],"mastery":"Cleave"}'::jsonb),
  ('Greatsword',  'Martial Melee Weapon', '50 GP', 6,  '{"damage":"2d6","damage_type":"Slashing","weapon_properties":["Heavy","Two-Handed"],"mastery":"Graze"}'::jsonb),
  ('Halberd',     'Martial Melee Weapon', '20 GP', 6,  '{"damage":"1d10","damage_type":"Slashing","weapon_properties":["Heavy","Reach","Two-Handed"],"mastery":"Cleave"}'::jsonb),
  ('Lance',       'Martial Melee Weapon', '10 GP', 6,  '{"damage":"1d10","damage_type":"Piercing","weapon_properties":["Heavy","Reach","Two-Handed"],"note":"Two-Handed unless mounted","mastery":"Topple"}'::jsonb),
  ('Longsword',   'Martial Melee Weapon', '15 GP', 3,  '{"damage":"1d8","damage_type":"Slashing","weapon_properties":["Versatile"],"versatile_damage":"1d10","mastery":"Sap"}'::jsonb),
  ('Maul',        'Martial Melee Weapon', '10 GP', 10, '{"damage":"2d6","damage_type":"Bludgeoning","weapon_properties":["Heavy","Two-Handed"],"mastery":"Topple"}'::jsonb),
  ('Morningstar', 'Martial Melee Weapon', '15 GP', 4,  '{"damage":"1d8","damage_type":"Piercing","weapon_properties":[],"mastery":"Sap"}'::jsonb),
  ('Pike',        'Martial Melee Weapon', '5 GP',  18, '{"damage":"1d10","damage_type":"Piercing","weapon_properties":["Heavy","Reach","Two-Handed"],"mastery":"Push"}'::jsonb),
  ('Rapier',      'Martial Melee Weapon', '25 GP', 2,  '{"damage":"1d8","damage_type":"Piercing","weapon_properties":["Finesse"],"mastery":"Vex"}'::jsonb),
  ('Scimitar',    'Martial Melee Weapon', '25 GP', 3,  '{"damage":"1d6","damage_type":"Slashing","weapon_properties":["Finesse","Light"],"mastery":"Nick"}'::jsonb),
  ('Shortsword',  'Martial Melee Weapon', '10 GP', 2,  '{"damage":"1d6","damage_type":"Piercing","weapon_properties":["Finesse","Light"],"mastery":"Vex"}'::jsonb),
  ('Trident',     'Martial Melee Weapon', '5 GP',  4,  '{"damage":"1d8","damage_type":"Piercing","weapon_properties":["Thrown","Versatile"],"range":"20/60","versatile_damage":"1d10","mastery":"Topple"}'::jsonb),
  ('War Pick',    'Martial Melee Weapon', '5 GP',  2,  '{"damage":"1d8","damage_type":"Piercing","weapon_properties":["Versatile"],"versatile_damage":"1d10","mastery":"Sap"}'::jsonb),
  ('Warhammer',   'Martial Melee Weapon', '15 GP', 5,  '{"damage":"1d8","damage_type":"Bludgeoning","weapon_properties":["Versatile"],"versatile_damage":"1d10","mastery":"Push"}'::jsonb),
  ('Whip',        'Martial Melee Weapon', '2 GP',  3,  '{"damage":"1d4","damage_type":"Slashing","weapon_properties":["Finesse","Reach"],"mastery":"Slow"}'::jsonb),
-- ── MARTIAL RANGED WEAPONS ─────────────────────────────────
  ('Blowgun',         'Martial Ranged Weapon', '10 GP',  1,  '{"damage":"1","damage_type":"Piercing","weapon_properties":["Ammunition","Loading"],"range":"25/100","ammunition_type":"Needle","mastery":"Vex"}'::jsonb),
  ('Hand Crossbow',   'Martial Ranged Weapon', '75 GP',  3,  '{"damage":"1d6","damage_type":"Piercing","weapon_properties":["Ammunition","Light","Loading"],"range":"30/120","ammunition_type":"Bolt","mastery":"Vex"}'::jsonb),
  ('Heavy Crossbow',  'Martial Ranged Weapon', '50 GP',  18, '{"damage":"1d10","damage_type":"Piercing","weapon_properties":["Ammunition","Heavy","Loading","Two-Handed"],"range":"100/400","ammunition_type":"Bolt","mastery":"Push"}'::jsonb),
  ('Longbow',         'Martial Ranged Weapon', '50 GP',  2,  '{"damage":"1d8","damage_type":"Piercing","weapon_properties":["Ammunition","Heavy","Two-Handed"],"range":"150/600","ammunition_type":"Arrow","mastery":"Slow"}'::jsonb),
  ('Musket',          'Martial Ranged Weapon', '500 GP', 10, '{"damage":"1d12","damage_type":"Piercing","weapon_properties":["Ammunition","Loading","Two-Handed"],"range":"40/120","ammunition_type":"Bullet","mastery":"Slow"}'::jsonb),
  ('Pistol',          'Martial Ranged Weapon', '250 GP', 3,  '{"damage":"1d10","damage_type":"Piercing","weapon_properties":["Ammunition","Loading"],"range":"30/90","ammunition_type":"Bullet","mastery":"Vex"}'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  category   = EXCLUDED.category,
  cost       = EXCLUDED.cost,
  weight     = EXCLUDED.weight,
  properties = EXCLUDED.properties;

-- ── ARMOR ──────────────────────────────────────────────────
INSERT INTO public.equipment (name, category, cost, weight, properties) VALUES
-- Light Armor
  ('Padded Armor',         'Light Armor',  '5 GP',     8,  '{"armor_class":"11 + Dex modifier","strength_requirement":null,"stealth_disadvantage":true,"don_time":"1 minute","doff_time":"1 minute"}'::jsonb),
  ('Leather Armor',        'Light Armor',  '10 GP',    10, '{"armor_class":"11 + Dex modifier","strength_requirement":null,"stealth_disadvantage":false,"don_time":"1 minute","doff_time":"1 minute"}'::jsonb),
  ('Studded Leather Armor','Light Armor',  '45 GP',    13, '{"armor_class":"12 + Dex modifier","strength_requirement":null,"stealth_disadvantage":false,"don_time":"1 minute","doff_time":"1 minute"}'::jsonb),
-- Medium Armor
  ('Hide Armor',       'Medium Armor', '10 GP',  12, '{"armor_class":"12 + Dex modifier (max 2)","strength_requirement":null,"stealth_disadvantage":false,"don_time":"5 minutes","doff_time":"1 minute"}'::jsonb),
  ('Chain Shirt',      'Medium Armor', '50 GP',  20, '{"armor_class":"13 + Dex modifier (max 2)","strength_requirement":null,"stealth_disadvantage":false,"don_time":"5 minutes","doff_time":"1 minute"}'::jsonb),
  ('Scale Mail',       'Medium Armor', '50 GP',  45, '{"armor_class":"14 + Dex modifier (max 2)","strength_requirement":null,"stealth_disadvantage":true,"don_time":"5 minutes","doff_time":"1 minute"}'::jsonb),
  ('Breastplate',      'Medium Armor', '400 GP', 20, '{"armor_class":"14 + Dex modifier (max 2)","strength_requirement":null,"stealth_disadvantage":false,"don_time":"5 minutes","doff_time":"1 minute"}'::jsonb),
  ('Half Plate Armor', 'Medium Armor', '750 GP', 40, '{"armor_class":"15 + Dex modifier (max 2)","strength_requirement":null,"stealth_disadvantage":true,"don_time":"5 minutes","doff_time":"1 minute"}'::jsonb),
-- Heavy Armor
  ('Ring Mail',    'Heavy Armor', '30 GP',    40, '{"armor_class":"14","strength_requirement":null,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'::jsonb),
  ('Chain Mail',   'Heavy Armor', '75 GP',    55, '{"armor_class":"16","strength_requirement":13,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'::jsonb),
  ('Splint Armor', 'Heavy Armor', '200 GP',   60, '{"armor_class":"17","strength_requirement":15,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'::jsonb),
  ('Plate Armor',  'Heavy Armor', '1500 GP',  65, '{"armor_class":"18","strength_requirement":15,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'::jsonb),
-- Shield
  ('Shield', 'Shield', '10 GP', 6, '{"armor_class_bonus":2,"don_time":"Utilize action","doff_time":"Utilize action"}'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  category   = EXCLUDED.category,
  cost       = EXCLUDED.cost,
  weight     = EXCLUDED.weight,
  properties = EXCLUDED.properties;

COMMIT;
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db push
supabase db execute --sql "
  SELECT category, COUNT(*) FROM public.equipment GROUP BY category ORDER BY category;
"
```

Expected output:
```
Heavy Armor          | 4
Light Armor          | 3
Martial Melee Weapon | 18
Martial Ranged Weapon| 6
Medium Armor         | 5
Shield               | 1
Simple Melee Weapon  | 10
Simple Ranged Weapon | 4
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260510000007_srd_equipment_seed.sql
git commit -m "feat: seed all SRD weapons and armor (46 weapons, 13 armor, shield)"
```

---

## Task 8: Spells — Full SRD Spell List

**Files:**
- Create: `supabase/migrations/20260510000008_srd_spells_seed.sql`

The SRD 5.2.1 contains **~316 spells** (PDF text lines 23,600–35,000). The existing seed has 13; they need updating and ~303 more need adding. This task instructs you to extract spell data directly from the PDF.

**Extraction command:**
```bash
pdftotext /Users/biancachong/Desktop/SRD_CC_v5.2.1.pdf - | sed -n '23600,35000p' > /tmp/srd_spells.txt
```

**Spell entry pattern in the PDF:**
```
Spell Name
Level N School (Class1, Class2, ...)
Casting Time: ...
Range: ...
Components: V, S, M (description)
Duration: ...

Description text...
```

**Spell SQL template:**
```sql
INSERT INTO public.spells
  (name, level, school, casting_time, range, components, duration, description, classes, is_ritual, requires_concentration)
VALUES
  ('Spell Name', LEVEL, 'School', 'Casting Time', 'Range', 'V, S, M (description)', 'Duration',
   'Full description text.', ARRAY['class1','class2'], IS_RITUAL, REQUIRES_CONCENTRATION)
ON CONFLICT (name) DO UPDATE SET
  level = EXCLUDED.level, school = EXCLUDED.school, casting_time = EXCLUDED.casting_time,
  range = EXCLUDED.range, components = EXCLUDED.components, duration = EXCLUDED.duration,
  description = EXCLUDED.description, classes = EXCLUDED.classes,
  is_ritual = EXCLUDED.is_ritual, requires_concentration = EXCLUDED.requires_concentration;
```

**Rules for extracting spell data:**
- `level`: 0 for cantrips, 1–9 for leveled spells
- `school`: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation
- `classes`: lowercase array — `bard`, `cleric`, `druid`, `paladin`, `ranger`, `sorcerer`, `warlock`, `wizard`
- `is_ritual`: true if the spell lists "Ritual" in its entry (marked with R in class spell lists)
- `requires_concentration`: true if Duration begins with "Concentration"
- The duration string includes the full text, e.g., `"Concentration, up to 1 minute"`

- [ ] **Step 1: Extract spell text from PDF**

```bash
pdftotext /Users/biancachong/Desktop/SRD_CC_v5.2.1.pdf - | sed -n '23600,35000p' > /tmp/srd_spells.txt
wc -l /tmp/srd_spells.txt
```

- [ ] **Step 2: Write the migration with all 316 spells**

Start the file with:
```sql
-- supabase/migrations/20260510000008_srd_spells_seed.sql
BEGIN;

-- Delete old placeholder spells and re-insert all SRD spells
DELETE FROM public.character_spells WHERE spell_id IN (SELECT id FROM public.spells);
DELETE FROM public.spells;
```

Then extract each spell from `/tmp/srd_spells.txt` and write the INSERT. The 13 spells already in the seed are a starting reference (correct them to match the PDF):

```sql
-- Cantrips (level 0) — sample of correctly-formatted entries:
INSERT INTO public.spells (name, level, school, casting_time, range, components, duration, description, classes, is_ritual, requires_concentration) VALUES
('Eldritch Blast', 0, 'Evocation', 'Action', '120 feet', 'V, S',
 'Instantaneous',
 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Force damage. The spell creates more than one beam when you reach higher levels: two beams at level 5, three beams at level 11, and four beams at level 17.',
 ARRAY['warlock'], false, false),

('Fire Bolt', 0, 'Evocation', 'Action', '120 feet', 'V, S',
 'Instantaneous',
 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 2d10 Fire damage. A flammable object hit by this spell starts burning if it isn''t being worn or carried. This spell''s damage increases by 2d10 when you reach levels 5 (4d10), 11 (6d10), and 17 (8d10).',
 ARRAY['sorcerer','wizard'], false, false),

('Mage Hand', 0, 'Conjuration', 'Action', '30 feet', 'V, S',
 '1 minute',
 'A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. You can move the hand up to 30 feet each time you use it. The hand can''t attack, activate magic items, or carry more than 10 pounds.',
 ARRAY['bard','sorcerer','warlock','wizard'], false, false),

('Prestidigitation', 0, 'Transmutation', 'Action', '10 feet', 'V, S',
 'Up to 1 hour',
 'This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range: (1) an instantaneous, harmless sensory effect; (2) instantaneously light or snuff out a candle, torch, or small campfire; (3) instantaneously clean or soil an object no larger than 1 cubic foot; (4) chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour; (5) make a color, small mark, or symbol appear on an object or a surface for 1 hour; (6) create a nonmagical trinket or an illusory image that fits in your hand. You can have up to three of the effects active at a time, and you can dismiss such an effect as an action.',
 ARRAY['bard','sorcerer','warlock','wizard'], false, false),

('Sacred Flame', 0, 'Evocation', 'Action', '60 feet', 'V, S',
 'Instantaneous',
 'Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 Radiant damage. The target gains no benefit from cover for this saving throw. The spell''s damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8).',
 ARRAY['cleric'], false, false)

-- ... continue with ALL remaining spells extracted from /tmp/srd_spells.txt
-- Work through them alphabetically as they appear in the PDF

ON CONFLICT (name) DO UPDATE SET
  level = EXCLUDED.level, school = EXCLUDED.school, casting_time = EXCLUDED.casting_time,
  range = EXCLUDED.range, components = EXCLUDED.components, duration = EXCLUDED.duration,
  description = EXCLUDED.description, classes = EXCLUDED.classes,
  is_ritual = EXCLUDED.is_ritual, requires_concentration = EXCLUDED.requires_concentration;

COMMIT;
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db push
supabase db execute --sql "
  SELECT level, COUNT(*) as count FROM public.spells GROUP BY level ORDER BY level;
  SELECT COUNT(*) as total FROM public.spells;
"
```

Expected: ~316 total spells across levels 0–9.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510000008_srd_spells_seed.sql
git commit -m "feat: seed full SRD spell list (~316 spells, all levels 0-9)"
```

---

## Task 9: Magic Items

**Files:**
- Create: `supabase/migrations/20260510000009_srd_magic_items_seed.sql`

The SRD 5.2.1 "Magic Items A–Z" section (PDF text lines ~36,890–53,000) contains ~120 named magic items. Extract them all and insert.

**Extraction command:**
```bash
pdftotext /Users/biancachong/Desktop/SRD_CC_v5.2.1.pdf - | sed -n '36890,53000p' > /tmp/srd_magic_items.txt
```

**Magic item entry pattern in the PDF:**
```
Item Name
Type (Subtype), Rarity (Requires Attunement [by condition])

Description text...
```

**SQL template:**
```sql
INSERT INTO public.magic_items
  (name, item_type, rarity, requires_attunement, attunement_condition, description, properties)
VALUES
  ('Item Name', 'Wondrous Item', 'Uncommon', true, 'by a spellcaster',
   'Description text.',
   '{}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  item_type = EXCLUDED.item_type, rarity = EXCLUDED.rarity,
  requires_attunement = EXCLUDED.requires_attunement,
  attunement_condition = EXCLUDED.attunement_condition,
  description = EXCLUDED.description, properties = EXCLUDED.properties;
```

**Type mapping from PDF:**
| PDF text | `item_type` value |
|---|---|
| Armor (Any ...) | `'Armor'` |
| Weapon (Any ...) | `'Weapon'` |
| Wondrous Item | `'Wondrous Item'` |
| Ring | `'Ring'` |
| Rod | `'Rod'` |
| Staff | `'Staff'` |
| Wand | `'Wand'` |
| Potion | `'Potion'` |
| Scroll | `'Scroll'` |

**Rarity values** (exactly as below — enforced by CHECK constraint):
`'Common'`, `'Uncommon'`, `'Rare'`, `'Very Rare'`, `'Legendary'`, `'Artifact'`, `'Varies'`

- [ ] **Step 1: Extract magic item text**

```bash
pdftotext /Users/biancachong/Desktop/SRD_CC_v5.2.1.pdf - | sed -n '36890,53000p' > /tmp/srd_magic_items.txt
wc -l /tmp/srd_magic_items.txt
```

- [ ] **Step 2: Write the migration with all ~120 magic items**

Start with the file header and these confirmed items as a reference:

```sql
-- supabase/migrations/20260510000009_srd_magic_items_seed.sql
BEGIN;

INSERT INTO public.magic_items
  (name, item_type, rarity, requires_attunement, attunement_condition, description, properties)
VALUES

('Adamantine Armor',
 'Armor', 'Uncommon', false, null,
 'This suit of armor (any Medium or Heavy, except Hide) is reinforced with adamantine. While wearing it, any Critical Hit against you becomes a normal hit.',
 '{"applies_to": "Any Medium or Heavy armor except Hide"}'::jsonb),

('Amulet of Health',
 'Wondrous Item', 'Rare', true, null,
 'Your Constitution score is 19 while you wear this amulet. It has no effect if your Constitution is already 19 or higher.',
 '{}'::jsonb),

('Amulet of Proof against Detection and Location',
 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this amulet, you can''t be targeted by Divination spells or perceived through magical scrying sensors unless you allow it.',
 '{}'::jsonb),

('Amulet of the Planes',
 'Wondrous Item', 'Very Rare', true, null,
 'While wearing this amulet, you can take a Magic action to cast Plane Shift (DC 15 Intelligence (Arcana) check). On failure, you and creatures/objects within 15 feet travel to a random destination.',
 '{}'::jsonb),

('Animated Shield',
 'Armor', 'Very Rare', true, null,
 'While holding this Shield, you can take a Bonus Action to cause it to animate, hovering and protecting you hands-free for 1 minute.',
 '{}'::jsonb),

('Armor, +1',  'Armor', 'Rare',      false, null, 'You have a +1 bonus to Armor Class while wearing this armor (any Light, Medium, or Heavy).', '{"bonus": 1}'::jsonb),
('Armor, +2',  'Armor', 'Very Rare', false, null, 'You have a +2 bonus to Armor Class while wearing this armor (any Light, Medium, or Heavy).', '{"bonus": 2}'::jsonb),
('Armor, +3',  'Armor', 'Legendary', false, null, 'You have a +3 bonus to Armor Class while wearing this armor (any Light, Medium, or Heavy).', '{"bonus": 3}'::jsonb)

-- ... continue with all items extracted from /tmp/srd_magic_items.txt

ON CONFLICT (name) DO UPDATE SET
  item_type = EXCLUDED.item_type, rarity = EXCLUDED.rarity,
  requires_attunement = EXCLUDED.requires_attunement,
  attunement_condition = EXCLUDED.attunement_condition,
  description = EXCLUDED.description, properties = EXCLUDED.properties;

COMMIT;
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db push
supabase db execute --sql "
  SELECT rarity, COUNT(*) FROM public.magic_items GROUP BY rarity ORDER BY rarity;
  SELECT COUNT(*) as total FROM public.magic_items;
"
```

Expected: ~120 total items across Common → Legendary rarities.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510000009_srd_magic_items_seed.sql
git commit -m "feat: seed all SRD magic items A-Z with rarity and attunement data"
```

---

## Final Verification

After all 9 tasks complete, run this summary check:

```bash
supabase db execute --sql "
  SELECT 'classes'     AS tbl, COUNT(*) FROM public.classes
  UNION ALL SELECT 'subclasses',   COUNT(*) FROM public.subclasses
  UNION ALL SELECT 'species',      COUNT(*) FROM public.species
  UNION ALL SELECT 'backgrounds',  COUNT(*) FROM public.backgrounds
  UNION ALL SELECT 'feats',        COUNT(*) FROM public.feats
  UNION ALL SELECT 'equipment',    COUNT(*) FROM public.equipment
  UNION ALL SELECT 'spells',       COUNT(*) FROM public.spells
  UNION ALL SELECT 'magic_items',  COUNT(*) FROM public.magic_items
  ORDER BY tbl;
"
```

Expected minimums:

| Table | Expected Count |
|---|---|
| classes | 12 |
| subclasses | 12 |
| species | 9 |
| backgrounds | 4 |
| feats | 15 |
| equipment | 51+ (weapons + armor) |
| spells | 316+ |
| magic_items | 120+ |

---

## Self-Review Checklist

- [x] **Subclass wrong names fixed**: Berserker → Path of the Berserker; Wild Magic (Sorcerer) → Draconic Sorcery; The Fiend → Fiend Patron; School of Evocation → Evoker; Way of the Open Hand → Warrior of the Open Hand; Light Domain deleted (not in SRD)
- [x] **Goliath added** with Speed 35 (not 30)
- [x] **Non-SRD backgrounds removed**: Folk Hero, Hermit, Noble, Outlander, Sailor, Urchin — with FK safety steps
- [x] **`feature` renamed to `origin_feat`** in backgrounds table — Task 1 handles this before Task 5 references it
- [x] **`tool_proficiency` added** to backgrounds — Task 1 handles before Task 5 uses it
- [x] **Feats unique constraint** added in Task 1 before Task 6 inserts
- [x] **Equipment unique constraint** added in Task 1 before Task 7 inserts
- [x] **magic_items table created** in Task 1 before Task 9 uses it
- [x] **Spells extraction approach** references exact PDF lines and provides template with correct column names
- [x] **All ON CONFLICT clauses** use the correct unique constraint column (`name` for all SRD tables)
- [x] **character FK safety** — Tasks 3, 5 NULL out character references before deleting reference rows
