// Runs the real content API against the LOCAL Supabase stack (never a remote project).
// Opt-in: skipped unless both are set, e.g.
//   eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"
//   LOCAL_SUPABASE_URL=$API_URL LOCAL_SUPABASE_ANON_KEY=$ANON_KEY npx jest __tests__/integration
// Covers final review I1 (pickers offer only content the user may put on a sheet), I2
// (deleting homebrew that a character uses is refused as `in_use`) and M3 (a taken username
// fails sign-up as `username_taken`).
import type { supabase as appClient } from '@/lib/supabase'

const url = process.env.LOCAL_SUPABASE_URL ?? ''
const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY ?? ''
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)
const run = isLocal && anonKey ? describe : describe.skip

jest.mock('@/lib/supabase', () => {
  const { createClient: create } = jest.requireActual('@supabase/supabase-js')
  return { supabase: create(process.env.LOCAL_SUPABASE_URL ?? 'http://127.0.0.1:1', process.env.LOCAL_SUPABASE_ANON_KEY ?? 'x', { auth: { persistSession: false } }) }
})

jest.setTimeout(30_000)

run('content pickers against the local stack', () => {
  // Imported lazily so the mocked client above is used.
  const api = () => require('@/features/content/content.api') as typeof import('@/features/content/content.api')
  const campaigns = () => require('@/features/campaigns/campaigns.api') as typeof import('@/features/campaigns/campaigns.api')
  const { supabase } = require('@/lib/supabase') as { supabase: typeof appClient }

  const stamp = `${Date.now()}`
  const password = 'local-test-pass-123'
  const gm = { email: `pick-gm-${stamp}@example.com`, username: `pickgm${stamp}` }
  const player = { email: `pick-pl-${stamp}@example.com`, username: `pickpl${stamp}` }
  const spellData = {
    level: 1, school: 'Evocation', casting_time: 'Action', range: '60 feet', components: 'V, S',
    duration: 'Instantaneous', classes: ['wizard'], is_ritual: false, requires_concentration: false,
  }
  let playerSpellId = ''
  let gmSpellId = ''

  const signIn = async (who: { email: string }) => {
    await supabase.auth.signOut()
    const { error } = await supabase.auth.signInWithPassword({ email: who.email, password })
    if (error) throw error
  }

  beforeAll(async () => {
    for (const who of [gm, player]) {
      const { error } = await supabase.auth.signUp({ email: who.email, password, options: { data: { username: who.username } } })
      if (error) throw error
    }

    // GM: a campaign, plus their own homebrew spell.
    await signIn(gm)
    const campaignId = await campaigns().createCampaign({ name: `Pick ${stamp}`, systemId: 'dnd5e-2024' })
    const { data: camp } = await supabase.from('campaigns').select('invite_code').eq('id', campaignId).single()
    gmSpellId = (await api().saveHomebrew({ systemId: 'dnd5e-2024', kind: 'spell', name: `GM Bolt ${stamp}`, data: spellData })).id

    // Player: private homebrew spell on their character's sheet, character joins the campaign.
    await signIn(player)
    playerSpellId = (await api().saveHomebrew({ systemId: 'dnd5e-2024', kind: 'spell', name: `Player Bolt ${stamp}`, data: spellData })).id
    const { data: me } = await supabase.auth.getUser()
    const { data: ch, error: chErr } = await supabase.from('characters')
      .insert({ owner_id: me.user!.id, system_id: 'dnd5e-2024', name: 'Sheet Owner' }).select('id').single()
    if (chErr) throw chErr
    const { error: pickErr } = await supabase.from('character_picks')
      .insert({ character_id: ch!.id, content_id: playerSpellId, kind: 'spell' })
    if (pickErr) throw pickErr
    await campaigns().joinCampaign(camp!.invite_code, ch!.id)
  })

  afterAll(() => supabase.auth.signOut())

  test("a fellow member can read the player's sheet homebrew, but the picker does not list it", async () => {
    await signIn(gm)
    const { data: visible } = await supabase.from('content').select('id').eq('id', playerSpellId)
    expect(visible).toHaveLength(1) // RLS: resolvable on the player's sheet

    const pickable = await api().listContent({ systemId: 'dnd5e-2024', kind: 'spell', scope: 'pickable' })
    const ids = pickable.map((r) => r.id)
    expect(ids).not.toContain(playerSpellId)
    expect(ids).toContain(gmSpellId) // my own homebrew
    expect(pickable.some((r) => r.owner_id === null)).toBe(true) // official spells
  })

  test('deleting homebrew a character uses is refused as in_use, and the pick survives', async () => {
    await signIn(player)
    await expect(api().deleteHomebrew(playerSpellId)).rejects.toMatchObject({ code: 'in_use' })
    const { data } = await supabase.from('character_picks').select('content_id').eq('content_id', playerSpellId)
    expect(data).toHaveLength(1)
  })

  test('signing up with a taken username fails as username_taken (no silent rename)', async () => {
    const { signUp } = require('@/features/auth/auth.api') as typeof import('@/features/auth/auth.api')
    await expect(signUp(`pick-dup-${stamp}@example.com`, password, gm.username))
      .rejects.toMatchObject({ code: 'username_taken', message: 'That username is taken.' })
  })
})
