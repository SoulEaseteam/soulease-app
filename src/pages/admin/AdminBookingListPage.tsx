// src/pages/admin/AdminBookingListPage.tsx
//
// 🆕 Round 28c18 (founder 2026-05-06) — mobile-first card layout.
//   Responsive cards, prominent Confirm/Complete/Cancel CTAs, inline note
//   editing, payment toggle, batch export.
//
// 🆕 Round 28s252 (audit) — eight fixes:
//   1. The realtime listener is now BOUNDED (limit 500, newest first). It used
//      to stream the ENTIRE bookings collection with no limit — an unbounded,
//      ever-growing Firestore read + client memory cost as history piles up.
//   2. Cancel now confirms + captures a reason (window.prompt) before flipping
//      a real customer's booking to cancelled — it was a one-tap destructive
//      action sitting next to "Mark Complete" in the drawer.
//   3. Payment is unified: the admin `paid` toggle now also keeps
//      `paymentStatus` in sync, and display reads either — the customer flow
//      wrote `paymentStatus` which nothing here ever read/updated (dead data).
//   4. Restyled onto the shared Ocean Study light tokens (was the old
//      #1A2B2E/#B4000A brand theme).
//   5. The paid toggle now leaves an audit trail (booking.mark_paid/unpaid).
//   6. `Row` hoisted to module scope (was redefined every render).
//   7. aria-labels on icon-only buttons.
//   8. Unknown statuses get a neutral badge instead of pending-red, and
//      refunded/no_show are labelled.
//
// 🆕 Round 28s253 (founder: "แก้ให้สวยขึ้น admin/bookings") — visual pass on
//   top of the 28s252 fixes, still Ocean Study, no new colors:
//   • A "what needs you" summary strip up top (pending / active / booked
//     value) so the operator reads priority before scanning cards.
//   • Search + status tabs merged into one control row (was two stacked
//     full-width rows) — tighter, and the tabs no longer eat a whole line
//     on desktop.
//   • Cards now visually RECEDE once their story is over: completed/
//     cancelled cards sit on a duller panel, skip the hover lift, and their
//     price goes ink instead of accent — so the eye lands on what's still
//     actionable, not on history.
//   • Active-status cards get a hover lift + deeper shadow (the affordance
//     was static before; nothing signalled the card was part of a live
//     board).
//
// 🆕 Round 28s254 (founder: "เพิ่มตัวกรอง" — all 3 offered) — date range,
//   therapist, and payment-status filters, same pattern as the Earnings/
//   Analytics filter rounds (28s243/244). Date range now controls the
//   Firestore query itself (a custom range replaces the flat "last 500"
//   with a proper createdAt >=/<= window); therapist + payment narrow the
//   already-loaded set client-side. The summary strip and tab counts read
//   the therapist/payment-narrowed set, so switching either updates what
//   "Needs action" etc. mean — but never react to the free-text search,
//   which is a look-up, not a persistent facet.

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
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { db } from "@/lib/firebase";
import { fmtBKK } from "@/utils/time";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
import { ExportToExcel } from "@/utils/exportTools";
import { logAdminAction } from "@/utils/auditLog";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
// 🆕 28s258 (founder: "ใน Booked value โชว์ยอดรายได้ร้านด้วย") — shop revenue
//   uses the SAME shared commission split as Earnings/Reports (currently
//   flat 60/40, see commission.ts) so this summary number can never drift
//   from what those two pages say — the exact bug the 28s247 audit fixed.
import { commissionBaseFor, therapistPayoutFor } from "@/utils/commission";
// 🆕 28s260 (founder: "เพิ่มวิธีการจ่ายด้วย") — WeChat/Alipay carry a 5%+฿200
//   surcharge (same rule as the customer flow + AdminBookingAddPage).
//   Editing payment method is a price-affecting edit, so the total gets
//   recomputed on save — silently leaving it stale would under-charge a
//   booking that got switched to a surcharged method.
import { paymentSurcharge } from "@/utils/paymentSurcharge";
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
  X,
  PencilSimple,
  FloppyDisk,
  Star,
} from "phosphor-react";

// Cap the realtime window. Pending/confirmed bookings are always recent; older
// records live in Reports/Earnings (which are date-bounded). 500 keeps the
// read bounded regardless of how big the collection grows.
const FEED_LIMIT = 500;

// 🆕 Round 28s256 (founder reference screenshot — nested-card "secondary
//   background" frame) — an 18% blend from bg (#DCEFF5) toward dim
//   (#5C6F7B), both official Ocean Study swatches (rule: 28s237, every color
//   traces to an official hex or a blend strictly between two of them).
//   `adminColor.panel3` was tried first but it's ALSO a blend toward bg (just
//   from white) — visually near-identical to `bg` itself, so it couldn't
//   read as a distinct frame behind the white card. This blend goes toward
//   the darker anchor instead, so the nesting is actually visible.
const CARD_FRAME_BG = "#C5D8DF";

// ── types ─────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  userName?: string;
  // 🆕 Round 28s230 — customer flow writes `contactName`, admin-add writes
  //   `customerName`; `nameOf()` normalises all three.
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
  discountAmount?: number;  // 🆕 28s258 — needed for the shared commission calc
  taxiFee?: number;
  paymentFee?: number;      // 🆕 28s260 — WeChat/Alipay surcharge, recomputed if payment method is edited
  totalPrice?: number;
  total?: number;
  createdAt: Timestamp;
  status: string;
  payment?: string;         // 🆕 28s260 — payment METHOD (cash/transfer/…), distinct from paid/paymentStatus below
  paid?: boolean;
  paymentStatus?: string;   // 🆕 28s252 — customer-flow field, now kept in sync
  cancelReason?: string;    // 🆕 28s252 — captured on cancel
  adminNote?: string;
  reviewed?: boolean;
}

type TabKey = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const SANS  = adminFont.sans;
const SERIF = adminFont.serif;

type StatusCfg = { label: string; stripe: string; badge: { bg: string; fg: string } };

