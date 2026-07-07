# Homepage + Customer-Surface Audit — Round 28r51

Scope: audit the customer-facing entry surfaces to inform Phase 2 wiring
of the promo-strip / bundle-strip components (Round 28r50 shipped the
data layer; Round 28r51 ships the surface component). This is a report
only — no code changes were made as part of the audit itself.

Files reviewed:

- `src/pages/HomePage.tsx`
- `src/components/home/HomeTherapistGrid.tsx`
- `src/components/home/TopNav.tsx`
- `src/pages/ServicesPage.tsx`
- `src/pages/booking/BookingFlowPage.tsx`
- `src/pages/booking/BookingSuccessPage.tsx`
- `src/components/layouts/MainLayout.tsx`
- `src/components/booking/ConfirmBar.tsx`
- `src/app/App.tsx`
- `src/components/common/MaintenanceGate.tsx`
- `src/utils/bundles.ts`
- `src/utils/discount.ts`
- `src/config/featureFlags.ts`

---

## Executive summary

1. **The customer site has ZERO active promo surface today.** `PROMOS_ENABLED`
   is hardcoded `false` (28s84), then live-overridden from
   `adminSettings/publicRules.promosEnabled` (28s298). Until View flips it,
   every promo control on the customer side is dead — the `FirstBookingBanner`
   and `HeroSection` promo banner are already dropped (28s251), and the
   only remaining touchpoint is the checkout discount-code TextField which
   itself hides behind `PROMOS_ENABLED`. The customer-side effect of Round
   28r49/50/51 is currently invisible without an admin turning promos on.
2. **HomePage is intentionally chrome-free.** After the 28s140-149 purge,
   the customer landing page is: TopNav (from MainLayout) → sr-only H1 →
   HomeTherapistGrid → 32px spacer → BottomNavGlass. No hero, no promise
   strip, no footer. **The PromoStrip has ONE natural slot on home**: as a
   thin band directly below TopNav, above the `HomeTherapistGrid` tagline.
   Founder policy (§12 CLAUDE.md) says "don't remove product surfaces just
   because we lack engagement data" but ALSO says "Home now opens directly
   with the product". A slim, dismissible promo strip respects both — it's
   product-relevant (real active codes only) and small enough not to
   compete with the therapist list for attention.
3. **Every "phone shell" hardcodes `maxWidth: 430px`** and sits centered on
   an unstyled body. The site is a mobile-first web-app clone (Grab/Klook
   pattern). This is fine, but ANY new promo strip MUST honor the same
   430px cap OR be explicitly desktop-aware (extending under the phone
   shell background). A raw `width: 100%` promo strip would blow the shell
   open on desktop viewports. **Design decision needed in Phase 2**: is
   the promo strip inside the phone shell (safest) or outside as a
   full-bleed band on desktop only? Recommendation: **inside the phone
   shell**. Consistent with every other customer surface, and desktop
   traffic to this site is negligible (TG channel, taxi cards, WeChat all
   send mobile).
4. **The active promo code already flows through checkout correctly.**
   `?promo=CODE` is captured on HomePage mount (`capturePromoFromURL`)
   into `localStorage["sunred.discount.promo"]`, and BookingFlowPage
   `getInitialDiscountCode()` pre-fills the discount field from it (with
   the `?ref=` referral code winning if both are present). The PromoStrip
   copy-to-clipboard is thus mainly a UX affordance — the flow works even
   without a copy step. Same LS key can be used to power "code
   pre-applied" cues on the strip.
5. **Fixed-position hazards exist and must not collide with the
   PromoStrip.** `ConfirmBar` on BookingFlowPage is `position: fixed`
   `bottom: var(--cta-bottom-offset)`, `zIndex: 50`. TopNav is
   `position: sticky` `top: 0`, `zIndex: 100` at MainLayout level. The
   `AdminFloatingChat` is `position: fixed` (implied from lazy-loaded
   framer-motion FAB). Any sticky top PromoStrip must sit BELOW TopNav
   (visually) and at `zIndex < 100` OR inside the same sticky column.
   Recommendation: render PromoStrip **in-flow** (not sticky) directly
   below TopNav in MainLayout OR HomePage. Keeps it above the fold, out
   of z-index math, and disappears on scroll — matching the "don't stay
   in the way while browsing therapists" instinct.

