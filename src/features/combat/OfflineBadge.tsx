import { Badge } from '@/components/ui/badge'
import { useIsOnline } from '@/lib/useIsOnline'

/** The quiet marker on the GM's combat header while the connection is down. Nothing else blocks. */
export function OfflineBadge() {
  const online = useIsOnline()
  if (online) return null
  return (
    <Badge accessibilityRole="text" accessibilityLiveRegion="polite">
      Offline: changes will sync
    </Badge>
  )
}
