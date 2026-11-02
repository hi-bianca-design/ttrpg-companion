import * as TabsPrimitive from '@rn-primitives/tabs'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { TextClassContext } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({
  className,
  children,
  ...props
}: TabsPrimitive.ListProps & React.RefAttributes<TabsPrimitive.ListRef>) {
  return (
    <TabsPrimitive.List className={cn('h-11', className)} {...props}>
      <ShapedSurface shape="chamfer" fill="rockDeep" stroke="border" strokeWidth={1} shadowOffset={0} className="h-full flex-row items-center p-1">
        {children}
      </ShapedSurface>
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  children,
  ...props
}: TabsPrimitive.TriggerProps & React.RefAttributes<TabsPrimitive.TriggerRef>) {
  const { value } = TabsPrimitive.useRootContext()
  const active = value === props.value
  const inner = 'h-full flex-1 flex-row items-center justify-center px-3'
  return (
    <TextClassContext.Provider
      value={cn('font-display-medium text-body-sm uppercase tracking-widest', active ? 'text-primary-foreground' : 'text-muted-foreground')}
    >
      <TabsPrimitive.Trigger className={cn('h-full flex-1', props.disabled && 'opacity-50', className)} {...props}>
        <ShapedSurface
          shape="hex"
          fill={active ? 'primary' : 'transparent'}
          stroke={active ? 'ink' : 'transparent'}
          shadowOffset={0}
          className={inner}
        >
          {children as React.ReactNode}
        </ShapedSurface>
      </TabsPrimitive.Trigger>
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
