/**
 * The GM screen's one breakpoint helper: how many enemy cards fit across. Phones get one column,
 * a portrait tablet two, a laptop three and a wide screen four.
 */
export function columnsFor(width: number): 1 | 2 | 3 | 4 {
  if (width >= 1440) return 4
  if (width >= 1024) return 3
  if (width >= 700) return 2
  return 1
}

/** The grid's gap in points; matches `gap-4` on the grid. */
const CARD_GAP = 16
/** The card width used until the grid has measured itself (one laptop column). */
const FALLBACK_CARD_WIDTH = 288

/**
 * A card's fixed width for a grid `containerWidth` wide with `columns` across. It depends only on the
 * window and the column count, never on what a card contains, so cards do not shift mid-fight.
 */
export function cardWidthFor(containerWidth: number, columns: number): number {
  if (containerWidth <= 0) return FALLBACK_CARD_WIDTH
  return Math.floor((containerWidth - CARD_GAP * (columns - 1)) / columns)
}
