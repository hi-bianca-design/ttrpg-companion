-- handle_new_user: a taken username fails sign-up with a distinct error the client maps to
-- "That username is taken."; no username still gets a generated one.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a2000000-0000-0000-0000-00000000000a', 'first@test.local', '{"username":"pgtap_taken"}');

select is((select username from public.profiles where id = 'a2000000-0000-0000-0000-00000000000a'), 'pgtap_taken',
  'a free username is used as given');

select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data)
    values ('b2000000-0000-0000-0000-00000000000b', 'second@test.local', '{"username":"pgtap_taken"}')$$,
  'P0001', 'username_taken', 'a taken username raises username_taken');

select is((select count(*)::int from auth.users where id = 'b2000000-0000-0000-0000-00000000000b'), 0,
  'the auth user is not created');

insert into auth.users (id, email, raw_user_meta_data) values
  ('c2000000-0000-0000-0000-00000000000c', 'nameless@test.local', '{}');
select matches((select username from public.profiles where id = 'c2000000-0000-0000-0000-00000000000c'), '^nameless[0-9]{4}$',
  'no username falls back to email local-part + 4 digits');

set local role anon;
select is(public.username_available('pgtap_taken'), false, 'anon sees a taken username as unavailable');
select is(public.username_available('  pgtap_taken '), false, 'surrounding spaces are ignored, as in the trigger');
select is(public.username_available('pgtap_free_name'), true, 'a free username is available');
reset role;

select * from finish();
rollback;
