// src/pages/ProfilePage.tsx
//
// 🆕 Round 28c16 (founder 2026-05-06) — full redesign.
//   Dark hero + avatar ring + booking count + staggered sections.
//   Feels like Airbnb / Grab premium tier.

import React, { useEffect, useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClockCounterClockwise,
  Heart,
  Bell,
  Translate,
  ChatsCircle,
  SignOut,
  CaretRight,
  CheckCircle,
  Gauge,
  IdentificationCard,
  Ticket,
  Key,
  Check,
} from "phosphor-react";
import { collection, query, where, getCountFromServer, doc, getDoc } from "firebase/firestore";
import {
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

// 🆕 28x.57 — explicit language override (see src/utils/langPref.ts for why
//   this can't just ride on i18next's own localStorage cache).
import { SUPPORTED_LANGS, setLangPref, langLabel, type LangCode } from "@/utils/langPref";

import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { useAnniversaryClaim } from "@/hooks/useAnniversaryClaim";
import { fonts } from "@/theme";
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2).
import { CONCIERGE } from "@/config/concierge";
// 🆕 28w.23 — cap pages to the same shell as TopNav so they align on desktop.
import { responsiveShell } from "@/theme/breakpoints";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS  = '"Inter", system-ui, sans-serif';
// 🆕 28x.57 (founder: "เปลี่ยนสีเข้าธีม") — the page was still on the pre-Moko
//   slate/taupe palette (#1A2B2E hero, #F4F6F5 page, #8F8474 ring). Brand rose +
//   theme vars from here on, so it matches the rest of the site day and night.
const ROSE = "#D97C95";
const ROSE_DEEP = "#C96F89";
const DANGER = "#C0562E";

// ── helpers ─────────────────────────────────────────────────────────
function memberSince(creationTime?: string) {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function initials(name?: string | null, email?: string | null) {
  if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "G";
}

// ── fade-up animation ────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

// ── row component ─────────────────────────────────────────────────────
interface RowProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
  /** 🆕 28x.57 — right-aligned current value (e.g. the active language). */
  value?: string;
}
const Row: React.FC<RowProps> = ({ icon, label, sub, onClick, danger, value }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1.5,
      cursor: onClick ? "pointer" : "default",
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
      "&:active": onClick ? { background: "var(--sr-panel-2)" } : {},
    }}
  >
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: "12px",
        // 🆕 28x.57 — themed tiles (was a hardcoded slate tint from the old palette).
        background: danger ? "rgba(192,86,46,0.12)" : "rgba(217,124,149,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: danger ? DANGER : ROSE,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 600,
          color: danger ? DANGER : "var(--sr-ink)",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      {sub && (
        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "var(--sr-muted)", mt: 0.2 }}>
          {sub}
        </Typography>
      )}
    </Box>
    {value && (
      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--sr-body)", flexShrink: 0 }}>
        {value}
      </Typography>
    )}
    {onClick && (
      <CaretRight size={16} color={danger ? DANGER : "var(--sr-dim)"} />
    )}
  </Box>
);

// ── section card ─────────────────────────────────────────────────────
const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      mx: 2,
      borderRadius: "18px",
      background: "var(--sr-panel)",
      border: "1px solid var(--sr-hairline)",
      boxShadow: "var(--sr-card-shadow)",
      overflow: "hidden",
      "& > *:not(:last-child)": {
        borderBottom: "1px solid var(--sr-hairline)",
      },
    }}
  >
    {children}
  </Box>
);

