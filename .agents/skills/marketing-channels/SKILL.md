---
name: marketing-channels
description: SunRed's marketing-channel playbook — what works vs. banned for BKK gray-area outcall (Telegram/WeChat/LINE/directories), the Sammyboy/Samsguide paused-channel history + attribution audit, and the unexplained booking-volume collapse. Use when View asks about marketing, acquisition channels, ad spend, attribution, or resuming a paused channel.
---

# SunRed marketing channels — what works for this vertical

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