---

## Surface-by-surface breakdown

### `src/pages/HomePage.tsx`

**What's shown top-of-fold:** TopNav (from MainLayout) → an sr-only `<h1>`
(28s96 SEO fix) → nothing visible until HomeTherapistGrid starts. The page
sets `maxWidth: 430px`, `background: #F4F6F5`, `borderRadius: 28px` — the
"phone shell" wrapper.

**What's shown mid-page:** delegated entirely to `<HomeTherapistGrid />`.

**What's shown at footer:** a 32px `<Box>` spacer, then MainLayout adds
`<BottomNavGlass />` at bottom.

**Where a promo/bundle CTA would slot naturally:**
- **Slot A — Directly below sr-only H1, above HomeTherapistGrid.** In-flow.
  Consumes the 8px top margin space the grid already reserves. This is
  the primary Phase 2 slot.
- **Slot B — Inside HomeTherapistGrid header,** replacing the "N practitioners
  on standby" line during promo-active periods. Higher visibility (already
  the first thing a guest reads) but conflicts with the concierge-mode
  status copy the grid header intentionally holds. Not recommended.
- **Slot C — In MainLayout below TopNav.** Would put the strip on EVERY
  customer route (Home, Services, Therapist detail, BookingFlow, Booking
  history, etc.). Higher reach but risks feeling spammy on BookingFlow
  where the discount field is right there.

**Which existing components could host promo copy without a rewrite:** None
today — HomePage is deliberately empty of chrome. The PromoStrip has to
be a NEW component, mounted somewhere between MainLayout's TopNav and the
Outlet.

**Layout responsiveness:**
- Hardcoded `maxWidth: 430px` phone shell on the page-level Box. Any promo
  strip child inherits this cap unless it uses `margin: 0 calc(-(100vw -
  430px)/2)` tricks — DO NOT do that. Stay inside the shell.
- No hardcoded negative margins on HomePage itself.
- No absolute-positioned elements except the sr-only H1 (properly clipped).
- On desktop: the phone shell is centered with a shadow; PromoStrip fits
  inside cleanly.

**Fixed-position bugs / z-index collisions:** None on HomePage itself.
Beware TopNav sticky `z-index: 100` in MainLayout — any sticky PromoStrip
must sit BELOW it (top offset = TopNav height, ≈ 56–64px).

**Promo-activation state flow:** ✅ Working. `capturePromoFromURL()` +
`captureReferralFromURL()` fire on mount. `getInitialDiscountCode()` at
BookingFlow mount reads the LS keys and pre-fills the field. The PromoStrip
just needs to READ the same state to show "code pre-applied" or nudge
"tap to apply your code". No new plumbing required.

**Dead components imported but not rendered:** None in current HomePage.
Historical: `HeroSection`, `PromiseStrip`, `HomeFooter` files were fully
DELETED in 28s251 (not just unimported — physically removed). The
CLAUDE.md refs to them being "kept on disk for git revert" are stale;
git history is the only revert path now.

---

### `src/components/home/HomeTherapistGrid.tsx`

**What's shown top-of-fold:** Centered serif tagline "Bangkok's most
discreet outcall massage, *delivered to you.*" (italic accent in
brand-red) + status pill line "N practitioners on standby" (or fallback
concierge copy when N=0).

**What's shown mid-page:** `<TherapistSearchBar />` → single-column list
of `<TherapistMinimalCard />`, each with distance/status/badge. First
card is LCP-tagged (`eager={i === 0}`, 28s227). Empty-state block with
WhatsApp concierge CTA when the filter/search returns 0.

**What's shown at footer:** `<HomeMapBrowse />` (restored 28s149) when
there's at least one visible therapist and load has resolved.

**Where a promo/bundle CTA would slot naturally:**
- **Slot D — ABOVE the tagline block** (line 379–456). Would push the
  tagline down but is visually the most "hero" position now that Hero
  is gone. Overlaps with Slot A above; effectively the same slot.
