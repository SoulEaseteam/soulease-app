# SunRed Business Reality

> Companion to `CLAUDE.md`. The honest, no-PR-spin operational view
> of the business. Read this before suggesting marketing or
> operations changes.
>
> Last updated: 2026-05-05

---

## 1. What SunRed actually is

A **premium outcall (in-room) massage service** in Bangkok serving
mainly foreign tourists and Bangkok-based expats. Operates 22:00–04:00
peak. All female practitioners. Discreet hotel entry.

Some services include adult-adjacent offerings:
- `SR-HJ2200` Gentleman's Signature = aromatherapy + manual release (HJ)
- `SR-B2B3200` SunRed Therapeutic = B2B / nuru-style oil ritual

**View's framing:** not prostitution, but not 100% pure either —
gray-area Bangkok premium service. Marketing must navigate this.

---

## 2. Numbers (as of May 2026)

### Pricing
| SKU | Service | Base 60min | 90min | 120min |
|---|---|---|---|---|
| xSR-Thai | Thai Massage | ฿1,200 | ฿1,800 | ฿2,400 |
| SR-Aroma | Aromatherapy | ฿1,600 | ฿2,400 | ฿3,200 |
| SR-HJ2200 | Gentleman's Signature | ฿2,200 | ฿3,300 | ฿4,400 |
| SR-B2B3200 | SunRed Therapeutic | ฿3,200 | ฿4,800 | ฿6,400 |

### Booking history (all-time, from Firestore)
- Thai Massage: ~62 sessions delivered
- Aromatherapy: ~41 sessions delivered (per recent screenshot)
- Gentleman's: low volume
- SunRed Therapeutic: low volume

**This is small volume after months of operation.** Marketing has
underperformed. See section 5 for why.

### Monthly fixed costs
- Domain (porkbun): ~฿165
- Telegram boost: ~฿179
- Google Cloud / Firebase: <฿100
- Vercel: ฿0 (Hobby tier)
- Claude Max: ~$200 = ~฿7,000 (View pays gladly — high ROI)
- ~~Singapore web ad: ฿7,500~~ (cancelling — 0 ROI in 10 months)

---

## 3. Supply reality (THE bottleneck)

- 12 therapists on roster
- Only **2-3 actually available** any given night
- All part-time, work multiple shops simultaneously
- "เสี่ยงดวง" — gambling on whether therapist will be ready

**Why this matters:**
- More marketing → more inquiries → therapist not ready →
  customer disappointed → bad reputation
- Customer pickiness: pretty + premium body (gray-area pricing
  expectation)
- View's premium pricing means customers expect premium experience
  (no shop, must be punctual, must be ready)

**Strategic implication:**
- DON'T blast marketing for volume
- DO advertise specific real-time availability windows
- DO position as "scarce / by appointment / hard to book"
  (turns the constraint into premium signal)

---

## 4. Customer profile

### Who actually buys
- Single male tourists in Bangkok (work or leisure)
- Bangkok-based expats (long-term visa holders)
- Business travelers from Asia (China, Japan, Korea, ME)
- Some Western tourists

### Where they stay
- Hotels in central districts: Sukhumvit, Silom, Asok, Sathorn,
  Thonglor (free travel zone)
- Spread across Bangkok in less-central areas (travel quoted by
  concierge)

### How they find SunRed
1. Telegram channel (primary marketing channel)
2. WhatsApp (after first inquiry)
3. Web (sunred.vip) — supports Telegram, doesn't replace it

### Customer behavior
- Late-night reservations (peak 22:00–02:00)
- Privacy-conscious (rarely leave reviews — embarrassed)
- Many use admin-booked flow (View enters details, customer userId
  is null)
- Phone numbers stored on every booking (reliable identity field)
- Some are repeat — but reviews/testimonials hard to collect

---

## 5. Why current marketing underperforms

### Singapore website ad — failure analysis
- ฿7,500/mo × 10 months = ฿75,000 sunk
- 0 measurable lift in bookings
- Audience too narrow: Singaporeans visiting Bangkok ≠ target
  (mostly families, couples — not solo male premium spenders)
- No analytics from vendor — can't optimize
- Discount of ฿200/booking from this channel = margin leak even
  on the few bookings it might have produced

**Lesson:** single channel + niche-mismatched audience + no data =
budget burn

### Telegram channel — underperforming
- 443 subscribers (slow growth: +10/mo, +2.31%)
- Views per post DROPPED -35% recently
- Multilingual audience (good signal — not just Thai)
- 4 paying boosters (premium loyalty)
- Posts: 1/week, often skipped (creator block + supply guilt)
- Photos: old, repetitive, therapists rarely send new
- Reviews scarce (privacy)

