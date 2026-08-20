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
//   Audience here is Thai practitioners (not the multilingual customer flow),
//   so the copy is Thai-first and discreet — concierge register, no crude
//   wording, contact details treated as private.
//
//   Writes to `providerApplications` (open-create, capped by firestore.rules —
//   the field set below is kept in lock-step with isSaneApplicationPayload;
//   see the 28x.107 lesson about a rule cap vs. the real payload).

import React, { useState } from "react";
import { Box, Typography, TextField, MenuItem, Button, CircularProgress } from "@mui/material";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#E6197E";

const CONTACT_METHODS = ["LINE", "Telegram", "WhatsApp", "เบอร์โทร"] as const;

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", background: "#fff" },
  "& .MuiInputLabel-root": { fontFamily: SANS },
} as const;

const ApplyPage: React.FC = () => {
  const [name, setName] = useState("");
  const [contactMethod, setContactMethod] = useState<string>("LINE");
  const [contact, setContact] = useState("");
  const [area, setArea] = useState("");
  const [age, setAge] = useState("");
  const [experience, setExperience] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !contact.trim()) {
      setError("กรอกชื่อและช่องทางติดต่อก่อนนะคะ");
      return;
    }
    if (!agreed) {
      setError("กรุณายอมรับข้อตกลงผู้ให้บริการก่อนส่งใบสมัคร");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Field set kept in lock-step with firestore.rules
      // isSaneApplicationPayload — 9 keys, well under its cap of 20.
      await addDoc(collection(db, "providerApplications"), {
        name: name.trim().slice(0, 120),
        contactMethod,
        contact: contact.trim().slice(0, 160),
        area: area.trim().slice(0, 200),
        age: age.trim().slice(0, 40),
        experience: experience.trim().slice(0, 2000),
        status: "pending",
        source: "web-apply",
        // 🆕 P3 — consent record for the provider agreement (independent
        //   contractor / neutral platform). Enforced client-side by the
        //   required checkbox below; stored so the admin queue can show it.
        agreedTerms: true,
        agreedTermsAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e) {
      console.error("[apply] submit failed", e);
      setError("ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะคะ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FDF2F7 0%, #F7F5F6 60%, #F4F6F5 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        py: { xs: 4, md: 7 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 480 }}>
        {/* Wordmark */}
        <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, textAlign: "center", color: "#2a1a14", mb: 0.5 }}>
          SUN<span style={{ color: ROSE }}>RED</span>
        </Typography>

        {done ? (
          <Box
            sx={{
              mt: 3, p: { xs: 3, md: 4 }, background: "#fff", borderRadius: "20px",
              border: "1px solid rgba(230,25,126,0.15)", boxShadow: "0 8px 30px rgba(31,41,51,0.08)",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 56, height: 56, borderRadius: "50%", mx: "auto", mb: 2,
                background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Box component="span" sx={{ color: "#16A34A", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>✓</Box>
            </Box>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#2a1a14", mb: 1 }}>
              ได้รับใบสมัครของคุณแล้ว
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "#4A5568", lineHeight: 1.7 }}>
              ทีมงานจะติดต่อกลับโดยเร็วทางช่องทางที่คุณให้ไว้
              เพื่อพูดคุยรายละเอียดงานและการเริ่มงาน ขอบคุณค่ะ
            </Typography>
          </Box>
        ) : (
          <>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", color: ROSE, mb: 1 }}>
              ร่วมงานกับเรา
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 14.5, color: "#4A5568", textAlign: "center", lineHeight: 1.7, mb: 3 }}>
              แพลตฟอร์มนวดพรีเมียมในกรุงเทพฯ · รับสมัครผู้ให้บริการอิสระ
              <br />
              กรอกข้อมูลสั้นๆ แล้วทีมงานจะติดต่อกลับเพื่อพูดคุยรายละเอียด
            </Typography>

            <Box
              sx={{
                p: { xs: 2.5, md: 3 }, background: "#fff", borderRadius: "20px",
                border: "1px solid rgba(230,25,126,0.12)", boxShadow: "0 8px 30px rgba(31,41,51,0.06)",
                display: "flex", flexDirection: "column", gap: 2,
              }}
            >
              <TextField label="ชื่อ / ชื่อเล่น" required fullWidth size="small" sx={fieldSx} value={name} onChange={(e) => setName(e.target.value)} />

              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  select label="ช่องทางติดต่อ" size="small" sx={{ ...fieldSx, minWidth: 130 }}
                  value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}
                >
                  {CONTACT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
                <TextField label="LINE ID / เบอร์ / ยูสเซอร์" required fullWidth size="small" sx={fieldSx} value={contact} onChange={(e) => setContact(e.target.value)} />
              </Box>

              <TextField label="โซนที่สะดวกทำงาน (เช่น สุขุมวิท · อโศก)" fullWidth size="small" sx={fieldSx} value={area} onChange={(e) => setArea(e.target.value)} />
              <TextField label="อายุ" fullWidth size="small" sx={fieldSx} value={age} onChange={(e) => setAge(e.target.value)} inputProps={{ inputMode: "numeric" }} />
              <TextField label="ประสบการณ์ / ร้านที่เคยทำ (ไม่บังคับ)" fullWidth size="small" multiline minRows={2} sx={fieldSx} value={experience} onChange={(e) => setExperience(e.target.value)} />

              {/* 🆕 P3 — consent to the provider agreement. Required to submit;
                  the accepted flag is stored on the application. */}
              <Box
                onClick={() => setAgreed((v) => !v)}
                sx={{ display: "flex", alignItems: "flex-start", gap: 1, cursor: "pointer", mt: 0.5 }}
              >
                <Box
                  sx={{
                    mt: "1px", width: 20, height: 20, flexShrink: 0, borderRadius: "6px",
                    border: `2px solid ${agreed ? ROSE : "#C9CDD3"}`,
                    background: agreed ? ROSE : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1,
                  }}
                >
                  {agreed ? "✓" : ""}
                </Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "#4A5568", lineHeight: 1.6 }}>
                  ฉันได้อ่านและยอมรับ{" "}
                  <Box
                    component="a" href="/provider-terms" target="_blank" rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    sx={{ color: ROSE, fontWeight: 700, textDecoration: "underline" }}
                  >
                    ข้อตกลงผู้ให้บริการ
                  </Box>{" "}
                  (เป็นผู้ประกอบอาชีพอิสระ · SunRed เป็นแพลตฟอร์มตัวกลาง)
                </Typography>
              </Box>

              {error && (
                <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "#DC2626", fontWeight: 600 }}>{error}</Typography>
              )}

              <Button
                onClick={() => void submit()}
                disabled={submitting}
                sx={{
                  mt: 0.5, py: 1.25, borderRadius: "12px", textTransform: "none", fontWeight: 800, fontSize: 15,
                  fontFamily: SANS, color: "#fff",
                  background: "linear-gradient(135deg,#F050A0,#E6197E)",
                  boxShadow: "0 4px 14px rgba(230,25,126,0.32)",
                  "&:hover": { background: "linear-gradient(135deg,#E6197E,#C2185B)" },
                  "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
                }}
              >
                {submitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "ส่งใบสมัคร"}
              </Button>

              <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "#8A93A0", textAlign: "center", lineHeight: 1.6 }}>
                ข้อมูลของคุณเป็นความลับ ใช้เพื่อการติดต่อเท่านั้น
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ApplyPage;
