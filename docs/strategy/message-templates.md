# SunRed — Message Templates (canonical)

Copy-paste replies for WhatsApp / Telegram / LINE, in the languages our
guests actually use. This replaces the two 2026-era template files that
were archived on 2026-07-28 (`docs/archive/SunRed_Message_Templates.md`
and `docs/archive/02_Multi_Language_Templates.md`) — see the banner atop
each for why. Non-English templates below are carried over **verbatim**
from that archive; only the price blocks were corrected.

---

## Prices — the one place to check before quoting

Sourced from `src/data/services.ts` (60-min bases) +
`DURATION_PRICE_OVERRIDES` in `src/utils/servicePricing.ts`, verified
2026-07-28. **The archived templates quoted 1,800 / 2,500-2,800 / 3,500 /
1,500 / 2,200 — every one of those was wrong.** If a guest is quoted from
an old copy, honour the correct price below and fix the copy.

| Service | Durations | Price (THB) |
|---|---|---|
| Thai Massage | 60 / 90 / 120 | 1,200 / 1,600 / 2,000 |
| Aromatherapy Massage | 60 / 90 / 120 | 1,400 / 1,800 / 2,400 |
| Gentleman's Signature Therapy | 70 / 120 | 2,200 / 3,000 |
| SunRed Therapeutic Experience | 70 / 120 | 3,200 / 4,000 |

Gentleman's and Therapeutic run **70/120 only** — there is no 60 or 90
option. Admin can override any price live from `/admin/promotions`
(writes `adminSettings/publicRules`), so if a number here disagrees with
the live site, the site wins and this table needs updating.

WeChat Pay / Alipay carry a transfer fee of `round(total × 5%) + ฿200`
(`src/utils/paymentSurcharge.ts`). Cash and PromptPay have no fee.

---

## Rules these templates follow

Three things were stripped out of the archived versions because they
conflict with standing founder policy — don't reintroduce them:

1. **Never ask a guest for a public review.** The old template 4.1 had a
   `[GOOGLE REVIEW LINK]`. CLAUDE.md §🚫 rules out a Google Business
   Profile entirely, and §🔐 hard-bans any flow that makes a guest
   publicly attribute their experience. Anonymous in-app reviews and
   permission-based anonymous TG blurbs are the sanctioned routes.
2. **No hotel-concierge / B2B commission outreach.** The old Section 7
   pitched 5★ concierge desks at 20%. That's on the ❌ DOES-NOT-WORK list
   in §6 — brand risk for the hotel, and it exposes the guest relationship.
3. **No `samsguide.living` targeting.** The old 5.3 was built around it;
   that channel was cancelled (฿75,000 spent, zero ROI).

Register: guests are *guests*, therapists are *practitioners*, we are the
*concierge*, and bookings are *reservations*. Use the euphemism table in
CLAUDE.md §3 for anything adult-adjacent — never the clinical term.

---

## Coverage — be honest about the gaps

Non-English coverage is uneven, inherited from the archive. Nothing below
was machine-translated by us; where a language is missing a scenario,
write it fresh and have it checked rather than guessing.

| Scenario | EN | CN | HK/TW | JP | KR | TH | MY | AR |
|---|---|---|---|---|---|---|---|---|
| First contact | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Booking confirm | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pricing | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| Discretion | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| Repeat welcome-back | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | — |
| Re-engagement | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | — |
| Pre-arrival / comfort | ✅ | — | — | — | — | — | — | — |
| Difficult situations | ✅ | — | — | — | — | — | — | — |
| Operational quick-replies | ✅ | — | — | — | — | — | — | — |

**Two unresolved conflicts inherited from the archive**, flagged rather
than silently decided — both need View's call:
- **Service cutoff.** Old files variously said 2am and 4am. The templates
  below say 2am. Confirm which is real.
- **Practitioner languages.** The English file claimed English + Mandarin
  only; the multi-language file promised Cantonese, Japanese, Korean,
  Malay and basic Arabic on request. The templates below still carry the
  latter claim — verify against the real roster before promising it.

---

# Part 1 — English

## Section 1 — First contact

### 1.1 — Generic "How does this work?" (English)

```
Hi, thanks for reaching out 🙏

Quick overview of how SunRed works:

✓ We dispatch a licensed therapist to your hotel room
✓ We cover all 4-5 star hotels in Sukhumvit, Silom, Sathorn, Riverside
✓ Sessions: 60min / 90min / 120min — Aroma, Swedish, Deep Tissue, Thai
✓ Late-night dispatch available until 2am
✓ English & Mandarin-speaking therapists

To book, just send me:
1. Your hotel name (room number after we confirm)
2. Date & time you want
3. Service & duration
4. Any therapist preference

Pricing is fixed — I'll quote you the all-in total before you confirm.

What works for you?
```

