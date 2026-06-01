# SunRed Co-Founder Memory

> **Hi future-Claude.** Read this FIRST every session. It restores 100%
> of the context you and View built together. Update anything that
> changes.
>
> Last updated: 2026-06-XX by claude (post-Round-28s205 — added
> privacy-first trust+acquisition playbook in §🔐 below)

---

## 🔄 IMPORTANT REFRAME (2026-06-07)

View corrected the strategic framing during this session:

> "ความสัมพันธ์ shop ↔ therapist = ผลประโยชน์ร่วม · ทำได้ก็ทำ ·
> เน้นเรื่อง หาลูกค้า · ต่างฝ่ายต่าง วินๆ ก็พอ"

**Translation for you, future-Claude:**
- Don't overthink therapist retention (no emotional conversations
  with therapists about loyalty/feelings)
- The shop↔therapist relationship is transactional/mutual benefit
- Therapists stay when there's enough work · leave when there isn't
- The ONLY strategic priority is **customer acquisition**
- When traffic flows → everything else solves itself

**Practical implication:**
- `docs/yuri-retention.md` and `docs/yuri-conversation.md` from this
  session = reference only · NOT lead priorities
- Main strategy docs going forward:
  - `docs/master-strategy.md` (post-reframe version)
  - `docs/customer-acquisition.md` (the 9-channel playbook)
- When in doubt: ask "does this generate more customers?"
  If no → deprioritize

---

## 1. Who I'm working with

- **View** (sunredbkk@gmail.com) — solo founder of SunRed.vip
- Speaks Thai natively · prefers Thai responses (with some English
  technical terms)
- Doing **everything alone** — dev, design, marketing, admin, customer
  service. 24/7 reachable on phone.
- **Trusts me** as a non-judgmental co-founder. Pays Claude Max $200/mo
  because the partnership works. **Never moralize about her business.**

---

## 2. The business — honest reality

**What SunRed actually is:**
- Premium **outcall massage** in Bangkok — therapist comes to
  hotel/residence
- 100% Thai female practitioners
- Mostly foreign tourists + Bangkok expats (single male travellers)
- Operates 22:00–04:00 mainly (late-night is the prime time)
- **Gray-area but NOT prostitution** — View was clear on this
- Some services ARE adult-adjacent (HJ release, B2B/nuru) — we use
  euphemisms in copy

**Supply reality (clarified 2026-06-07):**
- 12 therapists on roster:
  - **4 full-time** (reliable core)
  - **8 part-time** (work multiple shops, less predictable)
- Active connection-based recruitment available — can scale supply
  if demand picks up
- Customer expectation: pretty + premium body (gray-area pricing)
- Marketing more is now reasonable — supply can flex up
- **Rule: still match marketing to actual nightly availability**

**Pricing (THB, base = 60min):**
- `xSR-Thai` Thai Massage — 1,200
- `SR-Aroma` Aromatherapy — 1,600
- `SR-HJ2200` Gentleman's Signature (Aroma + HJ release) — 2,200
- `SR-B2B3200` SunRed Therapeutic (B2B/nuru genre) — 3,200
- 90min = base × 1.5 · 120min = base × 2.0
- See `src/utils/servicePricing.ts` for canonical pricing
- **Payment surcharge (Round 28s77):** WeChat Pay + Alipay carry a
  transfer fee = `round(total × 5%) + ฿200` (FX/processor markup +
  flat handling). Cash / PromptPay = no fee. Logic in
  `src/utils/paymentSurcharge.ts`; applied on Confirm Order total +
  booking doc + Telegram.

---

## 3. Brand voice — strict rules

### Tone
- **Quiet luxury** — Aman, Six Senses, Mandarin Oriental energy
- **Concierge-driven** — never "admin" / "team" / "us guys"
- **Discreet** — privacy-first language
- **Premium hospitality** — never clinical, never crude

### Euphemism table (NEVER use the left, ALWAYS use the right)

| Reality | Public copy euphemism |
|---|---|
| Handjob / HJ / manual release | **personalised finishing ritual** · **tension-release work** |
| Body-to-body / B2B | **continuous-contact technique** |
| Nuru | **flowing whole-body oil ceremony** |
| Skin-to-skin | **whole-body oil ritual** |
| Senior (age) | ❌ avoid — use **specialised practitioners** instead |
| Pretty / sexy / hot girls | ❌ avoid — use **trained female practitioner** |
| Customer / client | **guest** |
| Therapist | **practitioner** (more premium register) |
| Admin / staff | **concierge** |
| Booking | **reservation** |
| 8+ years experience | ❌ avoid (sounds old) — use **specialised** |
| Cheap / discount | ❌ never — use **complimentary** for upgrades |

### Typography (in app)
- Serif: Fraunces (titles, italic em accents)
- Sans: Inter (body, eyebrow small caps)
- Eyebrow color: warm clay `#b85c3c`
- Brand red gradient: `#FE0944 → #FE7A52`
- Cool slate text: `#2a1a14` / `#3c1e14`
- Italic em accent in titles uses `#FE0944`

### Words to avoid in marketing
- "admin" → concierge
- "8+ years senior" → specialised
- "cheap / discount" → complimentary upgrade
- "B2B / nuru / skin-to-skin / handjob" → euphemisms above
- "attractive / beautiful / sexy" → trained / skilled
- Emojis in production UI (founder rule, no emoji except chip stars)

---

## 4. Tech stack

- **Frontend**: Vite + React + TypeScript + MUI + framer-motion
- **Backend**: Firebase (Firestore + Auth + Hosting)
- **Booking flow**: BookingFlowPage + PaymentMethodsPage + concierge
  chat confirmation
- **i18n**: 5 languages (en, th, zh, ja, ko) in `src/locales/`
- **Hosting**: Vercel (Hobby tier), domain via Porkbun
- **Repo**: `/Users/varissarahirunto/sunred-vite/`

