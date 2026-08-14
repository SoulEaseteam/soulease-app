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

**Pricing (THB) — Round 28w.36, explicit per-duration, NOT a multiplier:**
- `xSR-Thai` Thai Massage — 1,200 / 1,600 / 2,000 (60 / 90 / 120min)
- `SR-Aroma` Aromatherapy — 1,400 / 1,800 / 2,400 (60 / 90 / 120min)
- `SR-HJ2200` Gentleman's Signature (Aroma + HJ release) — 2,200 / 3,000 (70 / 120min — no 60/90 tier)
- `SR-B2B3200` SunRed Therapeutic (B2B/nuru genre) — 3,200 / 4,000 (70 / 120min — no 60/90 tier)
- ⚠️ The old "90min = base × 1.5 · 120min = base × 2.0" multiplier rule
  is DEAD — 28w.36 replaced it with the explicit numbers above. This
  file listed the dead multiplier for weeks after the change, and
  @SunRedGreeterBot's hardcoded FAQ copy silently drifted from real
  pricing as a result (caught + fixed 28x.82 from a founder screenshot).
  If you change prices again: update `src/utils/servicePricing.ts`
  DURATION_PRICE_OVERRIDES, THIS block, AND
  `functions/src/telegram-concierge-bot/faq.ts` PRICING — all three,
  every time.
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
- **i18n**: 6 languages (en, th, zh, zh-TW, ja, ko) in `src/locales/` —
  zh-TW (Traditional, Taiwan/HK/Macau) added 28x.99f as its own bundle,
  not an alias of zh (Simplified). URL prefix `/zh-tw`. The promo/
  broadcast Telegram bot (scheduled channel posts) deliberately does
  NOT support zh-TW — see §9.
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
  its own; reason #2 is View's call to make, present both. If that
  reminder has already fired by the time you're reading this, check
  whether View acted on it before repeating the analysis.

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

## 9. Current state (2026-07-21, updated Round 28x.99f)

