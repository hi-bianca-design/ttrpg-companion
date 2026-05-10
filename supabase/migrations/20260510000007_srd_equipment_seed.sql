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
