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

**Pricing (THB) — Round 28w.36, explicit per-duration, NOT a multiplier.**
4 SKUs (`xSR-Thai`, `SR-Aroma`, `SR-HJ2200`, `SR-B2B3200`), each with its
own per-duration price — read the real numbers from
`src/utils/servicePricing.ts`, never memorize them here (see the drift
warning below for why).
- ⚠️ The old "90min = base × 1.5 · 120min = base × 2.0" multiplier rule
  is DEAD — 28w.36 replaced it with the explicit per-duration model.
  @SunRedGreeterBot's hardcoded FAQ copy silently drifted from real
  pricing after that change (caught + fixed 28x.82 from a founder
  screenshot) because the price numbers live in two places. If you
  change prices again: update `src/utils/servicePricing.ts`
  DURATION_PRICE_OVERRIDES AND `functions/src/telegram-concierge-bot/faq.ts`
  PRICING — both, every time.
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
- **i18n**: 6 languages (en, th, zh, zh-TW, ja, ko) in `src/locales/` —
  zh-TW (Traditional, Taiwan/HK/Macau) added 28x.99f as its own bundle,
  not an alias of zh (Simplified). URL prefix `/zh-tw`. The promo/
  broadcast Telegram bot (scheduled channel posts) deliberately does
  NOT support zh-TW — see §9.
- **Hosting**: Vercel (Hobby tier), domain via Porkbun
- **Repo**: `/Users/varissarahirunto/sunred-vite/`

### Key files & where things live
- `src/data/therapists.ts` — therapist roster + servicesAvailable
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

**Test/placeholder bookings — exclude from any customer-facing stat**
(revenue totals, top-spender/VIP lists, membership tiers). Two
independent signals, both live in `src/utils/membership.ts`, both
wired into AdminMembersPage/AdminBookingListPage/AdminMembershipPage/
AdminUsersPage — any new stats surface must call both:
- `isReservedShopBooking(b)` — `contactName`/`customerName` contains
  "sunred" (any case) OR `phone` contains admin's own "634350987".
  Real ~1yr-old workaround (guest's real phone unbookable → admin
  used her own as placeholder), not test data — 126 real bookings.
- `isTestLocationBooking(b)` — `locationName`/`address` matches the
  Aspire Asoke-Ratchada condo (Din Daeng) used as the QA test address
  since Sep 2025: "aspire", "ซอย พร้อมพันธ์" (Soi Prompan, both the
  779 and 70ค. building-number variants), or the "QH86+45P" plus-code.
  Testers cycle through dozens of throwaway phone numbers AND
  sometimes the founder's own name "View" instead of "SUNRED", so the
  identity check above doesn't catch these — must match on address.
  Matched on the building/soi identifiers, NOT the "Din Daeng"
  district name — the district is large and has real guests.

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
- **Niche directories** — secretthai, bangkok101.net, eros directory
  (⚠️ founder confirmed 2026-07-22 — **Stickman Bangkok and Lookpasi
  were never actually used**: they were a research suggestion in this
  file's own §🔐 playbook, never real marketing history. Don't cite
  them as "used" channels again. **Sammyboy/Samsguide WAS real** —
  billed every 2 months at ฿15,200 (~฿7,600/mo effective, confirmed
  2026-07-22 — not a flat ฿7,500/mo), cancelled on cost. As of this
  date SunRed has no active directory-listing channel beyond the
  three above.)
- **X/Twitter** — less Meta restrictions
- **Reddit r/Bangkok / r/ThailandTourism** — soft community engagement
- **Referral program** — existing customers get free upgrade
- **Word-of-mouth** via taxi drivers (informal, Bangkok-style)

### Failed channel (cancel ASAP)
- ❌ Singapore website ad — ฿7,500/mo × 10 months = ฿75,000 burnt, 0
  ROI, audience too narrow

