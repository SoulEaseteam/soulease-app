// src/pages/therapist/TherapistJobsPage.tsx
//
// 🆕 Round 28x.74 (founder: "My Bookings ก็ไม่ใช่งานของตัวเอง ในหน้า
//   booking/history · ต้องกดทางเข้า Practitioner อีก") — the practitioner's own
//   job list.
//
//   Until now a practitioner signing in landed on the CUSTOMER profile: "Guest",
//   "MEMBER SINCE", "VIP status", and a Booking History that meant bookings she
//   had made as a guest — not the work assigned to her. Her actual jobs existed
//   nowhere in the app; the only place they were visible was Telegram.
//
//   Reading her own jobs became possible in 28x.66/67 (therapistUid + the rules
//   that compare uid to uid). This is the screen that uses it.
//
// 🆕 Round 28x.79 (founder, pointing at BookingHistoryPage.tsx: "ให้ใช้การตกแต่ง
//   และการใช้งานคล้ายเดียวกับหน้า booking/history ดูรายละเอียดการจองได้ แบบ
//   ใบจอง") — restyled to match that page's rose-berry hero, glass stat strip,
//   sliding pill tab switcher, and receipt-style card (the card itself IS the
//   "booking slip" on the customer page too — there's no separate detail
//   screen to open, everything relevant sits on the card).
//
//   What's carried over as-is, not restyled: the masking rule from 28x.69/74 —
//   a guest's name, address and phone stay hidden until she has accepted the
//   job, exactly like the Telegram card. The reference page has no equivalent
//   because a customer already owns every booking she can see.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Avatar, Typography, CircularProgress } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  MapPin,
  Phone,
  CalendarBlank,
  CheckCircle,
  XCircle,
  UserCircle,
} from "phosphor-react";

import { app, auth } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { formatTHB } from "@/utils/servicePricing";
import { useOwnBookingsSnapshot } from "@/hooks/useOwnBookingsSnapshot";
import { membershipChipSx, MEMBERSHIP_LABELS_TH, isTestLocationBooking, type MembershipTier } from "@/utils/membership";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS  = '"Inter", system-ui, sans-serif';

// ── brand accents — 🆕 Round 28x.103 (founder: "ปรับ 2 หน้าที่เหลือ...
//   ให้สวยงามเหมือนใช้ในไอโฟน") bumped to the same vivid rose→magenta→plum
//   family as TherapistIdentityCard/Profile (28x.101), so Jobs stops being
//   the one screen still on the old muted dusty-rose. ─────────────────────
const ROSE          = "#E0708F";
const ROSE_DEEP     = "#C2185B";
const GREEN         = "#22C55E";
const GREEN_TEXT    = "#15803D";
const DANGER        = "#DC2626";
const HERO_GRADIENT = "linear-gradient(160deg, #E0708F 0%, #C2185B 55%, #6B1541 100%)";

type TabKey = "today" | "completed" | "cancelled";

// 🆕 Round 28x.85 — dispatch lifecycle, mirrored from AdminTonightPage.tsx's
//   FLOW so a practitioner can advance her own job instead of only ever
//   being moved by an admin tapping buttons on the ops screen.
type DispatchState = "assigned" | "enroute" | "arrived" | "in_session" | "done";
const DISPATCH_FLOW: { key: DispatchState; label: string; next: DispatchState | null; btn: string | null }[] = [
  { key: "assigned",   label: "รับงานแล้ว",     next: "enroute",    btn: "🚗 ออกเดินทาง" },
  { key: "enroute",    label: "กำลังเดินทาง",   next: "arrived",    btn: "📍 ถึงแล้ว" },
  { key: "arrived",    label: "ถึงที่หมายแล้ว", next: "in_session", btn: "▶️ เริ่มนวด" },
  { key: "in_session", label: "กำลังนวด",       next: "done",       btn: "✅ จบงาน" },
  { key: "done",       label: "จบงานแล้ว",      next: null,         btn: null },
];
const dispatchStep = (s?: string) =>
  DISPATCH_FLOW.find((f) => f.key === (s as DispatchState)) ?? DISPATCH_FLOW[0];

