// src/pages/therapist/TherapistGuidePage.tsx
//
// 🆕 Round 28x.121 (founder: "ขอข้อความอธิบายการใช้งานแต่ละฟังก์ชัน" → chose
//   an in-app guide + a copy-paste message for Telegram/LINE) — this is the
//   in-app half: a manual a practitioner can reopen any time, reachable from
//   Settings.
//
//   Content is written against what the app ACTUALLY does today (routes in
//   App.tsx, the 8 Home tiles, the Jobs dispatch flow, the Wed/Sun hours
//   rule, the 12-photo gallery cap with admin approval) — not an idealised
//   feature list. When a feature changes, update the matching section here
//   in the SAME round, the way CLAUDE.md's pricing-drift lesson requires:
//   a guide that quietly goes stale is worse than no guide, because she'll
//   trust it.
//
//   Deliberately collapsible: on a phone this is ~7 screens of text if it's
//   all open at once, which is unreadable. Sections start closed except the
//   first, so the page opens as a scannable table of contents.

import React, { useState } from "react";
import { Box, Typography, Button, Collapse } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  CaretLeft,
  CaretDown,
  SignIn,
  SquaresFour,
  Briefcase,
  UserCircle,
  Gear,
  type Icon as PhosphorIcon,
} from "phosphor-react";

import { responsiveShell } from "@/theme/breakpoints";
import ConciergeChannels from "@/components/common/ConciergeChannels";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#FF9999";
const ROSE_DEEP = "#FF9999";

interface GuideItem {
  /** Bold lead-in — the thing she's looking for. */
  title: string;
  /** What it does / how to use it. */
  body: string;
}

interface GuideSection {
  id: string;
  Icon: PhosphorIcon;
  title: string;
  items: GuideItem[];
}

