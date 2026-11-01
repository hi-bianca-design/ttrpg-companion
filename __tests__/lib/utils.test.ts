import { cn } from '@/lib/utils'
test('later padding wins', () => expect(cn('p-2', 'p-4')).toBe('p-4'))
test('falsy dropped', () => expect(cn('a', false && 'b', undefined)).toBe('a'))
test('type role and colour both kept', () => expect(cn('text-title', 'text-foreground')).toBe('text-title text-foreground'))
test('custom radius overrides rounded-full', () => expect(cn('rounded-full px-4', 'rounded-card')).toBe('px-4 rounded-card'))