- **Slot E — Between the status pill line and TherapistSearchBar.**
  Explicitly targets guests already reading "on standby" copy but
  before they start filtering. Reasonable, low collision.
- **Slot F — Inside empty-state.** When 0 therapists match, surface an
  active bundle offer ("Save your slot for tonight with our 3-session
  bundle"). Highest-impact place since guests are otherwise leaving.

**Which existing components could host promo copy without a rewrite:** None
today. The status pill line at 416–455 could be sibling'd with a promo
pill in the same flex row without a rewrite, but the phrase is
conditional (holiday/available/empty) and stacking a promo pill AND a
status pill in a 430px wrap-friendly row risks the "single pill balloons"
bug called out in 28s289.

**Layout responsiveness:**
- `margin: "20px 0 4px"` on the outer section — safe.
- `minHeight: { xs: 800px, sm: 900px }` on the section (28s146) — reserves
  vertical space for CLS. A PromoStrip added ABOVE this section pushes
  content below its own height, but the section min-height doesn't
  compound (it's still the same 800/900 floor).
- `padding: "0 14px 16px"` on the card column — safe, no negative margin.
- `<HomeMapBrowse>` at the bottom — no known layout hazards but is a large
  child that reserves its own space.

**Fixed-position bugs / z-index collisions:** None on the grid itself. The
grid is scroll-flow only.

**Promo-activation state:** Not connected today. The grid does not read
`activePromos` or `activeBundles`. Phase 2 wiring would either mount
PromoStrip above the grid (in HomePage) or add a smaller inline
"active bundles" chip inside the grid header.

**Dead code imported but not rendered:**
- `TherapistProfileCard` (imported line 13, `void TherapistProfileCard;`
  at line 565 — deliberately kept for revert per comment).
- `nowBKK` (imported line 35, `void nowBKK;` at 574 — same reason).
- `totalAvailable`, `totalExpress` (memo'd but not rendered — filter UI
  removed 28s166).
- These are all `void`-touched — real "kept for revert" markers rather
  than accidental dead imports. Safe to leave.

---

### `src/components/home/TopNav.tsx`

**What's shown:** solid `#B4000A` brand-red bar, 8px top pad + 14px bottom
pad + 18px horizontal pad. Hamburger left (white icon, no ring 28s170) +
centered "SUNRED" Cinzel caps wordmark + 40px right spacer (language pill
was removed 28s168; auto-locale from device).

**Bar height:** approximately 42–48px (IconButton is 40px + 8+14 vertical
pad + wordmark line-height). Any sticky PromoStrip needs `top:` matching
this height OR MainLayout's sticky column height.

**Where a promo/bundle CTA would slot naturally:**
- **NOT inside TopNav.** The nav bar is deliberately minimal and red-branded.
  Adding a fourth control there breaks the founder's "3 tabs, no frame"
  aesthetic direction from 28s169/28s170.
- **Below TopNav, inside the same sticky column in MainLayout** — this is
  the highest-visibility slot: it sticks with TopNav on scroll.
- **In the drawer, as a "Refer & earn" style entry.** The `INFO_ITEMS`
  array already has a `Refer & earn` action. A "Current promos" nav item
  is a low-friction add for TopNav drawer but reaches drawer-openers
  only (small audience).

**Layout responsiveness:**
- Fully width-fluid (`display: "flex"`, `justifyContent: "space-between"`).
- `transform: hidden ? translateY(-100%) : translateY(0)` — auto-hides on
  scroll-down past y=80 (line 199). **CAUTION: if PromoStrip sits BELOW
  TopNav in the same sticky column, both hide together — probably fine;
  if PromoStrip sits ABOVE TopNav, the auto-hide creates a stray gap.
  Recommendation: BELOW TopNav.**
- Drawer uses `PaperProps={{ sx: { width: 280 } }}` — fine.
- All hover/focus outlines correctly use `#B4000A`; consistent.

**Fixed-position bugs / z-index collisions:**
- MainLayout wraps TopNav in `position: "sticky", top: 0, zIndex: 100`.
- TopNav itself is `position: "relative", zIndex: 10`.
- The sticky column is 430px max-width and centered — a PromoStrip inside
  this same column inherits the correct centering and z-index for free.

**Promo-activation state:** Not touched today.

**Dead components imported but not rendered:** None. Every icon import is
used at least once. `ConciergeModeIcon` and `useConciergeMode` are
commented-imported for reference (28s142) — safe.

---

### `src/components/home/HeroSection.tsx`

**STATUS: FILE DOES NOT EXIST.** Verified via `ls` — the file was fully
deleted in Round 28s251 dead-code cleanup (per CLAUDE.md notes at
28s140-145 and 28s251, "removed 20 dead source files"). HomePage's
comments at lines 7–12 falsely claim the file is "still on disk for
git revert" — that's stale; git history is the only revert path.

**Action recommended (out of scope for r51):** clean up HomePage.tsx's
obsolete `// HeroSection.tsx still on disk` comments.

---

### `src/components/home/PromiseStrip.tsx` / `src/components/home/HomeFooter.tsx`

**STATUS: BOTH FILES DO NOT EXIST.** Same deletion — 28s251. HomePage's
comments at lines 26–43 also falsely reference these files "on disk".
Same stale-comment cleanup opportunity.

The PromiseStrip's value pillars (price anchor, 5 languages, licensed,
quiet luxury) are covered elsewhere:
- Price anchor → StepService card + duration sheet in BookingFlowPage
- 5 languages → auto-detected + TopNav drawer note
- Licensed → About-us pillars in ServicesPage
- Quiet luxury → tagline in HomeTherapistGrid

The PromoStrip is NOT a PromiseStrip replacement. Different job entirely
(active offer surface vs. brand trust signal). Do not conflate them in
Phase 2.

---

### `src/pages/ServicesPage.tsx`

**What's shown top-of-fold:** 12px spacer → tab strip (Services / About us
/ How to book) as a red-pill sliding tabbar (framer-motion `layoutId`
animation).

