import { PortalHost } from '@rn-primitives/portal'
import { render, screen } from '@testing-library/react-native'
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native'
import { Sheet, SheetContent } from '@/components/ui/sheet'

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
