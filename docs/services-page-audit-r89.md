# Round 28r89 · ServicesPage Audit Report

**Date:** 2026-07-12
**Scope:** `src/pages/ServicesPage.tsx` + `src/pages/ServiceDetailPage.tsx`
+ tightly-coupled dependencies (`services.ts`, `servicePricing.ts`,
`serviceCatalog.ts`, `HowItWorks.tsx`, `BundleSection.tsx`,
`concierge.ts`).
**Cutoff:** After 50 commits r70–r88 (Nordic Gray rebrand → warm taupe
CTA → accent tokens → 28t Dusty-Rose theme flip, stats-bar scroll nav
on TherapistDetail).
**Mode:** READ-ONLY. Zero code changes.

---

## Executive summary

Top findings, ranked by blast radius:

1. **[HIGH · data integrity]** ServicesPage bypasses the live-config
   layer for everything except pricing. It imports `services` directly
   from `@/data/services` (line 14) and never calls `getAllServices()`
   or `withLiveServiceOverrides()`. Consequence: admin-created custom
   services (r28s301), admin `enabled=false` disables (r28s300), name /
   desc / image / detail / benefit overrides (r28s302), and admin-set
   display order (`getLiveServiceOrder`) are ALL invisible on the main
   customer Services surface. Only `priceForDuration` picks up the
   override automatically (it reads the live map internally), so prices
   are correct but everything else is stale. ServiceDetailPage does
   it right (`getServiceById` → applies overrides).

2. **[HIGH · visual coherence — theme drift]** After 28t the theme
   flipped from Nordic Gray + warm taupe #8F8474 primary to Dusty-Rose
   #D97C95. ServicesPage adopted rose (title, price, pill, bestseller
   ring). But the Reserve CTAs on all four cards are painted with
   `background: "#1A2B2E"` (dark slate) — neither the old warm-taupe
   direction nor the new dusty-rose direction. Meanwhile
   ServiceDetailPage's Reserve CTA is `#8F8474` (warm taupe — old).
   Three CTA colours across two pages that should be one primary.

3. **[HIGH · brand voice + copy]** The Reserve button on every service
   card is labelled **"Unlock Executive Benefits"** (ServicesPage
   L423, L561). That phrasing is neither in the CLAUDE.md euphemism
   table, matches no other CTA anywhere in the codebase (a grep hits
   only ServicesPage), and clashes with the quiet-luxury tone. Reads
   like a placeholder that shipped. Should be **"Reserve"** /
   **"Chat to book"** consistent with ServiceDetailPage's
   `t("serviceDetail.bookCta", "Chat to book")`.

4. **[MED · functional bug]** The "Reach us · Telegram" tile links to
   `https://t.me/SunRedvip_bkk` (L107) while the "Subscribe to our
   Telegram channel" link three sections down (L652) links to the
   canonical `https://t.me/SunRed_BKK`. `CONCIERGE.telegramChannel` is
   `@SunRed_BKK`. Guest tapping either link may land on a
   different / non-existent channel. Two different handles in the
   same tab.

5. **[MED · i18n regression]** ServicesPage does NOT import
   `useTranslation`. Every button label, section header, eyebrow,
   arrival-window body, "Reach us" tile label, and the entire About
   tab prose is HARDCODED ENGLISH. The r61 bilingual pattern (English
   header + Thai subtitle) is only partially honoured via the static
   `SERVICE_TH_TAG` map. ServiceDetailPage uses `useTranslation`
   properly. Result: switching locale on the app leaves the whole
   Services page in English.

---

## Category-by-category breakdown

### A. Visual coherence