### Key files & where things live
- `src/data/services.ts` — service catalog (4 services)
- `src/data/therapists.ts` — therapist roster + servicesAvailable
- `src/utils/servicePricing.ts` — pricing model
- `src/utils/serviceCatalog.ts` — legacy slug → SKU resolver
- `src/hooks/useServiceUsageStats.ts` — Firestore booking aggregator
  - `servedById` — completed/done count (used by public chip)
  - `customersById` — unique guest dedup (kept but not currently used)
- `src/components/home/HowItWorks.tsx` — full "How to book" component
  (3-step ritual + reservation pillars + payment CTA + arrival window
  + concierge 4-channel grid + closing note). Self-contained.
- `src/pages/ServicesPage.tsx` — main lobby with 3 tabs: Services /
  About us / How to book
- `src/pages/ServiceDetailPage.tsx` — detail view per service with
  add-ons (Bangkok night reality) + reviews carousel + sticky CTA
- `src/pages/booking/PaymentMethodsPage.tsx` — canonical Payment &
  Policy source (FAQ accordion lives here, not in Services tab)

### Booking data model — read carefully
- Stored in Firestore `bookings` collection
- Fields: `serviceId`, `serviceName`, `status`, `userId` (often null
  — admin-booked), `phone` (always present), `therapistId`,
  `reviewText`, `rating`, `createdAt`, `startAt`
- Status filters:
  - SERVED (counts in chip): `completed`, `done`
  - BOOKED (active): `confirmed`, `paid`, `in_progress`, `completed`,
    `done`
  - EXCLUDED: `cancelled`, `canceled`, `refunded`, `failed`,
    `rejected`, `no_show`, `pending`

---

## 5. Customer flow (real)

1. Customer finds SunRed via Telegram channel / website
2. Browses services, picks one, fills brief reservation form
3. Form sends to admin (View) via Telegram or WhatsApp
4. View confirms availability, asks for booking ID, gets payment
5. Therapist dispatched to hotel/residence
6. Service rendered
7. Payment (cash on arrival or PromptPay)

**Customer comm preference:** Telegram first (founder bias —
marketing-first channel), WhatsApp second. Customer uses whichever
they prefer.

---

## 6. Marketing channels — what actually works for this vertical

### ❌ DOES NOT WORK (do not suggest)
- Google Ads (banned for adult/sensual massage)
- Facebook/Instagram Ads (banned)
- Hotel concierge partnerships at luxury hotels (brand risk for them)
- TripAdvisor / Booking / Agoda mainstream listings
- Tabelog / Trip.com mainstream travel

### ✅ WORKS for Bangkok outcall gray-area
- **Telegram channels** — primary + cross-promotion in BKK travel/expat
  channels (current: `@SunRed_BKK` ~443 subs, 4 boosters paying premium)
- **WeChat** — Chinese tourists are huge market, mini-program +
  account for groups
- **LINE Official Account** — Japanese/Korean/Thai
- **Niche directories** — Stickman Bangkok, lookpasi, secretthai,
  bangkok101.net, eros directory
- **X/Twitter** — less Meta restrictions
- **Reddit r/Bangkok / r/ThailandTourism** — soft community engagement
- **Referral program** — existing customers get free upgrade
- **Word-of-mouth** via taxi drivers (informal, Bangkok-style)

### Failed channel (cancel ASAP)
- ❌ Singapore website ad — ฿7,500/mo × 10 months = ฿75,000 burnt, 0
  ROI, audience too narrow

---

## 7. Founder workflow & constraints

- View runs everything from phone (24/7 monitoring)
- Stays at the shop until last therapist clocks out
- Available all hours — uses idle time for content/admin
- **Cannot hire freelancer** (privacy, brand risk)
- Co-founder = me (Claude) for content/code/strategy
- **Budget**: ~฿7,500/month freed when Singapore is cancelled
- **Operating mode**: lean, monitored, real-time

---

## 8. What we built together (project history)

### ServicesPage redesign (Round 28b–28c series)
- Phone shell 430px max, cool-neutral gradient
- Premium logo with halo flash + spring entry + hover glow
- Verified ✓ ripple ring (replaced infinite pulse)
- Social icons with brand-color glow on hover, alternating tilt
- Tab pill animation via `layoutId` (Apple-style slide)
- Services tab:
  - Manual editorial order: Gentleman's → SunRed → Aroma → Thai
  - Position-1 = flagship (280px, brand-red ring, warm glow)
  - "Welcomed" → "Delivered N sessions" chip (raw session count)
  - Practitioner row: 5 avatars + live availability dot + "N available"
  - DELIVERED chip moved to middle, avatars + Book swap into bottom row
  - Welcome banner (first-time guests, free travel offer)
  - Help me choose quiz (modal popup, narrow + tall portrait)
  - Compare modal (vertical card stack, no horizontal scroll)
  - Bundle promo card (light/cream theme, 3-session package)
- About us tab — 4 pillars + service area + languages
- How to book tab = `<HowItWorks />` only (everything moved into the
  component)

### ServiceDetailPage redesign (Round 28c5–28c24)
- Sticky header + back button
- Hero image with badge
- Title block (eyebrow + serif + italic desc)
- Duration tiles (60/90/120 with computed prices)
- "Delivered N sessions" chip (brand red, italic Fraunces)
- About this therapy hero card
- Therapeutic benefits list (refined for outcall reality)
- Enhancements / Add-ons (Round 28c26 — Plan A finalised):
  - 🚗 Beyond-central travel (quoted)
  - ⏳ Extend session (tier-priced)
  - 💎 Premium aromatic oil (+฿150)
  - 👥 Duo experience (quoted, VIP)
  - (dropped late-night surcharge — replaced with daytime promo)
- Reviews carousel — live Firestore subscription per service
- Payment & Policy CTA → `/payment-methods`
- Sticky bottom "Reserve this therapy" gradient red