### Paused channel — cost AND customer-quality, not just cost (2026-07-22)
- ⏸️ **Sammyboy/Samsguide network** (samsguide.living/.services,
  sammyboyforum.com, sbf.net.nz, samsforum.com — same forum family) —
  cancelled by founder, confirmed 2026-07-22 real bank slips (billed
  every 2 months, ~฿15,000-15,200/cycle, ~฿7,500-7,600/mo effective;
  the shifting recipient name/bank across payments is just how this
  informally-run forum collects money, not a red flag — founder
  confirmed). TWO reasons she stopped, not one:
  1. **Cost** — didn't feel worth it at the time (couldn't see if it
     converted — see attribution gap below).
  2. **Customer quality** (founder, 2026-07-22: "ลูกค้าจร ที่มาไทย
     ไม่ใช่ ลค ในไทย") — Sammyboy mostly brings ONE-TIME transient
     foreign tourists passing through Thailand, not repeat local
     customers. This matters MORE than reason #1: even if traffic/
     ROI numbers look good, that doesn't override a real customer-mix
     concern. Don't recommend resuming based on traffic data alone —
     the founder needs to independently decide whether one-time
     tourist volume is worth it, separate from whether it "worked."
  A read-only audit of `analytics_events` + `bookings` (28x.99t) found
  real signal while it ran: **213 unique sessions**, `samsguide.living`
  alone was the site's **#2 referrer** (163 hits, behind only Google,
  ahead of Instagram+Telegram+Twitter combined), **27 sessions (12.7%)
  opened the concierge chat**, 5 reached `booking_start`, 1 confirmed
  `booking_complete`. The true booking count is very likely higher —
  most guests close via direct Telegram/WhatsApp with the concierge
  rather than the tracked in-app booking flow, and **only 32 of 615
  total booking docs carry ANY attribution field at all**
  (`attributionSource`/`utmSource`/`referrerHost` mostly empty) — so
  reason #1 (cost/ROI-visibility) was probably a real, fixable gap.
  Reason #2 (customer mix) is a separate, harder call that data alone
  won't resolve. Booking-level attribution capture was fixed the same
  night, Round 28x.99t: `attributionSource` dropdown on New Booking +
  the edit drawer (AdminBookingAddPage.tsx / AdminBookingListPage.tsx).
  A one-time scheduled reminder (`sammyboy-attribution-checkin`, fires
  2026-08-05) will pull ~2 weeks of real attribution data — its job is
  to answer reason #1 with real numbers, NOT to recommend resuming on
  its own; reason #2 is View's call to make, present both.

  **✅ That reminder FIRED 2026-08-05. Result — re-run
  `node scripts/auditAttributionCheckin.mjs` (read-only) rather than
  rebuilding the query:**
  - **The dropdown ships but is barely used.** Only 3 bookings were
    created through the admin New Booking form in the 2 weeks since the
    fix; 1 was tagged (`telegram`), 2 left blank. All-time only **1 of
    32** tagged bookings was hand-picked by admin — the other 31 are
    `direct`/`google` auto-written by `classifyReferrer()` in the
    CUSTOMER web flow. So the attribution GAP is not closed; the tool
    exists and the habit doesn't.
  - ⚠️ **Don't read "tagged" as "admin tagged it."** `direct`/`google`
    can only come from the web flow, AND `BookingFlowPage` also stamps
    `createdBy:"admin"` when View books while logged in as admin — so
    `createdBy` alone can't separate them. The one field that can:
    `AdminBookingAddPage` hardcodes `userId: null`, `BookingFlowPage`
    writes `user?.uid`. Test `createdBy==="admin" && !userId`.
  - **Sammyboy: NOT relisted.** 0 bookings ever tagged `sammyboy`;
    0 samsguide/sammyboyforum referrer hits since the pause. All-time
    forum traffic 280 hits / 213 sessions, range 2026-05-07 → 2026-07-09
    — it stops dead at the cancellation, confirming the ฿15,200/cycle
    was buying real traffic that ended when she stopped paying.
  - ⚠️ **Two numbers in this file are stale**: `bookings` now holds
    **537** docs, not 615, and the pre-fix tagged baseline is **27/529**,
    not 32/615 (32 is the ALL-TIME tagged count, incl. post-fix). ~78
    docs are gone since 2026-07-22 — cause not established; the audit
    didn't delete anything (`scripts/deleteTestBookings.mjs` exists and
    is the likely candidate). Worth confirming before anyone treats a
    booking-count trend as real.
  - ⚠️ **Volume collapse, unexplained and bigger than the Sammyboy
    question**: bookings/month ran 83 (Oct 25) → 45 (May 26) → **12
    (Jun) → 24 (Jul) → 3 (Aug 1-5)**. Only 7 bookings in the whole
    check-in window, which is why the attribution percentages above are
    a tiny sample. Raised with View 2026-08-05; her call on whether to
    dig in.

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

## 8. Project history & changelog

