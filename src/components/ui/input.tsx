import { TextInput } from 'react-native'
import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<typeof TextInput> & { className?: string }

function Input({ className, editable = true, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        'h-11 rounded-full border border-border bg-input px-4 font-inter text-body text-foreground placeholder:text-muted-foreground',
        !editable && 'opacity-50',
        className,
      )}
      editable={editable}
      {...props}
    />
  )
}

export { Input }
export type { InputProps }
