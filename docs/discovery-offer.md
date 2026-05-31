# SunRed Discovery Reservation — first-time-with-practitioner perk

> Strategic purpose: **distribute bookings beyond Yuri** so the other
> 7 therapists earn enough to stay full-time → invite friends → roster
> grows (chicken-and-egg flywheel View identified).
>
> Tactical principle: never discount the price. Add **value in time and
> ritual**, not money. Keeps brand premium intact.
>
> Created: 2026-06-07

---

## 🎯 The mechanic

**"Discovery Reservation — complimentary 15-min welcome ritual when
you book a practitioner for the first time."**

- 15-min add-on at start of session: warm scalp compress + foot soak
- Zero monetary discount on stated price
- Customer feels: pampered + treated like VIP for trying someone new
- Therapist feels: full-rate booking + extra 15 min paid (rate-protected)
- Shop margin: ฿0 cost (no oil/product), 15 min time only

---

## 💰 Cost-benefit math

**Cost per Discovery Reservation:**
- Therapist 15-min × commission rate (~50%) = ~฿100-150 absorbed by shop
- No product cost (warm towel + scalp oil = existing supplies)
- **Net cost per redemption: ~฿100-150**

**Expected value:**
- 1 trial booking that wouldn't have happened: ฿1,600-3,200 revenue
- If 30% become repeat customers: lifetime value ฿8,000+ each
- Even 1-of-10 redemptions converting = strong ROI

**Break-even:** as long as >5% of Discovery bookings become repeats, profit-positive.

---

## ✅ Eligibility rules

**Customer qualifies if:**
- ✅ Has booked SunRed before (returning guest)
- ✅ Selects a practitioner they've NEVER booked
- ✅ One Discovery per practitioner per customer (lifetime)

