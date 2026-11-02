# Art storage and delivery

**Status:** Proposed. Nothing is built. Required before the first art pack. Content-only packs don't need it.

## Requirements

1. Art for paid packs must be **readable only by entitled users**. A user must not be able to fetch a paid image by guessing its URL.
2. It must be **fast and cacheable** on mobile and web.
3. It must **keep working after a lapse** for art already chosen for a character (see the lapse rule, D6).
4. It must be **cheap**: a few hundred images at several sizes, at small-app scale.

## Approach

**A private Supabase Storage bucket** (for example `pack-assets`), accessed through **signed URLs**, with storage policies that check `pack_entitlements`.

```
pack-assets/
  <pack_slug>/
    cover.webp
    portraits/<name>-512.webp, <name>-1024.webp
    tokens/<name>-256.webp
```

- Object paths include the pack slug, so a storage policy can look up the pack and check `owns_pack`.
- The free **cover** image (shown in the shop before purchase) lives in a public bucket or is a separate public path, because it's marketing.
- Signed URLs expire (short for sensitive, longer for UI art). The app fetches a new one when needed.

## Which art stays visible after a lapse

A character that **uses** a pack's portrait keeps showing it, since taking it away would break the sheet. Two ways to do this:

| Option | Mechanism | Trade-off |
|---|---|---|
| **A. Copy on pick** | When the user chooses a portrait, copy it into the user's own storage path (a private per-user bucket) | Simple rule, always works, costs storage; the file is now "owned" by the user |
| **B. Storage policy mirrors the content rule** | The policy also allows reads of assets referenced by the user's own characters | More logic in policies; no duplication |

Prefer **B** if the policy stays readable, otherwise **A**. Decide when the first art pack is scoped, and write the choice in the [decision log](decision-log.md).

## Formats and sizes

- Deliver **WebP** (or AVIF where supported) at a small number of fixed sizes, generated at publish time, not at request time.
- Keep originals in cold storage, not in the app bucket.
- Record width, height and a short alt text per image in the content row's `data` JSON.

## Client side

- A small image component handles: signed URL fetch, cache, placeholder while loading, fallback if the URL fails, and the locked state.
- Use the platform's image caching (and the stable path as the cache key, not the signed URL, which changes).
- Prefetch the art for the current screen's characters.

## Content integration

- `packs.cover_url` points to the cover. Piece-level art references go in `content.data` (or a dedicated `pack_assets` table if we need queries over them).
- `characters.portrait_url` already exists; extend it to hold either an uploaded image or a pack asset reference.

## Costs and limits

Check current storage and egress pricing for the plan in use, and estimate: images × sizes × expected downloads. Compare with revenue per pack. If egress becomes the cost, add a CDN in front of the bucket. **Verify** the numbers when scoping.

## Testing

- Storage policy tests: unentitled user cannot read; entitled user can; lapsed user can read art already referenced by their characters (under option B).
- Component tests for placeholders and failure fallback.
- A manual check on slow networks and on web and native.

## Open questions

- Option A or B (above).
- Whether user-uploaded portraits are allowed. They need moderation, size limits and abuse handling, so they're a separate feature.
- Image alt-text strategy for accessibility.