### 1.2 — Price Inquiry (Direct Question)

```
Sure, here's our pricing — all prices are inclusive (travel, oils, sheets, therapist):

🌿 Thai Massage — 60 / 90 / 120 min — 1,200 / 1,600 / 2,000 THB
🌿 Aromatherapy Massage — 60 / 90 / 120 min — 1,400 / 1,800 / 2,400 THB
🌿 Gentleman's Signature Therapy — 70 / 120 min — 2,200 / 3,000 THB
🌿 SunRed Therapeutic Experience — 70 / 120 min — 3,200 / 4,000 THB

Late-night surcharge (sessions starting after 1am): +300 THB

Tips are at your discretion (typical 200-500 THB for a good session).

Want me to send you available therapist profiles for the time you have in mind?
```

### 1.3 — "Are You Discreet?" Question

```
Yes — discretion is standard for us. Specifically:

✓ Therapist arrives in plain clothes with a small roller bag (looks like flight crew)
✓ No reception check-in needed at most major hotels (Marriott, Hyatt, Anantara, etc.)
✓ Session is private and closed-door
✓ No follow-up calls or messages unless you initiate
✓ Booking history stays between you and us

If you have a specific concern about your hotel, let me know which one and I can confirm exactly how the arrival will work there.
```

---

## Section 2 — Booking confirmation

### 2.1 — Booking Confirmation Template (English)

```
Booking confirmed ✅

📅 Date: [DATE]
🕐 Time: [TIME]
🏨 Hotel: [HOTEL NAME], Room [ROOM #]
💆 Service: [SERVICE] — [DURATION] min
👤 Therapist: [THERAPIST NAME]
💰 Total: [AMOUNT] THB (cash on completion)

The therapist will arrive at [TIME] and message you when they're 5 min away.

Cancellation policy: Free up to 1hr before. 50% charge inside 1hr. Full charge for no-show.

If you need to change anything, just message me here. See you soon 🙏
```

### 2.2 — "Therapist 5-min Away" Auto-Message

```
Hi [NAME] 👋

[THERAPIST] is 5 minutes from your hotel. They'll come up to room [ROOM #] directly — plain clothes, small roller bag, looks like flight crew.

Please make sure the room is ready (towel, somewhere to set up the table). They'll handle everything else.

See you in a few minutes 🙏
```

---

## Section 3 — Pre-arrival comfort

### 3.1 — First-Time Customer Reassurance

```
Welcome! Since this is your first session with us, a few things you might want to know:

🛏 The therapist brings a portable massage table — needs about 2x1m of clear space
🧴 All oils, sheets, and towels are provided
🚿 We recommend a quick shower before the session (warm) — opens up the muscles
👕 You can wear whatever's comfortable (shorts, towel, etc.) — therapist will give privacy to change
💬 Communicate during the session if pressure is too soft / strong — they'll adjust immediately

Any questions before they arrive?
```

### 3.2 — Customer Asking About Pressure

```
Great question — Thai therapists often default to lighter pressure than Singaporean / Hong Kong customers prefer.

When the therapist starts, just say:
- "Stronger please" / "More pressure"
- "Lighter please" / "Soft pressure"
- Or in Thai: "แรงๆ" (stronger) / "เบาๆ" (lighter)

[THERAPIST] specializes in [STYLE] and is comfortable with firm pressure if that's what you want.
```

---

## Section 4 — Post-session

### 4.1 — Repeat Customer Welcome Back

```
Welcome back to Bangkok 👋

Looking at our notes:
• Last session: [DATE] with [THERAPIST]
• You preferred [SERVICE], [PRESSURE]
• Hotel: [HOTEL]

Want to book the same again? Or change anything this time?
```

### 4.2 — VIP Repeat Customer (5+ Bookings)

```
Hey [NAME] — good to hear from you again 🙏

Since this is your [N]th time with us, I've blocked [THERAPIST] for the time you mentioned. Same as always — [SERVICE] [DURATION] at [HOTEL].

As a thank you for being a regular: this session is on a complimentary upgrade to [SERVICE+], no extra charge.

Confirm and I'll lock it in?
```

---

## Section 5 — Re-engagement

### 5.1 — Customer Inactive 60-90 Days (Soft Touch)

```
Hi [NAME] — hope you've been well 🙏

Saw it's been a couple months since your last visit ([LAST_DATE]). Just wanted to check in — are you back in Bangkok any time soon?

If yes, I can pre-block [PREFERRED_THERAPIST] for the dates you mention. No pressure either way, just thought I'd check.
```

