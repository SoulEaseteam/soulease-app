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

### 🆕 2026-07-06 — Bookings "Load more" pagination (28s257)

Founder screenshotted the "showing latest 500" line and asked why it can't
show everything ("ทำไมจำกัดแค่ 500 ทั้งหมดไม่ได้หรอ"). Checked live:
**the bookings collection has 593 docs right now** — the 500 cap from
28s252 was already hiding 93 real bookings, not a future hypothetical.

Offered 3 fixes; founder picked **"Load more" pagination** (not raising the
cap, not removing it):

- `feedSize` state starts at `FEED_LIMIT` (500), grows by `FEED_LIMIT` per
  click on a new "Load {N} more" button; the Firestore query's `limit()`
  now reads `feedSize` instead of the constant directly.
- Resets to `FEED_LIMIT` whenever the date range changes (new `useEffect`
  keyed on `dateMode`/`customStart`/`customEnd`) — switching windows starts
  fresh at page one.
- Preserves the 28s252 guarantee (nothing fetches unboundedly on its own —
  every additional page is an explicit operator click) while removing the
  artificial total ceiling the founder was hitting.
- Header subtitle ("showing latest N") and the button label both track the
  live `feedSize`, not a hardcoded number.

### 🆕 2026-07-06 — shop revenue on the Bookings summary strip (28s258)

Founder: "ในBooked value โชว์ ยอด รายได้ร้านด้วย" — add shop revenue to the
"Booked value" card. Implemented via the SHARED `commissionBaseFor()` /
`therapistPayoutFor()` from `src/utils/commission.ts` (currently flat
60/40) — not a hardcoded percentage on this page — so this third revenue
surface can't drift from Earnings/Reports the way they drifted from each
other before the 28s247 fix. Added `discountAmount` to the page's local
`Booking` interface (the shared calc needs it).

`shopRevenue = (servicePrice − discount) − therapistPayout`, summed over
the same faceted/non-cancelled set "Booked value" already totals. Excludes
taxi (pass-through) and Earnings' per-booking overhead deduction — this is
a quick glance figure on the list page, not a substitute for the Earnings
calculator. Rendered as a second line under the bookings-count sub-line, in
accent color.

**Rule reinforced: any NEW surface that touches therapist pay/shop revenue
must import from `commission.ts`, never recompute the split locally** — this
is now the 3rd page (after Earnings, Reports) to follow it.

### 🆕 2026-07-06 — Bookings detail drawer: 4 fixes (28s259)

Founder flagged 4 things on the booking card/detail drawer in one message:

1. **"Awaiting review ใช้ไม่ได้"** — it was never a button. Grepped: `reviewed`
   is written NOWHERE in the codebase, only ever read (mirrors the
   customer-facing "leave a review" gate on `BookingHistoryPage`). The badge
   had the exact same border/pill styling as "Full detail" right beside it →
   looked clickable, had zero `onClick`. Now a real button — "Mark
   reviewed" (`<Star/>` icon) — sets `reviewed: true`, logs
   `booking.mark_reviewed`.
2. **"full detail แก้ไขไม่ได้"** — Booking Info was 100% read-only except the
   Payment toggle. Added an "Edit" pencil toggle that swaps Customer / Phone
   / Date & Time / Location / Therapist into editable fields, with Save/
   Cancel. **Deliberately excludes service/duration/price** — those drive
   `servicePrice`/`taxiFee`, already computed and settled; changing them
   needs a real recalc flow, not a text-field patch. Founder confirmed this
   exclusion explicitly when asked.
3. **"สถานนะ แก้ไขไม่ได้ Cancelled/Completed"** — added an always-active
   Status `Select` (NOT gated behind the Edit toggle — status changes are
   routine, editing customer/location is "fixing a mistake") that reaches
   ANY of the 6 known statuses from ANY current one — founder chose full
   flexibility over a narrower "revert to Confirmed only" option. Picking
   "Cancelled" still routes through the existing reason-prompt. New
   `booking.status_change` audit action covers whatever Confirm/Complete/
   Cancel don't already name.
4. **"เพิ่มการเปลี่ยนหมอนวดได้ภายในใบจองเดิม"** — folded into the same Edit
   form as a Therapist `Select` (same roster-fetch pattern as
   AdminBookingAddPage). **No fare recalculation needed** — taxi has been
   dispatch-base-only, not per-therapist, since 28s233, so reassignment is a
   pure `therapistId`/`therapistName` patch. Founder confirmed: **no
   automatic Telegram DM to the newly-assigned therapist** — she calls
   manually, same as every other dispatch today.

New audit actions in `auditLog.ts` + Thai labels in `AdminAuditLogPage.tsx`:
`booking.status_change`, `booking.edit_details`, `booking.mark_reviewed`.

**Lesson filed:** a static `<Box>` styled identically to a real button next
to it (same border/radius/sizing, no `cursor`/`onClick`) is a trap — it reads
as broken even when it's "just" a status indicator. If a badge and a button
sit in the same row, make the non-interactive one visually distinct (or make
it real), don't let matching CSS imply matching behavior.

### 🆕 2026-07-06 — payment method added to the Bookings edit form (28s260)

Founder: "เพิ่มวิธีีการจ่ายด้วย" — extend the 28s259 edit-details form with
payment METHOD (cash/transfer/card/promptpay/wechat/alipay), same option
list as `AdminBookingAddPage`'s `PAYMENT_OPTIONS`. This is distinct from the
existing paid/unpaid boolean — renamed that row "Payment" → **"Payment
status"** so the two don't read as duplicates; the method is now its own
**"Payment method"** row.

**Caught before shipping:** payment method isn't cosmetic — WeChat/Alipay
carry the existing 5%+฿200 surcharge (`paymentSurcharge.ts`, same util the
customer flow and AdminBookingAddPage use). Silently letting the operator
switch a booking to WeChat without updating the total would under-charge it.
Fix: saving the edit form recomputes `paymentFee`/`totalPrice` from
`(servicePrice + taxiFee)` — never from the stored `totalPrice`, so
re-saving the same method twice can't compound an old surcharge — and the
form shows a live "+฿X surcharge will be added" preview before the operator
commits, so the total never changes silently.

Added `payment`/`paymentFee` to the page's local `Booking` interface.

### 🆕 2026-07-06 — price made editable in the Bookings edit form (28s261)

Founder: "แก้ราคาได้ ทั้งหมด" — reverses the 28s259 scope decision that
excluded price ("กระทบราคาที่คำนวณไว้แล้ว, เสี่ยงเงินขัดกันถ้าให้แก้ด้วย").
Founder wants it editable after all — no re-confirmation needed, this
directly reopens a choice she made herself.

- Service price + taxi fee are now free-form number inputs. **Total is
  never itself an input** — always derived as
  `service + taxi + paymentSurcharge(method, service+taxi)` — so it can't
  drift from its own components no matter what gets typed.
- The 28s260 surcharge preview now reads the LIVE typed service/taxi values
  (not the stale stored ones), plus a new "New total: ฿X" line so the
  operator sees the real final number before committing.
- **Caught before shipping:** a draft of the audit-log enrichment
  (before/after total on price changes) accidentally put
  `priceChangedFrom`/`priceChangedTo` straight into the Firestore `patch`
  object — which would have written those as real, permanent fields on the
  booking doc. Fixed by splitting `onSaveDetails` into two arguments: the
  actual Firestore patch, and a separate audit-only detail object that only
  ever reaches `logAdminAction`, never `updateDoc`. **Rule: audit-trail
  metadata and the Firestore write patch must never share one object** —
  it's too easy for one to leak into the other.
- **Also fixed** (spotted in the founder's screenshot, unrelated to the
  price ask but the same Select): Payment Method dropdown could render
  blank for bookings created before 28s260 (no `payment` field yet). Added
  `displayEmpty` + a `renderValue` fallback so it always shows real text.

### 🆕 2026-07-06 — Total becomes independently editable (28s262)

Founder: "ให้บิล แก้ได้ทั้งหมด บนใบจอง" — one message after 28s261 shipped
Service/Taxi as editable with Total DERIVED from them. Wants the whole bill
editable, Total included.

Total is now its own free-typed number, saved exactly as entered — not
forced to equal `service + taxi + surcharge`. Matches real operator
behavior: a solo founder sometimes just agrees a number with a guest
(discount, rounded cash amount) that won't cleanly match the formula, and
needs the tool to record what actually happened rather than lock her to a
calculation. The computed figure is still surfaced as a **one-click "Use
computed: ฿X" suggestion** next to the field — offered, never forced, and
only shown when it differs from what's currently typed. `paymentFee` is
still computed/stored for the Payment Method row's "(+฿X surcharge)" note,
independent of whatever Total the operator ends up saving.

**Pattern for future "make X editable" requests on this page:** default to
computed/derived, but when the founder pushes back wanting full override,
give it — she's optimizing for "record reality accurately" over "keep the
tool's formula authoritative," which is the right call for a business where
she personally negotiates every price.

### 🆕 2026-07-06 — service + duration now editable, completes the bill (28s263)

Founder: "เปลี่ยนบริการได้ด้วยสิ มันทั้งหมดของบิล ยังไง" — the very next
message after Total. Service type and duration were the last two
price-driving fields still locked to the DetailPanel's read-only header.

- New "Service" `Select` (reuses `services` from `@/data/services` —
  the same catalog `AdminBookingAddPage` draws from) and a "Duration" pill
  row (`durationsFor()` for the tier options, `priceForDuration()` shown per
  pill) — identical helpers to the booking-creation flow, so the numbers an
  operator sees when EDITING a booking match what they'd see CREATING one.
- Picking either re-fills Service price with the catalog rate for that
  combo — but the price field stays freely editable afterward (28s261's
  rule still applies): this is a convenient starting point, never a lock.
- `serviceId`/`serviceName` dual-write together only when actually changed
  (mirrors the therapist-reassignment convention from 28s259); `duration`
  always writes through.

**This closes the "แก้ได้ทั้งหมด" (fully editable) arc across
28s259→28s263**: therapist, customer, phone, date/time, location, payment
method, service, duration, and every price component (service price, taxi
fee, total) are now all editable on one booking, in one drawer, in one
Save. Status is separately always-overridable (28s259's independent
dropdown). What's NOT editable: the booking ID and the `createdAt`
timestamp (by design — those are the record's own history, not the
service being delivered).

### 🆕 2026-07-06 — booking edit drawer redesign (28s264)

Founder: "ปรับให้ หน้า แก้ไข มันสวยขึ้นและใช้งานง่าย" — shown a mockup in an
Artifact first (established pattern for visual passes on this page — same
as the 28s253 card redesign), approved with one change: **"Duration ทำเป็น
ดรอปดาว นอกนั้น เอาตามที่ออกแบบ"** (dropdown instead of pills; everything
else as designed). Pure layout/hierarchy — every field, handler, and write
path from 28s259–263 is unchanged, only how they're presented.

The edit form had grown field-by-field across 5 rounds into one flat list
of 12+ rows with thin dividers, all equal visual weight. Regrouped into:

- **Status** — pulled into its own small standalone card at the top,
  independent of the Edit toggle (routine tap, not a "fix a mistake" edit).
- **Guest & Schedule** — Customer, Phone, Date & Time, Location.
- **Service** — Therapist, Service, Duration (dropdown per the one
  requested change).
- **Billing** — styled as an actual receipt: Service price + Taxi fee,
  Payment method (+ surcharge note), a dashed rule, then Total with its
  "Use computed" suggestion. It's literally the bill, so now it reads
  like one.
- **Record** — Booked, Payment status, Booking ID.
- Header price strip now goes **LIVE while editing** (real service/taxi/
  total from the form, "Editing" pill, accent highlight ring) so a change's
  impact is visible without scrolling to Billing.
- Every field now uses MUI `TextField`/`Select` with a shared
  `editFieldSx` (teal focus ring matching Ocean Study) instead of native
  `<input>` elements, which showed the browser's default BLUE focus
  outline — the single most visible "doesn't match the theme" detail in
  the old form.

**Caught before shipping:** the "Payment status" (paid/unpaid) toggle was
part of the flat list before, rendered unconditionally regardless of
editing state. In the first pass of the regroup it landed inside the
read-only-only Billing section — meaning it would have DISAPPEARED while
editing (a real functionality regression, not just a style change). Fixed
by moving it into the always-visible Record section, matching the "same
reasoning as Status" pattern (routine tap, not edit-gated) that was already
established for Status itself. **Lesson: when regrouping fields that used
to render unconditionally, explicitly check whether the ternary boundary
{editing ? ... : ...} now traps something that shouldn't be trapped.**

### 🆕 2026-07-06 — admin-wide dropdown transparency fix (28s265)

Founder screenshotted the Therapist dropdown on the Bookings edit form:
other therapist names / page content visibly bled through the menu
background. "เช็คและแก้ dropdown ของ ทั้งระบบ แอดมิน พื้นมันบางใสจนเห็น
รายละเอียดอื่นด้านหลัง" — explicitly asked to check the WHOLE admin system,
not just the one dropdown shown.

