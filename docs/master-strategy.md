# SunRed Master Strategy — 2026-06

> 1-page action plan. Read every morning. Update every Sunday.
>
> Last revised: 2026-06-07 (post-reframe)
>
> **🔄 Reframe by View 2026-06-07:**
> "ความสัมพันธ์ shop ↔ therapist = ผลประโยชน์ร่วม · ทำได้ก็ทำ ·
> เน้นเรื่อง หาลูกค้า · ต่างฝ่ายต่าง วินๆ ก็พอ"
>
> Translation for future-Claude: don't overthink therapist retention.
> The relationship is transactional. The only strategic lever is
> **customer acquisition**. When there's enough work, therapists stay.
> When there isn't, they leave. That's the business — accept it.

---

## 🎯 The single strategic question

**How do we get more customers · steadily · across channels that
aren't banned for adult-adjacent services?**

Everything below answers some part of this question.

---

## 🔄 The flywheel (View's framing)

```
Drive TRAFFIC across multiple channels
        ↓
Convert traffic to bookings (concierge + Discovery perk)
        ↓
Bookings distribute across roster (12 distinct profiles)
        ↓
Therapists earn → stay → invite friends ("ร้านนี้ปัง")
        ↓
Roster grows organically
        ↓
More capacity to serve more demand
```

Stage right now: **stuck at the very top**. Web went quiet 2 weeks ·
no new traffic = no new bookings. Solving the traffic problem
solves everything downstream.

---

## 🛠️ The 5 systems built (priority order)

| Priority | System | File | Job |
|---|---|---|---|
| 🔴 **#1** | **Customer Acquisition** | `customer-acquisition.md` | Drive new traffic from 9 channels — Stickman · TG cross-promo · WeChat OA · LINE OA · cards · Reddit etc. |
| 🔴 **#2** | **Telegram rotation** | `telegram-templates.md` | Activate existing 443-sub channel — 3-4 posts/week 4 languages |
| 🟡 **#3** | **Therapist profiles** | `therapist-profiles.md` | 12 distinct stories so customers don't default-pick Yuri |
| 🟡 **#4** | **Discovery Reservation** | `discovery-offer.md` | First-time-with-practitioner perk to distribute bookings |
| 🟢 **#5** | **Yuri operations** | `yuri-retention.md` | Practical only — Lever 2 (filter leads) + Lever 4 (Grab+safety) · skip emotional retention talk |