### 5.2 — Customer Inactive 90+ Days (Stronger Offer)

```
Hi [NAME] — it's been a while 🙏

We've made some upgrades since you last visited:
• [NEW_SERVICE] now available
• Late-night dispatch extended to 4am
• [Any other genuine changes]

If you're heading back to Bangkok in the next few months, here's a personal note: I'd love to have you back. Use the code REPEAT2026 for 15% off your next booking with us.

Otherwise, no pressure — happy to stay in touch when you're traveling next.
```

## Section 6 — Difficult situations

### 6.1 — Customer Asks for Inappropriate Service

```
I appreciate the inquiry, but SunRed is a strictly professional therapeutic massage service. Our therapists provide aroma, Swedish, deep tissue, and Thai massage only — no other services available.

If you're looking for therapeutic bodywork, we'd be glad to host you. If you're looking for something else, we're not the right fit and I'd rather be upfront.
```

### 6.2 — Last-Minute Cancellation by Customer (Inside 1hr)

```
Got it, no problem — I understand things come up.

Per our policy, last-minute cancellations inside 1 hour carry a 50% charge to compensate the therapist who's already on the way. That's [AMOUNT] THB.

You can settle via:
• Cash next time you're in Bangkok
• PromptPay QR (I'll send the code)
• Bank transfer (details on request)

When you're back in town, I'll prioritize your rebooking.
```

### 6.3 — Therapist Running Late (Proactive Apology)

```
Quick update — [THERAPIST] is running about 15-20 min late due to traffic on [ROAD]. So sorry for the delay.

ETA is now [NEW_TIME]. As an apology for the late arrival, I'm extending your session by 15 minutes at no extra charge.

If this timing no longer works for you, let me know and we'll fully reschedule, no charge.
```

### 6.4 — Complaint / Negative Feedback

```
Thank you for telling me directly — I genuinely appreciate the feedback, and I'm sorry the session didn't meet expectations.

I'd like to make this right. Two options:

1. Refund of [AMOUNT] THB — I can send via [METHOD] today
2. Complimentary 90-min session on your next visit with a different therapist matched specifically to your preferences

Which would you prefer? And could you share a bit more about what specifically didn't work? It helps us improve and avoids repeating the issue.
```

---

## Section 7 — Forum / community engagement

### 7.1 — Reddit / Forum Reply (Helpful, Non-Promotional)

```
Bangkok mobile massage scene is mature — you have real options. A few honest tips:

1. Stay in Sukhumvit Soi 1-25 if convenience matters most. Densest service availability.
2. Avoid the sub-1,000 THB market for your first booking. The 1,500-2,500 THB tier is where the value-quality ratio is best.
3. Specify pressure preference clearly — Thai therapists default lighter than most SG/HK customers want.
4. Top services have named therapists with profiles. If a service won't tell you who's coming, that's a flag.
5. WhatsApp/Telegram bookings should confirm price in writing before you commit. Vague pricing is the #1 sign of an unprofessional operator.

Most reputable operators will work with major hotels (Marriott, Hyatt, Anantara, etc.) without friction. If you have a specific question about a hotel, happy to share what I know.
```

### 7.2 — Forum Self-Disclosure (When Appropriate)

```
Full disclosure — I run a mobile massage service in Bangkok (SunRed), so take my views with that context. That said, the criteria above apply equally to evaluating us or any competitor. I'd rather you book the right service than the cheap one.
```

---

## Section 8 — Operational quick-replies

### 8.1 — "Are you available tonight?" (Quick Yes)

```
Yes 👍 What time and which hotel?
```

### 8.2 — "Are you available tonight?" (Quick No)

```
Sorry, fully booked tonight. Tomorrow is wide open — what time works?
```

### 8.3 — Customer Asking for Wrong Service (Couples / Spa Day / etc.)

```
Just to confirm — SunRed is mobile massage to your hotel room (single therapist, single client per session). 

If you're looking for a couples' massage or full spa day, I'd recommend [LIST OF NEARBY HOTEL SPAS] which can do both. Happy to point you to specific contacts there if helpful.
```

### 8.4 — Customer Outside Service Area

```
Thanks for reaching out — unfortunately we don't currently dispatch to [AREA] (we cover Sukhumvit, Silom, Sathorn, Riverside).

If you're staying somewhere central or moving hotels for the second part of your trip, let me know — I can confirm coverage.
```

---

# Part 2 — Other languages

Carried over verbatim from the archived multi-language file (price blocks
corrected). Section numbering is the archive's own.

