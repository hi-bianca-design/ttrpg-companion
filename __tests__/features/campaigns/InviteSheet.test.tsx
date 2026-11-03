import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Platform, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { InviteSheet } from '@/features/campaigns/InviteSheet'

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }))
jest.mock('react-qr-code', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ value }: { value: string }) => <Text testID="qr">{value}</Text> }
})

const LINK = 'https://sz.example/campaigns/join?code=ABC123'
const originalOS = Platform.OS
const originalNavigator = globalThis.navigator
const originalEnv = process.env.EXPO_PUBLIC_WEB_URL

function renderSheet() {
  render(
    <>
      <InviteSheet code="ABC123" open onOpenChange={jest.fn()} />
      <PortalHost />
    </>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(Platform as { OS: string }).OS = 'ios'
  process.env.EXPO_PUBLIC_WEB_URL = 'https://sz.example'
  ;(Clipboard.setStringAsync as jest.Mock).mockResolvedValue(true)
})
afterEach(() => {
  ;(Platform as { OS: string }).OS = originalOS
  if (originalEnv === undefined) delete process.env.EXPO_PUBLIC_WEB_URL
  else process.env.EXPO_PUBLIC_WEB_URL = originalEnv
  ;(globalThis as { navigator: unknown }).navigator = originalNavigator
})

test('shows the title, the code and a QR of the join link', () => {
  renderSheet()
  expect(screen.getByText('Invite players')).toBeTruthy()
  expect(screen.getByText('ABC123')).toBeTruthy()
  expect(screen.getByTestId('qr').props.children).toBe(LINK)
})

test('without a web origin the QR is hidden but the code stays', () => {
  delete process.env.EXPO_PUBLIC_WEB_URL
  renderSheet()
  expect(screen.queryByTestId('qr')).toBeNull()
  expect(screen.getByText('ABC123')).toBeTruthy()
})

test('Copy puts the code on the clipboard and says Copied', async () => {
  renderSheet()
  fireEvent.press(screen.getByRole('button', { name: 'Copy invite code' }))
  await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ABC123'))
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
})

test('a clipboard failure says so, in the destructive tone', async () => {
  ;(Clipboard.setStringAsync as jest.Mock).mockRejectedValue(new Error('denied'))
  renderSheet()
  fireEvent.press(screen.getByRole('button', { name: 'Copy invite code' }))
  expect(await screen.findByText('Couldn’t copy. Select the code instead.')).toBeTruthy()
})

test('Share sends the message with the code and link on native', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })
  renderSheet()
  fireEvent.press(screen.getByRole('button', { name: 'Share invite' }))
  await waitFor(() => expect(share).toHaveBeenCalled())
  const message = share.mock.calls[0][0].message as string
  expect(message).toContain('ABC123')
  expect(message).toContain(LINK)
})

test('cancelling the native share is not an error', async () => {
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('cancelled'))
  renderSheet()
  fireEvent.press(screen.getByRole('button', { name: 'Share invite' }))
  await waitFor(() => expect(Share.share).toHaveBeenCalled())
  expect(screen.queryByText(/wrong|failed|error/i)).toBeNull()
})

describe('on web', () => {
  beforeEach(() => { ;(Platform as { OS: string }).OS = 'web' })

  test('Share is hidden without navigator.share', () => {
    renderSheet()
    expect(screen.queryByRole('button', { name: 'Share invite' })).toBeNull()
  })

  test('Share uses navigator.share when present and swallows an abort', async () => {
    const share = jest.fn().mockRejectedValue(Object.assign(new Error('abort'), { name: 'AbortError' }))
    ;(globalThis as { navigator: unknown }).navigator = { share }
    renderSheet()
    fireEvent.press(screen.getByRole('button', { name: 'Share invite' }))
    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(share.mock.calls[0][0].text).toContain('ABC123')
  })
})

test('only the sheet grabber is a pill; the QR plate and buttons are not rounded-full', () => {
  renderSheet()
  expect((JSON.stringify(screen.toJSON()).match(/rounded-full/g) ?? []).length).toBe(1)
})
