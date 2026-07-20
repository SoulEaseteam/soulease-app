// src/pages/BookingHistoryPage.tsx
//
// 🆕 Round 28c17 (founder 2026-05-06) — full SunRed theme redesign.
//   Dark hero header + x-transform sliding pill tabs (3 buckets) +
//   framer-motion staggered cards. Matches ProfilePage premium feel.
// 🆕 Round 28w.1 (2026-07-13) — audit fixes:
//   • P1 CRASH FIX: `visible` filter now guards `STATUS_META[b.status]`
//     (was `.bucket` on undefined → white screen). STATUS_META also
//     expanded to cover every real booking status the app writes —
//     "done" (set on admin Complete), paid, in_progress, canceled (US),
//     refunded, no_show, rejected, failed — each mapped to a bucket so
//     completed/cancelled sessions actually appear instead of crashing.
//   • Retheme: retired taupe #8F8474 + navy rgba(15,23,42) → rose
//     #D97C95 accent on day/night var(--sr-*) tokens (matches detail
//     page). Dark hero → rose-berry gradient (white text safe in both
//     day + night, mode-independent).
//   • a11y: aria-label on back button, role="tablist"/role="tab" +
//     aria-selected on the pill tabs.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
// 🆕 Round 28w.21 (founder: "แถบบาร์ ไม่เสมอ กล่องล่าง") — page was full-bleed
//   while the TopNav is capped by responsiveShell, so on tablet/desktop the
//   maroon hero ran edge-to-edge past the centered nav. Cap the page to the
//   same shell so the bar + the box below line up.
import { responsiveShell } from "@/theme/breakpoints";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Flag,
  XCircle,
  Star,
  MapPin,
} from "phosphor-react";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
// 🆕 28x.84 (founder: screenshot of this page's hero + "เอาไปแทนพื้นหลังชมพูนั้น",
//   "replace that pink background") — the fixed rose-berry hero now matches
//   her membership tier, same palette ProfilePage's hero card already used.
import { useMemberTier } from "@/hooks/useMemberTier";
import { TIER_META } from "@/components/membership/MembershipCard";
import { formatTHB } from "@/utils/servicePricing";
import { fmtBKK } from "@/utils/time";
import { formatRating } from "@/utils/rating";
import { getServiceLabel } from "@/utils/serviceCatalog";
// 🆕 Round 28r79 — admin-created practitioners live only in Firestore
//   `therapists/{id}`. The r68 pattern (hardcoded fast-path + Firestore
//   fallback) now runs through this shared helper.
import {
  findHardcodedTherapist,
  findTherapistOrFetch,
} from "@/utils/therapistLookup";
import type { Therapist } from "@/types/therapist";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS  = '"Inter", system-ui, sans-serif';

// ── brand accents (fixed hex — day/night surfaces come from var(--sr-*)) ─
const ROSE       = "#D97C95";
const GREEN      = "#57B88B";
const GREEN_TEXT = "#2E7D57";
const AMBER_TEXT = "#C97A1F";
// Rose-berry hero gradient: dark enough for white text in BOTH day + night.
const HERO_GRADIENT = "linear-gradient(160deg, #B8567F 0%, #8A3A57 100%)";

// ── types ────────────────────────────────────────────────────────────
type BookingStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "in_progress"
  | "in_session"
  | "completed"
  | "done"
  | "cancelled"
  | "canceled"
  | "refunded"
  | "no_show"
  | "rejected"
  | "failed"
  | "upcoming";
type TabKey = "upcoming" | "completed" | "cancelled";

interface Booking {
  id: string;
  therapistId: string;
  therapistName?: string;
  serviceName?: string;
  serviceId?: string;
  duration?: number;
  date?: string;
  time?: string;
  startAt?: Timestamp;
  locationName?: string;
  address?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  total?: number;
  status: BookingStatus;
  reviewed?: boolean;
  createdAt?: Timestamp;
  userId?: string;
  // 🆕 28x.87 — stamped server-side (functions/src/index.ts) once the
  //   therapist's Auth account is linked; may be absent on very old or
  //   never-linked bookings. Used to route a "report an issue" straight to
  //   the therapist it's about.
  therapistUid?: string;
}