**zh-TW (Traditional Chinese) locale shipped.** Founder asked for a real
market-data-backed target ("หาตลาดคนจีนกำลังจ่ายสูง") — research showed
China is the clear #1 target (already fully built: zh locale + WeChat
Pay) but flagged that Taiwan/HK/Macau (zh-TW device locale) was silently
falling back to Simplified content the whole time, per a deliberate
28-something decision documented in i18n.ts ("covers tw users via
i18next fallback"). Founder chose the full build over the cheaper
"homepage-only" option, so it now touches EVERY layer:
- `src/locales/zh-TW/translation.json` — full 677-key Traditional
  translation (not a character conversion — 上门→到府 etc, Taiwan
  register)
- `src/data/districts.ts` + `scripts/prerender-routes.mjs` — zh-TW
  district/service/pricing copy, kept in sync per the file's own
  comment
- `src/data/reviewTemplates.ts` — zh-TW review templates + phone-prefix
  detection (+886/+852/+853 now route to zh-TW, not zh)
- Concierge bot (`functions/src/telegram-concierge-bot/*`) — zh-TW
  greetings/FAQ, routes to the same `@YuNiSpaBkk` handle as zh
- `public/sitemap.xml` — 22 new zh-TW URLs + hreflang entries
- i18n.ts detection: `load` switched from `"languageOnly"` to
  `"currentOnly"` + `nonExplicitSupportedLngs` — this was a REQUIRED
  change, not cosmetic; `"languageOnly"` unconditionally strips every
  region code including zh-TW's, so it would have kept silently
  collapsing to zh no matter what else shipped

**Deliberately NOT done — a real decision, not an oversight:**
- The promo/broadcast Telegram bot (`telegram-post-bot/*`, scheduled
  channel posts) does NOT support zh-TW. `@manguyujianniSPA` is a
  dedicated mainland-CN sub-brand channel — posting Traditional Chinese
  there would mismatch its actual subscriber base. A Taiwan/HK channel
  is a real new acquisition-channel decision for the founder to make,
  not a code default. `GREETER_LANGS` (6, concierge) and `PROMO_LANGS`
  (5, broadcast) are intentionally separate lists in
  `getTelegramBotCopyPreview` (functions/src/index.ts) — don't merge
  them without that decision being made explicitly first.
- The 32-vs-14 therapist-bios task from the original brief **could not
  be completed — the premise didn't match live data**. The live
  `therapists` Firestore collection has 14 docs (matches CLAUDE.md's
  "12 on roster" note more than "32"), and **none of them have any
  `bios.*` field populated** (all null or `{}`). `generate-bios.ts`
  (the Gemini-based multi-language bio generator) appears to have
  never actually been run against production, or its output was never
  written back. There is no Simplified-Chinese bio text anywhere to
  translate zh-TW FROM. Nothing was written to Firestore. If bios are
  wanted, `generate-bios.ts` needs to run first for all 5 original
  languages, THEN a zh-TW pass can genuinely translate from real
  `bios.zh` content — flag this to the founder, don't just re-attempt
  it silently next session.

**Staff app** now has 3 tabs (Home · Jobs · Profile). Home is a quick-menu
grid (Reports, Performance, Gallery, Services, Features, Languages, Bio,
Payout) topped by a shared identity card (`TherapistIdentityCard` +
`useTherapistIdentityStats`, also used on Profile — same source, can't
drift). Working Status + Working Hours (Wed/Sun-only, UI-enforced not
rules-enforced) live on Profile. New self-service surfaces: gallery
uploads go through a `galleryRequests` moderation queue reviewed at
`/admin/staff-requests`; Payout Account is self-editable (was admin-only)
with a Telegram alert to admin on every change as a safety net.

**Telegram bot copy** (Greeter welcome/button/nudge/FAQ, Promo Bot's 7-day
rotation + 5 holiday themes + shared footer) is now Firestore-backed and
self-editable from `/admin/telegram` → "Bot Copy" — Firestore is an
override layer the bots check first, code is the fallback, so an empty
`botCopy` collection sends byte-identical messages to before. Full-message
previews are collapsed by default there (keep it that way — see 28x.98).

**Analytics** (`/admin/analytics`) no longer counts admin/therapist
sessions browsing the real site (was counting founder's own testing +
"Viewing as Customer" mode as guest traffic). Traffic-source attribution
now prefers an explicit `?utm_source=`/`?src=` tag over referrer-guessing
— use it for any TikTok/LINE/Telegram link since those in-app browsers
often don't send a usable `document.referrer`.

**💬 Booking chat shipped — Round 28x.140 (2026-07-29)**

Founder: "ต้องจองแล้วเท่านั้นถึงจะแชทกับพนักงานเพื่อคอนเฟิร์มออเดอได้". Until
now the only "chat" was `AdminFloatingChat` — a set of deep links OUT to LINE/
WhatsApp/WeChat/Telegram. A guest who uses none of those had no way to reach
anyone from inside the site, right after committing to a booking.

The thread is a subcollection of the reservation (`bookings/{id}/messages`), so
"has booked" isn't a flag anything checks — it's the only address a message can
have. Three surfaces, one component (`src/components/chat/BookingChatThread.tsx`):
- **Guest** — `/booking/success/:id?t=…`. It shipped below the concierge
  deep-links; 28x.153 then moved it INTO the 2×2 quick-action grid, where the
  "Chat with {name}" tile (previously a Telegram redirect) toggles the thread
  inline. 28x.152 added Grab-style one-tap quick-reply chips — those send
  through the same `send()` and the same 4-key payload, so they needed no rules
  change (verified against the diff, not just the commit message).
- **Practitioner** — `/therapist/jobs`, a "แชท" button per ACCEPTED job (same
  masking rule as her address/phone: no contact before she accepts).
- **Concierge** — the `/admin/bookings` detail drawer, so View can actually
  REPLY (Telegram only notifies her; it can't answer a thread).

How guest identity works — read before touching it:
- A guest is signed out. `claimBookingChat` (functions/src/index.ts) verifies the
  same `accessToken` capability `getBookingPublic` uses and exchanges it for a
  **custom token** carrying `bookingChat: <bookingId>`. Rules read that claim;
  the secret never reaches Firestore.
- That token signs into a **SECOND Firebase app** (`src/lib/bookingChat.ts`), not
  the primary one — otherwise opening a guest link would sign a practitioner or
  View out of her own session. One Auth instance per app is a Firebase limit, so
  the second app IS the mechanism. Don't "simplify" it away.
- Staff use their normal session; `therapistUid` (uid-to-uid, 28x.66) is the match.
- `onBookingChatMessage` pings the Telegram report channel + the practitioner's DM
  on GUEST messages only, and maintains `bookingChatMeta/{bookingId}` — one
  summary doc so the job list's unread dot is ONE query, not a listener per job.
  It deliberately does NOT write to the booking doc (that would re-trigger
  onBookingWriteSyncStats + syncTherapistDailyCount on every "hi").
- 25 new rules tests in `tests/rules.test.mjs` (98 total, all passing) cover the
  claim being scoped to one booking, sender-label forgery, immutability, and the
  exact client payloads. The message payload is pinned by `keys().hasOnly()` —
  **adding a field to a message without updating the rule silently breaks every
  send** (the 28x.116 failure mode, again).
- Kill switches, both default ON, on `adminSettings/advanced`:
  `bookingChatEnabled` (whole feature) and `bookingChatTherapistEnabled`
  (practitioner side only — flip false and the thread stays open with the
  concierge alone). They exist because a direct guest↔practitioner line is also
  how a repeat booking could get arranged off-platform; View is in every thread.

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
- GitHub PR #12 (`claude/bot-copy-and-staff-self-service`) is a few
  commits behind local `main` — not required (she deploys direct via
  vercel/firebase), just not fully synced if anyone goes looking there.
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

**📝 SEO blog shipped — Round 28x.108 (2026-07-24)**

`/blog` (The SunRed Journal) is live: 5 English articles targeting top-of-
funnel "which service / what are my options" queries (choosing a service,
Singaporean guide, after-flight recovery, late-night options, business-trip
recovery) — the earlier, less-contested intent the money pages don't cover.
Founder direction was "เจาะทุกกลุ่ม" (all segments), so the Singaporean/
business-traveller pieces are included even though that audience skews
one-time-tourist (see §6 Sammyboy note — same customer-mix caveat applies if
judging these by traffic alone).

How it's wired (so you don't re-derive it):
- **Content source of truth = `SEO_Blog_Pack/*.md`** (the drafts that sat
  unused for weeks). `scripts/buildBlogData.mjs` parses them → the committed
  `src/data/blogPosts.mjs`. BOTH the React pages (`Blog{Index,Post}Page`) and
  the crawler prerender import that ONE module — no drift.
- **To add / edit an article**: edit the markdown, run `npm run build` (or just
  `node scripts/buildBlogData.mjs`) locally, commit the regenerated
  `blogPosts.mjs` + `public/sitemap.xml`, deploy. The generator also rewrites
  the sitemap's `<!-- BLOG:START/END -->` block, so a new article needs no
  separate sitemap edit.
- **⚠️ SEO_Blog_Pack is .vercelignore'd** (marketing files aren't build
  inputs), and Vercel materialises an EMPTY `SEO_Blog_Pack/` dir. So on Vercel
  the generator finds 0 articles and **must** no-op, consuming the committed
  `blogPosts.mjs`. It guards on the article COUNT for exactly this — do NOT
  change that guard to `existsSync`, and never let it write an empty result
  (28x.108b/c: an existsSync guard shipped a blank /blog to prod once).
