-- Deleting content that a character still uses is refused (23503), instead of silently
-- stripping it from every sheet. Deleting the character, or the whole account, still works.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-00000000000a', 'brewer@test.local', '{"username":"restrict_brewer"}');

insert into public.content (id, system_id, kind, name, slug, data, owner_id) values
  ('e1000000-0000-0000-0000-000000000001', 'dnd5e-2024', 'class', 'Brew Class', 'pgtap-brew-class', '{}', 'a1000000-0000-0000-0000-00000000000a'),
  ('e1000000-0000-0000-0000-000000000002', 'dnd5e-2024', 'item', 'Brew Item', 'pgtap-brew-item', '{}', 'a1000000-0000-0000-0000-00000000000a'),
  ('e1000000-0000-0000-0000-000000000003', 'dnd5e-2024', 'item', 'Unused Brew', 'pgtap-brew-unused', '{}', 'a1000000-0000-0000-0000-00000000000a');

insert into public.characters (id, owner_id, system_id, name) values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-00000000000a', 'dnd5e-2024', 'Brew Hero');
insert into public.character_picks (character_id, content_id, kind) values
  ('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'class');
insert into public.character_items (character_id, content_id) values
  ('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select throws_ok(
  $$delete from public.content where id = 'e1000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'deleting homebrew picked by a character is refused');
select throws_ok(
  $$delete from public.content where id = 'e1000000-0000-0000-0000-000000000002'$$,
  '23503', null, 'deleting homebrew carried by a character is refused');
select is((select count(*)::int from public.character_picks where character_id = 'c1000000-0000-0000-0000-000000000001'), 1,
  'the pick is still on the sheet');
select lives_ok(
  $$delete from public.content where id = 'e1000000-0000-0000-0000-000000000003'$$,
  'unused homebrew can be deleted');

-- Remove it from the character first, then the delete goes through.
delete from public.character_items where character_id = 'c1000000-0000-0000-0000-000000000001';
select lives_ok(
  $$delete from public.content where id = 'e1000000-0000-0000-0000-000000000002'$$,
  'homebrew can be deleted once no character carries it');

-- Deleting the character still cascades its picks (the restrict is only on the content side).
select lives_ok(
  $$delete from public.characters where id = 'c1000000-0000-0000-0000-000000000001'$$,
  'deleting a character takes its picks with it');
select is((select count(*)::int from public.character_picks where content_id = 'e1000000-0000-0000-0000-000000000001'), 0,
  'no picks left for the class');

-- Account deletion cascades both the homebrew and the characters that use it.
reset role;
insert into public.characters (id, owner_id, system_id, name) values
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-00000000000a', 'dnd5e-2024', 'Brew Hero 2');
insert into public.character_picks (character_id, content_id, kind) values
  ('c1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'class');
select lives_ok(
  $$delete from auth.users where id = 'a1000000-0000-0000-0000-00000000000a'$$,
  'deleting an account whose characters use its own homebrew still works');

select ok(
  (select bool_and(confdeltype = 'r') and count(*) = 2 from pg_constraint
    where conname in ('character_picks_content_id_fkey', 'character_items_content_id_fkey')),
  'both content FKs are on delete restrict');

select * from finish();
rollback;
