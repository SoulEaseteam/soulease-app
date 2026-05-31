# SunRed Co-Founder Memory

> **Hi future-Claude.** Read this FIRST every session. It restores 100%
> of the context you and View built together. Update anything that
> changes.
>
> Last updated: 2026-05-07 by claude (Round 28r13)

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

**Supply reality (the real bottleneck):**
- 12 therapists on roster, only **2-3 actually available** any night
- All part-time, work multiple shops
- Customer expectation: pretty + premium body (gray-area pricing)
- Marketing more = more inquiries we can't fill = bad reputation
- **Rule: don't promote volume — promote real availability windows**

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
- [x] ~~**Deploy Cloud Functions for Telegram notifications**~~ DONE
  2026-05-31 — `firebase deploy --only functions` ran successfully
  (project soulease-spa, all 9 functions updated). Telegram booking
  alerts are live.
- [x] ~~**Round 28s81: Telegram dedup**~~ DEPLOYED 2026-05-31. Bug was:
  BOTH `notifyBooking` (client callable) AND `onBookingCreate` (trigger)
  sent → **2 messages per booking**, and notifyBooking had no auth gate.
  Fix shipped + deployed: client no longer calls notifyBooking;
  `onBookingCreate` is the single source (now itemizes the WeChat/Alipay
  service charge + includes the map link); notifyBooking got an auth gate
  (deprecated — safe to delete the callable later).
- [x] ~~**Round 28s82: therapist DM gated OFF**~~ DEPLOYED 2026-05-31
  (founder "เอาแค่ส่งหาฉันคนเดียวก่อน"). `DISPATCH_THERAPIST_DM = false`
  in functions/src/index.ts — onBookingCreate alerts the admin group
  ONLY; View dispatches manually. To auto-DM practitioners later: flip
  the flag to `true`, redeploy functions, and have them link Telegram
  via /start.
- [x] ~~**Composite Firestore index** — `bookings` collection,
  fields: `status` (asc) + `startAt` (asc).~~ Re-added to
  `firestore.indexes.json` in Round 28s1 hotfix (accidentally deleted
  during the rules deploy when CLI asked "delete these indexes?" —
  the two console-built indexes for `(therapistId, startAt)` and
  `(status, startAt)` were not in JSON yet, so they were removed.
  Both restored + redeployed. Will take a few minutes to rebuild
  before SocialProofTicker shows the live "X sessions now" line.

**🔒 Security audit follow-ups (2026-05-30, Round 28s1):**
- [ ] Rotate unused `VITE_OPENWEATHER_KEY` in `.env` (still live, bundled
      in older deployed JS)
- [ ] Verify Google Maps + Firebase Web API key referrer locks in GCP
      console (limit to sunred.vip + Vercel preview)
- [ ] Add Telegram webhook secret_token validation on `telegramWebhook`
      Cloud Function — currently anyone can POST fake updates
- [ ] Add auth gate to `notifyBooking` + `moderateText` callables
- [ ] Drop `'unsafe-inline'` from CSP in `vercel.json` after build verify

**📋 Decisions needed from View (for auto-bot Round next):**
- [ ] Confirm Telegram channel ID — `@SunRed_BKK`?
- [ ] Confirm bot token — same one that sends booking notifications, or new?
- [ ] Pick posting cadence — A) every 30min in prime, B) real-time on
      status change, C) hybrid (recommended: C)
- [ ] Pick edit-old vs new-post strategy (recommended: edit + auto-delete >24h)

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
