// src/pages/ProviderTermsPage.tsx
//
// 🆕 P3 (marketplace positioning) — the provider agreement, TH / 中文 / EN.
//
//   The legal-shield piece of the CBODY-style pivot: establish, in writing and
//   at the point a practitioner joins, that SunRed is a NEUTRAL PLATFORM that
//   connects independent practitioners with clients — not their employer, and
//   not the provider of the service itself.
//
//   Reads ?lang (carried from the /apply consent link) so it opens in the same
//   language, and has its own toggle. Inline dictionary, self-contained.
//
//   ⚠️ This is the founder's business agreement, not legal advice from the app.
//   It sets the FRAMING; a Thai lawyer should review it before it's relied on
//   as real protection.

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#E6197E";

type Lang = "th" | "en" | "zh";
const LANGS: { code: Lang; label: string }[] = [
  { code: "th", label: "ไทย" },
  { code: "zh", label: "中文" },
  { code: "en", label: "EN" },
];

interface Terms {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; b: string }[];
}

const T: Record<Lang, Terms> = {
  th: {
    title: "ข้อตกลงผู้ให้บริการ",
    updated: "ปรับปรุงล่าสุด · 21 สิงหาคม 2569",
    intro: "ข้อตกลงนี้อธิบายความสัมพันธ์ระหว่างผู้ให้บริการอิสระกับแพลตฟอร์ม SunRed กรุณาอ่านโดยละเอียดก่อนสมัคร",
    sections: [
      { h: "1. สถานะของแพลตฟอร์ม", b: "SunRed เป็นแพลตฟอร์มที่ทำหน้าที่เชื่อมผู้ให้บริการนวดอิสระเข้ากับลูกค้า SunRed ไม่ได้เป็นนายจ้างของผู้ให้บริการ และไม่ได้เป็นผู้ให้บริการนวดด้วยตนเอง ผู้ให้บริการเป็นผู้ประกอบอาชีพอิสระที่ให้บริการในนามของตนเอง" },
      { h: "2. สถานะอิสระของผู้ให้บริการ", b: "ผู้ให้บริการดำเนินงานในนามตนเอง รับผิดชอบภาษี ประกัน อุปกรณ์ และการเดินทางของตนเองทั้งหมด SunRed ไม่หักภาษี ณ ที่จ่าย ไม่มีความสัมพันธ์แบบลูกจ้าง–นายจ้าง และไม่มีสวัสดิการลูกจ้าง ผู้ให้บริการมีอิสระในการรับหรือปฏิเสธงานแต่ละครั้ง" },
      { h: "3. ขอบเขตของบริการ", b: "บริการที่ให้ผ่านแพลตฟอร์มคือบริการนวดเพื่อสุขภาพและการผ่อนคลาย ผู้ให้บริการตกลงที่จะปฏิบัติตามกฎหมายและระเบียบข้อบังคับของประเทศไทยที่เกี่ยวข้องตลอดเวลา" },
      { h: "4. บทบาทของ SunRed", b: "SunRed ทำหน้าที่แนะนำและจับคู่ลูกค้า ประสานงานผ่านทีม concierge และดูแลระบบนัดหมาย โดยเก็บค่าบริการแพลตฟอร์มตามอัตราที่ตกลงกันไว้ การชำระเงินระหว่างลูกค้ากับผู้ให้บริการเป็นแบบนอกแอปตามที่ตกลงในแต่ละงาน" },
      { h: "5. ความรับผิดชอบของผู้ให้บริการ", b: "ผู้ให้บริการตกลงที่จะให้ข้อมูลที่เป็นจริง ปฏิบัติต่อลูกค้าอย่างมืออาชีพและสุภาพ ตรงต่อเวลา รักษามาตรฐานการบริการ และไม่กระทำการใดที่ผิดกฎหมายหรือเสื่อมเสียต่อชื่อเสียงของแพลตฟอร์ม" },
      { h: "6. การรักษาความลับและความเป็นส่วนตัว", b: "ข้อมูลของลูกค้าเป็นความลับ ผู้ให้บริการต้องไม่เปิดเผย ส่งต่อ หรือนำไปใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากการให้บริการผ่านแพลตฟอร์ม" },
      { h: "7. ไม่รับประกันปริมาณงาน", b: "SunRed ไม่รับประกันจำนวนงาน ชั่วโมงทำงาน หรือรายได้ใด ๆ ปริมาณงานขึ้นอยู่กับความต้องการของลูกค้าและความพร้อมของผู้ให้บริการ" },
      { h: "8. การระงับและการยกเลิก", b: "ทั้งสองฝ่ายสามารถยุติความร่วมมือได้ทุกเมื่อ SunRed ขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ให้บริการที่ฝ่าฝืนข้อตกลงนี้ ให้ข้อมูลเท็จ หรือมีพฤติกรรมที่กระทบต่อความปลอดภัยของลูกค้าหรือชื่อเสียงของแพลตฟอร์ม" },
      { h: "9. ข้อจำกัดความรับผิด", b: "SunRed เป็นเพียงตัวกลางที่เชื่อมผู้ให้บริการกับลูกค้า และไม่รับผิดชอบต่อการกระทำ ข้อพิพาท หรือความเสียหายใด ๆ ที่เกิดขึ้นโดยตรงระหว่างผู้ให้บริการกับลูกค้า" },
      { h: "10. การยอมรับข้อตกลง", b: "การส่งใบสมัครและ/หรือการทำเครื่องหมายยอมรับข้อตกลงนี้ ถือว่าผู้ให้บริการได้อ่าน เข้าใจ และยอมรับเงื่อนไขทั้งหมดข้างต้นแล้ว" },
    ],
  },
  zh: {
    title: "服务提供者协议",
    updated: "最后更新 · 2026年8月21日",
    intro: "本协议说明独立服务提供者与 SunRed 平台之间的关系，请在申请前仔细阅读。",
    sections: [
      { h: "1. 平台性质", b: "SunRed 是连接独立按摩服务者与客户的平台。SunRed 并非服务者的雇主，也不亲自提供按摩服务。服务者为以本人名义提供服务的独立承包人。" },
      { h: "2. 服务者的独立身份", b: "服务者以本人名义经营，自行承担税务、保险、器材及交通等一切费用。SunRed 不代扣税款，双方不构成雇佣关系，服务者不享有雇员福利，并可自由接受或拒绝每一单工作。" },
      { h: "3. 服务范围", b: "通过平台提供的服务为保健与放松类按摩服务。服务者同意始终遵守泰国相关法律法规。" },
      { h: "4. SunRed 的角色", b: "SunRed 负责推荐与匹配客户、通过 concierge 团队协调并管理预约系统，并按约定比例收取平台服务费。客户与服务者之间的付款在应用之外、按每单约定进行。" },
      { h: "5. 服务者的责任", b: "服务者同意提供真实信息，专业、礼貌地对待客户，准时守约，保持服务水准，不从事任何违法或损害平台声誉的行为。" },
      { h: "6. 保密与隐私", b: "客户信息属于机密，服务者不得披露、转发或用于通过平台提供服务以外的任何目的。" },
      { h: "7. 不保证工作量", b: "SunRed 不保证任何数量的工作、工作时长或收入。工作量取决于客户需求与服务者的可用性。" },
      { h: "8. 暂停与终止", b: "双方均可随时终止合作。对于违反本协议、提供虚假信息或危及客户安全或平台声誉的服务者，SunRed 保留暂停或终止其账户的权利。" },
      { h: "9. 责任限制", b: "SunRed 仅为连接服务者与客户的中介，对服务者与客户之间直接产生的行为、纠纷或损失不承担责任。" },
      { h: "10. 协议的接受", b: "提交申请及/或勾选同意本协议，即视为服务者已阅读、理解并接受以上全部条款。" },
    ],
  },
  en: {
    title: "Provider Agreement",
    updated: "Last updated · 21 August 2026",
    intro: "This agreement describes the relationship between an independent provider and the SunRed platform. Please read it carefully before applying.",
    sections: [
      { h: "1. Nature of the platform", b: "SunRed is a platform that connects independent massage providers with clients. SunRed is not the provider's employer and does not itself perform the massage service. The provider is an independent contractor who provides services in their own name." },
      { h: "2. Independent contractor status", b: "The provider operates in their own name and is responsible for their own taxes, insurance, equipment and travel. SunRed does not withhold tax, there is no employer–employee relationship, and no employee benefits apply. The provider is free to accept or decline each job." },
      { h: "3. Scope of services", b: "The services offered through the platform are wellness and relaxation massage. The provider agrees to comply at all times with the relevant laws and regulations of Thailand." },
      { h: "4. SunRed's role", b: "SunRed introduces and matches clients, coordinates through its concierge team and manages the booking system, and collects a platform fee at the agreed rate. Payment between client and provider is settled off-app as agreed for each job." },
      { h: "5. Provider responsibilities", b: "The provider agrees to give truthful information, treat clients professionally and courteously, be punctual, maintain service standards, and do nothing unlawful or damaging to the platform's reputation." },
      { h: "6. Confidentiality and privacy", b: "Client information is confidential. The provider must not disclose, forward, or use it for any purpose other than providing services through the platform." },
      { h: "7. No guarantee of work", b: "SunRed does not guarantee any amount of work, working hours, or income. Volume depends on client demand and the provider's availability." },
      { h: "8. Suspension and termination", b: "Either party may end the cooperation at any time. SunRed reserves the right to suspend or terminate the account of a provider who breaches this agreement, gives false information, or behaves in a way that affects client safety or the platform's reputation." },
      { h: "9. Limitation of liability", b: "SunRed is only an intermediary connecting providers with clients and is not responsible for any acts, disputes, or damages arising directly between the provider and the client." },
      { h: "10. Acceptance", b: "Submitting an application and/or ticking acceptance of this agreement means the provider has read, understood, and accepted all of the above terms." },
    ],
  },
};