const STATUS_CFG: Record<string, StatusCfg> = {
  pending:   { label: "Pending",   stripe: adminColor.accent, badge: { bg: `${adminColor.accent}1A`, fg: adminColor.accent } },
  confirmed: { label: "Confirmed", stripe: adminColor.green,  badge: { bg: `${adminColor.green}1A`,  fg: adminColor.green  } },
  completed: { label: "Completed", stripe: adminColor.dim,    badge: { bg: adminColor.panel2,        fg: adminColor.muted  } },
  cancelled: { label: "Cancelled", stripe: adminColor.line2,  badge: { bg: adminColor.panel2,        fg: adminColor.dim    } },
  refunded:  { label: "Refunded",  stripe: adminColor.amber,  badge: { bg: `${adminColor.amber}1A`,  fg: adminColor.amber  } },
  no_show:   { label: "No-show",   stripe: adminColor.red,    badge: { bg: `${adminColor.red}14`,    fg: adminColor.red    } },
};

// 🆕 28s252 — neutral fallback so an unknown status doesn't render as
//   pending-red (misleading).
const cfgFor = (status: string): StatusCfg =>
  STATUS_CFG[status] ?? { label: status, stripe: adminColor.dim, badge: { bg: adminColor.panel2, fg: adminColor.muted } };

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

// 🆕 28s252 — single source of truth for "did the customer pay": the admin
//   `paid` boolean if set, else the customer-flow `paymentStatus`.
const isPaid = (b: Booking): boolean => b.paid ?? b.paymentStatus === "paid";

// ── shared detail row (module scope — was redefined every render, fix #6) ─
const Row: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) =>
  value ? (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, textAlign: "right", wordBreak: "break-word" }}>{value}</Typography>
    </Box>
  ) : null;

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
type DateMode = "all" | "custom";

