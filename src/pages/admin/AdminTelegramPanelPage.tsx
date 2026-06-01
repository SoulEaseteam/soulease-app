// src/pages/admin/AdminTelegramPanelPage.tsx
//
// 🆕 Round 28s116 — Admin control panel for the @SunRedPostBot channel.
//   Lets View fire ad-hoc Telegram channel posts (Tonight Special,
//   Spotlight, Lineup, Weekend Forecast, Welcome Back) from the browser
//   without using the Cloud Scheduler console.
//
// Wired to the `postToChannelManual` callable Cloud Function in
// functions/src/telegram-post-bot/. The callable enforces an admin-role
// auth check; this page assumes it's reached via the /admin/* route
// tree which is already gated on AdminLayout's auth check.

import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  postToChannel,
  channelForLang,
  type PostKind,
  type PostLang,
} from "@/utils/telegramPostBot";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 Round 28s122 — Bilingual labels (TH + EN). Admin reads Thai primarily;
//   English in parens for terms that map 1:1 to the bot's internal `kind`
//   values so audit logs / docs stay searchable.
const POST_KINDS: {
  value: PostKind;
  label: string;
  sub: string;
}[] = [
  {
    value: "tonight",
    label: "คืนนี้พิเศษ · Tonight Special",
    sub: "1 คน · เลือกเอง หรือดึงจาก standby อัตโนมัติ",
  },
  {
    value: "spotlight",
    label: "ไฮไลต์ประจำสัปดาห์ · Practitioner Spotlight",
    sub: "แนะนำ 1 คน · หมุนเวียนสัปดาห์ละครั้ง",
  },
  {
    value: "lineup",
    label: "รายชื่อคืนนี้ · Tonight's Lineup",
    sub: "หลายคน (2-4) · เลือกเอง หรือดึง standby อัตโนมัติ",
  },
  {
    value: "weekend",
    label: "เสาร์-อาทิตย์ · Weekend Forecast",
    sub: "ข้อความคงที่ · ไม่ต้องเลือกคน",
  },
  {
    value: "welcome",
    label: "กลับมาแล้ว · Welcome Back",
    sub: "ใช้ตอนช่อง quiet หลายวัน",
  },
];

