import * as layout from '../../app/(app)/characters/_layout'

jest.mock('expo-router', () => ({ Stack: () => null }))

test('the Characters list is the stack root, so a sheet opened from Home or a deep link has it underneath', () => {
  expect(layout.unstable_settings).toEqual({ initialRouteName: 'index' })
})