- Each article prerenders a crawlable shell: unique title/description,
  BlogPosting JSON-LD, and the FULL article HTML (tables included) in
  `<noscript>`. Real `<a href="/blog">Journal</a>` in the home footer for
  crawl discovery.

**🔐 Security posture after Round 28x.107 (2026-07-24 audit)**

Founder asked point-blank: "เว็บเรา มีการป้องกันอะไรบ้าง หากถูกเจาะ หรือ
โจมตี". Four holes were found and closed the same night — see the 28x.107
commit for detail. What matters going forward:

- **Auth model is now claim-based, not collection-based.** `role`
  ("admin" | "therapist" | "customer") and `tid` (the therapist DOC id)
  ride inside the ID token. `storage.rules` reads them directly;
  `firestore.rules` still uses `exists(/admins/$(uid))`, which is fine
  there — Firestore CAN do that read, Storage cannot.
  ⚠️ **Never** reintroduce `firestore.exists()` into storage.rules. It was
  tried in 28s280 and silently denied every real admin upload (28s281).
  The claim is the workaround, not a preference.
- `syncAdminClaim` (trigger on `admins/{uid}`) keeps the claim honest even
  when an admin is added by hand in the Firebase console. If you add a new
  way to grant staff status, you do NOT need to call anything — but you DO
  need the write to land in `/admins`, or the claim never updates.
