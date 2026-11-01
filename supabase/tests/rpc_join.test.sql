-- RPCs: create_campaign and join_campaign.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a3000000-0000-0000-0000-00000000000a', 'gm@test.local', '{"username":"rpc_gm"}'),
  ('b3000000-0000-0000-0000-00000000000b', 'p@test.local', '{"username":"rpc_player"}'),
  ('c3000000-0000-0000-0000-00000000000c', 'q@test.local', '{"username":"rpc_other"}');

insert into public.characters (id, owner_id, system_id, name) values
  ('f3000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'P Hero'),
  ('f3000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'Q Hero');

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('d3000000-0000-0000-0000-00000000000d', 'dnd5e-2024', 'a3000000-0000-0000-0000-00000000000a', 'D&D Game', 'DNDAAA'),
  ('d3000000-0000-0000-0000-0000000000dd', 'daggerheart', 'a3000000-0000-0000-0000-00000000000a', 'DH Game', 'DHGAAA');
insert into public.campaign_members (campaign_id, user_id, role, status) values
  ('d3000000-0000-0000-0000-00000000000d', 'a3000000-0000-0000-0000-00000000000a', 'gm', 'active'),
  ('d3000000-0000-0000-0000-0000000000dd', 'a3000000-0000-0000-0000-00000000000a', 'gm', 'active');

-- create_campaign as the GM
set local role authenticated;
set local request.jwt.claims to '{"sub":"a3000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select gm_id from public.create_campaign('Fresh Game', 'dnd5e-2024', 'desc')),
  'a3000000-0000-0000-0000-00000000000a'::uuid, 'create_campaign returns the campaign with caller as GM');
select is(
  (select m.role || '/' || m.status from public.campaign_members m
     join public.campaigns c on c.id = m.campaign_id
    where c.name = 'Fresh Game' and m.user_id = 'a3000000-0000-0000-0000-00000000000a'),
  'gm/active', 'create_campaign adds the GM membership row');
select matches((select invite_code from public.campaigns where name = 'Fresh Game'), '^[A-Z0-9]{6}$',
  'invite code is 6 uppercase alphanumerics');

-- join_campaign as P
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is(public.join_campaign('DNDAAA', 'f3000000-0000-0000-0000-000000000001'),
  'd3000000-0000-0000-0000-00000000000d'::uuid, 'valid join returns the campaign id');
select is(
  (select role || '/' || status || '/' || character_id::text from public.campaign_members
    where campaign_id = 'd3000000-0000-0000-0000-00000000000d' and user_id = 'b3000000-0000-0000-0000-00000000000b'),
  'player/active/f3000000-0000-0000-0000-000000000001', 'join creates an active player membership');
select is((select count(*)::int from public.campaigns where id = 'd3000000-0000-0000-0000-00000000000d'), 1,
  'joined player can read the campaign');
select throws_ok($$select public.join_campaign('NOPE00X', 'f3000000-0000-0000-0000-000000000001')$$,
  'P0001', 'invalid_code', 'bad code raises invalid_code');
select throws_ok($$select public.join_campaign('DNDAAA', 'f3000000-0000-0000-0000-000000000001')$$,
  'P0001', 'already_member', 'second join raises already_member');
select throws_ok($$select public.join_campaign('DHGAAA', 'f3000000-0000-0000-0000-000000000001')$$,
  'P0001', 'system_mismatch', 'D&D character joining a Daggerheart campaign raises system_mismatch');

-- join_campaign as Q with P's character
set local request.jwt.claims to '{"sub":"c3000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.join_campaign('DNDAAA', 'f3000000-0000-0000-0000-000000000001')$$,
  'P0001', 'not_your_character', 'joining with someone else''s character raises not_your_character');

-- anon cannot call the RPCs. Asserted via privileges: on the local Postgres 17.6 image an
-- actual permission-denied function call segfaults the backend (unrelated to this schema).
reset role;
select ok(not has_function_privilege('anon', 'public.join_campaign(text, uuid)', 'execute'),
  'anon cannot execute join_campaign');
select ok(not has_function_privilege('anon', 'public.create_campaign(text, text, text)', 'execute'),
  'anon cannot execute create_campaign');

select * from finish();
rollback;