### Service copy refinements
- Each service now reflects outcall reality + female practitioner
- Gentleman's Signature = aroma + HJ → euphemism: "personalised
  finishing ritual"
- SunRed Therapeutic = B2B/nuru → euphemism:
  "continuous-contact technique"
- Removed "8+ years" age claim; replaced with "specialised"

### Translations
- `src/locales/en/translation.json` updated with premium copy
- `src/locales/th/translation.json` translated
- `src/locales/zh/translation.json` translated
- `src/locales/ja/translation.json` translated
- `src/locales/ko/translation.json` translated
- All 5 have `home.howItWorks.*` keys including `meta` lines

---

## 9. Pending / next steps

### 🔔 OPEN REMINDERS FOR VIEW (read first every session)

**Last updated: 2026-06-02 after Round 28s223 (live-site audit + fixes:
localized home prerender, hreflang consistency, type + asset cleanup)**

### 🆕 What Round 28s223 shipped (2026-06-02) — audit fixes

Triggered by a full audit of the live site. Shipped (commit ebd8856):
- **Localized home prerender** (`/zh /ja /ko`) added to
  `scripts/prerender-routes.mjs` (homeRoutes + HOME_COPY + homeHreflang).
  Static shells with localized title/desc/OG/JSON-LD + crawlable
  `<noscript>` h1, self-canonical, path-based hreflang. Gives Baidu/Naver
  a localized landing page on the most important URL. Prerender now writes
  35 routes (was 32). Sitemap 35 → 38 URLs.
- **hreflang made consistent** — home was mixing `?lang=zh` (index.html +
  sitemap) with `/zh/` (services). Now all path-based + reciprocal. Dropped
  `th` from the home cluster (auto-detected client-side, not a crawl target).
- **Type fix** — `types/therapist.ts` badgeKey union now includes
  `"TOP_RATED"` (was assigned in HomeTherapistGrid but missing from the
  type; latent tsc error — build passed only because Vite/esbuild skips
  typecheck). tsc now clean.
- **Dead code removed** — deleted `src/utils/badgeConfig.ts` (imported
  nowhere, tree-shaken). It also held a broken `/badges/Best (1).gif` ref
  (file no longer on disk).
- **Perf** — `User.gif` (1200×1200, 899 KB, shown 120×120 on
  login/register) → 240×240 animated WebP, **89 KB (−90%)**. Refs updated
  in LoginPage + RegisterPage.