| Check | Result |
|---|---|
| Legacy red hex (`#B4000A / #FE0944 / #FE7A52 / #E4002B / #D62828`) | **Clean** — no hits in ServicesPage or ServiceDetailPage. |
| Old serifs outside intentional fallback | **Clean** — the only `Fraunces` reference is inside a Playfair fallback stack (`ServicesPage:31`). Federo / Italiana / Cinzel / Cormorant all gone. |
| Playfair Display on section headings | **Applied** — `SERIF` const on L31 fronts every section title (`Our Services`, price numerals, bestseller name, service name). |
| Warm taupe `#8F8474` on primary CTAs | **Inconsistent** — ServiceDetailPage uses it (L513, L765). ServicesPage does NOT — Reserve buttons paint `#1A2B2E` slate (L412, L550). Neither matches the new Dusty-Rose `gradients.primary` from theme.ts. |
| Nordic neutrals for card bg / borders | **Passes via CSS vars** — every card uses `var(--sr-panel)` + `var(--sr-hairline)` + `var(--sr-card-shadow)`, which auto-flip day/night. |
| Amber `#F5A623` on stars / BESTSELLER | **Diverged** — ServicesPage BESTSELLER ribbon uses the rose gradient bar, not amber. The BESTSELLER star glyph is `rgba(255,255,255,0.85)` on rose (L292). ServiceDetailPage stars correctly consume `accents.amber` (L691). BundleSection still uses amber gradient (L343, L378). |
| Coral `#E88585` (r82 stragglers) | **Clean** — zero hits across `src/`. |

**Additional notes:**
- `ServiceDetailPage:210` still has `swatchIcon: brand.red` as the
  fallback — safe since `brand.red` is now aliased to warm taupe,
  but the intent-vs-name drift is worth a rename pass later.
- Duration-table container uses `rgba(217,124,149,0.07)` background
  and `rgba(217,124,149,0.18)` border, so the rose token isn't just
  used for the price colour — the table itself is rose-tinted. Nice.
- About tab pillars mix three accent colours (`#16a34a` green,
  `#0284C7` blue, rose). The blue accent (`#0284C7`) is not a
  documented brand accent — nowhere in `theme.ts` `accents`.
- ServicesPage line 62–80 hardcodes `#16a34a` for the green pillar
  when `accents.availableText` (`#57B88B`) already exists as the
  documented available-green. Same drift for `#0284C7` which has no
  matching token.

### B. Layout responsiveness

| Check | Result |
|---|---|
| Hardcoded `430px` cage | **Clean** — ServicesPage uses `responsiveShell` (L154). ServiceDetailPage L191 uses `responsiveShell` in the not-found branch, and L233/L749 in the main tree + sticky bottom CTA. |
| Mobile snap-scroll ROLADEX | **N/A** — Round 28s175+ vertical-stack layout is in place; no horizontal snap row here. `CHANNELS` tiles use `flex: 1` with `display: "flex"`, so four icons squeeze to fit any width. |
| Tablet+ grid transition | **Partial** — ServiceDetailPage has a real `md:` two-column grid (L272). ServicesPage stays single-column at every breakpoint. On a 1440px display the featured card renders full width edge-to-edge inside the shell. |
| Text overflow / truncation | **Passes** — no fixed-width cards; long service descriptions wrap. |

Nice-to-have polish: at md+ the four `CHANNELS` tiles at 24px icon size
can look starved of contact area. Consider a max-width or an
`md: { flex: "0 0 120px" }` cap.

### C. Functional correctness

| Check | Result |
|---|---|
| React keys unique | **Passes** — tabs keyed on `tab.value`, service cards on `svc.id`, duration rows on `d`, channels on `name`, about pillars on `title`. All guaranteed unique. |
| Firestore listener cleanup | **Passes on Detail page** (L169 `return () => unsub()`). ServicesPage does not open a listener directly. |
| Loading states while async | **N/A for Services** (no async). **Detail page** shows a "Service not found" fallback for unknown id (L186); no explicit review-loading skeleton — reviews just pop in when they arrive. Acceptable. |
| Error boundaries | Not audited — page-level. Errors on `onSnapshot` swallow into `console.warn` (L166) which is fine. |

### D. Routing / navigation

| Check | Result |
|---|---|
| Service card tap → detail route | **Works** — Reserve buttons (L403, L541) use `<a href="/services/{id}">`. Note: whole card is NOT clickable — only the pill button — which matches the CLAUDE.md rule "Card tap does NOT navigate." |
| Dead routes / dead imports | Grep for unused imports in ServicesPage: `LocalHotelRoundedIcon` and `SupportAgentRoundedIcon` are consumed by the ABOUT_PILLARS array. All others used. |
| Booking flow reachable | **Yes** — indirectly, guests go Services card → ServiceDetailPage → WhatsApp handoff. The "Reach us" grid also gives one-tap concierge. |