## SECTION 1: First-Contact "Welcome / How does this work?"

### 🇨🇳 Mandarin Simplified (Mainland China)

```
您好，感谢您的咨询 🙏

SunRed 上门按摩服务流程：

✓ 持牌按摩师上门到您的酒店客房
✓ 覆盖曼谷 Sukhumvit、Silom、Sathorn、河边四大区域所有4-5星酒店
✓ 时长选择：60分钟 / 90分钟 / 120分钟
✓ 服务项目：芳香、瑞典式、深层按摩、泰式
✓ 深夜服务到凌晨2点
✓ 普通话和英文按摩师可选

预约只需告诉我：
1. 酒店名称
2. 日期与时间
3. 服务类型和时长
4. 是否指定按摩师

价格透明，全包价（无任何额外费用），我会在确认前先报价。

请问您想什么时候预约？
```

### 🇭🇰 Mandarin Traditional (Hong Kong / Taiwan)

```
您好，感謝您的查詢 🙏

SunRed 上門按摩服務流程：

✓ 持牌按摩師上門到您的酒店客房
✓ 覆蓋曼谷 Sukhumvit、Silom、Sathorn、河邊四大區域所有4-5星酒店
✓ 時長選擇：60分鐘 / 90分鐘 / 120分鐘
✓ 服務項目：芳香、瑞典式、深層按摩、泰式
✓ 深夜服務至凌晨2點
✓ 廣東話、普通話、英文按摩師可選

預約只需告訴我：
1. 酒店名稱
2. 日期與時間
3. 服務類型和時長
4. 是否指定按摩師

價格透明，全包價（無任何額外費用），我會在確認前先報價。

請問您想什麼時候預約？
```

### 🇯🇵 Japanese

```
お問い合わせありがとうございます 🙏

SunRed のホテル出張マッサージサービスについて：

✓ ライセンス取得済みのセラピストがホテルのお部屋まで伺います
✓ Sukhumvit、Silom、Sathorn、リバーサイドエリアの4〜5つ星ホテル対応
✓ 60分 / 90分 / 120分コース
✓ アロマ、スウェディッシュ、ディープティシュー、タイマッサージ
✓ 深夜2時までご予約可能
✓ 日本語対応のセラピストもございます（要事前リクエスト）

ご予約に必要な情報：
1. ホテル名
2. 希望日時
3. コース・時間
4. セラピストのご指定（あれば）

料金は明朗・込みこみ（追加料金なし）。ご予約前に必ずご案内します。

ご希望のお時間をお知らせください。
```

### 🇰🇷 Korean

```
SunRed 문의 주셔서 감사합니다 🙏

호텔 출장 마사지 서비스 안내:

✓ 라이선스 보유 마사지사가 호텔 객실로 직접 방문
✓ Sukhumvit, Silom, Sathorn, Riverside 지역 4-5성급 호텔 대응
✓ 60분 / 90분 / 120분 코스
✓ 아로마, 스웨디시, 딥티슈, 타이 마사지
✓ 새벽 2시까지 예약 가능
✓ 한국어 가능 마사지사 있음 (사전 요청 필요)

예약 시 알려주세요:
1. 호텔명
2. 희망 일시
3. 코스 및 시간
4. 특정 마사지사 지정 (있으면)

가격은 명확한 올인 가격 (추가 비용 없음). 예약 확정 전에 안내드립니다.

원하시는 시간 알려주세요.
```

### 🇹🇭 Thai (Local Customers)

```
สวัสดีค่ะ ขอบคุณที่ติดต่อ SunRed 🙏

บริการนวดถึงโรงแรมในกรุงเทพฯ:

✓ พนักงานนวดที่ผ่านการอบรมเดินทางไปที่ห้องคุณ
✓ ครอบคลุมโรงแรม 4-5 ดาวย่านสุขุมวิท สีลม สาทร ริมแม่น้ำ
✓ คอร์ส 60/90/120 นาที
✓ นวดอโรมา, สวีดิช, ดีพทิชชู่, นวดไทย
✓ บริการถึงตี 2 (ขออนุญาตจองล่วงหน้าหากเลยตี 2)
✓ พนักงานนวดพูดไทย/อังกฤษ/จีนได้

แค่บอกเรา:
1. ชื่อโรงแรม
2. วันและเวลา
3. คอร์สและระยะเวลา
4. มีพนักงานคนโปรดไหม

ราคาชัดเจน ไม่มีค่าใช้จ่ายแอบแฝง บอกราคาทั้งหมดก่อนยืนยันค่ะ

อยากนัดเมื่อไหร่ดีคะ?
```

