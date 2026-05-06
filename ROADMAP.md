# 🗺️ SunRed — Migration Roadmap (Existing `sunred-vite/` Project)

> Tasks are ordered by dependency. Complete each one fully before moving to the next, unless explicitly approved.

## 🔍 Task 0 — Discovery & Migration Plan

**Do this first. Do not skip.**

1. `cd sunred-vite/`
2. Audit the existing codebase:
   ```bash
   cat package.json                # see deps + scripts
   ls -la src/                     # see structure
   find src -type f -name "*.tsx" -o -name "*.ts" | head -50
   cat vite.config.ts
   cat tsconfig.json
   git log --oneline -20           # see recent commits
   git status                      # see uncommitted work
   git branch -a                   # see existing branches
   ```
3. Run the dev server once to see what's already there:
   ```bash
   npm install
   npm run dev
   ```
   Take a screenshot of the current home page on mobile viewport (430px).
4. Produce a **migration plan document** at `00-handoff/MIGRATION-PLAN.md` that includes:
   - Current dependencies → which to keep, add, remove
   - Current pages/routes → mapping to new pages from mockups
   - Current components → keep / refactor / replace / delete
   - Current i18n setup → how to extend to 5 locales
   - Current styling approach → migration path to MUI + Liquid Glass
   - Risk areas (anything that might break)
   - Estimated number of files touched per phase

**Wait for my approval of MIGRATION-PLAN.md before continuing.**

## 🛠️ Task 1 — Foundation refactor

Branch: `redesign/foundation`

Goal: Get the existing project's foundation aligned with the new design system, without touching any specific pages yet.

- [ ] Add MUI v5 if not already installed (`@mui/material @mui/icons-material @emotion/react @emotion/styled`)
- [ ] Add Fraunces + Inter fonts to `index.html` `<head>` (or set up `@fontsource` packages)
- [ ] Create or update `src/theme/brand.ts` with the BRAND tokens from BRAND.md
- [ ] Create or update `src/theme/muiTheme.ts` with MUI ThemeProvider config using brand tokens
- [ ] Wrap `App.tsx` with `<ThemeProvider>` and `<CssBaseline />`
- [ ] Set up react-i18next with the 5 locales from `03-i18n/locales/`
- [ ] Add a language switcher component (placeholder — actual UI in Task 2)
- [ ] Drop `02-components/HeroSection.tsx` into `src/components/home/HeroSection.tsx`
- [ ] Verify `<HeroSection />` renders at 430px width with all 5 languages working
- [ ] Show me the result and wait for approval

**Done means:** Hero renders perfectly. All 5 languages switch correctly. No regression in existing pages (they may look unstyled but should still render).

## 📋 Task 2 — Phase 1: Home page

Branch: `redesign/phase-1-home`

**Reference:** `01-mockups/sunred-home.html`

Build these sections, each as its own component in `src/components/home/`:

- [ ] `StatusBar.tsx` (if needed — may already exist)
- [ ] `TopNav.tsx` — Menu / brand wordmark / language switcher
- [ ] `HowItWorksSection.tsx` — 3 numbered steps with gradient circles
- [ ] `ServicesSection.tsx` — Featured "Signature Thai" card + 4 service cards in 2-col grid
- [ ] `TherapistsScrollSection.tsx` — Horizontal scroll of `<TherapistCard>`s with placeholder gradients
- [ ] `TrustSection.tsx` — 4-stat grid in peach-tinted glass container
- [ ] `TestimonialsScrollSection.tsx` — Horizontal scroll, 4 multilingual testimonials
- [ ] `FAQSection.tsx` — 6 collapsible FAQ items
- [ ] `FinalCTASection.tsx` — Gradient block with white CTA pill
- [ ] `Footer.tsx` — Brand row + 4-col link grid + Thai MPH legal disclaimer

**Then update or create the home route:**
- If `src/pages/Home.tsx` (or similar) exists → refactor to compose these sections
- If not → create it and wire to the existing router

Add i18n keys to all 5 locale files for everything new.

**Done means:** Mobile view at 430px matches the mockup pixel-close, all text translates, animations work, no console errors, lighthouse mobile ≥ 85.

## 📋 Task 3 — Phase 2: Therapists Browse + Detail

Branch: `redesign/phase-2-therapists`

**Reference:** `01-mockups/sunred-therapists.html`

Routes (use existing router conventions):
- `/therapists` — Browse list with filters
- `/therapists/:slug` — Detail page (e.g., `/therapists/mai`)

