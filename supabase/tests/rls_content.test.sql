-- RLS on content: official vs homebrew vs campaign-scoped rows.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'gm@test.local', '{"username":"content_gm"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'player@test.local', '{"username":"content_player"}'),
  ('c0000000-0000-0000-0000-00000000000c', 'stranger@test.local', '{"username":"content_stranger"}');

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('d0000000-0000-0000-0000-00000000000d', 'dnd5e-2024', 'a0000000-0000-0000-0000-00000000000a', 'Content Campaign', 'CNTAAA');

insert into public.campaign_members (campaign_id, user_id, role, status) values
  ('d0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-00000000000a', 'gm', 'active'),
  ('d0000000-0000-0000-0000-00000000000d', 'b0000000-0000-0000-0000-00000000000b', 'player', 'active');

insert into public.content (id, system_id, kind, name, slug, data, owner_id, campaign_id) values
  ('e0000000-0000-0000-0000-000000000001', 'dnd5e-2024', 'item', 'Official Thing', 'pgtap-official', '{}', null, null),
  ('e0000000-0000-0000-0000-000000000002', 'dnd5e-2024', 'item', 'A Homebrew', 'pgtap-homebrew', '{}', 'a0000000-0000-0000-0000-00000000000a', null),
  ('e0000000-0000-0000-0000-000000000003', 'dnd5e-2024', 'item', 'Campaign Thing', 'pgtap-campaign', '{}', 'a0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000000d');

-- As B (campaign player)
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*)::int from public.content where id = 'e0000000-0000-0000-0000-000000000001'), 1,
  'official row is visible to an authenticated user');
select is((select count(*)::int from public.content where id = 'e0000000-0000-0000-0000-000000000002'), 0,
  'A''s homebrew is invisible to B');
select is((select count(*)::int from public.content where id = 'e0000000-0000-0000-0000-000000000003'), 1,
  'campaign item is visible to a campaign member');

update public.content set name = 'Hacked' where id = 'e0000000-0000-0000-0000-000000000002';

select throws_ok(
  $$insert into public.content (system_id, kind, name, slug, data, owner_id, campaign_id)
    values ('dnd5e-2024', 'item', 'Player Item', 'pgtap-player-item', '{}', 'b0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-00000000000d')$$,
  '42501', null, 'player cannot insert a campaign item');

select lives_ok(
  $$insert into public.content (system_id, kind, name, slug, data, owner_id)
    values ('dnd5e-2024', 'item', 'B Homebrew', 'pgtap-b-homebrew', '{}', 'b0000000-0000-0000-0000-00000000000b')$$,
  'user can insert own homebrew');

-- As C (stranger)
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*)::int from public.content where id = 'e0000000-0000-0000-0000-000000000003'), 0,
  'campaign item is invisible to a non-member');

-- As A (GM)
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$insert into public.content (system_id, kind, name, slug, data, owner_id, campaign_id)
    values ('dnd5e-2024', 'item', 'GM Item', 'pgtap-gm-item', '{}', 'a0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000000d')$$,
  'GM can insert a campaign item');

-- RLS turns writes to rows outside the policy into silent no-ops; verified below.
update public.content set name = 'Rewritten' where id = 'e0000000-0000-0000-0000-000000000001';

reset role;
select is((select name from public.content where id = 'e0000000-0000-0000-0000-000000000002'), 'A Homebrew',
  'B cannot update A''s homebrew');
select is((select name from public.content where id = 'e0000000-0000-0000-0000-000000000001'), 'Official Thing',
  'official row unchanged');

select * from finish();
rollback;