// 🆕 28w.1 — every status the app actually writes to `bookings` is
//   mapped here, so no live booking can slip through as `undefined`
//   and crash the `visible` filter. Buckets: upcoming (active),
//   completed (served), cancelled (dead). Surfaces use day/night vars;
//   only the semantic status hues are fixed hex.
const STATUS_META: Record<string, { label: string; bg: string; fg: string; bucket: TabKey }> = {
  // ── upcoming (active) ──
  upcoming:    { label: "Upcoming",   bg: "rgba(217,124,149,0.12)", fg: ROSE,              bucket: "upcoming"  },
  pending:     { label: "Pending",    bg: "var(--sr-panel-2)",      fg: "var(--sr-muted)", bucket: "upcoming"  },
  confirmed:   { label: "Confirmed",  bg: "rgba(87,184,139,0.14)",  fg: GREEN_TEXT,        bucket: "upcoming"  },
  paid:        { label: "Paid",       bg: "rgba(87,184,139,0.14)",  fg: GREEN_TEXT,        bucket: "upcoming"  },
  in_progress: { label: "In session", bg: "rgba(242,157,56,0.14)",  fg: AMBER_TEXT,        bucket: "upcoming"  },
  in_session:  { label: "In session", bg: "rgba(242,157,56,0.14)",  fg: AMBER_TEXT,        bucket: "upcoming"  },
  // ── completed (served) ──
  completed:   { label: "Completed",  bg: "var(--sr-panel-2)",      fg: "var(--sr-muted)", bucket: "completed" },
  done:        { label: "Completed",  bg: "var(--sr-panel-2)",      fg: "var(--sr-muted)", bucket: "completed" },
  // ── cancelled (dead) ──
  cancelled:   { label: "Cancelled",  bg: "var(--sr-panel-2)",      fg: "var(--sr-dim)",   bucket: "cancelled" },
  canceled:    { label: "Cancelled",  bg: "var(--sr-panel-2)",      fg: "var(--sr-dim)",   bucket: "cancelled" },
  refunded:    { label: "Refunded",   bg: "var(--sr-panel-2)",      fg: "var(--sr-dim)",   bucket: "cancelled" },
  no_show:     { label: "No-show",    bg: "var(--sr-panel-2)",      fg: "var(--sr-dim)",   bucket: "cancelled" },
  rejected:    { label: "Cancelled",  bg: "var(--sr-panel-2)",      fg: "var(--sr-dim)",   bucket: "cancelled" },
  failed:      { label: "Cancelled",  bg: "var(--sr-panel-2)",      fg: "var(--sr-dim)",   bucket: "cancelled" },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming",  label: "Upcoming"  },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const N_TABS   = TABS.length;
const PILL_GAP = 3; // px gap between pill and track edge

// ── animation helpers ─────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.38, ease: "easeOut" as const, delay },
});

