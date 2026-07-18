// src/pages/admin/AdminTonightPage.tsx
//
// 🆕 Round 28s232 (founder: "หน้าแอดมินให้เหมือนในวงการ") — TONIGHT OPS BOARD.
//   The single screen to run the night's dispatch. Lists every accepted job
//   (status === "confirmed", not yet done/cancelled), sorted by appointment
//   time, and walks each one through the dispatch lifecycle with one tap:
//
//     รับงาน → 🚗 ส่งหมอนวด(enroute) → 📍 ถึงแล้ว(arrived)
//            → ▶️ เริ่มนวด(in_session) → ✅ จบงาน(done → status:completed)
//
//   Each transition stamps a server timestamp. When a session starts we also
//   stamp `expectedEndAt` (start + duration) — the board then highlights an
//   OVERDUE job in red ("เกินเวลา · เช็กความปลอดภัย"), the foundation for the
//   Phase-3 therapist-safety alerts. All writes are additive `dispatchState`/
//   timestamp fields; the core `status` enum (used by Earnings/availability)
//   is only touched on the final "จบงาน" → status:"completed".

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Phone, MapPin, ArrowLeft } from "phosphor-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { db } from "@/lib/firebase";
import { nowBKK } from "@/utils/time";
// 🆕 Round 28s235 — bring the flagship ops page onto the shared Ocean Study
//   tokens. It predates adminTheme.ts (built in 28s232, before the theme
//   file existed) and still had its own hardcoded light-card palette.
import { adminColor, adminFont } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

// ── dispatch lifecycle ────────────────────────────────────────────────
type DispatchState =
  | "assigned"
  | "enroute"
  | "arrived"
  | "in_session"
  | "done";

// 🆕 Round 28r45 — bilingual dispatch chips + buttons (English primary,
//   Thai after "·"). Same operator-scan-language reasoning as Dashboard
//   (28r35): English reads faster mid-dispatch, Thai stays for
//   unambiguity. Filter labels are the only English-ONLY zone (r43).
const FLOW: {
  key: DispatchState;
  label: string;
  next: DispatchState | null;
  btn: string | null;
  tone: string;
}[] = [
  { key: "assigned",   label: "Assigned · รับงานแล้ว",   next: "enroute",    btn: "🚗 Send · ส่งหมอนวด",    tone: adminColor.dim },
  { key: "enroute",    label: "En route · กำลังเดินทาง", next: "arrived",    btn: "📍 Arrived · ถึงแล้ว",   tone: adminColor.blue },
  { key: "arrived",    label: "Arrived · ถึงแล้ว",       next: "in_session", btn: "▶️ Start · เริ่มนวด",    tone: adminColor.amber },
  { key: "in_session", label: "In session · กำลังนวด",   next: "done",       btn: "✅ Complete · จบงาน",    tone: adminColor.green },
  { key: "done",       label: "Done · เสร็จแล้ว",        next: null,         btn: null,                     tone: adminColor.green },
];
const STEP = (s?: string) => FLOW.find((f) => f.key === ((s as DispatchState) || "assigned")) ?? FLOW[0];

interface Job {
  id: string;
  userName?: string;
  contactName?: string;
  customerName?: string;
  phone?: string;
  therapistName?: string;
  serviceName?: string;
  duration?: number;
  date?: string;
  time?: string;
  startAt?: Timestamp;
  address?: string;
  locationName?: string;
  meetingPoint?: string;
  mapUrl?: string;
  totalPrice?: number;
  status: string;
  dispatchState?: DispatchState;
  sessionStartAt?: Timestamp;
  expectedEndAt?: Timestamp;
  needsAdminReview?: boolean;
  reviewReason?: string;
  // 🆕 28x.64 — the practitioner's own answer from the Telegram job DM.
  //   Deliberately separate from dispatchState: this records whether she
  //   agreed to take the job, not where she is in the session lifecycle.
  therapistResponse?: "accepted" | "declined";
  therapistRespondedAt?: Timestamp;
  /** Set only when the job DM actually reached her — see onBookingCreate. */
  dispatchDmSentAt?: Timestamp;
}

const nameOf = (b: Job) => b.userName || b.contactName || b.customerName || "—";
const OVERDUE_GRACE_MIN = 20;

const AdminTonightPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // 1-min ticker for overdue recompute
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "bookings"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Job))
          // Active pipeline = accepted by admin, not finished/cancelled.
          .filter((b) => b.status === "confirmed");
        list.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        setJobs(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // tick every minute so "เกินเวลา" recomputes without a refresh
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const advance = async (b: Job) => {
    const step = STEP(b.dispatchState);
    if (!step.next) return;
    setBusy(b.id);
    try {
      const patch: Record<string, unknown> = {
        dispatchState: step.next,
        [`${step.next}At`]: serverTimestamp(),
      };
      if (step.next === "in_session") {
        const mins = b.duration ?? 60;
        patch.expectedEndAt = Timestamp.fromDate(
          nowBKK().add(mins, "minute").toDate()
        );
      }
      if (step.next === "done") {
        patch.status = "completed";
        patch.sessionEndAt = serverTimestamp();
      }
      await updateDoc(doc(db, "bookings", b.id), patch);
      if (step.next === "done") void logAdminAction("booking.complete", { bookingId: b.id });
    } catch (e) {
      console.error("[tonight] advance failed", e);
      window.alert("อัปเดตไม่สำเร็จ ลองใหม่");
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c = { total: jobs.length, enroute: 0, in_session: 0, overdue: 0 };
    const now = nowBKK();
    for (const b of jobs) {
      const st = (b.dispatchState as DispatchState) || "assigned";
      if (st === "enroute" || st === "arrived") c.enroute++;
      if (st === "in_session") {
        c.in_session++;
        const exp = b.expectedEndAt?.toDate();
        if (exp && now.isAfter(dayjs(exp).add(OVERDUE_GRACE_MIN, "minute"))) c.overdue++;
      }
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, tick]);

  return (
    <Box sx={{ p: 2, maxWidth: 760, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Button
          onClick={() => navigate("/admin/dashboard")}
          startIcon={<ArrowLeft />}
          size="small"
          sx={{ color: adminColor.accent, textTransform: "none", fontWeight: 700 }}
        >
          Dashboard
        </Button>
      </Box>

      {/* 🆕 Round 28r45 — bilingual page header (English primary + tiny
          Thai subtitle), matches Dashboard/Bookings pattern (28r35/r40). */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 600, fontSize: 22, color: adminColor.text, lineHeight: 1 }}>
          🌙 Tonight · Control Room
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
          คืนนี้ · ห้องคุมงาน
        </Typography>
      </Box>

      {/* live counters — 28r45 bilingual chips */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Chip label={`Tonight ${counts.total} · งาน`} sx={{ fontWeight: 700, background: adminColor.panel, color: adminColor.text, border: `1px solid ${adminColor.line}` }} />
        <Chip label={`En route ${counts.enroute} · กำลังไป/ถึง`} sx={{ fontWeight: 700, background: `${adminColor.blue}1F`, color: adminColor.blue }} />
        <Chip label={`In session ${counts.in_session} · กำลังนวด`} sx={{ fontWeight: 700, background: `${adminColor.green}1F`, color: adminColor.green }} />
        {counts.overdue > 0 && (
          <Chip label={`⚠️ Overdue ${counts.overdue} · เกินเวลา`} sx={{ fontWeight: 800, background: `${adminColor.red}22`, color: adminColor.red }} />
        )}
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <CircularProgress sx={{ color: adminColor.accent }} />
        </Box>
      ) : jobs.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 6, color: adminColor.muted, fontFamily: SANS }}>
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>No confirmed jobs in queue</Box>
          <Box sx={{ fontSize: 12.5, color: adminColor.dim }}>
            ยังไม่มีงานที่ยืนยันแล้ว — งานที่กด Confirm จะมาโผล่ที่นี่
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {jobs.map((b) => {
            const step = STEP(b.dispatchState);
            const inSession = step.key === "in_session";
            const exp = b.expectedEndAt?.toDate();
            const overdue =
              inSession && exp && nowBKK().isAfter(dayjs(exp).add(OVERDUE_GRACE_MIN, "minute"));
            const mapUrl =
              b.mapUrl ||
              (b.locationName || b.address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    b.locationName || b.address || ""
                  )}`
                : "");
            const isTerminal = step.key === "done";
            return (
              <Box
                key={b.id}
                sx={{
                  // 🆕 Round 28r45 — light polish: bump radius (16→18), soft
                  //   ink-tinted depth shadow (matches Bookings/Earnings
                  //   28r44/28s245 lesson: don't leave old dark-mode
                  //   rgba(0,0,0,X) shadows on the light theme), + hover
                  //   lift on active (non-done) cards so the affordance
                  //   reads.
                  borderRadius: "18px",
                  border: overdue ? `1.5px solid ${adminColor.red}` : `1px solid ${adminColor.line}`,
                  background: overdue ? `${adminColor.red}0F` : adminColor.panel,
                  p: 1.5,
                  borderLeft: `4px solid ${step.tone}`,
                  boxShadow: "0 2px 10px rgba(31,41,51,0.04)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
                  ...(!isTerminal && {
                    "&:hover": {
                      transform: "translateY(-1px)",
                      background: overdue ? `${adminColor.red}14` : `${step.tone}0A`,
                      boxShadow: `0 4px 14px rgba(31,41,51,0.06), 0 2px 6px ${step.tone}22`,
                    },
                  }),
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: 15, color: adminColor.text }}>
                    {b.time || "—"} · {b.therapistName || "—"}
                  </Typography>
                  <Chip size="small" label={step.label} sx={{ fontWeight: 700, color: step.tone, background: `${step.tone}22` }} />
                </Box>

                <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>
                  {b.serviceName || "—"} · {b.duration ?? "?"} min
                  {typeof b.totalPrice === "number" ? ` · ฿${b.totalPrice.toLocaleString()}` : ""}
                </Typography>

                {/* customer + phone */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mt: 0.5 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>👤 {nameOf(b)}</Typography>
                  {b.phone && (
                    <Box
                      component="a"
                      href={`tel:${b.phone}`}
                      sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, color: adminColor.green, fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: SANS }}
                    >
                      <Phone size={13} weight="fill" /> {b.phone}
                    </Box>
                  )}
                </Box>

                {/* address + map */}
                {(b.locationName || b.address) && (
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mt: 0.4 }}>
                    <MapPin size={14} color={adminColor.dim} style={{ flexShrink: 0, marginTop: 2 }} />
                    <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, lineHeight: 1.4 }}>
                      {b.locationName || b.address}
                      {b.meetingPoint ? ` · พบ: ${b.meetingPoint}` : ""}
                      {mapUrl && (
                        <>
                          {"  "}
                          <Box component="a" href={mapUrl} target="_blank" rel="noopener noreferrer" sx={{ color: adminColor.accent, fontWeight: 700, textDecoration: "none" }}>
                            Map · แผนที่
                          </Box>
                        </>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* 🆕 28x.64 — did the practitioner answer the dispatch DM?
                    Shown above the review banner because on a decline both
                    appear, and "she said no" is the actionable half. */}
                {b.therapistResponse === "accepted" && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.green, mt: 0.5 }}>
                    ✅ หมอนวดกดรับงานแล้ว{b.therapistRespondedAt ? ` · ${dayjs(b.therapistRespondedAt.toDate()).format("HH:mm")}` : ""}
                  </Typography>
                )}
                {b.therapistResponse === "declined" && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: adminColor.red, mt: 0.5 }}>
                    ❌ หมอนวดกดไม่รับงาน — ต้องจ่ายให้คนอื่น{b.therapistRespondedAt ? ` · ${dayjs(b.therapistRespondedAt.toDate()).format("HH:mm")}` : ""}
                  </Typography>
                )}
                {/* 🆕 28x.64 — assigned to someone on the pilot, no answer yet. */}
                {!b.therapistResponse && b.dispatchDmSentAt && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim, mt: 0.5 }}>
                    ⏳ ส่งแจ้งงานแล้ว · ยังไม่กดตอบรับ
                  </Typography>
                )}

                {b.needsAdminReview && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.red, mt: 0.5 }}>
                    ⚠️ Review first · เช็คก่อน — หมอนวดอาจไม่ว่าง{b.reviewReason ? ` · ${b.reviewReason}` : ""}
                  </Typography>
                )}

                {/* session timing / overdue — 28r45 bilingual */}
                {inSession && exp && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, mt: 0.5, color: overdue ? adminColor.red : adminColor.muted }}>
                    {overdue
                      ? `⚠️ Overdue · เกินเวลา (expected ${dayjs(exp).format("HH:mm")}) — เช็กความปลอดภัยหมอนวด`
                      : `⏱️ Ends ${dayjs(exp).format("HH:mm")} · คาดจบ`}
                  </Typography>
                )}

                {/* advance button */}
                {step.next && step.btn && (
                  <Button
                    onClick={() => void advance(b)}
                    disabled={busy === b.id}
                    fullWidth
                    sx={{
                      mt: 1, borderRadius: 2, textTransform: "none", fontWeight: 800,
                      background: step.tone, color: "#fff",
                      "&:hover": { background: step.tone, filter: "brightness(0.93)" },
                    }}
                  >
                    {step.btn}
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default AdminTonightPage;
