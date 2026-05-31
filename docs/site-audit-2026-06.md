# SunRed Site Audit — 2026-06-07

> Focus: **conversion readiness** before driving new traffic from
> Stickman Bangkok / Telegram cross-promo / WeChat OA / cards.
>
> Looked at: `index.html`, `HomePage.tsx`, `HeroSection.tsx`,
> data integrity in schema/i18n, channel handles, brand voice
> across the codebase.
>
> Verdict: **The site is well-built · but has 3 leaks that will
> cost conversions when traffic arrives.** Fix the 🔴 items
> THIS WEEK before paying for any acquisition.

---

## 🔴 CRITICAL — fix before driving traffic

### 1. Schema.org has wrong prices + phantom service · `index.html`

**The bug:**
```
Schema says            Reality (CLAUDE.md)
─────────────────────────────────────────
Thai Massage    ฿1500   →   ฿1,200
Aromatherapy    ฿2000   →   ฿1,600
Couple's Massage ฿3500  →   DOES NOT EXIST (paused)
MISSING                    Gentleman's Signature ฿2,200
MISSING                    SunRed Therapeutic ฿3,200
```

**Why it matters:**
- Google rich snippets show wrong price → customer arrives
  expecting ฿1,500 Thai · gets quoted ฿1,200 → confusion
- "Couple's Massage" appears in snippets → customer asks for it →
  unavailable → bad first impression
- Missing Gentleman's + Therapeutic = **the 2 highest-margin
  services are invisible to Google rich results**

**Fix:** rewrite `hasOfferCatalog` block in `index.html` lines
187-264. Mirror the 4 real services from `src/data/services.ts`
with correct prices + descriptions + euphemism-safe copy.

**Effort:** 10 min · I can write the corrected block now.

---

### 2. "Couple's Massage" leftover in 5 language filters · `src/app/i18n.ts`

**The bug:**
```
src/app/i18n.ts:94   "filter.couple": "Couple"        (en)
src/app/i18n.ts:132  "filter.couple": "นวดคู่"          (th)
src/app/i18n.ts:168  "filter.couple": "情侣"          (zh)
src/app/i18n.ts:204  "filter.couple": "カップル"        (ja)
src/app/i18n.ts:240  "filter.couple": "커플"          (ko)
```

**Why it matters:**
- Customer sees "Couple" filter chip → taps → empty results page
- Trust killer · suggests broken site or hidden inventory

**Fix:** remove the 5 filter.couple keys + any UI that references
`filter.couple`. **Effort:** 5 min.

---

### 3. TikTok in Organization `sameAs` signal · `index.html` line 162

**The bug:**
```html
sameAs: [
  "https://x.com/SunRedvip_bkk",
  "https://www.instagram.com/longcheng956?...",
  "https://t.me/SunRed_BKK",
  "https://samsguide.shop/showthread.php?p=24626728...",
  "https://www.tiktok.com/@sun.red59?_t=...&_r=1"   ← ⚠️
]
```

**Per CLAUDE.md §6:**
> "TikTok = 6.8K followers เป็น ของเก่า เพจ ไก่ชน ที่ ฉัน เคยทำกับ
> แฟนเก่า · ไม่ตรงกับเป้าหมาย กลุ่มลูกค้า"

**Why it matters:**
- Google reads `sameAs` to verify brand authority + audience match
- Linking SunRed → cockfighting TikTok = wrong brand signal,
  may dilute relevance scoring for tourist massage queries
- Risk: if TikTok account ever gets reported/banned, schema is broken

**Fix:** remove TikTok line. Also evaluate whether the Instagram
account (longcheng956) is brand-aligned · if not, also remove.

**Effort:** 1 min.

---

## 🟡 HIGH — meaningful conversion improvements

### 4. Hero service cards show "60 min" only — hides 50%+ revenue upsell

`src/components/home/HeroSection.tsx` lines 84-123

Every card displays only the 60-min price. But:
- 90 min = base × 1.5 (`servicePricing.ts`)
- 120 min = base × 2.0

**Visitor sees:** ฿1,200 Thai · ฿1,600 Aroma · ฿2,200 Gent · ฿3,200 Therapeutic
**Doesn't know:** these can be upgraded with one tap to 1.5x or 2x

**Recommended copy:**
```
Thai · ฿1,200          →   Thai · from ฿1,200 · 60-120 min
60 min                     ← drop the duration line · use "from"
```

Or smaller: replace "60 min" with "60 / 90 / 120 min"

**Effort:** 5 min. Conversion lift: meaningful (every upsell = +50-100%
ticket size).

---

### 5. No direct "BOOK NOW" CTA on home above-the-fold

What's there:
- Tap greeting → WhatsApp (small text · not obvious)
- Tap service card → /services/:id (good but indirect)
- Tap "See all" → /services
- Promo banner disabled (PROMOS_ENABLED off)

**What's missing:**
- A single, prominent CTA like:
  > **Reserve Tonight** → Telegram concierge

First-time visitor from Stickman/Telegram cross-promo lands on home,
sees beautiful cards, doesn't know:
- Is this a directory? a shop? a magazine?
- Where do I click to book?
- What does "tap greeting" do?

**Fix:** Add 1 sticky `Reserve · Telegram concierge` button below
the service strip · keep design quiet but unambiguous.

**Effort:** 30 min. Highest single conversion lift available.

---

### 6. Channel inconsistency — Telegram vs WhatsApp as "primary"

Per CLAUDE.md: "Customer comm preference: Telegram first (founder
bias — marketing-first channel), WhatsApp second."

