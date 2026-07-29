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
import { collection, query, where, getCountFromServer, getDocs, limit, query as fsQuery } from "firebase/firestore";
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
// 🆕 28x.84 — shared tier palette + the founder's real designed artwork,
//   moved out of this file so Booking History and Rewards can reuse it.
import { TIER_META, TIER_IMAGE } from "@/components/membership/MembershipCard";
import { useMemberTier } from "@/hooks/useMemberTier";
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
const ROSE = "#FF9999";
const ROSE_DEEP = "#FF9999";
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
  // 🆕 28x.74 — staff sign in through the same door as guests, so this page has
  //   to know which product it is showing.
  const isTherapist = role === "therapist";
  const navigate  = useNavigate();
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  // Round 28s369 — therapist name from Firestore (Firebase Auth displayName is null for therapist accounts)
  const [therapistName, setTherapistName] = useState<string | null>(null);
  // 🆕 28x.83 (founder: membership card reference images) — her CURRENT tier,
  //   for the hero. Read from users/{uid}.membership.tier, not the admin
  //   roster (adminSettings/members is isAdmin()-only in firestore.rules — a
  //   customer can't read it directly). syncMembershipMirror already copies
  //   { code, tier, visits, ... } onto her OWN doc on every enroll/upgrade
  //   (28w.92), which she CAN read as its owner.
  // 🆕 28x.84 — therapists are never members of their own workplace (same
  //   reasoning as 28x.74's "VIP status" removal), so only ask for a tier
  //   when this is a customer.
  const memberTier = useMemberTier(!isTherapist && user ? user.uid : null);

  // pull total booking count for this user
  useEffect(() => {
    if (!user) return;
    // 🆕 28x.75 — for a practitioner this counted bookings she had MADE as a
    //   guest ("1"), sitting in her header as if it were her work. Count the
    //   jobs assigned to her instead; the label switches to match.
    const q = isTherapist
      ? query(
          collection(db, "bookings"),
          where("therapistUid", "==", user.uid),
          where("status", "in", ["confirmed", "completed"])
        )
      : query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          where("status", "in", ["confirmed", "completed"])
        );
    getCountFromServer(q)
      .then((snap) => setBookingCount(snap.data().count))
      .catch(() => setBookingCount(null));
  }, [user, isTherapist]);

  // Round 28s369 — fetch therapist name from Firestore when Auth displayName is null
  useEffect(() => {
    if (!user || role !== "therapist" || user.displayName) return;
    // 🆕 28x.74 — was getDoc(therapists/{uid}). Therapist docs are keyed by a
    //   slug ("XingXingSunRed"), never by the auth uid, so this always missed
    //   and the header fell through to "Guest" — a practitioner being greeted
    //   as a guest on her own workplace app. Look her up by the uid FIELD,
    //   which 28x.67 now keeps populated.
    void (async () => {
      try {
        const byUid = await getDocs(
          fsQuery(collection(db, "therapists"), where("uid", "==", user.uid), limit(1))
        );
        const d = byUid.empty ? null : (byUid.docs[0].data() as { name?: string; displayName?: string });
        if (d) setTherapistName(d.name || d.displayName || null);
      } catch {
        /* silent fallback — the header just shows the email */
      }
    })();
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
    if (!current?.email)    { setPwErr("บัญชีนี้เปลี่ยนรหัสในหน้านี้ไม่ได้ — ติดต่อผู้ช่วยส่วนตัว"); return; }

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
              background: "linear-gradient(135deg, #FF9999 0%, #FF9999 100%)",
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
      {/* ── Hero (r128 · Approach 8 · Split ID Badge · Wallet-style) ──
          🆕 28r128 (founder pick: "Split ID Badge · Wallet-style ·
          sectioned") — landscape hero row (avatar left + name/email/tier
          right), a compact 3-cell stats strip with vertical dividers,
          a "◆ Member Card" section label above the tier PNG artwork,
          then a "◆ Member Perks" section label + 3 icon-tile perks.
          Rebuilds the r28x.86 centered stack into a wallet-style layout
          that reads as an ID badge + benefits. */}
      <Box
        sx={{
          // 🆕 28r129 (founder "สีละการแก้ไขยังไม่ ตรง · ดู mockup") —
          //   dropped rose-tint palette (was #A34A67 → #5A2733, too pink)
          //   for the darker maroon-to-black wash from the Approach 8
          //   mockup.  Deeper hue reads more premium + gives the gold
          //   card + gold hairlines proper contrast.
          background:
            "radial-gradient(140% 100% at 0% 0%, #6B2A3E 0%, #331020 50%, #14090F 100%)",
          pt: 5,
          pb: 4,
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
            background: "rgba(20, 9, 15, 0.4)",
            filter: "blur(30px)",
            pointerEvents: "none",
          },
        }}
      >
        {/* Landscape identity row · avatar LEFT + name/email/tier RIGHT */}
        <motion.div {...fadeUp(0)}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.25, mb: 2.5 }}>
            <Box
              sx={{
                flexShrink: 0,
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: memberTier
                  ? TIER_META[memberTier].gradient
                  : `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`,
                p: "2px",
                boxShadow: memberTier
                  ? `0 0 0 2px ${TIER_META[memberTier].border}, 0 8px 22px rgba(0,0,0,0.35)`
                  : "0 0 0 2px rgba(255,255,255,0.16), 0 8px 22px rgba(0,0,0,0.35)",
              }}
            >
              <Avatar
                src={user.photoURL || undefined}
                sx={{
                  width: "100%",
                  height: "100%",
                  // 🆕 28r129 — deep maroon fill (was rose #7A3049→#5A2733,
                  //   too pink against the new darker hero bg).
                  background: "linear-gradient(135deg, #4B1B2C, #14090F)",
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: SERIF,
                  color: "#F5E9D5",
                }}
              >
                {!user.photoURL && initials(therapistName || user.displayName, user.email)}
              </Avatar>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.4 }}>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {therapistName || user.displayName || (isTherapist ? "Practitioner" : "Guest")}
                </Typography>
                <CheckCircle size={16} color="rgba(255,255,255,0.85)" weight="fill" />
              </Box>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.55)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  mb: 0.8,
                }}
              >
                {user.email}
              </Typography>
              {isTherapist ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: "10px",
                    py: "3px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    fontFamily: SANS,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  Practitioner
                </Box>
              ) : (
                memberTier && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: "10px",
                      py: "3px",
                      borderRadius: 999,
                      background: TIER_META[memberTier].gradient,
                      border: `1px solid ${TIER_META[memberTier].border}`,
                      fontFamily: SANS,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: TIER_META[memberTier].ink,
                    }}
                  >
                    ★ {TIER_META[memberTier].label} · Member
                  </Box>
                )
              )}
            </Box>
          </Box>
        </motion.div>

        {/* Stats strip · 3 cells · vertical dividers */}
        <motion.div {...fadeUp(0.08)}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2.5,
              py: 1.5,
              borderRadius: "16px",
              background: "rgba(20, 9, 15, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(10px)",
            }}
          >
            {[
              {
                value: bookingCount === null
                  ? <CircularProgress size={14} sx={{ color: "rgba(255,255,255,0.5)" }} />
                  : <>{bookingCount}</>,
                label: isTherapist ? "Jobs" : "Bookings",
              },
              { value: since ? since.split(" ")[0].slice(0,3) + " '" + since.split(" ")[1].slice(-2) : "—", label: "Since" },
              { value: "24/7", label: "Support" },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: "rgba(255,255,255,0.45)", mt: 0.5, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {s.label}
                  </Typography>
                </Box>
                {i < arr.length - 1 && (
                  <Box aria-hidden sx={{ width: "1px", height: 30, background: "rgba(255,255,255,0.14)" }} />
                )}
              </React.Fragment>
            ))}
          </Box>
        </motion.div>

        {/* ◆ Member Card section label */}
        {!isTherapist && memberTier && (
          <>
            <motion.div {...fadeUp(0.14)} style={{ marginTop: 22 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  mb: 1.25,
                  px: "4px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.65)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box component="span" sx={{ color: "rgba(255,255,255,0.5)" }}>◆</Box>
                  Member Card
                </Typography>
                <Box aria-hidden sx={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.20), transparent)" }} />
              </Box>
            </motion.div>

            <motion.div {...fadeUp(0.18)}>
              <Box
                component="img"
                src={TIER_IMAGE[memberTier]}
                alt={`SunRed ${TIER_META[memberTier].label} membership`}
                loading="lazy"
                decoding="async"
                sx={{
                  display: "block",
                  width: "100%",
                  maxWidth: 380,
                  mx: "auto",
                  borderRadius: "18px",
                  boxShadow: `0 10px 30px ${TIER_META[memberTier].glow}`,
                }}
              />
            </motion.div>

            {/* ◆ Member Perks section */}
            <motion.div {...fadeUp(0.24)} style={{ marginTop: 22 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  mb: 1.25,
                  px: "4px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.65)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box component="span" sx={{ color: "rgba(255,255,255,0.5)" }}>◆</Box>
                  Member Perks
                </Typography>
                <Box aria-hidden sx={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.20), transparent)" }} />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { icon: "✧", text: "Priority concierge on WhatsApp · LINE · Telegram" },
                  { icon: "↻", text: "Complimentary rebook credits available" },
                  { icon: "★", text: "Ritual upgrade on your milestone booking" },
                ].map((perk, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      p: "10px 12px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: "12px",
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.10)",
                        color: "rgba(255,255,255,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {perk.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 12.5,
                        color: "rgba(255,255,255,0.85)",
                        lineHeight: 1.4,
                      }}
                    >
                      {perk.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </motion.div>
          </>
        )}
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
              {/* 🆕 28x.74 (founder: "My Bookings ก็ไม่ใช่งานของตัวเอง") — her
                  work, first. The rows below this are the customer product. */}
              <Row
                icon={<ClockCounterClockwise size={18} weight="duotone" />}
                label="งานของฉัน · My Jobs"
                sub="งานที่จ่ายให้คุณ · กดรับ/ปฏิเสธได้ที่นี่"
                onClick={() => navigate("/therapist/jobs")}
              />
              <Row
                icon={<IdentificationCard size={18} weight="duotone" />}
                label="My Practitioner Profile"
                sub="สถานะว่าง · ตำแหน่งยืน"
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
        {/* 🆕 28x.74 — hidden for staff. Discount codes, saved practitioners and
            a "Booking History" that means bookings she MADE are the customer
            product; on a practitioner's screen they read as her own work and
            don't match it. Founder: "My Bookings ก็ไม่ใช่งานของตัวเอง". */}
        {!isTherapist && (
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
        )}

        {/* Bookings */}
        {!isTherapist && (
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
              onClick={() => navigate("/saved")}
            />
          </Section>
        </motion.div>
        )}

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
              sub="EN · TH · ZH · ZH-TW · JA · KO"
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
