# Shop and pack presentation

**Status:** The list screen is **Built** (read-only). Pack detail, previews and purchase are **Proposed**.

## What exists today

A read-only screen at `/shop`, reached from the account drawer ("Packs").
- Lists published packs by name, with a one-line description and an "Art by …" credit.
- Each pack shows either an **Owned** badge or a **disabled "Coming soon" button**. There is no purchase flow yet.
- Has loading, error (with Try again) and empty ("No packs yet") states.
- Code: `app/(app)/shop/index.tsx`, `src/features/packs/PackCard.tsx`. Data: `src/features/packs/packs.queries.ts`.

## Where it should go

### 1. Pack detail

Tapping a pack opens a detail screen:
- Cover art and name; the kind (content, art, theme) as a plain label.
- **What's inside:** counts and a few named examples ("3 subclasses, 12 monsters, 8 items, 24 portraits").
- **Preview:** a few real items or pieces of art, openable without buying.
- Artist credit with a link to their page, if they agree.
- Price, with the billing type stated ("one-time purchase" / "included with DM Pro").
- Primary action: Buy / Unlock. If owned: "Open in homebrew" or "Use in a character", not an upsell.

### 2. Organising the shop

| Section | Why |
|---|---|
| **Owned** | First, so people find what they've bought |
| **New** | Latest published |
| **By system / kind** | Content vs art vs themes; filter by game system when more than one is supported |

Keep it small. With three packs, one scrolling list is right. Add sections when there is enough to need them.

### 3. Showing locked content elsewhere

Locked pack items should be visible but flagged in places like the content pickers, so people know a thing exists without being able to tap into an error. This needs the shop's entitlement data in the picker, which today only sees what the database lets it read (unowned pack content isn't returned at all). Decide whether the picker should show a "locked" placeholder row. See [Paywall and upgrade UX](paywall-and-upgrade-ux.md).

### 4. Art, in the app

Portraits and tokens appear on the character sheet and campaign party cards. Art needs a proper place to live and be cached: see [Art storage and delivery](../engineering/art-storage-and-delivery.md). A character choosing a portrait from an owned pack should be as easy as picking any other option.

## Visual language

The shop follows the Night Vigil design system (one dark palette, posterized shapes, token-only styling). It should feel like a shelf in the same world as the rest of the app, not a separate storefront. A pack card is a normal `Card`; the Owned badge is the existing accent `Badge`. Don't introduce new colours for the shop.

## States to design

Empty (no packs), loading, error, offline (cached list with a note), owned, locked, lapsed, purchase in progress, purchase failed, purchase succeeded (confirm and show where to find it).

## Open questions

- Is the shop a tab, or does it stay inside the account drawer? Today it's deliberately not a tab. Revisit once there are enough packs to be worth a tab.
- How do we show a pack's price when store pricing varies by region? Always use the store's own formatted price, not a hardcoded one.
