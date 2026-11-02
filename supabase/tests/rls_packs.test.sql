-- RLS on packs, pack_entitlements and pack-gated content (owns_pack / own_sheet_content_ids).
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Fixtures (as the superuser; RLS bypassed)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a2000000-0000-0000-0000-00000000000a', 'owner@test.local', '{"username":"packs_owner"}'),
  ('b2000000-0000-0000-0000-00000000000b', 'lapsed@test.local', '{"username":"packs_lapsed"}'),
  ('c2000000-0000-0000-0000-00000000000c', 'stranger@test.local', '{"username":"packs_stranger"}'),
  ('d2000000-0000-0000-0000-00000000000d', 'gm@test.local', '{"username":"packs_gm"}'),
  ('e2000000-0000-0000-0000-00000000000e', 'member@test.local', '{"username":"packs_member"}');

insert into public.packs (id, slug, name, kind, published) values
  ('f2000000-0000-0000-0000-00000000000a', 'pgtap-pack-a', 'Pack A', 'content', true),
  ('f2000000-0000-0000-0000-00000000000b', 'pgtap-pack-b', 'Pack B', 'content', false);

insert into public.content (id, system_id, kind, name, slug, data, pack_id) values
  ('a3000000-0000-0000-0000-000000000001', 'dnd5e-2024', 'item', 'Plain Official', 'pgtap-packs-plain', '{}', null),
  ('a3000000-0000-0000-0000-000000000002', 'dnd5e-2024', 'item', 'Pack Item On Sheets', 'pgtap-packs-on-sheets', '{}', 'f2000000-0000-0000-0000-00000000000a'),
  ('a3000000-0000-0000-0000-000000000003', 'dnd5e-2024', 'item', 'Pack Item Unreferenced', 'pgtap-packs-unreferenced', '{}', 'f2000000-0000-0000-0000-00000000000a');

-- owner: active (permanent) entitlement; lapsed: expired yesterday
insert into public.pack_entitlements (user_id, pack_id, source, expires_at) values
  ('a2000000-0000-0000-0000-00000000000a', 'f2000000-0000-0000-0000-00000000000a', 'grant', null),
  ('b2000000-0000-0000-0000-00000000000b', 'f2000000-0000-0000-0000-00000000000a', 'subscription', now() - interval '1 day');

insert into public.characters (id, owner_id, system_id, name) values
  ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-00000000000a', 'dnd5e-2024', 'Owner Hero'),
  ('b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-00000000000b', 'dnd5e-2024', 'Lapsed Hero');
insert into public.character_items (character_id, content_id, quantity) values
  ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 1),
  ('b4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 1);

insert into public.campaigns (id, system_id, gm_id, name, invite_code) values
  ('c3000000-0000-0000-0000-00000000000c', 'dnd5e-2024', 'd2000000-0000-0000-0000-00000000000d', 'Packs Campaign', 'PCKAAA');
insert into public.campaign_members (campaign_id, user_id, role, status, character_id) values
  ('c3000000-0000-0000-0000-00000000000c', 'd2000000-0000-0000-0000-00000000000d', 'gm', 'active', null),
  ('c3000000-0000-0000-0000-00000000000c', 'a2000000-0000-0000-0000-00000000000a', 'player', 'active', 'a4000000-0000-0000-0000-000000000001'),
  ('c3000000-0000-0000-0000-00000000000c', 'e2000000-0000-0000-0000-00000000000e', 'player', 'active', null);

-- Constraints (superuser)
select throws_ok(
  $$insert into public.content (system_id, kind, name, slug, data, owner_id, pack_id)
    values ('dnd5e-2024', 'item', 'Owned Pack Item', 'pgtap-packs-owned', '{}',
            'a2000000-0000-0000-0000-00000000000a', 'f2000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'pack content must be official (no owner)');
select throws_ok(
  $$delete from public.packs where id = 'f2000000-0000-0000-0000-00000000000a'$$,
  '23503', null, 'a pack that still has content cannot be deleted');

-- As stranger (no entitlements)
set local role authenticated;
set local request.jwt.claims to '{"sub":"c2000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*)::int from public.content where id = 'a3000000-0000-0000-0000-000000000001'), 1,
  'plain official content stays visible to everyone');
select is((select count(*)::int from public.content where id = 'a3000000-0000-0000-0000-000000000002'), 0,
  'pack content is hidden without an entitlement');
select is((select count(*)::int from public.packs where id = 'f2000000-0000-0000-0000-00000000000a'), 1,
  'published pack is in the catalog');
select is((select count(*)::int from public.packs where id = 'f2000000-0000-0000-0000-00000000000b'), 0,
  'unpublished pack is not in the catalog');
select is((select count(*)::int from public.pack_entitlements), 0,
  'a user cannot see other users'' entitlements');
select throws_ok(
  $$insert into public.pack_entitlements (user_id, pack_id, source)
    values ('c2000000-0000-0000-0000-00000000000c', 'f2000000-0000-0000-0000-00000000000a', 'grant')$$,
  '42501', null, 'a user cannot grant themselves a pack');
update public.pack_entitlements set expires_at = null;
delete from public.pack_entitlements;

-- As owner (active entitlement)
set local request.jwt.claims to '{"sub":"a2000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*)::int from public.content where id = 'a3000000-0000-0000-0000-000000000003'), 1,
  'entitled user sees unreferenced pack content');
select is((select count(*)::int from public.pack_entitlements), 1,
  'a user sees exactly their own entitlement');
select lives_ok(
  $$insert into public.character_items (character_id, content_id, quantity)
    values ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 1)$$,
  'entitled user can put pack content on their sheet');

-- As lapsed (expired entitlement)
set local request.jwt.claims to '{"sub":"b2000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*)::int from public.content where id = 'a3000000-0000-0000-0000-000000000003'), 0,
  'an expired entitlement no longer unlocks unreferenced pack content');
select is((select count(*)::int from public.content where id = 'a3000000-0000-0000-0000-000000000002'), 1,
  'pack content already on the user''s own sheet stays readable after the entitlement lapses');
select throws_ok(
  $$insert into public.character_items (character_id, content_id, quantity)
    values ('b4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 1)$$,
  '42501', null, 'an expired entitlement cannot add new pack content to a sheet');

-- As member (campaign player, no entitlement)
set local request.jwt.claims to '{"sub":"e2000000-0000-0000-0000-00000000000e","role":"authenticated"}';

select is((select count(*)::int from public.content where id = 'a3000000-0000-0000-0000-000000000002'), 1,
  'a campaign member sees pack content on a visible campaign character without owning the pack');

-- Entitlement writes by clients changed nothing
reset role;
select is((select count(*)::int from public.pack_entitlements), 2,
  'client update and delete attempts left both entitlements in place');

select * from finish();
rollback;
