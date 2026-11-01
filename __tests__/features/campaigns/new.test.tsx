import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { makeTestQueryClient } from '../../helpers/queryClient'
import NewCampaignScreen from '../../../app/(app)/campaigns/new'

const mockRouter = { back: jest.fn(), replace: jest.fn() }
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

test('New campaign is a modal-like flow: a ghost "Cancel" at the leading edge goes back', () => {
  render(<QueryClientProvider client={makeTestQueryClient()}><NewCampaignScreen /></QueryClientProvider>)
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(cancel.props.className).toContain('bg-transparent')
  expect(cancel.props.className).not.toContain('border-primary')
  const json = JSON.stringify(screen.toJSON())
  expect(json.indexOf('Cancel')).toBeLessThan(json.indexOf('New campaign'))
  fireEvent.press(cancel)
  expect(mockRouter.back).toHaveBeenCalled()
})
