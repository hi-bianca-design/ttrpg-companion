import { fireEvent, render, screen } from '@testing-library/react-native'
import { Input } from '@/components/ui/input'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { THEME_COLORS } from '@/lib/theme'

const surface = () => screen.UNSAFE_getByType(ShapedSurface).props
const field = () => screen.getByPlaceholderText('Name thy character')

test('empty: italic Cormorant in the placeholder colour, never the typed style', () => {
  render(<Input placeholder="Name thy character" />)
  expect(field().props.className).toContain('font-narrative-italic')
  expect(field().props.className).not.toContain('text-typed')
  expect(field().props.placeholderTextColor).toBe(THEME_COLORS.placeholder)
})

test('typing into an uncontrolled input switches to upright semibold typed text', () => {
  render(<Input placeholder="Name thy character" />)
  fireEvent.changeText(field(), 'Thessaly')
  expect(field().props.className).toContain('font-narrative-semibold')
  expect(field().props.className).toContain('text-typed')
  expect(field().props.className).not.toContain('font-narrative-italic')
  fireEvent.changeText(field(), '')
  expect(field().props.className).toContain('font-narrative-italic')
})

test('a defaultValue starts typed', () => {
  render(<Input placeholder="Name thy character" defaultValue="Thessaly" />)
  expect(field().props.className).toContain('text-typed')
})

test('a controlled value drives the style', () => {
  const { rerender } = render(<Input placeholder="Name thy character" value="" onChangeText={() => {}} />)
  expect(field().props.className).toContain('font-narrative-italic')
  rerender(<Input placeholder="Name thy character" value="Thessaly" onChangeText={() => {}} />)
  expect(field().props.className).toContain('text-typed')
})

test('focus lights the edge: torch stroke, 3px, with glow; blur restores it', () => {
  render(<Input placeholder="Name thy character" />)
  expect(surface().stroke).toBe('border')
  expect(surface().strokeWidth).toBe(2)
  fireEvent(field(), 'focus')
  expect(surface().stroke).toBe('torch')
  expect(surface().strokeWidth).toBe(3)
  expect(surface().glow).toBe('torch')
  fireEvent(field(), 'blur')
  expect(surface().stroke).toBe('border')
  expect(surface().glow).toBeUndefined()
})

test('single line is a pointed plate on the well; multiline is chamfered', () => {
  const { rerender } = render(<Input placeholder="Name thy character" />)
  expect(surface().fill).toBe('well')
  expect(surface().shape).toBe('auto')
  rerender(<Input placeholder="Name thy character" multiline />)
  expect(surface().shape).toBe('chamfer')
})

test('caller layout classes go on the plate, text classes stay on the field', () => {
  render(<Input placeholder="Name thy character" className="mt-1 flex-1 text-center h-auto" />)
  expect(surface().className).toContain('mt-1')
  expect(surface().className).toContain('flex-1')
  expect(surface().className).not.toContain('text-center')
  expect(field().props.className).toContain('text-center')
  expect(field().props.className).toContain('h-auto')
  expect(field().props.className).not.toContain('mt-1')
})

test('not editable is dimmed', () => {
  render(<Input placeholder="Name thy character" editable={false} />)
  expect(surface().className).toContain('opacity-50')
  expect(field().props.editable).toBe(false)
})

test('still calls the caller onChangeText, onFocus and onBlur', () => {
  const onChangeText = jest.fn()
  const onFocus = jest.fn()
  const onBlur = jest.fn()
  render(<Input placeholder="Name thy character" onChangeText={onChangeText} onFocus={onFocus} onBlur={onBlur} />)
  fireEvent(field(), 'focus')
  fireEvent.changeText(field(), 'a')
  fireEvent(field(), 'blur')
  expect(onFocus).toHaveBeenCalledTimes(1)
  expect(onChangeText).toHaveBeenCalledWith('a')
  expect(onBlur).toHaveBeenCalledTimes(1)
})

test('the field is positioned so it paints above the plate SVG on web (an unpositioned input hides under it)', () => {
  render(<Input placeholder="Name thy character" />)
  expect(field().props.className).toContain('relative')
})