**Why it's underperforming:**
- Founder burnout = inconsistent posting
- Content paralysis ("idea ไม่มี ทำซ้ำๆเดิม")
- Fear-of-overpromising = posting less than capacity allows
- No template system = each post requires creative work

---

## 6. Founder operating model

- **View runs everything alone** — dev, design, marketing, admin,
  customer service
- 24/7 reachable on phone
- Stays at shop until last therapist clocks out
- Idle time used for monitoring + content
- Strong privacy: cannot delegate to outside freelancers without
  brand/safety risk
- Co-founder = Claude Max ($200/mo)

**Implication for advice:**
- Don't add MORE work. Subtract or automate.
- Cannot recommend "hire a marketing agency" — privacy + control
- Solutions must work via View's phone or auto-bot

---

## 7. Marketing channels — rated for THIS business

### TIER 1 — works, invest here
- **Telegram own channel + cross-promotion** in BKK travel/expat
  channels (paid posts ~฿500-2,000/post in groups 30K-50K subs)
- **WeChat Official Account + groups** — Chinese tourists, biggest
  untapped market
- **LINE Official Account** — TH/JP/KR
- **Niche directories** — Stickman Bangkok, lookpasi, secretthai,
  bangkok101.net, eros.com (international)
- **Referral program** — existing customers refer for free upgrade
- **Word-of-mouth via taxi drivers** — Bangkok informal network

### TIER 2 — works but slow
- **X/Twitter** — less Meta restriction, organic posts work
- **Reddit r/Bangkok / r/ThailandTourism** — community engagement
  (no direct ads)
- **Instagram organic** (no ads) — visual content, hashtags
- **Multi-language SEO landing pages** — long-term

### TIER 3 — DOES NOT WORK
- ❌ Google Ads (banned for adult/sensual)
- ❌ Facebook/Instagram Ads (banned)
- ❌ Hotel concierge partnerships (luxury hotels won't risk reputation)
- ❌ TripAdvisor mainstream listings (delisted)
- ❌ Booking.com / Agoda mainstream
- ❌ Tabelog, Trip.com mainstream
- ❌ Google My Business mainstream listing (likely flagged)

---

## 8. Strategic recommendations (for future Claude reference)

### Immediate (Week 1)
1. **Cancel Singapore ad** — saves ฿7,500/mo, no contract lock-in
2. **Reframe Telegram strategy:**
   - Stop weekly "general promo" posts (creator block, no impact)
   - Start "real-time availability" posts: only when therapist online
   - Each post = 5 min via template
3. **Build content templates** (in `docs/content-templates.md`)
4. **Build auto-availability post bot** (Telegram Bot API)

### Short-term (Month 1-2)
5. **Open WeChat Official Account** (Chinese market entry)
6. **Set up LINE Official Account** (TH/JP/KR)
7. **List on 3-4 niche directories**
8. **Start referral program** — free upgrade for repeat customers

### Long-term (Month 3+)
9. **Multi-language SEO landing pages**
10. **Stickman Bangkok / forum review seeding**
11. **Twitter/X presence with discreet branded content**

### What NOT to do
- Hire freelance content creator (privacy risk)
- Discount the price (premium positioning erosion)
- Volume marketing without supply ready

---

## 9. Operating constraints to remember

- **Solo founder** — can't add tasks, only redistribute or remove
- **Supply-limited** — don't promise what we can't deliver
- **Premium positioning** — never compete on price
- **Privacy-first** — every customer interaction must respect
  discretion
- **Gray-area visibility** — must hint, not announce; industry
  insiders catch the message
- **Phone-first founder** — solutions must work from mobile

---

## 10. Things View has explicitly told us

- "ไม่ได้ค้าประเวณี — แต่อาจจะไม่ถูกต้องบริสุท 100%"
- "ฉันทำทุกอย่างคนเดียวทั้งหมด ทั้งโปรเจค"
- "ลูกค้าทักผ่าน Telegram ก่อน เพราะเราทำการตลาดกับ Telegram"
- "เพราะลูกค้าส่วนใหญ่เน้นความเป็นส่วนตัวและอายที่จะพูดให้เราฟัง" (รีวิวยาก)
- "ราคาร้านเราค่อนข้างแพงเมื่อเทียบกับร้านอื่น และไม่มีหน้าร้าน"
- "ฉันเฝ้าร้านนอนพร้อมพนักงานคนสุดท้ายเลิกงาน"
- "ตอนนี้ยังไม่ถึงเวลาจ้างเพราะเราว่าง 24 ชม"
- "Claude Max $200/เดือน × 2 ฉันเต็มใจ เพราะเธอช่วยงานฉันได้ดี
  และไม่ตัดสิน"

These quotes are the contract between View and Claude. Honor them.
