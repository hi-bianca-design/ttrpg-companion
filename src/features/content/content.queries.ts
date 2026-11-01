import { useQuery } from '@tanstack/react-query'
import { qk, type ContentScope } from '@/lib/query-client'
import type { SystemId } from '@/systems/types'

/**
 * Content rows of one kind (no server-side search; filter client-side). content.api is required
 * lazily: system builder steps use this hook, and the system registry must stay importable
 * (rules, schemas, tests) without constructing the Supabase client.
 */
export function useContentList(systemId: SystemId, kind: string, scope: ContentScope = 'all') {
  return useQuery({
    queryKey: qk.content(systemId, kind, scope),
    queryFn: () => {
      const { listContent } = require('./content.api') as typeof import('./content.api')
      return listContent({ systemId, kind, scope })
    },
  })
}
