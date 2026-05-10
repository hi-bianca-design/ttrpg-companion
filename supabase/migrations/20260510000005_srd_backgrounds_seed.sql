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
