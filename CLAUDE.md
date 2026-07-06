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

**Last updated: 2026-06-09 — ORDER-PIPELINE + ADMIN RESCUE session (below).
Previous: 2026-06-02 SEO+brand batch (further down).**

### 🚑 2026-06-09 — "เงียบ 2 อาทิตย์" was NOT a demand problem. Order pipeline + admin were broken.

> ⚠️ ROUND-NUMBER COLLISION: this session numbered its commits 28s226–28s230,
> which clash with the 2026-06-02 SEO session's 28s226–28s227. Go by DATE, not
> round number. These commits are by date 2026-06-09.

**The discovery (most important lesson):** View said orders went quiet ~2 weeks.
It was NOT marketing. The order pipeline + admin dashboard had compounding bugs
that hid/mishandled real orders. Don't pour traffic into a leaky funnel — verify
the funnel first.

**What shipped & is LIVE (all deployed direct from local — see deploy note):**
1. **FIX A — orders were INVISIBLE.** Customer bookings were written
   status:"confirmed" but the admin dashboard queries status=="pending"
   (BookingFlowPage:902). So every web order looked already-handled →
   "Pending 0 / all up to date". Now customer bookings = "pending"
   (admin-add stays "confirmed"). **Orders from before the fix are status
   "confirmed" — recover via admin Booking List "All/Confirmed" tab.**
2. **FIX 1 — book CTA → human.** ServicesPage Telegram contact was
   @SunRedGreeterBot (FAQ bot, no booking/human path). → @SunRedvip_bkk
   (zh → @YuNiSpaBkk). NOTE: ReserveCTA was edited too but it's NOT mounted on
   home (HomePage renders only HomeTherapistGrid since 28s127/145).
3. **FIX 3 — clean admin Telegram message** (founder format; dropped the
   confusing "confirm before it expires" line). functions/src/index.ts
   formatBookingForAdmin. sendTelegram has NO parse_mode → plain text, no
   markdown escaping.
4. **firestore.rules + indexes DEPLOYED** (PII was public). Verified safe:
   every admin op permitted, isAdmin()==admins/{uid} matches app. ✅
5. **Marketing attribution** — booking captures source/channel + UTM + landing;
   onBookingCreate adds "🌐 Source: <channel> · <flag CC> · <landing>" (country
   from phone dial code). Exact Google keyword is impossible (not-provided).
   Tag marketing links with ?utm_source=… for precise channel.
6. **Admin A-D:** (A) show customer name+phone+tap-to-call (was reading blank
   `userName`; real fields are contactName/customerName/phone). (B)
   AdminTherapistsPage now uses calculateTherapistStatus (BKK) not the legacy
   device-clock computeStatus. (C) roster summary strip + "คืนนี้เปิดทั้งร้าน"/
   "กลับ Auto" batch buttons. (D) Confirm settles holdState; needsAdminReview
   warning badge.

**🔑 DEPLOY MECHANISM (critical — GitHub token died mid-session):**
- The osxkeychain/gh GitHub token is INVALID ("Bad credentials"). `git push`
  fails. Local main is ahead of origin by several commits (28s226-230, by date
  06-09) — NOT pushed. To sync: View runs `gh auth login` then I push.
- BUT deploys do NOT need GitHub: **frontend → `vercel --prod --yes` from local**
  (uses Vercel CLI auth, gitDirty deploy); **functions/rules → `firebase deploy
  --only functions:<name>` / `--only firestore:rules` from local** (firebase
  CLI logged in as soulease.team@gmail.com, project soulease-spa). Both used
  today successfully. This is the reliable path while the GH token is dead.
- The GitHub Action push-to-deploy (added 06-02) exists but is moot while push
  is blocked.

**🔔 STILL FOR VIEW (no deploy needed — do tonight):**
1. Admin Booking List → "All/Confirmed" tab → recover the ~2 weeks of orders
   that were hidden (status confirmed). Real customers may be waiting.
2. Send a TEST booking through the live site → confirm the admin Telegram group
   (chat id -1002962073895, hardcoded in functions/src/index.ts:31) still
   receives it. If a group→supergroup migration changed the id, sends fail
   silently — tell me, I'll fix the id.
3. Therapist working hours in Firestore must cover the 22:00–04:00 window or the
   roster shows "offline" = site looks closed. Or just use the new "คืนนี้
   เปิดทั้งร้าน" button. Diagnostic: scripts/diagnoseAllTherapists.ts.
4. `gh auth login` so unpushed commits can sync to GitHub.

**Known remaining (audited, not yet fixed):** Telegram webhooks lack
secret_token validation; Google Maps key is a single point of failure on the
booking location step (no no-map fallback). ~~paid vs paymentStatus field
mismatch.~~ ✅ FIXED in 28s252 (unified — see below).
~~AdminBookingAddPage double-fires the Telegram notify.~~ ✅ FIXED
in 28s249 (see below).

### 🆕 2026-06-09 (cont.) — taxi fare fix + admin "control room" (28s231-232)

**28s231 — taxi fare was too cheap.** Two haversine paths disagreed:
directionsApi.ts applied BKK_ROAD_FACTOR 1.45 to its fallback, but
taxiFare.ts `estimateTaxiFare` charged on RAW straight-line distance (~31%
short). Fix: apply 1.45 in estimateTaxiFare; guard directionsApi optional
chaining (`maps?.DistanceMatrixService`, `duration_in_traffic?.value` — the
latter threw → dropped to fallback). Fallback fares now ~+22%. Factor 1.45 is
tunable in both files (keep in sync).

**28s232 — Tonight ops board + dispatch lifecycle + therapist safety.** Admin
upgraded from booking-CRUD toward industry dispatch ops:
- New page `/admin/tonight` (AdminTonightPage) — single control screen: all
  status=="confirmed" jobs sorted by time, live counters, one-tap dispatch
  lifecycle. Linked from a "🌙 คืนนี้" button on the dashboard.
- **Dispatch lifecycle = additive `dispatchState` field** (NOT the core
  `status`): assigned → enroute → arrived → in_session → done. Each tap stamps
  `<state>At`; starting stamps `expectedEndAt` (= start + duration). "จบงาน"
  sets dispatchState:done + status:"completed". Core status semantics
  (Earnings/availability) untouched until completion.
