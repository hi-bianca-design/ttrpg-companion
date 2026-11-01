-- RLS on characters, character_picks and character_items.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-00000000000a', 'owner@test.local', '{"username":"chars_owner"}'),
  ('b1000000-0000-0000-0000-00000000000b', 'gm@test.local', '{"username":"chars_gm"}'),
  ('c1000000-0000-0000-0000-00000000000c', 'stranger@test.local', '{"username":"chars_stranger"}'),
  ('a1000000-0000-0000-0000-0000000000a1', 'invited@test.local', '{"username":"chars_invited"}');

insert into public.content (id, system_id, kind, name, slug, data) values
  ('e1000000-0000-0000-0000-000000000001', 'dnd5e-2024', 'feat', 'Test Feat', 'pgtap-feat', '{}'),
  ('e1000000-0000-0000-0000-000000000002', 'dnd5e-2024', 'item', 'Test Rope', 'pgtap-rope', '{}');
-- the owner's homebrew: one on the sheet, one not
insert into public.content (id, system_id, kind, name, slug, data, owner_id) values
  ('e1000000-0000-0000-0000-000000000003', 'dnd5e-2024', 'spell', 'Picked Homebrew', 'pgtap-picked-hb', '{}', 'a1000000-0000-0000-0000-00000000000a'),
  ('e1000000-0000-0000-0000-000000000004', 'dnd5e-2024', 'spell', 'Private Homebrew', 'pgtap-private-hb', '{}', 'a1000000-0000-0000-0000-00000000000a');

insert into public.characters (id, owner_id, system_id, name) values
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-00000000000a', 'dnd5e-2024', 'Hero');

insert into public.character_picks (character_id, content_id, kind) values
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'feat'),
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003', 'spell');
insert into public.character_items (character_id, content_id, quantity) values
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 1);

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('d1000000-0000-0000-0000-00000000000d', 'dnd5e-2024', 'b1000000-0000-0000-0000-00000000000b', 'Chars Campaign', 'CHRAAA');
insert into public.campaign_members (campaign_id, user_id, role, status, character_id) values
  ('d1000000-0000-0000-0000-00000000000d', 'b1000000-0000-0000-0000-00000000000b', 'gm', 'active', null),
  ('d1000000-0000-0000-0000-00000000000d', 'a1000000-0000-0000-0000-00000000000a', 'player', 'active', 'f1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-00000000000d', 'a1000000-0000-0000-0000-0000000000a1', 'player', 'invited', null);

-- As the owner
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$insert into public.characters (id, owner_id, system_id, name)
    values ('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-00000000000a', 'dnd5e-2024', 'Sidekick')$$,
  'owner can create a character');
select is((select count(*)::int from public.characters), 2, 'owner reads own characters');
update public.characters set name = 'Hero Renamed' where id = 'f1000000-0000-0000-0000-000000000001';
select is((select name from public.characters where id = 'f1000000-0000-0000-0000-000000000001'), 'Hero Renamed',
  'owner can update own character');
select lives_ok(
  $$insert into public.character_items (character_id, content_id) values
    ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002')$$,
  'owner can add items to own character');
select lives_ok(
  $$insert into public.character_picks (character_id, content_id, kind) values
    ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'feat')$$,
  'owner can add picks to own character');
delete from public.characters where id = 'f1000000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.characters), 1, 'owner can delete own character');

-- As a stranger
set local request.jwt.claims to '{"sub":"c1000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*)::int from public.characters), 0, 'stranger sees no characters');
select is((select count(*)::int from public.character_picks), 0, 'stranger sees no picks');
select is((select count(*)::int from public.character_items), 0, 'stranger sees no items');
select is((select count(*)::int from public.content where id = 'e1000000-0000-0000-0000-000000000003'), 0,
  'stranger cannot read homebrew on someone else''s sheet');

-- As an invited (not yet accepted) member of the campaign
set local request.jwt.claims to '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.characters where id = 'f1000000-0000-0000-0000-000000000001'), 0,
  'invited member cannot read other members'' characters before accepting');
select throws_ok(
  $$insert into public.character_items (character_id, content_id) values
    ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'stranger cannot add items to someone else''s character');

-- As the GM of a campaign the character is in
set local request.jwt.claims to '{"sub":"b1000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*)::int from public.characters where id = 'f1000000-0000-0000-0000-000000000001'), 1,
  'GM reads a character in their campaign');
select is((select count(*)::int from public.character_picks where character_id = 'f1000000-0000-0000-0000-000000000001'), 2,
  'GM reads that character''s picks');
select is((select count(*)::int from public.content where id = 'e1000000-0000-0000-0000-000000000003'), 1,
  'GM reads homebrew content that is on the player''s sheet');
select is((select count(*)::int from public.content where id = 'e1000000-0000-0000-0000-000000000004'), 0,
  'GM cannot read the player''s other homebrew');
select is((select count(*)::int from public.character_items where character_id = 'f1000000-0000-0000-0000-000000000001'), 1,
  'GM reads that character''s items');
update public.characters set name = 'GM Was Here' where id = 'f1000000-0000-0000-0000-000000000001';
update public.character_items set quantity = 99 where character_id = 'f1000000-0000-0000-0000-000000000001';
select throws_ok(
  $$insert into public.character_picks (character_id, content_id, kind) values
    ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 'item')$$,
  '42501', null, 'GM cannot add picks to a player''s character');

reset role;
select is((select name from public.characters where id = 'f1000000-0000-0000-0000-000000000001'), 'Hero Renamed',
  'GM cannot update the character');
select is((select quantity from public.character_items where character_id = 'f1000000-0000-0000-0000-000000000001'), 1,
  'GM cannot update the character''s items');

select * from finish();
rollback;
