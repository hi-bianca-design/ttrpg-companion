import { View } from 'react-native'
import { Text } from '@/components/ui/text'

type FieldProps = {
  label: string
  /** The short reason this field is invalid. Muted while the field is still empty (a hint), red once it holds text. */
  reason?: string
  empty?: boolean
  children: React.ReactNode
}

/** A label above an input with its validation reason underneath. */
export function FormField({ label, reason, empty = false, children }: FieldProps) {
  return (
    <View className="gap-1">
      <Text variant="label">{label}</Text>
      {children}
      {reason ? <Text variant="caption" tone={empty ? 'muted' : 'destructive'}>{reason}</Text> : null}
    </View>
  )
}