- **Therapist safety:** `alertOverdueSessions` Cloud Function (every 10 min)
  Telegrams View "🚨 OVERDUE SESSION" if an in_session job is 20+ min past
  expectedEndAt and not yet alerted (overdueAlertedAt guard). The Tonight card
  also shows red "เกินเวลา".

**Admin maturity vs industry — STILL TODO (Phase 4, View asked for "ทั้งหมด"):**
- Payout tracking (mark therapist paid per night/week; cash collected vs owed;
  AdminEarningsPage CALCULATES 60/40 but doesn't TRACK payments — its own TODO).
- Customer CRM (repeat/VIP/no-show count/blocklist-with-reason/LTV badges).
- Audit-log viewer (auditLogs collection exists, no UI).
- Also still open from the admin audit: no-show/deposit controls for new
  customers; the EditTherapistPage vs grid inconsistency (no Holiday toggle on
  EditTherapistPage; no overrideUntil auto-expiry).

### 🆕 2026-06-14 — taxi fare model overhaul (28s233)

Founder saw the SAME hotel quote different taxi fares (฿170 vs ฿142) for two
practitioners → two fixes, all in `src/utils/taxiFare.ts` (tunable constants):
- **`DISPATCH_BASE = {13.7548, 100.5656}`** (Huai Khwang/Ratchada) — taxi is now
  measured from ONE base, not per-therapist coords (which were duplicated/
  placeholder: Yuri & XingXing share 13.7656,100.5704). So same destination =
  same fare regardless of who's assigned. BookingFlowPage passes DISPATCH_BASE
  as origin to fetchDrivingDistance + estimateTaxiFare.
- **`LIST_PRICE_MULTIPLIER = 2.5`** (was hardcoded ×2.0) — founder: "คิดให้แพงๆ
  ขึ้น จะได้เอามาลด". Inflates the strike-through "standard rate" + promo % to
  ~36% off; the fare actually CHARGED (round-trip ×1.6 + rain, via
  baseFareBeforeRain) is unchanged.
- (28s231 earlier same day: `BKK_ROAD_FACTOR = 1.45` now applied in
  estimateTaxiFare too; directionsApi optional-chaining guards.)

The 4 taxi knobs, all in taxiFare.ts: BKK_ROAD_FACTOR (real distance),
ROUND_TRIP_MULTIPLIER 1.6 (charged), LIST_PRICE_MULTIPLIER 2.5 (display anchor),
DISPATCH_BASE (origin). ⚠️ Therapist coords in data/therapists.ts are
duplicated placeholders — if real per-therapist distances ever matter, fix
those + revisit the single-base decision.

### 🆕 2026-06-14 (cont.) — admin "Control Room" redesign + Phase 4 (28s234)

Founder: "อยากรื้อ ทำให้ ตกแต่ง และฟังก์ชั่น" (redesign admin visually + add
the 3 missing functions found in the earlier dashboard-checklist audit).
Also: a mockup was shown first (Artifact) — Control Room dark theme, crimson
accent, champagne highlights — approved before touching real code.

**Visual (checkpoints 1-2, deployed via vercel):**
- New `src/theme/adminTheme.ts` — shared dark tokens (adminColor/adminFont)
  for every /admin/* page. `AdminLayout.tsx` fully restyled (dark sidebar/
  topbar, crimson active-nav, serif "SunRed Control" wordmark, Tonight moved
  first in nav). `AdminDashboardPage.tsx` fully restyled to match.
- NOT yet restyled: AdminBookingListPage, AdminTherapistsPage, AdminEarningsPage
  (charts/cards still light), AdminReportPage, AdminAnalyticsPage — only the
  NEW payout/CRM sections added to Earnings/Users got the dark treatment.
  Next session: finish restyling the remaining pages for full consistency.

**Functions (checkpoint 3, Phase 4 — deployed via vercel + firebase):**
1. **Payout tracker** (AdminEarningsPage) — the page's own long-standing
   comment said "Track payouts (which therapist has been paid which week)"
   but only ever calculated, never tracked. New self-contained weekly
   section (stable calendar week, independent of the page's rolling `range`
   filter) with a "Mark paid" toggle → new `payouts` Firestore collection
   (`{weekKey}__{therapistId}` doc id).
2. **Customer Insights / CRM** (AdminUsersPage) — `users` collection only
   covers signed-up accounts; most guests book without one (`userId: null`
   is the norm — see §5). New panel aggregates `bookings` BY PHONE (always
   present) → total bookings, no-show count, total spent, last visit, VIP
   badge (5+ bookings, `VIP_THRESHOLD` in the file).
3. **Audit log viewer** (`/admin/audit-log`, new page) — `auditLogs` rule was
   `write: false` ("Cloud Functions only") but no function ever wrote it —
   permanently empty. New `src/utils/auditLog.ts` `logAdminAction()` lets an
   admin log their OWN actions (rule: `actorId == request.auth.uid`,
   append-only). Wired into: booking confirm/cancel/complete (Dashboard +
   BookingList), payout mark-paid, roster relight ("คืนนี้เปิดทั้งร้าน").

firestore.rules changed: `auditLogs` create allowed (self-attributed);
new `payouts` collection (admin-only). Deployed via `firebase deploy --only
firestore:rules` — same pattern as the earlier rules hardening.

**Preview tooling note:** the `mcp__Claude_Preview__*` tools in this sandbox
resolved to an UNRELATED project (a Hunan restaurant demo) even after
restarting the server — not connected to this repo. Visual verification for
this whole redesign relied on tsc/build + real production deploys, same as
the rest of this session; View confirms visually on the live site.

### 🆕 2026-06-14 (cont.) — admin palette swapped to "Ocean Study" (28s235)

Founder shared a Pinterest palette right after Control Room shipped: "ใช้
ธีมนี้" — scope confirmed as **admin only** (customer-facing site keeps its
brand red; a separate earlier mockup showed a red/gold "Modern Premium"
direction for the customer site, NOT applied).

- `src/theme/adminTheme.ts` tokens **renamed** (not just recolored):
  `crimson→accent`, `crimsonDeep→accentDeep`, `champagne→highlight` — so the
  code doesn't lie about what color it holds. Values now Ocean Study: accent
  `#4E7E8C`, highlight `#A7D8F0`, text `#DCEFF5`, dim `#5C6F7B`, base navy
  `#1F2933`→built up into panel/panel2/panel3 shades. Semantic state colors
  (green/blue/amber/red) unchanged.
- If you ever add a new admin file, import `{ adminColor, adminFont }` from
  `@/theme/adminTheme` and use `.accent` / `.highlight` — do NOT reintroduce
  `.crimson`/`.champagne`, those names no longer exist.
- **AdminTonightPage** (built 28s232, before adminTheme.ts existed) had its
  OWN hardcoded light palette and was never actually dark/Control-Room —
  brought onto the shared tokens now. Also: its "จบงาน" (booking.complete)
  action wasn't audit-logged before; fixed.
- Still NOT on the new tokens (unchanged since 28s234, pre-redesign light
  theme): AdminBookingListPage, AdminTherapistsPage, and the original
  (non-payout) parts of AdminEarningsPage/AdminReportPage/AdminAnalyticsPage.
  Next consistency pass should bring these onto adminColor/adminFont too —
  whichever palette is current at the time (check this file first).

### 🆕 2026-06-14 (cont.) — palette exploration + Earnings full restyle (28s236)

Founder browsed 2 more Pinterest options after Ocean Study shipped:
"Uncharted" (deep petrol-teal, yacht-brand feel) and "Mint Studio" (bright
white/mint SaaS look) — both were shown as standalone Artifact mockups
(HTML files in the scratchpad, NOT touching real code) for comparison, per
the "mockup before shipping" pattern established for big visual swaps.
**Neither was applied** — founder confirmed staying on Ocean Study (already
live). If a future session sees `sunred-admin-uncharted.html` /
`sunred-admin-mint.html` mockup files referenced in transcripts, they were
rejected concepts, not partially-applied work — adminTheme.ts is the only
source of truth for the live palette.

**28s236 — finished AdminEarningsPage** (the gap flagged in 28s234/235's
notes above): founder screenshotted the live page — sidebar/header/Payout
tracker were Ocean Study dark, but the page's ORIGINAL content (BigStat
cards, Daily revenue chart, By therapist/By service breakdown) was still
white, never touched by the 28s234 payout-tracker-only pass. Root cause: 4
shared subcomponents (`Card`, `Eyebrow`, `BigStat`, `RankedRows`) had the
white/light hex hardcoded once each — fixing those 4 covered the whole
remaining page. **AdminEarningsPage is now fully on adminColor tokens.**
Still pending: AdminBookingListPage, AdminTherapistsPage,
AdminReportPage, AdminAnalyticsPage.

### 🆕 2026-06-14 (cont.) — bg/panel corrected to exact swatch hex (28s237)

Founder compared the live admin against the actual Ocean Study reference
image and flagged "พื้นหลัง/pane ไม่ตรง" (background/panel doesn't match).
Root cause: `adminColor.bg` was `#12181D` — a value I computed by further
darkening the reference, which appears NOWHERE in the actual 5-swatch image.
Large surfaces (page bg, AdminLayout gradient) read as near-black instead of
the rich navy shown in the picture. `panel` happened to already equal the
exact `#1F2933` swatch, which made the mismatch confusing to spot (only `bg`
was wrong).

**Rule going forward: every color token must trace to one of the 5 official
hex values, or be an interpolated blend strictly BETWEEN two of them — never
a separately invented hue**, even one that "looks close." Current mapping:
`bg=#1F2933` (exact) · `panel/panel2/panel3` = 25%/45%/65% blends toward
`#5C6F7B` · `dim=#5C6F7B` (exact) · `text=#DCEFF5` (exact) ·
`accent=#4E7E8C` (exact) · `highlight=#A7D8F0` (exact). Removed the unused
`bg2` token. If a future palette swap happens, rebuild EVERY surface this
same way (5 exact anchors + blends only between two of them) to avoid this
exact bug recurring.

### 🆕 2026-06-14 (cont.) — Ocean Study trial on the customer site (28s238)

Founder sent an OLD screenshot of the live customer-facing browse page
("Escorts"/practitioner grid) with explicit color-role mapping: accent
`#4E7E8C` = primary button, highlight `#1F2933` = prominent numbers/labels,
dim `#5C6F7B` = darkest/secondary background. Confirmed (via AskUserQuestion)
this meant the REAL customer site, not another admin mockup.

Scoped to ONE component — `src/components/TherapistMinimalCard.tsx` — NOT
the global `src/theme.ts` `brand.red` token that every other customer page
(checkout, payment, booking flow) depends on. Added local `oceanAccent`/
`oceanHighlight` consts in that file only; applied to the card focus outline,
the starting-price color, and the "Book Now" button fill. This keeps the
trial contained and reversible — revert = delete 2 consts + 3 usages in one
file, nothing else touched.

**Disclosed to founder:** the screenshot was from an older build — current
i18n calls the tab "Practitioners" (not "Escorts", renamed in 28s226 for
euphemism-table compliance) and the search bar is coded white, not dark navy,
per an earlier documented decision. Reskin was applied to the CURRENT card
component regardless; only the reference photo was stale.

**If founder later asks to extend this beyond the one card** (e.g. full
`brand.red` sitewide swap) — that is explicitly a SEPARATE, bigger decision
(checkout/payment flow blast radius) and should get its own confirmation
before touching `theme.ts`.

### 🆕 2026-06-14 (cont.) — admin wordmark color unified (28s239)

Founder: "SunRed Control ปรับให้เข้ากับธีมเดียวกัน" — the sidebar's "Control"
label used `adminColor.highlight` while the topbar's used `adminColor.accent`,
so the same wordmark showed two different colors depending on which chrome
you looked at. Unified both onto `.accent` (`AdminLayout.tsx`, sidebar
`<Typography>` + topbar `<Box component="span">`).

### 🆕 2026-06-14 (cont.) — admin flipped dark → LIGHT Ocean Study (28s240)

Founder: "เอาโทนสว่าง" (use the light tone). Same 5 official hex values as
28s235/237, just reassigned which end is surface vs ink:

- `bg` = `#DCEFF5` (lightest swatch, page background)
- `panel` = `#FFFFFF` (pure white card — standard light-UI elevation, not
  one of the 5 swatches but the accepted "paper" convention for a light
  flip; `panel2`/`panel3` are blends toward `bg` for hover/secondary states)
- `text` / `highlight` = `#1F2933` (the darkest swatch, now used as INK
  instead of surface — prominent numbers read via weight/serif, not a
  lighter color, since ink IS the dark anchor in light mode)
- `accent` = `#4E7E8C` unchanged (works as a button fill in either mode)
- Semantic state colors (green/blue/amber/red) were tuned bright-for-dark
  before; darkened for contrast on the new white/light surfaces (still a
  separate hue family from the teal accent, per design guidance):
  green `#16A34A` · blue `#2563EB` · amber `#D97706` · red `#DC2626`.

Removed dead `bg2`/`greenDeep`/`blueDeep` tokens (zero references). Audited
every hardcoded `"#fff"` text-color usage across admin first — all sit on
solid accent/semantic button fills, never directly on panel/bg, so the flip
needed no separate per-component contrast fixes. Also found and fixed 6
hardcoded `rgba(...)` tints in `AdminEarningsPage.tsx` (payout "paid" state)
and `AdminTonightPage.tsx` (dispatch chips + overdue-card tint) that were
still using the OLD dark-mode semantic RGB triplets — updated to match the
new darkened hex values.

`AdminLayout.tsx`'s main-content background also simplified: the dark-mode
"ambient glow" radial-gradient made no visual sense once both gradient
endpoints are near-identical pale tints, so it's now a flat `adminColor.bg`.

**Still not yet re-audited for light mode** (should auto-flip correctly
since they're fully token-based, but not visually re-confirmed this round):
AdminDashboardPage, AdminUsersPage (CRM panel), AdminAuditLogPage.

### 🆕 2026-06-14 (cont.) — AdminDashboardPage widget redesign (28s241)

Founder shared a reference screenshot of a generic SaaS admin template
("Dashboard แบบนี้") — icon-circle stat row, revenue+budget+orders row,
sales-report table, goal-overview ring, transactions feed, browser-stats
bars. Scope confirmed via AskUserQuestion: **widget structure only, keep
the Ocean Study light palette from 28s240** — the reference's purple/
gradient colors were explicitly NOT adopted.

New widgets on `AdminDashboardPage.tsx`, all backed by real Firestore data
already loaded on the page (no fabricated numbers — the reference's "68.2%
more than last month" style stats are only rendered here when a real prior
month exists to compute the delta from):
- Period stat row → circular icon badges (was plain 4-cards).
- Row: Monthly Revenue bar chart (existing, kept) + a **Completion Rate**
  donut ring (custom CSS conic-gradient, not a chart-lib import — see
  `DonutRing` component near the top of the file) + an **Orders Today**
  card with a real month-over-month % delta + sparkline.
- Row: **By Therapist** (top 5 by period revenue, medal on #1) + **By
  Service** (share-of-revenue progress bars) — both aggregated from the
  same `allRows` the page already fetches, added to the `stats` useMemo.
- **Recent Activity** — new live `onSnapshot` on `auditLogs` (collection
  built in 28s234 for `/admin/audit-log`, never surfaced on the dashboard
  itself before this).
- Platform-count tiles (Customers/Therapists/Services) kept, just moved
  below the new sections.

No functional/data-model changes — pending-confirmation quick actions,
filter bar, quick-action tiles, Tonight-ops entry banner untouched.

**Preview tooling note (still true, re-confirmed this round):** the
`mcp__Claude_Preview__*` tools in this sandbox have no dev server wired to
this repo (only an unrelated Artifact viewer). Verification for this
change was tsc clean → build OK → `vercel --prod --yes` → direct curl of
the deployed `AdminDashboardPage-*.js` chunk confirming the new widget
strings ("Completion Rate", "By Therapist", "By Service", "Recent
Activity", "Orders Today") are live — same pattern as every other visual
change this session.

### 🆕 2026-06-14 (cont.) — AdminAnalyticsPage restyled onto Ocean Study (28s242)

Founder: one word, "analytics" — the last admin page still on the
original pre-redesign light theme (hardcoded `#1A2B2E`/`#B4000A`/
`rgba(15,23,42,...)` literals), flagged as pending since 28s234/236/237.

Same technique as the AdminEarningsPage restyle (28s236): swapped every
hardcoded hex/rgba literal for the matching `adminColor` token (text,
accent, muted, dim, line, panel, panel3) across the page body + all 6
shared subcomponents (`Card`, `Eyebrow`, `FunnelStep`, `ModeRow`,
`RankedList`, `Legend`). Added a custom `sx` override to the range
`ToggleButtonGroup` so its selected state uses `adminColor.accent`
instead of MUI's default blue. No layout or data-logic changes — funnel
steps, per-mode conversion, top-services ranking, concierge-channel
ranking, and the daily trend chart are unchanged, just recolored.

**All 4 shared-token pages are now consistent:** AdminLayout, Dashboard,
Tonight, Earnings, Users (CRM), Audit Log, Analytics. **Still on the old
theme** (not requested yet): AdminBookingListPage, AdminTherapistsPage,
AdminReportPage.

### 🆕 2026-06-14 (cont.) — AdminAnalyticsPage filters (28s243)

Founder asked "AdminAnalyticsPage ใช้ทำอะไรได้อีก" (what else could this
page do) — offered 3 extension ideas (marketing-source attribution,
referral-code leaderboard, drop-off diagnostic). Founder didn't pick from
those; instead said "เพิ่มตัวกรอง" (add a filter), then when asked which
dimension, answered "ทั้งหมด" (all of them: custom date range + concierge
mode + language).

Shipped all 3:
- **Custom date range** — `Range` type extended to `"7d" | "30d" |
  "custom"`; picking Custom reveals From/To `DatePicker`s. The Firestore
  query adds a `where("ts", "<=", upper)` bound alongside the existing
  `>=` cutoff when custom is active — both inequalities on the same
  field, so no new composite index was needed.
- **Concierge-mode filter** (prime/evening/day/off) and **language
  filter** (en/th/zh/ja/ko) — both narrow client-side via a new
  `filteredEvents` memo that the existing `stats` aggregation now reads
  instead of raw `events`. All 3 filters compose — every widget (funnel,
  by-mode card, top services, channel taps, daily trend) reflects the
  combined filter.
- Daily-trend chart width now follows the actual custom range (capped
  60 days) instead of a hardcoded 7/30.
- Split the empty state: "no events in Firestore at all" (rules/tracking
  problem) vs "0 events match this filter" (normal — e.g. a rare
  mode+lang combo) — these used to look identical and would have been
  confusing once filters could legitimately zero out results.

**Open idea, not yet built** (from the "what else" discussion, still
worth doing next time it comes up): marketing-source/UTM/district-page
attribution on the funnel — requires first verifying the `source`/`utm`/
`landing` fields the 2026-06-02 SEO round mentions are actually landing
on live booking docs (not yet confirmed).

### 🆕 2026-06-14 (cont.) — AdminEarningsPage filters (28s244)

Founder: "admin/earnings" (bare, asked to clarify) → "เพิ่มตัวกรอง (เหมือน
Analytics)" — same filter pattern as 28s243, applied here.

- `Range` split into `PresetRange` (today/week/month/year) + a separate
  `"custom"` case with its own From/To `DatePicker` state — custom needs
  an explicit upper bound the 4 rolling presets don't. Query adds
  `createdAt <= upper` only when custom is active (same field as the
  existing `>=`, no new index).
- **Therapist filter** and **service filter**, both narrowing via a new
  `filteredBookings` memo that now feeds `stats`, the CSV export, and the
  disabled/empty-state checks (previously all read raw `bookings`
  directly). Option lists are derived from the date-range-filtered set
  only — NOT further narrowed by the other filter — so picking a
  therapist doesn't collapse the service dropdown's choices.
- Daily-revenue chart width now follows the actual custom range (capped
  60 days) instead of a fixed bucket per preset.
- Split the empty state the same way as Analytics: "no bookings in this
  period" vs "no bookings match this therapist/service filter."

**Payout Tracker section untouched** — it deliberately uses its own
fixed-calendar-week query, independent of this range/filter bar, per its
original 28s234 design (payout persistence needs a STABLE week key, not
a rolling filter).

### 🆕 2026-06-14 (cont.) — AdminEarningsPage visual redesign (28s246 → committed as 28s245)

Founder: "ลองเปลี่ยนดีไซน์ ให้สวยขึ้น" — restyled Earnings with the same
widget vocabulary as the Dashboard (28s241), Ocean Study light palette
unchanged, zero data-logic changes:

- **Hero "Shop net" card** — big serif figure + margin DonutRing +
  money-flow stacked bar (therapist / taxi / costs / net) with legend.
  Replaced the flat 3-BigStat grid; `BigStat` component deleted.
- **Circular-icon stat row** (gross / payout / avg per booking /
  cancelled) — absorbed the old Cancelled + Average cards.
- **Daily chart**: peak day emphasized in ink #1F2933 + "Peak" figure in
  the header; rounded bars, hover state.
- **RankedRows**: rank badges, medal on #1 (mirrors Dashboard).
- **Light-mode debt paid off**: Card shadow was still the dark-theme
  0.25-alpha black → soft ink-tinted (rgba(31,41,51,…)) elevation;
  payout "Mark paid" text `#052012` → `#fff` (dark-mode remnant); the
  page's own Federo/Inter font consts aliased onto `adminFont` so
  Earnings typography finally matches the rest of the admin. Lesson: a
  token-flip round (28s240) catches token VALUES, but per-page literals
  tuned for the old mode (shadows, on-color text, font stacks) need
  their own sweep — grep `boxShadow`/`#fff`-adjacent literals when
  restyling the remaining pages.

### 🆕 2026-07-06 — admin figures switched to lining sans numerals (28s246)

Founder screenshotted the live Earnings page: "ปรับตัวเลข ให้ดูง่าย". Root
cause: 28s245's font unification aliased SERIF onto **Hoefler Text, whose
default digits are OLD-STYLE figures** (varying heights, like lowercase
letters) — elegant in prose, hard to scan for money. The Dashboard
(28s241) had the identical problem.

Fix: new shared **`adminFigureSx`** token in `adminTheme.ts` — bold sans
+ `lining-nums tabular-nums`, all digits one height, columns align.
Applied to every money/count figure on Earnings + Dashboard.

**Rule for future admin pages: numbers ALWAYS use `adminFigureSx`; the
serif (Hoefler) is for page/card TITLES only, never figures.** The token's
doc comment in adminTheme.ts repeats this.

### 🆕 2026-07-06 — /admin/reports audit: payroll math fix + restyle (28s247)

Founder: "Audit admin/reports" → "ทั้งหมด" (fix everything found).

**The real bug (financial):** AdminReportPage — the page View uses to PAY
therapists — disagreed with AdminEarningsPage on how much each is owed.
Reports used a **flat 60/40 over the full service price**; Earnings (since
28r27) uses a **tier-aware split (65% Gentleman's, 70% B2B) on the
post-discount price**. Premium therapists were under-paid (~฿320/job on a
฿3,200 B2B booking), discounted bookings over-paid. Reports also only
excluded the exact string `"cancelled"`, so refunds / no-shows / US-spelling
`"canceled"` / still-`pending` bookings all counted as payable jobs.

**Fix — shared source of truth:** new `src/utils/commission.ts` holds the
tier map, `PAYROLL_EXCLUDED_STATUSES`, `therapistPctFor`, `commissionBaseFor`,
`therapistPayoutFor`. BOTH AdminEarningsPage and AdminReportPage import it
now (Earnings' local copies removed — identical values, zero behaviour
change) so they can **never drift again**. If the two payroll surfaces ever
need to differ, that's a bug — they must share this file.

**Business assumption made:** aligned Reports TO Earnings' tier-aware model
(the one with explicit founder direction in 28r27). If the real commission
deal is actually flat 60/40, the fix flips — change the util, both pages
follow. Flagged to founder; not yet confirmed which is the true deal.
**→ RESOLVED in 28s248 below: founder confirmed flat 60/40. The shared util
now returns 0.6 for every tier, so both pages compute flat 60/40.**

**Also:** Reports restyled onto Ocean Study light tokens + `adminFigureSx`
(it was the LAST admin page still on the old #1A2B2E/#B4000A brand theme).
Fixed a stray `#7c3aed` purple (in no palette) and a near-white invisible
button shadow. Dropped the now-wrong "60%/40%" labels → "จ่ายนวด"/"ส่วนร้าน".
Excel export gained Discount + Pay columns.

**Admin pages now ALL on Ocean Study light + shared tokens:** Layout,
Dashboard, Tonight, Earnings, Users, Audit Log, Analytics, Reports. Still
old-theme: AdminBookingListPage, AdminTherapistsPage (tracked, not yet
requested).

**Known minor (not fixed, out of scope):** AdminEarningsPage's CSV per-row
`therapistShare` uses `service * tPct` (full price), while its aggregate +
Reports use the post-discount base — a small internal inconsistency in the
Earnings CSV only. Worth aligning to `therapistPayoutFor(b)` next time
Earnings is touched.

### 🆕 2026-07-06 — commission back to FLAT 60/40 (28s248)

Founder answered the 28s247 open question ("แก้ที่ commission.ts"): the real
deal is a **straight 60/40 for every service**, NOT the tier-aware 65/70%
premium trialled in 28r27. Set all four tiers in
`src/utils/commission.ts` `TIER_THERAPIST_PCT` to `0.6`. Because Earnings +
Reports both read this one map, both payroll surfaces flipped together — no
other edits. **The post-discount commission base (28r27) was KEPT** — founder
only spoke to the percentage, not the discount rule. To re-enable tiers
later: set `SR-HJ2200: 0.65`, `SR-B2B3200: 0.70` in that map, done.

**So the current live payroll rule is:** every therapist earns 60% of
(servicePrice − discount) on every non-excluded booking; shop keeps 40%.

### 🆕 2026-07-06 — /admin/bookings/add audit: 6 fixes (28s249)

Founder: "Audit adminbookings/add" → "แก้ทั้งหมด". All six findings fixed on
`AdminBookingAddPage.tsx`:

1. **Double Telegram + blank name (the real bug).** `onBookingCreate` (Cloud
   Function) already alerts the admin group on every booking doc, but this
   page ALSO called the deprecated `notifyBooking` callable → TWO messages per
   admin booking. Worse, the server formatter (`formatBookingForAdmin`) reads
   `contactName` while this page wrote only `customerName` — so the server
   copy showed `👤 Name: —`. Fix: removed the client send + now writes BOTH
   `customerName` and `contactName`. One correct message per booking.
2. **`Field`/`Section` hoisted to module scope.** They were declared inside
   the component → new identity every render → React remounted the whole form
   on each keystroke → inputs lost focus mid-typing. Classic
   component-in-component bug.
3. **Taxi origin → shared `DISPATCH_BASE`** (matches customer flow since
   28s233), replacing an old Sukhumvit constant + placeholder per-therapist
   coords. Admin & customer now quote the same fare for the same address.
4. **Manual taxi override no longer wiped** on duration/therapist change —
   split the "compute auto" and "reset override on new location" into two
   effects.
5. **WeChat/Alipay + surcharge** (5%+฿200, paymentSurcharge.ts) now apply on
   admin bookings too, write `paymentFee`, and show in the summary. The
   customer flow had this since 28s77.
6. **Restyled onto Ocean Study** admin tokens + `adminFigureSx` — was the last
   admin-add page on the old customer red/cream theme (it had been styled that
   way deliberately in 28r23 to match the customer BookingFlow, but now the
   whole admin is Ocean Study so matching admin is the consistent choice).

**Lesson filed:** the deprecated `notifyBooking` callable + `formatBookingForAdmin`
reading `contactName`-only are a reminder — when a booking is written from a
NEW code path, check it populates every field the server Telegram formatter
reads (contactName, phone, address, locationName, note, payment, paymentFee),
or the alert silently shows "—".

### 🆕 2026-07-06 — /admin/bookings audit: 8 fixes (28s252)

Founder: "Audit admin/bookings" → "ทั้งหมด". AdminBookingListPage:

1. **Bounded the realtime listener** — was `query(bookings, orderBy createdAt)`
   with NO limit → streamed the entire collection in realtime (unbounded
   Firestore read + client memory, grows with history). Now `limit(500)`,
   newest first; header shows "showing latest 500" when capped. Older records
   are covered by Reports/Earnings (date-bounded).
2. **Cancel confirms + captures a reason** (window.prompt) before flipping a
   real booking → `cancelReason` on the doc (shown in drawer) + in the audit
   detail. Was one-tap destructive, next to "Mark Complete".
3. **Unified payment fields** — customer flow writes `paymentStatus` ("unpaid")
   which nothing here read/updated (dead data); admin used a separate `paid`
   boolean. Now the toggle writes BOTH in sync and display reads either via
   `isPaid(b) = b.paid ?? b.paymentStatus === "paid"`. Closes the CLAUDE.md
   "paid vs paymentStatus" known issue.
4. Restyled onto Ocean Study light tokens + `adminFigureSx`.
5. Paid toggle now audit-logs — new `booking.mark_paid`/`booking.mark_unpaid`
   actions in `auditLog.ts` + labels in AdminAuditLogPage.
6. `Row` hoisted to module scope (was redefined every render).
7. aria-labels on icon-only buttons.
8. Unknown statuses get a neutral badge via `cfgFor()` (not pending-red);
   refunded/no_show labelled.

**Admin now ALL on Ocean Study** except **AdminTherapistsPage** — the last
page still on the old theme.

### 🆕 2026-07-06 — AdminBookingListPage visual redesign (28s253)

Founder: "ปรับการตกแต่งใหม่สวยๆ" — shown a mockup in an Artifact first (per
the established "mockup before shipping" pattern for visual passes), approved
it, then said "แก้ให้สวยขึ้น admin/bookings" to apply. Pure layout/hierarchy
polish on top of the 28s252 fixes — no new colors, still Ocean Study only:

- **Summary strip** — 3 stat cards (Needs action / In progress / Booked
  value) above the fold. "Booked value" sums the currently-loaded (bounded)
  set excluding cancelled — a real number, not a fabricated "tonight" figure
  the page can't actually scope to (it has no date filter).
- **Search + tabs merged** into one control row (was two stacked full-width
  rows) — tighter, tabs don't eat a full desktop line anymore.
- **Cards recede once terminal** — completed/cancelled sit on `panel2`
  (duller), skip the hover lift, price renders in `dim` instead of `accent`.
  Active (pending/confirmed) cards get a hover lift + deeper shadow so the
  board reads as live, not a static list. This is the main "make it pretty"
  move: attention now follows what's actionable, not history.
- Corner radius 18→20px; shadows re-tuned to the ink-tinted elevation
  pattern already used on Earnings/Dashboard cards.

### 🆕 2026-07-06 — AdminBookingListPage filters (28s254)

Founder: "เพิ่มตัวกรอง" → asked which dimension, answered "ทั้งหมด 3 อย่าง
(แนะนำ)". Same filter pattern as the Earnings/Analytics rounds (28s243/244):

- **Date range** — "All time" (the existing flat last-500-docs fetch) or
  "Custom" (From/To), which now drives the Firestore query itself (a
  `createdAt >=/<=` window, still capped at `FEED_LIMIT` for safety).
- **Therapist filter** — options from the date-scoped set only, so switching
  the payment filter never collapses the therapist dropdown's choices.
- **Payment filter** (Any / Paid / Unpaid) via the `isPaid()` helper from
  28s252.

Therapist + payment are **persistent facets** — a new `faceted` memo narrows
by them and feeds the summary strip, tab counts, AND the visible list, so
"Needs action" etc. mean "pending, among what you've selected." Free-text
search deliberately does NOT re-narrow the facets — it's a one-off look-up,
not something that should silently change what the summary numbers mean.

### 🆕 2026-07-06 — Bookings default tab (28s255)

Founder: "All show" — clarified as wanting `/admin/bookings` to open on the
**"All"** tab instead of "Pending". One-line `useState` initializer change.

### 🆕 2026-07-06 — Bookings nested-card frame (28s256)

Founder shared a customer-site screenshot (profile browse cards) and asked
for AdminBookingListPage to adopt its "สี และ พื้นหลังหลัก พื้นหลังรอง
กรอบและปุ่ม" (color, main bg, secondary bg, frame, buttons). Since the
reference's primary button was dark-navy — not Ocean Study's accent teal
used everywhere else in admin — this warranted a clarifying question before
touching every button on the page: founder confirmed **keep teal, adopt only
the nested-card structure** ("คง teal เดิม เอาแค่โครงการ์ดซ้อนในกรอบ").

- Each `BookingCard` now sits inside an outer "frame" Box (secondary
  background, 8px padding, 24px radius) that holds the existing white/panel2
  inner card (18px radius) — reproducing the reference's nested-box look.
- New `CARD_FRAME_BG = "#C5D8DF"` — an 18% blend from `bg` (#DCEFF5) toward
  `dim` (#5C6F7B). **Lesson: `adminColor.panel3` was tried first and
  rejected** — it's also a blend toward `bg`, just from white, so it reads as
  visually near-identical to `bg` itself and couldn't function as a distinct
  frame layer. When a design calls for a background meaningfully DARKER than
  the page bg (not just an elevated-panel shade), blend toward the darker
  anchor (`dim`/`text`), not toward `bg` again.
- Grid gap 1.5→1 since each card's own frame padding now supplies part of
  the visual separation between cards.
- Nothing else changed — accent teal remains the only primary-button color
  across all of admin, unbroken.

### 🆕 2026-07-06 — dead-code / junk cleanup (28s250-251)

Founder: "เครียข้อมูลเก่า และ ข้อมูลขยะที่ไม่ได้ใช้แล้ว" → "จัดการทั้งหมด".
No production change — everything removed was dead (tree-shaken) or not
shipped; the bundle is byte-identical, so this was NOT deployed.

**28s250 — junk + deps:** deleted a tracked file literally named `" "` (a
stray old default Firestore "allow all" rules template), two obsolete
one-off scripts (`cleanup.sh`, `removeAvailable.cjs` — targets long gone),
6 unused deps (`@mui/lab`, `axios`, `react-phone-number-input`, `swiper`,
`uuid`, `@types/uuid` — 0 refs anywhere; lockfile −226 lines), `src/utils/
telegram.ts` (orphaned when 28s249 removed its only caller), and swept all
`.DS_Store` (gitignored).

**28s251 — 20 dead source files:** the home-page chrome removed during the
28s140s "app-style home" purge (HeroSection, PromiseStrip, HomeFooter,
ReserveCTA, SocialProofTicker, FirstBookingBanner, AdminPresenceBadge,
ReferralActiveBanner, FloatingLanguageSwitcher, GlobalLanguagePill +
data/heroPromos + 7 orphaned hooks), plus AdminLoginPage (superseded by the
/admin/login→/login redirect to LoginPage) and utils/therapistStatus.ts
(superseded by calculateTherapistStatus). All verified: zero live importers
(the only "imports" were commented-out lines in HomePage.tsx), tsc + build
pass. HomePage's comments claimed these were "kept on disk for git revert" —
unnecessary, git history preserves them.

**Deliberately NOT touched — knip's "unused exports" list (72):** these are
tree-shaken (zero production cost) and the list is unreliable — e.g. it flags
`src/app/i18n.ts`'s default export as unused, but `main.tsx` does
`import "./app/i18n"` (removing it would break i18n app-wide); it flags the
taxiFare/servicePricing tunable constants that CLAUDE.md documents as
intentional knobs; and it flags DetailSections sub-components that are
rendered inside their own file. Stripping them = zero benefit, real
whole-app risk. **Rule: don't bulk-apply knip's export-level results on this
repo — vet each; the file-level and dependency results are trustworthy, the
export-level ones are not.**

### 🆕 What Round 28s226 + 28s227 shipped (2026-06-02) — Search Console-driven SEO batch

**Trigger.** View shared Google Search Console 3-month data:
- Top branded `sunred massage` +16% MoM (79 clicks) — TG + WOM working
- Top non-branded `outcall massage bangkok` **−30%** (32 clicks)
- `bangkok outcall massage` **−41%** (13 clicks)
- `outcall massage sukhumvit` −25% (3 clicks)
- `massage near me` +300% (4 clicks)
- Every top query is **English** but home `<html lang>` was `th` at
  runtime + Thai meta + buried "outcall massage" tokens behind
  brand + a "#1 / No.1 / 第一 / 1위 / ระดับ #1" superlative
- Competitor CBODY ranks page 1 with **3 domains** (`cbody.vip`,
  `cbodyspa.com`, `cbodyapp.com`) + targets 4 cities + has a CN-only
  domain — same playbook we should run

**28s226 — keyword-first rewrite + brand discipline (commit `49c1e4b`):**
- `index.html` title: was *"SUNRED Bangkok · Luxury Outcall Massage
  to Your Hotel"* → *"Outcall Massage Bangkok — Delivered to Your
  Hotel 24/7 | SunRed"*. og:title + twitter:title + meta description
  + keywords meta all repointed at exact-match phrases + 4 districts.
- Removed every `#1 / No.1 / 第一 / 1위 / ระดับ #1` falsifiable
  superlative across all 5 langs in `src/app/i18n.ts`
  (hero.title + meta.home.title + meta.home.description) +
  `ReferralDialog.tsx` share text + `locales/ja/translation.json`
  `sheet.duration.popular` (`人気No.1` → `人気`). Same category as
  the fake "4.8★ 1,200+" rating removed in 28s108.
- Per-locale meta.home titles rewritten to lead with the local search
  phrase (`Outcall Massage Bangkok` · `曼谷上门按摩` · `バンコク出張
  マッサージ` · `방콕 출장 마사지` · `บริการนวดถึงที่กรุงเทพ`).
- BottomNav tab `Therapists` → `Practitioners` (loudest remaining
  euphemism-table violation in the app per §3).
- TherapistSearchBar default placeholder + aria-label switched to
  `Find your practitioner…` / `Search practitioners`.
- HomeTherapistGrid "All N with guests" → honest split:
  *"All N working tonight are with guests · M off today — message
  concierge to be next"* (was claiming all 12 when 4 were on holiday).
- 5 new prerendered EN district landing pages:
  `/outcall-massage-sukhumvit` · `/outcall-massage-silom` ·
  `/outcall-massage-asok` · `/outcall-massage-thonglor` ·
  `/outcall-massage-near-me`. Each: district-specific title,
  Service + BreadcrumbList JSON-LD, crawlable noscript with district
  intro + service menu + concierge links. App.tsx routes 301 humans
  to `/` (SPA still serves the practitioner roster). sitemap.xml += 5.

**28s227 — image perf + zh/ja/ko district localisation + multi-domain prep (commit `52e3c04`):**
- `TherapistMinimalCard` accepts `eager?: boolean`. When true:
  `loading="eager"`, `fetchPriority="high"`, `decoding="sync"`, plus
  explicit intrinsic `width={300} height={400}` (3:4 portrait at 2×
  retina). HomeTherapistGrid passes `eager={i === 0}` so the LCP
  target card no longer waits in the lazy queue, and CLS is reserved
  before paint on every card.
- District landing pages now ship in 4 langs (was en-only). 5 districts
  × 4 langs = **20 prerendered shells**. Each localized shell ships
  native-language title (素坤逸上门按摩 / スクンビット出張マッサージ
  / 수쿰빗 출장 마사지), description, H1, intro/extra paragraphs +
  localized service menu. hreflang cluster (en + zh + zh-CN + zh-TW +
  ja + ko + x-default) on every district shell. Targets Baidu / Yahoo
  JP / Naver long-tail that path-based hreflang of the home cluster
  alone doesn't unlock — CN tourists searching `曼谷素坤逸出门按摩`
  now land on a 中文 page with the answer. Prerender count:
  **40 → 55 routes**. sitemap.xml += 15 URLs (43 → 58 total).
- **Bundle audit.** Imports of phosphor-react, @mui/icons-material,
  react-icons/fa all use named subpath imports — tree-shaking works.
  Main bundle 1.0M raw / 332 KB gzipped (acceptable for first paint
  on 4G). No refactor needed now.
- **Multi-domain strategy** — 4 deploy-ready static landing pages in
  `docs/multi-domain-landing/` (`sunred-bkk-com.html`, `sunred-app.html`,
  `sunred-cn.html`, `sunred-asia.html`). Each is single-file, no build
  step, full LocalBusiness JSON-LD, links openly to sunred.vip as the
  canonical. Plus `docs/multi-domain-strategy.md` — 7-section playbook
  (which domains to register in what order, ~฿2,275/yr Y1 cost, 60-day
  consolidation plan with 301 redirects after week 9, anti-pattern
  list, Vercel deploy checklist). Recommended first satellite:
  `sunred-bkk.com` (~฿350/yr Porkbun). 2nd priority: `sunred.cn`
  for Baidu + WeChat reach.

**🔥 Manual action items for View (do before 28s228):**
- [ ] **Submit `https://sunred.vip/sitemap.xml` in Google Search
      Console** (resubmit even if listed — triggers recrawl of the
      20 new district URLs)
- [ ] **Request indexing on the 5 EN district URLs** in GSC URL
      Inspection (one at a time, ~30 sec each)
- [ ] **Request indexing on the 15 zh/ja/ko district URLs** —
      spread over 3 days due to GSC rate limit (5/day per property)
- [ ] **(Optional)** Submit to Bing Webmaster Tools + Baidu Webmaster
      (zh URLs) + Naver Webmaster (ko URLs). Each ~15 min one-time setup.
- [ ] **Decision:** Register `sunred-bkk.com` (~฿350/yr)?
      Strategy doc in `docs/multi-domain-strategy.md`. When ready,
      deploy `docs/multi-domain-landing/sunred-bkk-com.html` to a
      new Vercel project (~5 min). Ping Claude after registration
      for the GSC + sitemap setup on the new domain.
- [ ] Check Search Console 7 days post-deploy:
      - `outcall massage bangkok` clicks should rebound (was −30%)
      - `outcall massage sukhumvit` impressions should grow
      - District URLs should appear in Performance report
      - If localized district URLs are getting impressions but
        zero clicks → CTR-fix the snippet (titles/descs)

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
