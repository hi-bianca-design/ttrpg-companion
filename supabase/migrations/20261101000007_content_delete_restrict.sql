-- Content still on a character can't be deleted (final review I2). The original FKs cascaded,
-- so deleting a homebrew class or item silently stripped it from every sheet that used it.
-- Now the delete fails with 23503, which the app maps to the `in_use` error.

alter table public.character_picks
  drop constraint character_picks_content_id_fkey,
  add constraint character_picks_content_id_fkey
    foreign key (content_id) references public.content (id) on delete restrict;

alter table public.character_items
  drop constraint character_items_content_id_fkey,
  add constraint character_items_content_id_fkey
    foreign key (content_id) references public.content (id) on delete restrict;

-- Deleting an account cascades from profiles to both content (owner_id) and characters
-- (owner_id). The content cascade runs first, so the restrict above would refuse it while
-- that user's characters still use their own homebrew. Remove the characters (and with them
-- their picks and items) before the profile goes, so account deletion keeps working.
-- (Content that *other* users' characters hold, e.g. a GM's campaign items, still blocks it.)
create or replace function public.delete_profile_characters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.characters where owner_id = old.id;
  return old;
end;
$$;

revoke execute on function public.delete_profile_characters() from public, anon, authenticated;

create trigger profiles_delete_characters
  before delete on public.profiles
  for each row execute function public.delete_profile_characters();
