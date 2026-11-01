-- RLS on campaigns and campaign_members.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(11);

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

select * from finish();
rollback;