- `scripts/backfillRoleClaims.mjs` is idempotent — re-run it (dry run
  first, no flag) any time claims look stale.
- Two test suites now guard rules changes. Run BOTH before deploying rules:
  - `npx firebase emulators:exec --only firestore --project soulease-spa "node tests/rules.test.mjs"` (73 tests)
  - `npx firebase emulators:exec --only storage --project soulease-spa "node tests/storage.rules.test.mjs"` (19 tests)
  - Both need `PATH="/opt/homebrew/opt/openjdk/bin:$PATH"` prefixed.
- `telegramWebhook` verifies `X-Telegram-Bot-Api-Secret-Token` and **fails
  closed**. If the bot ever goes silent after a deploy, check that first:
  `node scripts/setTelegramWebhook.mjs` shows Telegram's side. Re-registering
  must happen BEFORE deploying new code, not after — the order is in that
  file's header.

**⭐ Review links shipped — Round 28x.165 (2026-08-14) · ONE ACTION OWED**

Founder: "เรื่องส่งลิ้งให้ลูกค้ารีวิว ทำได้ไหม". Shipped: anonymous link-based
guest reviews (see §12 for the two durable rules). Deploy order matters:

1. `firebase deploy --only firestore:rules,functions` — the rules add
   `reviewsPublic`, and the new `submitBookingReview` +
   `onBookingWriteSyncPublicReview` must exist before the page can be used.
2. **`node scripts/backfillPublicReviews.mjs` (dry run first, then `--apply`)**
   — ⚠️ **REQUIRED, not optional.** The mirror trigger only fires on future
   writes, so until this runs, `/reviewsPublic` is empty and the site shows
   ZERO reviews — including every review that already exists. Needs
   `scripts/serviceAccountKey.json`.
3. Deploy the frontend.

Not visually confirmed in a browser (this container has no project
credentials): nobody has yet watched a real guest open a review link, submit,
and seen the stars land on a practitioner's card. Worth one real end-to-end run
on a completed test booking.

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
- **Public reviews live in `reviewsPublic`, NEVER in `bookings` (28x.165).**
  Reviews are authored as `rating` + `reviewText` on the booking doc, but the
  public surface reads a redacted mirror: `reviewsPublic/{bookingId}` =
  therapistId · rating · text · serviceName · duration · createdAt, written
  ONLY by the `onBookingWriteSyncPublicReview` trigger (`allow write: if false`
  for every client, View included — a world-writable review doc is the
  "คู่แข่งแกล้ง" fake-review vector). Why it exists: 28w.91 removed anonymous
  `allow list` on `bookings` after verifying against production that the public
  review listener was returning real guests' **addresses, phone numbers and
  GPS** (a LIST hands back whole documents). Right call — but its own comment
  said "see /reviewsPublic below" and that collection was never built, while
  `useTherapistReviews` kept querying `bookings`. Net effect: **reviews were
  invisible to every logged-out visitor from 28w.91 until 28x.165**, and it
  never looked like a bug — the hook catches permission-denied and renders the
  same empty list as "no reviews yet". If reviews ever look empty again, check
  the browser console for that warning FIRST. Run
  `node scripts/backfillPublicReviews.mjs` (dry run, then `--apply`) after any
  bulk review edit made outside the app.
