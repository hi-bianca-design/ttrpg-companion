import { useState } from 'react'
import { TextInput } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { splitClassName } from '@/lib/class-split'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<typeof TextInput> & { className?: string }

/**
 * Recessed pointed plate with the value in Cormorant. A placeholder cannot be styled apart from the
 * value in React Native, so the field is italic/light while empty and upright/semibold/yellow once it
 * holds text; that tracks both controlled and uncontrolled inputs.
 */
function Input({ className, editable = true, multiline, value, defaultValue, onChangeText, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)
  const [typed, setTyped] = useState(Boolean(value ?? defaultValue))
  const filled = value !== undefined ? value.length > 0 : typed
  const { plate, content: field } = splitClassName(className)

  return (
    <ShapedSurface
      shape={multiline ? 'chamfer' : 'auto'}
      glass="field"
      fill="well"
      stroke={focused ? 'torch' : 'border'}
      strokeWidth={focused ? 2 : 1.5}
      glow={focused ? 'torch' : undefined}
      className={cn(!editable && 'opacity-50', plate)}
    >
      <TextInput
        className={cn(
          'relative bg-transparent px-6 text-body',
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