// ──────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────
const BookingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [tab,      setTab]      = useState<TabKey>("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── sliding pill geometry ────────────────────────────────────────
  const trackRef  = useRef<HTMLDivElement>(null);
  const [tabPx, setTabPx] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTabPx(el.offsetWidth / N_TABS);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeIndex = TABS.findIndex((t) => t.key === tab);
  const pillW = tabPx > PILL_GAP * 2 ? tabPx - PILL_GAP * 2 : 0;
  const pillX = activeIndex * tabPx + PILL_GAP;

  // ── firestore listener ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const next: Booking[] = [];
      snap.forEach((d) => next.push({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
      setBookings(next);
      setLoading(false);
    }, (err) => {
      console.warn("[bookings] snapshot error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { upcoming: 0, completed: 0, cancelled: 0 };
    for (const b of bookings) {
      const meta = STATUS_META[b.status];
      if (meta) c[meta.bucket]++;
    }
    return c;
  }, [bookings]);

  // 🆕 28w.1 — guard `STATUS_META[b.status]` with `?.` so an unmapped
  //   status can never throw here (it just falls out of every tab).
  const visible = useMemo(
    () => bookings.filter((b) => STATUS_META[b.status]?.bucket === tab),
    [bookings, tab],
  );

  // 🆕 28x.84 — a non-member (or a guest whose tier hasn't loaded yet) keeps
  //   the original rose-berry hero exactly as before; a member's hero
  //   recolors to her tier. Bronze/Silver/Gold are LIGHT gradients (the same
  //   ones the membership card already uses, already contrast-verified in
  //   28x.83), so their text/glass need dark tier ink, not white — BlackVIP
  //   and the no-tier fallback are both dark backgrounds and keep the
  //   light-glass, near-white treatment (BlackVIP's own ink is a warm gold,
  //   not literal white, so its card still reads as its own finish).
  const memberTier = useMemberTier(user?.uid ?? null);
  const heroIsLight = memberTier === "Bronze" || memberTier === "Silver" || memberTier === "Gold";
  const heroBg     = memberTier ? TIER_META[memberTier].gradient : HERO_GRADIENT;
  const heroInk    = memberTier ? TIER_META[memberTier].ink   : "#fff";
  const heroSub    = memberTier ? TIER_META[memberTier].sub   : "rgba(255,255,255,0.72)";
  const heroLabel  = memberTier ? TIER_META[memberTier].sub   : "rgba(255,255,255,0.70)";
  const heroBorder = memberTier ? TIER_META[memberTier].border : "rgba(255,255,255,0.16)";
  const heroGlassBg   = heroIsLight ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)";
  const heroBackBg     = heroIsLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.14)";
  const heroBackBorder = memberTier ? TIER_META[memberTier].border : "rgba(255,255,255,0.22)";
  const heroBlob        = memberTier ? TIER_META[memberTier].glow : "rgba(255,255,255,0.14)";

  // 🆕 28x.85 (founder screenshot: BlackVIP hero + a plain rose pill/CTA right
  //   below it, "ปรับให้สวยขึ้น") — the rose brand accent below the hero read
  //   as a clash once the hero itself went tier-colored. A member's active
  //   tab pill and empty-state icon/button now pick up the SAME gradient/ink
  //   the hero and card already use (contrast already verified for ink-on-
  //   gradient above), so the whole page reads as one finish instead of
  //   "fancy hero, generic pink chrome underneath". Non-members/guests keep
  //   the original rose exactly as before.
  const accentBg      = memberTier ? TIER_META[memberTier].gradient : ROSE;
  const accentFg       = memberTier ? TIER_META[memberTier].ink : "#fff";
  const accentFgDim    = memberTier ? TIER_META[memberTier].sub : "rgba(255,255,255,0.85)";
  const accentShadowSm = memberTier ? `0 4px 14px ${TIER_META[memberTier].glow}` : "0 4px 14px rgba(138, 58, 87, 0.30)";
  const accentShadowMd = memberTier ? `0 6px 20px ${TIER_META[memberTier].glow}` : "0 6px 20px rgba(138, 58, 87, 0.30)";
  const accentShadowLg = memberTier ? `0 8px 24px ${TIER_META[memberTier].glow}` : "0 8px 24px rgba(138, 58, 87, 0.28)";

  return (
    <Box
      sx={{
        // 🆕 28w.21 — cap + centre to the same shell as TopNav.
        // 🆕 28w.22 (founder: "คอลัมไม่เท่ากัน") — keep responsiveShell's own px
        //   (don't zero it) so the hero insets by the SAME padding as the nav
        //   bar. With px:0 the maroon ran to the column edge (1200) while the
        //   nav content sat inset (1136) → the box looked wider than the bar.
        //   Now both are the same width, perfectly aligned.
        ...responsiveShell,
        minHeight: "100vh",
        background: "var(--sr-bg)",
        pb: 14,
        fontFamily: SANS,
      }}
    >

      {/* ── Hero header — rose-berry by default, tier-colored for a member ── */}
      <Box
        sx={{
          background: heroBg,
          pt: "env(safe-area-inset-top, 16px)",
          pb: 3.5,
          px: 2.5,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: -32,
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            height: 64,
            borderRadius: "50%",
            background: heroBlob,
            filter: "blur(28px)",
            pointerEvents: "none",
          },
        }}
      >
        {/* back button */}
        <Box
          component="button"
          onClick={() => void navigate(-1)}
          aria-label="Go back"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: heroBackBg,
            border: `1px solid ${heroBackBorder}`,
            color: heroInk,
            cursor: "pointer",
            mb: 2.5,
            p: 0,
          }}
        >
          <ArrowLeft size={18} weight="bold" />
        </Box>

        <motion.div {...fadeUp(0)}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: heroInk, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            My Bookings
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: heroSub, mt: 0.5 }}>
            {counts.upcoming > 0
              ? `${counts.upcoming} upcoming session${counts.upcoming > 1 ? "s" : ""}`
              : "No upcoming sessions"}
          </Typography>
        </motion.div>

        {/* stat strip */}
        <motion.div {...fadeUp(0.08)}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 2.5,
              p: 1.5,
              borderRadius: "16px",
              background: heroGlassBg,
              border: `1px solid ${heroBorder}`,
            }}
          >
            {[
              { value: counts.upcoming,  label: "Upcoming"  },
              { value: counts.completed, label: "Completed" },
              { value: counts.cancelled, label: "Cancelled" },
            ].map((s, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: i < 2 ? `1px solid ${heroBorder}` : "none",
                }}
              >
                <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: heroInk, lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: heroLabel, mt: 0.4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* ── Sliding pill tab switcher ─────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2.5, pb: 0 }}>
        <motion.div {...fadeUp(0.12)}>
          <Box
            ref={trackRef}
            role="tablist"
            aria-label="Booking status"
            sx={{
              position: "relative",
              display: "flex",
              borderRadius: 999,
              background: "var(--sr-panel)",
              border: "1px solid var(--sr-hairline)",
              boxShadow: "var(--sr-card-shadow)",
              overflow: "hidden",
            }}
          >
            {/* sliding pill */}
            {pillW > 0 && (
              <motion.div
                initial={false}
                animate={{ x: pillX }}
                transition={{ type: "spring", stiffness: 500, damping: 42, mass: 0.9 }}
                style={{
                  position: "absolute",
                  top: PILL_GAP,
                  bottom: PILL_GAP,
                  left: 0,
                  width: pillW,
                  borderRadius: 999,
                  background: accentBg,
                  boxShadow: accentShadowSm,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            )}
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <motion.button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  whileTap={{ scale: 0.97 }}
                  role="tab"
                  aria-selected={active}
                  aria-label={t.label}
                  style={{
                    flex: 1,
                    position: "relative",
                    zIndex: 1,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 4px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      color: active ? accentFg : "var(--sr-muted)",
                      lineHeight: 1,
                      transition: "color 0.15s ease",
                    }}
                  >
                    {t.label}
                  </Typography>
                  {counts[t.key] > 0 && (
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 10,
                        fontWeight: 700,
                        color: active ? accentFgDim : "var(--sr-dim)",
                        lineHeight: 1,
                        transition: "color 0.15s ease",
                      }}
                    >
                      {counts[t.key]}
                    </Typography>
                  )}
                </motion.button>
              );
            })}
          </Box>
        </motion.div>
      </Box>

      {/* ── Card list ────────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {!user ? (
          <EmptySlate
            icon={<XCircle size={32} weight="duotone" />}
            title="Sign in to view bookings"
            body="Your booking history will appear here after you log in."
            cta="Sign in"
            onCta={() => void navigate("/login")}
          />
        ) : loading ? (
          <LoadingShimmer />
        ) : visible.length === 0 ? (
          <EmptySlate
            icon={
              tab === "upcoming"  ? <CalendarBlank size={32} weight="duotone" /> :
              tab === "completed" ? <CheckCircle   size={32} weight="duotone" /> :
                                    <XCircle       size={32} weight="duotone" />
            }
            title={
              tab === "upcoming"  ? "No upcoming sessions"       :
              tab === "completed" ? "No completed sessions yet"   :
                                    "No cancelled bookings"
            }
            body={
              tab === "upcoming"  ? "Browse therapists and book your next session." :
              tab === "completed" ? "Your completed sessions will land here."       :
                                    "Cancelled bookings will appear here."
            }
            cta={tab === "upcoming" ? "Browse therapists" : undefined}
            onCta={tab === "upcoming" ? () => void navigate("/") : undefined}
            accentBg={accentBg}
            accentFg={accentFg}
            accentShadow={accentShadowLg}
            accentShadowCta={accentShadowMd}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            {visible.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.05 }}
              >
                <BookingCard
                  booking={b}
                  userId={user?.uid ?? null}
                  onRebook={() => void navigate(`/therapists/${b.therapistId}`)}
                  onReview={() => void navigate(`/review/${b.id}`)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Booking card
// ──────────────────────────────────────────────────────────────────────
const BookingCard: React.FC<{
  booking: Booking;
  userId: string | null;
  onRebook: () => void;
  onReview: () => void;
}> = ({ booking, userId, onRebook, onReview }) => {
  const status     = STATUS_META[booking.status] ?? STATUS_META.pending;
  // 🆕 Round 28r79 — r68 Firestore fallback for admin-added therapists.
  //   Sync fast-path for the 12 originals (zero I/O); Firestore falls
  //   through when it misses so admin-created practitioners render
  //   their name/photo/rating instead of a blank card.
  const [therapist, setTherapist] = useState<Therapist | null>(() =>
    findHardcodedTherapist(booking.therapistId),
  );
  useEffect(() => {
    let cancelled = false;
    const local = findHardcodedTherapist(booking.therapistId);
    if (local) {
      setTherapist(local);
      return;
    }
    (async () => {
      const t = await findTherapistOrFetch(booking.therapistId);
      if (!cancelled) setTherapist(t);
    })();
    return () => { cancelled = true; };
  }, [booking.therapistId]);
  const total      = booking.totalPrice ?? booking.total ?? 0;
  const isUpcoming = status.bucket === "upcoming";
  const isCompleted = status.bucket === "completed";

  // 🆕 28x.87 (founder: "รายการรีพอร์ต — ให้ฝั่งลูกค้าคอมเพลนมาได้แล้วมาขึ้น
  //   เตือนพนักงาน") — a completed session can be reported straight to the
  //   practitioner it's about. No customer identity is stamped into the
  //   report beyond the uid the write rule requires; the therapist only ever
  //   sees the booking date/service + the message, same privacy stance as
  //   the masked-until-accepted guest identity on her Jobs list.
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const submitReport = async () => {
    if (!userId || !reportMsg.trim()) return;
    setReportBusy(true);
    try {
      await addDoc(collection(db, "reports"), {
        bookingId: booking.id,
        therapistId: booking.therapistId,
        therapistUid: booking.therapistUid ?? null,
        userId,
        message: reportMsg.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      toast.success("ส่งรีพอร์ตแล้ว ขอบคุณที่แจ้งให้ทราบ");
      setReportOpen(false);
      setReportMsg("");
    } catch (err) {
      console.error("[BookingHistory] report submit failed:", err);
      toast.error("ส่งรีพอร์ตไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setReportBusy(false);
    }
  };

  const dateLabel = booking.startAt?.toDate
    ? fmtBKK(booking.startAt.toDate(), "ddd D MMM")
    : booking.date
    ? fmtBKK(booking.date, "ddd D MMM")
    : "—";
  const timeLabel = booking.time ?? "—";

  return (
    <Box
      sx={{
        borderRadius: "20px",
        background: "var(--sr-panel)",
        border: "1px solid var(--sr-hairline)",
        boxShadow: "var(--sr-card-shadow)",
        overflow: "hidden",
      }}
    >
      {/* status accent stripe */}
      <Box
        sx={{
          height: 3,
          background: status.bucket === "upcoming"
            ? ROSE
            : status.bucket === "completed"
            ? GREEN
            : "var(--sr-line)",
        }}
      />

      <Box sx={{ p: "14px 16px" }}>
        {/* top row: avatar + name + status pill */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          {/* avatar with rose ring */}
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: ROSE,
              p: "2px",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(138, 58, 87, 0.20)",
            }}
          >
            <Avatar
              src={therapist?.image || undefined}
              sx={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #E8B7C6, #D97C95)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: SERIF,
                color: "#fff",
              }}
            >
              {!therapist?.image && (booking.therapistName?.[0] ?? "T")}
            </Avatar>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.2, mb: 0.25 }}>
              {booking.therapistName ?? therapist?.name ?? "Therapist"}
            </Typography>
            {therapist && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                <Star size={11} color={ROSE} weight="fill" />
                <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "var(--sr-muted)" }}>
                  {/* 🆕 28x.5 — same double-Bayesian bug as BookingFlowPage.
                      therapists/{id}.rating is already the adjusted value (28x.1). */}
                  {formatRating(therapist.rating)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* status pill */}
          <Box
            sx={{
              px: "10px",
              py: "4px",
              borderRadius: 999,
              background: status.bg,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: status.fg }}>
              {status.label}
            </Typography>
          </Box>
        </Box>

        {/* service + datetime + location */}
        <Box
          sx={{
            p: "10px 12px",
            borderRadius: "12px",
            background: "var(--sr-panel-2)",
            display: "flex",
            flexDirection: "column",
            gap: 0.6,
            mb: 1.5,
          }}
        >
          <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: "var(--sr-ink)", lineHeight: 1.3 }}>
            {getServiceLabel(booking.serviceId, booking.serviceName)}
            {booking.duration && (
              <Box component="span" sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: "var(--sr-muted)", ml: 1 }}>
                · {booking.duration} min
              </Box>
            )}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarBlank size={12} color="var(--sr-muted)" />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)" }}>
              {dateLabel} · {timeLabel}
            </Typography>
          </Box>
          {(booking.locationName || booking.address) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MapPin size={12} color="var(--sr-muted)" />
              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {booking.locationName ?? booking.address}
              </Typography>
            </Box>
          )}
        </Box>

        {/* bottom row: total + actions */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Total
            </Typography>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {formatTHB(total)}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {isCompleted && userId && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setReportOpen(true)}
                aria-label="Report an issue with this session"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: "var(--sr-panel-2)",
                  color: "var(--sr-muted)",
                  border: "1px solid var(--sr-hairline)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Flag size={15} weight="bold" />
              </motion.button>
            )}
            {isCompleted && !booking.reviewed && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onReview}
                aria-label="Leave a review"
                style={{
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 999,
                  background: "rgba(217, 124, 149, 0.12)",
                  color: ROSE,
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Star size={13} weight="fill" />
                Review
              </motion.button>
            )}
            {!isUpcoming && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onRebook}
                aria-label="Rebook this practitioner"
                style={{
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 999,
                  background: ROSE,
                  color: "#fff",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(138, 58, 87, 0.28)",
                }}
              >
                Rebook
              </motion.button>
            )}
          </Box>
        </Box>
      </Box>

      {/* 🆕 28x.87 — report-an-issue dialog */}
      <Dialog
        open={reportOpen}
        onClose={() => { if (!reportBusy) setReportOpen(false); }}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4, background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", backgroundImage: "none" } }}
      >
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 18, color: "var(--sr-ink)", pb: 0.5 }}>
          แจ้งปัญหา · Report an issue
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)", mb: 1.5, lineHeight: 1.5 }}>
            บอกเราว่าเกิดอะไรขึ้นกับการจองนี้ ({dateLabel}) — ข้อความจะส่งตรงถึงพนักงานที่เกี่ยวข้อง
          </Typography>
          <TextField
            multiline
            minRows={3}
            fullWidth
            placeholder="เล่าให้ฟังหน่อยค่ะ..."
            value={reportMsg}
            onChange={(e) => setReportMsg(e.target.value)}
            disabled={reportBusy}
            InputProps={{ sx: { color: "var(--sr-ink)", borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setReportOpen(false)} disabled={reportBusy} sx={{ color: "var(--sr-muted)", fontFamily: SANS }}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => void submitReport()}
            disabled={reportBusy || !reportMsg.trim()}
            variant="contained"
            sx={{ fontFamily: SANS, fontWeight: 700, borderRadius: 2, px: 2.5, background: ROSE, boxShadow: "none", "&:hover": { background: "#C96F89", boxShadow: "none" } }}
          >
            ส่งรีพอร์ต
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────
const EmptySlate: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
  // 🆕 28x.85 — optional tier accent, defaults to the original rose so the
  //   sign-in gate (no tier known yet) renders exactly as before.
  accentBg?: string;
  accentFg?: string;
  accentShadow?: string;
  accentShadowCta?: string;
}> = ({
  icon, title, body, cta, onCta,
  accentBg = ROSE,
  accentFg = "#fff",
  accentShadow = "0 8px 24px rgba(138, 58, 87, 0.28)",
  accentShadowCta = "0 6px 20px rgba(138, 58, 87, 0.30)",
}) => (
  <Box
    sx={{
      mt: 4,
      px: 2,
      py: 6,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 1.5,
    }}
  >
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: accentBg,
        color: accentFg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: accentShadow,
        mb: 0.5,
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.01em" }}>
      {title}
    </Typography>
    <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "var(--sr-muted)", lineHeight: 1.6, maxWidth: 260 }}>
      {body}
    </Typography>
    {cta && onCta && (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onCta}
        style={{
          marginTop: 8,
          height: 44,
          padding: "0 28px",
          borderRadius: 999,
          background: accentBg,
          color: accentFg,
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          boxShadow: accentShadowCta,
        }}
      >
        {cta}
      </motion.button>
    )}
  </Box>
);

