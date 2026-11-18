import { columnsFor } from '@/features/combat/cardsLayout'

test.each([
  [0, 1],
  [699, 1],
  [700, 2],
  [1023, 2],
  [1024, 3],
  [1439, 3],
  [1440, 4],
  [2560, 4],
])('columnsFor(%i) is %i', (width, cols) => {
  expect(columnsFor(width)).toBe(cols)
})
