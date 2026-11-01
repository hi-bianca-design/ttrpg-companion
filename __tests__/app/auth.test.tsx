import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import LoginScreen from '../../app/(auth)/login'
import SignupScreen from '../../app/(auth)/signup'
import { signIn, signUp } from '@/features/auth/auth.api'
import { AppError } from '@/features/errors'

jest.mock('@/features/auth/auth.api', () => ({ signIn: jest.fn(), signUp: jest.fn() }))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }) }))
jest.mock('@/components/game', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const mockSignIn = signIn as jest.Mock
const mockSignUp = signUp as jest.Mock

beforeEach(() => jest.clearAllMocks())

describe('LoginScreen', () => {
  test('empty email shows a caption and does not call signIn', () => {
    render(<LoginScreen />)
    fireEvent.press(screen.getByText('Sign in'))
    expect(screen.getByText('Enter your email')).toBeTruthy()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  test('empty password shows a caption and does not call signIn', () => {
    render(<LoginScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co')
    fireEvent.press(screen.getByText('Sign in'))
    expect(screen.getByText('Enter your password')).toBeTruthy()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  test('failed sign-in shows the returned message', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid login credentials'))
    render(<LoginScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('Email'), ' a@b.co ')
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pw')
    fireEvent.press(screen.getByText('Sign in'))
    expect(await screen.findByText('Invalid login credentials')).toBeTruthy()
    expect(mockSignIn).toHaveBeenCalledWith('a@b.co', 'pw')
  })
})

describe('SignupScreen', () => {
  test('missing username shows a caption and does not call signUp', () => {
    render(<SignupScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co')
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pw')
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Choose a username')).toBeTruthy()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('failed sign-up shows the returned message', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('User already registered'))
    render(<SignupScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co')
    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'bob')
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pw')
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(screen.getByText('User already registered')).toBeTruthy())
  })

  test('the username field is capped at 64 characters', () => {
    render(<SignupScreen />)
    expect(screen.getByPlaceholderText('Username').props.maxLength).toBe(64)
  })

  test('a username over 64 characters shows a caption and does not call signUp', () => {
    render(<SignupScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co')
    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'x'.repeat(65))
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pw')
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Use 64 characters or fewer')).toBeTruthy()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('a taken username shows "That username is taken." under Username', async () => {
    mockSignUp.mockRejectedValueOnce(new AppError('username_taken'))
    render(<SignupScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co')
    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'bob')
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pw')
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('That username is taken.')).toBeTruthy()
  })
})