Build:
- [ ] `BrowseHeader.tsx` — Search bar + filter chips + view toggle (Grid/Map/Sort)
- [ ] `TherapistCard.tsx` — Reusable: photo, verified badge, language pills, rating, availability
- [ ] `TherapistGrid.tsx` — 2-col grid
- [ ] `TherapistMap.tsx` — Map view stub (Leaflet or static SVG placeholder)
- [ ] `BottomNav.tsx` — Persistent: Therapists / Discover / Bookings / Concierge / Account
- [ ] Detail page sections: `HeroPhoto`, `StatsCard`, `About`, `Credentials`, `Specialties`, `Languages`, `Pricing`, `Calendar`, `Reviews`, `StickyBookCTA`

Stub data: Create `src/data/therapists.ts` with 6-10 mock therapists. **If the existing project already fetches therapists from an API, hook into it instead of using mocks.**

## 📋 Task 4 — Phase 3: Booking flow

Branch: `redesign/phase-3-booking`

**Reference:** `01-mockups/sunred-booking.html`

Route: `/book/:therapistSlug`

Use a state machine pattern (`useReducer` or `xstate` if you prefer) — do NOT add a third-party form library yet.

Steps:
- [ ] `Step1ServiceDuration.tsx`
- [ ] `Step2TimeLocation.tsx` — Calendar + slots + map preview + location input
- [ ] `Step3DetailsAddons.tsx` — Phone with country flag, language preference grid, add-on toggles, notes
- [ ] `Step4ReviewPay.tsx` — Summary + price breakdown + payment picker (Apple Pay, Visa, **Alipay**, **WeChat Pay**)
- [ ] `Step5Confirmation.tsx` — Animated check, booking ID, action grid, what-to-prepare tips
- [ ] `BookingProgressBar.tsx` — 4-segment progress bar
- [ ] `TherapistStrip.tsx` — Persistent therapist preview at top of all steps

**Important:** Payment is mocked at this stage. If the existing project has real payment integration, do NOT remove it — wrap it behind a feature flag and use mock for redesign demo.

## 📋 Task 5 — Phase 4: Account, Bookings, Live tracking

Branch: `redesign/phase-4-account`

**Reference:** `01-mockups/sunred-phase4.html`

Routes:
- `/account`
- `/bookings`
- `/bookings/:id` (live tracking view)

Build:
- [ ] `AccountHero.tsx`, `AccountStats.tsx`, `QuickActions.tsx`, `SettingsList.tsx`
- [ ] `BookingTabs.tsx` — Upcoming / Past / Saved
- [ ] `BookingCard.tsx` — Status variants (upcoming / in-progress / completed / canceled)
- [ ] `LiveTrackingMap.tsx` — Animated therapist pin with pulsing ring + ETA badge
- [ ] `TimelineComponent.tsx` — Vertical booking stages timeline

If existing project has real auth → wire to it. If not → mock the user as "Li Wen" per the mockup.

## 📋 Task 6 — Static pages: About, Help, B2B

Branch: `redesign/phase-5-static`

Routes:
- `/about`
- `/help`
- `/for-hotels`

Mostly content. Build components but no interactivity beyond FAQ accordion + B2B form (validation only, no submit).

## 📋 Task 7 — i18n complete coverage sweep

Branch: `redesign/i18n-sweep`

After all components exist:
- [ ] Every visible string is wrapped in `t()`
- [ ] All 5 locale files have full key coverage (run a script to detect missing keys)
- [ ] Language switcher in nav works smoothly
- [ ] Locale persists in localStorage
- [ ] Document any keys the existing translations are missing

## 📋 Task 8 — Cleanup & deploy

Branch: `redesign/cleanup`

- [ ] Remove dead code from old design (with my approval list-by-list)
- [ ] Update README.md with new architecture
- [ ] Run `npm audit` and address high/critical vulnerabilities
- [ ] Verify mobile rendering on real device or BrowserStack
- [ ] Build production bundle and verify size
- [ ] Deploy to Vercel preview (or existing host)
- [ ] Confirm with me before promoting to production

## 🚫 Out of scope (do not start without approval)

- New backend / database changes
- New real payment integration
- Real-time tracking infrastructure (WebSockets / Pusher)
- New authentication system
- Therapist-side app
- Admin dashboard
- Marketing site / blog
- Migrating away from Vite

---

## ✅ Definition of Done (every task)

A task is done when:
1. Visual output matches the mockup at 430px width
2. All text is internationalized
3. Mobile interactions work (taps, scrolls, transitions)
4. No console errors or warnings
5. No regression in existing functionality (run existing tests if any)
6. Lighthouse mobile performance ≥ 85
7. PR is up on the redesign branch with screenshots
8. I have reviewed and explicitly approved
