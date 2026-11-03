import AsyncStorage from '@react-native-async-storage/async-storage'
import { setPendingJoinCode, takePendingJoinCode } from '@/features/campaigns/pendingJoin'

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))

beforeEach(() => AsyncStorage.clear())

test('set then take returns the code once', async () => {
  await setPendingJoinCode('AB12CD')
  expect(await takePendingJoinCode()).toBe('AB12CD')
  expect(await takePendingJoinCode()).toBeNull()
})

test('the code is sanitized on the way in', async () => {
  await setPendingJoinCode('ab12cd ')
  expect(await takePendingJoinCode()).toBe('AB12CD')
})

test('an empty code stores nothing', async () => {
  await setPendingJoinCode('')
  expect(await takePendingJoinCode()).toBeNull()
})
