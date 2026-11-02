# Documentation

The project's second brain: one place per department for what that department needs to know, decide and remember. Each folder has its own README that says what lives there, what is already written, and what still needs writing.

| Folder | Department | What it holds |
|---|---|---|
| [strategy/](strategy/README.md) | Company-level | The overall plan, roadmap, risks and the decision log. Cross-cutting: starts here when a question touches more than one department |
| [business/](business/README.md) | Business | Revenue model, go to market, metrics, pricing, finances |
| [product/](product/README.md) | Product | What we build and why: PRDs, feature status, backlog, user feedback |
| [design/](design/README.md) | Design | The design system, UX for paywalls and the shop, copy and accessibility |
| [engineering/](engineering/README.md) | Engineering | Architecture, database and security conventions, setup, testing, billing, deploys |
| [content/](content/README.md) | Content and art | Packs, artist commissioning, content rules, art direction |
| [legal/](legal/README.md) | Legal and compliance | Content licences, trademark, privacy, terms, platform and payment rules |
| [operations/](operations/README.md) | Operations and support | Runbooks, refunds, incidents, accounts and vendors |
| [superpowers/](superpowers/) | Working files | Specs, plans, mockups and screenshots generated while building features. Department READMEs link to the ones that matter |

## How to use it

- **Writing something down?** Put it in the department that will need it later. If two departments need it, put it in one and link from the other.
- **A decision with consequences?** Add a row to the [decision log](strategy/decision-log.md) as well.
- **Status labels.** Documents say whether something is **Built**, **Decided**, **Proposed** or an **Open question**, so you can tell a plan from reality.
- **Numbers and third-party rules** are hypotheses or marked **verify** until checked at the source.
- **A folder with nothing in it yet** still has a README listing what it should eventually hold. Delete items from that list as you write them.
- **Spec and plan files** under `superpowers/` are produced by the build workflow and stay where it puts them. Don't move them: link to them.

## Current focus

The freemium and subscription strategy: see [strategy/README.md](strategy/README.md). Its documents sit in the department folders above, so each department finds its part where it expects it.
