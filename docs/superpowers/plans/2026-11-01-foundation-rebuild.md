# Foundation Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the app on a shadcn-style "Moss blend" design system and a system-agnostic Supabase data model, then rebuild every existing screen (plus slot tracking, add-item and campaigns) on top of it.

**Architecture:** Design tokens live in `global.css` + a *replaced* Tailwind scale; react-native-reusables components in `src/components/ui`, game components in `src/components/game`. A game system is a `game_systems` row plus a TypeScript module in `src/systems/<id>/` (stats, resources, content kinds, Zod schemas, builder steps, rules). Generic tables (`content`, `characters`, `character_picks`, `character_items`, `campaigns`, `campaign_members`) hold system-shaped JSON validated by that module. Screens are thin routes over feature hooks (TanStack Query) in `src/features/*`.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router 6, NativeWind 4 / Tailwind 3, react-native-reusables (`@rn-primitives/*`, `class-variance-authority`, `clsx`, `tailwind-merge`), `@expo-google-fonts/{fraunces,inter,ibm-plex-mono}`, `@tanstack/react-query`, `zod`, Supabase (Postgres + RLS, pgTAP tests), Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-11-01-foundation-rebuild-design.md` — read it alongside this plan. Section references (§) point there.

## Global Constraints

- Branch: `rebuild/foundation`. Baseline snapshot commit `7b07974`. Never commit to `main`.
- All existing database data is test data and may be wiped (confirmed by user). The **remote** reset in Task 10 still needs a one-line confirmation from the user at execution time.
- Colours, spacing, radii and type come only from tokens (§4.2–§4.4). No hex/rgb literals, inline style colours/sizes, or arbitrary Tailwind values (`p-[13px]`, `text-[#fff]`) outside `global.css`, `tailwind.config.js`, `src/lib/theme.ts` and `src/components/ui/**`.
- Spacing scale is exactly: `0`=0, `1`=4px, `2`=8px, `3`=12px, `4`=16px, `6`=24px, `8`=32px, `11`=44px (touch-target heights only), `px`=1px.
- Type roles (exactly nine): `display` Fraunces 600 32/38 · `title` Fraunces 600 24/30 · `heading` Fraunces 600 20/26 · `subhead` Inter 600 16/22 · `body` Inter 400 16/24 · `body-sm` Inter 400 14/20 · `stat` Fraunces 600 24/28 tabular · `label` IBM Plex Mono 500 11/14 uppercase tracking 0.08em · `caption` Inter 400 12/16. Nothing below 11px.
- Radii: `sm` 8, `card` 16, `sheet` 20, `full` 999 (buttons, chips, inputs).
- Every card has the `border` token border in both modes. One `highlight` (ochre) button max per screen.
- Theme follows the OS colour scheme.
- iOS simulator is the primary verification target; web must load. Android not verified.
- Licensing: `game_systems` row for D&D records `license = 'CC-BY-4.0'`, attribution "This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, licensed under CC-BY-4.0."
- No feature beyond spec §3 (existing routes + wizard baseline + the three Additions). No session tables.
- Commit after every task with a conventional message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Homebrew/campaign content leaking across users** — user B must never see user A's homebrew or a campaign's items unless a member. Pinned by pgTAP tests in Task 9.
2. **Resource tracker at its bounds and under rapid taps** — spending at 0 available or restoring at max is a no-op, never negative or > max; two fast taps apply twice, not once. Pinned by `spendSlot`/`restoreSlot`/`adjustPool` tests in Task 6 and the optimistic-mutation test in Task 11.
3. **Joining a campaign with a bad code or wrong-system character** — unknown code, already-a-member, or a character whose `system_id` differs must give a clear inline error, not a crash or a silent no-op. Pinned in Task 9 (RPC) and Task 19.
4. **Changing an earlier wizard choice** — switching class after picking spells must drop spells the new class can't take; going back keeps other answers. Pinned in Task 13.
5. **Long names and big numbers** — a 40-character name or HP of `120/120` must truncate/fit, not overflow tiles or push buttons off-screen. Pinned by StatTile/ContentCard render tests in Task 4 and the UI review in Task 22.

---

## Phase A — Design system

### Task 1: Remove legacy UI stack, install the new one

**Files:**
- Delete: `components/` (Gluestack provider), `src/lib/react-dom-stub.js` (if Task 1 Step 4 shows nothing imports it)
- Modify: `package.json`, `metro.config.js`, `babel.config.js`, `app/_layout.tsx`
- Create: `src/lib/utils.ts`, `__tests__/lib/utils.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` from `@/lib/utils` (clsx + tailwind-merge, configured with the custom font-size roles from Task 2 so `text-title` and `text-foreground` don't collide).

- [ ] **Step 1: Write the failing test** `__tests__/lib/utils.test.ts`
```ts
import { cn } from '@/lib/utils'
test('later padding wins', () => expect(cn('p-2', 'p-4')).toBe('p-4'))
test('falsy dropped', () => expect(cn('a', false && 'b', undefined)).toBe('a'))
test('type role and colour both kept', () => expect(cn('text-title', 'text-foreground')).toBe('text-title text-foreground'))
```
- [ ] **Step 2: Run** `npx jest __tests__/lib/utils.test.ts` → FAIL (module not found).
- [ ] **Step 3:** `npm uninstall @gluestack-ui/core @gluestack-ui/utils react-aria react-stately @legendapp/motion tailwind-variants @expo/html-elements`; `npx expo install @rn-primitives/portal @rn-primitives/slot class-variance-authority clsx tailwind-merge @expo-google-fonts/fraunces @expo-google-fonts/inter @expo-google-fonts/ibm-plex-mono expo-font @tanstack/react-query zod`. Remove Gluestack wrapper from `app/_layout.tsx`. Implement `cn` with `extendTailwindMerge` registering font-size class group `['display','title','heading','subhead','body','body-sm','stat','label','caption']`.
- [ ] **Step 4:** `grep -rn "react-dom-stub" metro.config.js babel.config.js app src` — if no hits after Gluestack removal, delete the stub.
- [ ] **Step 5: Run** utils test → PASS; `npx tsc --noEmit` → no new errors beyond pre-existing ones (record the count before starting); `npx expo start --ios` boots to the login screen.
- [ ] **Step 6: Commit** `chore: replace gluestack with react-native-reusables foundations`

### Task 2: Theme tokens, replaced Tailwind scales, fonts

**Files:**
- Modify: `global.css`, `tailwind.config.js`, `app/_layout.tsx`
- Create: `src/lib/theme.ts`, `__tests__/lib/tailwind-config.test.ts`

**Interfaces:**
- Produces: Tailwind colour names `background foreground glow card card-foreground muted muted-foreground label border rule input ring primary primary-foreground accent-foreground highlight highlight-foreground destructive destructive-foreground resource-sky resource-plum resource-sage resource-ochre resource-sky-glow`; `fontSize` roles listed in Global Constraints; `fontFamily` `display` (Fraunces), `sans` (Inter), `mono` (IBM Plex Mono); `borderRadius` `sm card sheet full`.
- Produces: `NAV_THEME: { light: Theme; dark: Theme }` and `THEME_COLORS: Record<'light'|'dark', Record<string,string>>` from `@/lib/theme` — the only place JS needs literal colours (React Navigation, SVG gradient stops, shadow colours).
- Produces: `legacy` colour namespace (`legacy-base`, `legacy-surface`, … the old Catppuccin names) so un-migrated screens keep rendering until Task 20 deletes it.

- [ ] **Step 1: Write the failing test** `__tests__/lib/tailwind-config.test.ts`
```ts
const config = require('../../tailwind.config.js')
test('spacing is replaced, not extended', () => {
  expect(Object.keys(config.theme.spacing).sort()).toEqual(['0','1','11','2','3','4','6','8','px'].sort())
  expect(config.theme.spacing['4']).toBe('16px')
  expect(config.theme.extend?.spacing).toBeUndefined()
})
test('font sizes are the nine roles', () => {
  expect(Object.keys(config.theme.fontSize).sort()).toEqual(['body','body-sm','caption','display','heading','label','stat','subhead','title'].sort())
  expect(config.theme.fontSize.label[0]).toBe('11px')
})
test('no gluestack scales or safelist', () => {
  expect(config.safelist).toBeUndefined()
  expect(JSON.stringify(config.theme)).not.toContain('--color-typography')
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3:** Rewrite `tailwind.config.js` (`presets: [require('nativewind/preset')]`, `darkMode: 'class'`, drop `important`, `safelist`, Gluestack scales, shadows). Colours map to CSS variables holding full colour values (`background: 'var(--background)'`); values from §4.2 in `global.css` under `:root` and `.dark:root`. Derive `card/popover/input` dark values per §4.2 note; check text contrast ≥ 4.5:1 for `foreground`, `muted-foreground` on `background` and `card` (record ratios in the commit message). Load the three fonts with `useFonts` in `app/_layout.tsx`, hide the splash until loaded, set NativeWind colour scheme to `system`, wrap in React Navigation `ThemeProvider value={NAV_THEME[scheme]}` and render `<PortalHost />` last.
- [ ] **Step 4: Run** test → PASS; app boots in light and dark (toggle simulator appearance) with legacy screens still styled via `legacy-*`.
- [ ] **Step 5: Commit** `feat(design): Moss blend tokens, replaced spacing and type scales`

### Task 3: Base UI components (react-native-reusables, restyled)

**Files:**
- Create: `src/components/ui/{text,button,input,label,card,badge,tabs,select,dialog,sheet,collapsible,progress,separator}.tsx`
- Test: `__tests__/components/ui/text.test.tsx`, `__tests__/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `Text` with `variant: 'display'|'title'|'heading'|'subhead'|'body'|'body-sm'|'stat'|'label'|'caption'` (default `body`), `tone?: 'default'|'muted'|'accent'|'destructive'`; a `TextClassContext` so Button children inherit text style.
- Produces: `Button` with `variant: 'primary'|'outline'|'ghost'|'highlight'|'destructive'` (default `primary`), `size: 'default'|'sm'|'icon'` — `default` height `h-11`, `sm` `h-8`, `icon` `h-8 w-8` with `hitSlop` to 44; all `rounded-full`.
- Produces: `Card`, `CardHeader`, `CardTitle`, `CardContent` (`rounded-card border border-border bg-card p-4`; `compact` prop → `p-3`); `Badge` (`rounded-full px-2 py-1`, text variant `label`, `variant: 'default'|'accent'`); `Tabs` (segmented pill); `Sheet` (bottom sheet, `rounded-t-sheet`); `Collapsible`; `Progress`; `Separator` (`bg-rule`); `Input` (`h-11 rounded-full border-border bg-input px-4`); `Label`; `Select`; `Dialog`.
- Add components with `npx @react-native-reusables/cli@latest add <names>` (fall back to copying from the repo docs if the CLI fails), then restyle to tokens. Components not listed are added only when a later task needs them.

- [ ] **Step 1: Write failing tests**
```ts
// text.test.tsx
test('title variant uses Fraunces role', () => {
  render(<Text variant="title">Aelindra</Text>)
  expect(screen.getByText('Aelindra').props.className).toContain('text-title')
  expect(screen.getByText('Aelindra').props.className).toContain('font-display')
})
test('label variant is uppercase mono', () => { /* className contains 'text-label' 'font-mono' 'uppercase' */ })
// button.test.tsx
test('highlight variant', () => { /* render <Button variant="highlight"><Text>Go</Text></Button>; container className contains 'bg-highlight' and 'rounded-full' */ })
test('disabled button does not fire onPress', () => { /* fireEvent.press → handler not called */ })
```
- [ ] **Step 2: Run** `npx jest __tests__/components/ui` → FAIL.
- [ ] **Step 3:** Add and restyle components per Interfaces.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(ui): add restyled shadcn base components`

### Task 4: Game components

**Files:**
- Create: `src/components/game/{ScreenBackground,SectionHeader,StatTile,ResourceTracker,ContentCard,AdjustSheet}.tsx`, `src/components/game/index.ts`
- Test: `__tests__/components/game/{StatTile,ResourceTracker,ContentCard,SectionHeader}.test.tsx`
- Delete (after porting): `src/components/ui/CollapsibleSection.tsx`, `src/stores/ui.store.ts` (collapse state moves into `SectionHeader` via a small Zustand store `src/components/game/section-store.ts`, keyed by `id`)

**Interfaces:**
- Consumes: Task 3 components; `THEME_COLORS` (Task 2) for SVG gradient stops and glow shadow colour.
- Produces:
  - `ScreenBackground({ children, scroll?: boolean })` — `bg-background`, radial `glow` at top via `react-native-svg` `RadialGradient`, gutter `px-4`, top `pt-6`, sections separated by `gap-6`.
  - `SectionHeader({ id: string; title: string; collapsible?: boolean; action?: ReactNode; children })` — label + `border-b border-rule pb-2`, content `mt-3`, chevron toggles.
  - `StatTile({ label: string; value: string | number; sub?: string; tone?: 'default'|'highlight'; onPress?: () => void })` — compact Card, `Text variant="stat"` with `numberOfLines={1}` and `adjustsFontSizeToFit`.
  - `ResourceTracker` discriminated by `display`:
    - `{ display: 'pips'; label: string; max: number; used: number; onSpend(): void; onRestore(): void; tint?: ResourceTint }` — available pips filled with glow (iOS shadow, colour `resource-*-glow`), spent pips outlined at 45% opacity, `−`/`+` icon buttons (destructive / primary outline).
    - `{ display: 'bar'; label: string; current: number; max: number; temp?: number; onAdjust(): void }`
    - `{ display: 'counter'; label: string; current: number; max?: number; onAdjust(): void }`
    - `export type ResourceTint = 'sky'|'plum'|'sage'|'ochre'` (exported from `ResourceTracker.tsx`; Task 6 imports it)
  - `ContentCard({ title: string; meta?: string; tags?: string[]; icon?: ReactNode; action?: ReactNode; onPress?: () => void })` — title `subhead` `numberOfLines={1}`, meta `label`, tags as `Badge`s.
  - `AdjustSheet({ open: boolean; onOpenChange(open: boolean): void; title: string; children; primaryLabel: string; onPrimary(): void; secondaryLabel?: string; onSecondary?(): void })` — the Figma Adjust HP / Conditions / XP bottom sheet.

- [ ] **Step 1: Write failing tests**
```ts
// ResourceTracker.test.tsx
test('pips: renders max pips, used ones marked spent', () => {
  render(<ResourceTracker display="pips" label="Level 1" max={4} used={1} onSpend={jest.fn()} onRestore={jest.fn()} />)
  expect(screen.getAllByTestId('pip-available')).toHaveLength(3)
  expect(screen.getAllByTestId('pip-spent')).toHaveLength(1)
})
test('pips: spend disabled when none available', () => {
  const onSpend = jest.fn()
  render(<ResourceTracker display="pips" label="L1" max={2} used={2} onSpend={onSpend} onRestore={jest.fn()} />)
  fireEvent.press(screen.getByLabelText('Spend Level 1')) // accessibilityLabel `Spend ${label}`
  expect(onSpend).not.toHaveBeenCalled()
})
test('pips: restore disabled when all available', () => { /* used=0, press 'Restore L1' → not called */ })
// StatTile.test.tsx
test('long value fits on one line', () => {
  render(<StatTile label="HP" value="120/120" />)
  expect(screen.getByText('120/120').props.numberOfLines).toBe(1)
})
// ContentCard.test.tsx
test('long title truncates', () => { /* 40-char title → numberOfLines 1 */ })
// SectionHeader.test.tsx
test('collapsible hides children and remembers by id', () => { /* press header → child not rendered; remount same id → still collapsed */ })
```
- [ ] **Step 2: Run** `npx jest __tests__/components/game` → FAIL.
- [ ] **Step 3:** Implement per Interfaces using only Task 3 components and token classes.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(ui): game components (resource tracker, stat tile, sheets)`

### Task 5: Token enforcement check

**Files:**
- Create: `scripts/check-tokens.mjs`, `__tests__/scripts/check-tokens.test.ts`, `__tests__/scripts/fixtures/{good.tsx,bad.tsx}`
- Modify: `package.json` (`"lint:tokens": "node scripts/check-tokens.mjs"`, `"test": "npm run lint:tokens && jest"`)

**Interfaces:**
- Produces: `checkFiles(paths: string[]): Violation[]` (exported for tests; `Violation = { file: string; line: number; rule: 'hex-literal'|'rgb-literal'|'inline-style'|'arbitrary-value'|'off-scale'; text: string }`); CLI exits 1 and prints violations.
- Scanned roots (constant `ENFORCED_ROOTS`): `src/features`, `src/components/game`, `src/systems` at this point; Task 20 adds `app`. Exempt: `src/lib/theme.ts`, `src/components/ui/**`, `global.css`, `tailwind.config.js`.
- Rules: `#[0-9a-fA-F]{3,8}\b` in TS/TSX; `rgba?\(`; `style={{` containing `color|backgroundColor|fontSize|padding|margin|gap|borderRadius`; className with `-\[`; className spacing utilities using a step not in the scale (e.g. `p-5`, `gap-10`, `mt-0.5`).

- [ ] **Step 1: Write failing tests**: `bad.tsx` (one of each rule) → 5 violations with the right `rule`s; `good.tsx` (tokens only) → `[]`; a hex inside a comment is still flagged (keep it simple).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3:** Implement as line-based regex scan.
- [ ] **Step 4: Run** tests → PASS; `npm run lint:tokens` → exit 0 on current roots.
- [ ] **Step 5: Commit** `chore: enforce design tokens in feature code`

## Phase B — Game systems

### Task 6: GameSystem interface, registry, D&D 5e module

**Files:**
- Create: `src/systems/types.ts`, `src/systems/registry.ts`, `src/systems/resources.ts`, `src/systems/dnd5e-2024/{index.ts,definition.ts,schemas.ts,rules.ts,builder.ts}`
- Test: `__tests__/systems/resources.test.ts`, `__tests__/systems/dnd5e-2024/rules.test.ts`, `__tests__/systems/dnd5e-2024/schemas.test.ts`
- Source to port: `src/modules/character/character.utils.ts` + `__tests__/modules/character/character.utils.test.ts` (keep every existing assertion), constants from `character.types.ts` (`ABILITY_KEYS`, `ABILITY_LABELS`, `STANDARD_ARRAY`, `ALIGNMENTS`).

**Interfaces (Produces — every later task depends on these exact names):**
```ts
// src/systems/types.ts
import type { ResourceTint } from '@/components/game/ResourceTracker'  // defined in Task 4
export type SystemId = 'dnd5e-2024' | 'daggerheart'
export type StatDef = { key: string; label: string; short: string; min: number; max: number; default: number }
export type PoolValue  = { current: number; max: number; temp?: number }
export type SlotsValue = { tiers: Record<string, { max: number; used: number }> }   // single-tier resources use tier '1'
export type ResourceValue = PoolValue | SlotsValue
export type ResourceDef =
  { key: string; label: string; kind: 'pool'; display: 'bar' | 'counter'; tint?: ResourceTint } |
  { key: string; label: string; kind: 'slots'; display: 'pips'; tierLabel?: (tier: string) => string; tint?: ResourceTint }
export type FieldDef = { key: string; label: string; type: 'text'|'longtext'|'number'|'boolean'|'select'|'multiselect'; options?: string[]; required?: boolean }
export type ContentKindDef = { kind: string; label: string; plural: string; schema: z.ZodTypeAny; fields: FieldDef[]; homebrew: boolean; isItem: boolean; parentKind?: string }
export type CharacterRecord = { id: string; system_id: SystemId; name: string; level: number; stats: Record<string, number>; resources: Record<string, ResourceValue>; conditions: string[]; details: Record<string, unknown> }
export type PickRecord = { content_id: string; kind: string; state: Record<string, unknown>; acquired_at_level: number; content: { name: string; data: unknown } }
export type DerivedValue = { key: string; label: string; value: number | string; format?: 'modifier' | 'plain' }
export type BuilderStepDef = { id: string; title: string; component: React.ComponentType<BuilderStepProps>; isComplete(draft: Draft): boolean; skip?(draft: Draft): boolean }
export type BuilderStepProps = { draft: Draft; update(patch: Partial<Draft>): void }
export type Draft = Record<string, unknown>
export type NewCharacter = Omit<CharacterRecord, 'id'> & { picks: Array<Pick<PickRecord, 'content_id' | 'kind' | 'state' | 'acquired_at_level'>> }
export interface GameSystem {
  id: SystemId; name: string; hidden?: boolean
  stats: StatDef[]; resources: ResourceDef[]; conditions: string[]
  contentKinds: Record<string, ContentKindDef>
  schemas: { stats: z.ZodTypeAny; resources: z.ZodTypeAny; details: z.ZodTypeAny }
  builder: { steps: BuilderStepDef[]; initialDraft(): Draft; pruneDraft(draft: Draft, changed: Partial<Draft>): Draft; toCharacter(draft: Draft): NewCharacter }
  rules: {
    derived(c: CharacterRecord, picks: PickRecord[]): DerivedValue[]
    rest(c: CharacterRecord, kind: 'short' | 'long', picks: PickRecord[]): Record<string, ResourceValue>
    levelUp?(c: CharacterRecord, picks: PickRecord[], input: Record<string, unknown>): Pick<CharacterRecord, 'level' | 'resources'>
  }
  sheet?: { sections?: Record<string, React.ComponentType<{ character: CharacterRecord; picks: PickRecord[] }>> }  // per-system sheet sections, e.g. D&D 'proficiencies'
}
// src/systems/registry.ts
export function getSystem(id: SystemId): GameSystem      // throws `Unknown game system: ${id}`
export const SYSTEMS: GameSystem[]
// src/systems/resources.ts — pure, clamped
export function spendSlot(v: SlotsValue, tier: string): SlotsValue     // used+1, capped at max
export function restoreSlot(v: SlotsValue, tier: string): SlotsValue   // used-1, floored at 0
export function adjustPool(v: PoolValue, delta: number): PoolValue     // damage eats temp first; current clamped to [0, max]
export function setTemp(v: PoolValue, temp: number): PoolValue        // temp >= 0, does not stack (max of old/new)
```
- D&D definition values: stats = the six abilities (min 1, max 30, default 10); resources = `hp` (pool, bar), `spell_slots` (slots, pips, tier label `Level N`, tint `sky`), `hit_dice` (pool, counter), `death_saves_success`/`death_saves_failure` (slots, pips, tier '1', max 3); conditions = the 15 SRD 5.2 conditions + `concentrating`; content kinds `class, subclass(parent class), species, background, feat, spell, item, magic_item` with `homebrew: true` for all but `class`.
- `rules.derived` returns at least: six modifiers (`format: 'modifier'`), `proficiency`, `ac` (10 + DEX mod + equipped armor/shield from picks/items data when present), `initiative`, `passive_perception`, `speed` (from species pick).
- `rules.rest('long')` restores hp to max, all spell slot tiers to used 0, half hit dice (min 1); `'short'` restores Warlock slots only.
- Spell slot table: standard SRD full/half/pact caster table; `slotsFor(className: string, level: number): SlotsValue` exported from `rules.ts`.

- [ ] **Step 1: Write failing tests**
```ts
// resources.test.ts
test('spendSlot caps at max', () => expect(spendSlot({tiers:{'1':{max:2,used:2}}},'1').tiers['1'].used).toBe(2))
test('restoreSlot floors at 0', () => expect(restoreSlot({tiers:{'1':{max:2,used:0}}},'1').tiers['1'].used).toBe(0))
test('two spends apply twice', () => expect(spendSlot(spendSlot({tiers:{'1':{max:4,used:0}}},'1'),'1').tiers['1'].used).toBe(2))
test('damage eats temp first', () => expect(adjustPool({current:10,max:20,temp:5},-8)).toEqual({current:7,max:20,temp:0}))
test('healing caps at max', () => expect(adjustPool({current:18,max:20},5).current).toBe(20))
test('hp never negative', () => expect(adjustPool({current:3,max:20},-50).current).toBe(0))
// dnd5e rules.test.ts — port all existing character.utils assertions, plus:
test('wizard 5 slots', () => expect(slotsFor('Wizard',5).tiers).toEqual({'1':{max:4,used:0},'2':{max:3,used:0},'3':{max:2,used:0}}))
test('paladin 1 has no slots', () => expect(slotsFor('Paladin',1).tiers).toEqual({}))
test('warlock 5 pact slots', () => expect(slotsFor('Warlock',5).tiers).toEqual({'3':{max:2,used:0}}))
test('long rest restores slots and hp', () => { /* character with hp 3/30, slots used → rest('long') hp 30/30, all used 0 */ })
test('derived modifiers', () => { /* STR 15 → +2, DEX 8 → -1 */ })
// schemas.test.ts
test('spell content data validates', () => { /* sample SRD spell data parses; missing `level` fails */ })
test('stats schema rejects 31', () => {})
```
- [ ] **Step 2: Run** `npx jest __tests__/systems` → FAIL.
- [ ] **Step 3:** Implement. Builder step components are placeholders (`() => null`) in this task — Task 13 fills them; `builder.steps` ids: `class, origin, ability-scores, spells, details, personality, review` (`spells.skip` when class has no slots at starting level). `pruneDraft`: when `class_id` changes, drop `spell_ids` not in the new class list and reset `subclass_id`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(systems): GameSystem interface and D&D 5e 2024 module`

### Task 7: Daggerheart stub check

**Files:**
- Create: `src/systems/daggerheart/{index.ts,definition.ts,schemas.ts}`, `__tests__/systems/daggerheart/stub.test.ts`
- Modify: `src/systems/registry.ts` (register it with `hidden: true` so UI pickers skip it; `visibleSystems()` helper returns `SYSTEMS.filter(s => !s.hidden)`)

**Interfaces:**
- Consumes: Task 6 types.
- Produces: `daggerheart: GameSystem` with stats `agility strength finesse instinct presence knowledge` (min -5, max 8, default 0); resources `hp` (slots, pips, tint `plum`), `stress` (slots, pips), `armor` (slots, pips), `hope` (pool, counter, max 6), `evasion` in `details`; content kinds `ancestry, community, class, subclass(parent class), domain_card`; `rules` return `[]` / unchanged resources; builder steps `[]`.

- [ ] **Step 1: Write failing test**
```ts
test('daggerheart satisfies GameSystem', () => { const s: GameSystem = getSystem('daggerheart'); expect(s.stats).toHaveLength(6) })
test('sample character fits the generic row shape', () => {
  const row = { system_id: 'daggerheart', name: 'Wren', level: 1,
    stats: { agility: 2, strength: -1, finesse: 1, instinct: 0, presence: 1, knowledge: 0 },
    resources: { hp: { tiers: { '1': { max: 6, used: 1 } } }, stress: { tiers: { '1': { max: 6, used: 0 } } }, armor: { tiers: { '1': { max: 3, used: 0 } } }, hope: { current: 2, max: 6 } },
    conditions: [], details: { evasion: 10, experiences: ['Wilderness guide +2'] } }
  expect(daggerheart.schemas.stats.parse(row.stats)).toEqual(row.stats)
  expect(daggerheart.schemas.resources.parse(row.resources)).toEqual(row.resources)
})
test('sample domain card fits content.data', () => {
  const data = { domain: 'Sage', level: 1, recall_cost: 1, type: 'spell', text: '…' }
  expect(daggerheart.contentKinds.domain_card.schema.parse(data)).toEqual(data)
})
test('loadout/vault fits character_picks.state', () => { /* state { location: 'loadout' } parses via a pick-state schema exported from schemas.ts */ })
```
- [ ] **Step 2: Run** → FAIL. **Step 3:** Implement. **Step 4: Run** → PASS; `npx tsc --noEmit` clean for `src/systems`.
- [ ] **Step 5: Commit** `test(systems): Daggerheart stub proves the model is generic`

## Phase C — Database

> Local stack: start Docker Desktop, then `npx supabase start`. If Docker can't run, create a Supabase dev branch with the MCP `create_branch` tool and run the same migrations/tests there.

### Task 8: Export SRD data to JSON (before anything is reset)

**Files:**
- Create: `scripts/seed/export-srd.ts`, `supabase/seed/dnd5e-2024/{class,subclass,species,background,feat,spell,item,magic_item}.json`
- Delete: `supabase/seed/srd_seed.sql` (after export verified)

**Interfaces:**
- Produces: JSON arrays of `{ slug: string; name: string; summary?: string; description?: string; parent_slug?: string; data: <kind schema> }`, sorted by slug. `slug` = kebab-case name; subclasses `parent_slug` = class slug.

- [ ] **Step 1:** Write `export-srd.ts` that reads the **current remote** tables (`classes, subclasses, species, backgrounds, feats, spells, equipment, magic_items`) via supabase-js with the service key from env (or the MCP `execute_sql` tool, saving results), maps each row into the shape above, and validates every `data` with `getSystem('dnd5e-2024').contentKinds[kind].schema`.
- [ ] **Step 2: Run** `npx tsx scripts/seed/export-srd.ts` → writes 8 files; print counts. Expected counts equal `select count(*)` per old table (record them in the commit message). Any schema failure → fix the schema in Task 6's `schemas.ts`, not the data.
- [ ] **Step 3: Commit** `chore(seed): export D&D SRD content to JSON`

### Task 9: New schema, RLS, seed generator, pgTAP tests

**Files:**
- Delete: all of `supabase/migrations/*`
- Create: `supabase/migrations/20261101000001_foundation.sql` (extensions, `set_updated_at()`, `is_campaign_member(uuid)`, `is_campaign_gm(uuid)` — `security definer`, `set search_path = ''`), `…02_profiles_systems_content.sql`, `…03_characters.sql`, `…04_campaigns.sql`, `…05_rls.sql`, `…06_rpc.sql`
- Create: `scripts/seed/build-seed.ts` → writes `supabase/seed.sql` (game_systems rows + all content JSON); `package.json` script `"db:seed": "tsx scripts/seed/build-seed.ts"`
- Create: `supabase/tests/{rls_content,rls_characters,rls_campaigns,rpc_join}.test.sql` (pgTAP)

**Interfaces:**
- Tables and columns exactly per spec §5.2, conventions §5.3. Additions decided here:
  - `content.slug` not null; partial unique indexes `(system_id, kind, slug) where owner_id is null and campaign_id is null` and `(owner_id, system_id, kind, slug) where owner_id is not null`.
  - `character_picks` primary key `(character_id, content_id)`; `character_items.id uuid` pk (same item may appear twice with different notes).
  - `campaigns.invite_code text unique not null default` 6-char uppercase alphanumeric generated by `gen_invite_code()`.
  - `handle_new_user()` trigger on `auth.users` insert creates `profiles` row (`username` from metadata, falling back to email local-part + 4 random digits).
- RPC (Produces, used by Task 11/19):
  - `join_campaign(p_code text, p_character_id uuid) returns uuid` (campaign id). Raises with SQLSTATE `P0001` and messages exactly: `invalid_code`, `already_member`, `system_mismatch`, `not_your_character`.
  - `create_campaign(p_name text, p_system_id text, p_description text default null) returns campaigns` — inserts campaign + GM membership row atomically.
- RLS per spec §5.4.

- [ ] **Step 1: Write failing pgTAP tests** (each file `begin; select plan(n); … select * from finish(); rollback;`, users created with `tests.create_supabase_user` / `authenticate_as` helpers from `basejump-supabase_test_helpers`, or inline `set local role authenticated; set local request.jwt.claims …`):
  - `rls_content`: official row visible to anon-authenticated user; A's homebrew invisible to B; campaign item visible to member, invisible to non-member; B cannot update A's homebrew; GM can insert campaign item, player cannot.
  - `rls_characters`: owner CRUD; stranger sees nothing; GM of a campaign the character is in can read character, picks and items but not update.
  - `rls_campaigns`: member reads campaign + members; non-member reads nothing; player can update only own membership row.
  - `rpc_join`: valid join returns campaign id and creates `active` membership; bad code → `invalid_code`; second join → `already_member`; Daggerheart-system campaign + D&D character → `system_mismatch`; someone else's character → `not_your_character`.
- [ ] **Step 2: Run** `npx supabase db reset && npx supabase test db` → FAIL (tables missing).
- [ ] **Step 3:** Write migrations and `build-seed.ts` (validates each JSON row with the system schema before emitting; emits `insert … on conflict do nothing` in dependency order: systems → classes → subclasses (resolving `parent_slug`) → rest). Run `npm run db:seed`.
- [ ] **Step 4: Run** `npx supabase db reset && npx supabase test db` → all pass; `select kind, count(*) from content group by kind` matches Task 8 counts.
- [ ] **Step 5: Commit** `feat(db): system-agnostic schema, RLS, RPCs and seed`

### Task 10: Reset remote, regenerate types

**Files:**
- Modify: `src/types/database.types.ts` (generated)

- [ ] **Step 1:** Ask the user: "Ready to wipe and reset the remote Supabase project `rptykudqeeimpibezxxz` to the new schema?" — proceed only on yes.
- [ ] **Step 2:** `npx supabase link --project-ref rptykudqeeimpibezxxz` then `npx supabase db reset --linked` (loads migrations + `seed.sql`).
- [ ] **Step 3:** Run MCP `get_advisors` (security and performance) → no `ERROR` level items; fix any via a new migration and re-run Task 9 Step 4.
- [ ] **Step 4:** `npx supabase gen types typescript --linked > src/types/database.types.ts`; `npx tsc --noEmit` → errors only in `src/modules/**` and legacy screens (expected; they're replaced in Phase D/E).
- [ ] **Step 5: Commit** `chore(db): reset remote and regenerate types`

## Phase D — Data layer and shell

### Task 11: Feature data hooks (TanStack Query)

**Files:**
- Create: `src/lib/query-client.ts`, `src/features/auth/{AuthProvider.tsx,useAuth.ts,auth.api.ts}` (moved from `src/modules/auth`), `src/features/content/content.api.ts`, `src/features/characters/{characters.api.ts,characters.queries.ts}`, `src/features/campaigns/{campaigns.api.ts,campaigns.queries.ts}`, `src/features/errors.ts`
- Test: `__tests__/features/{auth,content,characters,campaigns}/*.test.ts(x)` (port relevant cases from `__tests__/modules/**`, mocking `@/lib/supabase` the same way)

**Interfaces (Produces):**
```ts
// query keys
export const qk = { content: (systemId, kind, scope) => ['content', systemId, kind, scope], character: (id) => ['character', id], characters: ['characters'], campaigns: ['campaigns'], campaign: (id) => ['campaign', id] }
// content.api.ts
listContent(params: { systemId: SystemId; kind: string; scope: 'all' | 'official' | 'mine' | { campaignId: string }; search?: string }): Promise<ContentRow[]>
getContent(id: string): Promise<ContentRow>
saveHomebrew(input: { id?: string; systemId: SystemId; kind: string; name: string; summary?: string; description?: string; data: unknown; parentId?: string }): Promise<ContentRow>  // validates data with the kind schema; slug from name
deleteHomebrew(id: string): Promise<void>
// characters.api.ts
listCharacters(): Promise<CharacterSummary[]>          // id, name, level, system_id, class name, hp
getCharacter(id: string): Promise<CharacterFull>      // CharacterRecord + picks (with content) + items (with content)
createCharacter(input: NewCharacter): Promise<string> // inserts character then picks; on picks failure deletes the character
updateResources(id: string, resources: Record<string, ResourceValue>): Promise<void>
updateCharacter(id: string, patch: Partial<Pick<CharacterRecord,'name'|'level'|'stats'|'conditions'|'details'|'resources'>>): Promise<void>
addItem(characterId: string, contentId: string, quantity: number): Promise<void>
updateItem(itemId: string, patch: { quantity?: number; equipped?: boolean; attuned?: boolean; notes?: string }): Promise<void>
removeItem(itemId: string): Promise<void>
// characters.queries.ts — hooks wrapping the above; useResourceMutation(characterId) does optimistic update via setQueryData with an updater fn (so rapid taps compose), rollback on error
// campaigns.api.ts
listMyCampaigns(): Promise<CampaignSummary[]>
getCampaign(id: string): Promise<CampaignFull>        // campaign + members (profile username, character name)
createCampaign(input: { name: string; systemId: SystemId; description?: string }): Promise<string>  // rpc create_campaign
joinCampaign(code: string, characterId: string): Promise<string>                                   // rpc join_campaign
// errors.ts
export class AppError extends Error { code: 'invalid_code'|'already_member'|'system_mismatch'|'not_your_character'|'network'|'unknown' }
export function toAppError(e: unknown): AppError
export const ERROR_COPY: Record<AppError['code'], string>  // user-facing copy, written in Task 19
```
- `ContentRow`, `CharacterSummary`, `CharacterFull`, `CampaignSummary`, `CampaignFull` derive from generated `Database` types; `stats/resources/details` parsed through the character's system schemas in `getCharacter`.

- [ ] **Step 1: Write failing tests** — at minimum: `saveHomebrew` rejects invalid `data` without calling supabase; `createCharacter` deletes the character when picks insert fails; `joinCampaign` maps a `P0001 system_mismatch` error to `AppError('system_mismatch')`; `useResourceMutation` applied twice in quick succession (second before first resolves) leaves `used` incremented by 2 in cache; rollback restores previous cache on error.
- [ ] **Step 2: Run** `npx jest __tests__/features` → FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(data): query hooks for content, characters, campaigns`

### Task 12: App shell, navigation, auth screens

**Files:**
- Modify: `app/_layout.tsx` (QueryClientProvider, AuthProvider from `src/features/auth`), `app/(app)/_layout.tsx`, `app/(auth)/{_layout,login,signup}.tsx`
- Create: `app/(app)/campaigns/_layout.tsx` (Stack), placeholder `app/(app)/campaigns/index.tsx` (filled in Task 19)
- Test: `__tests__/app/auth.test.tsx`

**Interfaces:**
- Main tabs: `Characters` (phosphor `Sword`), `Campaigns` (`UsersThree`), `Homebrew` (`BookOpen`, route stays `content`). Tab bar colours from `NAV_THEME`; hidden inside a character sheet as today. Replace `SafeAreaView` background literal with `bg-background`.
- Auth screens: `ScreenBackground`, `display` heading, `Input`, `Button` primary full width, errors as `caption tone="destructive"` under the field.

- [ ] **Step 1: Write failing test**: login with empty email shows "Enter your email" caption and doesn't call `signIn`; failed sign-in shows the returned message.
- [ ] **Step 2: Run** → FAIL. **Step 3:** Implement. **Step 4:** PASS; simulator: log in, tabs visible in light/dark.
- [ ] **Step 5: Commit** `feat(app): new shell, tabs and auth screens`

## Phase E — Screens

Every screen in this phase: `ScreenBackground` + game/ui components + `Text` variants only; loading state = skeleton cards (`bg-muted` blocks), error state = `caption` message + `outline` "Try again" button, empty state = `display`/`body-sm` + one action. Add the new files to the token check as they land (they're under `src/features` or `app/`; `app/` is enforced in Task 20).

### Task 13: Character list + builder wizard (behaviour of `25b2099`)

**Files:**
- Modify/replace: `app/(app)/characters/index.tsx`, `app/(app)/characters/new/_layout.tsx`
- Create: `app/(app)/characters/new/index.tsx` (system picker — skipped when only one visible system), `app/(app)/characters/new/[step].tsx`, `src/features/characters/builder/{builder.store.ts,WizardProgress.tsx}`, `src/systems/dnd5e-2024/steps/{ClassStep,OriginStep,AbilityScoresStep,SpellsStep,DetailsStep,PersonalityStep,ReviewStep}.tsx`
- Delete: `app/(app)/characters/new/{class,origin,ability-scores,spells,details,personality,review}.tsx`, `src/modules/character/character.store.ts`, `src/components/character/WizardProgress.tsx`
- Test: `__tests__/features/characters/builder.store.test.ts`, `__tests__/systems/dnd5e-2024/steps.test.tsx`

**Interfaces:**
- Consumes: `GameSystem.builder` (Task 6), `listContent`, `createCharacter` (Task 11).
- Produces: `useBuilderStore`: `{ systemId: SystemId | null; draft: Draft; start(systemId): void; update(patch): void /* runs system.builder.pruneDraft */; reset(): void }`.
- Behaviour to match (read `git show 25b2099`): progress "Step X of N" + segmented bar; Class step grouped Martial/Support/Caster (grouping table lives in `dnd5e-2024/steps/ClassStep.tsx`), hit-die badge, tagline, expand-on-select details + subclass pick; Ability scores tap-to-expand rows, inline value picker (standard array / point buy as today), live modifier; Personality 3×3 alignment grid with field hints; Spells live search + `Ritual`/`Concentration` badges, limits from `getSpellLimits`; Details keyboard-safe with name preview; Review hero card with quick stats, peak ability highlighted, checklist of incomplete steps (tapping one jumps to it); list cards with HP bar and empty state "No characters yet" + "Create character". Footer "Continue" is the `primary` button; "Create character" on Review is the screen's `highlight` button.

- [ ] **Step 1: Write failing tests**: `update({class_id: other})` drops spells not in the new class and resets `subclass_id`, keeps `name` and stats; `skip` hides Spells for a Fighter; Review "Create" disabled until every `isComplete` is true; spells search filters by name case-insensitively.
- [ ] **Step 2: Run** → FAIL. **Step 3:** Implement. **Step 4:** PASS; simulator: create a level-1 Wizard end to end.
- [ ] **Step 5: Commit** `feat(characters): system-driven builder wizard`

### Task 14: Sheet — Character tab

**Files:**
- Modify: `app/(app)/characters/[id]/_layout.tsx` (theme colours, tab icons unchanged), `app/(app)/characters/[id]/index.tsx`
- Create: `src/features/characters/sheet/{SheetHeader,VitalsSection,StatsSection,ProficienciesSection,ConditionsSection,HpSheet,ConditionsSheet}.tsx`
- Test: `__tests__/features/characters/sheet/vitals.test.tsx`

**Interfaces:**
- Consumes: `getCharacter` hook, `getSystem(c.system_id)`, `rules.derived`, `adjustPool`, `useResourceMutation`, `updateCharacter`.
- Layout (top to bottom, matches Figma): header (label "Your character", `title` name, `body-sm` class line, chips species/level/proficiency, XP bar if `details.xp`); Vitals (`StatTile`s HP (highlight tone), AC, Passive, Speed; row: `outline` "+ Bonus HP", `highlight` "Spend inspiration" when `details.inspiration`); Conditions (chips + edit → `ConditionsSheet`); Ability scores (3×2 `StatTile`s, modifier as value, score as `sub`); Skills and Saving throws (D&D module registers `ProficienciesSection` as `sheet.sections.proficiencies`; generic sheet renders it when present). HP tile press → `HpSheet` (`AdjustSheet` with amount input, −/+ , Reset / Confirm).

- [ ] **Step 1: Write failing tests**: HpSheet confirm with −8 on `{current:10,max:20,temp:5}` calls mutation with `{current:7,max:20,temp:0}`; conditions sheet applies two selections and the button reads "Apply (2)".
- [ ] **Step 2–4:** FAIL → implement → PASS; simulator check against `blend-v4.html`.
- [ ] **Step 5: Commit** `feat(sheet): character tab on new components`

### Task 15: Sheet — Actions tab with spell slot tracking

**Files:**
- Modify: `app/(app)/characters/[id]/actions.tsx`
- Create: `src/features/characters/sheet/{ActionsList,SpellSlotsSection,RestButtons}.tsx`
- Test: `__tests__/features/characters/sheet/actions.test.tsx`

**Interfaces:**
- Segmented `Tabs` Actions / Bonus / Reactions; each a list of `ContentCard`s built from picks (weapons from equipped items, spells by `data.casting_time`) with tags (`Weapon`, damage, `Spell`, `Level N slot`); spell cards with a slot cost get a `ghost` "Use" action that calls `spendSlot` on the lowest available tier ≥ spell level.
- `SpellSlotsSection`: one `ResourceTracker display="pips"` per tier from `resources.spell_slots`; collapsible.
- `RestButtons`: `outline` "Short rest", `primary` "Long rest" → confirm `Dialog` → `rules.rest`.

- [ ] **Step 1: Write failing tests**: "Use" on a level-1 spell with tier 1 exhausted spends tier 2; "Use" disabled with an explanatory `caption` when no tier ≥ level has slots; long rest resets every tier `used` to 0.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(sheet): actions tab and spell slot tracking`

### Task 16: Sheet — Inventory tab with add-item picker

**Files:**
- Modify: `app/(app)/characters/[id]/inventory.tsx`
- Create: `src/features/characters/sheet/{InventoryList,AddItemSheet}.tsx`
- Test: `__tests__/features/characters/sheet/inventory.test.tsx`
- Delete: `src/modules/inventory/**`, `src/modules/campaign/**`

**Interfaces:**
- Sub-tabs (segmented) All / Equipped / Magic; rows = `ContentCard` with quantity, equipped toggle, attuned toggle for `requires_attunement`, swipe or menu to remove.
- `AddItemSheet`: search input; source filter chips `SRD` / `My homebrew` / campaign name (only when the character is in a campaign); results from `listContent({ kind: 'item' | 'magic_item', scope })`; quantity stepper (1–99); `primary` "Add to inventory".
- Max 3 attuned items (D&D rule from system module) — toggle disabled with caption at 3.

- [ ] **Step 1: Write failing tests**: search "rope" shows only matching items; adding with quantity 3 calls `addItem(charId, contentId, 3)`; fourth attunement toggle disabled.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(sheet): inventory with add-item picker`

### Task 17: Level up

**Files:**
- Modify: `app/(app)/characters/[id]/level-up.tsx`
- Test: `__tests__/systems/dnd5e-2024/levelup.test.ts`

**Interfaces:**
- Consumes/implements: `dnd5e.rules.levelUp(c, picks, { hpMethod: 'average' | 'roll', roll?: number, subclassId?: string })` → new `level`, `hp.max` (+avg or roll + CON mod, min 1), `spell_slots` recomputed via `slotsFor` preserving `used` counts capped at new max.
- Screen: `ScreenBackground`, summary of gains, HP method choice, subclass pick at the class's subclass level, `highlight` "Level up".

- [ ] **Step 1: Write failing tests**: Wizard 4→5 average with CON +2 adds 6 HP and a tier-3 slot pair; `used` preserved.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(sheet): system-driven level up`

### Task 18: Homebrew content screens

**Files:**
- Modify: `app/(app)/content/{index,new,[id]}.tsx`
- Create: `src/features/content/{ContentForm.tsx,KindPicker.tsx}`
- Delete: `src/modules/user_content/**`, `src/modules/srd/**`
- Test: `__tests__/features/content/ContentForm.test.tsx`

**Interfaces:**
- List: system filter (hidden while one visible system), kind chips from `contentKinds` where `homebrew`, my items as `ContentCard`s, empty state "No homebrew yet" + "Create".
- `ContentForm({ systemId, kind, initial?, onSaved })`: renders `FieldDef[]` (text → `Input`, longtext → multiline `Input`, number, boolean switch, select/multiselect → `Select`/chips); validates with the kind schema; field errors as `caption tone="destructive"`; `primary` Save, `destructive` Delete (with `Dialog` confirm) on edit.
- A homebrew spell must appear in the builder Spells step and `AddItemSheet` (via `scope: 'all'`).

- [ ] **Step 1: Write failing tests**: spell form missing `level` shows field error and doesn't call `saveHomebrew`; valid submit calls it with `data.level` as a number.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(content): schema-driven homebrew editor`

### Task 19: Campaigns

**Files:**
- Modify: `app/(app)/campaigns/index.tsx`, `app/(app)/characters/[id]/campaign.tsx`
- Create: `app/(app)/campaigns/{new,join,[id]}.tsx`, `src/features/campaigns/{CampaignCard,InviteCode,MemberList}.tsx`
- Test: `__tests__/features/campaigns/join.test.tsx`

**Interfaces:**
- List: my campaigns (role chip GM/Player, system chip, member count), actions `primary` "New campaign", `outline` "Join with code".
- New: name, system (`Select` of visible systems), description → `createCampaign` → navigate to detail.
- Join: 6-char code input (auto-uppercase), character `Select` listing all my characters (a system mismatch is reported by the server, so the error copy stays accurate) → `joinCampaign`. Errors via `ERROR_COPY`: `invalid_code` "We couldn't find a campaign with that code." · `already_member` "You're already in this campaign." · `system_mismatch` "That character is from a different game system than this campaign." · `not_your_character` "You can only join with your own characters." · `network` "Can't reach the server. Check your connection and try again."
- Detail: name/description, `InviteCode` (label + mono code + copy button, GM only), `MemberList`.
- Sheet Campaign tab: if the character is in a campaign → that campaign's summary + members; else empty state with "Join a campaign" → join screen pre-selecting this character.

- [ ] **Step 1: Write failing tests**: each RPC error code shows its exact copy under the code input; code input uppercases `ab12cd` → `AB12CD`; join button disabled until 6 chars and a character are chosen.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(campaigns): create, join by code, members`

## Phase F — Finish

### Task 20: Remove legacy code, enforce tokens everywhere

**Files:**
- Delete: `src/modules/**`, `__tests__/modules/**`, `src/components/character/**`, `src/stores/**` (if any remain), legacy colours block in `tailwind.config.js`
- Modify: `scripts/check-tokens.mjs` (`ENFORCED_ROOTS` += `app`)

- [ ] **Step 1:** `grep -rn "legacy-\|@/modules\|catppuccin\|#1e1e2e" app src` → no hits (fix any).
- [ ] **Step 2:** `npm test` → token check + all Jest suites pass; `npx tsc --noEmit` → 0 errors.
- [ ] **Step 3:** Inspect old worktrees: `git -C .claude/worktrees/<name> status` and `git log main..<branch>` for each; if nothing beyond `25b2099` is unique and uncommitted changes are empty, `git worktree remove` each and delete branches `claude/serene-bohr-c7633c`, `claude/youthful-wiles-66e336`, `claude/nice-wescoff-08e860`. If anything else is unique or dirty, stop and ask the user.
- [ ] **Step 4: Commit** `chore: remove legacy modules and enforce tokens across app`

### Task 21: End-to-end verification

- [ ] **Step 1:** `npx supabase db reset && npx supabase test db` → pass. `npm test` → pass. `npx tsc --noEmit` → 0.
- [ ] **Step 2:** iOS simulator, **light then dark**, fresh account: sign up → log in → create a level-1 Wizard through every step (go back from Spells to Class and switch to Fighter, confirm Spells step disappears and chosen spells are gone; switch back) → sheet tabs render → HP −8 then +3 → spend two level-1 slots, restore one → toggle Concentrating → add 3× Rope and a magic item, equip/attune → long rest → level up to 2 → create a homebrew spell and see it in the add-spell list → create a campaign, copy code → from a second account join with that code (also try a wrong code) → Campaign tab shows members. Screenshot each screen into `docs/superpowers/screenshots/2026-11-01/` (committed — they are input to Task 22).
- [ ] **Step 3:** `npx expo start --web` → log in, open the character sheet.
- [ ] **Step 4:** Compare sheet screenshots to `.superpowers/brainstorm/11401-1793535283/content/blend-v4.html` and `spacing-type-v1.html`; list deltas.
- [ ] **Step 5:** Record results in the plan (tick boxes) and commit screenshots: `test: end-to-end verification screenshots`.

### Task 22: UX review and UI review

- [ ] **Step 1:** Dispatch two independent reviewer subagents in parallel, each given the spec, the screenshots from Task 21, and the `app/` + `src/features/` + `src/components/` code:
  - **UX reviewer** (load `anthropic-skills:ux-designer` / `design:design-critique`): flows, hierarchy, empty/loading/error states, touch targets, copy, wizard, campaign join, resource tracking.
  - **UI reviewer** (load `anthropic-skills:ui-designer` / `anthropic-skills:design-review`): adherence to §4 — tokens, spacing scale jobs, type roles, card borders, glow, one highlight action per screen, light/dark parity.
  Each returns a findings list with severity High/Medium/Low, screen, and suggested fix. Neither edits code.
- [ ] **Step 2:** Show the user both lists. Fix all High/Medium findings (each fix: failing test where testable → fix → pass → commit `fix(ui): …` / `fix(ux): …`); defer only with the user's OK, noted in the spec under a new "Deferred" heading.
- [ ] **Step 3:** Re-run Task 21 Step 1 and re-screenshot changed screens.
- [ ] **Step 4: Commit** `docs: record design review outcomes`
