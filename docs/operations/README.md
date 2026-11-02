# Operations and support

Running the app day to day: helping people, handling money problems, and knowing what we depend on.

Nothing is written here yet. Operations matters as soon as there are real users and especially once there are payments, so this list is the to-do for before launch.

## Still to write

- [ ] **Support runbook**: where support requests arrive, how fast we reply, canned answers for the common ones (can't sign in, lost access to a pack, wrong charge)
- [ ] **Refunds and chargebacks**: the process per channel (stores refund themselves; web refunds are ours) and what happens to the user's entitlement. See [Payments, platforms and compliance](../legal/payments-and-platforms.md)
- [ ] **Entitlement fixes**: how to check, grant or revoke a user's access safely (the dev script is local-only; a production process is needed). See [Entitlements architecture](../engineering/entitlements-architecture.md)
- [ ] **Incident response**: what to do if the database is down, the billing webhook fails, or content leaks. Who to tell, how to roll back
- [ ] **Accounts and vendors**: every service we depend on (hosting, Supabase, GitHub, store developer accounts, billing provider), which email owns it, billing dates. Names only, never passwords
- [ ] **Backups and recovery**: what is backed up, how often, and how to restore
- [ ] **Release checklist**: what to check before shipping a build or a migration
- [ ] **Monitoring**: what we watch (errors, webhook failures, sign-ups) and where alerts go
- [ ] **Community**: where users talk to us, house rules, who moderates