const SECTIONS: GuideSection[] = [
  {
    id: "start",
    Icon: SignIn,
    title: "เริ่มต้นใช้งาน",
    items: [
      {
        title: "เข้าสู่ระบบ",
        body: "เปิด sunred.vip/staff แล้วใส่เบอร์โทร ชื่อผู้ใช้ หรืออีเมล พร้อมรหัสผ่านที่แอดมินให้มา บัญชีพนักงานสมัครเองไม่ได้ ต้องให้แอดมินเปิดให้เท่านั้น",
      },
      {
        title: "ติดตั้งลงหน้าจอมือถือ",
        body: "ที่หน้าเข้าสู่ระบบจะมีการ์ด “ติดตั้งแอปลงเครื่อง” — Android กดปุ่มติดตั้งได้เลย ส่วน iPhone ให้แตะไอคอนแชร์ด้านล่างของ Safari แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” จากนั้นจะมีไอคอน SunRed Staff อยู่หน้าจอเหมือนแอปจริง เปิดได้เร็วไม่ต้องพิมพ์เว็บทุกครั้ง",
      },
      {
        title: "ลืมรหัสผ่าน",
        body: "กด “ลืมรหัสผ่าน? ติดต่อแอดมิน” ที่หน้าเข้าสู่ระบบ ระบบจะเปิดแชทหาแอดมินให้ ไม่มีระบบรีเซ็ตเอง เพื่อความปลอดภัยของบัญชี",
      },
      {
        title: "ถ้าขึ้นว่าบัญชียังไม่เปิดใช้งาน",
        body: "แปลว่าบัญชีถูกสร้างแล้วแต่ยังไม่ผูกกับโปรไฟล์พนักงาน ทักแอดมินทาง WhatsApp, LINE หรือ Telegram จากปุ่มบนหน้าจอนั้นได้เลย",
      },
    ],
  },
  {
    id: "tabs",
    Icon: SquaresFour,
    title: "แถบล่าง 4 ปุ่ม",
    items: [
      {
        title: "Practitioners",
        body: "เปิดหน้าเว็บฝั่งลูกค้าในแท็บใหม่ ใช้ดูว่าโปรไฟล์ของเราที่ลูกค้าเห็นเป็นยังไง รูป ราคา รีวิว ครบไหม แท็บงานของเราไม่หายไปไหน กลับมาได้เลย",
      },
      {
        title: "หน้าทำงาน",
        body: "หน้าหลัก มีการ์ดโปรไฟล์ของเราอยู่บนสุด แล้วมีเมนูย่อย 8 อันด้านล่าง",
      },
      {
        title: "งานของฉัน",
        body: "งานที่แอดมินจ่ายให้ ทั้งงานวันนี้ งานที่ทำเสร็จแล้ว และงานที่ยกเลิก",
      },
      {
        title: "Profile",
        body: "ตั้งสถานะว่าง/ไม่ว่าง วันหยุด เวลาทำงาน ตำแหน่งปัจจุบัน และเข้าหน้าตั้งค่า",
      },
    ],
  },
  {
    id: "jobs",
    Icon: Briefcase,
    title: "งานของฉัน · การรับงาน",
    items: [
      {
        title: "รับงาน / ไม่รับงาน",
        body: "งานใหม่จะอยู่ในแท็บ Today ตอนยังไม่กดรับ จะยังไม่เห็นที่อยู่กับเบอร์ลูกค้า เห็นแค่บริการ เวลา และราคา กด “รับงาน” แล้วข้อมูลจะแสดงครบ ถ้ากด “ไม่รับ” ระบบจะแจ้งแอดมินให้จ่ายงานต่อให้คนอื่นทันที",
      },
      {
        title: "อัปเดตสถานะระหว่างทำงาน",
        body: "หลังกดรับงานแล้ว จะมีปุ่มให้กดไล่ตามลำดับ: ออกเดินทาง → ถึงแล้ว (ถ่ายรูปจุดนัดพบส่งแอดมิน) → เริ่มนวด → จบงาน ทุกครั้งที่กด แอดมินจะเห็นทันที ไม่ต้องโทรบอก และตอนกด “จบงาน” ระบบจะปิดงานให้เป็นเสร็จสิ้นอัตโนมัติ พร้อมเปลี่ยนสถานะบนหน้าเว็บให้เอง",
      },
      {
        title: "ถึงแล้ว — ต้องถ่ายรูปจุดรอพบ",
        body: "พอถึงที่หมาย กดปุ่ม “ถึงแล้ว · ถ่ายรูป” กล้องจะเปิดขึ้นมาให้ถ่ายจุดที่รอลูกค้า รูปจะส่งเข้าแชทแอดมินพร้อมแจ้งว่าคุณถึงแล้ว ตรงนี้ใช้แทนการโทร เพราะตอนรออยู่หน้างานมักไม่สะดวกโทร",
      },
      {
        title: "เปิดแผนที่ / โทรหาลูกค้า",
        body: "หลังรับงานจะมีปุ่มเปิดแผนที่นำทางไปที่หมาย และปุ่มโทรหาลูกค้าโดยตรง ไม่ต้องก๊อปเบอร์เอง — ยกเว้นตอนถึงที่หมายแล้ว ให้ถ่ายรูปจุดนัดพบส่งแอดมินแทนการโทร",
      },
      {
        title: "รหัสการจอง (SR-XXXXXXXX)",
        body: "แต่ละงานจะมีรหัสประจำงาน ใช้อ้างอิงกับแอดมินได้เลยเวลามีปัญหา ระบบไม่แสดงชื่อจริงของลูกค้าเพื่อความเป็นส่วนตัวของทั้งสองฝ่าย",
      },
      {
        title: "ป้ายระดับสมาชิก",
        body: "ถ้าลูกค้าเป็นสมาชิก จะมีป้ายระดับ (บรอนซ์ / ซิลเวอร์ / โกลด์ / แบล็ค VIP) ขึ้นข้างรหัสการจอง ไว้ดูว่าเป็นลูกค้าประจำระดับไหน",
      },
    ],
  },
  {
    id: "home",
    Icon: SquaresFour,
    title: "หน้าทำงาน · เมนูทั้ง 8",
    items: [
      {
        title: "รายการรีพอร์ต · Reports",
        body: "ถ้าลูกค้าแจ้งปัญหาเกี่ยวกับงานของเรา จะมาโผล่ที่นี่ แตะเพื่อกดรับทราบ ระบบไม่แสดงว่าใครเป็นคนแจ้ง",
      },
      {
        title: "สรุปผลงาน · Performance",
        body: "ดูรายได้ของตัวเอง แยกเป็นรายวัน/เดือน/ปี และแยกตามบริการ พร้อมสถิติลูกค้ากลับมาใช้ซ้ำ (rebook rate) เทียบกับค่าเฉลี่ยตลาดกรุงเทพฯ",
      },
      {
        title: "แกลเลอรี · Gallery",
        body: "อัปโหลดรูปได้สูงสุด 12 รูป รูปใหม่ทุกรูปต้องรอแอดมินตรวจก่อนขึ้นจริง ลบรูปเองได้ทันที (ระบบจะถามยืนยันก่อนลบเสมอ) และกดค้างที่รูปเพื่อลากเรียงลำดับใหม่ได้",
      },
      {
        title: "บริการที่ทำได้ · Services",
        body: "เลือกบริการที่เราเปิดรับ ลูกค้าจะเห็นตรงกับที่เลือกไว้ ด้านล่างมีตารางราคาบอกว่าแต่ละเมนูลูกค้าจ่ายเท่าไร เราได้เท่าไร ร้านได้เท่าไร และตารางค่าเดินทางแยกต่างหาก",
      },
      {
        title: "ลักษณะเฉพาะตัว · Features",
        body: "จุดเด่นของเราที่ลูกค้าเห็นบนโปรไฟล์ เช่น ส่วนสูง น้ำหนัก ความถนัด",
      },
      {
        title: "ภาษา · Languages",
        body: "ภาษาที่สื่อสารได้ ช่วยให้ลูกค้าต่างชาติเลือกเราถูกคน",
      },
      {
        title: "ประวัติแนะนำ · Bio",
        body: "คำแนะนำตัวสั้นๆ ที่แสดงบนโปรไฟล์สาธารณะ",
      },
      {
        title: "บัญชีธนาคาร · Payout",
        body: "บัญชีที่ใช้รับเงิน แก้ไขเองได้ ทุกครั้งที่แก้ระบบจะแจ้งแอดมินอัตโนมัติเพื่อความปลอดภัยของเงินเรา",
      },
    ],
  },
  {
    id: "profile",
    Icon: UserCircle,
    title: "โปรไฟล์ · สถานะการทำงาน",
    items: [
      {
        title: "สถานะการทำงาน",
        body: "เลือกได้ 4 แบบ — Auto ให้ระบบตัดสินจากเวลาทำงานและคิวงาน, ว่าง (Available) เปิดรับงาน, กำลังนวด (In session) ติดลูกค้าอยู่, พัก (Resting) ซ่อนจากผลค้นหา ลูกค้าเห็นสถานะนี้ทันทีที่เปลี่ยน",
      },
      {
        title: "โหมดวันหยุด",
        body: "เปิดแล้วจะหยุดทั้งวัน ทับทั้งโหมด Auto และเวลาทำงานที่ตั้งไว้",
      },
      {
        title: "ตำแหน่งปัจจุบัน · Current location",
        body: "จุดที่เราอยู่ตอนนี้ ระบบใช้คำนวณค่าเดินทางและระยะทางให้ลูกค้า กด \"อัปเดตตำแหน่ง GPS\" ทุกครั้งที่ย้ายที่ · ครั้งแรกให้กด \"ตั้งจุดนี้เป็นจุดสแตนด์บาย\" ที่จุดประจำของเราก่อน แล้วปุ่ม \"กลับจุดสแตนด์บาย\" ถึงจะใช้ได้ และระบบจะรีเซ็ตกลับให้เองทุกวัน",
      },
      {
        title: "เวลาทำงาน",
        body: "แก้ไขได้เฉพาะวันพุธและวันอาทิตย์เท่านั้น เพื่อให้ตารางงานคาดเดาได้ ถ้าไม่ใช่สองวันนี้จะขึ้นว่าแก้ครั้งถัดไปได้เมื่อไร",
      },
    ],
  },
  {
    id: "settings",
    Icon: Gear,
    title: "ตั้งค่า",
    items: [
      {
        title: "ภาษา",
        body: "เปลี่ยนภาษาของแอปได้ตามที่ถนัด",
      },
      {
        title: "เปลี่ยนรหัสผ่าน",
        body: "ตั้งรหัสใหม่ได้เอง แนะนำให้เปลี่ยนหลังได้รับบัญชีครั้งแรก",
      },
      {
        title: "ธีมหน้าจอ · Display",
        body: "Auto จะสว่างตอนกลางวันและมืดตอนกลางคืนตามเวลากรุงเทพฯ หรือจะล็อกเป็น Light / Dark เองก็ได้",
      },
      {
        title: "ออกจากระบบ",
        body: "ถ้าใช้เครื่องร่วมกับคนอื่น ควรกดออกทุกครั้งที่เลิกใช้",
      },
    ],
  },
];