**What's shown mid-page (Services tab):** brand-red "RATES & SERVICES"
section header bar (spans -16px to +16px, breaks the 430px shell edge —
intentional) → horizontal-scroll snap row of 4 rate cards, bestseller
auto-scrolled center on mount.

**What's shown at footer:** Concierge channel grid + Telegram subscribe
link (moved from How-to-book in 28s188). Bottom pad 8 units.

**Where a promo/bundle CTA would slot naturally:**
- **Slot G — Directly above the RATES & SERVICES section header.** When a
  guest lands on this tab, the tab strip → promo strip → rate cards flow
  gives them "pricing → discount → book" in the correct order.
- **Slot H — Per rate card, a corner ribbon "BUNDLE AVAILABLE" that opens
  a bundle sheet.** This is the highest-conversion place for a bundle
  hint but requires per-card wiring changes. Not shipping in r51.
- **Slot I — Inside the About us tab, replacing/augmenting the 4 pillar
  cards.** Low-priority — guests on About are usually researching, not
  ready to book.

**Which existing components could host promo copy without a rewrite:** The
brand-red section header at 359–399 could be modified to include a small
promo pill next to "5 rituals" — but it's a text-only bar and adding
component logic changes its Simple styling. Cleaner to add PromoStrip as
its own row.

**Layout responsiveness:**
- Phone shell wrapper again — `maxWidth: 430`, `borderRadius: 28px`.
- The RATES section header uses `margin: "0 -16px 12px"` — extends past
  the shell's own padding by design, filling shell edge-to-edge with red.
  A PromoStrip above it would ALSO benefit from this pattern to feel
  visually contiguous with the red section band. Explicit design decision
  needed in Phase 2 — matching or contrasting the section band?
- The rate-card carousel uses `margin: "0 -16px"` + `padding: "40px 0 24px"`
  + `scrollPaddingInline: "calc((100% - 290px) / 2)"`. All 290px cards
  scroll-snap center — a promo card above the carousel could use the same
  290px width for visual rhyme.
