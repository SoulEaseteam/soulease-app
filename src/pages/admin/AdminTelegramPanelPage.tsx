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

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const POST_KINDS: { value: PostKind; label: string; sub: string }[] = [
  {
    value: "tonight",
    label: "Tonight Special",
    sub: "1 practitioner · pick or auto-rotate",
  },
  {
    value: "spotlight",
    label: "Practitioner Spotlight",
    sub: "Weekly editorial · pick or auto-rotate",
  },
  {
    value: "lineup",
    label: "Tonight's Lineup",
    sub: "Multiple practitioners · pick 2-4",
  },
  {
    value: "weekend",
    label: "Weekend Forecast",
    sub: "Static · no therapist needed",
  },
  {
    value: "welcome",
    label: "Welcome Back",
    sub: "After channel-quiet stretch",
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
          message: `Posted to @SunRed_BKK (message #${res.messageId})`,
        });
        if (needsMultipleTherapists) setLineupIds([]);
      } else {
        setToast({
          open: true,
          severity: "error",
          message: "Post failed — check Firestore telegramPosts for details",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({
        open: true,
        severity: "error",
        message: `Error: ${msg}`,
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
          color: "#b85c3c",
          marginBottom: "6px",
        }}
      >
        Concierge · Telegram channel
      </Typography>
      <Typography
        component="h1"
        sx={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: "28px",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          color: "#2a1a14",
          marginBottom: "8px",
        }}
      >
        Post to <em style={{ color: "#FE0944", fontStyle: "italic" }}>@SunRed_BKK</em>
      </Typography>
      <Typography
        component="p"
        sx={{
          fontSize: "13.5px",
          color: "#6b5b50",
          marginBottom: "28px",
        }}
      >
        Fires <code>postToChannelManual</code> Cloud Function · audit
        log written to Firestore <code>telegramPosts</code> collection.
      </Typography>

      {/* Post kind picker */}
      <Typography
        component="p"
        sx={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#b85c3c",
          marginBottom: "10px",
        }}
      >
        1. Post type
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
                kind === opt.value ? "#FE0944" : "rgba(0,0,0,0.10)"
              }`,
              background: kind === opt.value ? "rgba(254, 9, 68, 0.04)" : "#fff",
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
          color: "#b85c3c",
          marginBottom: "10px",
        }}
      >
        2. Language
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
                background: "#FE0944",
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
              color: "#b85c3c",
              marginBottom: "10px",
            }}
          >
            3. Practitioner
          </Typography>
          <Select
            fullWidth
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value as string)}
            sx={{ marginBottom: "8px", fontFamily: SANS, fontSize: "14px" }}
          >
            <MenuItem value="__auto__">
              {kind === "tonight"
                ? "Auto-pick (live standby from admin dashboard)"
                : "Auto-pick (next in editorial rotation)"}
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
              ? "Live standby = whoever has statusOverride: available OR is within working hours and not busy"
              : "Editorial rotation skips Yuri — gives the other 11 a turn to be spotlighted"}
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
              color: "#b85c3c",
              marginBottom: "10px",
            }}
          >
            3. Lineup (pick 2-4 · or use live standby)
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
              🟢 Auto from admin dashboard (live standby)
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#6b5b50", marginTop: "2px" }}>
              Server fetches who's currently available · top 4 used in the lineup.
              Tap any chip below to override.
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
                    background: selected ? "#FE0944" : "rgba(0,0,0,0.05)",
                    color: selected ? "#fff" : "#2a1a14",
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
            "linear-gradient(120deg, #FE0944 0%, #FE5A48 55%, #FE7A52 100%)",
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: "15px",
          textTransform: "none",
          letterSpacing: "0.005em",
          boxShadow:
            "0 10px 24px rgba(254, 9, 68, 0.28), 0 2px 6px rgba(254, 9, 68, 0.16)",
          "&:hover": {
            background:
              "linear-gradient(120deg, #E0083B 0%, #E0432F 55%, #E55F30 100%)",
          },
          "&.Mui-disabled": {
            background: "rgba(0,0,0,0.12)",
            color: "rgba(0,0,0,0.4)",
          },
        }}
      >
        {sending ? "Posting…" : "Post to channel"}
      </Button>

      <Typography sx={{ fontSize: "11px", color: "#9b8b80", marginTop: "12px", textAlign: "center" }}>
        Target channel: <b>{channelForLang(lang)}</b>
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
