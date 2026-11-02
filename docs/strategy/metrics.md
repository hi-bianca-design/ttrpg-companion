# Metrics

**Status:** Proposed. No analytics are wired up yet, so every number in this doc is a question, not a result.

## The funnel

```
Visit → Sign up → Create a character → Join or create a campaign → Play a session
                                                                      │
                                              Hit a limit or see a pack → Pay → Stay
```

Each arrow is one number we need. Today we measure none of them.

## Events to track

Keep the list small. Names are suggestions.

| Event | When | Why |
|---|---|---|
| `signed_up` | Account created | Top of funnel |
| `character_created` | Wizard finished | Activation |
| `campaign_created` / `campaign_joined` | | Loop health: do tables form? |
| `invite_code_shared` | Code copied or shared | The loop's first step |
| `session_opened` | A DM starts a session | The real "playing" moment |
| `limit_reached` | A free cap blocks creation | The moment a paid tier could help |
| `paywall_viewed` / `paywall_dismissed` | | Conversion funnel |
| `pack_viewed` | Shop pack opened | Interest per pack |
| `purchase_started` / `purchase_completed` / `purchase_failed` | | Revenue and friction |
| `subscription_started` / `_renewed` / `_cancelled` / `_lapsed` | | Retention |
| `entitlement_lapse_edit_blocked` | A lapsed user hits a pack-gated error | Quality of the lapse experience |

Privacy: events must not include character names, notes, or anything a player typed. Use ids. Decide the retention period and a way to opt out before launch. See [Payments, platforms and compliance](payments-and-platforms.md).

## Metrics that matter

| Metric | Definition | Why |
|---|---|---|
| **Activation rate** | Share of sign-ups who create a character | Is the first run good? |
| **Table formation rate** | Share of campaigns with 3+ active members | The growth loop's health |
| **Players per DM** | Average active members per campaign | Distribution per sale |
| **Weekly active tables** | Campaigns with a session in the last 7 days | The truest "is it used" number |
| **Free→paid conversion** | Share of DMs who subscribe, by cohort | The business |
| **Pack attach rate** | Share of users who buy a pack | Pack demand |
| **Net revenue per paying user** | After platform fees and refunds | Unit economics |
| **Churn and lapse recovery** | Cancelled subs, and how many return | Is DM Pro valuable? |
| **Refund rate** | Per product | Early quality signal |

## The first questions to answer

Before choosing targets, answer these with real data:

1. What share of sign-ups create a character? Where do the rest stop?
2. How many people does a typical campaign have after a week?
3. How often does anyone hit the free caps we're proposing? If almost nobody does, the caps are wrong, not the marketing.
4. Which free feature do DMs use most? That is what to protect. Which do they ask for? That is what to charge for.

## Targets

None yet. **Rule:** set a target only after two to four weeks of baseline data, write it here with the date, and review monthly. A target set from a guess is just a number to feel bad about.

## Tooling

Not chosen. Requirements: low cost at small scale, event-based, exportable, respects consent. Options to evaluate include a hosted product-analytics service or a simple events table in our own database. The cheapest option that answers the questions above wins.
