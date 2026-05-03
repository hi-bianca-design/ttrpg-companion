ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS custom_species_id uuid REFERENCES public.user_content ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_background_id uuid REFERENCES public.user_content ON DELETE SET NULL;