**Customer does NOT qualify if:**
- ❌ Has booked this specific practitioner before
- ❌ First-time SunRed guest (they already get Welcome Banner offer)
- ❌ Selects Yuri (protect her premium tier — she's already overbooked)

**Practitioners eligible:**
- All current roster EXCEPT top-2 booked (Yuri, + whoever else is overbooked)
- Refresh "ineligible list" every 2 weeks based on booking volume
- Goal: route demand to underutilized therapists only

---

## 📝 Concierge script (Thai → use directly in chat)

### When customer asks "who do you recommend tonight?"

**Thai (View → guest in chat):**
> "Tonight we have [Name 1] and [Name 2] available. As it's your first
> session with either of them, we'd like to extend our Discovery
> Reservation — a complimentary 15-minute warm scalp and foot welcome,
> included with your selected therapy."

**Chinese:**
> "今晚 [Name 1] 和 [Name 2] 可预约。由于这是您第一次预约她们,
> 我们将赠送 15 分钟的 Discovery 礼遇 — 头部温敷与足部欢迎仪式,
> 与您选择的疗程一同呈现。"

**Korean:**
> "오늘 밤 [Name 1]와 [Name 2]가 예약 가능합니다. 두 분과 처음
> 만나시는 자리이기에, 디스커버리 예약 혜택을 함께 드립니다 —
> 15분 두피 온찜질과 발 환영 의식이 선택하신 테라피와 함께
> 제공됩니다."

**Japanese:**
> "今夜は [Name 1] と [Name 2] がご対応可能です。お二人とも初め
> てのご予約ですので、ディスカバリー予約として15分間の頭皮温罨法
> と足の歓迎セレモニーをセッションにお付けいたします。"

### When customer asks "why try a new therapist?"

**Thai:**
> "Each of our practitioners brings something distinctive — different
> training, languages, and rhythm. Many guests find their preferred
> therapy by exploring two or three before settling on a favourite.
> The Discovery ritual is our way of welcoming you to that experience."

---

## 📱 Telegram template — Discovery Week post

### EN
```
DISCOVERY WEEK ✦

This week we welcome you to meet three of our quieter
practitioners — a complimentary 15-minute warm scalp
and foot ritual included with your reservation.

— [Name 1] · [Languages] · [Area]
— [Name 2] · [Languages] · [Area]
— [Name 3] · [Languages] · [Area]

Reserve via DM → @SunRedvip_bkk
*Available to returning guests on their first session
with each practitioner.*
```

### 中文
```
探索周 ✦

本周三位治疗师向您敞开欢迎之门 — 预约即赠 15 分钟
头部温敷与足部欢迎仪式

— [Name 1] · [Languages] · [Area]
— [Name 2] · [Languages] · [Area]
— [Name 3] · [Languages] · [Area]

私信预约 → @SunRedvip_bkk
*仅限老客户首次预约该治疗师时使用*
```

### 한국어
```
디스커버리 위크 ✦

이번 주, 세 분의 치료사와의 첫 만남을 환영합니다
— 15분 두피 온찜질 + 발 환영 의식 무료 포함

— [Name 1] · [Languages] · [Area]
— [Name 2] · [Languages] · [Area]
— [Name 3] · [Languages] · [Area]

DM 예약 → @SunRedvip_bkk
*재방문 고객이 해당 치료사와의 첫 예약 시 제공*
```

### 日本語
```
ディスカバリー・ウィーク ✦

今週、3名の治療師との初めての出会いを歓迎します —
15分の頭皮温罨法と足の歓迎セレモニーを無料でお付け
いたします

— [Name 1] · [Languages] · [Area]
— [Name 2] · [Languages] · [Area]
— [Name 3] · [Languages] · [Area]

DMにてご予約 → @SunRedvip_bkk
*リピーターの方が該当治療師との初回予約時に適用*
```

---

## 🎨 Optional UI integration (Phase 2 — next round)

When ready to wire this into the booking flow:

1. **Detect first-time-with-practitioner** in `BookingFlowPage`:
   ```ts
   const isDiscoveryEligible = useMemo(() => {
     if (!user?.phone) return false; // need history
     if (selectedTherapist?.id === YURI_ID) return false; // protect top tier
     const hasBookedThisTherapist = userBookings.some(
       (b) => b.therapistId === selectedTherapist?.id
     );
     return !hasBookedThisTherapist && userBookings.length > 0;
   }, [user, selectedTherapist, userBookings]);
   ```

2. **Show subtle badge on therapist card** in Therapists tab:
   ```
   ✦ Discovery — first session ritual included
   ```
   Only visible to logged-in returning guests.

3. **Auto-add line item** on Total breakdown:
   ```
   Welcome ritual · complimentary    ฿0
   ```
   Shows value without discounting headline price.

4. **Track redemption** in Firestore booking doc:
   ```
   { discoveryRedeemed: true, discoveryTherapistId: "xxx" }
   ```
   Helps measure conversion: Discovery redemptions → repeat customers.

---

## 📊 Metric to watch (manual for now)

Weekly review:
- # of Discovery redemptions this week
- # of redeemers who came back within 30 days (repeat rate)
- Average ฿/Discovery customer vs. Yuri customer
- Therapist roster: who got the most Discovery bookings?

**Target after 60 days:** at least 3 of the underused therapists
should hit 8+ bookings/month — earning enough to commit full-time.

---

## ⚠️ Guardrails

- **Don't advertise the cash value** of the 15 min — say "ritual" not "฿150 value"
- **Don't allow stacking** with referral codes or first-time codes
- **Don't extend to Yuri** — she's the proof of concept, not the giveaway
- **Limit to 1 redemption per (customer × practitioner)** — otherwise customers game it forever
- **Re-evaluate "ineligible practitioners list"** every 2 weeks — Yuri may not always be the top earner; protect whoever currently is

---

## 🚦 Rollout plan

**Week 1 (this week):**
- ✅ Policy doc (this file)
- ✅ Concierge scripts (4 languages, ready to copy-paste)
- ✅ Telegram template (4 languages)
- 📋 Post Discovery Week on Telegram + offer in concierge chats

**Week 2:**
- 📋 Track redemptions manually in a Google Sheet
- 📋 Review: did underused therapists' bookings rise?

**Week 3-4 (if working):**
- 📋 Wire into BookingFlowPage UI (Phase 2 code)
- 📋 Auto-track in Firestore booking docs
- 📋 Add admin earnings filter by Discovery vs. regular

**Week 8:**
- 📋 Did 3+ therapists move from underused → busy?
- If yes → ready for **E (Therapist referral program)** — the next flywheel step

---

## 🔄 How this connects to View's chicken-and-egg insight

```
Discovery Reservations
    ↓
Customers try non-Yuri therapists (low risk for them)
    ↓
Underused 7 therapists get steady work
    ↓
They earn enough → commit FT to SunRed
    ↓
They invite friends ("ร้านนี้ปัง")
    ↓
Roster expands organically (free recruitment)
    ↓
More customers can be served → revenue ceiling rises
```

This is the cheapest tactical input to start the flywheel View
described. Cost ~฿100-150 per redemption · upside: solves the
core supply-distribution problem.