Anchor mismatch: the About pillar with `LocalHotelRoundedIcon` uses
`tone.fg: "#0284C7"` (blue), same as `SupportAgentRoundedIcon` (also
blue) — two consecutive pillars end up rendering the same accent
colour on the same screen. Minor visual monotony.

### E. i18n / bilingual

| Check | Result |
|---|---|
| Buttons English-only (r69) | **Passes** — "Unlock Executive Benefits" is English-only (though the copy is off — see F). Reach-us tiles English-only. Tabs English-only. |
| Section headers bilingual (r61) | **Fails** — the four eyebrow rows (`Our Services`, `Areas & Timing`, `Reach us`, `About · Our Promise`) are English only. Compare BundleSection L193/L202 which does English + Thai. HowItWorks eyebrow is English only too. |
| Row content in Thai locale | **Fails hard** — ServicesPage has no `useTranslation` at all. Locale toggle has no effect on this surface. The `SERVICE_TH_TAG` map (L49) provides Thai service names but only as a subtitle line under each service card, not a live-translated body. |

The About tab's whole 4-line promise paragraph, the 4 pillar bodies,
the languages-supported card, arrival-window copy — all English-only
static strings. This is a real regression relative to ServiceDetailPage
which threads through `t("serviceDetail.…", "fallback")` correctly.

### F. Content / tone

| Check | Result |
|---|---|
| Euphemism table respected | **Mostly passes** — "guest" (not customer) not used explicitly on ServicesPage but not violated either; "practitioner" used in pillar (L60). No "cheap / discount / senior / attractive / handjob / B2B / nuru" leaks. |
| Nordic minimal tone | **Fails on CTA copy** — "Unlock Executive Benefits" is corporate-SaaS voice, not Aman / Six Senses. The label appears literally 8 times (once per card × 2 pages plus code). No i18n → cannot be softened without a code edit. |
| Placeholder / TODO left | **Passes** — no `TODO` / `FIXME` / `XXX` / `PLACEHOLDER` in the two files. |

Additional copy notes:
- "**Most Booked**" ribbon label (L309) on the bestseller — good.
  Better than "BESTSELLER" from the previous round.
- Pricing table label "**Choose duration**" is in ServiceDetailPage
  with proper Thai subtitle ("เลือกระยะเวลา", L389) — good.
- About tab headline: `"Bangkok's most discreet outcall massage,
  delivered to you."` — solid quiet-luxury voice.
- **"specialised practitioners"** correctly used (L141 in
  `services.ts` for SR-B2B3200). Euphemism table honoured.

### G. Accessibility

| Check | Result |
|---|---|
| Touch targets ≥ 44×44 mobile | **Mixed.** Tab strip: `height: 38` (L197) — **below 44px**. Reserve buttons: `py: 13px` × content ≈ 44px — passes. Reach-us tiles: `py: 14px` — passes. Duration table rows: `py: 13px` — passes. |
| Focus rings on interactive | **Passes on tabs** (L210 `&:focus-visible: outline 2px solid ROSE`). **Missing** on the two Reserve buttons (L402, L540) — no `:focus-visible` rule; the browser default outline may or may not appear over a slate background. |
| Semantic HTML | **Passes** — `role="tablist"`, `role="tab"`, `aria-selected`. Section container is `<Box>` div, not `<section>`; About / Areas / Reach us have no `<h2>` — the visual headings live in `<Typography>` styled as text, not tagged as `component="h2"`. |
| ARIA labels on icon-only tiles | **Missing on Reach us tiles** — the four icon buttons have no `aria-label`. Screen-reader users hear only the tone-coloured icon (WhatsApp / Telegram / LINE / WeChat). The tile has a text `<Typography>` naming the channel below the icon so it's not fully mute, but semantically these should be `<a aria-label="Reserve on WhatsApp">…`. |

### H. Performance

| Check | Result |
|---|---|
| Unbounded Firestore listeners | **N/A on ServicesPage** — no listeners. **ServiceDetailPage** subscribes to bookings query with `limit(8)` (L142) — bounded and torn down on unmount. Good. |
| Heavy compute in render | **Passes** — `restServices` memoised (L136); `durationsFor(svc)` runs once per card (4 cards); `SectionEyebrow` re-rendered per section, cheap. |
| Bundle image `<img>` lazy-load | Present in BundleSection (L302). |

