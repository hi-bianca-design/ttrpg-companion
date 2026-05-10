-- supabase/migrations/20260510000006_srd_feats_seed.sql
BEGIN;

-- ── ORIGIN FEATS (no prerequisites) ────────────────────────
INSERT INTO public.feats (name, prerequisites, benefits, ability_score_bonuses) VALUES

('Alert',
 '{}'::jsonb,
 'Initiative Proficiency: When you roll Initiative, add your Proficiency Bonus to the roll. Initiative Swap: Immediately after rolling Initiative, you can swap your Initiative with one willing ally in the same combat (neither can have Incapacitated).',
 '{}'::jsonb),

('Magic Initiate',
 '{}'::jsonb,
 'Choose Cleric, Druid, or Wizard list when taken. Repeatable once per list. Two Cantrips: Learn 2 cantrips from the chosen spell list. Level 1 Spell: Learn 1 level-1 spell from the same list; always prepared, cast once without a slot per Long Rest, or with spell slots. Spell Change: Replace one chosen spell on each level-up.',
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
 '{"level": 4}'::jsonb,
 'Prerequisite: Strength or Dexterity 13+. Ability Score Increase: +1 to Strength or Dexterity (max 20). Punch and Grab: When you hit with an Unarmed Strike as part of the Attack action, you can use both the Damage and Grapple option (once per turn). Attack Advantage: You have Advantage on attack rolls against a creature you have Grappled. Fast Wrestler: No extra movement to move a Grappled creature of your size or smaller.',
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
 '{"level": 19}'::jsonb,
 'Prerequisite: Spellcasting class feature. Ability Score Increase: +1 to Intelligence, Wisdom, or Charisma (max 30). Free Casting: When you cast a spell with a level 1–4 slot, roll 1d4. If the result equals the slot level, the slot is not expended.',
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