- No fixed-position elements on this page (no ConfirmBar).

**Fixed-position bugs / z-index collisions:** None inside the page.

**Promo-activation state:** Not connected today. ServicesPage does not
read `activePromos` or `activeBundles` — the entire promo layer is
BookingFlow-only.

**Dead components imported but not rendered:** Zero — the 28s195 audit
already dropped quiz + compare dialog imports.

---

### `src/pages/booking/BookingFlowPage.tsx`

**What's shown top-of-fold:** Sticky back header → therapist header block
with tweened price.

**What's shown mid-page:** SectionCard(s) for Order, Address, Pricing.
Pricing card at 1780+ contains: hero taxi row, tier chips, discount code
input (gated `PROMOS_ENABLED`), live validation feedback (`discount.valid`
→ green tick + label, `!discount.valid` → smart-hint), discount row in
price breakdown.

**What's shown at footer:** `<ConfirmBar />` — `position: fixed`,
`bottom: var(--cta-bottom-offset)`, `maxWidth: 430`, `zIndex: 50`.

**Where a promo/bundle CTA would slot naturally:**
- **Slot J — Above the Pricing card,** as a "Save with X" nudge showing
  the best active promo. Users are already on-price, one field down from
  applying.
- **Slot K — Inside the discount-code TextField's `endAdornment`** — a
  small chip listing the top active promo, tapping fills the field.
  Highest conversion (zero-friction application) but only works when
  `PROMOS_ENABLED` is true.
- **NOT the PromoStrip.** The strip is a homepage/lobby surface. On
  BookingFlow the user has committed to a therapist — a top strip would
  be noise. If we want a checkout-specific promo hint it should live IN
  the pricing card, not as a page-top strip.

**Layout responsiveness:**
- `maxWidth: 430` phone shell.
- ConfirmBar is fixed at `--cta-bottom-offset` (defined in index.css).
- Discount code field is a full-width MUI TextField inside the Pricing
  SectionCard.

**Fixed-position bugs / z-index collisions:**
- ConfirmBar `zIndex: 50` — below the MaintenanceGate screen (implicit
  higher z) but above HomeMapBrowse-style overlays. If a PromoStrip
  banner is added to this page (which is NOT recommended), it must not
  collide.

**Promo-activation state:** ✅ Fully wired. `getInitialDiscountCode()`
+ `validateDiscount()` + submit-time redemption cap check
(`getCustomPromoLimits`). This is the canonical consumer of the promo
system today.

**Dead components imported but not rendered:** None material after the
`selectedAddons`/`bookingExtras` deprecation in 28r49 (comments confirm).

---

### `src/pages/booking/BookingSuccessPage.tsx`

**What's shown:** Success animation, booking ID pill, "will arrive at"
copy, therapist prep status banner, 2×2 quick-action cards (Chat / Track
/ Calendar / Reschedule), booking summary card, prep list, done button.

**Where a promo/bundle CTA would slot naturally:**
- **Slot L — A "next booking" bundle offer AFTER the summary card.** "You
  loved this? Save X% on your next 3 sessions." This is the highest-LTV
  place to surface bundle packages — guest has JUST paid, is emotionally
  bought in.
- **Slot M — Referral encouragement** (already partly served by
  `ReferralDialog`) — code becomes "share with friends".

**Layout responsiveness:** phone shell same as everywhere else. No fixed
z-index concerns.

**Fixed-position bugs / z-index collisions:** None.

**Promo-activation state:** Booking success writes `discountCode` +
`discountAmount` to the doc. Post-booking upsell offers ARE the next
promo-system frontier but out of scope for r51.

**Dead components imported but not rendered:** None material.

---

### `src/components/layouts/MainLayout.tsx`

**Composition:** phone-shell-width sticky column (RoleViewBanner → TopNav)
→ `<Outlet />` → `<BottomNavGlass />`.

**Where PromoStrip lives, most likely:** **inside the sticky column,
between TopNav and the outlet**. Rendering it here reaches every customer
route in one line. This is the recommended Phase 2 slot. Trade-off: it
appears on Services + Booking + Therapist detail too — good for reach,
bad for BookingFlow (see Slot J/K discussion).

