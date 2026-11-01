import * as SelectPrimitive from '@rn-primitives/select'
import { Check } from 'phosphor-react-native'
import { View } from 'react-native'
import { TextClassContext } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.TriggerProps & React.RefAttributes<SelectPrimitive.TriggerRef>) {
  return (
    <TextClassContext.Provider value="font-sans text-body text-foreground">
      <SelectPrimitive.Trigger
        className={cn(
          'h-11 flex-row items-center justify-between gap-2 rounded-full border border-border bg-input px-4',
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        <>{children}</>
      </SelectPrimitive.Trigger>
    </TextClassContext.Provider>
  )
}

function SelectContent({
  className,
  children,
  portalHost,
  ...props
}: SelectPrimitive.ContentProps &
  React.RefAttributes<SelectPrimitive.ContentRef> & { portalHost?: string }) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <SelectPrimitive.Overlay className="absolute inset-0">
        <TextClassContext.Provider value="font-sans text-body text-foreground">
          <SelectPrimitive.Content
            className={cn('min-w-32 overflow-hidden rounded-card border border-border bg-background p-1', className)}
            position="popper"
            {...props}
          >
            <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </TextClassContext.Provider>
      </SelectPrimitive.Overlay>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.ItemProps & React.RefAttributes<SelectPrimitive.ItemRef>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'min-h-11 flex-row items-center rounded-sm px-3 py-2 active:bg-muted',
        props.disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <View className="flex-1">
        <SelectPrimitive.ItemText />
      </View>
      <SelectPrimitive.ItemIndicator>
        <Check size={16} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
