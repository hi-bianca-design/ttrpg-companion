import * as TabsPrimitive from '@rn-primitives/tabs'
import { TextClassContext } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({
  className,
  ...props
}: TabsPrimitive.ListProps & React.RefAttributes<TabsPrimitive.ListRef>) {
  return (
    <TabsPrimitive.List
      className={cn('h-11 flex-row items-center rounded-full border border-border bg-muted p-1', className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.TriggerProps & React.RefAttributes<TabsPrimitive.TriggerRef>) {
  const { value } = TabsPrimitive.useRootContext()
  const active = value === props.value
  return (
    <TextClassContext.Provider
      value={cn('font-sans-semibold text-body-sm', active ? 'text-primary-foreground' : 'text-muted-foreground')}
    >
      <TabsPrimitive.Trigger
        className={cn(
          'h-full flex-1 flex-row items-center justify-center rounded-full px-3',
          active && 'bg-primary',
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.ContentProps & React.RefAttributes<TabsPrimitive.ContentRef>) {
  return <TabsPrimitive.Content className={cn(className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