### 🇲🇾 Bahasa Malaysia

```
Hai, terima kasih kerana menghubungi SunRed 🙏

Mengenai khidmat urutan ke bilik hotel:

✓ Pengamal urut bertauliah datang ke bilik hotel anda
✓ Liputan: hotel 4-5 bintang di Sukhumvit, Silom, Sathorn, kawasan Tepi Sungai (Riverside)
✓ Sesi 60 / 90 / 120 minit
✓ Aroma, Swedish, Deep Tissue, Urutan Tradisional Thai
✓ Servis sehingga 2 pagi
✓ Pengamal yang fasih Bahasa Inggeris/Melayu tersedia

Untuk tempahan, beritahu saya:
1. Nama hotel
2. Tarikh & masa
3. Jenis servis & tempoh
4. Sebarang permintaan khusus

Harga adalah tetap dan termasuk semua (tiada caj tersembunyi). Saya akan sahkan harga sebelum tempahan.

Bila anda nak buat tempahan?
```

### 🇸🇦 Arabic (Middle East)

```
مرحباً، شكراً للتواصل مع SunRed 🙏

خدمة المساج في غرفة الفندق:

✓ معالجون مرخصون يأتون مباشرة إلى غرفتك في الفندق
✓ نخدم فنادق 4 و 5 نجوم في مناطق سوكومفيت، سيلوم، ساتورن، النهر
✓ جلسات 60/ 90/ 120 دقيقة
✓ مساج عطري، سويدي، أنسجة عميقة، تايلندي تقليدي
✓ متاحون حتى الساعة 2 صباحاً
✓ معالجون يتحدثون الإنجليزية والعربية الأساسية

للحجز، فقط أرسل لي:
١. اسم الفندق
٢. التاريخ والوقت
٣. نوع الخدمة والمدة
٤. أي طلب خاص

الأسعار ثابتة وشاملة (لا توجد رسوم إضافية). سأؤكد السعر قبل تأكيد الحجز.

متى تفضل الحجز؟
```

---
## SECTION 2: Booking Confirmation

### 🇨🇳 Mandarin Simplified

```
预约已确认 ✅

📅 日期：[DATE]
🕐 时间：[TIME]
🏨 酒店：[HOTEL]，房号 [ROOM]
💆 服务：[SERVICE] — [DURATION] 分钟
👤 按摩师：[THERAPIST]
💰 总额：[AMOUNT] 泰铢（结束后现金支付）

按摩师将提前5分钟通知您即将到达。

取消政策：1小时前免费取消；1小时内取消收50%；未到场全额收费。

如需调整，请直接联系我。期待您的光临 🙏
```

### 🇭🇰 Mandarin Traditional

```
預約已確認 ✅

📅 日期：[DATE]
🕐 時間：[TIME]
🏨 酒店：[HOTEL]，房號 [ROOM]
💆 服務：[SERVICE] — [DURATION] 分鐘
👤 按摩師：[THERAPIST]
💰 總額：[AMOUNT] 泰銖（結束後現金支付）

按摩師會提前5分鐘通知您即將到達。

取消政策：1小時前免費；1小時內取消收50%；未到場全額。

如需調整請直接聯絡我。期待您的光臨 🙏
```

### 🇯🇵 Japanese

```
ご予約確定 ✅

📅 日付：[DATE]
🕐 時間：[TIME]
🏨 ホテル：[HOTEL]、お部屋番号 [ROOM]
💆 サービス：[SERVICE] — [DURATION] 分
👤 担当セラピスト：[THERAPIST]
💰 合計：[AMOUNT] バーツ（施術後の現金払い）

セラピストは到着5分前にご連絡いたします。

キャンセルポリシー：1時間以上前は無料／1時間以内は50%／無断キャンセルは全額。

ご変更がございましたら直接ご連絡ください。お待ちしております 🙏
```

### 🇰🇷 Korean

```
예약 확정 ✅

📅 날짜: [DATE]
🕐 시간: [TIME]
🏨 호텔: [HOTEL], 객실 [ROOM]
💆 서비스: [SERVICE] — [DURATION] 분
👤 마사지사: [THERAPIST]
💰 총액: [AMOUNT] 바트 (서비스 완료 후 현금 결제)

마사지사가 도착 5분 전에 연락드립니다.

취소 정책: 1시간 전 무료 / 1시간 이내 50% / 노쇼 전액

변경 사항 있으시면 직접 연락 주세요. 기다리고 있겠습니다 🙏
```

### 🇹🇭 Thai (Local)

