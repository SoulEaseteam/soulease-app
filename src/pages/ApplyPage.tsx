// src/pages/ApplyPage.tsx
//
// 🆕 P2 (marketplace on-ramp) — the public "become a practitioner" door.
//
//   SunRed is moving from an admin-run agency to a CBODY-style vetted
//   marketplace. CBODY isn't open self-signup either — it's "contact us to
//   become a verified expert", reviewed by a human. So this page is an
//   APPLICATION, not a self-serve account: a prospective practitioner submits
//   her details, they land in /admin/applications as `pending`, and the
//   concierge reaches out + onboards her via the existing Create-account flow.
//   She never gets a login from this page.
//
//   🆕 Self-contained TH / 中文 / EN toggle (founder: "มีปุ่มเปลี่ยนภาษา ไทย
//   จีน อังกฤษ") — the applicant pool isn't only Thai (CBODY recruits CN/EN
//   speakers too). Inline dictionary rather than the global i18n bundles: this
//   is a standalone recruitment page, and keeping its copy here avoids bloating
//   the six customer-facing locale files. The chosen language rides ?lang so the
//   provider-agreement link opens in the same language.
//
//   Writes to `providerApplications` (open-create, capped by firestore.rules —
//   the field set below is kept in lock-step with isSaneApplicationPayload).

import React, { useState } from "react";
import { Box, Typography, TextField, MenuItem, Button, CircularProgress } from "@mui/material";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#E6197E";

const CONTACT_METHODS = ["Telegram", "LINE", "WhatsApp", "WeChat", "เบอร์โทร"] as const;

type Lang = "th" | "en" | "zh";
const LANGS: { code: Lang; label: string }[] = [
  { code: "th", label: "ไทย" },
  { code: "zh", label: "中文" },
  { code: "en", label: "EN" },
];

const T: Record<Lang, Record<string, string>> = {
  th: {
    eyebrow: "ร่วมงานกับเรา",
    sub: "แพลตฟอร์มนวดพรีเมียมในกรุงเทพฯ · รับสมัครผู้ให้บริการอิสระ\nกรอกข้อมูลสั้นๆ แล้วทีมงานจะติดต่อกลับเพื่อพูดคุยรายละเอียด",
    name: "ชื่อ / ชื่อเล่น",
    method: "ช่องทางติดต่อ",
    contact: "ไอดี / ยูสเซอร์ / เบอร์",
    area: "โซนที่สะดวกทำงาน (เช่น สุขุมวิท · อโศก)",
    age: "อายุ",
    exp: "ประสบการณ์ / ร้านที่เคยทำ (ไม่บังคับ)",
    agreePre: "ฉันได้อ่านและยอมรับ ",
    agreeLink: "ข้อตกลงผู้ให้บริการ",
    agreeSuf: " (เป็นผู้ประกอบอาชีพอิสระ · SunRed เป็นแพลตฟอร์มตัวกลาง)",
    submit: "ส่งใบสมัคร",
    privacy: "ข้อมูลของคุณเป็นความลับ ใช้เพื่อการติดต่อเท่านั้น",
    errNeed: "กรอกชื่อและช่องทางติดต่อก่อนนะคะ",
    errAgree: "กรุณายอมรับข้อตกลงผู้ให้บริการก่อนส่งใบสมัคร",
    errFail: "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะคะ",
    okTitle: "ได้รับใบสมัครของคุณแล้ว",
    okBody: "ทีมงานจะติดต่อกลับโดยเร็วทางช่องทางที่คุณให้ไว้ เพื่อพูดคุยรายละเอียดงานและการเริ่มงาน ขอบคุณค่ะ",
  },
  zh: {
    eyebrow: "加入我们",
    sub: "曼谷高端按摩平台 · 招募独立服务者\n填写简单信息，团队会尽快联系您详谈",
    name: "姓名 / 昵称",
    method: "联系方式",
    contact: "账号 / 用户名 / 电话",
    area: "方便工作的区域（如 素坤逸 · 阿速）",
    age: "年龄",
    exp: "工作经验 / 曾工作店铺（选填）",
    agreePre: "我已阅读并同意 ",
    agreeLink: "服务提供者协议",
    agreeSuf: "（独立承包人 · SunRed 为中介平台）",
    submit: "提交申请",
    privacy: "您的信息将被保密，仅用于联系",
    errNeed: "请先填写姓名和联系方式",
    errAgree: "请先同意服务提供者协议再提交",
    errFail: "提交失败，请重试",
    okTitle: "已收到您的申请",
    okBody: "团队会尽快通过您提供的方式与您联系，详谈工作内容与入职事宜。谢谢！",
  },
  en: {
    eyebrow: "Join Our Team",
    sub: "Premium massage platform in Bangkok · recruiting independent practitioners\nFill in a few details and our team will get back to you.",
    name: "Name / Nickname",
    method: "Contact via",
    contact: "ID / Username / Phone",
    area: "Preferred area (e.g. Sukhumvit · Asok)",
    age: "Age",
    exp: "Experience / previous shop (optional)",
    agreePre: "I have read and accept the ",
    agreeLink: "Provider Agreement",
    agreeSuf: " (independent contractor · SunRed is a neutral platform)",
    submit: "Submit application",
    privacy: "Your information is confidential, used only to contact you.",
    errNeed: "Please enter your name and contact.",
    errAgree: "Please accept the Provider Agreement first.",
    errFail: "Submission failed, please try again.",
    okTitle: "Application received",
    okBody: "Our team will contact you soon via the channel you provided to discuss the work and next steps. Thank you!",
  },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", background: "#fff" },
  "& .MuiInputLabel-root": { fontFamily: SANS },
} as const;

