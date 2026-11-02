// Dev-only: create a sample pack and grant packs to a user, with the service role.
// There is no purchase flow yet, so this is how you try the shop and pack gating locally.
//   npm run packs:dev -- create-sample
//   npm run packs:dev -- grant <username> <pack-slug> [--expires <ISO date>]
// Needs EXPO_PUBLIC_SUPABASE_URL (must be a local stack) and SUPABASE_SERVICE_ROLE_KEY (the local
// stack's service-role key, from `supabase status`; never an EXPO_PUBLIC_ var, never a hosted key).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../src/types/database.types'

type Db = SupabaseClient<Database>

export type Command =
  | { cmd: 'create-sample' }
  | { cmd: 'grant'; username: string; packSlug: string; expiresAt: string | null }

const USAGE = 'Usage: packs-dev create-sample | packs-dev grant <username> <pack-slug> [--expires <ISO date>]'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export const SAMPLE_PACK_SLUG = 'dev-sample'

const SAMPLE_ITEMS: { slug: string; name: string; description: string; data: Json }[] = [
  {
    slug: 'dev-sample-lantern',
    name: 'Ember Lantern',
    description: 'A sample pack item: a lantern that burns with a low red flame.',
    data: { category: 'Adventuring Gear', cost: '5 GP', weight: 2 },
  },
  {
    slug: 'dev-sample-dagger',
    name: 'Cinderglass Dagger',
    description: 'A sample pack item: a dagger of black glass, warm to the touch.',
    data: { category: 'Simple Melee Weapon', cost: '25 GP', weight: 1, properties: { damage: '1d4', damage_type: 'Piercing' } },
  },
]

/** Refuses anything but a local Supabase, so a grant can never reach a real project. */
export function assertLocalUrl(url: string | undefined): void {
  let host = ''
  try {
    host = new URL(url ?? '').hostname
  } catch {
    // falls through to the refusal below
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run: EXPO_PUBLIC_SUPABASE_URL must be a local stack (localhost, 127.0.0.1 or [::1]), got "${url ?? ''}"`)
  }
}

export function parseArgs(argv: string[]): Command {
  const [cmd, ...rest] = argv
  if (cmd === 'create-sample' && rest.length === 0) return { cmd }
  if (cmd === 'grant') {
    const [username, packSlug, ...flags] = rest
    if (!username || !packSlug) throw new Error(USAGE)
    if (flags.length === 0) return { cmd, username, packSlug, expiresAt: null }
    if (flags.length === 2 && flags[0] === '--expires') {
      const when = new Date(flags[1])
      if (Number.isNaN(when.getTime())) throw new Error(USAGE)
      return { cmd, username, packSlug, expiresAt: when.toISOString() }
    }
  }
  throw new Error(USAGE)
}

/** Idempotent: re-running updates the pack and adds only the item rows that are missing. */
export async function createSample(db: Db): Promise<void> {
  const pack = await db
    .from('packs')
    .upsert(
      {
        slug: SAMPLE_PACK_SLUG,
        name: 'Ember Court (sample)',
        description: 'A dev-only sample pack: two items that only entitled users can see.',
        kind: 'content',
        system_id: 'dnd5e-2024',
        artist_credit: 'Sample Artist',
        published: true,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (pack.error || !pack.data) throw new Error(`Could not upsert the sample pack: ${pack.error?.message ?? 'no row returned'}`)

  const existing = await db.from('content').select('slug').eq('pack_id', pack.data.id)
  if (existing.error) throw new Error(`Could not read sample content: ${existing.error.message}`)
  const have = new Set((existing.data ?? []).map((r) => r.slug))
  const missing = SAMPLE_ITEMS.filter((i) => !have.has(i.slug))
  if (missing.length === 0) return

  const inserted = await db.from('content').insert(
    missing.map((i) => ({ system_id: 'dnd5e-2024', kind: 'item', ...i, pack_id: pack.data.id })),
  )
  if (inserted.error) throw new Error(`Could not insert sample content: ${inserted.error.message}`)
}

export async function grantPack(db: Db, cmd: Extract<Command, { cmd: 'grant' }>): Promise<void> {
  const user = await db.from('profiles').select('id').eq('username', cmd.username).single()
  if (user.error || !user.data) throw new Error(`No user with username "${cmd.username}"`)
  const pack = await db.from('packs').select('id').eq('slug', cmd.packSlug).single()
  if (pack.error || !pack.data) throw new Error(`No pack with slug "${cmd.packSlug}"`)

  const res = await db
    .from('pack_entitlements')
    .upsert(
      { user_id: user.data.id, pack_id: pack.data.id, source: 'grant', expires_at: cmd.expiresAt },
      { onConflict: 'user_id,pack_id' },
    )
  if (res.error) throw new Error(`Could not grant the pack: ${res.error.message}`)
}

async function main() {
  const command = parseArgs(process.argv.slice(2))
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  assertLocalUrl(url)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (use the local stack key from `supabase status`)')
  const db = createClient<Database>(url!, key, { auth: { persistSession: false, autoRefreshToken: false } })

  if (command.cmd === 'create-sample') {
    await createSample(db)
    console.log(`Sample pack "${SAMPLE_PACK_SLUG}" is ready.`)
  } else {
    await grantPack(db, command)
    console.log(`Granted "${command.packSlug}" to ${command.username}${command.expiresAt ? ` until ${command.expiresAt}` : ''}.`)
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