const initialLang = (): Lang => {
  const q = new URLSearchParams(window.location.search).get("lang");
  return q === "en" || q === "zh" || q === "th" ? q : "th";
};

const ProviderTermsPage: React.FC = () => {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = T[lang];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FDF2F7 0%, #F7F5F6 55%, #F4F6F5 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        px: 2, py: { xs: 4, md: 7 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 640 }}>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mb: 1.5 }}>
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <Box
                key={l.code} component="button" type="button" onClick={() => setLang(l.code)}
                sx={{
                  fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${active ? ROSE : "#E3D3DA"}`,
                  background: active ? ROSE : "#fff", color: active ? "#fff" : "#8A6070",
                  borderRadius: "999px", px: 1.5, py: 0.4, lineHeight: 1.4,
                }}
              >
                {l.label}
              </Box>
            );
          })}
        </Box>

        <Typography sx={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, textAlign: "center", color: "#2a1a14", mb: 0.5 }}>
          SUN<span style={{ color: ROSE }}>RED</span>
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, textAlign: "center", color: "#2a1a14", mb: 0.5 }}>
          {t.title}
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, textAlign: "center", color: "#8A93A0", mb: 3 }}>
          {t.updated}
        </Typography>

        <Box sx={{ p: { xs: 2.5, md: 3.5 }, background: "#fff", borderRadius: "20px", border: "1px solid rgba(230,25,126,0.12)", boxShadow: "0 8px 30px rgba(31,41,51,0.06)", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "#4A5568", lineHeight: 1.8 }}>{t.intro}</Typography>
          {t.sections.map((s) => (
            <Box key={s.h}>
              <Typography sx={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 800, color: "#2a1a14", mb: 0.75 }}>{s.h}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "#4A5568", lineHeight: 1.85 }}>{s.b}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ProviderTermsPage;
