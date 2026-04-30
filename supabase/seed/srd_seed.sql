BEGIN;

-- 2024 SRD Classes
insert into public.classes (name, hit_die, primary_abilities, saving_throw_proficiencies, description) values
  ('Barbarian', 12, array['strength','constitution'], array['strength','constitution'], 'A fierce warrior who can enter a battle rage.'),
  ('Bard', 8, array['dexterity','charisma'], array['dexterity','charisma'], 'An inspiring magician whose power echoes the music of creation.'),
  ('Cleric', 8, array['wisdom','charisma'], array['wisdom','charisma'], 'A priestly champion who wields divine magic in service of a higher power.'),
  ('Druid', 8, array['wisdom'], array['intelligence','wisdom'], 'A priest of the Old Faith, wielding the powers of nature.'),
  ('Fighter', 10, array['strength','dexterity'], array['strength','constitution'], 'A master of martial combat, skilled with a variety of weapons and armor.'),
  ('Monk', 8, array['dexterity','wisdom'], array['strength','dexterity'], 'A master of martial arts, harnessing the power of the body.'),
  ('Paladin', 10, array['strength','charisma'], array['wisdom','charisma'], 'A holy warrior bound to a sacred oath.'),
  ('Ranger', 10, array['dexterity','wisdom'], array['strength','dexterity'], 'A warrior who combats threats on the edges of civilization.'),
  ('Rogue', 8, array['dexterity','intelligence'], array['dexterity','intelligence'], 'A scoundrel who uses stealth and trickery to overcome obstacles.'),
  ('Sorcerer', 6, array['constitution','charisma'], array['constitution','charisma'], 'A spellcaster who draws on inherent magic from a gift or bloodline.'),
  ('Warlock', 8, array['charisma'], array['wisdom','charisma'], 'A wielder of magic derived from a bargain with an extraplanar entity.'),
  ('Wizard', 6, array['intelligence','wisdom'], array['intelligence','wisdom'], 'A scholarly magic-user capable of manipulating the structures of reality.')
ON CONFLICT DO NOTHING;

-- 2024 SRD Subclasses (resolved via name lookup to avoid UUID dependency)
insert into public.subclasses (class_id, name, description)
select id, 'Berserker', 'For some barbarians, rage is a means to an end — that end being violence.'
from public.classes where name = 'Barbarian'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'College of Lore', 'Bards of the College of Lore know something about most things.'
from public.classes where name = 'Bard'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Life Domain', 'The Life domain focuses on the vibrant positive energy that sustains all life.'
from public.classes where name = 'Cleric'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Light Domain', 'Gods of light promote the ideals of rebirth and truth.'
from public.classes where name = 'Cleric'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Circle of the Land', 'The Circle of the Land is made up of mystics and sages.'
from public.classes where name = 'Druid'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Champion', 'The archetypal Champion focuses on the development of raw physical power.'
from public.classes where name = 'Fighter'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Way of the Open Hand', 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat.'
from public.classes where name = 'Monk'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Oath of Devotion', 'The Oath of Devotion binds a paladin to the loftiest ideals of justice.'
from public.classes where name = 'Paladin'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Hunter', 'Emulating the Hunter archetype means accepting your place as a bulwark.'
from public.classes where name = 'Ranger'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Thief', 'You hone your skills in the larcenous arts.'
from public.classes where name = 'Rogue'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'Wild Magic', 'Your innate magic comes from the wild forces of chaos.'
from public.classes where name = 'Sorcerer'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'The Fiend', 'You have made a pact with a fiend from the lower planes of existence.'
from public.classes where name = 'Warlock'
ON CONFLICT DO NOTHING;

insert into public.subclasses (class_id, name, description)
select id, 'School of Evocation', 'You focus your study on magic that creates powerful elemental effects.'
from public.classes where name = 'Wizard'
ON CONFLICT DO NOTHING;

-- 2024 SRD Species (traits only — no ability score bonuses per 2024 rules)
insert into public.species (name, speed, traits, ability_score_bonuses) values
  ('Human', 30, '{"traits": ["Resourceful", "Skillful", "Versatile"]}', '{}'),
  ('Elf', 30, '{"traits": ["Darkvision", "Keen Senses", "Fey Ancestry", "Trance"]}', '{}'),
  ('Dwarf', 30, '{"traits": ["Darkvision", "Dwarven Resilience", "Dwarven Toughness", "Stonecunning"]}', '{}'),
  ('Halfling', 30, '{"traits": ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"]}', '{}'),
  ('Gnome', 30, '{"traits": ["Darkvision", "Gnomish Cunning", "Gnomish Lineage"]}', '{}'),
  ('Orc', 30, '{"traits": ["Adrenaline Rush", "Darkvision", "Relentless Endurance"]}', '{}'),
  ('Tiefling', 30, '{"traits": ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"]}', '{}'),
  ('Dragonborn', 30, '{"traits": ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Draconic Flight"]}', '{}')