Customer acquisition (#1-2) is the main game. Everything else
supports it.

---

## ⚡ This week's actions — ranked by impact ÷ effort

### 🔴 BLOCKING (do today, < 30 min total)

1. **Publish Firestore rules** (Firebase Console → Rules → Publish)
   - 2 min · stops customer phone/address public leak
2. **Cancel Singapore site contract** (web form/email)
   - 10 min · saves ฿7,500/month
3. **Reconnect Vercel auto-deploy** (Vercel Settings → Git)
   - 5 min · all future shipping becomes painless

### 🟡 HIGH IMPACT (do this week — customer acquisition focus)

4. **Email Stickman Bangkok** — 30 min · template in
   `customer-acquisition.md` §1 · biggest untapped channel
5. **DM 10 Bangkok Telegram channels for cross-promo** — 1 hour ·
   template in `customer-acquisition.md` §2
6. **Print 100 referral cards + hand out to taxi drivers** — ฿500 +
   1 evening · `customer-acquisition.md` §6
7. **Start Telegram posting** — 3-4 posts/week using existing
   templates · 4 languages

### 🟢 MEDIUM IMPACT (next 2 weeks)

8. **Register WeChat OA** — Chinese market (biggest tourist segment)
9. **Register LINE OA** — JP/KR/TH segment
10. **Submit to 5 niche directories** — batch in 1 hour
11. **Reddit soft engagement** — r/Bangkok r/ThailandTourism

---

## 📊 Weekly metrics — track in Notes/Sheet

| Metric | Target | Why it matters |
|---|---|---|
| Yuri bookings | ≤ 25/month | burnout prevention |
| Non-Yuri bookings | ≥ 30/month | flywheel health |
| Top 3 underused therapists' bookings | ≥ 8/month each | retention threshold |
| Discovery Reservation redemptions | 5+/week | adoption signal |
| Telegram channel new subs | +5/week | reach growth |
| Returning customer rate (30-day repeat) | ≥ 35% | brand stickiness |

If Discovery redemptions = 0 after 2 weeks → re-pitch in chat
more confidently OR the offer isn't right → revisit `discovery-offer.md`

---

## 🚨 Risks & mitigation

### Risk 1: Yuri scales down or leaves
**Mitigation:** retention plan + backup plan in `yuri-retention.md`
**Watch for:** burnout signals in §2 of that doc
**If triggers fire:** apply Levers 1+4 immediately, talk same-day

### Risk 2: Discovery perk doesn't convert
**Mitigation:** test 2 weeks manually before coding into UI
**Watch for:** 0 redemptions in week 1 = wrong pitch, not wrong offer
**If triggers fire:** rewrite concierge script, NOT the offer mechanic

### Risk 3: No demand pickup despite Telegram posting
**Mitigation:** cross-promote in 5-10 channels week 2
**Watch for:** 0 new bookings after 2 weeks of posting
**If triggers fire:** the audience isn't on this channel → pivot to
WeChat + LINE OA setup faster

### Risk 4: Underused 7 still don't get bookings even with profiles
**Mitigation:** check if it's a photo/positioning problem vs demand
**Watch for:** 1-2 with no bookings 3 weeks in a row
**If triggers fire:** photo refresh + 1-on-1 conversation per
therapist (`comp-analysis` thinking applied)

---

## 🗓️ 30 / 60 / 90 day milestones

### Day 30 (~July 7)
- [ ] Yuri retention package active · Yuri has chosen levers
- [ ] 12+ Telegram posts shipped · channel +20 subs
- [ ] 10+ Discovery Reservation redemptions
- [ ] 3 underused therapists hit 5+ bookings
- [ ] All 4 docs finalized (incl. profile gaps filled by View)
- [ ] Profile copy translated to ZH/JA/KO + wired into code

### Day 60 (~Aug 7)
- [ ] Non-Yuri revenue share ≥ 40% (up from current ~25%)
- [ ] At least 1 therapist invites a friend (flywheel ignition)
- [ ] WeChat + LINE OA both live with 50+ adds each
- [ ] Discovery Reservation Phase 2 (UI integration) shipped
- [ ] Auto-availability Telegram bot designed (decisions made)

### Day 90 (~Sep 7)
- [ ] Roster: 14+ therapists (12 → +2 via referrals)
- [ ] 1+ "alternative star" matching Yuri's tier emerging
- [ ] Yuri's revenue share down to 25-30% (not because she earns less
  — because others earn more)
- [ ] Monthly revenue ≥ 2x current
- [ ] System officially de-risked: no single-point-of-failure

---

## 💡 The mental model

```
What we used to think           →  What we now think
─────────────────────────────────────────────────────────────────
"Marketing channel is the bottleneck"
                                →  "Demand distribution to whole team
                                   is the bottleneck"

"We need to recruit more therapists"
                                →  "We need to give existing ones
                                   enough work so they stay + invite
                                   friends"

"Customer wants 1 specific type — only Yuri matches"
                                →  "Customer doesn't know the others
                                   exist as distinct people. Give them
                                   stories + a low-risk way to try."

"Yuri is our star asset"
                                →  "Yuri is currently the ENTIRE
                                   asset. Star is what we'll have when
                                   she's 1-of-3 not 1-of-1."
```

---

## 📁 File map

```
docs/
├── master-strategy.md         ← YOU ARE HERE · daily reference
├── telegram-templates.md      ← Demand generation
├── discovery-offer.md         ← Demand distribution
├── therapist-profiles.md      ← Variety building
├── yuri-retention.md          ← Star protection
├── brand-voice.md             ← Euphemism + tone rules
└── sunred-business.md         ← Operating reality + channel notes
```

`CLAUDE.md` Section 9 = full pending list including code/security/
infrastructure tasks. This master-strategy.md = the strategic frame
those tasks fit inside.

---

## 🌅 Daily ritual (5 min · use this every morning)

1. Open `master-strategy.md` (this file)
2. Glance at "This week's actions" section — what's still 🔴/🟡?
3. Check Telegram channel — last post when? Need a fresh one?
4. Check WhatsApp/Telegram DMs — any returning guest to offer
   Discovery to?
5. Note any burnout signal from Yuri (`yuri-retention.md` §2)
6. If anything material changed → tell Claude in next session

That's it. Strategy isn't supposed to take more than 5 min/day.
Doing the actual work is the strategy.

---

## 🎤 One sentence summary

**Find customers. Across 5-6 channels. Consistently. The roster
takes care of itself when there's work to do.**

Everything else is implementation detail.