The full round-by-round build log (every session from Round 28a onward) lives in
**[CLAUDE-HISTORY.md](CLAUDE-HISTORY.md)** — moved out of CLAUDE.md on 2026-07-08 to
keep this file lean. CLAUDE.md is loaded into context every session, so ~3,500 lines
of changelog were costing tokens on every run with no daily-operational value. Read
CLAUDE-HISTORY.md or `git log` for detail. Durable design decisions & "don't-redo"
lessons stay in §12 below.

## 9. Current state (updated 2026-08-05)

Round-by-round detail for what shipped recently — zh-TW locale, staff app
self-service, Telegram bot copy CMS, the analytics fix, the full booking-chat
build, the SEO blog pipeline, and the security audit — moved to
**[CLAUDE-HISTORY.md](CLAUDE-HISTORY.md)** (bottom of file, 2026-07-21 through
2026-07-24 entries) on 2026-08-05, same reason as §8: those are "what we built
and why", not "what's still owed", so they don't need to be resident every
session. **The open items below are NOT part of that move** — they stay here
because §10 depends on this section being read first every session.

**Live guardrail (from the zh-TW build):** `GREETER_LANGS` (6, concierge) and
`PROMO_LANGS` (5, broadcast) are intentionally separate lists in
`getTelegramBotCopyPreview` (functions/src/index.ts) — the promo bot
deliberately does NOT support zh-TW (`@manguyujianniSPA` is a mainland-CN-only
sub-brand channel). Don't merge the two lists; a Taiwan/HK promo channel is a
real new acquisition-channel decision for View to make, not a code default.

**🖼️ Every image on the site depends on ONE external CDN — Round 28x.156**

Founder, 2026-07-30, with a screenshot of the home grid: "หน้าเว็บรูป เสียหมด
แก้ด่วน" — every practitioner photo a broken-image glyph, alt text showing
through. Nothing in the repo was wrong: all 227 files present in
`public/images`, shipping to Vercel, CSP `img-src` permits both hosts.

The cause class is architectural. EVERY image anywhere in this app — home
cards, detail heroes, service tiles, map pins, the staff app — is rewritten by
`enhanceImage()` (src/utils/cloudinary.ts) into a Cloudinary **fetch** URL. That
is one metered external dependency in front of 100% of the site's photos, and
Cloudinary's free tier is monthly-metered: run out of credits (or get the
account restricted) and every image fails at once, site-wide, with no code
change and no warning. **If the photos ever break everywhere again, check the
Cloudinary dashboard's monthly credit usage FIRST** — it looks like a site bug
and it isn't one.

