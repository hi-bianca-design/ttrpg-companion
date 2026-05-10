-- supabase/migrations/20260510000003_srd_subclasses_seed.sql
BEGIN;

-- NULL out any character subclass references before deleting (FK safety)
UPDATE public.characters SET subclass_id = NULL
  WHERE subclass_id IN (SELECT id FROM public.subclasses);

DELETE FROM public.subclasses;

-- Insert via class name lookup (avoids UUID hardcoding)

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
  'The Champion focuses on the development of raw physical power honed to deadly perfection.',
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
  'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order.',
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
  'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors.',
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
  'You have made a pact with a fiend from the lower planes of existence, a powerful demon, devil, or other evil being.',
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
