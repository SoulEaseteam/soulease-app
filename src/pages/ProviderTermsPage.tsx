// src/pages/ProviderTermsPage.tsx
//
// 🆕 P3 (marketplace positioning) — the provider agreement.
//
//   The legal-shield piece of the CBODY-style pivot: establish, in writing and
//   at the point a practitioner joins, that SunRed is a NEUTRAL PLATFORM that
//   connects independent practitioners with clients — not their employer, and
//   not the provider of the service itself. Mirrors CBODY's own public framing
//   ("neutral technology platform, we do not employ providers directly").
//
//   Provider-facing (Thai practitioners), so plain clear Thai. Linked from the
//   /apply consent checkbox; a practitioner accepts it when she applies.
//
//   ⚠️ This is the founder's business agreement, not legal advice from the app.
//   It sets the FRAMING; a Thai lawyer should review it before it's relied on
//   as real protection. (Flagged to View in chat, deliberately NOT on the page —
//   an agreement shouldn't undercut itself.)

import React from "react";
import { Box, Typography } from "@mui/material";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#E6197E";

const SECTIONS: { h: string; b: string }[] = [
  {
    h: "1. สถานะของแพลตฟอร์ม",
    b: "SunRed เป็นแพลตฟอร์มที่ทำหน้าที่เชื่อมผู้ให้บริการนวดอิสระเข้ากับลูกค้า SunRed ไม่ได้เป็นนายจ้างของผู้ให้บริการ และไม่ได้เป็นผู้ให้บริการนวดด้วยตนเอง ผู้ให้บริการเป็นผู้ประกอบอาชีพอิสระ (independent contractor) ที่ให้บริการในนามของตนเอง",
  },
  {
    h: "2. สถานะอิสระของผู้ให้บริการ",
    b: "ผู้ให้บริการดำเนินงานในนามตนเอง รับผิดชอบภาษี ประกัน อุปกรณ์ และการเดินทางของตนเองทั้งหมด SunRed ไม่หักภาษี ณ ที่จ่าย ไม่มีความสัมพันธ์แบบลูกจ้าง–นายจ้าง และไม่มีสวัสดิการลูกจ้าง ผู้ให้บริการมีอิสระในการรับหรือปฏิเสธงานแต่ละครั้ง",
  },
  {
    h: "3. ขอบเขตของบริการ",
    b: "บริการที่ให้ผ่านแพลตฟอร์มคือบริการนวดเพื่อสุขภาพและการผ่อนคลาย (non-medical wellness) ผู้ให้บริการตกลงที่จะปฏิบัติตามกฎหมายและระเบียบข้อบังคับของประเทศไทยที่เกี่ยวข้องกับการประกอบอาชีพของตนเองตลอดเวลา",
  },
  {
    h: "4. บทบาทของ SunRed",
    b: "SunRed ทำหน้าที่แนะนำและจับคู่ลูกค้า ประสานงานผ่านทีม concierge และดูแลระบบนัดหมาย โดยเก็บค่าบริการแพลตฟอร์ม (commission) ตามอัตราที่ตกลงกันไว้ การชำระเงินระหว่างลูกค้ากับผู้ให้บริการเป็นแบบนอกแอป (เงินสดหรือโอน) ตามที่ตกลงในแต่ละงาน",
  },
  {
    h: "5. ความรับผิดชอบของผู้ให้บริการ",
    b: "ผู้ให้บริการตกลงที่จะให้ข้อมูลที่เป็นจริง ปฏิบัติต่อลูกค้าอย่างมืออาชีพและสุภาพ ตรงต่อเวลา รักษาความสะอาดและมาตรฐานการบริการ และไม่กระทำการใดที่ผิดกฎหมายหรือเสื่อมเสียต่อชื่อเสียงของแพลตฟอร์ม",
  },
  {
    h: "6. การรักษาความลับและความเป็นส่วนตัว",
    b: "ข้อมูลของลูกค้า (ชื่อ ที่อยู่ เบอร์ติดต่อ และรายละเอียดการนัดหมาย) เป็นความลับ ผู้ให้บริการต้องไม่เปิดเผย ส่งต่อ หรือนำไปใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากการให้บริการผ่านแพลตฟอร์ม",
  },
  {
    h: "7. ไม่รับประกันปริมาณงาน",
    b: "SunRed ไม่รับประกันจำนวนงาน ชั่วโมงทำงาน หรือรายได้ใด ๆ ปริมาณงานขึ้นอยู่กับความต้องการของลูกค้าและความพร้อมของผู้ให้บริการ",
  },
  {
    h: "8. การระงับและการยกเลิก",
    b: "ทั้งสองฝ่ายสามารถยุติความร่วมมือได้ทุกเมื่อ SunRed ขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ให้บริการที่ฝ่าฝืนข้อตกลงนี้ ให้ข้อมูลเท็จ หรือมีพฤติกรรมที่กระทบต่อความปลอดภัยของลูกค้าหรือชื่อเสียงของแพลตฟอร์ม",
  },
  {
    h: "9. ข้อจำกัดความรับผิด",
    b: "SunRed เป็นเพียงตัวกลางที่เชื่อมผู้ให้บริการกับลูกค้า และไม่รับผิดชอบต่อการกระทำ ข้อพิพาท หรือความเสียหายใด ๆ ที่เกิดขึ้นโดยตรงระหว่างผู้ให้บริการกับลูกค้า",
  },
  {
    h: "10. การยอมรับข้อตกลง",
    b: "การส่งใบสมัครและ/หรือการทำเครื่องหมายยอมรับข้อตกลงนี้ ถือว่าผู้ให้บริการได้อ่าน เข้าใจ และยอมรับเงื่อนไขทั้งหมดข้างต้นแล้ว",
  },
];

const ProviderTermsPage: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FDF2F7 0%, #F7F5F6 55%, #F4F6F5 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        py: { xs: 4, md: 7 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 640 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, textAlign: "center", color: "#2a1a14", mb: 0.5 }}>
          SUN<span style={{ color: ROSE }}>RED</span>
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, textAlign: "center", color: "#2a1a14", mb: 0.5 }}>
          ข้อตกลงผู้ให้บริการ
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, textAlign: "center", color: "#8A93A0", mb: 3 }}>
          ปรับปรุงล่าสุด · 21 สิงหาคม 2569
        </Typography>

        <Box
          sx={{
            p: { xs: 2.5, md: 3.5 }, background: "#fff", borderRadius: "20px",
            border: "1px solid rgba(230,25,126,0.12)", boxShadow: "0 8px 30px rgba(31,41,51,0.06)",
            display: "flex", flexDirection: "column", gap: 2.5,
          }}
        >
          <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "#4A5568", lineHeight: 1.8 }}>
            ข้อตกลงนี้อธิบายความสัมพันธ์ระหว่างผู้ให้บริการอิสระกับแพลตฟอร์ม SunRed
            กรุณาอ่านโดยละเอียดก่อนสมัคร
          </Typography>

          {SECTIONS.map((s) => (
            <Box key={s.h}>
              <Typography sx={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 800, color: "#2a1a14", mb: 0.75 }}>
                {s.h}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "#4A5568", lineHeight: 1.85 }}>
                {s.b}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ProviderTermsPage;
