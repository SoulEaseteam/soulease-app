> # ⚠️ ARCHIVED 2026-07-28 — DO NOT USE AS-IS
>
> Superseded by **`docs/strategy/message-templates.md`**, which carries these
> translations forward verbatim. Kept as the translation source of record.
>
> **Why it was pulled:**
> - Prices in the CN / JP / TH price-list templates are the same stale figures
>   as the companion English file (see `SunRed_Message_Templates.md` in this
>   folder). Real prices: `src/utils/servicePricing.ts` + `src/data/services.ts`.
> - Coverage was uneven and undocumented — HK-TW, Bahasa and Arabic had only
>   first-contact + booking-confirm; no pricing, discretion, repeat or
>   re-engagement templates.
> - Self-contradiction: the Japanese cultural note says "no emoji except 🙏"
>   while the Japanese templates in the same file use 👋 ✅ 📅 🕐 🏨 💆 👤 💰.
> - Its cultural notes promise WeChat Pay / Alipay to Mainland guests, but every
>   booking-confirm template in it says cash-after-service.

# SunRed — Multi-Language Message Templates

**Coverage:** 8 languages — English (existing), Mandarin Simplified (CN), Mandarin Traditional (HK/TW), Japanese (JP), Korean (KR), Thai (local), Bahasa Malaysia (MY), Arabic (UAE/SA — for Middle East)

**Key principle:** These are starter templates. You don't need to memorize them — copy-paste, edit `[BRACKETS]`, send. AI translation tools (Google Translate, DeepL, Gemini) can fill gaps for one-off responses, but having pre-made templates for the most common scenarios makes you 10x faster.

**Solo operator hack:** Save each template as a Quick Reply in WhatsApp Business with a shortcut like `/zh-welcome`, `/jp-welcome`, `/th-welcome`. Type the shortcut, get the full template instantly.

---

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

🌿 60分钟 — 1,800 泰铢（芳香 / 瑞典式）
🌿 90分钟 — 2,500-2,800 泰铢（芳香 / 深层 / 瑞典式）
🌿 120分钟 — 3,500 泰铢（芳香+拉伸 / 综合）
🌿 泰式 60/90分钟 — 1,500 / 2,200 泰铢

凌晨1点后预约 + 300 泰铢
小费由您自由决定（一般200-500泰铢）

需要我推荐适合您时间的按摩师吗？
```

### 🇯🇵 Japanese

```
料金表はこちらです（込みこみ）：

🌿 60分 — 1,800 バーツ（アロマ / スウェディッシュ）
🌿 90分 — 2,500-2,800 バーツ（アロマ / ディープ / スウェディッシュ）
🌿 120分 — 3,500 バーツ（アロマ+ストレッチ / コンボ）
🌿 タイマッサージ 60/90分 — 1,500 / 2,200 バーツ

深夜1時以降は + 300 バーツ
チップはお気持ちで（200-500 バーツが一般的）

ご希望の時間に合うセラピストをご紹介しましょうか？
```

### 🇹🇭 Thai (Local)

```
ราคาบริการ (ครอบคลุมทุกอย่างแล้ว):

🌿 60 นาที — 1,800 บาท (อโรมา / สวีดิช)
🌿 90 นาที — 2,500-2,800 บาท (อโรมา / ดีพทิชชู่ / สวีดิช)
🌿 120 นาที — 3,500 บาท (อโรมา + ยืดเหยียด)
🌿 นวดไทย 60/90 นาที — 1,500 / 2,200 บาท

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

## SECTION 7: AI Translation Workflow (For Anything Not Covered Above)

When you receive a message in a language you don't have a template for:

### Step 1: Identify the language
- Telegram and WhatsApp don't auto-detect, but you can usually tell from the script (Cyrillic = Russian, Devanagari = Hindi, etc.)

### Step 2: Translate the customer's message into your working language
- **Best free option**: DeepL (deepl.com) — handles 30+ languages, much better than Google Translate for Asian languages
- **Best for Asian languages**: Use Claude or ChatGPT — paste the message and ask "translate to English and explain context"

### Step 3: Compose your reply in English/Thai (your working language)

### Step 4: Translate your reply back to the customer's language
- For routine messages, DeepL is fine
- For nuanced/important messages (complaints, special requests), use Claude/ChatGPT and ask: "translate this to [language], maintaining a polite and professional service-business tone"

### Step 5: Always include both languages in your final reply
- This is the trick that makes you look bilingual: send the translated version PLUS the English version
- Example: "[Mandarin reply text] / English: [original English text]"
- Customers appreciate seeing the translation isn't a black box, and you maintain trust if there's a translation error

### Recommended AI tools for this workflow:

| Tool | Best For | Cost |
|------|----------|------|
| DeepL | Translation accuracy | Free up to 5,000 chars/month |
| Claude | Context-aware nuanced translation | Free tier or $20/month Pro |
| ChatGPT | Quick translation + tone matching | Free tier or $20/month Plus |
| Google Translate | Quick rough translation | Free |
| Papago (NAVER) | Best for Korean | Free |
| Baidu Translate | Best for Mandarin | Free |

**Solo operator tip**: Set up a Claude or ChatGPT chat dedicated to translations. Keep it open in a tab. When you get a message in a language you don't know, paste it, get a quick reply, send. Total handling time: 60-90 seconds vs. 5-10 minutes if you tried to figure it out manually.

---

## SECTION 8: Voice Note Strategy (Since You Don't Take Calls)

Some Asian customers (especially older Chinese, Korean, and Indian travelers) prefer voice notes over text. They'll send you a voice note even if you've never sent one.

**You don't need to send voice notes back.** What you need:

1. **Transcribe their voice note**: WhatsApp/Telegram both have built-in transcription. iPhone has it system-wide. Otherwise, voice-to-text apps (Otter.ai free tier, Whisper API).

2. **Translate the transcript** if needed (using AI workflow above).

3. **Reply with text only**, but warmly — and acknowledge the voice note: "Thanks for your voice message — I want to make sure I get your details right, so let me reply in writing..."

This keeps you chat-only operationally while not turning away voice-preferring customers.

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