```
ยืนยันการจองแล้วค่ะ ✅

📅 วันที่: [DATE]
🕐 เวลา: [TIME]
🏨 โรงแรม/ที่อยู่: [HOTEL/ADDRESS], ห้อง [ROOM]
💆 บริการ: [SERVICE] — [DURATION] นาที
👤 พนักงานนวด: [THERAPIST]
💰 ยอดรวม: [AMOUNT] บาท (ชำระเงินสดหลังเสร็จบริการ)

พนักงานจะแจ้งล่วงหน้า 5 นาทีก่อนถึงค่ะ

นโยบายยกเลิก: ก่อน 1 ชม. ฟรี / ภายใน 1 ชม. คิด 50% / ไม่มาตรงเวลาคิดเต็ม

หากต้องการแก้ไขแจ้งได้ตลอดค่ะ ขอบคุณที่เลือกใช้บริการ 🙏
```

### 🇲🇾 Bahasa Malaysia

```
Tempahan disahkan ✅

📅 Tarikh: [DATE]
🕐 Masa: [TIME]
🏨 Hotel: [HOTEL], Bilik [ROOM]
💆 Servis: [SERVICE] — [DURATION] minit
👤 Pengamal urut: [THERAPIST]
💰 Jumlah: [AMOUNT] THB (bayaran tunai selepas selesai)

Pengamal urut akan beritahu anda 5 minit sebelum tiba.

Polisi pembatalan: Lebih 1 jam awal — percuma / Dalam 1 jam — caj 50% / No-show — caj penuh

Hubungi saya sekiranya ada perubahan. Terima kasih 🙏
```

### 🇸🇦 Arabic

```
تم تأكيد الحجز ✅

📅 التاريخ: [DATE]
🕐 الوقت: [TIME]
🏨 الفندق: [HOTEL]، غرفة [ROOM]
💆 الخدمة: [SERVICE] — [DURATION] دقيقة
👤 المعالج: [THERAPIST]
💰 المبلغ الإجمالي: [AMOUNT] بات (يدفع نقداً بعد الجلسة)

سيعلمك المعالج قبل وصوله بـ 5 دقائق.

سياسة الإلغاء: قبل ساعة — مجاناً / خلال ساعة — 50% / عدم الحضور — كامل المبلغ

تواصل معي مباشرة لأي تعديلات. شكراً 🙏
```

---
## SECTION 3: Pricing Inquiry Quick Reply

### 🇨🇳 Mandarin Simplified

```
当然可以，我们的价目表如下（全包价）：

🌿 泰式按摩 Thai Massage — 60 / 90 / 120 分钟 — 1,200 / 1,600 / 2,000 泰铢
🌿 芳香精油按摩 Aromatherapy — 60 / 90 / 120 分钟 — 1,400 / 1,800 / 2,400 泰铢
🌿 Gentleman's Signature Therapy — 70 / 120 分钟 — 2,200 / 3,000 泰铢
🌿 SunRed Therapeutic Experience — 70 / 120 分钟 — 3,200 / 4,000 泰铢

凌晨1点后预约 + 300 泰铢
小费由您自由决定（一般200-500泰铢）

需要我推荐适合您时间的按摩师吗？
```

### 🇯🇵 Japanese

```
料金表はこちらです（込みこみ）：

🌿 タイ古式マッサージ Thai Massage — 60 / 90 / 120分 — 1,200 / 1,600 / 2,000 バーツ
🌿 アロマオイルマッサージ Aromatherapy — 60 / 90 / 120分 — 1,400 / 1,800 / 2,400 バーツ
🌿 Gentleman's Signature Therapy — 70 / 120分 — 2,200 / 3,000 バーツ
🌿 SunRed Therapeutic Experience — 70 / 120分 — 3,200 / 4,000 バーツ

深夜1時以降は + 300 バーツ
チップはお気持ちで（200-500 バーツが一般的）

ご希望の時間に合うセラピストをご紹介しましょうか？
```

### 🇹🇭 Thai (Local)

```
ราคาบริการ (ครอบคลุมทุกอย่างแล้ว):

🌿 นวดไทย Thai Massage — 60 / 90 / 120 นาที — 1,200 / 1,600 / 2,000 บาท
🌿 นวดน้ำมันอโรมา Aromatherapy — 60 / 90 / 120 นาที — 1,400 / 1,800 / 2,400 บาท
🌿 Gentleman's Signature Therapy — 70 / 120 นาที — 2,200 / 3,000 บาท
🌿 SunRed Therapeutic Experience — 70 / 120 นาที — 3,200 / 4,000 บาท

จองหลังตี 1 + 300 บาท
ทิปแล้วแต่ความพอใจ (ปกติ 200-500 บาท)

ให้แนะนำพนักงานที่ว่างในเวลาที่ต้องการไหมคะ?
```

