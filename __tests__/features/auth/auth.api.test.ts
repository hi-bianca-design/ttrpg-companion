import { signUp, signIn, signOut } from '@/features/auth/auth.api'

jest.mock('@/lib/supabase', () => ({
  supabase: {
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
