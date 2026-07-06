// src/pages/admin/AdminBookingListPage.tsx
//
// 🆕 Round 28c18 (founder 2026-05-06) — mobile-first card layout.
//   Previous: table-only, chip-click status change, broken on phones.
//   Now: responsive cards, prominent Confirm/Complete/Cancel CTAs,
//   inline note editing, payment toggle, batch export.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  InputBase,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  IconButton,
  Divider,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fmtBKK } from "@/utils/time";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
import { ExportToExcel } from "@/utils/exportTools";
import { logAdminAction } from "@/utils/auditLog";
import {
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Phone,
  CurrencyCircleDollar,
  NotePencil,
  Export,
  CaretDown,
  CaretUp,
  ArrowClockwise,
  X,
} from "phosphor-react";

// ── types ─────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  userName?: string;
  // 🆕 Round 28s230 — customer flow writes `contactName`, admin-add writes
  //   `customerName`; the UI used to read only `userName` (always blank), so
  //   the operator never saw who to call. `nameOf()` normalises all three.
  contactName?: string;
  customerName?: string;
  phone?: string;
  holdState?: string;
  needsAdminReview?: boolean;
  reviewReason?: string;
  userId?: string;
  therapistId?: string;
  therapistName: string;
  serviceId?: string;
  serviceName: string;
  duration?: number;
  date?: string;
  time?: string;
  startAt?: Timestamp;
  locationName?: string;
  address?: string;
  placeDetail?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  total?: number;
  createdAt: Timestamp;
  status: string;
  paid: boolean;
  adminNote?: string;
  reviewed?: boolean;
}

