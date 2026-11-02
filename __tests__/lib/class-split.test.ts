import { splitClassName } from '@/lib/class-split'

test('placement classes go to the plate', () => {
  const { plate, content } = splitClassName('mt-2 mx-4 flex-1 w-full self-start grow')
  expect(plate.split(' ').sort()).toEqual(['flex-1', 'grow', 'mt-2', 'mx-4', 'self-start', 'w-full'])
  expect(content).toBe('')
})

test('flex direction, wrapping, alignment, gap, padding and text stay on the content', () => {
  const { plate, content } = splitClassName('flex-row flex-wrap flex-col items-center justify-between gap-3 p-0 text-center h-auto')
  expect(plate).toBe('')
  expect(content.split(' ')).toEqual(['flex-row', 'flex-wrap', 'flex-col', 'items-center', 'justify-between', 'gap-3', 'p-0', 'text-center', 'h-auto'])
})

test('variant-prefixed placement classes still go to the plate', () => {
  expect(splitClassName('web:mt-2').plate).toBe('web:mt-2')
})