ON CONFLICT DO NOTHING;

-- 2024 SRD Backgrounds (grant +2/+1 ability score bonuses per 2024 rules)
insert into public.backgrounds (name, skill_proficiencies, ability_score_options, description, feature) values
  ('Acolyte', array['insight','religion'], '{"options": [["intelligence","wisdom","charisma"]]}', 'You have spent your life in service to a temple.', 'Shelter of the Faithful'),
  ('Criminal', array['deception','stealth'], '{"options": [["dexterity","intelligence","charisma"]]}', 'You are an experienced criminal with a history of breaking the law.', 'Criminal Contact'),
  ('Folk Hero', array['animal-handling','survival'], '{"options": [["constitution","dexterity","wisdom"]]}', 'You come from a humble social rank but are destined for so much more.', 'Rustic Hospitality'),
  ('Hermit', array['medicine','religion'], '{"options": [["constitution","intelligence","wisdom"]]}', 'You lived in seclusion for a formative part of your life.', 'Discovery'),
  ('Noble', array['history','persuasion'], '{"options": [["intelligence","wisdom","charisma"]]}', 'You understand wealth, power, and privilege.', 'Position of Privilege'),
  ('Outlander', array['athletics','survival'], '{"options": [["strength","constitution","wisdom"]]}', 'You grew up in the wilds, far from civilization.', 'Wanderer'),
  ('Sage', array['arcana','history'], '{"options": [["constitution","intelligence","wisdom"]]}', 'You spent years learning the lore of the multiverse.', 'Researcher'),
  ('Sailor', array['athletics','perception'], '{"options": [["strength","dexterity","wisdom"]]}', 'You sailed on a seagoing vessel for years.', 'Ship''s Passage'),
  ('Soldier', array['athletics','intimidation'], '{"options": [["strength","dexterity","constitution"]]}', 'War has been your life for as long as you care to remember.', 'Military Rank'),
  ('Urchin', array['sleight-of-hand','stealth'], '{"options": [["dexterity","intelligence","charisma"]]}', 'You grew up on the streets alone, orphaned.', 'City Secrets')
ON CONFLICT DO NOTHING;

-- 2024 SRD Spells
insert into public.spells (name, level, school, casting_time, range, components, duration, description, classes, is_ritual, requires_concentration) values
  ('Fireball', 3, 'Evocation', '1 action', '150 feet', 'V, S, M (a tiny ball of bat guano and sulfur)', 'Instantaneous', 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.', array['sorcerer','wizard'], false, false),
  ('Cure Wounds', 1, 'Evocation', '1 action', 'Touch', 'V, S', 'Instantaneous', 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.', array['bard','cleric','druid','paladin','ranger'], false, false),
  ('Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.', array['sorcerer','wizard'], false, false),
  ('Shield', 1, 'Abjuration', '1 reaction', 'Self', 'V, S', '1 round', 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.', array['sorcerer','wizard'], false, false),
  ('Healing Word', 1, 'Evocation', '1 bonus action', '60 feet', 'V', 'Instantaneous', 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.', array['bard','cleric','druid'], false, false),
  ('Misty Step', 2, 'Conjuration', '1 bonus action', 'Self', 'V', 'Instantaneous', 'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.', array['sorcerer','warlock','wizard'], false, false),
  ('Prestidigitation', 0, 'Transmutation', '1 action', '10 feet', 'V, S', 'Up to 1 hour', 'This spell is a minor magical trick that novice spellcasters use for practice.', array['bard','sorcerer','warlock','wizard'], false, false),
  ('Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V, S', '1 minute', 'A spectral, floating hand appears at a point you choose within range.', array['bard','sorcerer','warlock','wizard'], false, false),
  ('Sacred Flame', 0, 'Evocation', '1 action', '60 feet', 'V, S', 'Instantaneous', 'Flame-like radiance descends on a creature that you can see within range.', array['cleric'], false, false),
  ('Eldritch Blast', 0, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.', array['warlock'], false, false),
  ('Hex', 1, 'Enchantment', '1 bonus action', '90 feet', 'V, S, M (the petrified eye of a newt)', 'Concentration, up to 1 hour', 'You place a curse on a creature that you can see within range.', array['warlock'], false, true),
  ('Bless', 1, 'Enchantment', '1 action', '30 feet', 'V, S, M (a sprinkling of holy water)', 'Concentration, up to 1 minute', 'You bless up to three creatures of your choice within range.', array['cleric','paladin'], false, true),
  ('Detect Magic', 1, 'Divination', '1 action', 'Self', 'V, S', 'Concentration, up to 10 minutes', 'For the duration, you sense the presence of magic within 30 feet of you.', array['bard','cleric','druid','paladin','ranger','sorcerer','wizard'], true, true)
ON CONFLICT DO NOTHING;

COMMIT;