const TherapistGuidePage: React.FC = () => {
  const navigate = useNavigate();
  // First section open on arrival — the page reads as a table of contents
  // with a worked example already visible, instead of a wall of closed rows.
  const [openId, setOpenId] = useState<string | null>(SECTIONS[0].id);

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 10 }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 1.5 }}>
        <Button onClick={() => navigate("/therapist/settings")} sx={{ minWidth: 0, p: 1, color: "var(--sr-ink)" }}>
          <CaretLeft size={22} />
        </Button>
        <Typography sx={{ flex: 1, textAlign: "center", fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", mr: 5 }}>
          วิธีใช้งาน · How to use
        </Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-muted)", lineHeight: 1.6, mb: 2 }}>
          แตะหัวข้อเพื่อดูรายละเอียด — เปิดอ่านซ้ำได้ตลอดจากหน้าตั้งค่า
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {SECTIONS.map(({ id, Icon, title, items }) => {
            const open = openId === id;
            return (
              <Box
                key={id}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  background: open
                    ? "linear-gradient(160deg, rgba(224,112,143,0.10) 0%, var(--sr-panel) 45%, var(--sr-panel) 100%)"
                    : "var(--sr-panel)",
                  border: `1px solid ${open ? "rgba(194,24,91,0.24)" : "var(--sr-hairline)"}`,
                  boxShadow: open ? "0 8px 22px rgba(194,24,91,0.10)" : "var(--sr-card-shadow)",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
              >
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenId(open ? null : id); }}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.25,
                    p: "14px 16px", cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Box
                    sx={{
                      width: 32, height: 32, borderRadius: "11px", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`,
                      boxShadow: "0 3px 8px rgba(194,24,91,0.30)",
                    }}
                  >
                    <Icon size={17} weight="duotone" color="#fff" />
                  </Box>
                  <Typography sx={{ flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: 14, color: "var(--sr-ink)" }}>
                    {title}
                  </Typography>
                  <CaretDown
                    size={16}
                    color="var(--sr-dim)"
                    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", flexShrink: 0 }}
                  />
                </Box>

                <Collapse in={open} timeout={200} unmountOnExit>
                  <Box sx={{ px: "16px", pb: "16px", display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {items.map((it) => (
                      <Box key={it.title} sx={{ pl: 1.5, borderLeft: `2px solid ${ROSE}55` }}>
                        <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: 12.5, color: "var(--sr-ink)", mb: 0.4 }}>
                          {it.title}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)", lineHeight: 1.65 }}>
                          {it.body}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>

        {/* Escape hatch — a guide can't cover everything, and a practitioner
            stuck at 2am needs the concierge, not more reading.
            🆕 Round 28x.124 (founder: "อันนี้ให้เปลี่ยนเป็นรูป2") — was a
            single WhatsApp button; now the same three-channel capsule the
            activation screen uses, so she picks the app she actually has.
            Extracted to ConciergeChannels so the two can't drift. */}
        <Box
          sx={{
            mt: 2.5, p: "16px", borderRadius: 3,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", lineHeight: 1.6, mb: 1.5 }}>
            มีอะไรไม่เข้าใจ หรือแอปมีปัญหา ทักแอดมินได้ตลอด 24 ชม.
          </Typography>
          <ConciergeChannels message="สวัสดีค่ะ ฉันเป็นพนักงาน มีเรื่องอยากสอบถามเกี่ยวกับการใช้งานแอปค่ะ" />
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistGuidePage;
