# SunRed — คู่มือ Off-Page SEO (สำหรับ View)

> อัปเดต 2026-05-31 (Round 28s109) · เขียนโดย Claude co-founder
>
> **อ่านก่อน:** งานบนเว็บ (technical SEO) ทำครบเต็มเพดานแล้ว — schema,
> per-page meta, 32 prerendered routes (มี 中文/日本語/한국어), sitemap,
> perf, ลบ fake-claim หมด. เอกสารนี้คือ **lever ที่เหลือซึ่งดันอันดับจริง**
> และเป็นงานที่ **View ต้องทำเอง** (Claude ทำโค้ดให้ไม่ได้ — มันคือ
> "คนอื่นพูดถึงเรา" นอกเว็บ).
>
> ⚠️ **เตือนเชิงธุรกิจ:** supply มีแค่ 2-3 คน/คืน. ดันอันดับให้ติดจริง
> ต้องมาคู่กับ **available therapist เพิ่ม** ไม่งั้น traffic มาแล้วปิดไม่ได้
> = เสียชื่อ. ทำ SEO ไปพร้อมแก้ supply.

---

## 🥇 ลำดับ 1 — Submit sitemap เข้า Search Engines (ทำวันนี้, ฟรี, 30 นาที)

ตอนนี้เว็บพร้อมให้ crawl เต็มที่แล้ว แต่ต้อง "บอก" search engine ก่อน:

### Google Search Console (สำคัญสุด)
1. ไป https://search.google.com/search-console → Add Property → `sunred.vip`
2. ยืนยันความเป็นเจ้าของ: เลือก **DNS** (ใส่ TXT record ที่ Porkbun) หรือ
   **HTML tag** (บอก Claude จะใส่ meta tag ให้ใน index.html)
3. เมนู Sitemaps → ใส่ `sitemap.xml` → Submit
4. เมนู URL Inspection → ใส่ `https://sunred.vip/` → "Request Indexing"
   (ทำซ้ำกับ /services + 4 service pages)

### Baidu 站长 (จีน — ตลาดใหญ่สุด)
1. ไป https://ziyuan.baidu.com (ต้องมี Baidu account — สมัครด้วยเบอร์มือถือจีน
   หรือใช้ WeChat) 
2. 站点管理 → 添加网站 → `sunred.vip` → ยืนยัน (CNAME/file/HTML tag)
3. 链接提交 → ใส่ `https://sunred.vip/sitemap.xml`
4. **เคล็ดลับ:** Baidu ชอบเว็บที่โหลดเร็วในจีน — ถ้างบถึง พิจารณา CDN จีน
   ทีหลัง. ตอนนี้หน้า `/zh/services/*` มี title+เนื้อหาจีนแล้ว = พร้อม index

### Naver 서치어드바이저 (เกาหลี)
1. ไป https://searchadvisor.naver.com → 사이트 등록 → `https://sunred.vip`
2. ยืนยัน (HTML tag — บอก Claude ใส่ให้)
3. 요청 → 사이트맵 제출 → `sitemap.xml`

### Bing Webmaster (ฟรี, ครอบคลุม Yahoo + DuckDuckGo ด้วย)
1. https://www.bing.com/webmasters → import จาก Google Search Console ได้เลย
   (กดปุ่มเดียว ดึง sitemap + verification มาอัตโนมัติ)

> 💡 หลัง submit: index ใช้เวลา 3-14 วัน. เช็กความคืบหน้าใน Search Console
> ทุกสัปดาห์ (Coverage / Pages report).

---

## 🥈 ลำดับ 2 — Backlinks จาก directory วงการ (lever อันดับ 1 จริงๆ)

Google/Baidu จัดอันดับจาก "ใครลิงก์มาหาเรา" เป็นหลัก. เว็บเรายังไม่มี backlink
เลย = นี่คือสิ่งที่ขาดที่สุด. ลงตามนี้ (ส่วนใหญ่ฟรีหรือถูก):