- **Guest reviews are anonymous BY STRUCTURE, not by discipline (28x.165).**
  `/review/b/:bookingId?t=<accessToken>` — the concierge copies it from the
  booking drawer ("Copy review link", shown only on completed jobs that aren't
  rated yet) and sends it privately. **The link is a bearer credential**: never
  post one to a channel, and any page whose URL carries a token must pass
  `noIndex` to `useDocumentMeta` or the hook copies the full href — token and
  all — into `<link rel="canonical">`. `submitBookingReview` verifies the token
  server-side (same capability as `getBookingPublic`/`claimBookingChat`),
  requires status completed/done, allows one review per booking, and writes no
  identity field at all. Don't add one: the deleted `/review/:id` page published
  `userName: user.email`, and `ReviewListPage` rendered `userName ?? userEmail`
  as the public byline — both were live guest-identity leaks in the middle of a
  §🔐 playbook whose whole premise is that guests stay anonymous.
- **An admin control that writes a field nobody reads is invisible failure —
  grep for the READER before trusting a settings UI (28x.164).** The founder
  reported "ป้าย New ไม่ขึ้น" (2026-08-14). `/admin/therapists/:id` has shipped
  a **"Badge" dropdown** (None/VIP/HOT/NEW) since 28s284 writing
  `therapists.badge` — and **nothing in the entire codebase ever read that
  field**. The engine (`getTherapistBadge.ts`) and the card
  (`TherapistMinimalCard`) both read `badgeKey`. So every time she picked NEW,
  the save succeeded, the toast said saved, and the chip never appeared. Same
  family as the 28x.160 `dispatchState` bug (a field nobody wrote) and 28s275's
  `customId` note ("looks settable, does nothing") — the third instance of this
  class. Secondary: `badgeUpdatedAt` was also never written by anything, so the
  engine's entire "admin set a badge by hand" branch was dead code, and the
  28r66 hotfix only ever fixed the *rendering* half of the same bug.
  Fixed 28x.164 — the pin now lives in `badge` + `badgeSetAt` and **wins over**
  the automatic badges (same founder principle as statusOverride at 28x.106b:
  "ถ้าไม่ใช่ auto ก็ทำงานตามคำสั่ง"). Lesson: when adding or auditing any admin
  settings control, grep for a READER of the exact field name it writes — a
  successful save is not evidence the setting does anything.
- **Badges last 48h from when they were earned/set (28x.164).** Founder: "Badge
  อื่นๆ ต้องอยู่ 48 ชม". Before this, auto badges (HOT 2 / VIP 3 / TOP_RATED 4
  jobs — the 28x.100 thresholds, unchanged) died at the 06:00 BKK business-day
  rollover with the `todayBookings` counter: 4 jobs on a Friday night, TOP STAR
  gone by 6am Saturday. `syncTherapistDailyCount` now also stamps
  `badgeKey`/`badgeUpdatedAt` so the engine carries an earned badge the full
  48h. ⚠️ Two traps if you touch this: (1) `NEW_WINDOW_MS` used to be
  `21 * BADGE_TTL`, so bumping the TTL 24h→48h would have silently changed "new
  practitioner" from 21 days to 42 — `DAY_MS` and `BADGE_TTL` are now separate
  constants, keep them that way. (2) The manual pin and the auto badge live in
  DIFFERENT fields on purpose: the Cloud Function overwrites `badgeKey` on
  every booking write, so an admin pin stored there would be wiped by her next
  job. `npm run test:badge` (tests/badge.test.ts, 22 cases) guards all of it.
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
2. **Anon-friendly directory listings** — `secretthai`, `bangkok101.net`,
   `eros guide`. Reviewers are anon nicks by convention in these
   spaces. (⚠️ Confirmed 2026-07-22: `Stickman Bangkok` and `Lookpasi`
   were never actually used — this list was a research suggestion,
   not real history, don't cite them as tried tactics. `Sammyboy /
   Samsguide` WAS real — billed every 2 months at ฿15,200, paused on
   cost, see §6
   "Paused channel" for real performance data before deciding
   whether to relist. Treat #7 below the same way.)
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

7. ~~**Stickman weekly column pitch**~~ — founder confirmed 2026-07-22
   she has never used or heard of Stickman Bangkok; this was an
   untested research suggestion, not a real tactic in progress. Drop
   it from active planning unless picked up fresh.
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