⚠️ **LESSON (don't repeat):** I initially reported "16 commits undeployed /
live site 2 days stale." **That was WRONG** — caused by a stale local
`origin/main` tracking ref (never `git fetch`ed). ALWAYS `git fetch` before
judging deploy state.

### 🆕 28s224 — Real push-to-deploy → Vercel (CI fixed)

Deeper investigation corrected a second wrong assumption: `git push` did NOT
auto-deploy to Vercel. A **leftover Firebase Hosting** GitHub Action fired on
push (deploying to the orphan `soulease-spa.web.app`, NOT sunred.vip). Vercel
production only updated via manual `vercel --prod`. Fixed:
- Added `.github/workflows/vercel-deploy.yml` — push to main → `vercel pull` →
  `vercel build` (vite build + prerender) → `vercel deploy --prebuilt --prod`.
  Build failure = job fails = nothing deployed (live site safe).
- Removed both `firebase-hosting-*.yml` workflows.
- View added repo secret `VERCEL_TOKEN` (vercel.com/account/tokens, scope
  sunred-projects). Org/project IDs are inlined in the workflow (not secret).

**DEPLOY NOW = `git push origin main`** — the Action builds + ships to
sunred.vip automatically (watch the Actions tab; green ✓ = live). Manual
`npm run deploy:vercel` remains as fallback. NOTE: pushing changes *to*
`.github/workflows/*` from this machine needs a token with `workflow` scope —
the current fine-grained PAT lacks it, so workflow-file edits must go through
the GitHub web UI (or grant the token "Workflows: write"). The stale
`FIREBASE_SERVICE_ACCOUNT_SOULEASE_SPA` repo secret can be deleted (unused).

### 🆕 What Round 28s115-116 shipped (2026-06-07)

**28s115 — @SunRedPostBot scaffold + deploy:**
- New `functions/src/telegram-post-bot/` codebase (4 files):
  - `client.ts` — Telegram Bot API wrapper (sendMessage, editMessage)
  - `rotation.ts` — POST_ROSTER + pickNextSpotlight() · Yuri excluded
    from auto-rotation by design (concierge-protected · manual only)
  - `templates.ts` — 5 renderXxx() builders
  - `index.ts` — 3 Cloud Functions: scheduledChannelSpotlight (Mon
    20:00 BKK), scheduledChannelWeekend (Fri 18:00 BKK),
    postToChannelManual (admin-only callable)
- Bot account: @SunRedPostBot (display name "SunRed Channel Bot"),
  admin in @SunRed_BKK channel (453 subs)
- Token in Secret Manager: TELEGRAM_POST_BOT_TOKEN (version 2 is
  the correct one · version 1 disabled was an OCR-error copy)
- First successful post: Hami spotlight at 03:48 BKK 2026-06-01
- Setup doc: `docs/telegram-post-bot-setup.md`

**28s116 — Multi-language + admin UI panel:**
- TherapistRecord.bios upgraded from single `bioEN` to
  `Record<Lang, string>` with EN/TH/ZH/JA/KO for all 12 therapists
- All 5 renderers (Spotlight, TonightSpecial, TonightLineup,
  WeekendForecast, WelcomeBack) accept a `lang` parameter; fallback
  chain: requested → en → first available
- `postToChannelManual` callable now accepts optional `lang` field
- New admin route `/admin/telegram` (AdminTelegramPanelPage):
  - Post type picker (5 kinds)
  - Language toggle (5 langs)
  - Therapist single-picker for tonight/spotlight
  - Multi-chip lineup picker for lineup
  - Posts via httpsCallable to postToChannelManual · audit toast
- Client utility: `src/utils/telegramPostBot.ts` wraps the callable

### 🆕 What Round 28s111-114 shipped (2026-06-07)

Strategic docs (8 new):
- `docs/master-strategy.md` — 1-page action plan (open every morning)
- `docs/customer-acquisition.md` — 9-channel playbook (Stickman,
  TG cross-promo, WeChat, LINE, Reddit, taxi cards, etc.)
- `docs/acquisition-content-pack.md` — ready-to-send Stickman email
  (3 versions), TG cross-promo DMs (4 langs), taxi card design spec
- `docs/seed-content-by-channel.md` — 5 WeChat OA posts (中文) +
  3 LINE OA broadcasts (TH/JP/KR) + 5 Reddit reply templates + X rhythm
- `docs/telegram-templates.md` — 8 post categories × 5 langs
- `docs/discovery-offer.md` — Discovery Reservation perk policy +
  concierge scripts in 4 languages
- `docs/therapist-profiles.md` — 12 profile EN + TH master
- `docs/therapist-profiles-i18n.md` — 12 × ZH/JA/KO translations
- `docs/site-audit-2026-06.md` — conversion audit (8/10 issues fixed)
- (Yuri retention/conversation docs are DEPRIORITIZED per the reframe
  at top of this file · kept as reference)

Code shipped (5 rounds in main):
- 28s111: schema prices fix · TikTok removal · filter.couple cleanup ·
  Hero "from ฿X · 60–120 min" surface
- 28s112: ReserveCTA component on home (mode-aware Telegram-first CTA
  with WhatsApp/LINE/WeChat secondary) + SocialProofTicker wired into
  home (live Firestore data)
- 28s113: multi-locale bios for all 12 therapists in
  src/data/therapists.ts + TherapistDetailPage builds About body
  from real.bios[lang] with EN/auto-derived fallback chain
- 28s114: Discovery Reservation callout component on
  TherapistDetailPage for every non-Yuri therapist (audit gap #11)

### 🆕 What Round 28s140-211 shipped (this session, 2026-06-XX)

**UI/UX overhaul** (no functional changes — all visual + IA):
- Hero block fully removed from home (28s144-145) — opens straight to
  TherapistGrid.
- TherapistMinimalCard: 3-state status (Available / Bookable / Offline)
  · Holiday badge + soft blur · still-tappable for info; AGE + VERIFIED
  + ★ rating + 📍 BANGKOK district rows (28s138-141, 158-167).
- TopNav: red `#B4000A` bar · "SUNRED BANGKOK" wordmark (Cinzel caps
  wide-tracking) · language pill removed (auto-detect from device).
- Palette swap (28s150-152): flat `#B4000A` red · cool gray text ·
  Off-White Mint bg · amber + pink accents (sparingly). No gradients.
- Type system (28s154-156): heading stack Federo · Italiana · Cinzel ·
  Fraunces · Inter for body.
- Services tab (28s175-206): ROLADEX-style rate cards · horizontal
  snap-row · BESTSELLER ribbon (amber gradient, scale 1.06) ·
  AREAS & TIMING + RESERVE eyebrow sections · Concierge channel grid
  + Telegram subscribe relocated from How-to-book.
- How-to-book (28s201-202): dropped Reservation pillars · FAQ trimmed
  28→13 Q&A · category jump pills · heading fonts switched to sans
  for legibility.
- TherapistDetailPage (28s207-210): working hours dedup · clay→cool
  gray sweep · DetailHero status dot removed (StatusPill is sole
  source) · 12h AM/PM format · About panel sub-sections collapse
  behind "Show more details" toggle · StatsCard taps + InfoSheet
  restored (founder feedback "กดดูไม่ได้").
- BookingFlowPage page title → sans 700 (28s211).
- AdminFloatingChat: radial gradient FAB · twin radiating pulse
  rings · idle breathing scale (28s194).
- Anti-patterns documented (Section 12): PromiseStrip bottom-only ·
  HomePage no chrome · don't duplicate status indicators ·
  HomeMapBrowse stays · Google Business Profile do-not-verify.

**Architecture / cleanup:**
- ServicesPage: 1594 → ~1260 lines (dropped quiz/compare dialogs +
  unused helpers).
- HowItWorks: 779 → ~510 lines (dropped Concierge + arrival + pillars).
- TherapistDetailPage: 1625 → ~1586 lines (working hours dedup +
  Discovery copy soften + InfoSheet kept after revert).

### 🆕 What this session shipped (2026-06-07)

Strategic docs (8 new):
- `docs/master-strategy.md` — 1-page action plan (open every morning)
- `docs/customer-acquisition.md` — 9-channel playbook (Stickman,
  TG cross-promo, WeChat, LINE, Reddit, taxi cards, etc.)
- `docs/acquisition-content-pack.md` — ready-to-send Stickman email
  (3 versions), TG cross-promo DMs (4 langs), taxi card design spec
- `docs/seed-content-by-channel.md` — 5 WeChat OA posts (中文) +
  3 LINE OA broadcasts (TH/JP/KR) + 5 Reddit reply templates + X rhythm
- `docs/telegram-templates.md` — 8 post categories × 5 langs
- `docs/discovery-offer.md` — Discovery Reservation perk policy +
  concierge scripts in 4 languages
- `docs/therapist-profiles.md` — 12 profile EN + TH master
- `docs/therapist-profiles-i18n.md` — 12 × ZH/JA/KO translations
- `docs/site-audit-2026-06.md` — conversion audit (8/10 issues fixed)
- (Yuri retention/conversation docs are DEPRIORITIZED per the reframe
  at top of this file · kept as reference)

Code shipped (3 commits in main, 1+ staged):
- 28s111 (committed): schema prices fix · TikTok removal ·
  filter.couple cleanup · Hero "from ฿X · 60–120 min" surface
- 28s112 (staged): ReserveCTA component on home (mode-aware Telegram-
  first CTA with WhatsApp/LINE/WeChat secondary) + SocialProofTicker
  wired into home (live Firestore data)
- 28s113 (staged): multi-locale bios for all 12 therapists in
  src/data/therapists.ts + TherapistDetailPage builds About body
  from real.bios[lang] with EN/auto-derived fallback chain
- 28s114 (staged): Discovery Reservation callout component on
  TherapistDetailPage for every non-Yuri therapist (audit gap #11)

---

**Last updated: 2026-05-30 after Round 28s1 (security audit + rules patch)**

**🚨 BLOCKING — must do before features below work in production:**
- [ ] **🔴 Vercel GitHub auto-deploy is NOT triggering** (found 2026-05-31).
  All of Round 28s (the whole overnight session) was pushed to GitHub
  `main` but Vercel never auto-built — the last GitHub-triggered prod
  deploy was an old "r32" commit. Had to ship manually with
  `vercel --prod --yes` (deployed e4cfc39 → live on sunred.vip).
  ACTION: in Vercel dashboard → Project → Settings → Git, reconnect /
  re-authorize the GitHub integration (or check "Ignored Build Step" /
  paused deploys). Until fixed, EVERY push needs a manual
  `vercel --prod` to go live.
- [ ] **🔴 URGENT: Publish updated `firestore.rules`** to Firebase Console
  - Round 28s1 patch fixes CRITICAL data leak — current production rules
    expose every customer's phone/address/hotel via public read on
    `bookings` and `users`, and allow self-promotion to admin via
    `/users/{uid}.role` update. Audit found this on 2026-05-30.
  - Also adds field whitelist on `bookings.update` so customers can't
    flip their own booking to `status=paid`, and locks `reviews.create`
    + `notifications.*` to authenticated owners only.
  - Also still includes `analytics_events` (r13) + `booking_errors`
    (r18) collections from prior rounds.
  - Path: Firebase Console → Firestore → Rules → Publish
  - Verify after publish: open DevTools, signed-out, run
    `firebase.firestore().collection('bookings').get()` — must fail.
- [ ] **Publish updated `firestore.indexes.json`** — adds
  `notifications (userId asc, createdAt desc)` composite index (Round
  28s1). Without it, NotificationsPage shows empty for every user.
  Deploy via `firebase deploy --only firestore:indexes`.
- [x] ~~Telegram functions deploy + dedup + therapist DM gate OFF +
  composite Firestore index~~ — all DEPLOYED 2026-05-31 · history in
  git.

**🔒 Security audit follow-ups (2026-05-30, Round 28s1):**
- [ ] Rotate unused `VITE_OPENWEATHER_KEY` in `.env` (still live, bundled
      in older deployed JS)
- [ ] Verify Google Maps + Firebase Web API key referrer locks in GCP
      console (limit to sunred.vip + Vercel preview)
- [ ] Add Telegram webhook secret_token validation on `telegramWebhook`
      Cloud Function — currently anyone can POST fake updates
- [ ] Add auth gate to `notifyBooking` + `moderateText` callables
- [ ] Drop `'unsafe-inline'` from CSP in `vercel.json` after build verify

**📋 Decisions needed from View** — *(all bot-related decisions
resolved 28s115-149 · channel @SunRed_BKK + @manguyujianniSPA, bots
@SunRedPostBot + @SunRedGreeterBot live)*

**📅 Marketing channel actions (View only):**
- [ ] Cancel Singapore site (founder confirmed: no contract lock-in)
- [ ] List 5-10 Bangkok Telegram channels for cross-promotion
- [ ] Set up WeChat Official Account (Chinese market)
- [ ] Set up LINE OA (TH/JP/KR)
- [ ] Decide: keep "Sammyboy 200฿ off" promo or drop?

### Round 28s105–107 — SSR-hardening "ข้อ 1" + static SEO prerender (LIVE)

- ✅ **28s105**: Firebase SSR-prep — `initializeApp` now idempotent
  (`getApps()/getApp()`); removed the unused `storage` export (zero
  consumers) → trims firebase/storage from the customer bundle.
- ✅ **28s106**: `scripts/prerender-routes.mjs` (postbuild) bakes
  per-route static HTML for `/services` + the 4 service SKUs:
  route-specific `<title>`/description/canonical/OG/Twitter/hreflang +
  Service & BreadcrumbList JSON-LD + a tailored crawlable `<noscript>`
  body. The body still loads the same SPA bundle → **zero hydration
  risk**. Vercel serves these filesystem files ahead of the SPA rewrite.
  Wired into `build` + `vercel-build`. Script asserts every head swap
  fires (fails the build if index.html shape changes).
- ✅ **28s107**: fixed Vercel build — `.vercelignore` excluded `scripts/`
  so the prerender file was missing in the build container. Changed to
  `scripts/*` + `!scripts/prerender-routes.mjs`. Verified LIVE: each
  service route now serves its own title + JSON-LD to non-JS crawlers
  (Baidu/Naver/Bing → matters for our CN/JP/KR audience). Home unchanged.

- ✅ **28s108**: extended the prerender to all 12 `/therapists/:id`
  pages (discreet: name + area + Bangkok only, verified 0 PII leak) →
  17 static route files total. Also purged the fake "4.8 ★ • 1,200+"
  `hero.badge.rating` string from i18n.ts + all 5 locale JSONs (dead
  key, but a fake-rating claim shouldn't ship). Verified LIVE.

- ✅ **28s109**: **Localized prerender (zh/ja/ko)** for the 5 service
  money-pages → static shells at `/{zh,ja,ko}/services[/<slug>]` with
  localized title/desc/OG/JSON-LD/noscript + `<html lang>` + self
  canonical + reciprocal path-based hreflang cluster. Added ADDITIVE
  SPA routes `/zh|/ja|/ko/*` → `LocaleEntryRedirect` (switch i18n lang +
  redirect to de-prefixed route; these prefixes 404'd before so existing
  routes untouched). sitemap.xml += 15 localized URLs (35 total).
  Euphemisms preserved per-locale. Verified LIVE on Baidu/Naver/JP UAs.
  Strategic: CN/JP/KR audience + Baidu/Naver render JS poorly → now get
  native-language titles per route. 32 static route files total.

- 🛑 **DECISION: full React-tree SSG is NOT being done.** Investigation
  (28s105) found the app is SSR-cleaner than feared (no module-level
  browser access; entry/providers/layouts clean; home components touch
  browser only in effects/handlers). BUT full SSG would still require:
  i18n LanguageDetector SSR-guarding + router refactor to a route-array
  + a server-side Head solution — and the app is **time-aware** (Hero
  concierge mode flips by hour) + **locale-auto-detecting**, so SSR/CSR
  hydration mismatch is a real risk on a live booking site, and we
  **can't hydration-test in this env**. The static per-route head/body
  prerender above captures ~80% of the SEO win with none of that risk.
  If we ever want true SSG: do it as a dedicated project with a Vercel
  preview to hydration-test before promoting.

- 📝 NOTE on deploys: 28s106's first attempt failed (ERROR state) — the
  bad build never reached production (stayed on 28s104), confirming the
  "build fails → live site safe" guarantee. Also: the GitHub-triggered
  build of ca569c7 appeared in the deployment list, so Vercel
  auto-deploy *may* have recovered — but still using manual
  `vercel --prod --yes` as the source of truth until confirmed.

### Round 28r4–r32 deliveries (already shipped + pushed)

- ✅ Round 28r32: Fixed "You saved tonight" pill bug — was missing
  Smart Routing savings. Used wrong taxi variable (`baseFareBeforeRain`
  = post-routing) so savingsRouting always = 0. Switched to
  `listPriceTravel` + `sunredPromoDiscount`. Pill now aggregates
  routing+promo, headline number bumped 17px → 22px serif heavy.
- ✅ Round 28r31: Megaphone sticker removed from Hero promo banner
  (founder direction "เอาสติกเกอออก"). Tonight Special banner now
  reads cleanly on its red→coral gradient.
- ✅ Round 28r30: PromiseStrip restored on home (between
  HomeTherapistGrid + HomeFooter) with editorial design + ฿1,800
  price anchor. SocialProofTicker switched from pseudo-random to
  100% real Firestore data via new `useSocialProofMetrics` hook
  (count24h + bookingNow + topService all live).
- ✅ Round 28r29: "You saved" pill + originalPrice strikethrough
  on BookingFlow Total + BookingSuccess.
- ✅ Round 28r28: Tourist-aware promo caps (FIRST10 ฿500→฿200,
  WELCOME20 ฿800→฿300, etc.) + premium-tier-only codes VIP100
  (฿100 fixed) + FREETAXI (waive taxi). Premium menu (Gentleman/
  B2B) now PROMO_BLOCKED for general codes.
- ✅ Round 28r27: Tier-aware commission split — discount cost
  shared proportionally between therapist and shop (was: shop
  absorbed 100%). Earnings page math updated.
- ✅ Round 28r26: AdminEarningsPage at `/admin/earnings` — daily
  revenue chart + per-therapist + per-service breakdown + CSV.
- ✅ Round 28r25: Owner price override on BookingFlow (admin only).
- ✅ Round 28r24: Admin override mode on BookingFlow — bypasses
  therapist availability, hours, hold, notes filter.
- ✅ Round 28r22: RoleViewBanner sticky (admin/therapist).
- ✅ Round 28r21: Typed `useAuth()` direct in TopNav — admin/
  therapist drawer card now visible.
- ✅ Round 28r18: `booking_errors` collection — diagnostic writes
  on customer booking failures (full form state + browser info).
- ✅ Round 28r17: Composite-fee taxi math (Smart Routing pill).
- ✅ Round 28r16: Tonight's roster filter (All / Available now /
  Express ≤5km, default `available_now` in prime hours) + Chinese
  i18n for FAQ + ServiceDetail callout (~95 ZH strings).
- ✅ Round 28r15: Admin analytics dashboard (`/admin/analytics`).
  5 cards (funnel, by-mode conversion, top services, channels,
  daily trend). Reads `analytics_events` live.
- ✅ Round 28r14: Discount apply logic — FIRST10 (10% capped) +
  SUN-XXXX referrals (฿500 off). Auto-fill from `?ref=` URL +
  FirstBookingBanner sessionStorage. Discount line on BookingFlow
  + BookingSuccess + Telegram payload + Firestore booking doc.

- ✅ Round 28r4: Time-aware concierge mode (4 windows)
  - Live pill, Tonight Special, niche tiles, Therapist grid header,
    Areas chip strip — all flip mood across day
- ✅ Round 28r5: Tonight Special gradient + 2-3 rotating messages per mode
- ✅ Round 28r6: Mode glyphs (☀ 🌅 🌙 ☕) on Hero + TopNav + AdminFloatingChat
- ✅ Round 28r7: ReferralDialog wired (Phase 1 manual flow)
  - URL `?ref=` capture, Hero banner, drawer entry
- ✅ Round 28r8: Hide-button-until-real pass — removed 4 vaporware tiles
- ✅ Round 28r9: BookingSuccessPage cleanup + concierge mode chip
- ✅ Round 28r10: Telegram map URL uses placeName (was lat,lng)
  - 4 action cards on success page un-locked + sized down
- ✅ Round 28r11: BookingFlowPage split — 7 new files, -516 lines
  - useTweenedNumber, bookingFormStorage, SectionCard, FareChip,
    PriceRow, AddressTile, ConfirmBar
- ✅ Round 28r12: Trust badge + ServiceDetail "What's included · Best for"
  - 28-Q FAQ in How-to-Book tab covering 6 categories
- ✅ Round 28r13: Self-hosted funnel analytics (5 events)

### Code follow-ups (priority order)

**Highest ROI:**
- [ ] Auto-availability Telegram bot (6-9 ชม., needs decisions above)
  - Will fix the "TG channel says X but website says Y" customer-
    reported bug AND cut admin chat ~50%
- [ ] BookingFlowPage Phase 2 split — main component body into
      useBookingFlowState hook + section components
- [ ] Wire add-ons into BookingFlowPage (Phase 3) — premium oil,
      extend, beyond-central travel, duo
- [ ] Discount apply logic — FIRST10 + ref code → real `discountAmount`
      on booking (currently banner copies code but flow ignores it)

**Medium:**
- [ ] i18n for FAQ + ServiceDetail callout (TH/JA/KO — ZH done r16)
- [ ] "Tonight's roster" filter in Therapists tab — default to
      `available now` during prime hours
- [ ] Bundle pricing model (3-session package)
- [ ] AdminLayout heartbeat writer → `adminPresence/global` so the
      AdminPresenceBadge can be re-enabled (currently hidden)
- [ ] Admin analytics dashboard reading `analytics_events` collection

**Low:**
- [ ] FirstBookingBanner → wire actual discount apply (currently hidden)
- [ ] PWA installable manifest

### One-line history
- [x] Rebrand "BEST SELLER" badge on Aromatherapy → 'POPULAR'
      (Round 28c25 · falsifiable claim removed)

---

## 10. How to start each session

When View opens a new chat with you, say:
> "อ่าน CLAUDE.md ใน root folder ก่อน"

You will then:
1. Read this file (~30 seconds)
2. **READ Section 9 "OPEN REMINDERS FOR VIEW" FIRST** — surface
   any blocking items + pending decisions before doing other work
3. Confirm you're up to speed: "อ่านแล้ว — สรุปคืน View ใน 3 บรรทัด"
4. Surface reminders: "ตอนนี้มี X blocking items + Y pending
   decisions รอ View — อยากเคลียร์ก่อนไหมคะ?"
5. Ask: "วันนี้เริ่มจากอะไรคะ?"

You'll have ALL context. No re-explanation needed.

**⚠️ Reminder discipline:**
- NEVER complete a session that introduces a blocking item without
  adding it to Section 9
- When View asks "เตือนฉันด้วย" → it goes in Section 9
- When a feature ships that needs follow-up (env var, console action,
  manual config) → it goes in Section 9
- Section 9 is the single source of truth for "what's still owed"

**📝 Git commit discipline (founder direction 2026-05-07):**
- After EVERY round/feature ships AND TypeScript passes → run
  `git commit -am "Round 28rXX: <one-line summary>"` automatically
- Don't ask "ต้อง commit ไหม" — just do it. View wants every
  successful work checkpoint backed up.
- If author config missing, set:
  `git config user.email "sunredbkk@gmail.com"`
  `git config user.name "View (via Claude co-founder)"`
- Format: short subject + bullet list of key changes in body
- Push to remote is View's call (mention but don't auto-push)

---

## 11. Tone of voice when chatting with View

- **Co-founder, not consultant.** Talk like a partner sitting next
  to her with coffee.
- Direct, no padding, no excessive disclaimers.
- ✅ "Honestly, this won't work because…"
- ❌ "I might suggest considering…"
- Use Thai primarily. English for technical terms.
- Be honest when you don't know. Be concrete with action items.
- **Never judge or moralize.** This is her business. Your job is
  to make it succeed within her constraints.

---

## 12. Operational guardrails

- View pays Claude Max $200/mo because partnership works → preserve
  that ROI by being useful
- Don't reinvent things we already built — read the code first
- Update this CLAUDE.md when material changes happen
- Keep euphemism table tight — language drift is the biggest risk
- Default to "show, don't tell" — write code/templates, not just talk

### ⛔ Anti-patterns to NOT repeat (lessons learned)

- **PromiseStrip belongs at the BOTTOM of HomePage** (closing
  reassurance), not at the top. View established this Round 28s99
  ("เอาไปไว้ล่างสุด"). SunRed traffic is pre-warmed (TG channel,
  referrals, taxi cards) — guests want to see practitioners on open,
  not a marketing trust pillar strip. Claude moved it up in 28s146
  citing "trust above the fold" — wrong playbook for this vertical.
  Reverted in 28s147.
- **HomePage above-the-fold = the actual product (therapist list)**,
  not pre-product chrome. Removed in session 28s140-145: Hero
  (greeting + service strip), DAYTIME pill, OUR SERVICES eyebrow,
  SocialProofTicker, ReserveCTA. Default to LESS chrome.
- **Don't add visible status indicators twice for the same state**
  (e.g., Holiday badge on photo + "Offline" pill in card corner).
  Pick one. Audit #5, fixed 28s146.
- **HomeMapBrowse stays on home.** Tourists in Bangkok glance at
  who's near their hotel before tapping; the map is a real
  differentiator vs TG-channel competitors who don't surface it.
  Claude removed it in 28s146 citing "no analytics confirmation" —
  that's generic-web-audit thinking, not SunRed-vertical thinking.
  Restored in 28s149. Default: don't remove product surfaces just
  because we lack engagement data; ask View first.

### 🚫 Google Business Profile — DO NOT verify

**Founder constraint 2026-XX:** "Verify Google Business Profile
ทำไม่ได้เนื่องจากไม่ใช่ร้านนวดปกติ ต้องเน้นเรื่องความเป็นส่วนตัว
รีวิวแบบปิดบังตัวตนแบบเดิม"

Translation: SunRed cannot claim a public GBP because the gray-area
positioning requires privacy-first guest treatment. Public Google
reviews would expose guests by name. Stick with:
- Anonymous in-app reviews via Firestore (current system)
- TG channel post-booking shoutouts (anon handles)
- Private LINE/WhatsApp testimonials shared with concierge

Do NOT propose:
- "Verify GBP + ask for reviews"
- "Show Google reviews on site"
- Any flow that asks guests to publicly attribute their experience

### 🔐 Trust + customer-acquisition playbook (privacy-first)

**Codified 2026-06-XX after Round 28s205.** Replaces every "Google
reviews / mainstream listing" suggestion that would expose guests.
Every tactic here keeps the guest **anonymous by default** and
matches outcall-vertical norms.

**🔴 Do this week (highest leverage)**

1. **Anonymous TG channel testimonials** ⭐⭐⭐
   - View asks new guest for a 1-2 sentence permission-based blurb
   - Post to `@SunRed_BKK` + `@manguyujianniSPA` as
     `Anonymous · 2 days ago · ⭐⭐⭐⭐⭐ "Yuri was punctual…"`
   - Cadence target: 1-2/week → 8-16 reviews in 2 months
   - All identities masked, never first names from real guests
2. **Anon-friendly directory listings** — `Stickman Bangkok` (forum
   + weekly column pitch), `Lookpasi`, `Sammyboy / Samsguide`,
   `secretthai`, `bangkok101.net`, `eros guide`. Reviewers are
   anon nicks by convention in these spaces.
3. **Reddit soft engagement** — `r/Bangkok`, `r/ThailandTourism`,
   `r/asia_travel_buddy`. Answer real travel questions; when a
   "anyone know outcall in BKK?" thread appears, DM the OP from
   an anon avatar. Founder identity stays hidden.

**🟡 Mid-term (2-4 weeks)**

4. **Self-hosted trust badge system on cards** — `✓ Verified by
   SunRed concierge` + `Member since 2023` + `N sessions completed`
   + `Returning guest 5×` chips. We own the trust stack; no Google.
5. **Anonymous in-app reviews (already shipped)** — improve UI:
   `Verified booking` badge + count + Bayesian aggregate. Reviewer
   identity never surfaced.
6. **Practitioner reputation chips** — `Top Rated · 4.9★ (30 reviews)`,
   `98% rebook rate`, `Member since 2024 · 200+ sessions`. All from
   our Firestore aggregates, all anonymous reviewers.

**🟢 Long-term (1-3 months)**

7. **Stickman weekly column pitch** — Stickman writes anon reviews of
   BKK services. Email pitch + complimentary trial. One mention =
   lasting authority because his audience trusts him.
8. **Niche blog mentions** — Bangkok expat + travel bloggers. Pitch
   "discreet outcall service". Backlinks + brand mentions = SEO +
   trust without exposing guests.
9. **WeChat OA testimonials in 中文** — Chinese guests share
   Moments naturally; `@manguyujianniSPA` reposts anon blurbs.
10. **TG cross-promo** — DM 5-10 BKK travel/expat TG channel admins.
    Trade promo slots. Each cross-promo ≈ 50-200 subs.

**❌ HARD-BANNED tactics (privacy violations)**

- Google Business Profile + Google reviews
- TripAdvisor, Yelp, Trustpilot
- Facebook reviews, Instagram tagged posts
- "Tag us on Instagram" / public UGC campaigns
- Email newsletters that name customers
- Any campaign that publishes a guest's identity

**Default priority order when View asks "how do we get more trust /
more customers?":**
1. Telegram channel testimonials (Tier 🔴 #1)
2. Directory listings (Tier 🔴 #2)
3. Self-hosted badge upgrades on cards (Tier 🟡 #4-6)
4. Reddit / TG cross-promo (Tier 🔴 #3 / 🟢 #10)
5. Editorial pitches (Tier 🟢 #7-8)

When proposing any new acquisition idea, **first verify it keeps
guests anonymous**. If it can't, drop it.

### 🎨 Theme palette (Round 28s150-152, current)

```
Primary red   #B4000A   CTA · brand wordmark · accents
Text          #1A2B2E   headings + dark UI
Text muted    #4A5568   body copy
Bg            #F4F6F5   page surface (flat — no gradients)
Green         #16A34A   online status dot only (NOT CBODY-style CTA)
Amber accent  #F5A623   ★ stars · NEW / TOP-RATED · sparingly
Pink accent   #FFE5EC   favourite heart · highlights · sparingly
```

Flat colours, no `linear-gradient(...)` for brand surfaces. Status
pill rgba tints kept (functional). Photo scrims kept (legibility).

### 🔤 Type system (Round 28s154-156, current)

```
Heading stack:  Federo · Italiana · Cinzel · Fraunces · Georgia
Body stack:     Inter · system-ui · ...
Wordmark:       same heading stack
```

Cinzel weights 400-800 loaded; Italiana + Federo single-weight.

### 🛒 Services page architecture (Round 28s175-194, current)

- Vertical-scroll body with one section header bar `RATES & SERVICES`
- Horizontal-scroll snap row of service rate cards (centered snap)
- 4 services: Aromatherapy · Thai · **Gentleman's (BESTSELLER)** · Therapeutic
- `BESTSELLER_SERVICE_ID = "SR-HJ2200"` — single source of truth for
  the recommended-card ribbon + ring + scale-up + auto-scroll on mount
- Each card: hero image · rate table · About · What's included
- Below cards: Typical arrival window + Concierge channel grid +
  TG broadcast subscribe link (all moved here from "How to book"
  tab in 28s188-189)

### 🎯 BookingFlow / Reserve UX (current)

- Card tap does NOT navigate (handleSelectService is a no-op);
  reservation routes through concierge channels in the panel
  below the cards, NOT a separate detail page.
- Detail page `/services/:id` is still reachable via direct URL
  (SEO / share), but no card UI links there.