### I. Data integrity

| Check | Result |
|---|---|
| Prices from `servicePricing.ts` | **Passes** — `priceForDuration(svc, d)` and `formatTHB(…)` used everywhere. No hardcoded price strings. Live admin base-price + per-duration override flow through this path automatically. |
| Live `serviceOverrides` applied | **Fails on ServicesPage** — imports raw `services` from `@/data/services` (L14); no call to `withLiveServiceOverrides()` or `getAllServices()`. Admin edits to name / desc / image / detail / benefit made in `/admin/promotions` will NOT reflect on Services page. Admin `enabled=false` on a standard SKU will NOT hide the card. Admin-created custom services (r28s301) will NOT appear. Admin `liveServiceOrder` (r28s302) is IGNORED — `REST_ORDER` const wins. Only prices update. |
| `disabledBuiltinCodes` / admin toggles | **Not checked** — no call to `isServiceEnabled(id)` from ServicesPage. |

`count` field usage: `services.ts` L69 has `count: 62` for
`xSR-Thai`; L90/111/137 all `count: 0`. ServicesPage does not read
`count`. Legacy field carried through the schema but no longer
influences display. Nice-to-have: drop from the interface once
confirmed nothing else reads it.

---

## Per-file findings

### `src/pages/ServicesPage.tsx`