**Root cause:** the global MUI theme (`src/theme.ts`) sets
`palette.background.paper: "rgba(255,255,255,0.65)"` — a deliberate
frosted-glass effect for the CUSTOMER site. Admin shares the same
`ThemeProvider` (wired once in `main.tsx`), so any Select/TextField-select
menu that doesn't explicitly override its Paper background inherits that
65%-opacity white. Did **not** touch `theme.ts` itself — fixing it globally
would break the customer site's intended look; every fix below is a local,
explicit opaque override (the same convention already used in ~30 other
spots in admin).

**Audit method:** regex-scanned every `src/pages/admin/**/*.tsx` for
`<Select>`/`<TextField select>` blocks lacking a `MenuProps`/`SelectProps`
override. Found **12 instances across 6 files**:
- 4 in `AdminBookingListPage.tsx` — introduced by THIS session's own
  28s264 edit-drawer rewrite. Cause: converting `<Select>` →
  `<TextField select>` drops the override unless you know the prop is
  `SelectProps.MenuProps`, not `MenuProps` directly — easy to miss.
- 8 pre-existing, unrelated to this session: `AdminUsersPage.tsx` (Role),
  `EditTherapistPage.tsx` + `AdminTherapistDetailPage.tsx` (Badge, Status
  Override ×2 files), `AdminSeedReviewsPage.tsx` (Therapist filter,
  Language, Template).

**Fix pattern (2 flavors, by migration status):**
- Ocean Study pages (`AdminBookingListPage`, `AdminUsersPage`) →
  `background: adminColor.panel2, color: adminColor.text` (added a shared
  `editSelectProps` const in BookingListPage, applied to all 4 of its
  selects via `SelectProps={editSelectProps}`).
- Pages not yet on Ocean Study tokens (`EditTherapistPage`,
  `AdminTherapistDetailPage`, `AdminSeedReviewsPage`) → plain opaque
  `"#fff"`, no new token dependency introduced.

Verified zero remaining instances via re-audit, then confirmed **live in
production** by curling the deployed chunk for each of the 5 files and
grepping for the exact `MenuProps:{PaperProps:{sx:{background:...}}}`
string — counts matched exactly (4+1+2+2+3=12).

**Lesson: `<Select>`'s override prop is `MenuProps`; `<TextField select>`'s
equivalent is `SelectProps.MenuProps`** — different prop name, same effect.
Any future `<Select>` → `<TextField select>` conversion must carry this
across explicitly, it won't transfer automatically. When a founder asks to
check something "ทั้งระบบ" (system-wide), grep the whole pattern rather than
just fixing the one instance shown — this round's audit surfaced 8 more
broken spots the screenshot never showed.

### 🆕 2026-07-06 — admin sidebar nav reordered by workflow (28s266)

Founder: "เรียงแถบนี้อีกครั้ง" — the nav (`src/components/layouts/
AdminLayout.tsx` `menuItems`) had accumulated in ship order across many
rounds; New Booking and Bookings had drifted apart (split by Reports).
Regrouped by actual usage, no route/behavior change:
- **Daily ops:** Tonight, Dashboard, New Booking, Bookings
- **Money & numbers:** Earnings, Reports, Analytics
- **People:** Therapists, Users
- **Content:** Reviews, Seed Reviews
- **System:** Blocked, Audit Log, Pages, Settings

### 🆕 2026-07-06 — /admin/therapists audit: 8 fixes (28s267)

Founder: "Audit admin/therapists" → "แก้ทั้งหมด". `AdminTherapistsPage.tsx`
was the last admin page not yet audited this session (and the last one
still on the pre-redesign theme). Findings + fixes:

1. **The real bug.** Admin's own roster could show a therapist as
   "available" while she was actually mid-session, or "busy" long after a
   job ended — because the page fed `calculateTherapistStatus()` raw
   Firestore fields and trusted the legacy manual `isBooked` toggle. The
   CUSTOMER-facing booking flow had already stopped trusting that same
   field back in round 28b49, specifically because admin's manual toggle
   goes stale — but admin's own page was never updated to match. Fixed:
   one shop-wide bookings listener bounded by `status in
   [confirmed,pending,in_progress]` (small by construction — mirrors why
   the per-therapist version never needed a `limit()`), merged into the
   same `activeBooking`/`busyUntil` shape BookingFlowPage already builds.
   Admin now sees exactly what customers see. This made the old manual
   "Session" switch pure dead weight, so it's replaced with a real **"Now"**
   column showing the actual booking end time (or "ว่าง").
2. **Today/Total columns always showed 0.** Grepped the whole repo — no
   code anywhere ever wrote `todayBookings`/`totalBookings` onto a
   therapist doc after creation-time `0`. Today is now a live count from
   a `date`-scoped bookings query (one day of volume, safe to stream);
   Total uses `getCountFromServer` per therapist (server-side aggregate,
   zero documents downloaded), refetched only when the roster's id set
   changes.
3. **`statusOverride` never expired** (this exact gap was already flagged
   in the Phase-4 TODO above — confirmed still true, zero `overrideUntil`
   refs anywhere before this round). New `overrideUntil` field on
   `Therapist` (`src/types/therapist.ts`), stamped to end-of-BKK-day
   whenever a non-Auto override is set — including the "คืนนี้เปิดทั้งร้าน"
   roster-batch action. `calculateTherapistStatus.ts` now ignores an
   expired override and falls through to normal working-hours logic.
   Additive only — overrides with no `overrideUntil` keep the old sticky
   behavior, so nothing existing breaks.
4. **Silent data loss.** Edit a field, hit Back within the 250ms debounce
   window, the edit vanished — unmount cleared the pending timer instead
   of flushing it. Fixed: unmount now fires every still-pending write
   immediately instead of discarding it.
5. **Zero audit trail on individual edits.** Only the two roster-batch
   actions were logged; holiday toggle, override change, working-hours
   edits, and delete were not. Added `therapist.update`/`therapist.delete`
   to `auditLog.ts` + Thai labels in `AdminAuditLogPage.tsx`, wired into
   every edit path.
6. **Hard delete, zero warning.** Delete now precounts bookings tied to
   that therapist (`getCountFromServer`) and shows the real number in the
   confirm dialog before deleting — still allows it (founder is the sole
   operator), just makes the risk visible instead of silent.
7. **Restyled onto Ocean Study** (`adminColor`/`adminFont`/`adminFigureSx`)
   — this was the last admin page on the pre-redesign theme. **Every admin
   page is now on Ocean Study.**
8. **Pagination stranding** — DataGrid now resets to page 1 whenever
   search/filter narrows the visible set.

**Flagged, not fixed (adjacent, different page):** `AdminTherapistDetailPage.tsx`
has its own hand-rolled status calc (`therapist.isBooked ? "bookable" :
"available"`) that duplicates rather than reuses `calculateTherapistStatus`
— same root issue as finding #1 but on a different page. Worth aligning
next time that page is touched.

### 🆕 2026-07-06 — Therapist Manager redesigned as a card grid (28s268)

Founder: "ปรับให้สวยขึ้น" right after the 28s267 audit fixes shipped —
mockup shown via Artifact (2 rounds: first pass, then "ทำให้สวยขึ้น" again
for a more refined v2 — presence-ring avatars, serif names, phosphor line
icons, single status line) → "ok". Pure visual/IA pass, zero data-logic
changes (all of 28s267's live-status/audit/overrideUntil logic untouched).

- **Unified desktop DataGrid + mobile Stack-of-Cards into ONE responsive
  card grid** used at every viewport. Only 12 therapists exist — a dense
  spreadsheet added nothing a card couldn't show more legibly, and this
  deletes an entire duplicated render path (columns array + separate
  mobile JSX) that had to be hand-kept in sync.
- Avatar gets a status-colored ring + presence dot (MUI `Badge` dot
  variant) instead of a separate status chip floating next to the name.
- Collapsed 2-3 separate status/session pills into ONE status line under
  the name: "กำลังนวด · ถึง 22:30" / "พัก · เริ่ม 20:00" / "วันหยุดวันนี้"
  — reuses `calculateTherapistStatus`'s `nextAvailable` return (previously
  computed but discarded by this page).
- Names set in the admin serif (Hoefler Text, same as the "SunRed
  Control" wordmark) — cards read as staff profiles, not table rows.
- Resting/holiday cards recede (panel2 bg, muted figures, no hover lift)
  — same "attention follows what's actionable" rule already established
  on the Bookings cards (28s253).
- Nested-frame treatment reuses AdminBookingListPage's exact
  `CARD_FRAME_BG` (#C5D8DF, 18%-toward-dim blend) instead of inventing a
  new hue — Ocean Study palette rule (28s237) still holding.
- Icons switched from MUI icons/emoji to **phosphor-react** (Eye,
  PencilSimple, Trash, Umbrella, Warning, Check, Clock, MagnifyingGlass) —
  matches every other Ocean-Study admin page (Users, Bookings, Earnings).
- Search is now an icon-adorned field; status filter dropdown became a
  segmented `ToggleButtonGroup` (easier to tap on a phone than a Select).
- Roster summary strip restyled into icon-circle stat pills, matching
  the Dashboard/Earnings widget vocabulary established in 28s241/28s246.

### 🆕 2026-07-06 — resting/holiday therapists sort to the bottom (28s269)

Founder: "เอาคนหยุดไว้ด้านล่าง" — one-line follow-up right after the
28s268 card-grid redesign shipped. Added `STATUS_SORT_ORDER`
(available=0, bookable=1, resting=2, holiday=3) and a stable `.sort()`
on the `filtered` list in `AdminTherapistsPage.tsx`, so inactive people
now sink below anyone actionable — the same "attention follows what's
actionable" rule the cards already express visually (recede + no hover
lift) is now also reflected in ordering. Each status group keeps its
original roster order among itself (stable sort).

### 🆕 2026-07-06 — "เพิ่มพนักงาน" button on Therapist Manager (28s270)

Founder: "ปุ่มเพิ่มพนักงาน". The `/admin/add-therapist` route
(`AddTherapistPage.tsx`) already existed but had no entry point from the
roster page — reachable only by typing the URL directly. Added an
accent-filled button in `AdminTherapistsPage.tsx`'s toolbar row, next to
the status filter, using the `UserPlus` phosphor icon.

### 🆕 2026-07-06 — merged the two duplicate therapist edit pages (28s271)

Founder sent screenshots of `/admin/therapists/:id` (Therapist Detail)
and `/admin/edit-therapist/:id` (Edit Therapist) reached from the SAME
roster card's View/Edit buttons: "เหมือนซ้ำ แก้ และปรับให้สวยขึ้นและเพิ่ม
มีฟังชั้นที่ต้องมี" (looks duplicated, fix it, prettier, add missing
functions).

**Root cause:** two separate pages editing an overlapping-but-different
field subset, both still on the pre-Ocean-Study theme. Detail page had
rating/reviews/hours/location/badge/hidden/blocked/override but NOT
name/customId/image/specialty/telegramChatId; Edit page had the reverse.
Neither had a Holiday toggle.

**Fix — merged into ONE page**, `AdminTherapistDetailPage.tsx`.
`EditTherapistPage.tsx` **deleted** (+ its route/lazy-import in
`App.tsx`); roster's Edit button now opens `/admin/therapists/:id?edit=1`
(same page, pre-armed into edit mode) instead of a second page.

**Bugs fixed along the way (the "missing functions" ask):**
- **Status Override rendered BLANK** when set to Auto — the exact
  missing-`displayEmpty` bug already fixed once this session (28s261's
  Payment Method dropdown), just recurring on a different page/field.
  Fixed + standardized on the literal `"Auto"` string everywhere (the
  two old pages disagreed: one used `""`, one used `null`, the roster
  grid used `"Auto"` — three different sentinels for the same concept).
- **Holiday toggle was missing from BOTH old pages** — the only way to
  send someone on holiday was the roster grid. Tracked in this file's
  Phase-4 TODO since round 28s234 as "EditTherapistPage vs grid
  inconsistency (no Holiday toggle on EditTherapistPage)" — now fixed.
- **This page's own status calc was a hand-rolled duplicate**
  (`therapist.isBooked ? "bookable" : "available"`) ignoring real
  bookings — explicitly flagged as a follow-up in round 28s267's commit.
  Now uses the shared `calculateTherapistStatus` + live-bookings merge,
  same engine the roster card and public site use.