| Directory | หมายเหตุ | ลิงก์ที่ใส่ |
|---|---|---|
| **Stickman Bangkok** | วงการ nightlife BKK, traffic ฝรั่งสูง | sunred.vip |
| **secretthai / lookpasi** | directory นวดไทยเฉพาะทาง | sunred.vip + /services |
| **bangkok101.com** | city guide, ฝรั่ง expat | sunred.vip |
| **Eros / นวด directory** | วงการตรง | sunred.vip |
| **Sammyboy / samsguide** | มี backlink อยู่แล้ว (ใน schema) — เพิ่มโพสต์ | thread ของเรา |
| **Reddit r/Bangkok, r/ThailandTourism** | soft mention (ห้าม spam — ตอบคำถามจริง + ลิงก์เนียนๆ) | ตามบริบท |

**กฎ:** ใส่ลิงก์ `https://sunred.vip` (หน้าแรก) เป็นหลัก + บางที่ลิงก์ตรง
`/services/xSR-Thai` ได้ (deep link ช่วย long-tail). ใช้ anchor text หลากหลาย
เช่น "Bangkok outcall massage", "in-room massage Bangkok", "SunRed".

---

## 🥉 ลำดับ 3 — Social signals (ทำต่อเนื่อง, ส่ง crawl signal + traffic)

ทุกช่องทางที่มีอยู่ → ใส่ลิงก์เว็บ + โพสต์ลิงก์ service page ตรงๆ:

- **Telegram** (@SunRed_BKK): ใส่ `sunred.vip` ใน channel bio + pin โพสต์ที่มีลิงก์
  service pages. โพสต์ลิงก์ `/zh/services/...` ในกลุ่มจีน, `/ko/...` กลุ่มเกาหลี
- **X/Twitter** (@SunRedvip_bkk): ใส่ลิงก์ใน bio (Twitter link = crawlable)
- **TikTok** (@sun.red59): ลิงก์ใน bio
- **Instagram**: ลิงก์ bio
- **WeChat OA + LINE OA** (ยังไม่มี — ดู §marketing ใน CLAUDE.md): ตั้งขึ้นแล้ว
  ใส่ลิงก์เว็บ → เข้าถึงจีน/ญี่ปุ่น/เกาหลีตรงตลาด

---

## 📊 ลำดับ 4 — รีวิวจริง → rating schema (ทำเมื่อมีรีวิวสะสม)

- ตอนนี้ผมลบ fake rating "4.8★ • 1,200+" ออกหมดแล้ว (Google spam policy)
- เมื่อมีรีวิวจริงสะสม (จากในแอป) → บอก Claude ใส่ `aggregateRating` schema
  ที่ "จริง" → ได้ดาวใน search result (rich snippet) = CTR สูงขึ้นมาก
- ระหว่างนี้: กระตุ้นลูกค้ารีวิวหลังใช้บริการ (ในแอปมีระบบรีวิวอยู่แล้ว)

---

## ✅ Checklist เริ่มวันนี้

- [ ] Google Search Console: verify + submit sitemap + request index 6 หน้าหลัก
- [ ] Bing Webmaster: import จาก Google (1 คลิก)
- [ ] Baidu 站长: verify + submit sitemap (ตลาดจีน)
- [ ] Naver: verify + submit sitemap (ตลาดเกาหลี)
- [ ] ลง directory 3-5 แห่งแรก (Stickman, secretthai, bangkok101)
- [ ] ใส่ลิงก์ sunred.vip ใน bio ทุก social (Telegram/X/TikTok/IG)
- [ ] วางแผนเพิ่ม available therapist (กัน traffic มาแล้วรับไม่ไหว)

> **ทำ §1 + §2 ก่อน** = ได้ผลเร็วสุด. §3-4 เป็นงานต่อเนื่อง.
> ติดตรงไหนเรียก Claude ช่วย (เช่น ใส่ verification meta tag, เขียน copy
> ลง directory, ทำ rating schema เมื่อพร้อม).