**Alternative:** mount inside HomePage only. Less reach, cleaner UX per
surface. **Recommendation: mount in MainLayout initially, add a
`hideOnRoutes={["/booking", "/booking/:id"]}` prop later if founder
reports checkout distraction.**

**Layout responsiveness:** `maxWidth: 430`, centered, sticky top:0
zIndex:100. Whatever the PromoStrip does, it inherits these.

---

### `src/app/App.tsx`

**Routing observations:**
- 55 prerendered routes (localized + district variants).
- HomePage is `<HomePage />` at `/`.
- MaintenanceGate wraps ALL routes (`<MaintenanceGate><Routes>...`).
- `MainLayout` wraps every customer-facing route.
- Admin, auth, and maintenance routes bypass MainLayout.

**Impact on PromoStrip mounting:** if mounted inside MainLayout, it shows
on: `/`, `/services`, `/services/:id`, `/therapists/:id`, `/booking`,
`/booking/:id`, `/booking/success/:id`, `/payment-methods`,
`/notifications`, `/booking/history`, `/review/*`, `/saved`, `/profile`,
`/edit-profile`, `/update-location`, `/location`. This is the full
customer walking-around surface — perfect reach.

**Auth pages** (`/login`, `/register`, `/maintenance`, `/wechat-scan`)
bypass MainLayout. That's correct — no promos to show there.

---

## Promo surface recommendations — ranked by impact

**Top 3 recommended slots for Round 28r51 / Phase 2:**

1. **PromoStrip inside MainLayout, directly below TopNav, in-flow (not
   sticky).** Reach: every customer route. Cost: single mount point. Risk:
   BookingFlow distraction (mitigate with `hideOnRoutes` prop in a
   follow-up). ✅ Recommended for initial Phase 2 mount.

2. **BundleCard row on HomePage, between HomeTherapistGrid tagline and
   the search bar.** Product-specific ("Weekly Ritual — save 10%") and
   surfaces bundle offers separately from promo codes (which are
   discount-oriented). Higher conversion for high-consideration guests.
   Ship as a separate `HomeBundleRow` component in Phase 3.

3. **Post-booking upsell on BookingSuccessPage.** "Next visit — 10% off
   with FIRST10 · Save more with the Weekly Ritual bundle." Highest LTV
   surface. Ship in Phase 4 once repeat-guest data supports it.

**Anti-recommendations (do NOT do):**

- ❌ **Do not** mount PromoStrip inside TopNav — breaks the founder's
  minimal red bar aesthetic (28s169/70).
- ❌ **Do not** re-introduce the deleted PromiseStrip as a PromoStrip
  hybrid. Different jobs. Founder was explicit: PromiseStrip stays gone.
- ❌ **Do not** show PromoStrip when `PROMOS_ENABLED` is false — the
  entire promo layer is admin-gated. Component MUST early-return null
  when disabled; hook already does this via empty `activeCustomCodes`
  when no promos are configured.
- ❌ **Do not** show PromoStrip inside the empty-state block on
  HomeTherapistGrid without a bundle-aware fallback — the empty state
  already has a concierge CTA and stacking a promo strip on top makes
  the block feel spammy.
- ❌ **Do not** hardcode a promo code in the PromoStrip. Everything must
  come from live `publicRules` + `promoCodes` collection.

---

## Responsive risk register — hazards to address before Phase 3

**Hard-coded widths / negative margins:**

| Location | Value | Risk | Mitigation |
|---|---|---|---|
| HomePage phone shell | `maxWidth: 430px` | Content wider than 430 breaks | Stay inside shell |
| HomeTherapistGrid section | `minHeight: { xs: 800, sm: 900 }` | CLS reservation baked in | Not a promo risk |
| ServicesPage RATES header | `margin: "0 -16px 12px"` | Breaks shell edge intentionally | PromoStrip can mimic |
| ServicesPage card carousel | `margin: "0 -16px"` | Breaks shell edge intentionally | Match pattern if adjacent |
| ServiceDetailPage sticky CTA | `position: fixed`, `bottom: 0` | z-index math needed | Don't overlap |
| BookingFlow ConfirmBar | `position: fixed`, `zIndex: 50` | Bottom-anchored | Ignore — top strip only |
| MainLayout sticky column | `top: 0`, `zIndex: 100` | Highest customer z-index | PromoStrip must be < 100 or child |
| TopNav auto-hide | `transform: translateY(-100%)` at scroll | Below-nav strip risks orphan gap | Recommend NON-sticky PromoStrip |