- **`overrideUntil` auto-expiry (28s267's rule) now applies here too** —
  this page could previously set a sticky-forever override outside the
  roster grid, silently reintroducing the bug the grid had just fixed.
- **Zero audit trail on saves** — now logs `therapist.update` with the
  actual list of changed fields (diffed against the loaded snapshot).
  `AdminAuditLogPage.tsx`'s `detailLine()` extended to render a
  `changedFields` array.
- `isOverrideExpired` extracted from `AdminTherapistsPage.tsx` into
  `calculateTherapistStatus.ts` (the engine file itself) so every
  surface shares one definition of "expired," instead of each page
  defining its own copy.

**Visual:** restyled onto Ocean Study to match the 28s268 roster card
redesign — serif name, presence-ring avatar, phosphor icons, grouped
edit sections (Profile / Schedule & Status / Reputation / Visibility /
Contact), read-only summary rows when not editing.

**Admin therapist surfaces are now down to 2 pages** (roster list +
this merged detail/edit page), both fully on Ocean Study, both sharing
the same status engine and audit-log conventions.

### 🆕 2026-07-06 — fixed blank edit form on ?edit=1 entry (28s272)

Founder opened a therapist via the roster's pencil icon (which the
28s271 merge points at `/admin/therapists/:id?edit=1`) — form loaded
completely empty (blank name, no avatar, all fields blank) even though
the doc clearly existed (status/stats computed fine from the same doc).

**Root cause:** the therapist `onSnapshot` callback checks `editing` to
avoid clobbering in-progress edits on a live update — but that closure
is created once inside an `[id]`-only effect, so it captured whatever
`editing` was AT MOUNT. Landing via `?edit=1` means `editing` was
already `true` on the very first render, so the very FIRST real
snapshot got treated as "don't stomp an edit in progress" and the form
never populated at all — a self-inflicted regression from writing the
"protect the user's typing" guard without considering the case where
edit mode is already on before any data has loaded.

Fixed with an `editingRef` that always reads the live value (not the
stale closure) + a `hasLoadedRef` that guarantees the first successful
snapshot always populates the form regardless of edit mode. Also reset
both refs — and `editing` itself — at the top of the `[id]` effect, so
navigating between two different therapists' detail pages without a
full remount can't inherit a leftover `true` from the previous one and
hit the same block.

**Confirmed by founder: the "pencil → same merged detail page,
pre-armed into edit mode, no separate page" design from 28s271 is the
correct intended behavior** — this round only fixed the data-loading
bug, no architecture change needed.

### 🆕 2026-07-06 — disabled Chrome auto-translate mangling admin (28s273)

Founder screenshot: her own admin console rendering garbled — "Seed
Reviews" → "รีวิวเมล็ดพันธุ์" (literally "seed" as in plant seed),
"SunRed Control" transliterated into Thai script, "ไม่ได้หยุด" ("not on
holiday") round-tripped through English back into nonsense
"กิจกรรมหยุด". Asked to make the page "ใช้งานได้จริง" (actually usable).

**Root cause:** `<html lang="en">` in `index.html` is deliberate — kept
for the customer site's English-first SEO (2026-06-02 Search Console
round: top queries are all English). But `/admin/*` is heavily Thai by
now (many rounds of founder-requested Thai copy). That English-declared/
Thai-actual mismatch is exactly what triggers Chrome's "this page might
be in a different language" translate prompt/auto-apply — which then
translates already-Thai text AGAIN, producing garbage.

**Fix:** added `<meta name="google" content="notranslate">` to
`index.html`. This does **not** affect SEO/crawling (Google documents
this explicitly) — it only tells the Translate feature to leave the
page alone. Did NOT touch `lang="en"` itself (SEO-load-bearing, out of
scope). Customers were never relying on browser-translate anyway — the
site has its own real i18n system (5 languages, `src/locales/`).
Confirmed the tag reaches the base `index.html` AND all 55 prerendered
route shells (the prerender script clones the head, so it inherited
automatically — no per-shell edit needed).

### 🆕 2026-07-06 — translated remaining English labels on Therapist Detail (28s274)

Founder screenshot pointed at "Custom ID", "Rating", "Reviews" — these
plus every other field label on `AdminTherapistDetailPage.tsx` (view
AND edit mode) were still English while the rest of the page (status
text, section headers, values) was already Thai — a loose end from the
28s271 merge. Translated all of them (Rating→คะแนน, Reviews→รีวิว,
Hours→เวลาทำงาน, Location→ตำแหน่ง, Badge→ป้าย, Custom ID→รหัสกำหนดเอง,
Hidden→การมองเห็น, Blocked→บล็อก, Holiday→วันหยุด, Name→ชื่อ, etc.).
Status Override's dropdown DISPLAY text now reuses the exact Thai words
the roster page already shows for the same 4 states (ว่าง/จองได้/พัก/
อัตโนมัติ) — only the visible `MenuItem` label changed, the underlying
stored `value` is untouched, so nothing downstream is affected. Kept
"Telegram" as the brand name (same convention as LINE/WeChat elsewhere)
and left generic action verbs (Back/Save/Cancel) in English, matching
the sibling roster page.

**Also flagged but not fixed (separate issue, different file):**
`AdminLayout.tsx` renders the CUSTOMER-facing `BottomNavGlass`
(Practitioners/Services/History/Profile) on mobile admin — same
component reused from the customer site with no admin-aware variant, so
an admin's phone bottom nav shows customer browse tabs that make no
sense in an admin context. Not touched this round; worth its own pass.

### 🆕 2026-07-06 — Rating/Reviews/Custom ID wired to real data (28s275)

Founder: "ไม่ได้ให้แปล เปลี่ยนกลับ" — reverted the 28s274 label
translations (that wasn't the ask). Then: "ให้เอา Custom ID / Rating /
Reviews ดึงข้อมูลจากฐานข้อมูลจริงมาใส่" (make these pull real data).

Investigated why a real, active therapist (Yuri) showed Rating: 0,
Reviews: 0, Custom ID: — on the admin detail page:

- **Rating/Reviews were dead fields.** Repo-wide grep confirmed NOTHING
  writes real values to `therapists/{id}.rating`/`.reviews` — not the
  static seed data (`data/therapists.ts` zeros both for all 12
  therapists on purpose), not any Cloud Function, not any other admin
  page. The rating/count customers actually see is always **live-
  computed from `bookings/{id}.rating`** via `useTherapistReviews` (the
  same hook the public `TherapistDetailPage.tsx` uses) — this admin page
  was reading, and letting admins "edit," a field nobody else ever
  reads. Fixed: wired `useTherapistReviews(docId)` into the page's
  always-visible stats row (now Rating · Reviews · Today · Total · Last
  booking, all live); removed the fake editable inputs and stopped
  writing `rating`/`reviews` to the doc at all.
- **Custom ID had no reader anywhere in the codebase**, confirmed by
  grep. The real public slug IS the Firestore document id itself
  (therapist docs are created with pretty ids like "YuriSunRed" already
  — this page's own lookup logic even tries the doc id directly first).
  Replaced the fake editable "Custom ID (for URL)" field with a
  read-only "รหัส (URL)" row showing the actual resolved doc id.
- Removed the now-empty "ชื่อเสียง" section (existed only to hold
  Rating/Reviews); Badge moved into the Profile section.

**Lesson reinforced — same class of bug as the roster page's dead
Today/Total columns (28s267):** a field that's editable in the admin UI
but has no reader anywhere else reads as "real" to whoever's looking at
it, but changing it does nothing. When auditing "is this real," grep
for OTHER readers of the field before trusting that an editable form
field represents live truth.

### 🆕 2026-07-06 — reviews counted by reviewText, not the rating field (28s276)

Founder shared real Firestore console screenshots: a completed XingXing
booking with a genuine customer `reviewText` but **no `rating` field at
all** — confirming her hypothesis "Rating อาจจะต้องดูจากดาวใน
reviewText, Reviews ดึงจาก reviewText".

**Root cause:** round 28s275 wired this page to the shared
`useTherapistReviews` hook, whose query is `where("rating", ">=", 1)` —
silently excluding any booking with a written review but no separate
numeric rating field, exactly like the one in the screenshot. That
filter exists in the shared hook **only** because it's also used by the
public `TherapistDetailPage.tsx`, where anonymous visitors need it to
satisfy `firestore.rules` (28s6: un-rated bookings still carry PII and
must stay private from public listeners — the rating field is used as
a proxy for "deliberately exposed for public display").

**Fix:** this admin page already has its own `isAdmin()`-privileged
bookings listener (used for today/total/last-booking) — extended it to
also compute `reviewCount`/`avgRating` in the same pass, counting any
booking with non-empty `reviewText` and defaulting a missing `rating`
to 5. This exactly matches the existing convention in
`ReviewListPage.tsx` (`rating: typeof r.rating === "number" ? r.rating
: 5`), just applied admin-side where `isAdmin()` already grants full
list access regardless of whether `rating` exists. Removed the
`useTherapistReviews` hook from this page entirely.

**Deliberately not touched:** the shared hook and `firestore.rules`
themselves — the public site's `rating>=1` requirement is a deliberate
privacy boundary from 28s6, not a bug. If the founder wants the PUBLIC
site to also count text-only reviews, that's a separate, bigger
decision involving a real PII-exposure tradeoff on anonymous listeners,
worth its own conversation rather than a silent side-effect here.

### 🆕 2026-07-06 — surfaced real rich therapist fields on detail page (28s277)

Founder screenshot of `therapists/BarbieSunRed` in the Firestore console
showed the docs carry far more real data than the admin detail page was
rendering: `area`, `homeAddress`, `credentials[]`, `features` (age,
gender, ethnicity, height, weight, bodyType, skintone, bustSize,
hairColor, hairLength, eyeColor, tattoos, personality, vaccinated,
smoker), `gallery[]`, `languageSkills[]`, `bios{}`, `rebookRate`,
`totalSessions`, `servicesAvailable[]`. "ดึงดีเทลจริงของพนักงานจาก
therapists" — pull the real details in.

Added read-only sections to the view mode (`AdminTherapistDetailPage.tsx`)
rendering each straight off the live `rawDoc`, all **conditionally** (a
section/row appears only when that field actually exists — lean legacy
records show no empty scaffolding): rebook rate + cumulative sessions;
พื้นที่/ที่อยู่ standby; ลักษณะเฉพาะตัว (the `features` object as a
Thai-labelled 3-col grid via a `FEATURE_ROWS` map); ภาษา (structured
`languageSkills` → Thai name + level, falling back to the legacy
`features.language` string); บริการที่ทำได้ (servicesAvailable slugs);
ใบรับรอง/ประวัติ (credentials); ประวัติแนะนำ (bios.th → en); แกลเลอรี
(gallery thumbnails).

**Display-only** — `handleSave`'s patch still writes only the existing
editable subset (name/image/specialty/hours/badge/status/holiday/
location/hidden/blocked/telegram), so these richer nested fields are
never overwritten by a save. If the founder later wants any of them
editable, that's a separate ask (nested-array editors are a much bigger
form). The `Features`/`Credential`/`LanguageSkill` types already existed
in `types/therapist.ts` (round 28z/28s220) — this just renders them.

### 🆕 2026-07-07 — all rich therapist fields editable + card polish (28s278)

Founder: "ปรับให้สวยขึ้น และ หน้าแก้ไขก็ ข้อมูลเชื่อมกัน แก้ไขได้จริง" —
prettier, and the edit page's rich data should be connected + actually
editable. 28s277 surfaced the rich fields read-only; this round makes
them fully editable with two-way binding on `AdminTherapistDetailPage.tsx`.

Now editable (were view-only): `area`, `homeAddress`, the whole
`features` object (15-field grid), `languageSkills` (add/remove rows with
language + level selects), `servicesAvailable` (multi-select of the 4
canonical services), `credentials` (add/remove: type + label + meta),
`gallery` (add/remove URL rows w/ live thumbnail), `bios` per language
(th/en/zh/ja/ko).

Key data-integrity decisions:
- **Nested objects merged, not replaced.** `handleSave` rebuilds
  `features`/`bios` by overlaying edited keys onto the ORIGINAL doc's
  object, so unknown/unedited keys (e.g. `features.employmentType`, or a
  bios lang not in the editor) are preserved rather than wiped. Blank
  feature values / empty gallery URLs / label-less credentials are
  dropped on save.
- **servicesAvailable canonicalizes to SKU ids** (`resolveServiceId` on
  load, SKU written on save). Verified safe: `StepService` matches
  offered ids exactly against `services.ts` SKU ids, every other reader
  uses `resolveServiceId` — so storing the SKU (which IS `s.id`) only
  ever helps a doc that had legacy slugs, never breaks one.
- `changedFields` diff switched to `JSON.stringify` compare so
  array/object edits register in the audit log.
- No `firestore.rules` change — admin already has full therapist update
  access; the patch only writes these known fields.

Visual polish: new `SectionCard` wrapper — every section in both view
and edit mode is its own soft panel (grouped cards, not a flat stack).

**⚠️ Vercel free-tier upload limit hit this session.** After ~a dozen
`vercel --prod` deploys in one day, got `Too many requests ... more than
5000, code: "api-upload-free"`. Fix: **`vercel --prod --yes
--archive=tgz`** uploads one tarball instead of thousands of individual
files, sidestepping the file-count limit. Use `--archive=tgz` as the
default deploy flag going forward on heavy-iteration days.

### 🆕 2026-07-07 — Vercel upload trim: dead files + ignore content (28s279)

Founder: "Vercel ฟรีจำกัดจำนวนไฟล์อัปโหลด ลบไฟล์เก่าที่ไม่ได้ใช้ได้ไหม" —
follow-up to the 28s278 `api-upload-free` limit. That limit counts
uploaded FILES, so fewer files = slower to hit it.

**Deleted from the repo** (verified 0 references repo-wide first):
- `public/badges/` — 24 files, ~4.4MB (GIFs/PNGs/SVGs). The
  `badgeConfig.ts` that used them was removed in 28s223; grep across src,
  index.html, manifest, and configs confirms nothing points at `/badges/`
  anymore. Was uploading on every deploy for nothing.
- `lint-after-fix.txt` (stray `npm run lint` output),
  `README สำเนา.md` (dup of the default Vite README).

**`.vercelignore` expanded** to stop UPLOADING (not delete) non-build
content — Vite only needs index.html + src/ + public/ + config +
scripts/prerender-routes.mjs. Now excluded: `docs/`, `Brand/`,
`SEO_Blog_Pack/`, `Expansion/`, `.github/`, `.claude/`, and all `*.md`
(CLAUDE.md, ROADMAP, HANDOFF, DEPLOYMENT_STATUS, marketing decks).
Verified no markdown is imported by src, so the `*.md` glob is safe.
These stay in git — they just no longer ride every prod deploy.

**Did NOT delete images** — therapist/service photos are referenced
dynamically from Firestore (`image`/`gallery` fields) + static
`data/therapists.ts`, so "looks unused" is unsafe without a full
Firestore audit. **Open perf item (not done):** several therapist JPGs
are huge/unoptimized — `public/images/jinny/IMG_7120.JPG` is 9.5MB,
`public/images/jinny/` is 23MB total. Resizing them in place (not
deleting) is a real LCP/bandwidth win worth a dedicated round; needs
care since the paths are referenced.

Tracked files 495 → 468. Deploy cmd going forward: **`vercel --prod
--yes --archive=tgz`** (28s278) — one tarball upload, so file count no
longer gates deploys regardless.

### 🆕 2026-07-07 — map-search location picker + phone photo upload (28s280)

Founder, on the therapist edit page: "พื้นที่ / ที่อยู่ standby — ช่องค้นหา
ดึงเมปจริง จากเมฟเดียวกับการจอง" + "แกลเลอรี — อัปโหลดเพิ่ม/ลบรูปได้ จาก
มือถือ".

**1) Location picker (LIVE).** New `LocationPicker` component in
`AdminTherapistDetailPage.tsx`'s area/address edit section, reusing the
SAME Google Maps + Places setup the customer booking flow
(`SelectLocationPage`) uses — via the app-wide `GoogleMapsProvider`
(mounted in main.tsx, so admin pages can call `useGoogleMaps()` directly).
Search a place OR tap the map → auto-fills พื้นที่ (place name), ที่อยู่
standby (formatted_address), พิกัด (lat/lng). Text fields stay editable
for manual tweaks. Removed the duplicate "Location (lat,lng)" from the
Schedule card. Uses the existing `VITE_GOOGLE_MAPS_API_KEY` (already in
Vercel — booking uses it).