// ── main page ─────────────────────────────────────────────────────────
const ProfilePage: React.FC = () => {
  // 🆕 28w.88 — the guest's own Anniversary reward claims.
  const { claims: rewardClaims } = useAnniversaryClaim();
  const { user, role } = useAuth();
  const navigate  = useNavigate();
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  // Round 28s369 — therapist name from Firestore (Firebase Auth displayName is null for therapist accounts)
  const [therapistName, setTherapistName] = useState<string | null>(null);

  // pull total booking count for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      where("status", "in", ["confirmed", "completed"])
    );
    getCountFromServer(q)
      .then((snap) => setBookingCount(snap.data().count))
      .catch(() => setBookingCount(null));
  }, [user]);

  // Round 28s369 — fetch therapist name from Firestore when Auth displayName is null
  useEffect(() => {
    if (!user || role !== "therapist" || user.displayName) return;
    getDoc(doc(db, "therapists", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as { name?: string; displayName?: string };
          setTherapistName(data.name || data.displayName || null);
        }
      })
      .catch(() => { /* silent fallback */ });
  }, [user, role]);

  const handleLogout = async () => {
    await signOut(auth);
    void navigate("/login");
  };

  // ── 🆕 28x.57 · Language (founder: "ตั้งค่าภาษาได้") ────────────────
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const activeLang = (i18n.language || "en").split("-")[0];

  const pickLang = (code: LangCode) => {
    setLangPref(code);          // survives reload — beats the device locale
    void i18n.changeLanguage(code);
    setLangOpen(false);
  };

  // ── 🆕 28x.57 · Change password (founder: "เปลี่ยนรหัส ได้") ────────
  //   Guests sign in with an alias email (<phone>@phone.sunred.vip or
  //   <srd-code>@user.sunred.vip), so re-auth uses that alias, not a
  //   real inbox. Firebase requires a fresh re-auth before updatePassword.
  const [pwOpen, setPwOpen]   = useState(false);
  const [pwCur, setPwCur]     = useState("");
  const [pwNew, setPwNew]     = useState("");
  const [pwNew2, setPwNew2]   = useState("");
  const [pwBusy, setPwBusy]   = useState(false);
  const [pwErr, setPwErr]     = useState<string | null>(null);
  const [pwDone, setPwDone]   = useState(false);

  const closePw = () => {
    if (pwBusy) return;
    setPwOpen(false);
    setPwCur(""); setPwNew(""); setPwNew2("");
    setPwErr(null); setPwDone(false);
  };

  const submitPw = async () => {
    setPwErr(null);
    if (pwNew.length < 6)   { setPwErr("รหัสใหม่ต้องยาวอย่างน้อย 6 ตัว"); return; }
    if (pwNew !== pwNew2)   { setPwErr("รหัสใหม่ทั้งสองช่องไม่ตรงกัน"); return; }
    const current = auth.currentUser;
    if (!current?.email)    { setPwErr("บัญชีนี้เปลี่ยนรหัสในหน้านี้ไม่ได้ — ติดต่อคอนเซียร์จ"); return; }

    setPwBusy(true);
    try {
      await reauthenticateWithCredential(
        current,
        EmailAuthProvider.credential(current.email, pwCur)
      );
      await updatePassword(current, pwNew);
      setPwDone(true);
      setPwCur(""); setPwNew(""); setPwNew2("");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setPwErr(
        code.includes("wrong-password") || code.includes("invalid-credential")
          ? "รหัสผ่านปัจจุบันไม่ถูกต้อง"
          : code.includes("weak-password")
          ? "รหัสใหม่อ่อนเกินไป — ใช้อย่างน้อย 6 ตัว"
          : code.includes("too-many-requests")
          ? "ลองผิดหลายครั้งเกินไป — รอสักครู่แล้วลองใหม่"
          : "เปลี่ยนรหัสไม่สำเร็จ — ลองใหม่อีกครั้ง"
      );
    } finally {
      setPwBusy(false);
    }
  };

  // ── Guest state ───────────────────────────────────────────────────
  if (!user) {
    return (
      <Box
        sx={{
          // 🆕 28w.23 (founder: align pages + retire navy/taupe) — cap to the
          //   nav shell and move the splash onto the rose day/night surface;
          //   the old full-bleed #1A2B2E box ran edge-to-edge past the nav.
          ...responsiveShell,
          minHeight: "100vh",
          background: "var(--sr-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          pb: 10,
        }}
      >
        <motion.div {...fadeUp(0)} style={{ textAlign: "center" }}>
          <Box
            component="img"
            src="/images/icon/sunred-logo.png"
            alt="SunRed"
            width={72}
            height={72}
            loading="lazy"
            decoding="async"
            sx={{ width: 72, height: 72, borderRadius: "50%", mb: 2, opacity: 0.95 }}
          />
          <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.02em" }}>
            Welcome to SunRed
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "var(--sr-muted)", mt: 1 }}>
            Sign in to view your bookings and profile
          </Typography>
        </motion.div>
        <motion.div {...fadeUp(0.1)} style={{ width: "100%", maxWidth: 320 }}>
          <Box
            onClick={() => navigate("/login")}
            sx={{
              background: "linear-gradient(135deg, #D97C95 0%, #C96F89 100%)",
              color: "#fff",
              borderRadius: 999,
              py: 1.6,
              textAlign: "center",
              fontFamily: SANS,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(138, 58, 87, 0.32)",
              letterSpacing: "0.01em",
            }}
          >
            Sign in
          </Box>
        </motion.div>
      </Box>
    );
  }

  const since = memberSince(user.metadata.creationTime);

  return (
    <Box
      sx={{
        // 🆕 28w.23 (founder: align pages with the nav) — cap + centre to the
        //   same shell as TopNav so the hero box lines up with the nav bar.
        ...responsiveShell,
        minHeight: "100vh",
        background: "var(--sr-bg)",
        pb: 12,
        fontFamily: SANS,
      }}
    >
      {/* ── Hero ── */}
      <Box
        sx={{
          // 🆕 28x.57 — brand rose→plum hero (was slate #1A2B2E, off-theme).
          background: "linear-gradient(160deg, #A34A67 0%, #7A3049 55%, #5A2733 100%)",
          pt: 7,
          pb: 5,
          px: 3,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 280,
            height: 80,
            borderRadius: "50%",
            background: "rgba(90, 39, 51, 0.25)",
            filter: "blur(30px)",
            pointerEvents: "none",
          },
        }}
      >
        <motion.div {...fadeUp(0)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Avatar with gradient ring */}
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`,
                p: "2.5px",
                boxShadow: "0 0 0 3px rgba(255,255,255,0.16), 0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <Avatar
                src={user.photoURL || undefined}
                sx={{
                  width: "100%",
                  height: "100%",
                  // 🆕 28x.57 — brand plum fill (was the Nordic grey sweep).
                  background: "linear-gradient(135deg, #7A3049, #5A2733)",
                  fontSize: 30,
                  fontWeight: 700,
                  fontFamily: SERIF,
                  color: "#fff",
                }}
              >
                {!user.photoURL && initials(therapistName || user.displayName, user.email)}
              </Avatar>
            </Box>
          </Box>

          {/* Name + verified */}
          <Box sx={{ textAlign: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                {/* Round 28s369 — therapistName fallback for null Firebase Auth displayName */}
                {therapistName || user.displayName || "Guest"}
              </Typography>
              <CheckCircle size={18} color="rgba(255,255,255,0.85)" weight="fill" />
            </Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.50)", mt: 0.4 }}>
              {user.email}
            </Typography>
            {since && (
              <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "rgba(255,255,255,0.35)", mt: 0.6, letterSpacing: "0.04em" }}>
                MEMBER SINCE {since.toUpperCase()}
              </Typography>
            )}
          </Box>
        </motion.div>

        {/* Stat strip */}
        <motion.div {...fadeUp(0.1)}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 3.5,
              p: 1.75,
              borderRadius: "18px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
            }}
          >
            {[
              {
                value: bookingCount === null
                  ? <CircularProgress size={14} sx={{ color: "rgba(255,255,255,0.5)" }} />
                  : <>{bookingCount}</>,
                label: "Bookings",
              },
              { value: "VIP", label: "Status" },
              { value: "24/7", label: "Support" },
            ].map((s, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "rgba(255,255,255,0.40)", mt: 0.4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* ── Sections ── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>

        {/* Admin Panel shortcut — only visible to admins */}
        {role === "admin" && (
          <motion.div {...fadeUp(0.12)}>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
              Admin
            </Typography>
            <Section>
              <Row
                icon={<Gauge size={18} weight="duotone" />}
                label="Admin Dashboard"
                sub="Bookings · Therapists · Reports"
                onClick={() => navigate("/admin/dashboard")}
              />
            </Section>
          </motion.div>
        )}

        {/* Round 28s369 — Therapist panel shortcut — only visible to therapists */}
        {role === "therapist" && (
          <motion.div {...fadeUp(0.12)}>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
              Practitioner
            </Typography>
            <Section>
              <Row
                icon={<IdentificationCard size={18} weight="duotone" />}
                label="My Practitioner Profile"
                sub="Availability · services · earnings"
                onClick={() => navigate("/therapist/profile")}
              />
            </Section>
          </motion.div>
        )}

        {/* 🆕 Round 28w.89 (founder: "หน้า Guest profile เพิ่มเมนู โค้ดส่วนลดของฉัน")
            — one menu row for every discount the guest holds. This REPLACES the
            28w.88 inline Rewards list: that listed the claimed Anniversary reward
            here, and a separate codes page listing the same reward again would
            have said it twice. The row carries the count; /my-codes carries the
            detail (rewards · a code waiting at checkout · their referral code).
            Always shown, so a guest can find their codes even when they hold
            none — the page says so plainly rather than hiding the entrance. */}
        <motion.div {...fadeUp(0.14)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Rewards
          </Typography>
          <Section>
            <Row
              icon={<Ticket size={18} weight="duotone" />}
              label="My Discount Codes"
              sub={
                rewardClaims.length > 0
                  ? `${rewardClaims.length} reward${rewardClaims.length > 1 ? "s" : ""} · referral code`
                  : "Rewards, vouchers & your referral code"
              }
              onClick={() => navigate("/my-codes")}
            />
          </Section>
        </motion.div>

        {/* Bookings */}
        <motion.div {...fadeUp(0.15)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Reservations
          </Typography>
          <Section>
            <Row
              icon={<ClockCounterClockwise size={18} />}
              label="Booking History"
              sub="View all past & upcoming sessions"
              onClick={() => navigate("/booking/history")}
            />
            <Row
              icon={<Heart size={18} />}
              label="Saved Therapists"
              sub="Your favourite practitioners"
              onClick={() => navigate("/user/saved")}
            />
          </Section>
        </motion.div>

        {/* Account */}
        <motion.div {...fadeUp(0.2)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Account
          </Typography>
          <Section>
            <Row
              icon={<Bell size={18} />}
              label="Notifications"
              sub="Booking alerts & updates"
              onClick={() => navigate("/notifications")}
            />
            {/* 🆕 28x.57 — this row used to be dead (`onClick={() => {}}`). */}
            <Row
              icon={<Translate size={18} />}
              label="Language"
              sub="EN · TH · ZH · JA · KO"
              value={langLabel(activeLang)}
              onClick={() => setLangOpen(true)}
            />
            <Row
              icon={<Key size={18} />}
              label="Change password"
              sub="Update your sign-in password"
              onClick={() => setPwOpen(true)}
            />
          </Section>
        </motion.div>

        {/* Support */}
        <motion.div {...fadeUp(0.25)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Support
          </Typography>
          <Section>
            <Row
              icon={<ChatsCircle size={18} />}
              label="Contact Concierge"
              sub="Available 24 hours a day"
              onClick={() => window.open(CONCIERGE.whatsappUrl, "_blank")}
            />
          </Section>
        </motion.div>

        {/* Sign out */}
        <motion.div {...fadeUp(0.3)}>
          <Section>
            <Row
              icon={<SignOut size={18} />}
              label="Sign out"
              onClick={handleLogout}
              danger
            />
          </Section>
        </motion.div>

        <motion.div {...fadeUp(0.35)}>
          <Typography sx={{ textAlign: "center", fontFamily: SANS, fontSize: 11, color: "var(--sr-dim)", mt: 1 }}>
            SunRed · Bangkok · sunred.vip
          </Typography>
        </motion.div>
      </Box>

      {/* ── 🆕 28x.57 · Language picker ─────────────────────────────── */}
      <Dialog
        open={langOpen}
        onClose={() => setLangOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            backgroundImage: "none",   // MUI dark-mode overlay would grey the panel
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 20, color: "var(--sr-ink)", pb: 1 }}>
          Language
        </DialogTitle>
        <DialogContent sx={{ px: 1.5, pb: 2 }}>
          {SUPPORTED_LANGS.map((l) => {
            const on = l.code === activeLang;
            return (
              <Box
                key={l.code}
                role="button"
                tabIndex={0}
                onClick={() => pickLang(l.code)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickLang(l.code); }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: on ? "rgba(217,124,149,0.14)" : "transparent",
                  transition: "background 160ms ease",
                  "&:hover": { background: "rgba(217,124,149,0.10)" },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 15,
                    fontWeight: on ? 700 : 500,
                    color: on ? ROSE_DEEP : "var(--sr-body)",
                  }}
                >
                  {l.label}
                </Typography>
                {on && <Check size={18} weight="bold" color={ROSE_DEEP} />}
              </Box>
            );
          })}
        </DialogContent>
      </Dialog>

      {/* ── 🆕 28x.57 · Change password ─────────────────────────────── */}
      <Dialog
        open={pwOpen}
        onClose={closePw}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 20, color: "var(--sr-ink)", pb: 1 }}>
          Change password
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {pwDone ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ครั้งหน้าเข้าระบบด้วยรหัสใหม่
            </Alert>
          ) : (
            <>
              {pwErr && <Alert severity="error" sx={{ borderRadius: 2 }}>{pwErr}</Alert>}
              {/* explicit input color — dark theme inherits white-on-white otherwise */}
              {([
                { label: "รหัสผ่านปัจจุบัน", v: pwCur,  set: setPwCur,  ac: "current-password" },
                { label: "รหัสผ่านใหม่",     v: pwNew,  set: setPwNew,  ac: "new-password" },
                { label: "ยืนยันรหัสใหม่",   v: pwNew2, set: setPwNew2, ac: "new-password" },
              ] as const).map((f) => (
                <TextField
                  key={f.label}
                  type="password"
                  label={f.label}
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  autoComplete={f.ac}
                  size="small"
                  fullWidth
                  disabled={pwBusy}
                  InputProps={{ sx: { color: "var(--sr-ink)", borderRadius: 2 } }}
                  InputLabelProps={{ sx: { color: "var(--sr-muted)" } }}
                />
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closePw} disabled={pwBusy} sx={{ color: "var(--sr-muted)", fontFamily: SANS }}>
            {pwDone ? "ปิด" : "ยกเลิก"}
          </Button>
          {!pwDone && (
            <Button
              onClick={() => void submitPw()}
              disabled={pwBusy || !pwCur || !pwNew || !pwNew2}
              variant="contained"
              sx={{
                fontFamily: SANS,
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                background: `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`,
                boxShadow: "none",
                "&:hover": { background: `linear-gradient(135deg, ${ROSE_DEEP}, ${ROSE_DEEP})`, boxShadow: "none" },
              }}
            >
              {pwBusy ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "บันทึก"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