const AdminBookingListPage: React.FC = () => {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  // 🆕 28s255 (founder: "All show") — default tab is now "All", not "Pending".
  const [tab,         setTab]         = useState<TabKey>("all");
  const [search,      setSearch]      = useState("");
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [detailId,    setDetailId]    = useState<string | null>(null);

  // 🆕 28s259 (founder audit: "เพิ่มการเปลี่ยนหมอนวดได้ภายในใบจองเดิม") —
  //   the full therapist roster, so the detail drawer's edit form can offer
  //   reassignment. Same fetch pattern as AdminBookingAddPage.
  const [therapists, setTherapists] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    void getDocs(collection(db, "therapists")).then((snap) => {
      setTherapists(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id })));
    });
  }, []);

  // 🆕 28s254 — date range + therapist + payment filters.
  const [dateMode,        setDateMode]        = useState<DateMode>("all");
  const [customStart,     setCustomStart]     = useState<Dayjs>(() => dayjs().subtract(30, "day").startOf("day"));
  const [customEnd,       setCustomEnd]       = useState<Dayjs>(() => dayjs());
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");
  const [paymentFilter,   setPaymentFilter]   = useState("__ALL__"); // __ALL__ | paid | unpaid

  // 🆕 28s257 (founder: "ทำไมจำกัดแค่ 500 ทั้งหมดไม่ได้หรอ") — the 500 cap
  //   from 28s252 was hiding real bookings once the collection passed 500
  //   docs. Fix: "Load more" pagination instead of either extreme (an
  //   unbounded fetch — the original bug — or a hard ceiling). `feedSize`
  //   starts at FEED_LIMIT and grows by FEED_LIMIT each click; it resets to
  //   FEED_LIMIT whenever the date range changes so a fresh query starts at
  //   page one, not wherever the operator had scrolled to before.
  const [feedSize, setFeedSize] = useState(FEED_LIMIT);
  useEffect(() => { setFeedSize(FEED_LIMIT); }, [dateMode, customStart, customEnd]);

  // ── realtime feed (bounded — fix #1; date-scoped when a custom range is
  //   active — 28s254; paginated via feedSize — 28s257) ─────────────────
  useEffect(() => {
    setLoading(true);
    const filters: Parameters<typeof query>[1][] = [];
    if (dateMode === "custom") {
      filters.push(where("createdAt", ">=", Timestamp.fromDate(customStart.startOf("day").toDate())));
      filters.push(where("createdAt", "<=", Timestamp.fromDate(customEnd.endOf("day").toDate())));
    }
    filters.push(orderBy("createdAt", "desc"), limit(feedSize));
    const q = query(collection(db, "bookings"), ...filters);
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [dateMode, customStart, customEnd, feedSize]);

  const atCap = bookings.length >= feedSize;

  // 🆕 28s254 — therapist option list from the date-scoped set only (not
  //   further narrowed by payment), so switching one filter never collapses
  //   the other's choices.
  const therapistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.therapistId) map.set(b.therapistId, b.therapistName || b.therapistId);
    }
    return [...map.entries()];
  }, [bookings]);

  // Therapist + payment are persistent facets — they narrow what the summary
  // strip and tab counts mean. Free-text search does NOT (it's a look-up).
  const faceted = useMemo(() => {
    return bookings.filter((b) => {
      const matchTherapist = therapistFilter === "__ALL__" || b.therapistId === therapistFilter;
      const matchPayment   = paymentFilter === "__ALL__" || (paymentFilter === "paid" ? isPaid(b) : !isPaid(b));
      return matchTherapist && matchPayment;
    });
  }, [bookings, therapistFilter, paymentFilter]);

  // ── counts per bucket ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: faceted.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const b of faceted) {
      if (b.status in c) c[b.status as TabKey]++;
    }
    return c;
  }, [faceted]);

  // 🆕 28s253/254/258 — summary-strip figures over the faceted (date +
  //   therapist + payment) set. "Booked value" is a real sum over what's
  //   actually loaded/selected, never a fabricated "tonight" figure.
  //   `shopRevenue` = commission base (service price − discount) minus the
  //   therapist payout — i.e. the shop's share of service revenue, same
  //   definition AdminReportPage uses. It excludes taxi (pass-through) and
  //   the per-booking overhead AdminEarningsPage subtracts for "net" — this
  //   is a quick list-page figure, not a replacement for the Earnings page.
  const valueStats = useMemo(() => {
    let totalValue = 0, activeCount = 0, shopRevenue = 0;
    for (const b of faceted) {
      if (b.status === "cancelled") continue;
      activeCount++;
      totalValue += b.totalPrice ?? b.total ?? 0;
      const base = commissionBaseFor(b);
      shopRevenue += base - therapistPayoutFor(b);
    }
    return { totalValue, activeCount, shopRevenue };
  }, [faceted]);

  // ── filtered list (facets + tab + search) ──────────────────────────
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return faceted.filter((b) => {
      const matchTab = tab === "all" || b.status === tab;
      const matchQ   = !q || [nameOf(b), b.phone, b.therapistName, b.serviceName, b.address, b.locationName, b.id]
        .join(" ").toLowerCase().includes(q);
      return matchTab && matchQ;
    });
  }, [faceted, tab, search]);

  // ── write helpers ─────────────────────────────────────────────────
  const setStatus = async (id: string, status: string, reason?: string) => {
    try {
      // 🆕 Round 28s230 (FIX D) — confirming settles the 10-min hold so
      //   releaseExpiredHolds can't later stamp it "expired".
      const patch: Record<string, unknown> =
        status === "confirmed"
          ? { status, holdState: "confirmed", holdExpiresAt: null }
          : status === "cancelled"
          ? { status, ...(reason ? { cancelReason: reason } : {}) }
          : { status };
      await updateDoc(doc(db, "bookings", id), patch);
      // 🆕 28s259 — "booking.status_change" is the fallback for transitions
      //   that don't have a dedicated action name (un-cancelling, marking
      //   refunded/no_show, reverting completed→confirmed, etc.) — the
      //   Status dropdown in DetailPanel can reach any of these now.
      const auditAction =
        status === "confirmed" ? "booking.confirm" :
        status === "cancelled" ? "booking.cancel" :
        status === "completed" ? "booking.complete" : "booking.status_change";
      void logAdminAction(auditAction, { bookingId: id, status, ...(reason ? { reason } : {}) });
      setToast({ msg: `Booking ${status}`, ok: true });
    } catch {
      setToast({ msg: "Update failed", ok: false });
    }
  };

  // 🆕 28s252 (fix #2) — confirm + capture a reason before cancelling.
  const cancelBooking = (id: string) => {
    const reason = window.prompt(
      "ยกเลิกการจองนี้?\nใส่เหตุผล (เว้นว่างได้) — กด Cancel เพื่อไม่ยกเลิก:",
      ""
    );
    if (reason === null) return; // operator backed out
    void setStatus(id, "cancelled", reason.trim() || undefined);
  };

  // 🆕 28s259 — full status-override dropdown (DetailPanel). Routes through
  //   cancelBooking so choosing "Cancelled" still prompts for a reason,
  //   same as the dedicated Cancel button.
  const changeStatus = (id: string, newStatus: string) => {
    if (newStatus === "cancelled") { cancelBooking(id); return; }
    void setStatus(id, newStatus);
  };

  // 🆕 28s259 (fix: "Awaiting review ใช้ไม่ได้") — the badge had no onClick
  //   at all; it's not even a real gate on anything downstream (grepped:
  //   `reviewed` is never written anywhere in this codebase, only ever
  //   read). Turning it into a real action lets the operator dismiss it.
  const markReviewed = async (id: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { reviewed: true });
      void logAdminAction("booking.mark_reviewed", { bookingId: id });
      setToast({ msg: "Marked reviewed", ok: true });
    } catch {
      setToast({ msg: "Update failed", ok: false });
    }
  };

  // 🆕 28s259/261 (fix: "full detail แก้ไขไม่ได้" + "เปลี่ยนหมอนวดได้" +
  //   "แก้ราคาได้ ทั้งหมด") — the detail drawer's edit form (customer/phone/
  //   date/time/location/therapist/payment method/price) writes through
  //   here. `auditDetail` is a SEPARATE object from `patch` — it's only for
  //   the audit-log entry (e.g. price before/after), never written onto the
  //   booking doc itself.
  const saveDetails = async (id: string, patch: Record<string, unknown>, auditDetail?: Record<string, unknown>) => {
    try {
      await updateDoc(doc(db, "bookings", id), patch);
      void logAdminAction("booking.edit_details", { bookingId: id, ...auditDetail });
      setToast({ msg: "Details saved", ok: true });
    } catch {
      setToast({ msg: "Save failed", ok: false });
    }
  };

  // 🆕 28s252 (fix #3 + #5) — keep `paid` and `paymentStatus` in sync + audit.
  const togglePaid = async (id: string, cur: boolean) => {
    const next = !cur;
    try {
      await updateDoc(doc(db, "bookings", id), {
        paid: next,
        paymentStatus: next ? "paid" : "unpaid",
      });
      void logAdminAction(next ? "booking.mark_paid" : "booking.mark_unpaid", { bookingId: id });
      setToast({ msg: next ? "Marked as paid" : "Marked unpaid", ok: true });
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
      Payment:      isPaid(b) ? "Paid" : "Unpaid",
      ServicePrice: b.servicePrice || 0,
      TaxiFee:      b.taxiFee     || 0,
      Total:        b.totalPrice  || b.total || 0,
      Note:         b.adminNote   || "",
    }));
    await ExportToExcel(rows, `bookings-${Date.now()}.xlsx`);
  };

  const detailBooking = bookings.find((b) => b.id === detailId) ?? null;

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", background: adminColor.bg, pb: 10 }}>

      {/* ── header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: adminColor.bg,
          borderBottom: `1px solid ${adminColor.line}`,
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
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 22, md: 26 }, fontWeight: 600, color: adminColor.text, letterSpacing: "-0.01em" }}>
            Bookings
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mt: 0.3 }}>
            {counts.pending > 0 ? `${counts.pending} pending action${counts.pending > 1 ? "s" : ""}` : "All up to date"}
            {atCap && ` · showing latest ${feedSize}`}
          </Typography>
        </Box>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={exportXLSX}
          aria-label="Export bookings to Excel"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 40, padding: "0 18px", borderRadius: 999,
            background: adminColor.panel, border: `1px solid ${adminColor.line2}`,
            color: adminColor.text, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Export size={15} /> Export
        </motion.button>
      </Box>

      {/* 🆕 28s253 — summary strip: what needs the operator's attention first,
          before any card is scanned. */}
      <Box
        sx={{
          px: { xs: 2, md: 3 }, pt: 2.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" },
          gap: 1.25,
        }}
      >
        {[
          { label: "Needs action",  value: String(counts.pending),               sub: "pending confirmation", rail: adminColor.accent },
          { label: "In progress",   value: String(counts.confirmed),             sub: "confirmed · dispatched", rail: adminColor.green },
          // 🆕 28s258 — shop-revenue line added under "Booked value" (same
          //   commission split as Earnings/Reports — see commission.ts).
          { label: "Booked value",  value: formatTHB(valueStats.totalValue),     sub: `${valueStats.activeCount} bookings · excl. cancelled`, extra: `Shop revenue ${formatTHB(valueStats.shopRevenue)}`, rail: adminColor.dim },
        ].map((s) => (
          <Box
            key={s.label}
            sx={{
              position: "relative", overflow: "hidden",
              background: adminColor.panel, border: `1px solid ${adminColor.line}`,
              borderRadius: "18px", p: "16px 18px",
              boxShadow: "0 1px 2px rgba(31,41,51,0.04), 0 8px 22px rgba(31,41,51,0.07)",
              "&::before": {
                content: '""', position: "absolute", left: 0, top: 14, bottom: 14, width: 3,
                borderRadius: 3, background: s.rail,
              },
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: adminColor.muted, pl: 1.5 }}>
              {s.label}
            </Typography>
            <Typography sx={{ ...adminFigureSx, fontSize: 25, mt: 0.75, pl: 1.5, lineHeight: 1 }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim, mt: 0.5, pl: 1.5 }}>
              {s.sub}
            </Typography>
            {"extra" in s && s.extra && (
              <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.accent, mt: 0.35, pl: 1.5 }}>
                {s.extra}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* ── search + status tabs (merged into one control row — 28s253) ── */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 1,
            px: 1.5, height: 44, flex: "1 1 220px",
            borderRadius: "13px",
            background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
          }}
        >
          <MagnifyingGlass size={16} color={adminColor.dim} />
          <InputBase
            placeholder="Search customer, therapist, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, fontFamily: SANS, fontSize: 13, color: adminColor.text }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            overflowX: "auto",
            flexShrink: 0,
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
                aria-pressed={active}
                style={{
                  flexShrink: 0,
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 999,
                  background: active ? adminColor.accent : adminColor.panel,
                  border: active ? "none" : `1px solid ${adminColor.line2}`,
                  color: active ? "#fff" : adminColor.muted,
                  fontFamily: SANS,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: active ? "0 5px 14px rgba(78,126,140,0.28)" : "none",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "border-color 0.15s ease, color 0.15s ease",
                }}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 19, height: 19, borderRadius: 999, px: "5px",
                      background: active ? "rgba(255,255,255,0.24)" : `${adminColor.accent}1F`,
                      color: active ? "#fff" : adminColor.accent,
                      fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {counts[t.key]}
                  </Box>
                )}
              </motion.button>
            );
          })}
        </Box>
      </Box>

      {/* 🆕 28s254 — date range + therapist + payment filters. */}
      <Box
        sx={{
          px: { xs: 2, md: 3 }, pt: 1.25,
          display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center",
          "& .MuiInputBase-root": { color: adminColor.text },
          "& .MuiInputLabel-root": { color: adminColor.muted },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
          "& .MuiSvgIcon-root": { color: adminColor.muted },
        }}
      >
        <ToggleButtonGroup
          value={dateMode}
          exclusive
          size="small"
          onChange={(_, v) => v && setDateMode(v as DateMode)}
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: SANS, fontSize: 12.5, fontWeight: 600, textTransform: "none",
              color: adminColor.muted, borderColor: adminColor.line2, padding: "6px 14px",
              "&.Mui-selected": { color: "#fff", background: adminColor.accent, "&:hover": { background: adminColor.accentDeep } },
            },
          }}
        >
          <ToggleButton value="all">All time</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>

        {dateMode === "custom" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              value={customStart}
              maxDate={customEnd}
              onChange={(v) => v && setCustomStart(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
            />
            <DatePicker
              label="To"
              value={customEnd}
              minDate={customStart}
              maxDate={dayjs()}
              onChange={(v) => v && setCustomEnd(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
            />
          </LocalizationProvider>
        )}

        {therapistOptions.length > 0 && (
          <Select
            size="small"
            value={therapistFilter}
            onChange={(e) => setTherapistFilter(e.target.value)}
            sx={{ minWidth: 160, fontSize: 13 }}
            MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
          >
            <MenuItem value="__ALL__">All therapists</MenuItem>
            {therapistOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </Select>
        )}

        <Select
          size="small"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          sx={{ minWidth: 130, fontSize: 13 }}
          MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
        >
          <MenuItem value="__ALL__">Any payment</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="unpaid">Unpaid</MenuItem>
        </Select>
      </Box>

      {/* ── card list ─────────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" },
          // 🆕 28s256 — trimmed from 1.5→1: each card frame now carries its
          // own 8px padding, so the old gap on top of that read as too much
          // air between cards.
          gap: 1,
        }}
      >
        {loading ? (
          <Box sx={{ gridColumn: "1/-1", textAlign: "center", py: 6 }}>
            <CircularProgress sx={{ color: adminColor.accent }} />
          </Box>
        ) : visible.length === 0 ? (
          <Box
            sx={{
              gridColumn: "1/-1", textAlign: "center", py: 8,
              color: adminColor.dim, fontFamily: SANS, fontSize: 14,
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
                  onCancel={() => cancelBooking(b.id)}
                  onTogglePaid={() => togglePaid(b.id, isPaid(b))}
                  onSaveNote={(note) => saveNote(b.id, note)}
                  onViewDetail={() => setDetailId(b.id)}
                  onMarkReviewed={() => markReviewed(b.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* 🆕 28s257 — "Load more" instead of a hard ceiling. Only the operator
          decides to pull in another page; nothing fetches unboundedly on its
          own. */}
      {!loading && atCap && (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, textAlign: "center" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFeedSize((s) => s + FEED_LIMIT)}
            style={{
              height: 40, padding: "0 22px", borderRadius: 999,
              background: adminColor.panel, border: `1px solid ${adminColor.line2}`,
              color: adminColor.text, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Load {FEED_LIMIT} more
          </motion.button>
        </Box>
      )}

      {/* ── detail drawer ─────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!detailId}
        onClose={() => setDetailId(null)}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 420 },
            background: adminColor.bg,
            p: 0,
          },
        }}
      >
        {detailBooking && (
          <DetailPanel
            booking={detailBooking}
            therapists={therapists}
            onClose={() => setDetailId(null)}
            onConfirm={() => { void setStatus(detailBooking.id, "confirmed"); }}
            onComplete={() => { void setStatus(detailBooking.id, "completed"); }}
            onCancel={() => cancelBooking(detailBooking.id)}
            onTogglePaid={() => { void togglePaid(detailBooking.id, isPaid(detailBooking)); }}
            onSaveNote={(note) => { void saveNote(detailBooking.id, note); }}
            onChangeStatus={(status) => changeStatus(detailBooking.id, status)}
            onSaveDetails={(patch, auditDetail) => { void saveDetails(detailBooking.id, patch, auditDetail); }}
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
  onMarkReviewed: () => void;
}> = ({ booking: b, onConfirm, onComplete, onCancel, onTogglePaid, onSaveNote, onViewDetail, onMarkReviewed }) => {
  const [expanded, setExpanded] = useState(false);
  const [note,     setNote]     = useState(b.adminNote ?? "");

  const cfg        = cfgFor(b.status);
  const isCancelled = b.status === "cancelled";
  const total      = isCancelled ? 0 : (b.totalPrice ?? b.total ?? 0);
  const isPending   = b.status === "pending";
  const isConfirmed = b.status === "confirmed";
  const paid        = isPaid(b);
  // 🆕 28s253 — "terminal" bookings (done/cancelled) recede: duller panel,
  //   no hover lift, ink price instead of accent. Keeps the eye on what's
  //   still actionable rather than history.
  const isTerminal  = b.status === "completed" || b.status === "cancelled";

  const dateLabel = b.startAt?.toDate
    ? fmtBKK(b.startAt.toDate(), "ddd D MMM · HH:mm")
    : b.date && b.time
    ? `${fmtBKK(b.date, "ddd D MMM")} · ${b.time}`
    : b.date
    ? fmtBKK(b.date, "ddd D MMM")
    : "—";

  return (
    // 🆕 Round 28s256 (founder reference screenshot: "พื้นหลังรอง กรอบและปุ่ม
    //   แบบตัวอย่างนี้" — a customer-site card style with a nested frame:
    //   duller "secondary background" box holding a white inner card. Kept
    //   Ocean Study's own accent teal on buttons per founder's explicit
    //   choice ("คง teal เดิม") — only the nested-frame STRUCTURE was
    //   adopted, not the reference's dark-navy button color.
    <Box
      sx={{
        borderRadius: "24px",
        background: CARD_FRAME_BG, // secondary background — the frame
        p: "8px",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        boxShadow: isTerminal
          ? "0 1px 2px rgba(31,41,51,0.03)"
          : "0 1px 2px rgba(31,41,51,0.04), 0 8px 22px rgba(31,41,51,0.07)",
        ...(!isTerminal && {
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 2px 4px rgba(31,41,51,0.05), 0 16px 40px rgba(31,41,51,0.12)",
          },
        }),
      }}
    >
      <Box
        sx={{
          borderRadius: "18px",
          background: isTerminal ? adminColor.panel2 : adminColor.panel,
          border: `1px solid ${adminColor.line}`,
          overflow: "hidden",
        }}
      >
      {/* accent stripe */}
      <Box sx={{ height: 3, background: cfg.stripe }} />

      <Box sx={{ p: "14px 16px 12px" }}>
        {/* row 1: therapist + status badge */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: isTerminal ? adminColor.muted : adminColor.text, lineHeight: 1.2 }}>
            {b.therapistName}
          </Typography>
          <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: cfg.badge.bg, flexShrink: 0 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.badge.fg }}>
              {cfg.label}
            </Typography>
          </Box>
        </Box>

        {/* service */}
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mb: 0.5 }}>
          {getServiceLabel(b.serviceId, b.serviceName)}
          {b.duration && <Box component="span" sx={{ color: adminColor.dim, ml: 0.75 }}>· {b.duration} min</Box>}
        </Typography>

        {/* datetime */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.4 }}>
          <Clock size={12} color={adminColor.dim} />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>{dateLabel}</Typography>
        </Box>

        {/* location */}
        {(b.locationName || b.address) && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mb: 0.4 }}>
            <MapPin size={12} color={adminColor.dim} style={{ flexShrink: 0, marginTop: 2 }} />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, lineHeight: 1.4 }}>
              {b.locationName || b.address}
            </Typography>
          </Box>
        )}

        {/* customer name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <User size={12} color={adminColor.dim} />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>{nameOf(b)}</Typography>
        </Box>

        {/* customer phone, tap-to-call */}
        {b.phone && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
            <Phone size={12} color={adminColor.green} weight="fill" />
            <Typography
              component="a"
              href={`tel:${b.phone}`}
              onClick={(e) => e.stopPropagation()}
              sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.green, textDecoration: "none" }}
            >
              {b.phone}
            </Typography>
          </Box>
        )}

        {/* needs-review warning */}
        {b.needsAdminReview && (
          <Box
            sx={{
              mt: 0.6, px: 0.8, py: 0.4, borderRadius: 1,
              background: `${adminColor.red}14`, border: `1px solid ${adminColor.red}40`,
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.red }}>
              ⚠️ ต้องเช็คก่อนยืนยัน{b.reviewReason ? ` · ${b.reviewReason}` : " — หมอนวดอาจไม่ว่าง"}
            </Typography>
          </Box>
        )}

        {/* divider */}
        <Box sx={{ my: 1.25, borderTop: `1px solid ${adminColor.line}` }} />

        {/* bottom row: price + paid toggle + primary CTA */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 18, color: isTerminal ? adminColor.dim : adminColor.accent, lineHeight: 1 }}>
              {formatTHB(total)}
            </Typography>
            {b.taxiFee ? (
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.2 }}>
                incl. ฿{b.taxiFee} taxi
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
            {/* paid toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onTogglePaid}
              title={paid ? "Mark unpaid" : "Mark paid"}
              aria-label={paid ? "Mark unpaid" : "Mark paid"}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: paid ? `${adminColor.green}1F` : adminColor.panel2,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <CurrencyCircleDollar size={16} color={paid ? adminColor.green : adminColor.dim} weight={paid ? "fill" : "regular"} />
            </motion.button>

            {/* expand toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse" : "Expand"}
              aria-expanded={expanded}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: adminColor.panel2, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {expanded
                ? <CaretUp size={14} color={adminColor.muted} weight="bold" />
                : <CaretDown size={14} color={adminColor.muted} weight="bold" />}
            </motion.button>

            {/* primary action */}
            {isPending && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                style={{
                  height: 36, padding: "0 16px", borderRadius: 999,
                  background: adminColor.accent,
                  color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(78,126,140,0.30)",
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
                  background: adminColor.green,
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
                    background: adminColor.panel2,
                    border: `1px solid ${adminColor.line}`,
                  }}
                >
                  <NotePencil size={13} color={adminColor.dim} style={{ flexShrink: 0 }} />
                  <InputBase
                    placeholder="Admin note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => onSaveNote(note)}
                    multiline
                    maxRows={3}
                    sx={{ flex: 1, fontFamily: SANS, fontSize: 12, color: adminColor.text }}
                  />
                </Box>

                {/* secondary actions */}
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onViewDetail}
                    style={{
                      flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                      background: adminColor.panel2,
                      border: `1px solid ${adminColor.line2}`,
                      color: adminColor.muted, fontFamily: SANS, fontSize: 12, fontWeight: 600,
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
                        background: `${adminColor.red}12`,
                        border: `1px solid ${adminColor.red}33`,
                        color: adminColor.red, fontFamily: SANS, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <XCircle size={13} weight="fill" /> Cancel
                    </motion.button>
                  )}

                  {/* 🆕 28s259 — this used to be a plain <Box>, same border/
                      radius as "Full detail" next to it but with NO onClick —
                      looked like a button, did nothing. Real action now:
                      dismiss the "waiting on the guest's review" flag. */}
                  {b.status === "completed" && !b.reviewed && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onMarkReviewed}
                      title="Dismiss — mark as reviewed"
                      style={{
                        flex: 1, minWidth: 80, height: 34, borderRadius: 999,
                        background: adminColor.panel2,
                        border: `1px solid ${adminColor.line}`,
                        color: adminColor.dim, fontFamily: SANS, fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <Star size={12} /> Awaiting review
                    </motion.button>
                  )}
                </Box>

                {/* booking ID */}
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, textAlign: "right", letterSpacing: "0.04em" }}>
                  #{b.id.slice(0, 10).toUpperCase()}
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Detail panel (inside Drawer)
// ──────────────────────────────────────────────────────────────────────
// 🆕 28s259 — statuses the operator can pick from the override dropdown.
//   Same set STATUS_CFG already renders badges for.
const ALL_STATUSES = Object.keys(STATUS_CFG);