What 28x.156 changed so it can't blank the site again:
- `src/utils/imageFallback.ts` — a capture-phase `error` listener (image load
  errors don't bubble, so a normal listener never sees them). Any failed
  Cloudinary URL has its original address decoded straight back out of it and
  swapped in; the originals are on our own domain, so they load.
- The first failure **latches** `cloudinaryDown`, and `enhanceImage()` reads
  that latch — so after ONE broken image every later render goes direct,
  instead of the guest paying a failed request per photo.
- `VITE_CLOUDINARY_DISABLED=1` (Vercel env) turns the proxy off entirely with
  no code change. That switch exists for the case the latch cannot see:
  Cloudinary returning 200 but degraded (timeouts, blank placeholders), where
  no error event ever fires.
- Verified in a real browser: with Cloudinary requests aborted, a proxied URL
  self-heals to its origin file and renders.
- Trade-off while bypassed: photos are unoptimised (no WebP/AVIF, no resize,
  heavier). Deliberate — a slow photo beats no photo on a site whose product
  IS the photo.

**📉 Funnel audit 2026-08-05 (Round 28x.166-168) — read this before touching
pricing/promos/chat:**
Real analytics_events funnel: home→booking_start stable ~6% every month, but
(a) start→complete fell 40%→~25% after May, (b) concierge_chat_open collapsed
153 (May) → 44 (Jun, the 28s140-202 overhaul month) → 4 (Aug 1-5). Three causes
found + fixed that night:
- Travel fare was ~3× real GrabBike (10 km ฿450 vs ฿136 real) → re-anchored to
  the real Grab round-trip (28x.166: 0→฿50 · 3→฿70 · 6→฿100 · 10→฿140 ·
  15→฿200), verified live in the prod bundle. Note: the fare is the
  THERAPIST's money (cash jobs she keeps it) — old curve gave her ~฿300 hidden
  margin per 10 km job, now ~breakeven; watch for far-job refusals.
- Auto-filled welcome code showed "Code not recognised" on the bestseller
  (premium PROMO_BLOCKED) and Thai 60' (below ฿1,400 min) → 28x.167 silently
  clears OUR auto-filled code when it can't apply; guest-typed codes still get
  the honest hint.
- The concierge FAB's expanded panel was an unreadable ghost — 82%-alpha
  --sr-panel floated bare over the photo grid (photos bled through, no scrim).
  28x.168: solid layered background + scrim, same treatment as 28x.161's
  greeting bubble. This was very likely THE chat-collapse cause.
Still owed / View's call:
- ALL builtin promo codes are admin-deleted (FIRST10/WELCOME20/TONIGHT500/
  VIP100/FREETAXI) → the ฿2,200 bestseller has ZERO working codes for real
  guests. Re-enabling VIP100 (฿100, premium-safe) is the one-switch fix —
  money decision, not made unilaterally.
- ADMIN_QUOTE_KM still 15; with honest fares now, 20 km is defensible.
- Re-check concierge_chat_open in ~1 week to confirm the fix moved the number.

**🪄 fx polish layer (28x.218, 2026-08-28) — heartitude effects, luxury-cut:**
Founder: "เอาลูกเล่นทั้งหมดไปปรับแต่งให้ sunred". Ported SELECTIVELY, not
wholesale — starfield/cursor-hearts/curtain-wave/HUD-brackets were left
behind on purpose (playful-studio register + §12 "less chrome" rules).
What shipped: `src/styles/fx.css` + `src/utils/fxReveal.ts` (site-wide
photo long-press/drag protection — privacy-first; link tap-highlight
silence; `.sr-reveal` scroll reveal on QuickNavRow/HomeFooterV2/HowItWorks
roots — therapist cards keep their own whileInView, never double-animate)
+ `RouteFx` in App.tsx (220ms opacity-only route fade, customer routes
only — opacity-only because a transform would re-anchor fixed children
like BottomNavGlass). Reveal is progressive-enhancement: hiding only
applies under `html.sr-fx` set at runtime, so the 79 prerendered SEO
routes / no-JS clients never see hidden content; IO reveal is backed by
a scroll+visibilitychange manual bounds check, and reveals write INLINE
style, not just a class (React reconciliation wipes classList-added
classes on MUI Boxes — learned the hard way in dev). Typecheck + build +
prerender pass. ⚠️ NOT visually confirmed in a live browser yet (the
embedded dev pane suspends rendering when hidden — IO/scroll/style-recalc
all freeze, untestable there); first real phone/browser look still owed.

**Open / not done:**
- ⚠️ **`claimBookingChat` may need one IAM grant on first deploy.**
  `createCustomToken` signs via IAM, so the functions' runtime service account
  needs the **Service Account Token Creator** role. If guest chat is silently
  invisible in production (the panel hides itself on any claim failure by
  design), check the function logs for `iam.serviceAccounts.signBlob` FIRST —
  it looks like "the feature didn't work", not like an error.
- Booking chat was NOT visually confirmed in a live browser — typecheck, build
  and the rules suite all pass, but nobody has watched a real message go
  guest → Telegram → reply → guest yet.
- ~~GitHub PR #12 a few commits behind local `main` — "not required"~~
  **That claim nearly cost us: see the 2026-08-14 rollback incident below.**
  GitHub main IS a live production deploy trigger (Vercel auto-builds every
  push to main). Local and origin must never be allowed to drift again —
  push after every committed round.

**🔥 2026-08-14 rollback incident (RESOLVED same night) — read before
trusting "it's deployed":**
- 16:57 a "Merge PR #20: admin money audit" landed on GitHub main (payslip
  promo absorption, abandoned-checkout payroll, promo capacity — genuinely
  good money fixes, authored in a parallel session against an OLD base) and
  Vercel auto-deployed it. GitHub main did not contain the 36 local-only
  commits (28x.156-HOTFIX → 28x.187), so prod silently rolled back ~2 weeks:
  the ฿450/10km fare curve, the ghost chat panel, the broken welcome-code
  autofill and the 1.78MB banner all came BACK during prime time. Rules +
  functions were untouched (they deploy via firebase, not Vercel) — the
  28x.165 security fix stayed live throughout.
- Same night: merged origin/main into local (clean; overlap only in
  CLAUDE.md, AdminBookingListPage, BookingFlowPage — commission.ts was
  origin-only and consistent with our promo-absorption rule), verified
  typecheck/build, pushed, verified the live bundle. Both workstreams
  survive; nothing was dropped.
- 28x.187 bonus find: the "emergency" Firestore fare override we reached for
  first (adminSettings/publicRules.motoFareCheckpoints) had NEVER worked —
  Firestore rejects nested arrays, so every write of the [km,thb][] shape
  (admin Save included) failed since 28x.99u. Now stored as {km,thb} maps
  with a serialize/deserialize codec in taxiFare.ts.

**⭐ Review-consistency overhaul, same night (28x.188-191) — founder:
"รีวิว หน้าเว็บ ไม่ตรงกัน สักอัน" (2nd time filing this; 28x.1 was round 1).
FOUR stacked causes, all fixed + verified live as an anonymous guest:**
1. Card showed the doc's Bayesian rating, review section showed the raw
   mean of visible reviews — mismatched on every low-review practitioner.
   One formula everywhere now (bayesianRating over written reviews).
2. Card counted star-only ratings; the visible list only holds WRITTEN
   ones. One definition now: review = rating + non-empty reviewText.
3. The live review query is permission-denied for logged-out guests
   (booking docs carry guest PII — deliberate). Every guest saw "No
   reviews yet." under a header claiming N reviews. Sync now denormalizes
   a PII-free newest-40 copy onto the public therapist doc
   (`publicReviews`); TherapistDetailPage falls back to it
   (effectiveReviews) when the live query has nothing.
4. The Bayesian prior existed in 4 places with 2 values (rating.ts +
   2 inline copies = 4.5/10 vs sync script = 4.6/3). rating.ts (4.6/3,
   the 28s388 tuning) is now the only owner; everything imports it.
- ⚠️ scripts/syncTherapistRatings.ts NO LONGER writes totalSessions —
  bookings is not full history (~78 docs deleted Aug 2026), so re-deriving
  would slash public counts (dry run showed Barbie 79→36, Vivian 77→11,
  YaYa 55→2). Public session counts stay as-is (boosted-display model).
- ✅ NO LONGER MANUAL (28x.194, 2026-08-15): `onBookingWriteSyncReviews`
  (functions/src/index.ts, deployed asia-southeast1) recomputes the affected
  therapist's rating/ratingRaw/reviews/publicReviews on any booking write
  that can move her review aggregate — same definitions as the script, and
  it NEVER writes totalSessions. Verified live: a review-text edit reached
  the therapist doc in ~3s, and the doc's Bayesian rating matched a local
  recompute. The node script + /admin recompute stay as audit/backfill
  tools. The Bayesian prior is MIRRORED there (functions can't import
  src/) — retune rating.ts and the function's constants together.

**📱 SunRed is now an installable app (28x.192, 2026-08-15) — PWA strategy,
by decision:** app stores don't accept this vertical (rejection + dev-account
ban risk under real identity), so installed-PWA IS the app. 28x.166 shipped
manifest+icons; 28x.192 shipped the service worker (vite-plugin-pwa,
autoUpdate + skipWaiting so a deploy takes over on the guest's next
navigation — no stale clients) and the InstallAppBanner on home (Android:
real install button via beforeinstallprompt; iOS: Share→Add-to-Home-Screen
hint; 6 locales; 14-day snooze on dismiss). Precache = first-paint shell
ONLY (20 files/1.6 MB — the first attempt globbed all 224 chunks incl. the
admin exceljs bundle and made every guest download the admin app on mobile
data; don't widen the globs). Practitioner photos runtime-cache CacheFirst.
Firestore/Auth/Functions are deliberately unmatched by any cache rule.
Verified live: SW activated + controlling, all 5 caches populating.
NEXT STEPS when View wants them: guest-side push (promos), then optional
Android APK wrap (TWA) distributed via Telegram.

**🔔 Admin push alerts shipped 28x.193 (2026-08-15) — ⚠️ TWO SETUP STEPS
STILL OWED (View's actions, in order):**
1. Run `node scripts/setWebPushKeys.mjs` once (generates + stores the
   VAPID pair in adminSettings/webPush — the permission classifier blocks
   Claude from handling key material, so this one is hers).
2. On her phone: open sunred.vip/admin (installed PWA on iPhone —
   Add to Home Screen first, iOS only exposes push to installed PWAs),
   tap the crossed-bell in the admin AppBar, allow notifications.
Then every guest-side booking pings every enabled device.
Architecture: raw Web Push (NOT the FCM SDK — no console certificate);
notifyAdminPushOnBooking (deployed, asia-southeast1) reads
adminSettings/webPush + webPushSubs (both behind isAdmin()), skips
admin-hand-entered bookings, prunes dead subscriptions. Push handlers in
public/push-sw.js ride the main Workbox SW via importScripts. Until step
1 runs, the function logs "no VAPID keys yet" and exits — harmless.

**🎉 Anniversary campaign ENDED by founder 2026-08-14 ("ปล่อยจบ ลบออก"):**
`anniversary.enabled=false` in adminSettings/publicRules
(scripts/endAnniversaryCampaign.mjs). Do NOT delete the field — absent
config falls back to code DEFAULTS which are enabled:true. 28x.189 fixed
the deeper bug: NOTHING ever gated the banner (it would have outlived its
own endISO forever) — AnniversaryBanner + PromotionsPage now gate on
anniversaryIsLive() with a live subscription (useAnniversaryConfigVersion).
- Google Search Console — ✅ VERIFIED (discovered 2026-07-23: the
  owner-only "Search performance for this query" card renders on
  Google SERPs while logged in as sunredbkk@gmail.com — brand query
  "sunred massage" = 127 clicks / 160 impressions / avg pos 1.2 over
  90 days, clicks +105%). Also discovered the same day, NOT yet
  explained: 3+ Google Business Profile listings named
  "SunRed massage"/"Outcall massage SunRed" at different Bangkok
  addresses (5/4 Sukhumvit · Times Square 246 Sukhumvit · 61 Rama 9
  Soi 5, ~6 map pins citywide), all Website→sunred.vip, one with a
  5.0★ public review — origin unknown (View to confirm whether she
  created these; the §"🚫 GBP do-not-verify" rule concerns public
  guest reviews, and one public review already exists). Don't touch
  the listings without her call.
- `/admin/staff-requests` (gallery photo approval queue) shipped and
  passed typecheck/build/rules-tests, but was never visually confirmed
  live in an actual admin browser session — worth a first real look.

**Security follow-ups still owed:**
- **App Check is still off** (`enforceAppCheck: false`, functions/src/index.ts).
  Booking create is deliberately open to logged-out guests and rules cannot
  rate-limit — 28x.107 bounded the SIZE of each write but not the RATE. A
  scripted flood of small fake bookings is still possible. App Check needs a
  reCAPTCHA v3 site key registered in the Firebase console (View's action),
  then the client SDK init, then flipping enforcement on. This is the last
  real gap and it maps directly to her "คู่แข่งแกล้ง" worry.
- **Orphan admin doc**: `admins/mZylmnzdkBapBupYdDbVnqt9G3E3`
  (`soulease.team@gmail.com`) has NO Firebase Auth account behind it —
  a leftover admin grant from the pre-rebrand era. Harmless today (an
  admin doc with no login grants nothing), but it should be deleted so the
  admin list means what it says. Not deleted without View's call.

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

- **The /near-me taxi widget defaults to the BESTSELLER, not the cheapest
  service (28x.111) — do not revert to a "from ฿1,200" floor.** Founder's
  concern: showing the cheapest service (Thai ฿1,200) as the anchor trained
  guests to expect the floor, so the ฿2,200 Gentleman's bestseller read as
  expensive and menu revenue leaked. The widget now shows a service PICKER
  and pre-selects the practitioner's most premium option (bestseller if she
  offers it, else her dearest). The guest can still tap down. The chosen
  serviceId is carried into the booking flow. If a future session is tempted
  to "simplify" back to a single from-price, keep the picker + bestseller
  default — it's a deliberate up-menu revenue choice, verified live.
- **PromiseStrip was retired 28s148 — do not resurrect.** Original
  rule (28s99): closing reassurance belonged at the BOTTOM of HomePage,
  never the top, because SunRed traffic is pre-warmed (TG channel,
  referrals, taxi cards). By 28s148 the component was removed entirely
  (not just unmounted — the file is deleted). The generalisable lesson
  survives: pre-warmed traffic doesn't need above-the-fold trust
  selling. If a future session is tempted to add ANY new "trust
  pillar strip" component, remember the reason.
- **HomePage above-the-fold = the actual product (therapist list)**,
  not pre-product chrome. Removed in session 28s140-145: Hero
  (greeting + service strip), DAYTIME pill, OUR SERVICES eyebrow,
  SocialProofTicker, ReserveCTA. Default to LESS chrome.
- **Don't add visible status indicators twice for the same state**
  (e.g., Holiday badge on photo + "Offline" pill in card corner).
  Pick one. Audit #5, fixed 28s146.
- **HomeMapBrowse now lives on /near-me (moved 28s335) — don't try
  to restore it to home.** The original rule (28s149) was "map stays
  on home." That direction flipped in 28s335: the map is behind the
  QuickNavRow tile → `/near-me` page. Guests still get it in one tap
  (which was the point), while the home page stays product-first
  (therapist list). The generalisable lesson survives: don't remove
  product surfaces just because we lack engagement data — ask View
  first. But the specific claim that the map belongs on `/` is stale.
- **React key duplication cascade → Firestore INTERNAL ASSERTION
  (r77).** Never key a `.map()` on a field that can accidentally
  coincide across items (e.g. `item.path` in a nav array — two
  sibling nav items both anchored to `/services` blow up React's
  child reconciler, which in dev+StrictMode then corrupts the
  Firestore listener registry and surfaces as "INTERNAL ASSERTION
  FAILED"). Prefer `item.labelKey` or a UUID that's guaranteed
  unique regardless of downstream edits to the array.
- **A Firestore rule that caps field count/size on a real write path
  must be measured from the actual payload, never guessed (28x.107→
  28x.116).** `isSaneBookingPayload`'s `d.keys().size() <= 60` shipped
  28x.107 with a comment claiming it was "~10x the largest real
  booking observed" — the real `BookingFlowPage.tsx` addDoc() payload
  is 73 keys, so the cap silently rejected EVERY non-admin (real
  customer) booking create from the moment it deployed. It went
  undetected because admin-created bookings bypass the check via
  `isAdmin()`, and the rules test suite's "realistic booking" case
  only carried ~15 hand-picked fields while claiming to be "the exact
  document the live booking flow writes." Caught only via a founder
  screenshot of a guest whose checkout wouldn't complete. Fixed 28x.116
  (cap raised to 100 + the test now mirrors the real 73-key payload
  field-for-field). Lesson: when a rule bounds a real write's shape,
  `grep` the actual call site and count for real — don't estimate, and
  don't trust a "realistic" test fixture without diffing it against
  the live payload it claims to represent. See [[sunred-rules-verification]]
  memory for the full incident writeup.
- **A status engine is only as live as the field it reads — and `?? "default"`
  in code is NOT a stored value (28x.160).** The public "is she free" engine
  (`calculateTherapistStatus`) reads `activeBooking`/`busyUntil`, which are
  written only from bookings matching `dispatchState in (…)`. But NOTHING wrote
  `dispatchState`: not booking creation, and not any of the three accept paths
  (Telegram ✅ / open-job channel claim / in-app callable) — they set
  `therapistResponse`, which that engine never reads. `advanceJobStatus`'s
  `b.dispatchState ?? "assigned"` made the field look present in code while it
  was absent in Firestore, and `where("dispatchState","in",…)` cannot match a
  missing field. Second gap in the same list: `"enroute"` was omitted, so the
  first button she taps after accepting (🚗 ออกเดินทาง) moved her back OUT of
  busy for the whole drive. Net effect: an accepted practitioner kept
  advertising herself as AVAILABLE — a live double-booking risk, caught only
  by a founder screenshot ("Vivian รับงานแล้ว แต่ สถานะไม่เปลี่ยน"). Lesson:
  when a displayed state is derived from a query, grep for who actually WRITES
  the queried field, and don't trust a code-level default as evidence it exists.
  The two duplicate copies of that state list are now one function
  (`collectBusyTherapists`) — the old comment already admitted they "disagree".
- **Never freeze a DERIVED field — freeze only the input it's derived from
  (28x.161).** 28w.43 froze `therapistShare` + `shopShare` onto a booking at
  confirm-time so a later split-table edit couldn't move a confirmed job.
  Freezing `therapistShare` was right (it IS the payout — real, independent
  data). Freezing `shopShare` was not: it's a pure residual,
  `(servicePrice − discount) − therapistShare`. The edit drawer writes
  `discountAmount` long after confirm and never re-stamps, so a promo keyed on
  the slip left the residual holding the full pre-discount base — and the
  therapist got billed for the shop's promo, exactly contradicting this file's
  own "promo absorbed by the shop" rule. Vivian's 7–31 Aug payslip asked her
  for ฿2,100 instead of ฿1,900; caught only by a founder screenshot. It hid
  because the SAME page disagreed with itself — AdminReportPage's Shop Take
  aggregate derives `base − pay` and read the right number, while the payslip
  below it read the stamp. `shopShareFor` now always derives; the field is
  still written for the Excel export but never trusted on read, so no
  migration was needed. Lesson: if a stored field can be recomputed from other
  stored fields, recompute it. A frozen copy only buys you a way to disagree
  with yourself later.
- **A new enum value in code isn't live until every allow-list that
  gates it is updated too (28x.99).** `analytics.ts`'s `FunnelEvent`
  type grew `therapist_view`/`bundle_view`/`bundle_reserve_click`/
  `referral_tier_applied` over several rounds, but `firestore.rules`'
  `analytics_events` create rule — a separate hardcoded list — never
  did. Every write for those four event types silently permission-
  denied from the day each shipped (swallowed by `trackEvent`'s
  `.catch()`), so a dashboard card read a confident "0 · no data yet"
  for months instead of an error. When a type/enum is added anywhere
  that firestore.rules also validates by exact value (event names,
  status enums, etc.), grep the rules file for that list and update it
  in the SAME round — don't trust "it'll show empty until data arrives"
  as proof nothing's wrong.
- **A local-only commit is one GitHub merge away from being erased from
  prod (2026-08-14 incident, §9).** Vercel production builds from GitHub
  main on every push; any session that merges a PR there deploys whatever
  main holds AT THAT MOMENT. If local rounds weren't pushed, that deploy
  silently rolls prod back — and it looks like "the site is buggy", not
  like a rollback (it resurrects bugs that were already fixed, verified
  and documented as fixed). Discipline: `git push` right after the
  round's commit (same breath), and any session that starts by auditing
  prod must FIRST diff local main vs origin/main before trusting either.
  Also: two sessions numbering rounds independently collided (both minted
  28x.161-163 with different content) — check `git log --all` before
  taking the next round number.

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

### 🔐 Trust + customer-acquisition playbook

Moved to the `trust-acquisition-playbook` skill (loads on demand instead
of every session) — see `.claude/skills/trust-acquisition-playbook/SKILL.md`.
Load it whenever View asks how to get more trust/customers/reviews, or
proposes a new acquisition idea that needs checking against the
privacy-first rules.

### 🎨 Theme palette — MOKO restyle (Round 28s378-384, CURRENT on home)

Founder direction 2026-07-11: "อยากเปลี่ยนธีมใหม่ เหมือน mokofans.com …
จัดเต็มรวม banner + header · Moko แท้ (มาเจนต้า/ชมพู)". The home surface
(banner + discovery header + therapist cards + nav drawer active state)
now uses the Moko magenta/pink palette **with gradients** — this
deliberately supersedes the flat-red "no gradients" rule below for the
customer home. Quiet-luxury COPY is unchanged (Moko's look, not its
crude wording).

```
Magenta       #E6197E   Moko primary — active tabs · book CTA · accents
Magenta txt   #C2185B   readable magenta for text/icons on light
Price red     #E4002B   ราคาเริ่มต้น price numerals
Green         #16A34A   ว่าง / on-standby status
Blush pill    #FCE7F0 / #FCEAF2   tag pills · rating chip bg
Plum          #5A2733   notice-marquee text
NEW badge     linear-gradient(135deg,#FFB020,#EC4899)
Book button   linear-gradient(135deg,#F050A0,#E6197E)
Promo banner  linear-gradient(120deg,#EC4899,#B052C4,#8B5CF6)
```

Moko components: `MokoDiscoveryHeader` (location + notice + filter tabs =
the Moko "header band"), `MokoPromoBanner`, `TherapistMinimalCard`
(magenta CTA · red price · tag pills · rating chip). NOTE: the top-nav
was NOT structurally Moko-cloned — search lives in the grid, location in
the discovery band, and the manual language switcher was removed in
28s168 (device-locale auto-detect); only the drawer active accent was
shifted to magenta (28s384) for coherence.

<details><summary>Pre-Moko flat palette (Round 28s150-152) — superseded on home, still used elsewhere</summary>

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
</details>

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

