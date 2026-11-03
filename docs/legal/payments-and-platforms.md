# Payments, platforms and compliance

**Status:** Open questions throughout. Every rule below is a **verify** item: store, tax and privacy rules change and vary by country, so check the current official source before acting.

> This is a checklist of things to find out and decide, **not legal or tax advice**.

## App stores (if we ship native apps)

| Topic | What to verify |
|---|---|
| **Which purchases must use in-app purchase** | Digital content and subscriptions inside a native app generally have to use the store's billing. Check the current rules for each store, including any exceptions for linking to web checkout and how they differ by region |
| **Commission** | Fees are a percentage of in-app sales and have historically varied by programme and annual revenue. Check whether a small-business programme applies and what you must do to enrol |
| **Subscriptions** | Required disclosures: price, period, what renews, how to cancel. Intro offers and free-trial rules |
| **Restore purchases** | Required for non-consumables and subscriptions |
| **Account deletion** | Stores require an in-app way to delete an account if you offer sign-up. Make sure deleting an account handles entitlements and content ownership sensibly |
| **Content rules** | User-generated content may need reporting and blocking tools. Homebrew is private today, but campaign-scoped content is shared with a table |
| **Review process** | Allow time for review and have demo credentials ready. Apple and Google can reject on licensing: be ready to show the SRD basis |
| **Age ratings** | Complete the questionnaires honestly (fantasy violence) |

## Web (launch first)

The app runs on Expo web first (see the project memory). Web checkout avoids store fees but brings its own responsibilities:

- A payment processor and its terms.
- Strong customer authentication where required (e.g. in the EU).
- A clear checkout, receipts, and a cancellation path.
- **Selling to users in different countries means sales tax, VAT or GST rules.** Either register and file yourself, or use a **merchant of record** that does it for a fee. Decide before the first sale. **Verify** the thresholds and obligations for the countries you sell to.

## Money handling

- **Refunds:** write a clear policy: what's refundable, within what time, how to ask. Store purchases are refunded through the store; web refunds are ours. Decide how a refund affects an entitlement (see [Billing integration](../engineering/billing-integration.md)).
- **Chargebacks:** a few are normal; track them. Revoke the entitlement with the same lapse rule as everything else.
- **Artist payouts:** if revenue share applies, we owe a statement and payment. Work out net amounts per channel (store, web). See [Artist commissioning](../content/artist-commissioning.md).
- **Business setup:** a sole trader or a company, a business bank account, and keeping records for tax. Ask an accountant: this is a local question.

## Privacy and data

- **What we hold:** email, username, characters and campaigns, purchase state. Characters may contain free-text notes.
- **A privacy policy** is required by the stores and by law in most places. Say what we collect, why, who it's shared with (the billing provider, the analytics provider), how long we keep it, and how to delete it.
- **Analytics:** collect only ids and events, never what people typed ([Metrics](../business/metrics.md)). Get consent where required.
- **Data export and deletion:** let people export their characters and delete their account. This is also a feature of DM Pro (export and backup), but deletion rights shouldn't be paywalled.
- **Children:** tabletop games have young players. Decide the minimum age (a typical choice is 13+, higher in some regions), say it in the terms, and check whether the product is "directed to children" under local law. If under-13s are in scope, the rules are far stricter. **Verify** with advice.

## Terms of service

Needs drafting. At minimum: the licence we grant to the app, the licence **users grant us** for their content, acceptable use, subscription and refund terms, termination, limits of liability, and the governing law.

## Security and fraud

- The webhook and service-role key only live server-side ([Billing integration](../engineering/billing-integration.md)).
- Entitlements are server-written and RLS-enforced; clients can't grant themselves access (tested).
- Watch for stolen cards on web checkout and abuse of free trials.
- Keep dependency updates and a basic incident process.

## Checklist before taking the first real payment

- [ ] SRD attribution is visible in the app and store listing
- [ ] App name decision made after legal advice
- [ ] Privacy policy and terms published
- [ ] Billing provider chosen; store listings and products configured
- [ ] Tax and invoicing approach decided
- [ ] Refund policy written and linked from the shop
- [ ] Restore purchases, cancel and delete-account flows work
- [ ] Support email set up and monitored
- [ ] Webhook secrets stored as secrets; sandbox purchases tested end to end

## Store rules found in the 2026-11-03 research (verify against the current Apple guidelines)

| Rule | What it means for Session Zero |
|---|---|
| **1.2 User-generated content** | Homebrew shared between users needs a content filter, a report button with timely replies, a way to block users, and published contact details. Keep homebrew private to its author at launch (D16). |
| **5.1.1(v) Account deletion** | If people can create an account, they must be able to delete it inside the app (D17). |
| **5.2.1 Third-party IP and names** | No protected trademarks in the name, subtitle, keywords or icon (D13). |
| **5.2.2 Third-party content** | Showing or charging for another party's content must be allowed by that party's terms. The CC BY SRD is. Anything else is not. |
| **3.1.1 / 3.1.2 Purchases** | Digital unlocks and subscriptions go through in-app purchase. A subscription must run at least 7 days and give ongoing value. Do not gate features that free users already had (D15). |

A free fan tool for another card game was taken down after a cease-and-desist, so a free app is not automatically safe. We found no tabletop-app takedowns, but this was not exhaustive.
