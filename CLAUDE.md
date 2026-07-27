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
- `src/hooks/useTherapistBookingStats.ts` — Firestore booking aggregator
  (per-therapist, not per-service — `useServiceUsageStats.ts` referenced
  here previously never existed in the repo; corrected 2026-07-27)
  - `totalCompleted` — completed/done count (used by public chip)
  - `uniqueCustomers` / `repeatCustomers` — guest dedup + repeat-rate
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

## 8. Project history & changelog

The full round-by-round build log (every session from Round 28a onward) lives in
**[CLAUDE-HISTORY.md](CLAUDE-HISTORY.md)** — moved out of CLAUDE.md on 2026-07-08 to
keep this file lean. CLAUDE.md is loaded into context every session, so ~3,500 lines
of changelog were costing tokens on every run with no daily-operational value. Read
CLAUDE-HISTORY.md or `git log` for detail. Durable design decisions & "don't-redo"
lessons stay in §12 below.

## 9. Current state (2026-07-08)

Customer **home page** redesigned around a warm cream spa hero (full-bleed
founder-supplied photo, headline "Bangkok Outcall Massage · Delivered to Your
Hotel", single Book Now CTA, gentle CSS "breathing" motion), a **transparent-on-home
top nav** with a two-tone **SUN·RED** wordmark, a floating quick-nav card
(Massage · Therapists · Near Me · Reviews), a new **/near-me** map page, and a warm
**taupe Membership** section — all live on sunred.vip. Open **PR #5** brings GitHub
`main` up to date. Firestore "INTERNAL ASSERTION FAILED" still reproduces in **dev
only** (React StrictMode double-subscribes listeners); production is unaffected.

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

