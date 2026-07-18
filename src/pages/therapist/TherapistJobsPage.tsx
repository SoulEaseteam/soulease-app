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

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "react-toastify";
import {
  MapPin,
  Phone,
  Clock,
  CaretLeft,
  CheckCircle,
  XCircle,
} from "phosphor-react";

import { app, auth, db } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";
const ROSE_DEEP = "#C96F89";
const GREEN = "#16A34A";
const DANGER = "#C0562E";

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
  status?: string;
  totalPrice?: number;
  therapistResponse?: "accepted" | "declined";
}

const toMs = (v: unknown): number => {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v).getTime();
    return isNaN(d) ? 0 : d;
  }
  return 0;
};

const TherapistJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setJobs([]);
      return;
    }
    // No orderBy: combining it with the where() would need a composite index,
    // and a missing index fails the whole listener rather than degrading.
    const q = query(collection(db, "bookings"), where("therapistUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Job[] = snap.docs.map((d) => {
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
            status: b.status as string | undefined,
            totalPrice: b.totalPrice as number | undefined,
            therapistResponse: b.therapistResponse as Job["therapistResponse"],
          };
        });
        rows.sort((a, b) => b.startAtMs - a.startAtMs);
        setJobs(rows);
      },
      (err) => {
        console.warn("[jobs] listener failed", err.code);
        setJobs([]);
      },
    );
    return () => unsub();
  }, []);

  // 🆕 28x.79 (founder: "Today's Bookings, Completed, Cancelled แยกตาม
  //   หมวดหมู่งาน คล้ายๆ หน้า booking/history ของเว็บ") — three tabs, same
  //   shape as the customer booking/history page's Upcoming/Completed/
  //   Cancelled switcher, using the SAME three labels already on the stat
  //   strip so tile and tab agree.
  //
  //   Bucketed by STATUS, not by calendar day: the old "today" tile counted
  //   only jobs starting within today's date bounds, so a confirmed job for
  //   tomorrow — or a past-dated one an admin forgot to close out — belonged
  //   to neither Today nor Completed nor Cancelled and fell out of every
  //   view. "Today" here means "not yet resolved", which for this same-night
  //   business is virtually always today anyway, and nothing disappears.
  const DONE_STATUSES = new Set(["completed", "done"]);
  const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "no_show", "no-show"]);
  const bucketOf = (j: Job): "today" | "completed" | "cancelled" => {
    const s = j.status ?? "";
    if (DONE_STATUSES.has(s)) return "completed";
    if (CANCELLED_STATUSES.has(s)) return "cancelled";
    return "today";
  };

  const [tab, setTab] = useState<"today" | "completed" | "cancelled">("today");

  const buckets = useMemo(() => {
    const all = jobs ?? [];
    return {
      today: all.filter((j) => bucketOf(j) === "today"),
      completed: all.filter((j) => bucketOf(j) === "completed"),
      cancelled: all.filter((j) => bucketOf(j) === "cancelled"),
    };
  }, [jobs]);

  const stats = {
    today: buckets.today.length,
    completed: buckets.completed.length,
    cancelled: buckets.cancelled.length,
  };

  const shown = buckets[tab];

  const respond = async (jobId: string, action: "accept" | "decline") => {
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
  };

  const JobCard: React.FC<{ job: Job; live: boolean }> = ({ job, live }) => {
    const answered = job.therapistResponse;
    const mapHref =
      job.mapUrl ||
      (job.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`
        : null);

    return (
      <Box
        sx={{
          p: 2,
          borderRadius: "18px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-muted)" }}>
              {job.date || "—"} · {job.time || "—"}
            </Typography>
            <Typography sx={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: "var(--sr-ink)", mt: 0.25 }}>
              {job.serviceName || "—"}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", mt: 0.25 }}>
              <Clock size={12} style={{ verticalAlign: -1 }} /> {job.duration ?? "?"} นาที
              {typeof job.totalPrice === "number" && ` · ฿${Math.round(job.totalPrice).toLocaleString()}`}
            </Typography>
          </Box>

          {answered && (
            <Box
              sx={{
                alignSelf: "flex-start",
                px: 1, py: "3px", borderRadius: 999, whiteSpace: "nowrap",
                background: answered === "accepted" ? `${GREEN}1A` : `${DANGER}1A`,
                border: `1px solid ${answered === "accepted" ? GREEN : DANGER}55`,
              }}
            >
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: answered === "accepted" ? GREEN : DANGER }}>
                {answered === "accepted" ? "รับแล้ว" : "ไม่รับ"}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Address + phone are shown only once she has taken the job — the same
            rule the Telegram card follows (28x.69). A job she declined, or has
            not answered, must not leave a guest's address on her screen. */}
        {answered === "accepted" ? (
          <Box sx={{ mt: 1.25, display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "var(--sr-body)" }}>
              <MapPin size={13} style={{ verticalAlign: -2 }} /> {job.locationName || job.address || "—"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {mapHref && (
                <Button
                  size="small"
                  href={mapHref}
                  target="_blank"
                  rel="noopener"
                  sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: 999, color: ROSE_DEEP, border: `1px solid ${ROSE}55` }}
                >
                  เปิดแผนที่
                </Button>
              )}
              {job.phone && (
                <Button
                  size="small"
                  href={`tel:${job.phone}`}
                  sx={{ textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: 999, color: ROSE_DEEP, border: `1px solid ${ROSE}55` }}
                >
                  <Phone size={13} style={{ marginRight: 4 }} /> โทรหาลูกค้า
                </Button>
              )}
            </Box>
          </Box>
        ) : live ? (
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-dim)", mt: 1 }}>
            <MapPin size={12} style={{ verticalAlign: -1 }} /> ที่อยู่และเบอร์ลูกค้าจะแสดงหลังกดรับงาน
          </Typography>
        ) : null}

        {live && !answered && (
          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
            <Button
              fullWidth
              disabled={busyId === job.id}
              onClick={() => void respond(job.id, "accept")}
              sx={{
                textTransform: "none", fontWeight: 800, fontSize: 13.5, borderRadius: 999, py: 0.9,
                background: `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`, color: "#fff",
                "&:hover": { background: ROSE_DEEP },
              }}
            >
              {busyId === job.id ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <><CheckCircle size={16} weight="fill" style={{ marginRight: 6 }} /> รับงาน</>}
            </Button>
            <Button
              disabled={busyId === job.id}
              onClick={() => void respond(job.id, "decline")}
              sx={{
                textTransform: "none", fontWeight: 700, fontSize: 13.5, borderRadius: 999, px: 2.5,
                color: DANGER, border: `1px solid ${DANGER}55`,
              }}
            >
              <XCircle size={16} style={{ marginRight: 4 }} /> ไม่รับ
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", px: 2, pt: 2, pb: 12 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Button
          onClick={() => navigate("/therapist/profile")}
          sx={{ minWidth: 0, p: 0.5, color: "var(--sr-muted)" }}
        >
          <CaretLeft size={20} />
        </Button>
        <Typography sx={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: "var(--sr-ink)" }}>
          งานของฉัน
        </Typography>
      </Box>

      {/* 🆕 28x.79 — the three tiles ARE the tab switcher now, mirroring the
          customer booking/history page's Upcoming/Completed/Cancelled pills
          with the same three labels the founder already had on this strip.
          One row instead of a passive stat strip + a separate pill bar below
          it — same behaviour, less chrome, which fits StaffLayout's brief. */}
      {jobs !== null && (
        <Box
          role="tablist"
          aria-label="Job status"
          sx={{
            display: "flex",
            mb: 2.5,
            borderRadius: "18px",
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            boxShadow: "var(--sr-card-shadow)",
            overflow: "hidden",
          }}
        >
          {(
            [
              { key: "today", value: stats.today, label: "วันนี้ · Today", color: ROSE_DEEP },
              { key: "completed", value: stats.completed, label: "เสร็จ · Done", color: "#22C55E" },
              { key: "cancelled", value: stats.cancelled, label: "ยกเลิก · Cancelled", color: "#F87171" },
            ] as const
          ).map((s, i) => {
            const active = tab === s.key;
            return (
              <Box
                key={s.key}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(s.key)}
                sx={{
                  flex: 1,
                  textAlign: "center",
                  py: 1.75,
                  border: "none",
                  cursor: "pointer",
                  background: active ? "var(--sr-panel-2)" : "transparent",
                  borderRight: i < 2 ? "1px solid var(--sr-hairline)" : "none",
                  borderBottom: active ? `3px solid ${s.color}` : "3px solid transparent",
                  transition: "background 120ms ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Typography sx={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10.5,
                    color: active ? "var(--sr-ink)" : "var(--sr-muted)",
                    fontWeight: active ? 800 : 600,
                    mt: 0.5,
                    letterSpacing: "0.02em",
                  }}
                >
                  {s.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {jobs === null ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <CircularProgress sx={{ color: ROSE }} />
        </Box>
      ) : jobs.length === 0 ? (
        <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-muted)", textAlign: "center", mt: 6 }}>
          ยังไม่มีงานที่จ่ายให้คุณค่ะ
        </Typography>
      ) : shown.length === 0 ? (
        <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-muted)", textAlign: "center", mt: 6 }}>
          {tab === "today" ? "ไม่มีงานวันนี้" : tab === "completed" ? "ยังไม่มีงานที่เสร็จ" : "ไม่มีงานที่ยกเลิก"}
        </Typography>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {shown.slice(0, 60).map((j) => (
            <JobCard key={j.id} job={j} live={tab === "today"} />
          ))}
        </motion.div>
      )}
    </Box>
  );
};

export default TherapistJobsPage;
