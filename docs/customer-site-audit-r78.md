# Round 28r78 — Customer-Site Audit

**Scope.** Every customer-facing surface after Rounds 28r41 → 28r77
(39 commits: Ocean Study admin bilingual, Bundle Packages, Phase 3
Responsive, Nordic Gray Rebrand Phases 1-4, Nordic Home Sections
build, TopNav duplicate-key hotfix).

**Method.** Grep-first over `src/`, then targeted reads on every page
in the audit brief. Categories A-I as specified. Zero code changes
this round.

**Baseline.** `npx tsc --noEmit` exits 0. onSnapshot cleanups all
paired. All `component="img"` carry `alt=`. No `<img>` tags without
alt. No `key={index}` on obviously reorderable lists (only skeleton
loaders + star arrays).

---

## Executive Summary — Top 5 Findings by Severity

1. **Nordic rebrand incomplete on 5 pages** (severity: HIGH — visible
   drift on top-level customer surfaces). Login/Register/EditProfile
   still ship the pre-Nordic coral/salmon (`#FEAE96`, `#FB8085`,
   `#f5a6a6`, `#F9C1B1`); SavedTherapists uses warm-cream `#fefcf9`
   bg + crimson `#C62828` header; BookingHistoryPage renders
   burgundy avatar gradients `linear-gradient(#2d0909,#5c1c1c)` +
   dark-warm-brown `#1a0805` body ink (17 refs across
   ProfilePage + BookingHistoryPage). ServiceDetailPage swatch
   `#831843` (deep magenta) for SR-B2B3200 + `#E07A4F` (warm clay)
   for xSR-Thai + `#FFF1E5` warm-peach hero fill. NotFoundPage
   ships an invalid `bgcolor: "linear-gradient(#fff6f6, #ffecec)"`
   (MUI `bgcolor` doesn't accept gradients) plus warm-pink palette.
   HoldCountdown Re-book hover `#dc0a3d`, DetailSections
   female-gender icon `#FE5A8C`. Total: **~14 leftover
   non-Nordic hex literals** on customer surfaces.

2. **CLAUDE.md §12 vs shipped code drift on HomeMapBrowse
   placement** (severity: MEDIUM-HIGH — documentation vs reality
   mismatch that will bite the next Claude session). §12 says "map
   stays on home — don't remove without asking founder." Current
   `HomePage.tsx` (post-r76 + 28s335) doesn't render
   `HomeMapBrowse` at all — it's been moved to `/near-me` behind
   the QuickNavRow tile. Either the code is correct and §12 needs
   updating, or the map needs re-adding. Same applies to
   `PromiseStrip`: §12 says "belongs at BOTTOM of HomePage" but the
   file no longer exists in `src/components/common/` (fully
   deleted, not just unmounted).

3. **BookingHistoryPage still 404s admin-created therapists**
   (severity: MEDIUM). Round 28r68 shipped the Firestore fallback on
   `BookingFlowPage.tsx` (lines 415-470) + `TherapistDetailPage.tsx`
   (lines 580+) so `therapistsData.find` misses fall back to
   `getDoc(doc(db, "therapists", tid))`. `BookingHistoryPage.tsx:399`
   still does a plain `therapistsData.find` with no fallback — an
   admin-added therapist's name, photo, rating chip will render
   blank on the history card. `StepService.tsx:132` and
   `StepDateTime.tsx:351` are lower-impact (fall through to default
   catalog / default `09:00-22:00` hours) but still lack the fallback
   pattern. Callers left to fix: **3**.

4. **TopNav ships 3 dead imports and 2 dead consts**  (severity: LOW
   but this was the file that produced the r77 Firestore-crash
   root cause). `useConciergeMode`, `brand`, and `fonts` are
   imported but only referenced inside comments (lines 180-181 +
   header docstring). `SANS` is defined but the mobile branch uses
   MUI theme fonts; net one live use. Dead code invited the r77
   drift; every future TopNav edit rides the same risk surface.

5. **`SavedTherapistsPage.tsx` N+1 Firestore read** (severity:
   LOW-MEDIUM — perf hit for regulars, not correctness). Lines 40-80:
   sequential `await getDoc(doc(db, "therapists", therapistId))`
   inside a `for` loop over favorites. 10 favorites = 10
   sequential round-trips. Should be `Promise.all(favIds.map(id
   => getDoc(...)))` or an `in`-query batch. Founder mentioned
   most guests have 2-4 favorites; not urgent, but easy fix.

---

## Category-by-Category Breakdown

### A. Visual coherence (Nordic Gray palette)

Nordic direction on customer surfaces is **~85% complete**. Sun
mark SVGs deliberately keeping brand red are correctly preserved
(`#D62828` on TopNav two-tone "SUN·RED" wordmark line 428 — matches
28s335 founder direction). Legacy `brand.red` alias in `src/theme.ts`
correctly resolves to `GRAY_900` (Nordic primary), so downstream
`sx={{ background: brand.red }}` renders dark ink not crimson.
Playfair Display / Sarabun / Inter are the only fonts loaded via
Google Fonts (index.html verified). Fraunces / Federo / Cinzel /
Italiana appear only as font-stack fallbacks — they can't render
because they're not loaded.

Findings:

- **Login/Register/EditProfile still salmon.** Hover states:
  `src/pages/LoginPage.tsx:220` `background: "#FEAE96"`;
  `src/pages/RegisterPage.tsx:151` same; fieldset border
  `#f5a6a6`; `src/pages/user/EditProfilePage.tsx:171-177` primary
  Save button `#FB8085` → hover `#F9C1B1`. All should map to
  `brand.text` / `brand.red` (Nordic aliases).
- **SavedTherapistsPage full-page cream + crimson H1.**
  `src/pages/user/SavedTherapistsPage.tsx:97` `background: "#fefcf9"`,
  line 105 `color: "#C62828"`. Neither is Nordic.
- **NotFoundPage warm-pink shell + broken `bgcolor` value.**
  `src/pages/NotFoundPage.tsx:19` `bgcolor: "linear-gradient(...)"`
  — MUI's `bgcolor` doesn't accept gradients, this is a silent
  no-op. Should be `background:` or a swap to `brand.bg1`.
- **BookingHistoryPage burgundy avatar gradient + `#1a0805` body
  ink.** Line 453 `linear-gradient(135deg,#2d0909,#5c1c1c)` and
  lines 466/484/500 use `#1a0805` (warm-brown near-black). All
  should map to Nordic neutrals.
- **ProfilePage `#1a0805` body ink** (13 refs across the file).
- **ServiceDetailPage swatch drift.** Line 85 `#E07A4F` (warm
  clay) for xSR-Thai, line 100 `#831843` (magenta) for SR-B2B3200,
  line 300 hero fill `#FFF1E5` (warm peach). Nordic swatches
  should be neutral or warm sand `WARM_200`.
- **HoldCountdown Re-book hover** line 253 `background: "#dc0a3d"`
  — crimson leftover.
- **DetailSections female-gender icon** line 300 `#FE5A8C` — bright
  pink leftover.
- **Home components use hardcoded Nordic literals, not theme
  tokens.** HomeHero (INK/BODY/CTA_FILL constants), MembershipCard
  (6 TAUPE_* constants), EditorialBanner (`#2D2D2B` `#4B4B48` in
  hex + inline comments naming the tokens), HomeFooterV2 (same
  pattern). Values are right, but bypass `theme.ts` — future palette
  swap will miss them.

Amber (`#F5A623`) preserved on ServicesPage BESTSELLER ribbon
`linear-gradient(135deg, #FFCB45 0%, #F5A623 55%, #C2820F 100%)`
(line 561) — matches CLAUDE.md palette rule.

Sage green (`#16A34A`, `#15803d`) used on BookingSuccessPage +
SelectLocationPage for success state / online dot — matches
CLAUDE.md rule ("green = online status dot only, NOT CTA").

### B. Layout responsiveness

Clean overall. `responsiveShell` from `src/theme/breakpoints.ts`
is the canonical replacement for the old 430px cage, and
`grep -rn 'maxWidth.*430' src/` finds only three legitimate
breakpoint-object usages (BookingFlowPage 1475, SelectLocationPage
862, PaymentMethodsPage 297, BookingSuccessPage 229,
ServiceDurationSheet 199, TherapistInfoSheet 77 — all keyed
`{ xs: "430px", sm: "560px", md: "640px" }`, i.e. deliberate
mobile-first widening).

Findings:

- BottomNavGlass renders `position: fixed; bottom: 0; z-index:
  2000` and reserves ~90-110px via MainLayout's
  `pb: { xs: "90px", md: "110px" }`. Should be safe for all
  in-flow content. ConfirmBar (r67 hotfix) is now in-flow with
  `marginTop: 16px`, no overlap risk.
- HomeHero background image renders full-bleed on xs via
  `backgroundPosition: { xs: "72% center", md: "right center" }`
  so subject stays visible on narrow viewports.
- **No hardcoded 430 cages missed from r52.** Clean.
- BookingFlowPage 2-column desktop layout (r56 sticky pricing
  sidebar) intact — desktop hides mobile ConfirmBar via
  `display: { xs: "flex", md: "none" }`.

### C. Functional correctness

- **React key uniqueness.** No `key={index}`/`key={i}` on
  reorderable data — all `key={i}` occurrences are on skeleton
  loaders, star arrays (`<StarRoundedIcon key={i} />`), or fixed
  React fragments. Reorderable maps use stable IDs
  (`key={therapist.id}`, `key={item.labelKey}`, etc.). r77's
  duplicate-key lesson doesn't repeat anywhere in the audit set.
- **Firestore listener cleanup.** All 10 files that call
  `onSnapshot` return an `unsub` cleanup — verified per-file:
    - `ReviewListPage.tsx` 1/1
    - `BookingHistoryPage.tsx` 1/1 (2 returns, error-branch)
    - `ServiceDetailPage.tsx` 1/1
    - `NotificationsPage.tsx` 1/1
    - `ReviewPage.tsx` 1/1
    - `therapist/TherapistProfilePage.tsx` 2/2
    - `therapist/TherapistLocationPage.tsx` 2/2
    - `home/HomeTherapistGrid.tsx` 2/2
    - `common/MaintenanceGate.tsx` 2/2
    - `TherapistProfileCard.tsx` 3/3
- **No `getDoc` in render/useMemo.** All async reads sit inside
  `useEffect` async IIFEs.
- **Loading states.** Every Firestore-driven page (BookingHistory,
  Notifications, ReviewList, ServiceDetail, Saved, EditProfile,
  therapist pages) shows a `CircularProgress` while loading.
- **ErrorBoundary** wraps the entire tree in `main.tsx:94` — good.
  Nothing per-page — a per-page boundary would be nice-to-have on
  BookingFlowPage since that page's Firestore reads are the most
  complex.
- **Analytics firing.** `HomePage.tsx` fires
  `trackHomeView(consumeLandingArea())` inside `useEffect` with
  `[]` deps → once per mount. Clean.

### D. Routing / navigation

- **DESKTOP_NAV** items: `/` (Home), `/services` (Services),
  `/pricing` (Pricing → PricingPage r71), `/#therapist-grid`
  (Therapists → anchors to HomePage `<Box
  id="therapist-grid">`), `/services?tab=how` (How to Book → tab
  query). All resolve to real routes.
- **QuickNavRow anchor `#therapist-grid`.** Confirmed HomePage
  wraps `<HomeTherapistGrid />` in `<Box id="therapist-grid"
  sx={{ scrollMarginTop: "12px" }}>` (line 152-154). Anchor works.
- **BundleSection concierge deep links** route through
  `whatsappDeepLink(...)` from `@/config/concierge` (line 60,
  70). Not hardcoded.
- **Dead routes.** No routes in `src/app/App.tsx` point at deleted
  components. But `HomeMapBrowse` is only reached via
  `HomeTherapistGrid`'s `mapOnly` branch, which is only rendered
  by `NearMePage.tsx`. `PromiseStrip.tsx` file is deleted —
  `src/components/common/` no longer contains it (verified).
- **Docs-vs-code drift.** CLAUDE.md §12 says HomeMapBrowse "stays
  on home" and PromiseStrip "belongs at the bottom of
  HomePage" — both untrue in shipped code. Either update the doc
  or restore the components. This is the biggest audit surprise.

### E. i18n / bilingual

- **Buttons English-only (r69 rule).** Spot-check: HomeHero CTA
  `t("home.hero.book", "Book Now")`; EditorialBanner
  `t("home.editorial.cta", "Book Now")`; PaymentMethodsPage,
  SelectLocationPage confirm buttons — all English default.
  Clean.
- **Section headers bilingual (r61 rule).** MembershipCard title
  `"Deserve More From Every Massage" / "รับบริการนวดที่คุณคู่ควรมากขึ้น"`
  bilingual pattern preserved. WhySunRedSection uses `textTh`
  field on each bullet.
- **Buttons that violate r69.** HomeFooterV2 link array line 51
  uses raw Thai `"วิธีการจอง"` as `label`. This is a footer link
  label, not a CTA button — falls in a gray zone.
- **Form field placeholders** on booking pages remain English-only
  by convention.

### F. Content / tone

- **Euphemism table respected.** No "senior" (only a code comment
  documenting the r73 fix). No "handjob" / "B2B" / "nuru" in
  user-facing copy. PricingPage r71 uses `"personalised finishing
  ritual"`, `"whole-body oil ceremony"`, `"tension-release
  work"` — verbatim from CLAUDE.md §3.
- **"Therapist" → "Practitioner"** — BottomNavGlass tab label
  was corrected in 28s224. Verified: `TABS[0].label =
  "Practitioners"`.
- **One "discount" leak.** `ReferralDialog.tsx:250` — "They get a
  **discount** on their first booking, and you get the same credit
  when they complete it." Per CLAUDE.md §3, "discount" is on the
  avoid list; replace with "complimentary credit". Small polish
  item but user-visible.
- **No TODO / lorem ipsum** found in customer files.

### G. Accessibility

- **Touch targets ≥ 44×44.** TopNav hamburger `width/height:
  "44px"` (line 351-352). BottomNavGlass tab cells rely on
  measured `tabPx` — on the smallest tested viewport (~375px),
  four tabs = ~93px each, easily above 44. Reserve/Confirm CTAs
  now inline instead of floated, so no mystery affordance size.
- **Focus rings** present on TopNav wordmark (line 392-395),
  desktop nav items (line 485-488), booking CTAs. Consistent
  `outline: 2px solid <color>; outlineOffset: 2;` pattern.
- **Alt text on `<Box component="img">`.** All 6 audited files
  show `imgs=alt` count parity. Verified files: HomeMapBrowse (2/2),
  BundleSection (1/1), TherapistProfileCard (4/4), DetailSections
  (4/4), DetailHero (1/1), TherapistMinimalCard (1/1).
- **Semantic HTML.** TopNav uses `component="nav"` +
  `component="ul"` + `component="li"`. HomeTherapistGrid uses
  `component="section" aria-label="available therapists"`.
  HomePage has an sr-only `<h1>` (line 108-124) for the primary
  SEO keyword. Clean.
- **NotFoundPage 404 image loaded from `i.ibb.co`** — external
  host is a SPOF and a privacy leak (external network call from
  a page users hit when a URL breaks). Prefer a bundled asset or
  none at all.

### H. Performance

- **N+1 read in SavedTherapistsPage** (see Top 5 #5). Sequential
  `await` inside for-loop over favorites.
- **HomeTherapistGrid unbounded listener.** Line 361 subscribes
  to the full `therapists` collection via `onSnapshot(collection(db,
  "therapists"))` (visible per grep). With ~12 therapists on
  roster this is fine; if the collection grows past ~50 docs,
  add a `.where("visible", "==", true)` guard.
- **HomePage minHeight reservation** (line 393
  `minHeight: { xs: "800px", sm: "900px" }`) — prevents CLS while
  Firestore loads. Good.
- **Dead imports** (TopNav, HomeTherapistGrid) don't affect runtime
  but do bloat the bundle slightly:
    - `TopNav.tsx` — `useConciergeMode`, `brand`, `fonts`,
      `SunRedWordmark` all imported. `brand`, `fonts`, `useConciergeMode`
      are unused. `SunRedWordmark` is used once (line 578) — kept.
    - `HomeTherapistGrid.tsx` — `brand`, `glass` unused (only
      `fonts` and `gradients` used).
    - `HomeHero.tsx` — `useConciergeMode` used (line 43) but the
      return `concierge` value isn't further consumed in this
      trimmed hero — worth verifying.
- **NotFoundPage external image** load — see Accessibility above.

### I. Data integrity

- **Admin-therapist support incomplete.** `BookingHistoryPage`,
  `StepService`, `StepDateTime` still do plain `therapistsData.find`
  (Top 5 #3).
- **Prices consistent.** Every customer page that shows a price
  routes through `priceForDuration()` from
  `src/utils/servicePricing.ts`. Verified: PricingPage r71,
  BookingFlowPage, BookingSuccessPage, ServiceDurationSheet.
- **Discount / promo logic centralized.** All promo captures route
  through `capturePromoFromURL()` and `discount.ts` builtin
  overrides. `applyLiveBuiltinOverrides` + `applyLivePromoConfig`
  imported in `MaintenanceGate.tsx:21` — single source of truth
  intact.
- **Firestore rules.** Not in scope of this audit.

---

## Per-Page Findings

### `src/pages/HomePage.tsx`
- Renders the full Nordic sections stack: HomeHero (r76 mobile
  responsive) → QuickNavRow → BundleSection → HomeTherapistGrid
  (wrapped in `#therapist-grid` anchor) → MembershipCard →
  WhySunRedSection → EditorialBanner → HomeFooterV2.
- CLAUDE.md §12 drift on HomeMapBrowse + PromiseStrip (Top 5 #2).
- Clean otherwise.

### `src/pages/ServicesPage.tsx`
- 4-card horizontal snap row with `BESTSELLER_SERVICE_ID =
  "SR-HJ2200"`. Bestseller ribbon amber gradient preserved.
- Line 301 uses a hardcoded font-family string
  `'"Playfair Display", "Fraunces", Georgia, serif'` — should use
  `fonts.heading` from theme.
- `key={i}` at line 831 — inside a fixed-length array, low risk.

### `src/pages/ServiceDetailPage.tsx`
- Swatch drift (Top 5 #1): `#E07A4F`, `#831843`, hero `#FFF1E5`.
- Otherwise Nordic-consistent (buttons `#2D2D2B` etc.).

### `src/pages/TherapistDetailPage.tsx`
- Cover-image gradient palette (lines 182-189) is a warm brown/tan
  set — arguably deliberate as therapist-photo scrim, not a bug.
- Uses the r68 Firestore fallback pattern correctly (line 588,
  806). Admin therapists resolve.

### `src/pages/PricingPage.tsx` (r71)
- Uses Nordic tokens `grays.g900`, `neutrals.n50`, `warmAccents.w100`
  from `@/theme`. Clean colour-wise.
- CTAs (`grays.g900` filled / `grays.g900` outlined) match Nordic.
- Copy uses CLAUDE.md §3 euphemisms verbatim.

### `src/pages/booking/BookingFlowPage.tsx`
- r68 Firestore fallback for therapist lookup (lines 415-470)
  works.
- 430px shell mobile-only breakpoint pattern intact.
- Uses `SERIF` local constant (line 201) — could reference
  `fonts.heading` but not urgent.

### `src/pages/booking/SelectLocationPage.tsx`
- Teal `#14b8a6` iconography for map/location — functional accent,
  not a brand token, acceptable.
- Clean.

### `src/pages/booking/PaymentMethodsPage.tsx`
- Mixed functional accent hexes (`#14b8a6` teal, `#2563eb` blue,
  `#16a34a` green, `#d97706` amber) for payment method icons —
  functional differentiation, acceptable.
- Clean otherwise.

### `src/pages/booking/BookingSuccessPage.tsx`
- Green success state (`#16a34a`, `#15803d`) respected — matches
  CLAUDE.md palette rule.
- Clean.

### `src/pages/BookingHistoryPage.tsx`
- Nordic drift (Top 5 #1): burgundy avatar gradient line 453,
  `#1a0805` warm-brown body ink line 466+.
- Missing r68 Firestore fallback (Top 5 #3) — line 399 does plain
  `therapistsData.find`. Admin-added therapist bookings will
  render with a blank name/photo card.

### `src/pages/LoginPage.tsx` + `RegisterPage.tsx`
- Salmon hover states leftover (Top 5 #1). Otherwise structurally
  fine.

### `src/pages/ReviewPage.tsx` + `ReviewListPage.tsx`
- Clean colour-wise.
- ReviewListPage `onSnapshot` cleanup verified.

### `src/pages/ProfilePage.tsx`
- Nordic drift (Top 5 #1): `#1a0805` body ink (13 refs), burgundy
  avatar gradient line 270.
- Structurally clean; sign-out flow correct.

### `src/pages/user/EditProfilePage.tsx`
- Nordic drift (Top 5 #1): salmon Save button line 171.

### `src/pages/user/SavedTherapistsPage.tsx`
- Nordic drift (Top 5 #1): warm-cream page bg + crimson H1.
- N+1 Firestore read (Top 5 #5) — sequential `getDoc` per favorite.

### `src/pages/NotificationsPage.tsx`
- Clean colour-wise. Firestore listener cleanup verified.

### `src/pages/NotFoundPage.tsx`
- Invalid `bgcolor` gradient value (silent MUI no-op).
- Warm-pink palette + external `i.ibb.co` image (Top 5 #1 +
  accessibility note).
- Uses solid `#2D2D2B` for CTA button — correct Nordic.

### `src/pages/therapist/TherapistProfilePage.tsx`
- Comments reference legacy salmon replacement — copy is Nordic.
- 2 onSnapshot listeners, both cleaned up.

### `src/pages/therapist/TherapistLocationPage.tsx`
- Same. 2/2 cleanup.

### `src/components/home/TopNav.tsx`
- Dead imports (Top 5 #4).
- Hardcoded font-family at line 417 (SUN·RED wordmark) — should
  use `fonts.heading`.
- `DESKTOP_NAV` (line 271-285) items resolve correctly. r77
  duplicate-key fix in place (`key={item.labelKey}`).

### `src/components/home/QuickNavRow.tsx`
- Anchors `#therapist-grid` on HomePage — verified.
- No obvious issues.

### `src/components/home/MembershipCard.tsx` + `WhySunRedSection.tsx` + `EditorialBanner.tsx` + `HomeFooterV2.tsx`
- All 4 hardcode Nordic hex literals (`#6F6556`, `#ECEBE8`,
  `#F7F7F6`, `#2D2D2B`, etc.) rather than importing tokens from
  `theme.ts`. Values match Nordic, but any future palette shift
  will miss them. Nice-to-have refactor.
- MembershipCard uses `"จองก่อนใคร"` in a raw Thai string list —
  bilingual copy expected here.

### `src/components/home/HomeTherapistGrid.tsx`
- Dead imports (`brand`, `glass`) — Category H.
- 2 onSnapshot listeners, cleanup verified.
- HomeMapBrowse mount is behind `mapOnly` prop, only used by
  NearMePage.

### `src/components/home/HomeHero.tsx`
- Hardcoded taupe/espresso literals (`INK`, `BODY`, `CTA_FILL`,
  `CTA_FILL_HOVER`) — bypass theme tokens.
- Uses `useConciergeMode()` at line 43 — verify the returned
  `concierge` value is consumed elsewhere in the file (spot-read
  showed no obvious use).

### `src/components/home/HomeMapBrowse.tsx`
- Only mounted by NearMePage (via HomeTherapistGrid mapOnly branch).
- CLAUDE.md §12 drift (Top 5 #2).

### `src/components/home/ReferralDialog.tsx`
- "discount" copy leak — line 250 (Category F).

### `src/components/home/HowItWorks.tsx` + `HowItWorksFAQ.tsx`
- Nordic-consistent; use Playfair heading stack.
- No red literals.

### `src/components/booking/*.tsx`
- ConfirmBar r67 in-flow pattern intact.
- HoldCountdown `#dc0a3d` hover (Top 5 #1).
- StepService.tsx + StepDateTime.tsx: no r68 Firestore fallback
  (Top 5 #3).

### `src/components/common/*.tsx`
- BundleSection uses `whatsappDeepLink()` correctly.
- PromoStrip: r51 pattern intact.
- ErrorBoundary: single top-level wrap in main.tsx.
- SunRedWordmark: only referenced by TopNav mobile branch.
- LanguageSwitcher, HtmlLangSync, ScrollToTop, LoadingSpinner,
  ConciergeModeIcon, DevPrivacyToggle, KeywordLanding,
  RoleViewBanner, MaintenanceGate — no findings, Clean.
- **FirstBookingBanner and ReferralActiveBanner (in audit brief
  list) don't exist in the tree** — likely deleted in an earlier
  session. Audit brief needs updating.

### `src/components/layouts/MainLayout.tsx`
- Composition (TopNav + PromoStrip + `<Outlet />` +
  BottomNavGlass) is correct.
- `pb: { xs: "90px", md: "110px" }` reserves BottomNavGlass
  clearance.

### `src/components/layouts/BottomNavGlass.tsx`
- `TABS` uses "Practitioners" (CLAUDE.md rule verified).
- ResizeObserver-based pill placement — correct pattern.

### `src/components/therapist/detail/DetailSections.tsx`
- Female-gender icon `#FE5A8C` (Top 5 #1).
- `key={i}` on skeleton / star loops — low risk.

---

## Nice-to-Have Polish List

Not urgent, but worth batching in a cleanup round:

1. Sweep every `SERIF = '"Playfair Display", "Fraunces", ...'` local
   const (17 files) to import `fonts.heading` from `@/theme`. Same
   for hardcoded Nordic hex literals in home sections — route
   through theme tokens so future palette shifts are one-file.
2. Reconcile CLAUDE.md §12 with the shipped HomeMapBrowse-on-/near-me
   +  PromiseStrip-deleted decisions. Either restore or update the
   doc, so the next session's Claude doesn't try to "fix" a
   deliberate design.
3. Rename `brand.red` → `brand.primary` (or similar) and
   `brand.coral` → `brand.textInk` etc. across the ~40 files that
   reference the legacy tree. Values are correct; names lie. Do
   this as a mechanical codemod, not per-file.
4. Delete the empty `HeroSection.tsx` and any other file the
   `import HeroSection from "@/components/home/HeroSection"`
   comment refers to (HomePage line 8-12 mentions it's kept
   for git-revert but never imported).
5. Delete the truly dead imports in TopNav (`brand`, `fonts`,
   `useConciergeMode`) + HomeTherapistGrid (`brand`, `glass`).
6. Swap `bgcolor` → `background` on NotFoundPage:19 and remove the
   external `i.ibb.co` 404 image (either self-host or drop it).
7. Fix the "discount" copy leak on ReferralDialog:250.
8. Move `where("visible", "==", true)` onto the
   HomeTherapistGrid Firestore query if roster is expected to
   grow past ~50.
9. Batch the SavedTherapistsPage getDoc calls into `Promise.all()`.
10. Consider a per-page ErrorBoundary on BookingFlowPage so a
    payment surcharge / promo edge case doesn't crash the whole
    tree back to the top-level main.tsx boundary.
11. Update the audit brief in the next round: FirstBookingBanner
    and ReferralActiveBanner are gone — remove them from the audit
    checklist.

---

## Sections That Came Out Clean

- **B. Layout responsiveness** — no 430px cage misses beyond
  the deliberate breakpoint objects.
- **C. Functional correctness** — 0 unclosed listeners, 0
  `getDoc` in memo/render, 0 duplicate-key risks on reorderable
  lists, 0 tsc errors.
- **D. Routing / navigation** — all DESKTOP_NAV items resolve;
  QuickNavRow anchor works; BundleSection deep links routed
  through the helper. Only concern is docs-vs-code (moved to
  Top 5).
- **G. Accessibility (touch targets, focus rings, alt text)** —
  clean across the audit set. Only concern is the external
  404 image (moved to Top 5 nice-to-have).
