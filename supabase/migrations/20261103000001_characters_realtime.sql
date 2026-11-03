-- Party members see each other's hit points and conditions live. Realtime delivers a
-- postgres_changes event to a subscriber only if their select policy (characters_select: the
-- owner, or a member of the same campaign) lets them read the row, so publishing the table
-- exposes nothing beyond what those members can already query.
alter publication supabase_realtime add table public.characters;
