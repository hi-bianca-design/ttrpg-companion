# Revenue model

**Status:** Decided (the model); Proposed (all prices and numbers).

## Principles

1. **The core loop is free.** Building a character, joining a campaign and playing a session cost nothing. This is the product people recommend to their table.
2. **DMs pay, players don't.** The person running the game has the reason and the budget. Every paying DM brings free players, so each sale is also distribution.
3. **Sell what we can legally sell.** Original content, licensed content, commissioned art, and tools. Never content from outside the SRD. See [Content licensing](../legal/content-licensing.md).
4. **Never take away what someone already made.** A lapsed subscription limits what you can *add*, not what you can *use*. See decisions D6 and D11 in the [decision log](../strategy/decision-log.md).
5. **No ads.** They hurt a tool used at the table and earn little at small scale.
6. **We charge for our work, not for the rules.** There is no full-rulebook tier and none is possible without a direct deal with the publisher (D3, D14). Sync, storage, session tools, original packs and art are ours to sell.
7. **Say what is free, out loud.** The market's loudest complaints are paywalled core tools and distrust of subscription pricing. "Your characters, homebrew and combat tracker are never gated" is a promise worth putting in the store listing.

## Revenue streams

| Stream | What the customer gets | Who buys | Recurring? | Priority |
|---|---|---|---|---|
| **DM Pro subscription** | Campaign and session tools beyond the free caps (more campaigns, larger parties, session history and notes, backup and export), plus a new pack each season | DMs | Yes | 1 |
| **Content packs** | Original subclasses, monsters, items, adventure hooks, with art | Anyone | One-time | 2 |
| **Art packs** | Portrait sets by class or species, tokens, sheet art | Players | One-time | 2 |
| **Themes and cosmetics** | Sheet and app re-skins, dice skins | Anyone | One-time | 3 (blocked, see [Themes](../design/themes-and-cosmetics.md)) |
| **Commissioned character art** | A portrait made for one character | Players | One-time, high price | 4 (later; needs artist capacity) |
| **Tip jar / sponsorship** | Nothing, goodwill | Fans | Optional | Anytime |

## Free vs paid

| | Free | DM Pro (paid) |
|---|---|---|
| Characters | Build, level, play. **Cap on the number you can keep** (hypothesis: 3) | Unlimited |
| Campaigns | Join any. **Run one** (hypothesis) | Run unlimited, larger parties |
| Session tools | Open a session, combat on/off, turns | Session history and notes, richer DM dashboard |
| Homebrew | A limited number of custom items | Unlimited custom content |
| Data | Your characters stay yours | Export and cloud backup |
| Packs | SRD content, plus any packs you buy | One included pack per season, plus any you buy |

The free caps are *hypotheses*. The rule that matters is not the number: caps stop **new** creation and never remove existing data.

**Set the caps before the first public launch** (D15). Apple's guidelines say not to gate features that existing free users already had, so adding a cap after launch risks a rejection and a backlash. **Verify** the current wording.

**Careful with the character cap.** The leading official tool is criticised for its character-slot limit, and the first complaint in every market scan is "the basics are paywalled". If we cap characters, cap them generously, or put the paid line around DM-side tools instead (history, backup, larger parties) and leave a player's own characters uncapped. Decide this with real usage data (Q2).

## Pricing hypotheses (to test, not decide)

| Product | Hypothesis | Reasoning |
|---|---|---|
| DM Pro | $3 to $5 per month, or about $30 per year | Hobby-tool territory: cheap enough to be a no-brainer for a table, high enough to matter. Annual plan with a free trial. |
| Content pack | $5 to $15 | Priced against what a hobbyist pays for a PDF supplement. |
| Art pack | $3 to $10 | Cheaper, more impulse-driven. |
| Cosmetic theme | $2 to $5 | Low price, near-zero marginal cost once built. |

**Price anchors (research of 2026-11-03, third-party sources, verify):** the market-leading official tool charges about $2.99 a month or $26 a year for its lower tier, and $5.99 a month or $55 a year for its top tier. Our DM Pro hypothesis sits at or below the lower tier and has no content to sell, so it has to win on the table tools, not on a library.

**Conversion expectation (secondary sources, verify):** freemium apps typically convert about 2% of users to paid after a month, higher with a trial or a hard paywall. At 2%, 1,000 active users give about 20 paying DMs, which is roughly $60 to $100 a month before store fees. Plan the costs and the roadmap around that, not around the optimistic case.

**Which model:** a subscription for DM-side tools (the current plan) is the likeliest fit. A one-time unlock of the whole app has a lower ceiling and no money for growing hosting costs. "The DM pays for the whole table" is the plan, but no source we found validates its conversion, so treat it as the first thing to test (see the first two assumptions in [Risks](../strategy/risks-and-open-questions.md)).

Rule: price tests come **after** we have users and a baseline. Until then these are guesses. Run any price experiment as a single change with a defined period, and write the result in the decision log.

## Unit economics, as a formula

We don't know the numbers yet, so the doc gives the formula to fill in.

```
net revenue per sale   = price × (1 − platform fee) − payment/tax overhead
break-even units       = pack production cost ÷ net revenue per sale
production cost        = artist fees + rules-writing time + QA + any revenue share
```

**Worked example (illustrative only, not a forecast):** a pack priced at $8 with a 15% platform fee nets about $6.80. If it cost $400 in commissioned art to make, break-even is about 59 sales. Revenue share with the artist lowers the upfront cost but also lowers net per sale. Decide that trade per pack in [Artist commissioning](../content/artist-commissioning.md).

**Running costs to subtract (verify on the vendor's pricing page):** live sync is the main cost. The hosted database's free plan allows roughly 200 simultaneous connections and 2M realtime messages a month, and its $25-a-month plan roughly 500 connections and 5M messages. A table of 4 to 6 players needs few connections, so message volume is the likelier limit. Sending every HP change and dice roll as its own message is how a small user base reaches it. Batch or throttle updates, and model messages per session before choosing a price.

**Platform fees (verify before relying on them):** Apple and Google take a share of in-app purchases, historically 15% to 30% depending on programme and revenue. Web checkout through a payment processor has its own, usually smaller, fee. Current rules on offering web checkout from inside a native app differ by platform and region. See [Payments, platforms and compliance](../legal/payments-and-platforms.md).

## What would make this not work

- **Not enough tables.** Revenue depends on DMs, and a table needs several people. See [Go to market](go-to-market.md).
- **Content we can't legally sell.** The SRD is a limited set. Packs must be original or licensed. There is no fallback to selling rulebook content.
- **Low conversion.** About 2% is the benchmark. The plan must work at that rate, or fixed costs must stay tiny.
- **A bigger rival catches up.** The leading official tool is rebuilding its platform in 2026 and has not promised mobile live sync or better homebrew. If it does, our wedge narrows. Move first on the free, phone-first table experience.
- **Art cost outruns sales.** Mitigated by one pack at a time and revenue-share options.
- **Free is good enough.** If the free tier covers a DM's whole need, nobody upgrades. The DM Pro value has to be real, not just removing a nag.

Each of these has an owner and a mitigation in [Risks and open questions](../strategy/risks-and-open-questions.md).
