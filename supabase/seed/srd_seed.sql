-- 2024 SRD Classes
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

-- 2024 SRD Subclasses
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

-- 2024 SRD Species (traits only — no ability score bonuses per 2024 rules)
insert into public.species (id, name, speed, traits, ability_score_bonuses) values
  ('sp-human', 'Human', 30, '{"traits": ["Resourceful", "Skillful", "Versatile"]}', '{}'),
  ('sp-elf', 'Elf', 30, '{"traits": ["Darkvision", "Keen Senses", "Fey Ancestry", "Trance"]}', '{}'),
  ('sp-dwarf', 'Dwarf', 30, '{"traits": ["Darkvision", "Dwarven Resilience", "Dwarven Toughness", "Stonecunning"]}', '{}'),
  ('sp-halfling', 'Halfling', 30, '{"traits": ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"]}', '{}'),
  ('sp-gnome', 'Gnome', 30, '{"traits": ["Darkvision", "Gnomish Cunning", "Gnomish Lineage"]}', '{}'),
  ('sp-orc', 'Orc', 30, '{"traits": ["Adrenaline Rush", "Darkvision", "Relentless Endurance"]}', '{}'),
  ('sp-tiefling', 'Tiefling', 30, '{"traits": ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"]}', '{}'),
  ('sp-dragonborn', 'Dragonborn', 30, '{"traits": ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Draconic Flight"]}', '{}');

-- 2024 SRD Backgrounds (grant +2/+1 ability score bonuses per 2024 rules)
insert into public.backgrounds (id, name, skill_proficiencies, ability_score_options, description, feature) values
  ('bg-acolyte', 'Acolyte', array['insight','religion'], '{"options": [["intelligence","wisdom","charisma"]]}', 'You have spent your life in service to a temple.', 'Shelter of the Faithful'),
  ('bg-criminal', 'Criminal', array['deception','stealth'], '{"options": [["dexterity","intelligence","charisma"]]}', 'You are an experienced criminal with a history of breaking the law.', 'Criminal Contact'),
  ('bg-folk-hero', 'Folk Hero', array['animal-handling','survival'], '{"options": [["constitution","dexterity","wisdom"]]}', 'You come from a humble social rank but are destined for so much more.', 'Rustic Hospitality'),
  ('bg-hermit', 'Hermit', array['medicine','religion'], '{"options": [["constitution","intelligence","wisdom"]]}', 'You lived in seclusion for a formative part of your life.', 'Discovery'),
  ('bg-noble', 'Noble', array['history','persuasion'], '{"options": [["intelligence","wisdom","charisma"]]}', 'You understand wealth, power, and privilege.', 'Position of Privilege'),
  ('bg-outlander', 'Outlander', array['athletics','survival'], '{"options": [["strength","constitution","wisdom"]]}', 'You grew up in the wilds, far from civilization.', 'Wanderer'),
  ('bg-sage', 'Sage', array['arcana','history'], '{"options": [["constitution","intelligence","wisdom"]]}', 'You spent years learning the lore of the multiverse.', 'Researcher'),
  ('bg-sailor', 'Sailor', array['athletics','perception'], '{"options": [["strength","dexterity","wisdom"]]}', 'You sailed on a seagoing vessel for years.', 'Ship''s Passage'),
  ('bg-soldier', 'Soldier', array['athletics','intimidation'], '{"options": [["strength","dexterity","constitution"]]}', 'War has been your life for as long as you care to remember.', 'Military Rank'),
  ('bg-urchin', 'Urchin', array['sleight-of-hand','stealth'], '{"options": [["dexterity","intelligence","charisma"]]}', 'You grew up on the streets alone, orphaned.', 'City Secrets');

-- 2024 SRD Spells (representative set)
insert into public.spells (id, name, level, school, casting_time, range, components, duration, description, classes, is_ritual, requires_concentration) values
  ('spl-fireball', 'Fireball', 3, 'Evocation', '1 action', '150 feet', 'V, S, M (a tiny ball of bat guano and sulfur)', 'Instantaneous', 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.', array['sorcerer','wizard'], false, false),
  ('spl-cure-wounds', 'Cure Wounds', 1, 'Evocation', '1 action', 'Touch', 'V, S', 'Instantaneous', 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.', array['bard','cleric','druid','paladin','ranger'], false, false),
  ('spl-magic-missile', 'Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.', array['sorcerer','wizard'], false, false),
  ('spl-shield', 'Shield', 1, 'Abjuration', '1 reaction', 'Self', 'V, S', '1 round', 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.', array['sorcerer','wizard'], false, false),
  ('spl-healing-word', 'Healing Word', 1, 'Evocation', '1 bonus action', '60 feet', 'V', 'Instantaneous', 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.', array['bard','cleric','druid'], false, false),
  ('spl-prestidigitation', 'Prestidigitation', 0, 'Transmutation', '1 action', '10 feet', 'V, S', 'Up to 1 hour', 'This spell is a minor magical trick that novice spellcasters use for practice.', array['bard','sorcerer','warlock','wizard'], false, false),
  ('spl-mage-hand', 'Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V, S', '1 minute', 'A spectral, floating hand appears at a point you choose within range.', array['bard','sorcerer','warlock','wizard'], false, false),
  ('spl-sacred-flame', 'Sacred Flame', 0, 'Evocation', '1 action', '60 feet', 'V, S', 'Instantaneous', 'Flame-like radiance descends on a creature that you can see within range.', array['cleric'], false, false),
  ('spl-eldritch-blast', 'Eldritch Blast', 0, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous', 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.', array['warlock'], false, false),
  ('spl-hex', 'Hex', 1, 'Enchantment', '1 bonus action', '90 feet', 'V, S, M (the petrified eye of a newt)', 'Concentration, up to 1 hour', 'You place a curse on a creature that you can see within range.', array['warlock'], false, true),
  ('spl-bless', 'Bless', 1, 'Enchantment', '1 action', '30 feet', 'V, S, M (a sprinkling of holy water)', 'Concentration, up to 1 minute', 'You bless up to three creatures of your choice within range.', array['cleric','paladin'], false, true),
  ('spl-detect-magic', 'Detect Magic', 1, 'Divination', '1 action', 'Self', 'V, S', 'Concentration, up to 10 minutes', 'For the duration, you sense the presence of magic within 30 feet of you.', array['bard','cleric','druid','paladin','ranger','sorcerer','wizard'], true, true);