---
## SECTION 4: Discretion Question

### 🇨🇳 Mandarin Simplified

```
是的 — 隐私是我们的标准服务。具体来说：

✓ 按摩师便服上门，提一个小拉杆箱（看起来像航空公司机组人员）
✓ 大多数主要酒店（Marriott, Hyatt, Anantara 等）无需在前台登记
✓ 服务全程私密，关门进行
✓ 没有后续电话或骚扰，除非您主动联系
✓ 您的预约记录仅在我们这里，绝不外传

如果您对特定酒店有顾虑，告诉我酒店名，我可以确认具体的入住流程。
```

### 🇯🇵 Japanese

```
はい — プライバシー保護は私たちの標準です。具体的には：

✓ セラピストは私服で小型キャリーバッグを持って到着（航空乗務員のような見た目）
✓ 主要ホテル（Marriott, Hyatt, Anantara 等）ではフロントチェックイン不要
✓ サービスは完全プライベート、ドアを閉めて行います
✓ お客様からのご連絡がない限り、事後の電話やメッセージはございません
✓ ご予約履歴は当方のみで保管、第三者への共有はございません

特定のホテルでご心配な点がございましたら、ホテル名をお知らせください。具体的な入室方法をご案内いたします。
```

### 🇹🇭 Thai (Local)

```
ใช่ค่ะ — ความเป็นส่วนตัวคือมาตรฐานของเรา รายละเอียด:

✓ พนักงานแต่งตัวสุภาพปกติ พร้อมกระเป๋าเดินทางใบเล็ก (เหมือนพนักงานสายการบิน)
✓ โรงแรมใหญ่ส่วนใหญ่ (Marriott, Hyatt, Anantara) ไม่ต้องเช็คอินที่ Lobby
✓ บริการในห้องส่วนตัว ปิดประตู
✓ ไม่มีการโทร/ส่งข้อความรบกวนหลังเสร็จบริการ เว้นแต่คุณติดต่อเอง
✓ ประวัติการจองของคุณเก็บเป็นความลับ ไม่เผยแพร่ที่อื่น

หากกังวลเรื่องโรงแรมเฉพาะ บอกชื่อโรงแรมได้เลยค่ะ จะแจ้งวิธีการเข้าให้ทราบล่วงหน้า
```

---
## SECTION 5: Repeat Customer Welcome Back

### 🇨🇳 Mandarin Simplified

```
欢迎回来曼谷 👋

我们记录中：
• 上次：[DATE]，按摩师 [THERAPIST]
• 您的偏好：[SERVICE]，[PRESSURE]
• 酒店：[HOTEL]

需要预约一样的吗？还是这次想换个项目？
```

### 🇯🇵 Japanese

```
バンコクへお帰りなさい 👋

弊社の記録：
• 前回：[DATE]、担当 [THERAPIST]
• お好み：[SERVICE]、[PRESSURE]
• ホテル：[HOTEL]

前回と同じご予約でよろしいでしょうか？それとも今回は別のサービスにされますか？
```

### 🇰🇷 Korean

```
방콕에 다시 오신 것을 환영합니다 👋

저희 기록:
• 지난번: [DATE], 마사지사 [THERAPIST]
• 선호: [SERVICE], [PRESSURE]
• 호텔: [HOTEL]

지난번과 동일하게 예약하시겠어요? 아니면 이번엔 다른 서비스를 원하시나요?
```

### 🇹🇭 Thai

```
ยินดีต้อนรับกลับมาค่ะ 👋

ดูจากระบบของเรา:
• ครั้งก่อน: [DATE] กับ [THERAPIST]
• ที่คุณชอบ: [SERVICE], [PRESSURE]
• ที่: [HOTEL]

จองเหมือนเดิมไหมคะ? หรือลองเปลี่ยนคอร์สใหม่?
```

---
## SECTION 6: Re-Engagement (Inactive 60-90 Days)

### 🇨🇳 Mandarin Simplified

```
您好 [NAME] — 好久没见 🙏

看了一下，距离您上次预约（[LAST_DATE]）已经过了一段时间。想问一下您最近会不会回曼谷？

如果会，可以提前帮您预留 [PREFERRED_THERAPIST] 的时间。

如果暂时没有计划也没关系，等下次旅行时再联系我就好。
```

### 🇯🇵 Japanese

