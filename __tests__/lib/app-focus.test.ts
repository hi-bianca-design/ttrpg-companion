import { AppState } from 'react-native'
import { focusManager } from '@tanstack/react-query'
import { installAppFocus } from '@/lib/app-focus'

test('react-query sees the app as unfocused while it is in the background', () => {
  let listener: (s: string) => void = () => {}
  const remove = jest.fn()
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
    listener = cb
    return { remove }
  }) as never)
  const uninstall = installAppFocus()
  listener('background')
  expect(focusManager.isFocused()).toBe(false)
  listener('active')
  expect(focusManager.isFocused()).toBe(true)
  uninstall()
  expect(remove).toHaveBeenCalled()
})
