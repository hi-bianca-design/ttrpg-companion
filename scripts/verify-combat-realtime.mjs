// Manual leak check for combat Realtime (not part of `npm test`). Run against a real project
// with the owner's go-ahead; it creates and ends a session in the campaign you point it at.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
//   GM_EMAIL=... GM_PASSWORD=... PLAYER_EMAIL=... PLAYER_PASSWORD=... \
//   INVITED_EMAIL=... INVITED_PASSWORD=... CAMPAIGN_ID=... \
//   node scripts/verify-combat-realtime.mjs
//
// The accounts must belong to ONE campaign: the GM, an active player with a character, and an
// invited (not yet active) member. The player and the invited account subscribe WITHOUT filters
// (the worst case) to every combat table plus sessions while the GM runs a whole fight. The
// script fails (exit 1) if the invited account receives any event, if the player receives a
// combat_entries or combat_order event, if anything the player receives contains the hidden
// enemy's name or id or a hp/max_hp/temp_hp/ac/notes/hidden/group_id key, or if no combats
// UPDATE reaches the player (which would prove nothing about the signal path).
import { createClient } from '@supabase/supabase-js'

const env = (name) => {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing environment variable ${name}`)
    process.exit(2)
  }
  return v
}

const url = env('SUPABASE_URL')
const anonKey = env('SUPABASE_ANON_KEY')
const campaignId = env('CAMPAIGN_ID')
const HIDDEN_NAME = `Secretmark Ogre ${Date.now().toString(36)}`
const SECRET_KEYS = ['hp', 'max_hp', 'temp_hp', 'ac', 'notes', 'hidden', 'group_id']
const TABLES = ['combats', 'combat_order', 'combat_entries', 'sessions']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function signIn(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({
    email: env(`${prefix}_EMAIL`),
    password: env(`${prefix}_PASSWORD`),
  })
  if (error) throw new Error(`${prefix} sign-in failed: ${error.message}`)
  return client
}

async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args)
  if (error) throw new Error(`${fn} failed: ${error.message}`)
  return data
}

function listen(client, label, events) {
  const channel = client.channel(`leakcheck-${label}-${Math.random().toString(36).slice(2)}`)
  for (const table of TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      events.push({ table, eventType: payload.eventType, payload })
    })
  }
  return new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') resolve(channel)
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(err ?? new Error(`${label}: ${status}`))
    })
  })
}

const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  (${detail})`}`)
}

const gm = await signIn('GM')
const player = await signIn('PLAYER')
const invited = await signIn('INVITED')

const playerEvents = []
const invitedEvents = []
const playerChannel = await listen(player, 'player', playerEvents)
const invitedChannel = await listen(invited, 'invited', invitedEvents)

let hiddenId = null
let session = null
try {
  // The scenario: open, enter combat, add a visible and a hidden enemy, start, damage, reveal,
  // next turn, end.
  session = await rpc(gm, 'open_session', { p_campaign_id: campaignId })
  await rpc(gm, 'set_combat', { p_session_id: session.id, p_in_combat: true })
  const { data: combat } = await gm.from('combats').select('*').eq('campaign_id', campaignId).neq('status', 'ended').single()
  const [visibleId] = await rpc(gm, 'add_enemies', {
    p_combat_id: combat.id, p_name: 'Visible Goblin', p_count: 1, p_max_hp: 7, p_initiative: 12,
    p_ac: 13, p_notes: 'visible note', p_hidden: false,
  })
  ;[hiddenId] = await rpc(gm, 'add_enemies', {
    p_combat_id: combat.id, p_name: HIDDEN_NAME, p_count: 1, p_max_hp: 59, p_initiative: 15,
    p_ac: 17, p_notes: 'has the key', p_hidden: true,
  })
  await rpc(gm, 'start_combat', { p_combat_id: combat.id })
  await rpc(gm, 'apply_enemy_hp', { p_combat_id: combat.id, p_entry_ids: [visibleId, hiddenId], p_mode: 'damage', p_amount: 3 })
  await rpc(gm, 'update_enemy', { p_entry_id: hiddenId, p_patch: { hidden: false } })
  const { data: current } = await gm.from('combat_entries').select('id').eq('combat_id', combat.id).eq('is_current', true).single()
  await rpc(gm, 'next_turn', { p_combat_id: combat.id, p_expected_entry_id: current.id })
  await sleep(3000) // let Realtime settle
} finally {
  if (session) await gm.rpc('end_session', { p_session_id: session.id })
  await sleep(1500)
  await playerChannel.unsubscribe()
  await invitedChannel.unsubscribe()
}

const text = JSON.stringify(playerEvents.map((e) => e.payload))
const hasKey = (k) => playerEvents.some((e) => [e.payload.new, e.payload.old].some((row) => row && Object.hasOwn(row, k)))

check('invited account received no events at all', invitedEvents.length === 0, `${invitedEvents.length} events`)
check('player received no combat_entries events', !playerEvents.some((e) => e.table === 'combat_entries'))
check('player received no combat_order events', !playerEvents.some((e) => e.table === 'combat_order'))
check('no event the player received contains the hidden name', !text.includes(HIDDEN_NAME))
check('no event the player received contains the hidden id', !hiddenId || !text.includes(hiddenId))
for (const key of SECRET_KEYS) {
  check(`no event the player received has a "${key}" key`, !hasKey(key))
}
check('a combats UPDATE reached the player (the signal path works)', playerEvents.some((e) => e.table === 'combats' && e.eventType === 'UPDATE'), `${playerEvents.length} events`)

process.exit(results.every(Boolean) ? 0 : 1)
