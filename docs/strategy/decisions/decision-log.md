# Decision log

One row per decision. Keep the reason: six months from now it is the reason that matters. When a decision changes, do not delete the row. Mark it **Superseded** and add a new row that points back.

| # | Decision | Why | Status | Where it lives |
|---|---|---|---|---|
| D1 | The core loop (build a character, join a campaign, play) stays free. | It is what brings people in and lets a DM invite a table. Charging for it would remove the growth loop. | Decided | [Revenue model](../business/revenue-model.md) |
| D2 | **DMs pay, players are free.** A paying DM brings 3 to 5 free players. | The DM is the buyer at a table and the person with a reason to spend. Free players make every sale also a distribution event. | Decided | [Revenue model](../business/revenue-model.md) |
| D3 | We never sell Wizards of the Coast's non-SRD content (most PHB subclasses, many spells). | It is their copyright and likely gets us removed from the App Store. Packs carry original, licensed, or user-entered content only. | Decided | [Content licensing](../legal/content-licensing.md) |
| D4 | Access to pack content is enforced in the database (RLS), not in the app. | Client-only checks are easy to bypass. | **Built** | [Entitlements architecture](../engineering/entitlements-architecture.md) |
| D5 | Only the server (service role) writes entitlements. Clients can read their own and nothing else. | A client must never be able to grant itself a pack. | **Built** | Migration `20261102000003_packs.sql` |
| D6 | **Lapse rule:** content already on a character you own stays readable and editable after an entitlement lapses. You just can't add new pack content. | Never lock people out of characters they already made. Losing a subscription must not break a sheet at the table. | **Built** | [Entitlements architecture](../engineering/entitlements-architecture.md) |
| D7 | Themes are not part of the first release. | The Night Vigil design is one dark palette locked by tests, and `THEME_COLORS` is imported in about 57 places. Switchable themes need their own spec. | Decided | [Themes and cosmetics](../design/themes-and-cosmetics.md) |
| D8 | No ads. | They hurt a tool people use at the table and earn little at small scale. | Decided | [Revenue model](../business/revenue-model.md) |
| D9 | Art for paid packs is commissioned from human artists. No generated art. | The audience is often strongly against it, and commissioned art is a selling point. | **Proposed** | [Content policy](../content/content-policy.md) |
| D10 | Billing goes through one entitlement layer (a server webhook writes entitlements) regardless of provider. | Lets web and native purchases unlock the same things, and lets us change providers. | **Proposed** | [Billing integration](../engineering/billing-integration.md) |
| D11 | Free tier gets soft limits (character and campaign caps) that block *new* creation only, never existing data. | Same principle as D6. | **Proposed** | [Tier limits and subscriptions](../engineering/tier-limits-and-subscriptions.md) |
| D12 | The first paid pack is one small pack with a single clear audience (for example class portraits), to test whether anyone pays before commissioning more. | Artist commissions are real money. | **Proposed** | [Roadmap](../roadmap/roadmap.md) |

## Open decisions

These need an answer before the work that depends on them starts. Details are in [Risks and open questions](../roadmap/risks-and-open-questions.md).

- Price points for DM Pro and the first pack.
- Billing provider: RevenueCat (store purchases) plus Stripe (web), or a merchant of record.
- Whether the app name can keep "D&D" in it.
- Whether the web app, the native apps, or both are the launch target.