const initialLang = (): Lang => {
  const q = new URLSearchParams(window.location.search).get("lang");
  return q === "en" || q === "zh" || q === "th" ? q : "th";
};

const ApplyPage: React.FC = () => {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = T[lang];

  const [name, setName] = useState("");
  const [contactMethod, setContactMethod] = useState<string>("Telegram");
  const [contact, setContact] = useState("");
  const [area, setArea] = useState("");
  const [age, setAge] = useState("");
  const [experience, setExperience] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !contact.trim()) { setError(t.errNeed); return; }
    if (!agreed) { setError(t.errAgree); return; }
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "providerApplications"), {
        name: name.trim().slice(0, 120),
        contactMethod,
        contact: contact.trim().slice(0, 160),
        area: area.trim().slice(0, 200),
        age: age.trim().slice(0, 40),
        experience: experience.trim().slice(0, 2000),
        status: "pending",
        source: "web-apply",
        lang,
        agreedTerms: true,
        agreedTermsAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e) {
      console.error("[apply] submit failed", e);
      setError(t.errFail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FDF2F7 0%, #F7F5F6 60%, #F4F6F5 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        px: 2, py: { xs: 4, md: 7 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 480 }}>
        {/* Language toggle */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mb: 1.5 }}>
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <Box
                key={l.code}
                component="button"
                type="button"
                onClick={() => setLang(l.code)}
                sx={{
                  fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${active ? ROSE : "#E3D3DA"}`,
                  background: active ? ROSE : "#fff",
                  color: active ? "#fff" : "#8A6070",
                  borderRadius: "999px", px: 1.5, py: 0.4, lineHeight: 1.4,
                }}
              >
                {l.label}
              </Box>
            );
          })}
        </Box>

        <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, textAlign: "center", color: "#2a1a14", mb: 0.5 }}>
          SUN<span style={{ color: ROSE }}>RED</span>
        </Typography>

        {done ? (
          <Box sx={{ mt: 3, p: { xs: 3, md: 4 }, background: "#fff", borderRadius: "20px", border: "1px solid rgba(230,25,126,0.15)", boxShadow: "0 8px 30px rgba(31,41,51,0.08)", textAlign: "center" }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", mx: "auto", mb: 2, background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box component="span" sx={{ color: "#16A34A", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>✓</Box>
            </Box>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#2a1a14", mb: 1 }}>{t.okTitle}</Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "#4A5568", lineHeight: 1.7 }}>{t.okBody}</Typography>
          </Box>
        ) : (
          <>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", color: ROSE, mb: 1 }}>
              {t.eyebrow}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 14.5, color: "#4A5568", textAlign: "center", lineHeight: 1.7, mb: 3, whiteSpace: "pre-line" }}>
              {t.sub}
            </Typography>

            <Box sx={{ p: { xs: 2.5, md: 3 }, background: "#fff", borderRadius: "20px", border: "1px solid rgba(230,25,126,0.12)", boxShadow: "0 8px 30px rgba(31,41,51,0.06)", display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField label={t.name} required fullWidth size="small" sx={fieldSx} value={name} onChange={(e) => setName(e.target.value)} />

              <TextField
                select label={t.method} fullWidth size="small"
                sx={{ ...fieldSx, "& .MuiSelect-icon": { color: ROSE, fontSize: 26 } }}
                value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}
              >
                {CONTACT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField label={t.contact} required fullWidth size="small" sx={fieldSx} value={contact} onChange={(e) => setContact(e.target.value)} />

              <TextField label={t.area} fullWidth size="small" sx={fieldSx} value={area} onChange={(e) => setArea(e.target.value)} />
              <TextField label={t.age} fullWidth size="small" sx={fieldSx} value={age} onChange={(e) => setAge(e.target.value)} inputProps={{ inputMode: "numeric" }} />
              <TextField label={t.exp} fullWidth size="small" multiline minRows={2} sx={fieldSx} value={experience} onChange={(e) => setExperience(e.target.value)} />

              <Box onClick={() => setAgreed((v) => !v)} sx={{ display: "flex", alignItems: "flex-start", gap: 1, cursor: "pointer", mt: 0.5 }}>
                <Box sx={{ mt: "1px", width: 20, height: 20, flexShrink: 0, borderRadius: "6px", border: `2px solid ${agreed ? ROSE : "#C9CDD3"}`, background: agreed ? ROSE : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>
                  {agreed ? "✓" : ""}
                </Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "#4A5568", lineHeight: 1.6 }}>
                  {t.agreePre}
                  <Box component="a" href={`/provider-terms?lang=${lang}`} target="_blank" rel="noopener noreferrer" onClick={(e: React.MouseEvent) => e.stopPropagation()} sx={{ color: ROSE, fontWeight: 700, textDecoration: "underline" }}>
                    {t.agreeLink}
                  </Box>
                  {t.agreeSuf}
                </Typography>
              </Box>

              {error && <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "#DC2626", fontWeight: 600 }}>{error}</Typography>}

              <Button
                onClick={() => void submit()} disabled={submitting}
                sx={{ mt: 0.5, py: 1.25, borderRadius: "12px", textTransform: "none", fontWeight: 800, fontSize: 15, fontFamily: SANS, color: "#fff", background: "linear-gradient(135deg,#F050A0,#E6197E)", boxShadow: "0 4px 14px rgba(230,25,126,0.32)", "&:hover": { background: "linear-gradient(135deg,#E6197E,#C2185B)" }, "&.Mui-disabled": { color: "#fff", opacity: 0.7 } }}
              >
                {submitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : t.submit}
              </Button>

              <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "#8A93A0", textAlign: "center", lineHeight: 1.6 }}>{t.privacy}</Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ApplyPage;