// ──────────────────────────────────────────────────────────────────────
// Loading shimmer (3 skeleton cards)
// ──────────────────────────────────────────────────────────────────────
const LoadingShimmer: React.FC = () => (
  <>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          borderRadius: "20px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          overflow: "hidden",
          opacity: 1 - i * 0.2,
        }}
      >
        <Box sx={{ height: 3, background: "var(--sr-line)" }} />
        <Box sx={{ p: "14px 16px", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: "var(--sr-panel-2)" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ height: 14, width: "55%", borderRadius: 6, background: "var(--sr-panel-2)", mb: 0.8 }} />
              <Box sx={{ height: 10, width: "30%", borderRadius: 6, background: "var(--sr-panel-2)" }} />
            </Box>
            <Box sx={{ height: 22, width: 72, borderRadius: 999, background: "var(--sr-panel-2)" }} />
          </Box>
          <Box sx={{ height: 68, borderRadius: 12, background: "var(--sr-panel-2)" }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Box sx={{ height: 9, width: 32, borderRadius: 4, background: "var(--sr-panel-2)", mb: 0.6 }} />
              <Box sx={{ height: 20, width: 64, borderRadius: 6, background: "var(--sr-panel-2)" }} />
            </Box>
            <Box sx={{ height: 38, width: 80, borderRadius: 999, background: "var(--sr-panel-2)" }} />
          </Box>
        </Box>
      </Box>
    ))}
  </>
);

export default BookingHistoryPage;
