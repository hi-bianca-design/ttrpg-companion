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
  item_type text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('Common','Uncommon','Rare','Very Rare','Legendary','Artifact','Varies')),
  requires_attunement boolean NOT NULL DEFAULT false,
  attunement_condition text,
  description text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'
);

-- Index for rarity filtering
CREATE INDEX ON public.magic_items (rarity);

COMMIT;