```
[NAME] 様、ご無沙汰しております 🙏

前回のご利用（[LAST_DATE]）から少し時間が経ちましたので、ご様子伺いまでにご連絡しました。バンコクへのご来訪のご予定はございますか？

もしご予定がございましたら、[PREFERRED_THERAPIST] の枠を仮押さえいたします。

特にご予定がなくても問題ございません。次回ご旅行の際にまたご連絡いただければ幸いです。
```

### 🇰🇷 Korean

```
[NAME] 님, 오랜만입니다 🙏

지난 예약([LAST_DATE]) 이후 시간이 좀 지난 것 같아 안부 인사 드립니다. 곧 방콕 오실 계획이 있으신가요?

만약 계획이 있으시면 [PREFERRED_THERAPIST] 시간을 미리 잡아드릴 수 있습니다.

지금은 아니어도 괜찮습니다. 다음 여행 때 연락 주세요.
```

### 🇹🇭 Thai

```
สวัสดีค่ะคุณ [NAME] — ไม่ได้ทักทายนานเลย 🙏

ดูในระบบ ครั้งล่าสุดที่ใช้บริการคือ [LAST_DATE] ค่ะ ช่วงนี้สบายดีไหมคะ?

ถ้าสนใจมาใช้บริการอีกครั้ง บอกได้นะคะ จะเตรียม [PREFERRED_THERAPIST] ให้ตามวันที่สะดวก

ไม่อยากกวนใจค่ะ แค่ส่งมาทักทายเฉยๆ
```

---
## SECTION 9: Cultural Notes Per Language

Each segment has subtle preferences that change how messages should land:

### 🇨🇳 Mainland Chinese
- **Be efficient.** They appreciate getting to the price quickly. Less small talk.
- **Use 您 (formal "you").** Never 你 in business context.
- **Discounts work.** Even a small "first-time customer 5% discount" massively increases conversion.
- **WeChat Pay or Alipay** are expected payment options. Cash is fine but mention it explicitly.

### 🇭🇰 Hong Kong / 🇹🇼 Taiwan
- **More casual than Mainland.** Cantonese-tinged Mandarin or English mix is natural.
- **Quality and brand matter more than price.** Don't lead with discounts.
- **Discretion language is more important.** They worry about reputation more.

### 🇯🇵 Japanese
- **Politeness levels matter.** Use です/ます forms always. Never casual.
- **Confirmation must be detailed.** Japanese customers appreciate seeing every detail confirmed in writing — date, time, hotel, room, therapist, service, duration, price, cancellation policy. All of it.
- **No emoji except 🙏.** Other emoji read as unprofessional.
- **They almost never complain.** If they do, take it extremely seriously. A Japanese customer who complains is one who would have churned silently otherwise.

### 🇰🇷 Korean
- **Speed and clarity.** Korean customers want to book fast. Long marketing copy backfires.
- **Brand visuals matter.** They check your Instagram/social before booking. Make sure visuals are clean.
- **KakaoTalk is dominant for Koreans living in Korea.** For travelers, WhatsApp works.

### 🇹🇭 Thai (Local)
- **Use ค่ะ/ครับ politely.** Soft language is essential in service businesses.
- **Don't be aggressive.** Thai customers respond to warmth, not urgency.
- **LINE OA is essential.** Thai people don't use WhatsApp internally. Telegram is for younger.
- **PromptPay QR is expected.** Set up a PromptPay QR code that customers can scan.

### 🇲🇾 Bahasa Malaysia
- **Mix English and Malay.** Most KL professionals speak both. Avoid pure formal Malay.
- **Halal-friendly framing.** Even non-Muslim Malaysians appreciate the option (oils, hours during Ramadan).
- **Prices in MYR sometimes appreciated.** Mention "≈ MYR [X]" parenthetically.

### 🇸🇦 Middle East
- **Higher formality. Use full salutations.**
- **Privacy is paramount. Lead with discretion every time.**
- **Female therapist option** is critical for some male customers (cultural reasons).
- **Avoid Friday morning bookings during prayer time.**
- **Ramadan season is huge.** Late-night sessions (after iftar, post-tarawih) are peak demand. Adjust hours April-May.

---

## Where these live in practice

- **WhatsApp Business** → Settings → Business tools → Quick replies.
  Naming convention: `/<lang>-<scenario>` (e.g. `/th-welcome`,
  `/jp-price`) so language and purpose are both greppable.
- **Telegram** → saved messages, or a bot with inline buttons.
- **LINE OA** → the built-in auto-reply/keyword tool (Thai + Japanese
  guests overwhelmingly prefer LINE over WhatsApp).

Personalise one or two sentences before sending — a template that lands
verbatim reads like a bot, and this is a premium, discreet service.