**But in code:**
- Hero greeting tap → WhatsApp (`HeroSection.tsx` line 53)
- AdminFloatingChat → ?
- HowItWorks → Telegram FIRST in channel grid · WhatsApp second
- BookingSuccessPage → ?

**Why it matters:**
- Visitor's first tap should match strategic preference
- WhatsApp opens app · Telegram opens app · both fine, but be
  consistent so View can track which channel converts

**Fix:** decide A vs B with View first:
- **A:** Telegram first everywhere (founder strategy)
- **B:** Keep WhatsApp first in Hero (mass-market intuition)
- **C:** Mode-aware (CN customer → Telegram, Western → WhatsApp)

**Effort:** decision + 15 min code change.

---

## 🟢 MEDIUM — quality of life

### 7. Static H1 reads OK but generic

`HomePage.tsx` line 80-95:
> "SunRed — Luxury outcall massage in Bangkok, delivered to your hotel"

This is fine but plain. Consider adding location/language signals:
> "SunRed — Premium outcall massage in Bangkok · Sukhumvit · Silom
> · 24/7 · EN · 中文 · 日本語 · 한국어"

**Effort:** 2 min. SEO marginal lift.

### 8. No social proof above the fold

The home doesn't surface:
- "12 verified therapists tonight"
- "Last reservation: 23 min ago"
- "★ Reviews from past 30 days"

CLAUDE.md mentions `useSocialProofMetrics` hook was wired in
Round 28r30 to SocialProofTicker · is it on home? If not — add.

**Effort:** 15 min if hook exists.

### 9. Promo bank disabled

`PROMOS_ENABLED = false` in feature flags. With customer
acquisition push starting, a rotating promo IS useful:
- Tonight's special angle
- Returning guest welcome
- Discovery Reservation visual

But — only re-enable if View has 2-3 vetted promo angles ready.
Otherwise empty promos look spammy.

**Effort:** depends on View having promo content.

---

## 🟢 LOW — not blocking but worth knowing

### 10. Twitter handle linked but no posting (CLAUDE.md says inactive)

`sameAs` lists `x.com/SunRedvip_bkk` · if not actively posting,
remove from sameAs (same rationale as TikTok).

### 11. Open Graph image is brand banner — good

`/images/og/sunred-share.svg` rasterized via Cloudinary fetch.
This is correct (was changed from Yuri's face in Round 28b58).

### 12. Hreflang setup is correct

Lines 173-181. Good.

### 13. Static prerender (Round 28s105-109) is shipping correctly

5 services · 12 therapists · 5 locales · 32 routes baked.
Bing/Baidu/Naver get native-language meta. Solid.

---

## 🚨 INFRA — already in CLAUDE.md §9 but worth re-flagging

These are conversion blockers separate from copy/UX:

| # | Item | Cost | Impact |
|---|---|---|---|
| A | **Firestore rules not published** | 2 min | Data leak (customer phones/addresses public) |
| B | **Firestore indexes not deployed** | 1 min | NotificationsPage empty for all users |
| C | **Vercel auto-deploy broken** | 5 min | Every code change requires manual `vercel --prod` |

Do these 3 today before anything else. Each one is < 5 min.

---

## ✅ What's working well (don't touch)

- **SEO meta + hreflang setup** — solid foundation
- **Schema FAQPage** — well-written for the audience
- **Multi-locale prerender** — Bing/Baidu/Naver friendly
- **Mobile-first 430px shell** — clean
- **noscript fallback** — accurate (4 services listed correctly here!)
- **Tracking** (home_view, referral capture) — instrumented
- **Brand voice in services.ts** — euphemism table applied
- **Therapist data structure** — clean, ready for profile copy wiring

---

## 📋 Recommended fix order (this week)

```
TODAY (2 hours total)
─────────────────────
[ ] 1. Publish Firestore rules                          (2 min)
[ ] 2. Deploy Firestore indexes                         (1 min)
[ ] 3. Reconnect Vercel auto-deploy                     (5 min)
[ ] 4. Fix schema prices + services in index.html       (10 min · I write)
[ ] 5. Remove "filter.couple" from 5 locales            (5 min · I do)
[ ] 6. Remove TikTok + maybe IG from sameAs             (1 min · I do)
[ ] 7. Add "from ฿X / 60-120 min" to Hero cards         (5 min · I do)

THIS WEEK
─────────
[ ] 8. Decide WhatsApp-vs-Telegram primary CTA          (View · 5 min)
[ ] 9. Add sticky "Reserve · Concierge" CTA on home     (Claude · 30 min)
[ ] 10. Verify social proof hook works · re-enable      (Claude · 15 min)

THEN
────
[ ] 11. Start customer acquisition (Stickman email etc)
[ ] 12. Watch conversion as traffic arrives
```

---

## 🎯 The audit's single message

**The site looks ready. The bugs in #1–3 mean every customer who
finds SunRed via Google sees the WRONG product/price catalog.
Spending money on Stickman or Telegram cross-promo before fixing
the schema = sending traffic to a broken brochure.**

10 min of fixes today protects every ฿ spent on acquisition this
quarter.

---

## 🔗 Files touched in fix

| File | Fix | Status |
|---|---|---|
| `index.html` | Rewrite OfferCatalog · remove TikTok | Claude can do now |
| `src/app/i18n.ts` | Remove 5 filter.couple keys | Claude can do now |
| `src/components/home/HeroSection.tsx` | "from" pricing display | Claude can do now |
| Firebase Console | Rules · Indexes | View only |
| Vercel Dashboard | Git reconnect | View only |

---

**ทำเลย — บอกว่าจะให้ลุยอันไหนก่อน · ผมแก้ #4, #5, #7 ได้ใน 1 รอบ (~25 นาที), #8-10 รอบถัดไป**
