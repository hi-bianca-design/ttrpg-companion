import { PortalHost } from '@rn-primitives/portal'
import { render, screen } from '@testing-library/react-native'
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ShapedSurface } from '@/components/ui/shaped-surface'

test('SheetContent avoids the keyboard on iOS, so inputs and the buttons under them stay visible', () => {
  expect(Platform.OS).toBe('ios')
  render(
    <>
      <Sheet open onOpenChange={jest.fn()}>
        <SheetContent>
          <TextInput accessibilityLabel="Amount" />
        </SheetContent>
      </Sheet>
      <PortalHost />
    </>,
  )
  const avoiding = screen.UNSAFE_getByType(KeyboardAvoidingView)
  expect(avoiding.props.behavior).toBe('padding')
  expect(screen.getByLabelText('Amount')).toBeTruthy()
})

test('the sheet is a rock plate with an arched top edge and no hard shadow', () => {
  render(
    <>
      <Sheet open onOpenChange={jest.fn()}>
        <SheetContent><TextInput accessibilityLabel="Amount" /></SheetContent>
      </Sheet>
      <PortalHost />
    </>,
  )
  const plate = screen.UNSAFE_getByType(ShapedSurface).props
  expect(plate.shape).toBe('arch')
  expect(plate.rise).toBe(24)
  expect(plate.fill).toBe('rock')
  expect(plate.shadowOffset).toBe(0)
})
