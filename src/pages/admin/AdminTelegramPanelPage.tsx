// src/pages/admin/AdminTelegramPanelPage.tsx
//
// 🆕 Round 28s224 — Pivot to brand-promo-only posts. Founder: "เอาแค่
//   tonight lineup · เอาแบบโปรโมด รวม ไม่เจาะจงพนักงาน · โพส สามเวลา
//   ไพม์ไทม์ · ลบ template เดิมหมด".
//
// Three promo kinds match the auto-scheduled fan-out exactly:
//   evening (18:00 BKK) · prime (22:00 BKK) · late (01:00 BKK)
//
// Per-language toggle stays — View can fire one channel at a time when
// a manual nudge is needed (auto fan-out covers EN + ZH by default).

import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
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

// 🆕 Round 28s217 — Aligned heading stack with project palette refresh.
const SERIF =
  '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Three promo cards (one per scheduled cron). Each fires the same kind
// the auto cron uses, but routes by the language picker so View can
// nudge a specific channel.
const PROMO_KINDS: {
  value: PostKind;
  label: string;
  sub: string;
  time: string;
}[] = [
  {
    value: "evening",
    label: "Evening Opening · เย็นนี้",
    sub: "Warm-up / planning hour · เปิดบริการเย็นนี้",
    time: "Auto 18:00 BKK",
  },
  {
    value: "prime",
    label: "Prime Time · คืนนี้",
    sub: "Peak open / call-to-action · เปิดอย่างเป็นทางการ",
    time: "Auto 22:00 BKK",
  },
  {
    value: "late",
    label: "Late Night · ดึก",
    sub: "Still-open / last-call · ยังเปิดอยู่ดึก",
    time: "Auto 01:00 BKK",
  },
];

const LANG_OPTIONS: { value: PostLang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "th", label: "TH" },
  { value: "zh", label: "ZH" },
  { value: "ja", label: "JA" },
  { value: "ko", label: "KO" },
];

const AdminTelegramPanelPage: React.FC = () => {
  const [lang, setLang] = useState<PostLang>("en");
  const [sendingKind, setSendingKind] = useState<PostKind | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  const targetChannel = useMemo(() => channelForLang(lang), [lang]);

  const handleSend = async (kind: PostKind) => {
    setSendingKind(kind);
    try {
      const res = await postToChannel({ kind, lang });
      if (res.ok) {
        setToast({
          open: true,
          severity: "success",
          message: `ส่งเข้า ${channelForLang(lang)} แล้ว · message #${res.messageId}`,
        });
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
      setSendingKind(null);
    }
  };

  return (
    <Box
      sx={{
        padding: { xs: "16px", md: "24px" },
        background: "#F4F6F5",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <Box sx={{ marginBottom: "20px" }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: 22,
            fontWeight: 700,
            color: "#1A2B2E",
            lineHeight: 1.1,
          }}
        >
          Telegram Promo Posts
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12.5,
            color: "#4A5568",
            marginTop: "4px",
            maxWidth: 560,
          }}
        >
          3 brand-level promo posts ส่งเข้าช่อง marketing · auto-post
          ทุกวันที่ 18:00 / 22:00 / 01:00 BKK · ปุ่มข้างล่าง = ส่ง manual
          แบบเลือกภาษา/ช่องเอง
        </Typography>
      </Box>

      {/* Language picker */}
      <Box sx={{ marginBottom: "16px" }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#4A5568",
            marginBottom: "6px",
          }}
        >
          Language → ส่งเข้า {targetChannel}
        </Typography>
        <ToggleButtonGroup
          value={lang}
          exclusive
          onChange={(_, v: PostLang | null) => v && setLang(v)}
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              border: "1px solid rgba(15,23,42,0.18)",
              color: "#1A2B2E",
              padding: "6px 14px",
              "&.Mui-selected": {
                background: "#B4000A",
                color: "#fff",
                "&:hover": { background: "#8E0009" },
              },
            },
          }}
        >
          {LANG_OPTIONS.map((o) => (
            <ToggleButton key={o.value} value={o.value}>
              {o.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* 3 promo cards */}
      <Stack spacing={1.5}>
        {PROMO_KINDS.map((kind) => (
          <Box
            key={kind.value}
            sx={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid rgba(15,23,42,0.10)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1A2B2E",
                  lineHeight: 1.2,
                }}
              >
                {kind.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 12,
                  color: "#4A5568",
                  marginTop: "2px",
                }}
              >
                {kind.sub}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#B4000A",
                  marginTop: "4px",
                }}
              >
                {kind.time}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={
                sendingKind === kind.value ? (
                  <CircularProgress size={14} sx={{ color: "#fff" }} />
                ) : (
                  <SendRoundedIcon />
                )
              }
              onClick={() => void handleSend(kind.value)}
              disabled={sendingKind !== null}
              sx={{
                background: "#B4000A",
                fontFamily: SANS,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { background: "#8E0009" },
              }}
            >
              Send now
            </Button>
          </Box>
        ))}
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminTelegramPanelPage;
