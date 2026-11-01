-- RLS on campaigns and campaign_members.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a2000000-0000-0000-0000-00000000000a', 'gm@test.local', '{"username":"camp_gm"}'),
  ('b2000000-0000-0000-0000-00000000000b', 'p1@test.local', '{"username":"camp_p1"}'),
  ('b2000000-0000-0000-0000-0000000000b2', 'p2@test.local', '{"username":"camp_p2"}'),
  ('c2000000-0000-0000-0000-00000000000c', 'stranger@test.local', '{"username":"camp_stranger"}');

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('d2000000-0000-0000-0000-00000000000d', 'dnd5e-2024', 'a2000000-0000-0000-0000-00000000000a', 'The Campaign', 'CMPAAA');
insert into public.campaign_members (campaign_id, user_id, role, status) values
  ('d2000000-0000-0000-0000-00000000000d', 'a2000000-0000-0000-0000-00000000000a', 'gm', 'active'),
  ('d2000000-0000-0000-0000-00000000000d', 'b2000000-0000-0000-0000-00000000000b', 'player', 'active'),
  ('d2000000-0000-0000-0000-00000000000d', 'b2000000-0000-0000-0000-0000000000b2', 'player', 'invited');

-- As player 1
set local role authenticated;
set local request.jwt.claims to '{"sub":"b2000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*)::int from public.campaigns), 1, 'member reads the campaign');
select is((select count(*)::int from public.campaign_members), 3, 'member reads all members');
update public.campaigns set name = 'Player Renamed' where id = 'd2000000-0000-0000-0000-00000000000d';
update public.campaign_members set status = 'active'
  where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-0000000000b2';
select throws_ok(
  $$update public.campaign_members set role = 'gm'
    where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'player cannot promote themselves to GM');

-- As player 2 (invited) accepting their own invite
set local request.jwt.claims to '{"sub":"b2000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from public.campaigns), 1, 'invited player reads the campaign');
select is((select status from public.campaign_members
           where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-0000000000b2'),
  'invited', 'player cannot update another player''s membership row');
update public.campaign_members set status = 'active'
  where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-0000000000b2';

-- As a stranger
set local request.jwt.claims to '{"sub":"c2000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.campaigns), 0, 'non-member reads no campaigns');
select is((select count(*)::int from public.campaign_members), 0, 'non-member reads no members');

-- As the GM
set local request.jwt.claims to '{"sub":"a2000000-0000-0000-0000-00000000000a","role":"authenticated"}';
update public.campaigns set description = 'Edited by GM' where id = 'd2000000-0000-0000-0000-00000000000d';
select is((select description from public.campaigns where id = 'd2000000-0000-0000-0000-00000000000d'), 'Edited by GM',
  'GM can update the campaign');

reset role;
select is((select name from public.campaigns where id = 'd2000000-0000-0000-0000-00000000000d'), 'The Campaign',
  'player cannot update the campaign');
select is((select status from public.campaign_members
           where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-0000000000b2'),
  'active', 'player can update their own membership row');
select is((select role from public.campaign_members
           where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-00000000000b'),
  'player', 'player role unchanged');

-- Escalation paths the membership guard exists for -----------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('b2000000-0000-0000-0000-0000000000b3', 'p3@test.local', '{"username":"camp_p3"}'),
  ('e2000000-0000-0000-0000-00000000000e', 'attacker@test.local', '{"username":"camp_attacker"}');
insert into public.characters (id, owner_id, system_id, name) values
  ('f2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'P1 Hero'),
  ('f2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-00000000000b', 'daggerheart', 'P1 DH Hero'),
  ('f2000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-0000000000b3', 'dnd5e-2024', 'P3 Hero');
insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('d2000000-0000-0000-0000-0000000000ee', 'dnd5e-2024', 'e2000000-0000-0000-0000-00000000000e', 'Attacker Campaign', 'ATKAAA');
insert into public.campaign_members (campaign_id, user_id, role, status) values
  ('d2000000-0000-0000-0000-0000000000ee', 'e2000000-0000-0000-0000-00000000000e', 'gm', 'active');

-- Attacker (GM of their own campaign) tries to move their membership into the victim campaign
set local role authenticated;
set local request.jwt.claims to '{"sub":"e2000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select throws_ok(
  $$update public.campaign_members set campaign_id = 'd2000000-0000-0000-0000-00000000000d'
    where campaign_id = 'd2000000-0000-0000-0000-0000000000ee' and user_id = 'e2000000-0000-0000-0000-00000000000e'$$,
  '42501', null, 'GM cannot move a membership row to another campaign (filtered update)');
select throws_ok(
  $$update public.campaign_members set campaign_id = 'd2000000-0000-0000-0000-00000000000d'$$,
  '42501', null, 'GM cannot move a membership row to another campaign (unfiltered update)');
select throws_ok(
  $$update public.campaign_members set user_id = 'b2000000-0000-0000-0000-00000000000b'
    where campaign_id = 'd2000000-0000-0000-0000-0000000000ee'$$,
  '42501', null, 'GM cannot reassign a membership row to another user');

-- GM acting on other users' behalf
set local request.jwt.claims to '{"sub":"a2000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$insert into public.campaign_members (campaign_id, user_id, role, status, character_id) values
    ('d2000000-0000-0000-0000-00000000000d', 'b2000000-0000-0000-0000-0000000000b3', 'player', 'active',
     'f2000000-0000-0000-0000-000000000003')$$,
  'GM can invite another user');
select throws_ok(
  $$update public.campaign_members set status = 'active'
    where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-0000000000b3'$$,
  '42501', null, 'GM cannot accept an invite on a player''s behalf');
select throws_ok(
  $$update public.campaign_members set character_id = 'f2000000-0000-0000-0000-000000000001'
    where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'GM cannot attach a character on a player''s behalf');

-- Player attaching characters to their own row
set local request.jwt.claims to '{"sub":"b2000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok(
  $$update public.campaign_members set character_id = 'f2000000-0000-0000-0000-000000000003'
    where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-00000000000b'$$,
  'P0001', 'not_your_character', 'player cannot attach someone else''s character');
select throws_ok(
  $$update public.campaign_members set character_id = 'f2000000-0000-0000-0000-000000000002'
    where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-00000000000b'$$,
  'P0001', 'system_mismatch', 'player cannot attach a character from another system');
select lives_ok(
  $$update public.campaign_members set character_id = 'f2000000-0000-0000-0000-000000000001'
    where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-00000000000b'$$,
  'player can attach their own matching character');

reset role;
select is((select count(*)::int from public.campaign_members
           where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'e2000000-0000-0000-0000-00000000000e'),
  0, 'attacker did not end up in the victim campaign');
select is((select status || '/' || coalesce(character_id::text, 'none') from public.campaign_members
           where campaign_id = 'd2000000-0000-0000-0000-00000000000d' and user_id = 'b2000000-0000-0000-0000-0000000000b3'),
  'invited/none', 'a GM-created row for another user is forced to invited with no character');

select * from finish();
rollback;
