import { PortalHost } from '@rn-primitives/portal'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ShapedSurface } from '@/components/ui/shaped-surface'

test('the dialog is a chamfered rock plate with a gold hairline and a hard shadow', () => {
  render(
    <>
      <Dialog open onOpenChange={jest.fn()}>
        <DialogContent><Text>Hello</Text></DialogContent>
      </Dialog>
      <PortalHost />
    </>,
  )
  const plate = screen.UNSAFE_getByType(ShapedSurface).props
  expect(plate.shape).toBe('chamfer')
  expect(plate.fill).toBe('rock')
  expect(plate.stroke).toBe('rule')
  expect(plate.glass).toBe('overlay')
  expect(screen.getByText('Hello')).toBeTruthy()
})