type TabKey = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_CFG: Record<string, {
  label: string;
  stripe: string;
  badge: { bg: string; fg: string };
}> = {
  pending:   { label: "Pending",   stripe: "#B4000A", badge: { bg: "rgba(15, 23, 42, 0.10)",  fg: "#B4000A"             } },
  confirmed: { label: "Confirmed", stripe: "#16a34a", badge: { bg: "rgba(22,163,74,0.12)", fg: "#16a34a"             } },
  completed: { label: "Completed", stripe: "rgba(15, 23, 42,0.12)",                   badge: { bg: "rgba(15, 23, 42,0.08)",  fg: "rgba(15, 23, 42,0.65)" } },
  cancelled: { label: "Cancelled", stripe: "rgba(0,0,0,0.08)",                      badge: { bg: "rgba(0,0,0,0.06)",     fg: "rgba(15, 23, 42,0.45)" } },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

// 🆕 Round 28s230 — canonical customer name across the two write paths.
const nameOf = (b: Booking): string =>
  b.userName || b.contactName || b.customerName || "—";

const SANS  = '"Inter", system-ui, sans-serif';
// 🆕 Round 28s217 — Aligned heading stack with project palette
//   refresh (Round 28s150-156, CLAUDE.md §🔤).
const SERIF =
  '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
const AdminBookingListPage: React.FC = () => {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<TabKey>("pending");
  const [search,      setSearch]      = useState("");
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [detailId,    setDetailId]    = useState<string | null>(null);

  // ── realtime feed ──────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // ── counts per bucket ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const b of bookings) {
      if (b.status in c) c[b.status as TabKey]++;
    }
    return c;
  }, [bookings]);

  // ── filtered list ─────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter((b) => {
      const matchTab = tab === "all" || b.status === tab;
      const matchQ   = !q || [nameOf(b), b.phone, b.therapistName, b.serviceName, b.address, b.locationName, b.id]
        .join(" ").toLowerCase().includes(q);
      return matchTab && matchQ;
    });
  }, [bookings, tab, search]);

  // ── write helpers ─────────────────────────────────────────────────
  const setStatus = async (id: string, status: string) => {
    try {
      // 🆕 Round 28s230 (FIX D) — confirming an order also settles the 10-min
      //   hold so releaseExpiredHolds can't later stamp it "expired" (which
      //   would tell the customer their accepted booking lapsed).
      const patch: Record<string, unknown> =
        status === "confirmed"
          ? { status, holdState: "confirmed", holdExpiresAt: null }
          : { status };
      await updateDoc(doc(db, "bookings", id), patch);
      const auditAction =
        status === "confirmed" ? "booking.confirm" :
        status === "cancelled" ? "booking.cancel" :
        status === "completed" ? "booking.complete" : null;
      if (auditAction) void logAdminAction(auditAction, { bookingId: id });
      setToast({ msg: `Booking ${status}`, ok: true });
    } catch {
      setToast({ msg: "Update failed", ok: false });
    }
  };

  const togglePaid = async (id: string, cur: boolean) => {
    try {
      await updateDoc(doc(db, "bookings", id), { paid: !cur });
      setToast({ msg: !cur ? "Marked as paid" : "Marked unpaid", ok: true });
    } catch {
      setToast({ msg: "Update failed", ok: false });
    }
  };

  const saveNote = async (id: string, note: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { adminNote: note });
      setToast({ msg: "Note saved", ok: true });
    } catch {
      setToast({ msg: "Save failed", ok: false });
    }
  };

  const exportXLSX = async () => {
    const rows = visible.map((b) => ({
      ID:           b.id,
      User:         nameOf(b),
      Phone:        b.phone || "-",
      Therapist:    b.therapistName,
      Service:      getServiceLabel(b.serviceId, b.serviceName),
      Date:         b.date || (b.startAt ? fmtBKK(b.startAt.toDate(), "YYYY-MM-DD") : "-"),
      Time:         b.time || "-",
      Address:      b.locationName || b.address || "",
      Status:       b.status,
      Payment:      b.paid ? "Paid" : "Unpaid",
      ServicePrice: b.servicePrice || 0,
      TaxiFee:      b.taxiFee     || 0,
      Total:        b.totalPrice  || b.total || 0,
      Note:         b.adminNote   || "",
    }));
    await ExportToExcel(rows, `bookings-${Date.now()}.xlsx`);
  };

  const detailBooking = bookings.find((b) => b.id === detailId) ?? null;

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", background: "#F4F6F5", pb: 10 }}>

      {/* ── header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "#1A2B2E",
          px: { xs: 2, md: 3 },
          pt: 3,
          pb: 2.5,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 22, md: 26 }, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Bookings
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.45)", mt: 0.3 }}>
            {counts.pending > 0 ? `${counts.pending} pending action${counts.pending > 1 ? "s" : ""}` : "All up to date"}
          </Typography>
        </Box>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={exportXLSX}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 36, padding: "0 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Export size={15} /> Export
        </motion.button>
      </Box>

      {/* ── search ─────────────────────────────────────────────────── */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2 }}>
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 1,
            px: 1.5, height: 42,
            borderRadius: "12px",
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
          }}
        >
          <MagnifyingGlass size={16} color="rgba(15, 23, 42,0.40)" />
          <InputBase
            placeholder="Search customer, therapist, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "#1a0805" }}
          />
        </Box>
      </Box>

      {/* ── filter tabs ────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          gap: 0.75,
          px: { xs: 2, md: 3 },
          pt: 1.5,
          overflowX: "auto",
          pb: 0.5,
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <motion.button
              key={t.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t.key)}
              style={{
                flexShrink: 0,
                height: 32,
                padding: "0 12px",
                borderRadius: 999,
                background: active ? "#B4000A" : "#fff",
                border: active ? "none" : "1px solid rgba(15,23,42,0.10)",
                color: active ? "#fff" : "rgba(15, 23, 42,0.60)",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: active ? "0 4px 12px rgba(15, 23, 42, 0.25)" : "none",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <Box
                  component="span"
                  sx={{
                    minWidth: 18, height: 18, borderRadius: 999, px: "5px",
                    background: active ? "rgba(255,255,255,0.25)" : "rgba(15, 23, 42, 0.10)",
                    color: active ? "#fff" : "#B4000A",
                    fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {counts[t.key]}
                </Box>
              )}
            </motion.button>
          );
        })}
      </Box>

      {/* ── card list ─────────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        {loading ? (
          <Box sx={{ gridColumn: "1/-1", textAlign: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#B4000A" }} />
          </Box>
        ) : visible.length === 0 ? (
          <Box
            sx={{
              gridColumn: "1/-1", textAlign: "center", py: 8,
              color: "rgba(15, 23, 42,0.40)", fontFamily: SANS, fontSize: 14,
            }}
          >
            No bookings found
          </Box>
        ) : (
          <AnimatePresence mode="popLayout">
            {visible.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
              >
                <BookingCard
                  booking={b}
                  onConfirm={() => setStatus(b.id, "confirmed")}
                  onComplete={() => setStatus(b.id, "completed")}
                  onCancel={() => setStatus(b.id, "cancelled")}
                  onTogglePaid={() => togglePaid(b.id, b.paid)}
                  onSaveNote={(note) => saveNote(b.id, note)}
                  onViewDetail={() => setDetailId(b.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* ── detail drawer ─────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!detailId}
        onClose={() => setDetailId(null)}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 420 },
            background: "#F4F6F5",
            p: 0,
          },
        }}
      >
        {detailBooking && (
          <DetailPanel
            booking={detailBooking}
            onClose={() => setDetailId(null)}
            onConfirm={() => { void setStatus(detailBooking.id, "confirmed"); }}
            onComplete={() => { void setStatus(detailBooking.id, "completed"); }}
            onCancel={() => { void setStatus(detailBooking.id, "cancelled"); }}
            onTogglePaid={() => { void togglePaid(detailBooking.id, detailBooking.paid); }}
            onSaveNote={(note) => { void saveNote(detailBooking.id, note); }}
          />
        )}
      </Drawer>

      {/* ── toast ────────────────────────────────────────────────────*/}
      <Snackbar
        open={!!toast}
        autoHideDuration={2200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast?.ok ? "success" : "error"}
          variant="filled"
          sx={{ borderRadius: "12px", fontFamily: SANS, fontSize: 13 }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Booking card
// ──────────────────────────────────────────────────────────────────────
const BookingCard: React.FC<{
  booking: Booking;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onTogglePaid: () => void;
  onSaveNote: (note: string) => void;
  onViewDetail: () => void;
}> = ({ booking: b, onConfirm, onComplete, onCancel, onTogglePaid, onSaveNote, onViewDetail }) => {
  const [expanded, setExpanded] = useState(false);
  const [note,     setNote]     = useState(b.adminNote ?? "");

  const cfg        = STATUS_CFG[b.status] ?? STATUS_CFG.pending;
  const isCancelled = b.status === "cancelled";
  const total      = isCancelled ? 0 : (b.totalPrice ?? b.total ?? 0);
  const isPending   = b.status === "pending";
  const isConfirmed = b.status === "confirmed";

  const dateLabel = b.startAt?.toDate
    ? fmtBKK(b.startAt.toDate(), "ddd D MMM · HH:mm")
    : b.date && b.time
    ? `${fmtBKK(b.date, "ddd D MMM")} · ${b.time}`
    : b.date
    ? fmtBKK(b.date, "ddd D MMM")
    : "—";

  return (
    <Box
      sx={{
        borderRadius: "18px",
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
        overflow: "hidden",
      }}
    >
      {/* accent stripe */}
      <Box sx={{ height: 3, background: cfg.stripe }} />

      <Box sx={{ p: "14px 16px 12px" }}>
        {/* row 1: therapist + status badge */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#1a0805", lineHeight: 1.2 }}>
            {b.therapistName}
          </Typography>
          <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: cfg.badge.bg, flexShrink: 0 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.badge.fg }}>
              {cfg.label}
            </Typography>
          </Box>
        </Box>

        {/* service */}
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(15, 23, 42,0.70)", mb: 0.5 }}>
          {getServiceLabel(b.serviceId, b.serviceName)}
          {b.duration && <Box component="span" sx={{ color: "rgba(15, 23, 42,0.45)", ml: 0.75 }}>· {b.duration} min</Box>}
        </Typography>

        {/* datetime */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.4 }}>
          <Clock size={12} color="rgba(15, 23, 42,0.45)" />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.55)" }}>{dateLabel}</Typography>
        </Box>

        {/* location */}
        {(b.locationName || b.address) && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mb: 0.4 }}>
            <MapPin size={12} color="rgba(15, 23, 42,0.45)" style={{ flexShrink: 0, marginTop: 2 }} />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.55)", lineHeight: 1.4 }}>
              {b.locationName || b.address}
            </Typography>
          </Box>
        )}

        {/* customer name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <User size={12} color="rgba(15, 23, 42,0.45)" />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.55)" }}>{nameOf(b)}</Typography>
        </Box>

        {/* 🆕 Round 28s230 — customer phone, tap-to-call (was missing entirely;
            the operator could see an order but had no way to reach the guest). */}
        {b.phone && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
            <Phone size={12} color="#16a34a" weight="fill" />
            <Typography
              component="a"
              href={`tel:${b.phone}`}
              onClick={(e) => e.stopPropagation()}
              sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "#16a34a", textDecoration: "none" }}
            >
              {b.phone}
            </Typography>
          </Box>
        )}

        {/* 🆕 Round 28s230 — warn when the booked therapist was unavailable
            (onBookingCreate flagged needsAdminReview). Call the guest before
            confirming — don't blind-accept. */}
        {b.needsAdminReview && (
          <Box
            sx={{
              mt: 0.6, px: 0.8, py: 0.4, borderRadius: 1,
              background: "rgba(180,0,10,0.08)", border: "1px solid rgba(180,0,10,0.25)",
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "#B4000A" }}>
              ⚠️ ต้องเช็คก่อนยืนยัน{b.reviewReason ? ` · ${b.reviewReason}` : " — หมอนวดอาจไม่ว่าง"}
            </Typography>
          </Box>
        )}

        {/* divider */}
        <Box sx={{ my: 1.25, borderTop: "1px solid rgba(15,23,42,0.05)" }} />

        {/* bottom row: price + paid toggle + primary CTA */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#B4000A", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {formatTHB(total)}
            </Typography>
            {b.taxiFee ? (
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "rgba(15, 23, 42,0.40)", mt: 0.2 }}>
                incl. ฿{b.taxiFee} taxi
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
            {/* paid toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onTogglePaid}
              title={b.paid ? "Mark unpaid" : "Mark paid"}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: b.paid ? "rgba(22,163,74,0.12)" : "rgba(15, 23, 42,0.06)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <CurrencyCircleDollar size={16} color={b.paid ? "#16a34a" : "rgba(15, 23, 42,0.40)"} weight={b.paid ? "fill" : "regular"} />
            </motion.button>

            {/* expand toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setExpanded((v) => !v)}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(15, 23, 42,0.05)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {expanded
                ? <CaretUp size={14} color="rgba(15, 23, 42,0.50)" weight="bold" />
                : <CaretDown size={14} color="rgba(15, 23, 42,0.50)" weight="bold" />}
            </motion.button>

            {/* primary action */}
            {isPending && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                style={{
                  height: 36, padding: "0 16px", borderRadius: 999,
                  background: "#B4000A",
                  color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.30)",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <CheckCircle size={14} weight="fill" /> Confirm
              </motion.button>
            )}
            {isConfirmed && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onComplete}
                style={{
                  height: 36, padding: "0 16px", borderRadius: 999,
                  background: "linear-gradient(135deg,#16a34a,#4ade80)",
                  color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(22,163,74,0.28)",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <CheckCircle size={14} weight="fill" /> Done
              </motion.button>
            )}
          </Box>
        </Box>

        {/* expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <Box sx={{ pt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                {/* note */}
                <Box
                  sx={{
                    display: "flex", gap: 0.75, alignItems: "center",
                    px: 1.25, py: 0.75,
                    borderRadius: "10px",
                    background: "#EDE8E4",
                    border: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  <NotePencil size={13} color="rgba(15, 23, 42,0.45)" style={{ flexShrink: 0 }} />
                  <InputBase
                    placeholder="Admin note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => onSaveNote(note)}
                    multiline
                    maxRows={3}
                    sx={{ flex: 1, fontFamily: SANS, fontSize: 12, color: "#1a0805" }}
                  />
                </Box>

                {/* secondary actions */}
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onViewDetail}
                    style={{
                      flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                      background: "rgba(15, 23, 42,0.05)",
                      border: "1px solid rgba(15,23,42,0.08)",
                      color: "rgba(15, 23, 42,0.65)", fontFamily: SANS, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Full detail
                  </motion.button>

                  {(isPending || isConfirmed) && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onCancel}
                      style={{
                        flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                        background: "rgba(180,0,10,0.06)",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        color: "#B4000A", fontFamily: SANS, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <XCircle size={13} weight="fill" /> Cancel
                    </motion.button>
                  )}

                  {b.status === "completed" && !b.reviewed && (
                    <Box
                      component="span"
                      sx={{
                        flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                        background: "rgba(15, 23, 42,0.04)",
                        border: "1px solid rgba(15,23,42,0.06)",
                        color: "rgba(15, 23, 42,0.45)", fontFamily: SANS, fontSize: 12, fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      Awaiting review
                    </Box>
                  )}
                </Box>

                {/* booking ID */}
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "rgba(15, 23, 42,0.30)", textAlign: "right", letterSpacing: "0.04em" }}>
                  #{b.id.slice(0, 10).toUpperCase()}
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Detail panel (inside Drawer)
// ──────────────────────────────────────────────────────────────────────
const DetailPanel: React.FC<{
  booking: Booking;
  onClose: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onTogglePaid: () => void;
  onSaveNote: (note: string) => void;
}> = ({ booking: b, onClose, onConfirm, onComplete, onCancel, onTogglePaid, onSaveNote }) => {
  const [note, setNote] = useState(b.adminNote ?? "");
  const cfg        = STATUS_CFG[b.status] ?? STATUS_CFG.pending;
  const isCancelled = b.status === "cancelled";
  const total      = isCancelled ? 0 : (b.totalPrice ?? b.total ?? 0);

  const dateLabel = b.startAt?.toDate
    ? fmtBKK(b.startAt.toDate(), "dddd D MMMM YYYY · HH:mm")
    : b.date && b.time
    ? `${fmtBKK(b.date, "dddd D MMMM YYYY")} · ${b.time}`
    : b.date ? fmtBKK(b.date, "dddd D MMMM YYYY") : "—";

  const createdLabel = b.createdAt
    ? fmtBKK(b.createdAt.toDate(), "D MMM YYYY · HH:mm")
    : "—";

  const Row = ({ label, value }: { label: string; value?: string | React.ReactNode }) =>
    value ? (
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75 }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.45)", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "#1a0805", textAlign: "right", wordBreak: "break-word" }}>{value}</Typography>
      </Box>
    ) : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* header */}
      <Box
        sx={{
          background: "#1A2B2E",
          pt: 3, pb: 2.5, px: 2.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Box sx={{ px: "10px", py: "4px", borderRadius: 999, background: cfg.badge.bg, display: "inline-flex", mb: 1 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.badge.fg }}>
                {cfg.label}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
              {b.therapistName}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.55)", mt: 0.3 }}>
              {getServiceLabel(b.serviceId, b.serviceName)}
              {b.duration && ` · ${b.duration} min`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.6)", mt: -0.5 }}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* price strip */}
        <Box
          sx={{
            display: "flex", gap: 1, mt: 2,
            p: 1.5, borderRadius: "14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { label: "Service", value: formatTHB(isCancelled ? 0 : (b.servicePrice || 0)) },
            { label: "Taxi",    value: formatTHB(isCancelled ? 0 : (b.taxiFee     || 0)) },
            { label: "Total",   value: formatTHB(total) },
          ].map((s, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.40)", mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* scrollable body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>

        {/* booking info */}
        <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: "rgba(15, 23, 42,0.40)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1 }}>
          Booking Info
        </Typography>
        <Box
          sx={{
            borderRadius: "14px", background: "#fff",
            border: "1px solid rgba(15,23,42,0.06)",
            px: 1.75, py: 0.5, mb: 2,
          }}
        >
          <Divider sx={{ "&:first-of-type": { display: "none" } }} />
          <Row label="Customer"  value={nameOf(b)} />
          <Divider sx={{ opacity: 0.4 }} />
          {/* 🆕 Round 28s230 — phone with tap-to-call so View can reach the guest. */}
          <Row
            label="Phone"
            value={
              b.phone ? (
                <Typography
                  component="a"
                  href={`tel:${b.phone}`}
                  sx={{ fontFamily: SANS, fontWeight: 700, color: "#16a34a", textDecoration: "none" }}
                >
                  {b.phone}
                </Typography>
              ) : (
                "—"
              )
            }
          />
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Date & Time" value={dateLabel} />
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Location"  value={b.locationName || b.address || "—"} />
          {b.placeDetail && <><Divider sx={{ opacity: 0.4 }} /><Row label="Detail" value={b.placeDetail} /></>}
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Booked"    value={createdLabel} />
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Payment"   value={
            <Box
              component="span"
              onClick={onTogglePaid}
              sx={{
                px: "10px", py: "3px", borderRadius: 999, cursor: "pointer",
                background: b.paid ? "rgba(22,163,74,0.12)" : "rgba(15, 23, 42,0.06)",
                color: b.paid ? "#16a34a" : "rgba(15, 23, 42,0.55)",
                fontFamily: SANS, fontSize: 11, fontWeight: 700,
                userSelect: "none",
              }}
            >
              {b.paid ? "✓ Paid" : "Unpaid — tap to mark paid"}
            </Box>
          } />
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Booking ID" value={b.id} />
        </Box>

        {/* admin note */}
        <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: "rgba(15, 23, 42,0.40)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1 }}>
          Admin Note
        </Typography>
        <Box
          sx={{
            borderRadius: "14px", background: "#fff",
            border: "1px solid rgba(15,23,42,0.06)",
            px: 1.75, py: 1, mb: 2,
          }}
        >
          <InputBase
            placeholder="Type a note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            sx={{ fontFamily: SANS, fontSize: 13, color: "#1a0805", width: "100%" }}
          />
        </Box>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSaveNote(note)}
          style={{
            width: "100%", height: 38, borderRadius: 999,
            background: "rgba(15, 23, 42,0.06)",
            border: "1px solid rgba(15,23,42,0.08)",
            fontFamily: SANS, fontSize: 13, fontWeight: 600,
            color: "rgba(15, 23, 42,0.65)", cursor: "pointer", marginBottom: 12,
          }}
        >
          Save note
        </motion.button>
      </Box>

      {/* sticky action footer */}
      <Box
        sx={{
          flexShrink: 0,
          px: 2.5, pb: "max(env(safe-area-inset-bottom,0px),16px)", pt: 1.5,
          background: "#fff",
          borderTop: "1px solid rgba(15,23,42,0.06)",
          display: "flex", gap: 1,
        }}
      >
        {b.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            style={{
              flex: 1, height: 48, borderRadius: 999,
              background: "#B4000A",
              color: "#fff", fontFamily: SANS, fontSize: 15, fontWeight: 700,
              border: "none", cursor: "pointer",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.30)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <CheckCircle size={18} weight="fill" /> Confirm Booking
          </motion.button>
        )}
        {b.status === "confirmed" && (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              style={{
                flex: 1, height: 48, borderRadius: 999,
                background: "linear-gradient(135deg,#16a34a,#4ade80)",
                color: "#fff", fontFamily: SANS, fontSize: 15, fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 6px 18px rgba(22,163,74,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <CheckCircle size={18} weight="fill" /> Mark Complete
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(180,0,10,0.08)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <XCircle size={22} color="#B4000A" weight="fill" />
            </motion.button>
          </>
        )}
        {b.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(180,0,10,0.08)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <XCircle size={22} color="#B4000A" weight="fill" />
          </motion.button>
        )}
        {(b.status === "completed" || b.status === "cancelled") && (
          <Box sx={{ flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(15, 23, 42,0.40)", fontWeight: 600 }}>
              {b.status === "completed" ? "Session completed" : "Booking cancelled"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AdminBookingListPage;
