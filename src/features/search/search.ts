export type SearchResult = { id: string; kind: string; name: string; summary: string | null; group: 'SRD' | 'Encounters' }

/**
 * Case-insensitive search over name and description. A name that starts with the query ranks first, then
 * a name that contains it, then a description match; ties keep alphabetical order. Empty query: no results.
 */
export function searchIndex(items: SearchResult[], query: string, limit = 30): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const ranked: { item: SearchResult; rank: number }[] = []
  for (const item of items) {
    const name = item.name.toLowerCase()
    const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : item.summary?.toLowerCase().includes(q) ? 2 : -1
    if (rank >= 0) ranked.push({ item, rank })
  }
  ranked.sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
  return ranked.slice(0, limit).map((r) => r.item)
}
