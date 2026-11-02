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
    <TabsPrimitive.List className={cn('min-h-11', className)} {...props}>
      <ShapedSurface glass shape="chamfer" fill="rockDeep" stroke="border" strokeWidth={1} shadowOffset={0} className="min-h-11 flex-row items-center p-1">
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
  // basis-0 + flex-1 gives every segment the same width whatever its label; px-1 leaves REACTIONS room.
  const inner = 'min-h-9 flex-1 basis-0 flex-row items-center justify-center px-1'
  return (
    <TextClassContext.Provider
      value={cn('font-display-medium text-caption uppercase tracking-wide', active ? 'text-foreground' : 'text-muted-foreground')}
    >
      <TabsPrimitive.Trigger className={cn('flex-1 basis-0 self-stretch', props.disabled && 'opacity-50', className)} {...props}>
        <ShapedSurface
          shape="chamfer"
          fill={active ? 'rock' : 'transparent'}
          stroke={active ? 'secondary' : 'transparent'}
          strokeWidth={1}
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