**2) Gallery photo upload (CODE-READY, blocked on 1 console step).**
"อัปโหลดรูปจากมือถือ" button → native `<input type=file accept=image/*
multiple>` (a phone offers camera OR library) → uploads each to Firebase
Storage `therapists/{docId}/gallery/{ts}-{name}` → pushes download URLs
into the gallery. **firebase/storage is DYNAMICALLY imported** so it never
enters the customer bundle (verified: its own lazy chunk, not index-*.js
— the exact reason its export was dropped in 28s105). Manual "add image
URL" rows kept as fallback. New infra committed: `storage.rules`
(admin-only writes via `firestore.exists(/admins/{uid})`, public read,
10MB image cap) + `firebase.json` storage block.

**✅ RESOLVED 2026-07-07 — Firebase Storage enabled + rules deployed.**
View clicked "Get Started" in the console (bucket
`gs://soulease-spa.firebasestorage.app` is live — she picked the free "No
cost location" / US region; region doesn't affect our code since
getStorage resolves the default bucket by name, and images serve via
CDN). Claude then ran `firebase deploy --only storage` — compiled clean,
released. **The phone photo-upload feature is now fully live end to end.**
Deploy storage rule changes going forward with `firebase deploy --only
storage` (same pattern as firestore rules). App Check is NOT enforced
(optional; our rules don't require it), so uploads work without an App
Check token.

### 🆕 2026-07-07 — gallery upload fix: auth-only rule + downscale (28s281)

First real upload after Storage went live failed with "อัปโหลดไม่ได้ —
สิทธิ์ไม่พอ" (`storage/unauthorized`). Cause: 28s280's storage rule gated
writes on `firestore.exists(/databases/(default)/documents/admins/{uid})`
— a **Storage→Firestore cross-service read that did not resolve**,
denying every admin upload even though the admin was authenticated.

- **storage.rules**: dropped the cross-service admin check. Writes to
  `therapists/{id}/gallery/**` now require only an authenticated user (+
  `image/*` + `<15MB`). This is an acceptable posture: a file only shows
  on a public profile once its URL is written into a therapist's `gallery`
  array, and firestore.rules already restricts that doc write to admins —
  so a stray upload is at worst an orphan file (shown nowhere), size-
  capped, from one of the app's very few account holders. **Lesson:
  `firestore.exists()` inside Storage rules is unreliable here — don't
  gate Storage writes on a Firestore admin-doc lookup; use auth + a
  Firestore-side gate on whatever makes the file public, or a custom
  claim.** Redeploy storage rule changes with `firebase deploy --only
  storage`.
- **Client downscale**: each image is resized in-browser before upload
  (`downscaleImage`: canvas → max 1600px long edge → JPEG 0.85, typically
  <500KB), falling back to the raw file if the canvas path fails. Kills
  two birds — raw phone photos (5-12MB, some 48MP over the cap) no longer
  get size-rejected, and stored gallery images are web-optimized instead
  of multi-MB originals (also the right pattern for the "huge unoptimized
  jinny/*.JPG" concern flagged in 28s279).

Gallery photo upload from mobile is now working end to end.

### 🆕 2026-07-07 — Add New Therapist rebuilt + shared form kit (28s282)

Founder: "Therapist Manager หน้า Add New Therapist (ULTRA) ปรับแก้ให้ตาม
ดีเทลทั้งหมด และดีไซน์สวย". ("ULTRA" here = "make it really polished", NOT
the ultracode multi-agent opt-in — no system-reminder for that.) The old
`AddTherapistPage` was on the pre-Ocean-Study theme with comma-separated
text inputs for gallery/services and only a partial feature set.

**New `src/pages/admin/therapistFormKit.tsx`** — the shared form building
blocks extracted once: `SectionCard`/`SectionHeader`, `LocationPicker`
(map + Places search, same as booking), `downscaleImage`, all the
constants (FEATURE_ROWS / LANG_* / CRED_TYPES / BIO_LANGS /
SERVICE_OPTIONS / fieldSx / selectMenuProps), and prop-driven editor
components: `FeaturesEditor`, `LanguagesEditor`, `ServicesEditor`,
`CredentialsEditor`, `BiosEditor`, `GalleryEditor` (owns its own phone-
upload state), `TogglePill`. So the Add + Edit screens share ONE source
and can't drift — the same lesson as the 28s271 dedup.

**AddTherapistPage rebuilt on the kit**: identical Ocean Study card design
+ the full field set (ID/name/image/specialty/badge · hours/status/holiday
· map-search area/address · 15-field features grid · languages · services
multi-select · credentials · per-language bios · gallery w/ mobile upload ·
visibility toggles · email + Telegram). Creates `therapists/{id}` with a
duplicate-id guard, honest defaults (rating/reviews 0 — live-computed from
bookings), new `therapist.create` audit action, routes to the new
therapist's detail page on success.

**🔔 FOLLOW-UP (tracked, spawned task):** migrate
`AdminTherapistDetailPage`'s edit mode onto the kit too — it still has its
own byte-identical inline copies of LocationPicker/downscaleImage/
SectionCard/constants/editors. Deferred this round on purpose: the detail
page was just stabilized (28s281 upload fix) and the copies are identical
today (no drift yet), so refactoring a live tool in the same breath as a
new page is needless risk. Do it as its own pass, tsc+build+deploy-verify.

### 🆕 2026-07-07 — Add Therapist Badge label overlap fix (28s283)

Founder screenshot: the Badge `<TextField select>` on the Add page
rendered the floating "Badge" label on top of the "None" text. Cause: the
field starts `value=""` and `displayEmpty` renders the "None" MenuItem,
but MUI doesn't shrink the label while the value is empty → label + value
collide. Fixed with `InputLabelProps={{ shrink: true }}` (label stays
pinned above). Only touched `AddTherapistPage.tsx`; the detail page has
the same badge pattern but was mid-refactor onto `therapistFormKit` in a
separate session, so left alone — the kit migration should carry the same
`shrink` fix (and any other `displayEmpty` select there).

### 🆕 2026-07-07 — tap-photo profile upload + Badge fix + kit migration lands (28s284)

Founder: "เอา Image URL ออกทั้งคู่ ให้เปลี่ยนโปรไฟล์ตรงรูปได้เลย" and fix the
Edit-page Badge overlap (28s283 fixed it only on Add).

- New shared **`AvatarUploader`** in `therapistFormKit`: the profile photo
  IS the control — tap → pick from phone → downscale (max 800px) → upload
  to `therapists/{id}/profile/**` → `onChange` gets the URL. The **"Image
  URL" text field is removed from BOTH Add and Edit pages.** Add page:
  uploader at the top of the identity card. Edit page: the header avatar
  itself becomes the uploader while editing (display-only otherwise).
- `storage.rules` broadened `therapists/{id}/gallery/**` →
  `therapists/{id}/{allPaths=**}` so `profile/**` is covered too;
  redeployed via `firebase deploy --only storage`.
- Edit-page Badge select got `InputLabelProps={{ shrink: true }}` (the
  same overlap the Add page fixed in 28s283).

**Also: the therapistFormKit migration of `AdminTherapistDetailPage` (the
spawned 28s282 follow-up task) landed in this commit** — the edit page now
consumes the kit's SectionCard/LocationPicker/editors instead of its own
inline copies, so Add + Edit share ONE source. The task's WIP had already
been applied to the working tree; folding it in here (tsc + build clean)
completes the dedup. **Therapist Add + Edit are now fully unified on the
kit — future field/design changes touch `therapistFormKit.tsx` once.**

### 🆕 2026-07-07 — Customer Insights CRM audit + fix + polish (28s285)

Founder: "ปรับ แก้ Customer Insights". Audited the CRM panel on
`AdminUsersPage` and fixed 4 real correctness bugs + polished it:

- **Phone normalization** (biggest fix): the same guest booking as
  "+66812345678" (customer flow / E.164) vs "0812345678" (admin-add)
  split into two rows on a phone-keyed CRM. New `normPhone` strips
  formatting + maps Thai +66 → local 0-prefix so they merge; foreign
  numbers kept distinct as raw digits.
- **VIP by served visits, not all orders**: old code did
  `totalBookings += 1` for EVERY booking incl. cancelled, contradicting
  its own "5+ completed" comment. Now VIP = 5+ delivered (status
  completed/done).
- **Last visit** = the booking's service date (startAt/date), not
  `createdAt` (when booked).
- **Total spent** = sum of served bookings only (realized revenue), not
  pending/confirmed orders never delivered.

Columns split **Visits** (served, VIP basis) from **Orders** (all). Added
guest/phone search, tap-to-call links, icon-circle stat pills (Unique /
Repeat 2+ / VIP / With no-shows / Realized revenue) matching Dashboard/
Earnings, `adminFigureSx` numbers.

**Definitions chosen (change if founder wants):** VIP = 5+ delivered
visits · revenue = totalPrice summed over completed/done only.
**Known cost note:** the panel still does one unbounded
`getDocs(bookings)` per page load (inherent to lifetime per-guest
aggregation) — fine at current volume, revisit if the collection grows
large.

### 🆕 2026-07-07 — Customer Insights guest profile drawer (28s286)

Founder asked "Customer Insights ทำไรได้อีกบ้าง"; offered 5 next-step
options (profile drill-down / win-back list / notes+tags / quick-contact
+ CSV / RFM segmentation) — she picked **guest profile drill-down**.

Tap any guest row on `AdminUsersPage` → a profile drawer: stat pills
(visits · orders · total spent · avg/visit · no-shows · days-since-last),
**หมอนวดที่ชอบ / บริการที่ชอบ** (most-frequent therapist + service over
their delivered bookings via a `modeOf` helper), and the full booking
history (newest first: service · therapist, date, ฿amount, status chip
coloured by outcome). Each guest carries a `bookings: BookingLite[]` built
in the same single aggregation pass — no extra reads, drawer is instant.

**Still on the menu (not built):** win-back/lapsed list, per-guest
notes+tags, quick-contact deep links (WhatsApp/LINE/Telegram) + CSV
export, RFM segmentation — offer these again if she wants more CRM depth.

### 🆕 2026-07-07 — guest country from phone dial code (28s287)

Founder: "เพิ่มประเทศด้วย ว่าหมายเลขนี้ประเทศอะไร". New
`src/utils/phoneCountry.ts` (`countryFromPhone`, `PHONE_COUNTRIES`)
resolves a stored phone → country from its dial-code prefix (same country
set the booking flow's SelectLocationPage uses). Handles E.164 (+66…),
00-prefix, and local Thai (leading 0, no code → Thailand). Detected from
the ORIGINAL raw phone at aggregation (the normalized CRM key drops the
+66 for Thai). Added a **Country** column (flag + ISO) to the insights
grid and flag + full name to the guest profile drawer. Tourist-heavy
business → spotting a CN/KR/JP caller helps language/therapist matching.
`phoneCountry.ts` duplicates SelectLocationPage's inline DIAL_CODES — a
future cleanup could point that page at the shared util too.

**28s287b/c — country filter.** First a chip row (breakdown + filter),
then per founder "ทำเป็นดรอปดาว ดีกว่า" switched to a compact "ประเทศ"
dropdown beside the search box — each option shows flag + name + guest
count (🌏 ทั้งหมด / per-country sorted most-first / ❔ ไม่ทราบ). Composes
with the name/phone search.

### 🆕 2026-07-07 — guest history rows open the real booking (28s288)

Founder: "ให้ประวัติการจอง ดูได้จริง". The profile drawer's booking-history
rows were display-only. Now each is tap-to-expand: on click it fetches
that booking's full doc **by id** (`getDoc` — works even for old bookings
outside the Bookings-list feed window, which a navigate-to-list approach
couldn't) and shows the real details inline via `bookingDetailPairs`:
date/time · phone · location · service·duration · therapist · payment+paid
· service/taxi/discount/total · note · review+stars · booking id. Caret
rotates, spinner while loading, "ไม่พบข้อมูล" if deleted. Only present
fields render.

### 🆕 2026-07-07 — guest profile drawer polish (28s289)

Founder: "ปรับแก้ และ สวยงาม". The 28s288 history rows rendered cramped/
clipped (service+therapist+date+amount+status+caret all inline on one
squeezed row, worse at browser zoom), and the stat pills wrapped unevenly
(the "Since last" pill ballooned to a full-width bar).

- Stat pills: flex-wrap → even CSS grid (3-col desktop / 2 mobile), no
  pill balloons; reordered Visits/Orders/Since-last on the top row.
- Favorites: same grid, ellipsis on long names.
- History rows: service = title on its own line, therapist+date on a
  subline, amount+status stacked right-aligned in their own column, row
  min-height + vertical centering — no clipping/crowding at any zoom.

### 🆕 2026-07-07 — Promotions: add-ons, service details, reorder, margin (28s302)

Founder asked "ปกติหน้าตั้งราคา & บริการ มีอะไรบ้าง" → offered the 4 typical
gaps, she picked "ทั้งหมด และหน้านี้เชื่อมไปทุกที่ที่เกี่ยวข้อง" (all, wired
everywhere relevant). Built all four:

1. **Add-ons** — were hardcoded in `bookingExtras.ts` AND had no customer
   picker at all (`form.selectedAddons` existed + the total was wired, but
   nothing ever set it — a dead feature; the page even commented
   "add-ons unused"). Now live-editable (price/name/icon/enable + create/
   delete custom) via `applyLiveAddonConfig` + `getEffectiveAddons`, same
   override pattern. **Built the missing customer picker** in
   BookingFlowPage (opt-in rows → the already-wired total). Empty config =
   the 3 hardcoded add-ons. Add-ons are opt-in, so surfacing them changes
   no existing booking's price.
2. **Service image + detail + benefits** — `LiveServiceOverride` gains
   `image/detail/benefit`; `withLiveServiceOverrides` merges them.
   `ServiceDetailPage` switched from the raw `services` array to
   `getServiceById` (so it shows live photo/copy/benefits AND resolves
   custom services — it silently didn't before). Admin edits via a
   per-service details dialog (image upload, detail textarea, benefits
   one-per-line).
3. **Menu reorder** — `serviceOrder` (id array); StepService's `orderIdx`
   uses it with the hardcoded EDITORIAL_ORDER as fallback for unlisted
   ids. Admin reorders with up/down arrows on a unified ordered list
   (standard + custom merged).
4. **Margin view** — read-only line per service (therapist 60% / shop 40%
   from `commission.therapistPctFor`, on the 60-min price) so she can see
   which service is most profitable.

All ride the existing public `publicRules` doc (no firestore.rules change)
and the SAME MaintenanceGate listener. `serviceOrder`/`addonOverrides`/
`customAddons` are new fields on it. Verified: tsc/build clean + isolated
logic checks (add-on override/hide/custom-merge; order live-vs-fallback)
+ default-empty = unchanged + homepage 200 regression + curled the live
main bundle (`addonOverrides`, `serviceOrder`), the Promotions chunk
(add-ons section + margin line), and the BookingFlow chunk (the new
`section.addons` picker).

### 🆕 2026-07-07 — Promotions: add brand-new custom services (28s301)

Founder: "ราคา & บริการ เพิ่ม เมนูได้" — the add-new-service piece 28s300
explicitly flagged as a separate, bigger change. Built it.

Custom services live in `publicRules.customServices` (array) and merge
into an **effective catalog** at every surface that matters:
- `servicePricing.applyLiveServiceConfig` now takes
  `{overrides, customServices}` in ONE call (unified so there's no
  cross-call ordering fragility on the shared override map — the two used
  to be tempting as separate functions). `getLiveCustomServices()` returns
  ENABLED customs in MassageService shape. Disabled or zero-price customs
  are excluded from the catalog list but still registered in the override
  map so `isServiceEnabled`/`priceForDuration` resolve them (submit guard
  can still block a disabled one).
- `serviceCatalog`: `getAllServices()` + `resolveServiceId`/`getServiceById`
  search hardcoded + custom.
- `StepService` appends customs shop-wide (AFTER therapist-offered
  filtering, since a custom isn't in any therapist's `servicesAvailable`);
  `orderIdx` returns 999 for unknown ids so they sort last, no crash.
  `BookingFlowPage` resolves the selected service via `getServiceById` so
  customs are bookable + correctly priced.
- `storage.rules`: new `services/{allPaths}` path (public read, auth
  image-write, same posture as therapist images), deployed.
- `AdminPromotionsPage`: inline-editable custom-service rows (dashed
  border + NEW chip, delete) + an "add" dialog (name, desc, badge, image
  upload via the therapist-gallery downscale→Storage→URL pattern, 3
  prices). Custom-service id auto-generated `SR-C{base36 timestamp}`.

**No firestore.rules change** — `customServices` rides the existing public
`publicRules` doc (public read, admin write). **SEO note:** a custom
service has no prerendered `/services/:id` shell, but booking never needs
it (StepService → duration sheet → confirm), so customs are fully
bookable regardless.

Verified with an isolated logic check (default-empty = catalog unchanged;
enabled custom appears + bookable with Firestore string-keyed prices;
disabled custom excluded from catalog but `isServiceEnabled=false`;
zero-price custom excluded) + tsc/build clean + storage deploy + homepage
200 regression + curled the live bundle for `customServices` and the
Promotions chunk for the add-service UI.

### 🆕 2026-07-07 — Promotions: live price + service management (28s300)

Founder: "admin/promotions สามารถ จัดการราคา และ บริการ ได้" (make it able
to manage price + service). Service prices were hardcoded in
`src/data/services.ts`; made them admin-editable live from the
Promotions page.

**Why this was low-risk despite touching customer pricing** (the highest-
stakes change of the session): (1) every customer price display funnels
through `priceForDuration()` / `startingPrice()` — verified the `.price`
reads in HomeTherapistGrid/TherapistProfileCard are THERAPIST prices,
unrelated — so one injection point reaches every surface; (2) bookings
snapshot their price at booking time (serviceCatalog.ts's stated
principle), so an edit only affects NEW orders, never a historical one;
(3) with an empty override map every pricing fn is byte-identical to the
hardcoded catalog (the override is only consulted when a field is
explicitly present). Verified (3) + the override math + Firestore's
string-keyed prices object (accessed with a numeric key) via an isolated
node logic check: default→1200/1800/2400, string-key override→applies,
base-only override→multiplier off new base, other services unaffected.

**Reused the session's live-override pattern, no new infra:**
- `servicePricing.ts`: `LiveServiceOverride` cache + `applyLiveServiceConfig`,
  `isServiceEnabled`, `liveServiceName/Desc`, `withLiveServiceOverrides`.
  `priceForDuration` now checks live per-duration → static override →
  multiplier × (live-or-catalog base).
- `serviceCatalog.getServiceById` merges live name/desc/price so every
  label lookup reflects a rename.
- `MaintenanceGate` applies `serviceOverrides` from the SAME existing
  `publicRules` listener — no new listener, and `publicRules` is already
  public-read + admin-write so NO firestore.rules change either.
- `StepService` hides disabled services from the booking menu and carries
  live overrides into the card + duration sheet. `BookingFlowPage` submit
  rejects a disabled service (admin bypasses) — covers stale-form /
  direct-URL cases.
- `AdminPromotionsPage` gained a "ราคา & บริการ" editor: per-service name,
  enable toggle, and 60/90/120 prices, seeded ONCE via getDoc (not the
  live listener, so typing isn't clobbered by a snapshot). `service.update`
  audit action + "บริการ" category.

**Deliberately out of scope (flagged to founder):** adding a brand-NEW
service — needs a new SKU, image asset, and prerendered SEO route, a
bigger change than editing the existing four. Editing existing services'
prices/names/availability is the safe, contained part shipped here.

Verified live: tsc/build clean, isolated pricing logic check (above),
homepage 200 (customer pricing default-path regression), curled the live
main bundle for `serviceOverrides` and the Promotions chunk for the
"ราคา & บริการ" editor.

### 🆕 2026-07-07 — Promotions: caps, scheduling, min-spend, share/QR (28s299)

Founder asked "หน้า Promotions ควรมีอะไรบ้าง" — offered 4 additions via
AskUserQuestion (led with the one real safety gap), she picked all four.

**Usage caps (the money-safety gap I led with):** custom codes gained
`maxRedemptions` (total) + `perPhoneLimit`. These CAN'T live in
`validateDiscount` (pure/sync, no usage count), so they're enforced at
`BookingFlowPage` submit via a bounded count query on
`bookings.discountCode` (limit 1000 — a capped code has at most
`maxRedemptions` bookings anyway). `getCustomPromoLimits()` returns null
for built-ins / uncapped codes so the whole block no-ops in the common
case; admin bookings bypass; fails open. **Correctness fix found while
building:** a valid discount used to store the raw-cased `form.discountCode`
on the booking, but the cap query + usage stats match on the canonical
UPPERCASE code — a mixed-case entry would slip the cap and miss the
stats. Now stores `discount.code` (canonical) when valid, raw input only
when invalid (so admin still sees what was typed).

**Scheduling (`startsAt` + existing `expiresAt`):** a code auto-activates
and auto-expires on its own dates (start stamped 00:00, expiry 23:59:59
so the whole picked day counts). Checked in validateDiscount's custom
branch as a quiet invalid — same "don't leak that the code exists but
you don't qualify" stance as every other rejected path.

**Min spend (`minSpendThb`):** code invalid until the service+addons
subtotal (`discountableBase`, the same value passed to validateDiscount,
i.e. NOT including taxi) reaches it.

**Share link + QR:** a `?promo=CODE` link, captured on HomePage into
localStorage (mirrors the existing `?ref=` referral capture in
referral.ts) + read live in `getInitialDiscountCode`, pre-fills the
booking discount field. Share dialog per code shows a copyable link + a
QR. QR is an `<img>` from goqr.me's public API — the vercel.json CSP
already allows `img-src ... https:`, so zero bundle/library cost, and the
payload is only a public promo URL (no secrets). Verified the endpoint
returns `image/png` before relying on it.

`MaintenanceGate`'s existing `promoCodes` listener maps all the new
fields into discount.ts's cache — no new listener. No firestore.rules
change (the `promoCodes` rule from 28s298 already covers these fields).
Verified: tsc/build clean, homepage 200 (MaintenanceGate regression),
curled the live main bundle for the `sunred.discount.promo` localStorage
key and the Promotions chunk for `api.qrserver.com` + the new Thai form
labels.

### 🆕 2026-07-07 — new /admin/promotions: manage discount codes (28s298)

Founder: "เพิ่ม เมนู โปรโมชั่น" — a genuinely new feature request, not an
audit-and-fix. `src/utils/discount.ts` already had a real, working
discount-code engine (FIRST10, WELCOME20, TONIGHT500, SAMMY200, VIP100,
FREETAXI, referral `SUN-XXXX` pattern) but every rule was hardcoded with
zero admin UI — asked the founder what the new menu should actually be
able to do; she picked all three offered: view + toggle the existing
codes, create brand-new custom codes, and see real usage stats.

Also surfaced (important context that would've made the whole page
pointless if missed): `src/config/featureFlags.ts`'s `PROMOS_ENABLED`
has been hardcoded `false` site-wide since round 28s84 (founder's own
prior call — "ยังไม่ได้คิด โปร กัน เสี่ยง"). Without making THAT live too,
every other control on this new page would do nothing visible on the
real site, same trap as advanced-settings before 28s296.

**Architecture — reused this session's live-override pattern rather
than making `validateDiscount()` async:** one Firestore doc per code in
new `promoCodes/{CODE}` (builtin on/off override, or a full custom-code
definition), read by a new `onSnapshot` listener in `MaintenanceGate.tsx`
into a module-level cache in `discount.ts` — same shape as
`applyLiveFareConfig` from 28s297. `validateDiscount()` itself stays a
pure, synchronous function; the disable-check runs first (quiet invalid,
same as every existing rejected-code path), the custom-code fallback
runs last so a custom code can never shadow a hardcoded name. The
referral program (`SUN-XXXX` pattern, not one literal string) uses a
pseudo-key `"REFERRAL"` for its disable check, since it can't match
`disabledBuiltinCodes` by exact code string like the others.

`PROMOS_ENABLED` got the same `export let` + `applyLivePromosEnabled()`
treatment, set from the SAME `publicRules` doc MaintenanceGate already
listens on — one more field on an existing listener, no new one opened.

**AdminPromotionsPage.tsx**: master switch up top with a visible amber
warning when off ("ปิดอยู่ตอนนี้ ... ก็ยังไม่มีผลกับลูกค้าจริง",
non-negotiable — every other control below is moot without it); built-in
code list (descriptions kept in sync BY HAND with discount.ts's actual
branches, flagged in a comment since this page can't introspect that
logic as data) with a real per-code enable toggle; custom-code creator
(flat ฿ or %, optional cap + expiry date) with delete; usage stats
aggregated from real `bookings` docs (`discountCode`/`discountAmount`
fields already written by BookingFlowPage — capped at 1000 most-recent
discounted bookings, single-field `!=null` inequality, no composite
index needed). New sidebar entry in the Money & numbers group.

`firestore.rules`: `promoCodes/{code}` — public read (checkout has no
auth to gate on, matching `blockedPhones`/`publicRules`), admin-only
write. `promo.toggle`/`create`/`delete` added to `AuditAction` + labels
+ a new "โปรโมชั่น" category in the audit log filter.

Verified live: deployed rules first, then the app; homepage 200 +
correct title (regression check), curled the live main bundle for the
`promosEnabled` property name (function names themselves are minified —
checked the property access instead, which survives minification), and
the Promotions page chunk for its Thai section copy + a real code name
(`FIRST10`) confirming the built-in list rendered.

### 🆕 2026-07-07 — Telegram toggle + live pricing config, for real (28s297)

Direct follow-up to 28s296's audit — asked the founder which of the two
remaining "not yet connected" categories she actually wanted wired for
real. She said yes to both:

**Telegram ("เชื่อม Telegram ให้คุมได้จริงจากหน้านี้"):** the bot token
stays in Firebase Secret Manager — moving a real secret into an
admin-editable Firestore doc would be a security downgrade, not an
upgrade the founder asked for. What's now real is the enable/disable
toggle. `functions/src/index.ts` gained `isTelegramEnabled()` +
`sendTelegramIfEnabled()` (Admin SDK read of `adminSettings/advanced.
telegramEnabled`, bypasses Firestore rules entirely, default TRUE if
unset). Swapped in at every actual outbound-notification call site —
`onBookingCreate` (admin alert, needs-review alert, therapist DM),
`onReviewCreate`, `alertOverdueSessions`, `recoverAbandonedBookings` —
but deliberately NOT `telegramWebhook`'s reply-to-a-command handler,
since a therapist typing `/myid` to link their chat ID isn't a
"notification" this toggle should be able to silently break. A
deliberate skip returns `{ok: true}`, not `false` — `alertOverdueSessions`
stamps `overdueAlertedAt` and `recoverAbandonedBookings` sets a terminal
`status` based on `.ok`, so treating "paused" as "failed" would have
made the first loop-retry forever and the second permanently mark every
abandoned cart "alert-failed" while the toggle was off. LINE Notify
removed from the page entirely (not part of what she approved, and
nothing real backs it — building one is a different-sized ask).

**Pricing ("เชื่อมให้แก้ราคาได้จริงจากหน้านี้"):** `taxiFare.ts`'s
`ADMIN_QUOTE_KM`/`ROUND_TRIP_MULTIPLIER` and
`DistanceDepositDialog.tsx`'s `FREE_RADIUS_KM`/`DEPOSIT_THB` (previously
a SECOND hardcoded copy of the same policy — consolidated into
taxiFare.ts as the one source) are now `export let` + an
`applyLiveFareConfig()` setter, called once at boot and on every live
update by `MaintenanceGate.tsx`'s existing `publicRules` listener — it
already subscribed to the only public app-config doc, so pricing
piggybacks on that one listener instead of opening a second. ES module
named exports are LIVE bindings, so all 8 existing files that import
these constants (BookingFlowPage, TherapistDetailPage, HomeMapBrowse,
etc.) see the override automatically — zero call-site changes needed.
Defaults are unchanged from before, so nobody who hasn't saved new
values in Settings sees any behavior change.

**Surfaced, not silently fixed:** the "deposit" is informational-only
today — grep confirms BookingFlowPage never actually charges a separate
deposit line item; the real distance-based cost customers pay is the
round-trip travel fare. Editing "Deposit Amount" changes what the FAQ
dialog tells customers, not a second real charge. Put this directly in
the Settings UI copy so the founder sees it every time she opens that
section, not just in a one-off chat message. Also NOT wired (wasn't part
of either approved question, since it was scoped to pricing not payment-
method availability): PromptPay/Stripe enable toggles — still marked
"not yet connected."

**Verification, given the higher blast radius:** confirmed the taxiFare.ts
diff touches ONLY declarations (`const`→`let`, new setter function) and
zero lines inside `grabCarOneWayFare`/`calcTaxiFare`/`resolveTier`'s
function bodies — mathematically identical output unless
`applyLiveFareConfig` is actually called with new values. `firebase
deploy --only functions` — 15 functions, all "Successful update
operation," zero deploy failures. Checked `onBookingCreate`'s post-
deploy container boot (healthy TCP probe, no crash, no error logs).
Tried to also confirm a live post-deploy SCHEDULED tick of
`recoverAbandonedBookings`/`alertOverdueSessions` (to see the new
`isTelegramEnabled()` Firestore read execute for real, not just boot) by
polling `firebase functions:log` in the background for ~15 minutes —
inconclusive: no new tick showed up in that window (Cloud Logging query
lag via the CLI, most likely — plausible but not confirmed) and no error
surfaced either. Deploy success + healthy boot + zero errors is real
signal; a confirmed successful scheduled execution is NOT, and is worth
a spot-check next time the audit log / telegramLogs collection is
reviewed. Client-side loop was fully clean: `vercel --prod`, homepage
200 + correct title (regression check — MaintenanceGate wraps every
customer route), curled the live main bundle for `roundTripMultiplier`/
`freeRadiusKm`, and the Advanced Settings chunk for the new section copy
+ zero remaining LINE references.

### 🆕 2026-07-07 — admin/advanced-settings: 13 fields, all decorative (28s296)

Founder: "admin/advanced-settings ปรับแก้ และ ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง".
Same audit method as blocked-devices (28s293), scaled up: `grep -rl` for
each of the page's 13 field names across the whole repo (`src` +
`functions`) returned ONLY this file, for every single one. The page had
never controlled anything — every "real" system these fields sound like
they'd gate already exists elsewhere, hardcoded and working:
- Telegram — a real, deployed Cloud Functions bot
  (`functions/src/telegram-concierge-bot/`, `telegram-post-bot/`), token
  sourced from Functions config, not this Firestore doc.
- LINE Notify — zero implementation anywhere. Nothing to enable.
- PromptPay / deposit — real, hardcoded: `DEPOSIT_THB` in
  `DistanceDepositDialog.tsx` (500฿, "25km+" policy per its own comment),
  "promptpay" a real selectable payment METHOD in `PaymentMethodsPage.tsx`
  (not a feature flag).
- Distance / round-trip pricing — real, hardcoded in `taxiFare.ts`
  (`ADMIN_QUOTE_KM=40`, `ROUND_TRIP_MULTIPLIER=1.6`, founder-confirmed
  business model from round 28b23 — round-trip charging isn't optional,
  so a "roundTrip" toggle doesn't even match how the system actually
  works).
- Blocked IPs — structurally impossible here: a static SPA + client
  Firestore SDK has no way to learn a visitor's real IP, and Firestore
  rules can't inspect request IP either.

**Wired for real** (nothing competed with these, so zero risk to
existing behavior):
- `maintenanceMode` — new `src/components/common/MaintenanceGate.tsx`
  wraps the whole customer-facing route tree in `App.tsx` with a live
  `onSnapshot` on the new public `adminSettings/publicRules` doc. Flips
  every guest's screen to a "back soon" page instantly, no refresh
  needed; admin/therapist roles always pass through so the founder can
  never lock herself out of her own toggle. Fails open on a read error.
- `minAdvanceMins` / `maxFutureDays` — `BookingFlowPage.tsx`'s submit
  guard (same slot as the 28s293 blocked-phone check) now reads the real
  eligibility window from the same public doc and rejects a submit
  outside it. Default 0 = no restriction either way, so nobody who's
  never touched Settings sees any behavior change.
- Removed `blockedIps` outright — same "can't work, don't pretend" logic
  as the `blockedDevices` cleanup.

**Left editable but honestly labeled** ("✅ ใช้งานจริง" vs "⚠️
ยังไม่เชื่อมระบบจริง" badge per section) rather than silently wired or
silently deleted: Notifications (Telegram/LINE tokens) and Payment &
Distance (PromptPay/Stripe/deposit/distance). Wiring these for real
means either a separate Cloud Functions deploy (Telegram — different,
harder-to-verify pipeline than the Vercel loop this session runs on) or
making live pricing/payment math editable outside code review (deposit
amount, distance multiplier) — a deliberate product/money decision, not
a bugfix, so flagged back to the founder via AskUserQuestion rather than
decided unilaterally. Values still save (nothing lost if she says yes).

`firestore.rules`: new `adminSettings/publicRules` — `read: if true`
(guest checkout has no auth to gate on, same reasoning as
`blockedPhones`), kept as a SEPARATE doc from `adminSettings/advanced`
(admin-only read+write) specifically so a public-read grant can never
accidentally expose a real secret/token if that doc ever holds one.

Verified live: deployed firestore.rules first, confirmed
`adminSettings/publicRules` public-read via REST (404 not-found, not 403
denied) and the homepage still renders normally post-deploy (critical
regression check since MaintenanceGate wraps literally every customer
route) — curled the live main bundle and grep-confirmed `publicRules`,
`maintenanceMode`, and the Thai maintenance-screen copy are all present
in what customers actually get served. Also confirmed the admin
Advanced Settings chunk has the two status badges and zero remaining
`blockedIps` references.

### 🆕 2026-07-07 — hotfix: audit-log white-screen crash (28s295)

Founder screenshot right after 28s294 shipped: `/admin/audit-log` fully
white-screened with "Cannot read properties of undefined (reading
'split')". Root cause: 28s294's new `categoryOf(action)` called
`action.split(".")` unconditionally, and `categoryOptions` runs it
eagerly over EVERY loaded row before any filtering happens. A real doc
in `auditLogs` has an `action` that isn't a string — almost certainly a
legacy/malformed entry predating `logAdminAction` (this file's own
28s234 comment notes the collection was originally meant to be
"populated by Cloud Functions only," so an old function-written doc with
a different shape is the likely source). One bad doc crashed the entire
page for everyone, immediately, with no way to filter it out since the
crash happened before rendering.

**Lesson:** `as AuditRow` is a compile-time assertion, not a runtime
guarantee — Firestore data doesn't enforce the TypeScript shape. Any
`.map()`/`.filter()` that runs eagerly over live Firestore rows (not
lazily, only on access) needs to tolerate a doc that doesn't match.
Hardened `categoryOf` (`typeof action === "string"` check, falls back to
an "other" category) and both `ACTION_LABEL[r.action]` lookups (falls
back to a Thai "ไม่ทราบประเภท" label instead of literally rendering
`undefined`).

Verified live: curled the deployed chunk and grep-confirmed the
`typeof … === "string"` guard, the fallback label, and the "other"
category are present in production.

### 🆕 2026-07-07 — admin/audit-log: search + filters (28s294)

Founder: "admin/audit-log ปรับแก้ และ ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง".
This page was already on Ocean Study (unlike the last few rounds), so
the "actually usable" gap wasn't styling — it was that an audit log's
whole point is "can I find what happened," and a flat 200-row list with
zero filters fails that past a screenful.

**Added:** search box (label/detail/actor email) + a category filter
grouped by the action's `x.y` prefix (booking/payout/therapist/user/
review/phone — a future `booking.refund` needs no filter-UI change,
it just inherits the "จอง" group) + a today/7d/30d/all time window,
matching the filter conventions every other admin list page gained this
session. Two stat pills (today's count, total loaded).

**Also:** bumped the query cap 200→500 — now that a narrow window like
"today" exists, a low cap is more likely to silently drop older-in-range
rows without any indication. The "capped" note in the subtitle is now
computed from the actual limit instead of a hardcoded "200" that would've
gone stale the next time this changes. Detail line switched from
single-line ellipsis-truncate to wrap — same fix pattern as round 28s290
— since `reason`/`changedFields` text can run long (especially now that
`phone.block` carries a free-typed reason from 28s293) and was silently
cut off with no way to see the rest.

Verified live: curled the deployed `AdminAuditLogPage-*.js` chunk and
grep-confirmed the new stat-pill label, empty-filter-state string, and
the `today`/`7d`/`30d` window values are present in production.

### 🆕 2026-07-07 — admin/blocked-devices → real, enforced phone block (28s293)

Founder: "admin/blocked-devices ปรับแก้ และ ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง"
(fix + make it pretty + recommend something ACTUALLY usable). Audit turned
up a bigger problem than styling: `grep -rn "deviceId" src` returned
exactly one file — this page itself. Nothing anywhere in the codebase
ever generated a "deviceId" to block, and even if admin hand-typed an
arbitrary string, nothing at booking time ever checked `blockedDevices`.
The entire feature was a shell: it wrote to a Firestore collection
nothing else read, so "blocking" a device never stopped a single
booking.

**Rebuilt around phone number** — already on every booking, already the
CRM's identity key (`normPhone()` in Customer Insights):
- `BookingFlowPage.tsx` now checks `blockedPhones` before accepting a
  submit (admin-initiated bookings bypass, same as the other guards in
  that function) — this is the enforcement that was completely missing
  before. Fails open on a check error so a Firestore hiccup can't block
  a legitimate guest.
- `firestore.rules`: new `blockedPhones/{phone}` — `read: if true` (guest
  checkout has no auth at all to gate the pre-submit check on),
  `write: if isAdmin()`. Old `blockedDevices` rule left in place
  (harmless) but nothing reads/writes it anymore.
- `AdminBlockedDevicesPage.tsx` rebuilt on Ocean Study: add/remove a
  blocked phone with a reason, search, stat pill.
- **The "actually usable" part:** Customer Insights (`AdminUsersPage.tsx`)
  guest profile drawer got a one-click Block/Unblock button + a "Blocked"
  flag in both the drawer and the guest list — because in practice she'll
  spot a problem guest (no-shows, abuse) IN the CRM, not by copying a
  phone number into a separate page.
- `normPhone()` moved out of a local copy in AdminUsersPage.tsx into
  `src/utils/phoneCountry.ts` so BookingFlowPage / AdminUsersPage /
  AdminBlockedDevicesPage all normalize the same way.
- `phone.block` / `phone.unblock` added to `AuditAction` (distinct from
  the existing `user.block`/`unblock`, which toggles a signed-up `users`
  account, not a phone).

Verified live: deployed firestore.rules FIRST (so the client code
wouldn't hit permission-denied on first load), confirmed with an
unauthenticated REST read against `blockedPhones` (404 not-found, not
403 permission-denied — public read is live). Then curled all three
deployed chunks (AdminBlockedDevicesPage, AdminUsersPage, BookingFlowPage)
and grep-confirmed `blockedPhones`, the audit action strings, the Thai
block/unblock button labels, and the booking-guard error message are all
present in production.

### 🆕 2026-07-07 — admin/seed-reviews: could silently overwrite real reviews (28s292)

Founder: "admin/seed-reviews ปรับแก้ และ ตกแต่งสวยงาม". Auditing the seed
tool right after 28s291 paid off immediately: its "needs seeding" filter
was `!rating || rating<1 || !reviewText.trim()` — so a booking with REAL
guest reviewText but no rating field (the exact case 28s291 just proved
exists in production) got pulled into the seed queue, and both the
single-row submit and bulk-seed paths overwrite `reviewText`
unconditionally. A real guest comment could get silently clobbered by a
synthetic template just because it lacked a numeric rating.

**Fix:** "needs seeding" is now `!reviewText.trim()` only — matching the
same reviewText-based definition of "review" that 28s291 established for
the Reviews page. A booking with text but no rating is already a review
(defaults to ★5 there) and must never re-enter this queue.

**Also found + fixed:** the "ทั้งหมด" (All) time-window toggle did
nothing — the server fetch was hardcoded to a 90-day cutoff regardless
of the selected window, so "All" silently showed the same rows as "90
days". `loadRows` now takes the window and refetches with the correct
cutoff (epoch-0 for "All", same composite index) whenever the toggle
changes.

**Also:** Ocean Study restyle + `@mui/icons-material` → `phosphor-react`
(last page on the pre-28s235 theme), added a service/practitioner search
box, two icon-circle stat pills (pending count, practitioner count) for
visual parity with AdminReviewListPage, `Timestamp.now()` →
`serverTimestamp()` for `reviewedAt`.

Verified live: curled the deployed `AdminSeedReviewsPage-*.js` chunk and
confirmed the `reviewText` filter (no more `rating` check), `reviewedAt:
se()` (serverTimestamp), the "Practitioners" stat pill, and the new
search placeholder are all present in production.

### 🆕 2026-07-07 — admin/reviews: missing-rating reviews were invisible (28s291)

Founder: "admin/reviews ปรับแก้". Audited the page (last untouched admin
list this session) and found the same class of bug 28s276 already fixed
once: the query was `where("rating",">=",1)` plus a client-side
`if (rating < 1) return`, so any booking with `reviewText` but NO
`rating` field never showed up here — even though `ReviewListPage.tsx`
(the public review wall) filters on `reviewText`, not `rating`, so real
customers could already see those reviews while admin had zero ability
to edit or hide them.

**Fix:** query switched to `where("reviewText","!=","")` (this page has
full admin Firestore access, so the anon-visitor privacy constraint that
forces `rating>=1` on the public-facing hook doesn't apply here); missing
`rating` now defaults to 5, matching the established convention in
`ReviewListPage.tsx` / `AdminUsersPage.tsx`.

**Also this round:**
- Ocean Study restyle — this was the last admin page still on the
  pre-28s235 (`#B4000A`/`#1A2B2E`/`#F4F6F5`) theme.
- `review.edit` / `review.hide` added to `AuditAction` + `ACTION_LABEL`
  in AdminAuditLogPage; Edit/Hide now call `logAdminAction` (previously
  the only consequential admin write this session with no trail).
- Search box (therapist name / review text) + ★ rating filter +
  language filter, matching every other admin list page.
- `Timestamp.now()` → `serverTimestamp()` for the edited/hidden
  timestamps, consistent with the rest of the codebase.

Verified live: curled the deployed `AdminReviewListPage-*.js` chunk and
grep-confirmed `reviewText","!=`, `review.edit`, `review.hide`, and the
new Thai filter/stat-pill strings are present in production.

### 🆕 2026-07-07 — history row clipping actually fixed this time (28s290)

Founder screenshot showed the exact same broken booking-history rows
(text collapsed, amount pushed to the edge) that 28s289's "polish" pass
was supposed to fix — meaning that round shipped a guess that didn't
address the real cause.

**This round root-caused it BEFORE touching code**: built an isolated
Artifact (plain HTML/CSS replica of the exact row markup, no auth needed
since AdminUsersPage sits behind Firebase Auth and the sandboxed preview
can't log in), screenshotted it at a simulated 2.4× text scale, and
reproduced the exact broken look. Root cause: MUI's `sx` `fontSize` (a
raw number) resolves through `theme.typography.pxToRem`, so it scales
with the device's OS/browser accessibility text-size setting — but the
row's padding used fixed `px`. Combined with `whiteSpace: nowrap` +
ellipsis on the title, a phone with "larger text" on collapses the title
to 2-3 characters while the amount/status (unclipped) keep full size and
crowd the edge.

**Fix:** swapped single-line ellipsis-truncation for WRAP — service name
+ amount on one `flexWrap` line, therapist/date + status/caret on a
second, `wordBreak: "break-word"` throughout. At normal scale it's
visually identical (one line each); under heavy text-scaling it reflows
onto more lines instead of clipping/overlapping — confirmed via the same
mockup at 2.4× before shipping.

**Process lesson:** for a page the preview tools can't reach (behind
auth), don't ship a second visual guess without independent verification
— build an isolated Artifact/mockup replicating the exact markup first,
stress-test it, and only port the confirmed-working version into the
real file. Two prior rounds (28s288, 28s289) shipped plausible-looking
fixes for this same complaint that didn't actually hold up.

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

### 🆕 2026-07-07 — Analytics: visitor counter, sources, peak hours (28s303)

Founder asked "เราดูจำนวนคนมาเข้าดูเว็บเราได้ที่ไหน" (where do I see visitor
counts). Answer: `/admin/analytics` (menu "Analytics") — the self-hosted
funnel page reading `analytics_events` (from Round 28r13). It already had
a funnel + daily trend but no plain "how many people" number and no
source/time breakdown. Offered daily totals / traffic sources / peak
hours → she said "ทำครบ". Built all three, all on the existing data (the
`referrer` and `ts` fields were already captured) — **no new writes, no
rules change, no schema change**:

1. **Headline visitor tiles** (`HeroStat`) — unique `home_view` sessions
   for the selected range + today + yesterday, with a ▲/▼ vs-yesterday
   hint. This is the direct answer to "คนเข้าเว็บกี่คน". Unique = counts
   1 per session (session id rotates on tab close, same as before).
2. **Traffic sources** — per-session referrer, bucketed by
   `classifyReferrer()` into LINE / Google / Instagram / Facebook / X /
   TikTok / WhatsApp / Telegram / YouTube / etc. A known source *upgrades*
   a "Direct" placeholder (visitor lands via LINE then navigates
   internally → still counts as LINE). null / own-domain = Direct.
   Unknown hosts fall through to the raw hostname (nothing dropped).
3. **Peak hours** — 24-slot histogram of `home_view` by **BKK hour**
   (`(getUTCHours()+7)%24`, matching analytics.ts's mode logic, so it's
   correct regardless of where View views it from), busiest hour
   highlighted + labelled "HH:00–HH:00".

All three respect the page's existing date-range / concierge-mode /
language filters (they read `stats` off `filteredEvents`). Verified: tsc
+ build clean, isolated node logic test (referrer 15/15, BKK-hour 6/6,
session-upgrade PASS, daily-unique dedup PASS), deployed, new strings
confirmed live in `AdminAnalyticsPage-*.js`.

Known non-issue: GA is NOT wired — index.html has a dead `dns-prefetch`
to google-analytics only. This self-hosted counter is the source of
truth; there's no second dashboard/invoice to manage.

### 🆕 2026-07-07 — District SEO landing tracker (28s304)

Founder asked "ส่วนมากลูกค้าค้นหาว่าอะไร" (what do customers mostly search
for). Honest answer given first: **our data can't show literal Google
queries** — Google strips the query from referrer, AND the 5 district
keyword pages (`/outcall-massage-{sukhumvit,silom,asok,thonglor,near-me}`)
`<Navigate to="/">` so `path` collapses to "/". The real terms live in
**Google Search Console** (already in use — the -25% sukhumvit / +300%
near-me figures in the 28s224 comments came from it). Offered an
in-dashboard proxy; she said "ได้ทั้งหมด" → built it:

- `KeywordLanding.tsx` replaces the bare `<Navigate>` stub on those 5
  routes. It `recordLandingArea(area)` (sessionStorage) **in the render
  body** — deliberately not an effect, so the write lands before the
  redirect mounts HomePage and its home_view effect reads it. Then still
  renders exactly `<Navigate to="/" replace>`. The write is client-only
  (`recordLandingArea` no-ops with no `window`), so the **prerendered SEO
  shell is byte-identical** — verified the built sukhumvit shell keeps its
  keyword `<title>` + LocalBusiness JSON-LD.
- `analytics.ts`: `recordLandingArea` / `consumeLandingArea` (read+clear)
  + `trackHomeView(area?)` attaches `{area}` to the session's home_view.
- HomePage: `trackHomeView(consumeLandingArea())`.
- Analytics page: new "คนมาจากหน้าไหน" card (`AREA_LABEL`) ranking the
  district pages, with an inline note that it's a proxy and real queries
  are in Search Console.

Important framing for future: this is **forward-only** (attributes new
sessions from deploy onward) and is a *which-page* proxy, NOT the literal
search term — always point View to Search Console for actual queries.
Verified: tsc + build clean, 55 routes prerender, isolated logic test
PASS (attribution / direct fallback / consume read-clear / prop shape),
live checks pass (home 200, district title served, `sunred.landing.area`
in main bundle, card string in analytics chunk).

### 🆕 2026-07-07 — Wage slip: per-job service detail (28s305)

Founder opened a therapist payslip on `/admin/reports` and asked to show
the service details ("ดูสลิป บอกรายละเอียดบริการ"). The slip modal
(`AdminReportPage.tsx`, bill-preview Dialog) only listed aggregate rows
(ค่าบริการรวม / Taxi รวม / ร้านได้ / จ่ายนวด / ยกเลิก) — no per-job
breakdown, so a therapist couldn't see WHICH jobs made up the pay.

Added a **"รายการงาน"** list to the modal, sourced from
`preview.bookings` (the exact per-job data the Excel export's `buildSheet`
already itemises). Each row: service name · date · Taxi/ลด notes on the
left; **payout per job** (`therapistPayoutFor(b)`) + "จาก ฿servicePrice"
on the right; cancelled/excluded jobs (`isPayrollExcluded`) greyed with a
ยกเลิก tag. Sorted oldest→newest.

Display-only — reuses the same commission functions the summary loop
uses, so the per-job payouts sum to the slip's จ่ายนวด by construction.
No logic / export / data / rules change. Verified tsc + build clean, 55
routes prerender, live string in `AdminReportPage-*.js`.

### 🆕 2026-07-07 — Opaque date-picker calendar popover (28s306)

Founder: the date-picker calendar is see-through on every admin page with
a date filter — page content bleeds into it, unreadable ("พื้นหลังจาง
ไม่เห็นเลย ปรับแก้ทั้งหมด"). **Root cause is in `theme.ts`, not any admin
page**: `palette.background.paper` is `rgba(255,255,255,0.65)` — kept
translucent on purpose for the frosted-glass customer cards. The X
DatePicker's popover uses that default paper, so its calendar sitting over
dense content bleeds through. Admin *cards* never hit this because they
set an opaque `#FFFFFF` (adminColor.panel) themselves; the picker popover
doesn't, and none of the 5 admin pages (Reports / Analytics / Earnings /
Dashboard / Bookings) passed a paper background either.

Fixed **once, globally** with a `MuiPickersPopper.styleOverrides.paper`
theme override (opaque white + border + shadow + radius) — no per-page
edits, covers all 5 pages and any future picker. Solid white keeps the
existing dark-text calendar legible; selected/today still use primary red.
Needed `import type {} from "@mui/x-date-pickers/themeAugmentation"` so
`createTheme` accepts the `MuiPickersPopper` key (X pickers v7.29.4).

Note for future translucent-paper bugs: the frosted default paper can bite
any Popper/Menu/Autocomplete that doesn't set its own opaque surface — the
admin Selects already work around it via explicit MenuProps PaperProps
(e.g. `selectMenuProps` in AdminAnalyticsPage). Verified tsc + build clean,
55 routes prerender, override present in the live main bundle
(`MuiPickersPopper` + the distinctive shadow).

### 🆕 2026-07-07 — Travel fare: real discount % + controllable anchor (28s307)

Founder reviewed the "ค่ามัดจำ & ระยะทาง" Advanced-Settings section and
asked to rethink the calc + surface the customer travel discount in web
booking. **Presented the analysis first** (worked-example table of what a
customer pays at 5/10/25/40 km), flagged it as a money decision, and asked
direction via AskUserQuestion → she chose **"both"** (clarity+control AND a
real discount lever).

Key facts established: `taxiFare.ts` is the single fare injection point;
what the customer pays = one-way meter × `ROUND_TRIP_MULTIPLIER` (1.6) +
rain; `DEPOSIT_THB` (500) and `FREE_RADIUS_KM` (25) are **FAQ-only** — used
ONLY by `src/components/home/DistanceDepositDialog.tsx`, never charged in
BookingFlow; the ~36% shown "Smart Routing" discount rode a hardcoded 2.5×
`LIST_PRICE_MULTIPLIER` anchor she couldn't edit.

Built (all default to current behaviour — **nothing customers pay changes
until she sets a value**):
- `taxiFare.ts`: `LIST_PRICE_MULTIPLIER` const→`let` (live display anchor)
  + new `TRAVEL_DISCOUNT_PCT` (real, clamped 0–90). In `calcTaxiFare`:
  `fare = withRain − round(withRain × pct/100)`. Added
  `travelDiscountPct`/`travelDiscountAmt` to `TaxiFareResult`;
  `sunredPromoDiscount` redefined to `listPrice − fare` so the existing
  savings pill absorbs the real discount with **zero BookingFlow edits**
  (taxiFare = result.fare flows through).
- `MaintenanceGate`: feeds `listPriceMultiplier` + `travelDiscountPct` from
  publicRules into `applyLiveFareConfig` (clamps: anchor ≥ 1, pct 0–90).
- `AdminAdvancedSettingsPage`: section retitled "ค่าเดินทาง & ระยะทาง" and
  split into **💸 คิดเงินจริง** (round-trip ×, real discount %, standard-rate
  anchor, max-km) vs **📄 FAQ เท่านั้น** (deposit, free-radius) so it's obvious
  which fields touch money; discount field renders a live worked example.

De-risk: isolated money-math test 15/15 PASS — default `fare === withRain`
(byte-identical), real discount lowers the customer total by exactly the
discount amount, the anchor never touches the fare, negative/huge inputs
clamp safely. No rules change (existing publicRules doc). Verified live:
`travelDiscountPct` in main bundle, new admin fields in the advanced chunk.

Still open (offered, NOT chosen): making the deposit a REAL charge (would
need a payment-collection flow) — and the DistanceDepositDialog still tells
customers about a 500฿ deposit that isn't charged; left as-is per scope,
but worth reconciling if the deposit ever goes real.

### 🆕 2026-07-07 — Travel fare: actual round-trip, all layers stripped (28s308)

**Reverses/supersedes 28s307.** Founder: "ไปเต็มราคา + กลับตามจริง — ลบค่า
ทั้งหมดที่เคยคำนวน". Confirmed via AskUserQuestion (money) → "ไป-กลับจริง
×2.0 + ลบเลเยอร์คำนวณทั้งหมด".

Decisive fact that de-risked it: fetched the live `adminSettings/publicRules`
doc via the public Firestore REST endpoint (it's `read: if true`) — **it
404s / doesn't exist**. So no fare value was ever saved; everything ran on
code defaults. Changing defaults is enough; there was nothing to reset.

New model: **travel fare = one-way GrabCar meter × 2.0 (outbound full +
return full) + rain.** No discount, no anchor, no deposit. Customers pay
~25% more than the old ×1.6 (10km ฿181→฿226, 25km ฿349→฿436, 40km
฿517→฿646) — verified `oneWay×2` exactly, rain stacks.

`taxiFare.ts` rewritten clean. **Deleted exports** (grep before reusing):
`LIST_PRICE_MULTIPLIER`, `TRAVEL_DISCOUNT_PCT`, `listPriceRoundTrip`,
`grabRoundTripEstimate`, `returnLegDiscountPct/ChargePct`,
`RETURN_LEG_DISCOUNT_PCT/CHARGE_PCT`, `FREE_RADIUS_KM`, `DEPOSIT_THB`.
`TaxiFareResult` slimmed — dropped `listPriceTravel`, `sunredPromoDiscount`,
`travelDiscountPct/Amt`, `grabEstimate`, `savingsVsGrab`.
`applyLiveFareConfig` now takes only `{ adminQuoteKm, roundTripMultiplier }`.

Consumers updated: BookingFlow (removed strike-through anchor + Smart
Routing chip + travel routing-saving → travel is one line; `savingsRouting`
hard-0 so the "You saved" pill reflects only a real promo code; dropped
grabEstimate/savingsVsGrab from the booking doc write); MaintenanceGate
(slim call); AdminAdvancedSettings (section = round-trip multiplier 2.0 +
max-km only). **Deposit FAQ fully removed**: deleted
`src/components/home/DistanceDepositDialog.tsx` + its TopNav nav item
("Distance & deposit") + state/handler/render. i18n 5 langs: travel
tooltip retitled, "40% off return" copy → round-trip wording
(`booking.travelTip.roundTrip`; orphaned `smartRouting`/`savedRouting`/
`returnLeg`/`returnNote` keys left harmless).

Verified: isolated math PASS, tsc + build clean, 55 routes prerender, home
200, fake-discount symbols confirmed GONE from the live bundle, new
round-trip copy live. No rules change (publicRules doc doesn't exist).

### 🆕 2026-07-07 — Travel fare: Grab booking fee + surge + 15km quote (28s309)

Founder specced a fuller Grab-like model (base 45 + tiers — unchanged from
current; idle "+2/min"; Grab booking fee 20; weather/traffic/demand surge;
"15km deposit"). Confirmed the undefined + technically-impossible parts via
AskUserQuestion (money):
- **Booking fee = per leg** → round trip adds it twice (`GRAB_BOOKING_FEE × 2`).
- **Idle "+2/min" + rush/peak/rain can't be measured for a pre-booking
  quote** (Grab computes those live from GPS at ride time). Approximated as
  a **time-of-day surge %** on the booking's *scheduled* hour.
- **"15km deposit"** → she chose "confirm with admin", so just dropped the
  auto-quote threshold `ADMIN_QUOTE_KM` 40→15 (manual concierge confirm; no
  real deposit — site has no online payment).

Model: `fare = (oneWay×2.0 + GRAB_BOOKING_FEE×2) × (1 + surge% + rain%)`.
Surge bands (BKK scheduled hour): **rush** 07–09 & 17–20 (default 25%,
represents traffic/idle), **peak** 21–02 (default 15%, late-night demand);
rain still from weather.ts. All new numbers live-overridable; surges
clamped 0–200 %.

- `taxiFare.ts`: `ADMIN_QUOTE_KM` 40→15; `GRAB_BOOKING_FEE`,
  `RUSH_SURGE_PCT`/`PEAK_SURGE_PCT` + `surgePctForHour()`;
  `calcTaxiFare`/`estimateTaxiFare` take optional scheduled `bkkHour`;
  `TaxiFareResult` gains `bookingFee`+`surgePct`.
- BookingFlow: passes `form.time`'s hour into the fare memo (added to deps);
  tooltip fixed — 40+ tier restored, +฿20/leg booking fee, >15km concierge,
  surge note. i18n `booking.travelTip.bookingFee`/`.surge` in 5 langs.
- AdminAdvancedSettings (3 new tunable fields) + MaintenanceGate wired.

**Watch-out for future me:** with peak default 15%, most SunRed night
bookings (21:00+, its prime window) get +15% by default — flagged to
founder, tunable to 0. And `ADMIN_QUOTE_KM=15` means any trip >15km *road*
(≈ >10km straight-line from the Huai Khwang base — outer areas/airport)
now shows "concierge quote" instead of an auto price; central BKK stays
auto-priced.

Worked table (no surge/rain): 5km ฿194 · 8km ฿238 · 10km ฿266 · 14km ฿322;
at rush +25% and peak +15% on top. Isolated math test 20/20 PASS. tsc +
build clean, live checks pass. No rules change.

### 🆕 2026-07-07 — Rain surcharge from real forecast at scheduled time (28s310)

Founder: "คำนวนสภาพอากาศ ช่วงฝนตก จาก พยากรณ์อากาศ จริง ตามเวลานั้นๆ". The
rain surcharge used `getCachedRainStatus()` = CURRENT Bangkok weather for
every booking, ignoring when the appointment is. Now priced from the real
hourly FORECAST at the booking's scheduled date+hour.

- `weather.ts`: `getRainForecast()` pulls **wttr.in `?format=j1`** (3 days,
  8 slots/day every 3h), parses each slot's `weatherDesc` + `chanceofrain`
  via `classifyForecastSlot` (bumps to light at ≥60% rain chance even when
  the text is mild; heavy on thunder/storm ≥80%), cached 2h in localStorage
  (`sunred_forecast_v1`). `rainStatusFromForecast(forecast, dateISO, hour)`
  snaps the hour to the nearest 3h slot (0–21) → RainStatus; returns null
  beyond the ~3-day horizon so the caller falls back to current weather.
- BookingFlow: fetches the forecast on mount (`forecast` state); the fare
  memo uses `rainStatusFromForecast(forecast, form.date, hourBKK) ??
  rainStatus`, with `form.date`/`forecast` added to deps. `form.date` is
  already `dayjs().format("YYYY-MM-DD")` (StepDateTime) — matches wttr keys.

Validated the parser against LIVE wttr.in: 3 dates × 8 slots, today showed
light rain 00–03 & 18:00 (bursty BKK pattern), slot-snap correct (22→21,
14→15, 2→3). No CSP change (wttr.in already in connect-src — the old
`format=%C` current-weather fetch used it). No rules change. tsc + build
clean, home 200, `format=j1` + cache key confirmed in the live bundle.

Note: current-weather path (`getRainStatus`/`getCachedRainStatus`) kept as
the fallback for out-of-horizon / forecast-fetch-failed bookings.