interface Job {
  id: string;
  startAtMs: number;
  date?: string;
  time?: string;
  serviceName?: string;
  duration?: number;
  address?: string;
  locationName?: string;
  mapUrl?: string;
  phone?: string;
  contactName?: string;
  userId?: string;
  status?: string;
  totalPrice?: number;
  therapistResponse?: "accepted" | "declined";
  dispatchState?: DispatchState;
}

const toMs = (v: unknown): number => {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v).getTime();
    return isNaN(d) ? 0 : d;
  }
  return 0;
};

// 🆕 28x.79 — status → tab bucket. See the header comment on why this reads
//   status rather than a calendar-day window: a confirmed job for tomorrow,
//   or a past one an admin forgot to close out, must still land somewhere.
const DONE_STATUSES = new Set(["completed", "done"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "no_show", "no-show"]);
const bucketOf = (j: Job): TabKey => {
  const s = j.status ?? "";
  if (DONE_STATUSES.has(s)) return "completed";
  if (CANCELLED_STATUSES.has(s)) return "cancelled";
  return "today";
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "today",     label: "Today"     },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];
const N_TABS   = TABS.length;
const PILL_GAP = 3;

// 🆕 Round 28x.123 — how many cards get an entry animation (see the render
// comment), and how many rows render before "ดูเพิ่ม".
const ANIMATED_CARDS = 6;
const PAGE_SIZE = 20;

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.38, ease: "easeOut" as const, delay },
});

const TherapistJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("today");
  // 🆕 28x.123 — windowed list; resets whenever she switches tab.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [tab]);

  // ── sliding pill geometry — identical measurement approach to
  //   BookingHistoryPage, so the motion feels like the same component. ────
  const trackRef = useRef<HTMLDivElement>(null);
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

  // 🆕 Round 28x.123 (staff-app performance audit) — shares the one bookings
  //   listener with Home/Profile's identity card and the Performance page
  //   instead of opening a fourth copy of the identical query. No orderBy:
  //   combining it with the where() would need a composite index, and a
  //   missing index fails the whole listener rather than degrading — so the
  //   sort stays client-side, as before.
  const uid = auth.currentUser?.uid;
  const jobs = useOwnBookingsSnapshot<Job[] | null>(
    uid,
    (snap) => {
      const rows: Job[] = snap.docs
        // 🆕 Round 28x.135 (founder: "งานเทสบอท โผล่ น่ายกเลิก") — QA
        //   booking-flow tests at the fixed Aspire/Soi Prompan address are not
        //   real jobs; keep them out of her list and its tab counts. Only the
        //   test-ADDRESS signal, not isReservedShopBooking (admin's phone
        //   placeholder = 126 REAL bookings per CLAUDE.md).
        .filter((d) => !isTestLocationBooking(d.data() as Record<string, unknown>))
        .map((d) => {
        const b = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          startAtMs: toMs(b.startAt ?? b.createdAt),
          date: b.date as string | undefined,
          time: b.time as string | undefined,
          serviceName: b.serviceName as string | undefined,
          duration: b.duration as number | undefined,
          address: b.address as string | undefined,
          locationName: b.locationName as string | undefined,
          mapUrl: b.mapUrl as string | undefined,
          phone: b.phone as string | undefined,
          contactName: (b.contactName ?? b.customerName ?? b.userName) as string | undefined,
          userId: b.userId as string | undefined,
          status: b.status as string | undefined,
          totalPrice: b.totalPrice as number | undefined,
          therapistResponse: b.therapistResponse as Job["therapistResponse"],
          dispatchState: b.dispatchState as DispatchState | undefined,
        };
      });
      rows.sort((a, b) => b.startAtMs - a.startAtMs);
      return rows;
    },
    null,
    () => [],
  );

  const buckets = useMemo(() => {
    const all = jobs ?? [];
    return {
      today:     all.filter((j) => bucketOf(j) === "today"),
      completed: all.filter((j) => bucketOf(j) === "completed"),
      cancelled: all.filter((j) => bucketOf(j) === "cancelled"),
    };
  }, [jobs]);

  const counts = {
    today: buckets.today.length,
    completed: buckets.completed.length,
    cancelled: buckets.cancelled.length,
  };
  const shown = buckets[tab];

  // 🆕 28x.123 — useCallback so the memoised JobCard isn't invalidated on
  //   every render by a freshly-declared arrow function.
  const respond = useCallback(async (jobId: string, action: "accept" | "decline") => {
    setBusyId(jobId);
    try {
      const fn = httpsCallable<
        { bookingId: string; action: string },
        { ok: boolean; already: boolean; response: string }
      >(getFunctions(app, "asia-southeast1"), "respondToJob");
      const res = await fn({ bookingId: jobId, action });
      if (res.data.already) {
        toast.info("งานนี้ตอบไปแล้วค่ะ");
      } else {
        toast.success(action === "accept" ? "รับงานแล้วค่ะ" : "แจ้งแอดมินแล้วค่ะ");
      }
    } catch (e) {
      console.error("[jobs] respond failed", e);
      toast.error("ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusyId(null);
    }
  }, []);

  // 🆕 Round 28x.124 (founder: "ถึงแล้ว — ให้พนักงานถ่ายรูปจุดที่รอลูกค้า
  //   ส่งแอดมิน ... ถึงแล้วไม่สะดวกโทร") — arriving is the one step where
  //   calling isn't practical, so the proof is a photo instead.
  const advanceStatus = useCallback(async (jobId: string, arrivalPhotoUrl?: string) => {
    setBusyId(jobId);
    try {
      const fn = httpsCallable<
        { bookingId: string; arrivalPhotoUrl?: string },
        { ok: boolean; already: boolean; dispatchState: DispatchState }
      >(getFunctions(app, "asia-southeast1"), "advanceJobStatus");
      const res = await fn({ bookingId: jobId, ...(arrivalPhotoUrl ? { arrivalPhotoUrl } : {}) });
      if (!res.data.already) {
        toast.success(dispatchStep(res.data.dispatchState).label);
      }
    } catch (e) {
      console.error("[jobs] advance failed", e);
      toast.error("อัปเดตไม่สำเร็จ ลองใหม่");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 12, fontFamily: SANS }}>
      {/* ── Rose-berry hero — same gradient, same glow, same glass stat
          strip as BookingHistoryPage's hero. ────────────────────────── */}
      <Box
        sx={{
          background: HERO_GRADIENT,
          pt: "env(safe-area-inset-top, 14px)",
          pb: 2.5,
          px: 2.25,
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
            background: "rgba(255,255,255,0.14)",
            filter: "blur(28px)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          component="button"
          onClick={() => navigate("/therapist/home")}
          aria-label="Go back"
          sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)",
            color: "#fff", cursor: "pointer", mb: 2, p: 0,
          }}
        >
          <ArrowLeft size={17} weight="bold" />
        </Box>

        <motion.div {...fadeUp(0)}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 23, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            งานของฉัน
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "rgba(255,255,255,0.72)", mt: 0.4 }}>
            {counts.today > 0 ? `${counts.today} งานวันนี้` : "ไม่มีงานวันนี้"}
          </Typography>
        </motion.div>

        <motion.div {...fadeUp(0.08)}>
          <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.25, borderRadius: "14px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.16)" }}>
            {[
              { value: counts.today, label: "Today" },
              { value: counts.completed, label: "Completed" },
              { value: counts.cancelled, label: "Cancelled" },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.16)" : "none" }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.70)", mt: 0.35, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* ── Sliding pill tab switcher — same geometry + spring as the
          reference page. ─────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2, pb: 0 }}>
        <motion.div {...fadeUp(0.12)}>
          <Box
            ref={trackRef}
            role="tablist"
            aria-label="Job status"
            sx={{ position: "relative", display: "flex", borderRadius: 999, background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", boxShadow: "var(--sr-card-shadow)", overflow: "hidden" }}
          >
            {pillW > 0 && (
              <motion.div
                initial={false}
                animate={{ x: pillX }}
                transition={{ type: "spring", stiffness: 500, damping: 42, mass: 0.9 }}
                style={{ position: "absolute", top: PILL_GAP, bottom: PILL_GAP, left: 0, width: pillW, borderRadius: 999, background: ROSE, boxShadow: "0 4px 14px rgba(194, 24, 91, 0.30)", pointerEvents: "none", zIndex: 0 }}
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
                  style={{ flex: 1, position: "relative", zIndex: 1, background: "none", border: "none", outline: "none", cursor: "pointer", padding: "9px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, WebkitTapHighlightColor: "transparent" }}
                >
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", color: active ? "#fff" : "var(--sr-muted)", lineHeight: 1, transition: "color 0.15s ease" }}>
                    {t.label}
                  </Typography>
                  {counts[t.key] > 0 && (
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: active ? "rgba(255,255,255,0.85)" : "var(--sr-dim)", lineHeight: 1, transition: "color 0.15s ease" }}>
                      {counts[t.key]}
                    </Typography>
                  )}
                </motion.button>
              );
            })}
          </Box>
        </motion.div>
      </Box>

      {/* ── Card list ───────────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {jobs === null ? (
          <LoadingShimmer />
        ) : jobs.length === 0 ? (
          <EmptySlate
            icon={<CalendarBlank size={32} weight="duotone" />}
            title="ยังไม่มีงาน"
            body="งานที่แอดมินจ่ายให้คุณจะแสดงที่นี่"
          />
        ) : shown.length === 0 ? (
          <EmptySlate
            icon={
              tab === "today"     ? <CalendarBlank size={32} weight="duotone" /> :
              tab === "completed" ? <CheckCircle   size={32} weight="duotone" /> :
                                     <XCircle       size={32} weight="duotone" />
            }
            title={
              tab === "today"     ? "ไม่มีงานวันนี้" :
              tab === "completed" ? "ยังไม่มีงานที่เสร็จ" :
                                     "ไม่มีงานที่ยกเลิก"
            }
            body={
              tab === "today"     ? "งานใหม่จะแสดงที่นี่เมื่อแอดมินจ่ายงานให้คุณ" :
              tab === "completed" ? "งานที่ทำเสร็จแล้วจะแสดงที่นี่" :
                                     "งานที่ยกเลิกจะแสดงที่นี่"
            }
          />
        ) : (
          // 🆕 Round 28x.123 (staff-app performance audit) — this used to wrap
          //   all 60 rendered cards in a `motion.div` with a staggered entry.
          //   60 simultaneous framer-motion instances (each containing more
          //   motion.buttons) was a direct cause of the scroll jank the founder
          //   reported. Only the first few animate now; everything below the
          //   fold renders as plain markup, which looks identical (you can't
          //   see an entry animation on a card that's off-screen) and costs
          //   nothing. Completed/Cancelled can run to hundreds of rows, so the
          //   list is also windowed rather than capped at a flat 60.
          shown.slice(0, visibleCount).map((j, i) =>
            i < ANIMATED_CARDS ? (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.05 }}
              >
                <JobCard job={j} tab={tab} busy={busyId === j.id} onRespond={respond} onAdvance={advanceStatus} />
              </motion.div>
            ) : (
              <JobCard key={j.id} job={j} tab={tab} busy={busyId === j.id} onRespond={respond} onAdvance={advanceStatus} />
            ),
          )
        )}
        {shown.length > visibleCount && (
          <Box
            component="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            sx={{
              mt: 0.5, py: 1.3, borderRadius: 999, cursor: "pointer",
              background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)",
              fontFamily: SANS, fontSize: 13, fontWeight: 700, color: ROSE_DEEP,
            }}
          >
            ดูเพิ่ม ({shown.length - visibleCount} งาน)
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Job card — the "ใบจอง" (booking slip): everything she needs is right
// here, same as BookingHistoryPage's card is the whole detail view for a
// customer. No separate tap-to-expand screen on either side.
// ──────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.123 (staff-app performance audit) — memoised. The audit found
// ZERO React.memo anywhere in the staff app: every `setBusyId` and every
// bookings snapshot re-rendered all ~60 cards and their nested motion.buttons
// at once. Its `onRespond`/`onAdvance` props are useCallback'd by the parent
// so this memo actually holds.
interface JobCardProps {
  job: Job;
  tab: TabKey;
  busy: boolean;
  onRespond: (id: string, action: "accept" | "decline") => void;
  onAdvance: (id: string, arrivalPhotoUrl?: string) => void;
}

const JobCard = React.memo(function JobCard({ job, tab, busy, onRespond, onAdvance }: JobCardProps) {
  const answered = job.therapistResponse;
  const accepted = answered === "accepted";
  // 🆕 28x.69/74 — identity + address + phone stay hidden until she has
  // accepted, for a job still awaiting her decision. A declined or
  // unanswered job must never leave a guest's contact details on her screen.
  //
  // 🆕 Round 28x.110 (founder: "ดูออเดอได้ทั้งหมด" — screenshot of the
  // Completed tab showing no address at all) — that masking rule was
  // silently hiding COMPLETED jobs too: most historical bookings were
  // dispatched via Telegram/admin, before the in-app accept/decline flow
  // existed, so `therapistResponse` was never set on them and `accepted`
  // reads false forever. The job already happened — there's no longer a
  // reason to mask it. Completed jobs are always revealed regardless of
  // whether they went through the in-app accept step.
  const revealed = accepted || tab === "completed";

  // 🆕 Round 28x.105 (founder: "เปลี่ยนชื่อลูกค้าเป็น Booking ID") — the
  // guest's real name used to show here once revealed; a reference code
  // identifies the same job without keeping a stranger's name sitting on
  // her phone screen after the fact. Same "SR-XXXXXXXX" format the
  // Telegram dispatch card already uses (formatBookingForTherapist).
  const refCode = `SR-${job.id.slice(0, 8).toUpperCase()}`;

  // 🆕 Round 28x.110 (founder: "ถ้ามีสมาชิกให้ใส่ตามเลเวล แต่ไม่บอกชื่อจริง
  // ลูกค้า") — if the guest is an enrolled member, show her tier alongside
  // the booking code instead of just the code — never the real name. A
  // therapist can't read a guest's /users/{uid} doc herself (owner/admin-
  // only in firestore.rules), so the tier comes from a callable that
  // checks she owns this job first and returns ONLY the tier (see
  // getJobGuestTier in functions/src/index.ts). Most bookings are admin-
  // booked with no linked account (`userId` unset) — those simply have no
  // tier to show, which is the common case, not an error.
  const [tier, setTier] = useState<MembershipTier | null>(null);
  useEffect(() => {
    if (!revealed || !job.userId) {
      setTier(null);
      return;
    }
    let cancelled = false;
    const fn = httpsCallable<{ bookingId: string }, { tier: MembershipTier | null }>(
      getFunctions(app, "asia-southeast1"),
      "getJobGuestTier",
    );
    fn({ bookingId: job.id })
      .then((res) => { if (!cancelled) setTier(res.data.tier); })
      .catch(() => { if (!cancelled) setTier(null); });
    return () => { cancelled = true; };
  }, [revealed, job.userId, job.id]);

  const mapHref =
    job.mapUrl ||
    (job.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}` : null);

  const stripeColor =
    tab === "completed" ? GREEN : tab === "cancelled" ? "var(--sr-line)" : ROSE;

  const statusPill = answered
    ? {
        label: accepted ? "รับแล้ว" : "ไม่รับ",
        bg: accepted ? `${GREEN}1A` : `${DANGER}1A`,
        fg: accepted ? GREEN_TEXT : DANGER,
      }
    : tab === "today"
    ? { label: "รอตอบรับ", bg: "var(--sr-panel-2)", fg: "var(--sr-muted)" }
    : null;

  return (
    <Box sx={{ borderRadius: "20px", background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", boxShadow: "var(--sr-card-shadow)", overflow: "hidden" }}>
      <Box sx={{ height: 3, background: stripeColor }} />

      <Box sx={{ p: "12px 14px" }}>
        {/* top row: guest identity (masked until accepted) + status pill */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: "50%", background: ROSE, p: "2px", flexShrink: 0, boxShadow: "0 4px 12px rgba(194, 24, 91, 0.20)" }}>
            <Avatar sx={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #F0A8BE, #E0708F)", color: "#fff" }}>
              <UserCircle size={21} weight="fill" />
            </Avatar>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: 14.5, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.2 }}>
                {revealed ? refCode : "ลูกค้าใหม่"}
              </Typography>
              {revealed && tier && (
                // 🆕 28x.129 — was MEMBERSHIP_COLORS, the light-console set:
                //   "แบล็ค VIP" rendered #1F2530 on the near-black dark panel
                //   and simply vanished. membershipChipSx() resolves through
                //   the theme-aware --sr-tier-* tokens instead.
                <Box sx={{ px: "7px", py: "1px", borderRadius: 999, ...membershipChipSx(tier) }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em", color: "inherit" }}>
                    {MEMBERSHIP_LABELS_TH[tier]}
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", mt: 0.15 }}>
              {job.date || "—"} · {job.time || "—"}
            </Typography>
          </Box>
          {statusPill && (
            <Box sx={{ px: "10px", py: "4px", borderRadius: 999, background: statusPill.bg, flexShrink: 0 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: statusPill.fg }}>
                {statusPill.label}
              </Typography>
            </Box>
          )}
        </Box>

        {/* service + date + location — the booking-slip body */}
        <Box sx={{ p: "10px 12px", borderRadius: "12px", background: "var(--sr-panel-2)", display: "flex", flexDirection: "column", gap: 0.5, mb: 1.25 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 13.5, fontWeight: 600, color: "var(--sr-ink)", lineHeight: 1.3 }}>
            {job.serviceName || "—"}
            {job.duration && (
              <Box component="span" sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 500, color: "var(--sr-muted)", ml: 1 }}>
                · {job.duration} นาที
              </Box>
            )}
          </Typography>
          {revealed ? (
            // 🆕 Round 28x.105 (founder: "ดูออเดอได้ทั้งหมด") — was
            // single-line ellipsis, silently cutting off longer addresses
            // (proven by her own screenshot). Now wraps in full instead of
            // truncating — the whole address is always visible.
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
              <MapPin size={12} color="var(--sr-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)", lineHeight: 1.35 }}>
                {job.locationName || job.address || "—"}
              </Typography>
            </Box>
          ) : tab === "today" ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MapPin size={12} color="var(--sr-dim)" />
              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-dim)" }}>
                ที่อยู่และเบอร์ลูกค้าจะแสดงหลังกดรับงาน
              </Typography>
            </Box>
          ) : null}
        </Box>

        {/* dispatch status stepper — only once she's accepted; before that,
            "accept/decline" is the only decision that matters. */}
        {tab === "today" && accepted && (
          <DispatchStepper
            jobId={job.id}
            state={job.dispatchState ?? "assigned"}
            busy={busy}
            onAdvance={(photoUrl) => onAdvance(job.id, photoUrl)}
          />
        )}

        {/* bottom row: total + actions */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Total
            </Typography>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {/* 🆕 Round 28x.136 (founder screenshot: staff card showed ฿1,730
                  on a cancelled job while admin correctly showed ฿0) — a
                  cancelled/no-show booking pays ฿0, so the card must not keep
                  displaying the original price. Same rule the admin drawer uses
                  (isCancelled ? 0 : total). Display-only; the money was already
                  ฿0 everywhere. */}
              {CANCELLED_STATUSES.has((job.status ?? "").toLowerCase())
                ? formatTHB(0)
                : typeof job.totalPrice === "number" ? formatTHB(job.totalPrice) : "—"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {tab === "today" && !answered && (
              <>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={() => onRespond(job.id, "accept")}
                  aria-label="รับงาน"
                  style={{ height: 38, padding: "0 16px", borderRadius: 999, background: ROSE, color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(194, 24, 91, 0.28)", display: "flex", alignItems: "center", gap: 6, opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <><CheckCircle size={14} weight="fill" /> รับงาน</>}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={() => onRespond(job.id, "decline")}
                  aria-label="ไม่รับ"
                  style={{ height: 38, padding: "0 14px", borderRadius: 999, background: "rgba(192,86,46,0.10)", color: DANGER, fontFamily: SANS, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: busy ? 0.7 : 1 }}
                >
                  <XCircle size={14} /> ไม่รับ
                </motion.button>
              </>
            )}
            {tab === "today" && accepted && (
              <>
                {mapHref && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => window.open(mapHref, "_blank", "noopener")}
                    aria-label="เปิดแผนที่"
                    style={{ height: 38, padding: "0 14px", borderRadius: 999, background: "rgba(224, 112, 143, 0.12)", color: ROSE_DEEP, fontFamily: SANS, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}
                  >
                    เปิดแผนที่
                  </motion.button>
                )}
                {job.phone && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { window.location.href = `tel:${job.phone}`; }}
                    aria-label="โทรหาลูกค้า"
                    style={{ height: 38, padding: "0 14px", borderRadius: 999, background: ROSE, color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 4px 12px rgba(194, 24, 91, 0.28)" }}
                  >
                    <Phone size={13} weight="fill" /> โทร
                  </motion.button>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

// ──────────────────────────────────────────────────────────────────────
// Dispatch stepper — the practitioner's own version of AdminTonightPage's
// FLOW buttons: current stage as a pill, one button to move to the next.
// ──────────────────────────────────────────────────────────────────────
const DispatchStepper: React.FC<{
  jobId: string;
  state: DispatchState;
  busy: boolean;
  onAdvance: (arrivalPhotoUrl?: string) => void;
}> = ({ jobId, state, busy, onAdvance }) => {
  const step = dispatchStep(state);
  const done = state === "done";
  // 🆕 Round 28x.124 — the "ถึงแล้ว" step is gated on a meeting-point photo.
  //   `capture="environment"` opens the rear camera straight away on a phone
  //   instead of the photo library: she is standing at the spot, the point is
  //   to shoot it now, not attach an older picture.
  const needsPhoto = step.next === "arrived";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const onPickPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { downscaleImage } = await import("@/pages/admin/therapistFormKit");
      const blob = await downscaleImage(file);
      const storage = getStorage(app);
      const path = `jobArrivals/${jobId}/${Date.now()}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(snap.ref);
      onAdvance(url);
    } catch (err) {
      console.error("[jobs] arrival photo upload failed", err);
      toast.error("ส่งรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const busyNow = busy || uploading;

  return (
    <Box
      sx={{
        p: "10px 12px", borderRadius: "12px", mb: 1.5,
        background: done ? `${GREEN}14` : "rgba(224, 112, 143, 0.08)",
        border: `1px solid ${done ? `${GREEN}33` : "rgba(224, 112, 143, 0.20)"}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: done ? GREEN_TEXT : ROSE_DEEP }}>
          {step.label}
        </Typography>
        {step.btn && (
          <>
            {needsPhoto && (
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => void onPickPhoto(e.target.files)}
              />
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busyNow}
              onClick={() => (needsPhoto ? fileRef.current?.click() : onAdvance())}
              aria-label={needsPhoto ? "ถ่ายรูปจุดรอพบแล้วแจ้งถึงที่หมาย" : step.btn}
              style={{ height: 32, padding: "0 14px", borderRadius: 999, background: ROSE, color: "#fff", fontFamily: SANS, fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: busyNow ? 0.7 : 1, flexShrink: 0 }}
            >
              {busyNow ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : needsPhoto ? "📷 ถึงแล้ว · ถ่ายรูป" : step.btn}
            </motion.button>
          </>
        )}
      </Box>
      {needsPhoto && (
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-muted)", mt: 0.75, lineHeight: 1.5 }}>
          ถ่ายรูปจุดที่รอลูกค้าเพื่อส่งให้แอดมิน — ไม่ต้องโทรแจ้ง
        </Typography>
      )}
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
const EmptySlate: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <Box sx={{ mt: 4, px: 2, py: 6, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.5 }}>
    <Box sx={{ width: 64, height: 64, borderRadius: "50%", background: ROSE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(194, 24, 91, 0.28)", mb: 0.5 }}>
      {icon}
    </Box>
    <Typography sx={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.01em" }}>
      {title}
    </Typography>
    <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "var(--sr-muted)", lineHeight: 1.6, maxWidth: 260 }}>
      {body}
    </Typography>
  </Box>
);

const LoadingShimmer: React.FC = () => (
  <>
    {[0, 1, 2].map((i) => (
      <Box key={i} sx={{ borderRadius: "20px", background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", overflow: "hidden", opacity: 1 - i * 0.2 }}>
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

export default TherapistJobsPage;