// 🆕 28s260 (founder: "เพิ่มวิธีการจ่ายด้วย") — same options AdminBookingAddPage
//   offers when creating a booking; kept in sync so the two pages never
//   disagree on what payment methods exist.
const PAYMENT_METHOD_OPTIONS = [
  { value: "cash",      label: "เงินสด (Cash)" },
  { value: "transfer",  label: "โอนเงิน (Transfer)" },
  { value: "card",      label: "บัตร (Card)" },
  { value: "promptpay", label: "PromptPay" },
  { value: "wechat",    label: "WeChat Pay" },
  { value: "alipay",    label: "Alipay" },
];
const paymentMethodLabel = (v?: string): string =>
  PAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label ?? (v || "—");

const DetailPanel: React.FC<{
  booking: Booking;
  therapists: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onTogglePaid: () => void;
  onSaveNote: (note: string) => void;
  onChangeStatus: (status: string) => void;
  onSaveDetails: (patch: Record<string, unknown>, auditDetail?: Record<string, unknown>) => void;
}> = ({ booking: b, therapists, onClose, onConfirm, onComplete, onCancel, onTogglePaid, onSaveNote, onChangeStatus, onSaveDetails }) => {
  const [note, setNote] = useState(b.adminNote ?? "");
  const cfg        = cfgFor(b.status);
  const isCancelled = b.status === "cancelled";
  const total      = isCancelled ? 0 : (b.totalPrice ?? b.total ?? 0);
  const paid        = isPaid(b);

  // 🆕 28s259/261 — edit-details form (customer/phone/date/time/location/
  //   therapist/payment method/price). Price was deliberately excluded in
  //   28s259 ("แก้ไม่ได้เพราะกระทบยอดที่คำนวณไว้แล้ว") — founder reversed
  //   that in 28s261 ("แก้ราคาได้ ทั้งหมด"): service price + taxi fee are
  //   now free-form numbers, with Total recomputed live (incl. the payment
  //   surcharge) so the operator sees the real total before saving.
  const [editing, setEditing] = useState(false);
  const startEdit = () => {
    setEditForm({
      therapistId: b.therapistId ?? "",
      contactName: nameOf(b),
      phone: b.phone ?? "",
      date: b.date || (b.startAt?.toDate ? fmtBKK(b.startAt.toDate(), "YYYY-MM-DD") : dayjs().format("YYYY-MM-DD")),
      time: b.time || (b.startAt?.toDate ? fmtBKK(b.startAt.toDate(), "HH:mm") : "10:00"),
      location: b.locationName || b.address || "",
      payment: b.payment || "cash",
      servicePrice: String(b.servicePrice ?? 0),
      taxiFee: String(b.taxiFee ?? 0),
    });
    setEditing(true);
  };
  const [editForm, setEditForm] = useState({
    therapistId: b.therapistId ?? "",
    contactName: nameOf(b),
    phone: b.phone ?? "",
    date: b.date ?? "",
    time: b.time ?? "",
    location: b.locationName || b.address || "",
    payment: b.payment || "cash",
    servicePrice: String(b.servicePrice ?? 0),
    taxiFee: String(b.taxiFee ?? 0),
  });
  // Live totals for the edit form — recomputed from whatever's currently
  // typed, not the stored booking values.
  const editServicePrice = Number(editForm.servicePrice) || 0;
  const editTaxiFee      = Number(editForm.taxiFee) || 0;
  const editBaseTotal    = editServicePrice + editTaxiFee;
  const editSurcharge    = paymentSurcharge(editForm.payment, editBaseTotal);
  const editTotal        = editBaseTotal + editSurcharge;

  const saveEdit = () => {
    const startAt = Timestamp.fromDate(dayjs(`${editForm.date} ${editForm.time}`, "YYYY-MM-DD HH:mm").toDate());
    const newTherapist = therapists.find((t) => t.id === editForm.therapistId);
    const oldTotal = b.totalPrice ?? b.total ?? 0;
    // 🆕 28s261 — audit detail is a SEPARATE object from the Firestore patch
    //   (a prior draft of this accidentally put priceChangedFrom/To INTO the
    //   patch, which would have written those as real fields on the booking
    //   doc — caught before shipping).
    onSaveDetails(
      {
        contactName: editForm.contactName.trim(),
        customerName: editForm.contactName.trim(),
        phone: editForm.phone.trim(),
        date: editForm.date,
        time: editForm.time,
        payment: editForm.payment,
        servicePrice: editServicePrice,
        taxiFee: editTaxiFee,
        paymentFee: editSurcharge,
        totalPrice: editTotal,
        startAt,
        locationName: editForm.location.trim(),
        ...(editForm.therapistId && editForm.therapistId !== b.therapistId
          ? { therapistId: editForm.therapistId, therapistName: newTherapist?.name ?? b.therapistName }
          : {}),
      },
      editTotal !== oldTotal ? { priceChangedFrom: oldTotal, priceChangedTo: editTotal } : undefined
    );
    setEditing(false);
  };

  const dateLabel = b.startAt?.toDate
    ? fmtBKK(b.startAt.toDate(), "dddd D MMMM YYYY · HH:mm")
    : b.date && b.time
    ? `${fmtBKK(b.date, "dddd D MMMM YYYY")} · ${b.time}`
    : b.date ? fmtBKK(b.date, "dddd D MMMM YYYY") : "—";

  const createdLabel = b.createdAt
    ? fmtBKK(b.createdAt.toDate(), "D MMM YYYY · HH:mm")
    : "—";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* header */}
      <Box
        sx={{
          background: adminColor.panel2,
          borderBottom: `1px solid ${adminColor.line}`,
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
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: adminColor.text, letterSpacing: "-0.01em" }}>
              {b.therapistName}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mt: 0.3 }}>
              {getServiceLabel(b.serviceId, b.serviceName)}
              {b.duration && ` · ${b.duration} min`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close" sx={{ color: adminColor.muted, mt: -0.5 }}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* price strip */}
        <Box
          sx={{
            display: "flex", gap: 1, mt: 2,
            p: 1.5, borderRadius: "14px",
            background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
          }}
        >
          {[
            { label: "Service", value: formatTHB(isCancelled ? 0 : (b.servicePrice || 0)) },
            { label: "Taxi",    value: formatTHB(isCancelled ? 0 : (b.taxiFee     || 0)) },
            { label: "Total",   value: formatTHB(total) },
          ].map((s, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${adminColor.line}` : "none" }}>
              <Typography sx={{ ...adminFigureSx, fontSize: 16, color: adminColor.text, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* scrollable body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>

        {/* booking info */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Booking Info
          </Typography>
          {/* 🆕 28s259 (fix: "full detail แก้ไขไม่ได้") — toggles customer/
              phone/date/time/location/therapist into editable fields.
              Excludes service/duration/price on purpose (see saveDetails). */}
          {!editing && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startEdit}
              aria-label="Edit booking details"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                height: 26, padding: "0 10px", borderRadius: 999,
                background: adminColor.panel2, border: `1px solid ${adminColor.line2}`,
                color: adminColor.muted, fontFamily: SANS, fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}
            >
              <PencilSimple size={11} /> Edit
            </motion.button>
          )}
        </Box>
        <Box
          sx={{
            borderRadius: "14px", background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
            px: 1.75, py: 0.5, mb: editing ? 1.25 : 2,
          }}
        >
          {/* 🆕 28s259 (fix: "สถานนะ แก้ไขไม่ได้ Cancelled / Completed") —
              always-active override, works from ANY current status
              (un-cancel, mark refunded/no_show, revert completed, etc.).
              Independent of the "Edit" toggle below — status changes are a
              routine action, not a "fix a mistake" edit. */}
          <Row label="Status" value={
            <Select
              size="small"
              value={b.status in STATUS_CFG ? b.status : ""}
              onChange={(e) => onChangeStatus(e.target.value)}
              displayEmpty
              renderValue={() => (
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: cfg.badge.fg }}>
                  {cfg.label}
                </Typography>
              )}
              sx={{
                fontSize: 12, height: 28, minWidth: 120,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
              }}
              MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
            >
              {ALL_STATUSES.map((s) => (
                <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{cfgFor(s).label}</MenuItem>
              ))}
            </Select>
          } />
          <Divider sx={{ opacity: 0.4 }} />

          {editing ? (
            <>
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Therapist</Typography>
                <Select
                  size="small" fullWidth
                  value={editForm.therapistId}
                  onChange={(e) => setEditForm((f) => ({ ...f, therapistId: e.target.value }))}
                  sx={{ fontSize: 13, "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 } }}
                  MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
                >
                  {!therapists.some((t) => t.id === editForm.therapistId) && editForm.therapistId && (
                    <MenuItem value={editForm.therapistId}>{b.therapistName}</MenuItem>
                  )}
                  {therapists.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Customer</Typography>
                <InputBase
                  fullWidth value={editForm.contactName}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))}
                  sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: "10px", px: 1.25, py: 0.5 }}
                />
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Phone</Typography>
                <InputBase
                  fullWidth value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: "10px", px: 1.25, py: 0.5 }}
                />
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
              <Box sx={{ py: 1, display: "flex", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Date</Typography>
                  <input
                    type="date" value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    style={{ width: "100%", fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: 10, padding: "6px 10px", boxSizing: "border-box", background: "transparent" }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Time</Typography>
                  <input
                    type="time" value={editForm.time}
                    onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                    style={{ width: "100%", fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: 10, padding: "6px 10px", boxSizing: "border-box", background: "transparent" }}
                  />
                </Box>
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Location</Typography>
                <InputBase
                  fullWidth multiline minRows={2} value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: "10px", px: 1.25, py: 0.5 }}
                />
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
              {/* 🆕 28s261 (founder: "แก้ราคาได้ ทั้งหมด") — reverses the
                  28s259 exclusion. Free-form Service/Taxi numbers; Total is
                  ALWAYS derived (service + taxi + surcharge), never itself
                  editable, so it can't drift from its own inputs. */}
              <Box sx={{ py: 1, display: "flex", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Service price (฿)</Typography>
                  <input
                    type="number" min={0} step={10} value={editForm.servicePrice}
                    onChange={(e) => setEditForm((f) => ({ ...f, servicePrice: e.target.value }))}
                    style={{ width: "100%", fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: 10, padding: "6px 10px", boxSizing: "border-box", background: "transparent" }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>Taxi fee (฿)</Typography>
                  <input
                    type="number" min={0} step={10} value={editForm.taxiFee}
                    onChange={(e) => setEditForm((f) => ({ ...f, taxiFee: e.target.value }))}
                    style={{ width: "100%", fontFamily: SANS, fontSize: 13, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: 10, padding: "6px 10px", boxSizing: "border-box", background: "transparent" }}
                  />
                </Box>
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.muted, fontWeight: 600, mb: 0.5 }}>
                  Payment method
                </Typography>
                <Select
                  size="small" fullWidth
                  value={editForm.payment}
                  displayEmpty
                  onChange={(e) => setEditForm((f) => ({ ...f, payment: e.target.value }))}
                  renderValue={(v) => (
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text }}>
                      {paymentMethodLabel(v as string) === "—" ? "Select…" : paymentMethodLabel(v as string)}
                    </Typography>
                  )}
                  sx={{ fontSize: 13, "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 } }}
                  MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
                >
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
                {/* 🆕 28s260/261 — live preview off the CURRENTLY TYPED service
                    + taxi, not the stale stored values, so the surcharge and
                    the final total are always accurate to what's on screen. */}
                {editSurcharge > 0 && (
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.amber, mt: 0.5 }}>
                    + {formatTHB(editSurcharge)} transfer surcharge will be added to the total
                  </Typography>
                )}
                <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.text, fontWeight: 700, mt: 0.75 }}>
                  New total: <Box component="span" sx={{ ...adminFigureSx, fontSize: 13, color: adminColor.accent }}>{formatTHB(editTotal)}</Box>
                </Typography>
              </Box>
              <Divider sx={{ opacity: 0.4 }} />
            </>
          ) : (
            <>
              <Row label="Therapist" value={b.therapistName} />
              <Divider sx={{ opacity: 0.4 }} />
              <Row label="Customer"  value={nameOf(b)} />
              <Divider sx={{ opacity: 0.4 }} />
              <Row
                label="Phone"
                value={
                  b.phone ? (
                    <Typography
                      component="a"
                      href={`tel:${b.phone}`}
                      sx={{ fontFamily: SANS, fontWeight: 700, color: adminColor.green, textDecoration: "none" }}
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
              <Divider sx={{ opacity: 0.4 }} />
              <Row
                label="Payment method"
                value={`${paymentMethodLabel(b.payment)}${b.paymentFee ? ` (+${formatTHB(b.paymentFee)} surcharge)` : ""}`}
              />
            </>
          )}

          {b.placeDetail && <><Divider sx={{ opacity: 0.4 }} /><Row label="Detail" value={b.placeDetail} /></>}
          {b.cancelReason && <><Divider sx={{ opacity: 0.4 }} /><Row label="Cancel reason" value={b.cancelReason} /></>}
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Booked"    value={createdLabel} />
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Payment status" value={
            <Box
              component="span"
              onClick={onTogglePaid}
              role="button"
              sx={{
                px: "10px", py: "3px", borderRadius: 999, cursor: "pointer",
                background: paid ? `${adminColor.green}1F` : adminColor.panel2,
                color: paid ? adminColor.green : adminColor.muted,
                fontFamily: SANS, fontSize: 11, fontWeight: 700,
                userSelect: "none",
              }}
            >
              {paid ? "✓ Paid" : "Unpaid — tap to mark paid"}
            </Box>
          } />
          <Divider sx={{ opacity: 0.4 }} />
          <Row label="Booking ID" value={b.id} />
        </Box>

        {editing && (
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setEditing(false)}
              style={{
                flex: 1, height: 38, borderRadius: 999,
                background: adminColor.panel2, border: `1px solid ${adminColor.line2}`,
                fontFamily: SANS, fontSize: 13, fontWeight: 600, color: adminColor.muted, cursor: "pointer",
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={saveEdit}
              style={{
                flex: 1, height: 38, borderRadius: 999,
                background: adminColor.accent, border: "none",
                fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <FloppyDisk size={14} /> Save changes
            </motion.button>
          </Box>
        )}

        {/* admin note */}
        <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1 }}>
          Admin Note
        </Typography>
        <Box
          sx={{
            borderRadius: "14px", background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
            px: 1.75, py: 1, mb: 2,
          }}
        >
          <InputBase
            placeholder="Type a note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, width: "100%" }}
          />
        </Box>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSaveNote(note)}
          style={{
            width: "100%", height: 38, borderRadius: 999,
            background: adminColor.panel2,
            border: `1px solid ${adminColor.line2}`,
            fontFamily: SANS, fontSize: 13, fontWeight: 600,
            color: adminColor.muted, cursor: "pointer", marginBottom: 12,
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
          background: adminColor.panel,
          borderTop: `1px solid ${adminColor.line}`,
          display: "flex", gap: 1,
        }}
      >
        {b.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            style={{
              flex: 1, height: 48, borderRadius: 999,
              background: adminColor.accent,
              color: "#fff", fontFamily: SANS, fontSize: 15, fontWeight: 700,
              border: "none", cursor: "pointer",
              boxShadow: "0 6px 18px rgba(78,126,140,0.30)",
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
                background: adminColor.green,
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
              aria-label="Cancel booking"
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `${adminColor.red}14`,
                border: `1px solid ${adminColor.red}33`, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <XCircle size={22} color={adminColor.red} weight="fill" />
            </motion.button>
          </>
        )}
        {b.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            aria-label="Cancel booking"
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${adminColor.red}14`,
              border: `1px solid ${adminColor.red}33`, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <XCircle size={22} color={adminColor.red} weight="fill" />
          </motion.button>
        )}
        {(b.status === "completed" || b.status === "cancelled") && (
          <Box sx={{ flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim, fontWeight: 600 }}>
              {b.status === "completed" ? "Session completed" : "Booking cancelled"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AdminBookingListPage;
