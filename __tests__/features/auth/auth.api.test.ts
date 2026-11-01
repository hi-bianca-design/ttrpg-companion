import { signUp, signIn, signOut } from '@/features/auth/auth.api'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase'

describe('auth.api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null })
  })

  describe('signUp', () => {
    it('calls supabase.auth.signUp with email and password', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      await signUp('test@example.com', 'password123', 'testuser')
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: { username: 'testuser' } },
      })
    })

    it('throws when auth signup fails', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      })
      await expect(signUp('existing@example.com', 'password123', 'user'))
        .rejects.toThrow('Email already registered')
    })

    it('checks the username first and fails as username_taken without signing up when it is taken', async () => {
      ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null })
      await expect(signUp('new@example.com', 'password123', 'bob'))
        .rejects.toMatchObject({ code: 'username_taken', message: 'That username is taken.' })
      expect(supabase.rpc).toHaveBeenCalledWith('username_available', { p_username: 'bob' })
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('still signs up when the availability check itself fails (the trigger is the guard)', async () => {
      ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Network request failed' } })
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: { user: { id: 'u' } }, error: null })
      await signUp('new@example.com', 'password123', 'bob')
      expect(supabase.auth.signUp).toHaveBeenCalled()
    })

    it('maps the handle_new_user username_taken error to a username_taken AppError', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'username_taken', code: 'P0001', status: 500 },
      })
      await expect(signUp('new@example.com', 'password123', 'bob'))
        .rejects.toMatchObject({ code: 'username_taken', message: 'That username is taken.' })
    })
  })

  describe('signIn', () => {
    it('calls signInWithPassword with email and password', async () => {
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { access_token: 'tok' } },
        error: null,
      })
      const result = await signIn('test@example.com', 'password123')
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.user?.id).toBe('user-123')
    })

    it('throws when credentials are invalid', async () => {
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      })
      await expect(signIn('bad@example.com', 'wrong')).rejects.toThrow('Invalid login credentials')
    })
  })

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })
      await signOut()
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    })

    it('throws when signOut fails', async () => {
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Network error' },
      })
      await expect(signOut()).rejects.toThrow('Network error')
    })
  })
})