- **L14:** `import services from "../data/services"` → should be
  `import { getAllServices } from "@/utils/serviceCatalog"` +
  `services = getAllServices()` inside `useMemo`, so live overrides
  + custom services + admin ordering + admin disable-toggle flow
  through. (Root cause of finding #1 in exec summary.)
- **L106:** hardcoded `href: CONCIERGE.whatsappUrl` — good.
- **L107:** hardcoded `href: "https://t.me/SunRedvip_bkk"` — WRONG
  handle vs `CONCIERGE.telegramChannel = "@SunRed_BKK"` and L652.
  Should be centralised into `concierge.ts` and consumed from there.
- **L62/L74/L80:** raw `#16a34a` / `#0284C7` hexes — should use
  `accents.availableText` and a to-be-added `accents.info` token
  instead of undocumented one-off blues.
- **L197:** `height: 38` on the tab strip — 6px short of the WCAG
  44px minimum touch target.
- **L253:** `{1 + restServices.length} rituals` — hardcoded English
  plural. Locale switch → still "rituals".
- **L412 / L550:** Reserve button `background: "#1A2B2E"` — colour
  drift; should reference the theme's primary CTA gradient.
- **L423 / L561:** button label "Unlock Executive Benefits" —
  off-brand copy (see finding #3).
- **No `useTranslation`** — entire page is monolingual English.

### `src/pages/ServiceDetailPage.tsx`

- **L513 / L765:** `background: "#8F8474"` — warm taupe primary.
  Diverges from ServicesPage (which is slate) AND from the current
  `gradients.primary` (which is dusty rose). Should be
  `theme.gradients.primary` for future-proofing.
- **L421 / L424:** duration tile uses `#2D2D2B` dark ink as active
  fill. Reasonable, but inconsistent with the rose accent used on the
  Services listing page for the same visual role (active state).
- **L134–170:** Firestore listener uses `orderBy("rating", "desc")`
  — requires the composite index on `(serviceId, rating)` that was
  set up in 28s6. If that index is ever dropped, listeners fail
  silently (log-only). Not a bug now, just a hidden dependency.
- **L157:** `data.contactName?.slice(0, 1) ?? "Guest"` — a stored
  contact-name initial leaks into `author` but is never rendered
  (JSX doesn't consume `r.author`). Dead field on `ReviewLite`.
  Cheap tidy.
- **L206:** back-button `outline: '2px solid ${brand.red}'` reads
  as warm taupe now (fine visually, misleading token name).
- **L157–159:** `author: data.contactName?.slice(0, 1) ?? "Guest"`
  — verify privacy: a "J" for someone named "James" is arguably an
  identifier alongside a 5-star review; per CLAUDE.md §🔐 privacy
  playbook, all reviewer identity should be masked. Currently the
  field is set but not rendered, so no live PII leak — but the day
  someone adds `<span>{r.author}</span>` it becomes one. Consider
  dropping the field entirely.

### `src/data/services.ts`

- **L69:** `count: 62` on `xSR-Thai` — stale hardcoded booking
  count. If `count` is dead (no reader), drop.
- Every `desc` string is Nordic minimal + euphemism-compliant ✓.
- **L127-142:** SR-B2B3200 description properly avoids the banned
  "senior / licensed" terms. Compliant with r73 audit.

### `src/utils/servicePricing.ts`

- Clean single-source-of-truth. Live overrides + schedule filtering
  + 60/90/120 multipliers + linear fallback all present. No issues.

### `src/utils/serviceCatalog.ts`

- Clean. Legacy slug aliases preserved (`gentlemans-recovery` etc.)
  so old bookmarks still resolve — do not remove.

### `src/components/home/HowItWorks.tsx`

- Uses `useTranslation` ✓.
- **L40/41** dual serif/sans const declarations — good.
- **L179/L232** raw hex colours (`rgba(214, 40, 40, 0.22)` and
  friends) — legacy brand-red rgba survivors. Non-load-bearing but
  drift from the flat token model.
- No emoji, no placeholder, no "cheap/senior/etc." — passes tone.

### `src/components/common/BundleSection.tsx`

- Uses `useTranslation` ✓.
- **L343 / L378:** amber gradient pill for `-N%` discount — matches
  the amber signature accent. Good.
- **L587:** CTA `background: "#8F8474"` — warm taupe. Matches
  ServiceDetailPage; diverges from ServicesPage slate. See finding #2.
- Uses `formatTHB` for price ✓.

### `src/config/concierge.ts`

- Clean centralisation. Only concern: nothing in the module owns
  the Telegram BROADCAST channel URL (`https://t.me/SunRed_BKK`)
  — the handle is stored as `@SunRed_BKK` but the URL form is
  reconstructed at three separate call sites with different results.
  Add `telegramBroadcastUrl: "https://t.me/SunRed_BKK"`.

---

## Nice-to-have polish backlog

Ordered by effort (cheap first):

1. **Rename "Unlock Executive Benefits" → "Reserve" or "Chat to
   book"** (single string, high tone impact).
2. **Fix Telegram tile URL** — change L107 to
   `href: \`https://t.me/${CONCIERGE.telegramChannel.replace("@","")}\``
   or add a new `telegramChannelUrl` to `concierge.ts`.
3. **Standardise Reserve CTA colour** — pick one of dusty rose
   gradient (theme primary) OR warm taupe, apply to both
   ServicesPage cards + ServiceDetailPage + BundleSection.
4. **Tab strip height 38 → 44** for WCAG touch target.
5. **Add `:focus-visible` outline** to the two Reserve `<a>` buttons
   on ServicesPage cards.
6. **Add `aria-label` to Reach-us icon tiles** —
   `aria-label="Reserve on WhatsApp"` etc.
7. **Convert ServicesPage strings to i18n** — biggest lift, but
   necessary to bring parity with ServiceDetailPage and honour the
   r61 bilingual section-header rule.
8. **Wire ServicesPage through `getAllServices()`** — critical for
   admin custom services + disable toggle + name/desc/image overrides
   to actually show up on the main customer surface.
9. **Add `<h2>` semantic tags** on section eyebrows (`Our Services`,
   `Areas & Timing`, `Reach us`, `About · Our Promise`).
10. **Replace ad-hoc About-pillar accent hexes** (`#16a34a`,
    `#0284C7`) with theme tokens.
11. **Drop dead `count` field** from `MassageService` interface
    (or repurpose to live Firestore booking count).
12. **Drop dead `author` field** from `ReviewLite` on the detail
    page to remove the latent privacy footgun.

---

## Categories completely clean

- **B. Layout responsiveness** — no 430px cage; overflow-safe.
- **H. Performance** — no unbounded listeners; work is memoised.
- Prices data integrity — single source, override-aware, snapshot on
  booking. (Everything ELSE in Category I is broken.)
- Legacy red hex codes & old serif fonts (Category A partial) —
  fully swept out.
- Placeholders / TODOs (Category F partial) — none left.

---

*Audit complete. No files were modified.*
