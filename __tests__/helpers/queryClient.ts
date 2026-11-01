import { QueryClient } from '@tanstack/react-query'

const created: QueryClient[] = []

/**
 * A QueryClient for one test. gcTime: Infinity schedules no garbage-collection
 * timer (the default 5 min setTimeout kept the Jest worker alive after the run),
 * and the cache is cleared after each test.
 */
export function makeTestQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
  })
  created.push(client)
  return client
}

afterEach(() => {
  created.splice(0).forEach((c) => c.clear())
})
