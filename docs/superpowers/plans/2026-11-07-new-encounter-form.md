# New encounter form (GM authoring for Flow A)

Decisions only. Stacked on PR #62; builds on the tables from #61.

## Scope
Name, three story notes, and enemies (add, remove, move up/down). GM only. Create, edit, delete.
Out: monster library, SRD import, drag reorder, undo, combat, the review screen.

## Decisions
- **Atomic save in SQL.** One `save_encounter(...)` security definer function (new migration
  `20261107000001_save_encounter.sql`). Null `p_encounter_id` creates; otherwise it locks the encounter row,
  checks it belongs to `p_campaign_id`, updates it, deletes its enemies and re-inserts them by array order
  (`position` = index + 1). Errors are the repo's coded P0001 `not_allowed`, `invalid_encounter`, `invalid_enemy`.
  Revoked from public/anon, granted to authenticated. Empty enemy list is allowed (an encounter can be saved
  before its enemies are known).
- **Delete** is a plain `supabase.from('encounters').delete()` through the existing RLS policy; enemies cascade.
- **Validation lives twice**: SQL is authoritative; `encounterForm.ts` mirrors it so the form can disable
  submit and show a reason. Extra limits (the table checks don't have them, the form and function both do):
  attack name <= 60, to-hit <= 20, damage <= 40, each attack must be a JSON object of strings.
- **Pure model `encounterForm.ts`**: draft types (all inputs are strings), `blankDraft`, `draftFromEncounter`,
  `validateDraft` (per-field reasons), `toSaveInput` (trim, blank -> null, AC label defaults to 'AC'),
  `moveEnemy`, clamp helpers. Unit tested; no React.
- **UI**: `EncounterFormSheet` (Sheet, follows AddEnemySheet) + `EnemyRowFields`; `EncounterPicker` gets a GM-only
  `onCreate`/`onEdit`/`onDelete` surface (a "New encounter" button above the list and in the empty state; Edit and
  Delete per row). Players never get the callbacks, so never see the controls. `PartyPage` owns the sheet and the
  delete Dialog and passes callbacks only when `isGm`. The picker is also used inside AddEnemySheet (mid-fight):
  there no callbacks are passed, so no authoring controls appear.
- **Empty-state copy** changes from "Prepare an encounter before the session…" to a body that still reads right with a
  button under it.
- **Submit** stays disabled until the name and every enemy row are valid; each invalid field shows a short reason
  (only once touched or when the user tries, to avoid a wall of red on a fresh form: decision, see below).
  Count is clamped to 1..20 on input like AddEnemySheet.
- **Errors/types**: `not_allowed` exists; add `invalid_encounter` to `AppErrorCode`, `ERROR_COPY`, `RPC_CODES`.
  `database.types.ts` hand-edited for `save_encounter`. The `Encounter` type derives from the table Row, so no change.
- **Queries**: `useSaveEncounter(campaignId)` and `useDeleteEncounter(campaignId)` invalidate `qk.encounters(campaignId)`.

## Verification
TDD per unit (RED shown, then GREEN). pgTAP `supabase/tests/save_encounter.test.sql` against a disposable
Postgres container (not the owner's stack). Checks: typecheck, lint:tokens, lint:dead, jest. Nothing is run in a browser.