**Text-overflow hazards:**

| Location | Content | Risk | Mitigation |
|---|---|---|---|
| PromoStrip copy | Rotating multi-lingual text | Long codes ("FIRST10-EXTENDED") wrap | `whiteSpace: nowrap` + `text-overflow: ellipsis` |
| PromoStrip on desktop | Wide viewport | Stretched text loses hierarchy | `max-width: 1200px` desktop cap, but constrained inside 430px shell |
| Snackbar copy | "Code copied — apply at checkout" | Multi-lang wrap | Toast component handles this |

**Z-index inventory (customer-facing):**

- `100` — MainLayout sticky column (TopNav)
- `50` — ConfirmBar
- `10` — TopNav internal
- `3` — bestseller ribbon on ServicesPage rate card
- Snackbar (MUI default) — typically `1400`
- BottomNavGlass — implicit high (footer sticky)

PromoStrip must use `z-index < 100` if in the sticky column, OR be
in-flow (no z-index needed).

**Language-switch resilience:**

The PromoStrip copy runs through `useTranslation()`. Every string in
Phase 2 needs to be i18n'd across en/th/zh/ja/ko (28s223 language-detection
reordering makes this critical — device locale wins by default). Copy
must be short enough not to wrap unpredictably in CJK.

**Reduced-motion resilience:**

The 6-second rotation MUST respect `prefers-reduced-motion` — either
freeze on the first promo or crossfade with a much longer duration.
Precedent: ConfirmBar's totalPulse animation already guards with
`@media (prefers-reduced-motion: no-preference)`.

**Accessibility contract:**

- `role="status"` + `aria-live="polite"` on the rotating text region
  (announces changes without interrupting).
- Dismiss button: real `<button>`, keyboard-focusable, labelled
  "Dismiss promotional banner".
- Tap-to-copy: keyboard-triggerable (Enter/Space), snackbar with role
  "status", not "alert" (not urgent).
- Focus visible outline: match `#B4000A` sitewide pattern.

**Reflection cross-check:**

The Phase 2 wiring depends on the r51 hook + component. Everything r51
ships must degrade gracefully when:
1. `PROMOS_ENABLED = false` → strip returns null.
2. `activeCustomCodes.length === 0 && activeBundles.length === 0` → strip
   returns null.
3. Firestore listener errors → strip returns null (hook fails open).
4. sessionStorage dismiss key present → strip returns null.

Any of these must NOT cause layout jump — component simply doesn't render.

---

## Cleanup opportunities (not shipping in r51)

- HomePage.tsx: remove the stale comments referring to HeroSection.tsx /
  PromiseStrip.tsx / HomeFooter.tsx "still on disk". Files are deleted.
- HomeTherapistGrid.tsx: the `void` reference to `TherapistProfileCard`
  is 5 rounds old; if a future round doesn't restore the 2-column layout,
  drop the import entirely.
- Consider a follow-up `PromoStripHost` component that owns the
  `hideOnRoutes` gating so BookingFlow can be excluded cleanly.
- `PROMOS_ENABLED` early-return is currently in the strip itself; consider
  moving to the hook so consumers get an empty `activeCustomCodes` when
  disabled AND when off — simpler for downstream reuse.

---

## Handoff

- Task 1 (this report) informs Phase 2 mount decisions.
- Task 2 (PromoStrip.tsx + useActivePromos.ts) ships this round but is NOT
  mounted anywhere — pending founder review of this report.
- Recommended first mount: MainLayout, below TopNav, in-flow.
- Recommended second surface: separate `HomeBundleRow` for bundles.

End of audit.
