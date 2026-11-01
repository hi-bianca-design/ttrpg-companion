-- Sign-up with a username that is already taken now fails with a distinct error instead of
-- silently assigning `email-localpart + 4 digits` (final review M3). The client maps it to
-- "That username is taken." A sign-up without a username still gets the generated fallback.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_base text;
begin
  if v_username is not null
     and exists (select 1 from public.profiles p where p.username = v_username) then
    raise exception 'username_taken' using errcode = 'P0001';
  end if;

  if v_username is null then
    v_base := coalesce(nullif(lower(split_part(coalesce(new.email, ''), '@', 1)), ''), 'user');
    v_base := left(v_base, 59);
    loop
      v_username := v_base || lpad(floor(random() * 10000)::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles p where p.username = v_username);
    end loop;
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    v_username,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- GoTrue (as called by supabase-js) reports any trigger failure as the generic "Database error
-- saving new user", so the client can't tell `username_taken` apart from the response alone.
-- The sign-up form asks first; the trigger above stays as the guard against a race.
-- Usernames are already readable by every signed-in user (profiles_select); this answers only
-- yes/no for one exact name.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles p where p.username = trim(p_username));
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;
