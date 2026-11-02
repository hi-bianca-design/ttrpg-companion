import { useState } from 'react'
import { TextInput } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<typeof TextInput> & { className?: string }

// Placement classes belong to the plate; everything else (text, padding, height) styles the field itself.
const LAYOUT = /^(?:[a-z0-9-]+:)*-?(?:m[trblxyse]?|flex|grow|shrink|basis|w|min-w|max-w|self)(?:-|$)/
function splitClassName(className?: string) {
  const plate: string[] = []
  const field: string[] = []
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) (LAYOUT.test(token) ? plate : field).push(token)
  return { plate: plate.join(' '), field: field.join(' ') }
}

/**
 * Recessed pointed plate with the value in Cormorant. A placeholder cannot be styled apart from the
 * value in React Native, so the field is italic/light while empty and upright/semibold/yellow once it
 * holds text; that tracks both controlled and uncontrolled inputs.
 */
function Input({ className, editable = true, multiline, value, defaultValue, onChangeText, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)
  const [typed, setTyped] = useState(Boolean(value ?? defaultValue))
  const filled = value !== undefined ? value.length > 0 : typed
  const { plate, field } = splitClassName(className)

  return (
    <ShapedSurface
      shape={multiline ? 'chamfer' : 'auto'}
      fill="well"
      stroke={focused ? 'torch' : 'border'}
      strokeWidth={focused ? 3 : 2}
      glow={focused ? 'torch' : undefined}
      className={cn(!editable && 'opacity-50', plate)}
    >
      <TextInput
        className={cn(
          'bg-transparent px-6 text-body',
          multiline ? 'py-3' : 'h-11',
          filled ? 'font-narrative-semibold text-typed' : 'font-narrative-italic text-foreground',
          // The browser's own blue focus outline is replaced by the torch edge.
          'web:outline-none',
          field,
        )}
        placeholderTextColor={THEME_COLORS.placeholder}
        multiline={multiline}
        editable={editable}
        value={value}
        defaultValue={defaultValue}
        onChangeText={(text) => {
          setTyped(text.length > 0)
          onChangeText?.(text)
        }}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />
    </ShapedSurface>
  )
}

export { Input }
export type { InputProps }
