import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { dismissEndSummary, usePendingEndSummary } from './endCombatSummaryStore'
import { EndCombatSummary } from './EndCombatSummary'

/** Shows the end-of-combat summary over the screen. Mounted by the party page, which outlives the GM screen. */
export function EndCombatSummaryHost({ campaignId }: { campaignId: string }) {
  const summary = usePendingEndSummary(campaignId)
  return (
    <Dialog open={summary !== null} onOpenChange={(open) => { if (!open) dismissEndSummary() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Combat ended</DialogTitle>
        </DialogHeader>
        {summary ? <EndCombatSummary round={summary.round} xp={summary.xp} onClose={dismissEndSummary} /> : null}
      </DialogContent>
    </Dialog>
  )
}