const LANGS: { value: PostLang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "th", label: "ไทย" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

// Mirror of POST_ROSTER in functions/src/telegram-post-bot/rotation.ts.
// Hardcoded here so the picker UI doesn't need a Firestore read on
// every render. Reconcile both when the roster changes.
const ROSTER = [
  { id: "YuriSunRed", name: "Yuri", area: "Din Daeng · Ratchada", star: true },
  { id: "JimmySunRed", name: "Jimmy", area: "Huai Khwang" },
  { id: "HamiSunRed", name: "Hami", area: "Huai Khwang" },
  { id: "XingXingSunRed", name: "XingXing", area: "Din Daeng" },
  { id: "BarbieSunRed", name: "Barbie", area: "Lat Phrao" },
  { id: "MiniSunRed", name: "Mini", area: "Huai Khwang" },
  { id: "JiASunRed", name: "Ji A", area: "Huai Khwang" },
  { id: "VivianSunRed", name: "Vivian", area: "Huai Khwang" },
  { id: "NannySunRed", name: "Nanny", area: "Huai Khwang" },
  { id: "YaYaSunRed", name: "YaYa", area: "Huai Khwang", newBadge: true },
  { id: "NickySunRed", name: "Nicky", area: "Silom · Rama 4", newBadge: true },
  { id: "RichieSunRed", name: "Richie", area: "Rama 9", newBadge: true },
];

const AdminTelegramPanelPage: React.FC = () => {
  const [kind, setKind] = useState<PostKind>("tonight");
  const [lang, setLang] = useState<PostLang>("en");
  const [therapistId, setTherapistId] = useState<string>("__auto__");
  const [lineupIds, setLineupIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  const needsSingleTherapist = kind === "tonight" || kind === "spotlight";
  const needsMultipleTherapists = kind === "lineup";

  const canSend = useMemo(() => {
    // Lineup: 0 (auto from dashboard) or 2+ (manual pick) are valid;
    // exactly 1 means user only half-picked.
    if (needsMultipleTherapists && lineupIds.length === 1) return false;
    return !sending;
  }, [needsMultipleTherapists, lineupIds.length, sending]);

  const handleSend = async () => {
    setSending(true);
    try {
      const payload: Parameters<typeof postToChannel>[0] = { kind, lang };
      if (needsSingleTherapist && therapistId !== "__auto__") {
        payload.therapistId = therapistId;
      }
      if (needsMultipleTherapists) {
        payload.therapistIds = lineupIds;
      }
      const res = await postToChannel(payload);
      if (res.ok) {
        setToast({
          open: true,
          severity: "success",
          message: `ส่งเข้า ${channelForLang(lang)} แล้ว · message #${res.messageId}`,
        });
        if (needsMultipleTherapists) setLineupIds([]);
      } else {
        setToast({
          open: true,
          severity: "error",
          message: "ส่งไม่สำเร็จ — เช็ค Firestore telegramPosts",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({
        open: true,
        severity: "error",
        message: `ผิดพลาด: ${msg}`,
      });
    } finally {
      setSending(false);
    }
  };

  const toggleLineupId = (id: string) => {
    setLineupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Box
      sx={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "24px 20px 48px",
        fontFamily: SANS,
      }}
    >
      {/* Header */}
      <Typography
        component="p"
        sx={{
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "#4A5568",
          marginBottom: "6px",
        }}
      >
        แอดมิน · Telegram channel
      </Typography>
      <Typography
        component="h1"
        sx={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: "28px",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          color: "#1A2B2E",
          marginBottom: "8px",
        }}
      >
        โพสต์เข้า <em style={{ color: "#B4000A", fontStyle: "italic" }}>{channelForLang(lang)}</em>
      </Typography>
      <Typography
        component="p"
        sx={{
          fontSize: "13.5px",
          color: "#6b5b50",
          marginBottom: "28px",
        }}
      >
        เลือก ประเภทโพสต์ · ภาษา · นักบำบัด · แล้วกดส่ง · ทุกโพสต์มี audit log
        ใน Firestore (<code>telegramPosts</code>)
      </Typography>

      {/* Post kind picker */}
      <Typography
        component="p"
        sx={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#4A5568",
          marginBottom: "10px",
        }}
      >
        1. ประเภทโพสต์
      </Typography>
      <Stack spacing={1} sx={{ marginBottom: "24px" }}>
        {POST_KINDS.map((opt) => (
          <Box
            key={opt.value}
            onClick={() => setKind(opt.value)}
            sx={{
              padding: "12px 14px",
              borderRadius: "12px",
              border: `1px solid ${
                kind === opt.value ? "#B4000A" : "rgba(0,0,0,0.10)"
              }`,
              background: kind === opt.value ? "rgba(180, 0, 10, 0.04)" : "#fff",
              cursor: "pointer",
              transition: "all 0.18s",
            }}
          >
            <Typography sx={{ fontFamily: SERIF, fontWeight: 600, fontSize: "15px" }}>
              {opt.label}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#6b5b50", marginTop: "2px" }}>
              {opt.sub}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Language picker */}
      <Typography
        component="p"
        sx={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#4A5568",
          marginBottom: "10px",
        }}
      >
        2. ภาษา · ZH ส่งเข้า @manguyujianniSPA · อื่นๆ ส่ง @SunRed_BKK
      </Typography>
      <ToggleButtonGroup
        value={lang}
        exclusive
        onChange={(_, v) => v && setLang(v as PostLang)}
        sx={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "6px" }}
      >
        {LANGS.map((l) => (
          <ToggleButton
            key={l.value}
            value={l.value}
            sx={{
              border: "1px solid rgba(0,0,0,0.12) !important",
              borderRadius: "999px !important",
              padding: "6px 16px",
              fontFamily: SANS,
              fontSize: "12.5px",
              fontWeight: 600,
              textTransform: "none",
              "&.Mui-selected": {
                background: "#B4000A",
                color: "#fff",
                "&:hover": { background: "#E0083B" },
              },
            }}
          >
            {l.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Therapist picker (single) */}
      {needsSingleTherapist && (
        <>
          <Typography
            component="p"
            sx={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#4A5568",
              marginBottom: "10px",
            }}
          >
            3. นักบำบัด
          </Typography>
          <Select
            fullWidth
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value as string)}
            sx={{ marginBottom: "8px", fontFamily: SANS, fontSize: "14px" }}
          >
            <MenuItem value="__auto__">
              {kind === "tonight"
                ? "🟢 อัตโนมัติ · ดึง standby จาก Admin Dashboard"
                : "🟢 อัตโนมัติ · หมุนเวียนตามคิว editorial"}
            </MenuItem>
            {ROSTER.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name} · {t.area}
                {t.star ? " ⭐" : ""}
                {t.newBadge ? " ✦" : ""}
              </MenuItem>
            ))}
          </Select>
          <Typography
            sx={{
              fontSize: "11px",
              color: "#9b8b80",
              marginBottom: "24px",
              fontStyle: "italic",
            }}
          >
            {kind === "tonight"
              ? "Live standby = คนที่ Admin ตั้ง statusOverride = available หรือ Auto + อยู่ในเวลาทำงาน + ไม่ busy"
              : "Editorial rotation = สลับ 11 คน (ไม่รวม Yuri) · ให้คนใหม่ได้ขึ้น spotlight"}
          </Typography>
        </>
      )}

      {/* Lineup multi-picker */}
      {needsMultipleTherapists && (
        <>
          <Typography
            component="p"
            sx={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#4A5568",
              marginBottom: "10px",
            }}
          >
            3. รายชื่อ (เลือก 2-4 คน · หรือใช้ standby อัตโนมัติ)
          </Typography>
          {/* Auto-from-dashboard option · clears the manual chip selection */}
          <Box
            onClick={() => setLineupIds([])}
            sx={{
              padding: "10px 14px",
              borderRadius: "12px",
              border: `1px solid ${
                lineupIds.length === 0 ? "#16a34a" : "rgba(0,0,0,0.10)"
              }`,
              background: lineupIds.length === 0
                ? "rgba(22, 163, 74, 0.06)"
                : "#fff",
              cursor: "pointer",
              marginBottom: "12px",
              transition: "all 0.18s",
            }}
          >
            <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#16a34a" }}>
              🟢 อัตโนมัติ · ดึง standby จาก Admin Dashboard
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#6b5b50", marginTop: "2px" }}>
              Server ดึงคนที่ available ตอนนี้ · ใช้สูงสุด 4 คนแรก
              · กด chip ด้านล่างเพื่อเลือกเอง
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
            {ROSTER.map((t) => {
              const selected = lineupIds.includes(t.id);
              return (
                <Chip
                  key={t.id}
                  label={t.name}
                  onClick={() => toggleLineupId(t.id)}
                  sx={{
                    fontFamily: SANS,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    background: selected ? "#B4000A" : "rgba(0,0,0,0.05)",
                    color: selected ? "#fff" : "#1A2B2E",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </Box>
        </>
      )}

      {/* Send button */}
      <Button
        variant="contained"
        fullWidth
        disabled={!canSend}
        onClick={handleSend}
        startIcon={
          sending ? (
            <CircularProgress size={16} sx={{ color: "rgba(255,255,255,0.8)" }} />
          ) : (
            <SendRoundedIcon />
          )
        }
        sx={{
          padding: "14px 16px",
          borderRadius: "14px",
          background:
            "#B4000A",
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: "15px",
          textTransform: "none",
          letterSpacing: "0.005em",
          boxShadow:
            "0 10px 24px rgba(15, 23, 42, 0.28), 0 2px 6px rgba(15, 23, 42, 0.16)",
          "&:hover": {
            background:
              "#B4000A",
          },
          "&.Mui-disabled": {
            background: "rgba(0,0,0,0.12)",
            color: "rgba(0,0,0,0.4)",
          },
        }}
      >
        {sending ? "กำลังส่ง…" : "ส่งเข้าช่อง"}
      </Button>

      {/* 🆕 Round 28s122 — สรุปก่อนส่ง (Thai gloss · แอดมินอ่านออกชัด) */}
      <Box
        sx={{
          marginTop: "16px",
          padding: "12px 14px",
          borderRadius: "10px",
          background: lang === "zh"
            ? "rgba(180, 0, 10, 0.05)"
            : "rgba(0, 0, 0, 0.03)",
          border: `1px solid ${
            lang === "zh" ? "rgba(15, 23, 42, 0.20)" : "rgba(0, 0, 0, 0.08)"
          }`,
        }}
      >
        <Typography
          sx={{
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#4A5568",
            marginBottom: "4px",
          }}
        >
          สรุปก่อนส่ง
        </Typography>
        <Typography sx={{ fontSize: "12.5px", color: "#1A2B2E", lineHeight: 1.5 }}>
          จะส่ง <b>
            {POST_KINDS.find((k) => k.value === kind)?.label.split(" · ")[0]}
          </b>{" "}
          ภาษา <b>{LANGS.find((l) => l.value === lang)?.label}</b>{" "}
          เข้าช่อง <b>{channelForLang(lang)}</b>
          {lang === "zh" ? " (曼谷遇你SPA)" : " (SunRed Pretty massage)"}
          {needsSingleTherapist && therapistId !== "__auto__" && (
            <> · นักบำบัด <b>
              {ROSTER.find((r) => r.id === therapistId)?.name}
            </b></>
          )}
          {needsSingleTherapist && therapistId === "__auto__" && (
            <> · นักบำบัดเลือก<b>อัตโนมัติ</b>
              {kind === "tonight" ? " (จาก standby)" : " (จาก rotation)"}</>
          )}
          {needsMultipleTherapists && lineupIds.length === 0 && (
            <> · รายชื่อ<b>อัตโนมัติ</b> (ดึง standby)</>
          )}
          {needsMultipleTherapists && lineupIds.length > 0 && (
            <> · {lineupIds.length} คน:{" "}
              <b>
                {lineupIds
                  .map((id) => ROSTER.find((r) => r.id === id)?.name)
                  .filter(Boolean)
                  .join(" · ")}
              </b>
            </>
          )}
          {" · ลูกค้าทักกลับที่ "}
          <b>{lang === "zh" ? "@YuNiSpaBkk" : "@SunRedvip_bkk"}</b>
        </Typography>
      </Box>

      <Typography sx={{ fontSize: "11px", color: "#9b8b80", marginTop: "12px", textAlign: "center" }}>
        ช่องเป้าหมาย: <b>{channelForLang(lang)}</b>
        {lang === "zh" ? " · 曼谷遇你SPA" : " · SunRed Pretty massage"}
      </Typography>

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((p) => ({ ...p, open: false }))}
          sx={{ fontFamily: SANS, fontSize: "13px" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminTelegramPanelPage;
