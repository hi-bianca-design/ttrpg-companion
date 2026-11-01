import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database.types'
import { getSystem } from '@/systems/registry'
import type { SystemId } from '@/systems/types'
import { AppError, check, unwrap } from '@/features/errors'
import { currentUserId } from '@/features/session'
import type { ContentScope } from '@/lib/query-client'

export type ContentRow = Database['public']['Tables']['content']['Row']

export type ListContentParams = { systemId: SystemId; kind: string; scope: ContentScope; search?: string }

export async function listContent({ systemId, kind, scope, search }: ListContentParams): Promise<ContentRow[]> {
  let q = supabase.from('content').select('*').eq('system_id', systemId).eq('kind', kind)
  if (scope === 'official') q = q.is('owner_id', null)
  else if (scope === 'mine') q = q.eq('owner_id', await currentUserId()).is('campaign_id', null)
  else if (typeof scope === 'object') q = q.eq('campaign_id', scope.campaignId)
  const term = search?.trim()
  if (term) q = q.ilike('name', `%${term.replace(/[\\%_]/g, '\\$&')}%`)
  return unwrap(await q.order('name')) ?? []
}

export async function getContent(id: string): Promise<ContentRow> {
  return unwrap(await supabase.from('content').select('*').eq('id', id).single())
}

export type SaveHomebrewInput = {
  id?: string
  systemId: SystemId
  kind: string
  name: string
  summary?: string
  description?: string
  data: unknown
  parentId?: string
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'homebrew'
}

export async function saveHomebrew(input: SaveHomebrewInput): Promise<ContentRow> {
  const def = getSystem(input.systemId).contentKinds[input.kind]
  if (!def) throw new Error(`Unknown content kind "${input.kind}" for ${input.systemId}`)
  const data = def.schema.parse(input.data) as Json // throws ZodError before any network call
  const fields = {
    name: input.name,
    slug: slugify(input.name),
    summary: input.summary ?? null,
    description: input.description ?? null,
    data,
    parent_id: input.parentId ?? null,
  }
  const table = supabase.from('content')
  try {
    if (input.id) {
      return unwrap(await table.update(fields).eq('id', input.id).select('*').single())
    }
    const owner_id = await currentUserId()
    return unwrap(
      await table.insert({ ...fields, owner_id, system_id: input.systemId, kind: input.kind }).select('*').single(),
    )
  } catch (e) {
    // content_owner_slug_key: this user already has homebrew of this kind with that name
    if (e instanceof AppError && (e.cause as { code?: string } | undefined)?.code === '23505') {
      throw new AppError('duplicate', { cause: e.cause })
    }
    throw e
  }
}

export async function deleteHomebrew(id: string): Promise<void> {
  check(await supabase.from('content').delete().eq('id', id))
}
