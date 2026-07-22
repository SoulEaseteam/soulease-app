// src/pages/admin/AdminDashboardPage.tsx
//
// 🆕 Round 28c19 (founder 2026-05-06) — full SunRed redesign.
//   Dark hero + today strip + period cards + pending quick-confirm +
//   responsive charts + quick-link tiles. Matches Bookings/Reports style.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  CalendarBlank,
  CheckCircle,
  XCircle,
  ChartBar,
  Buildings,
  Users,
  UserCircle,
  Sparkle,
  ArrowRight,
  PlusCircle,
  ClipboardText,
  Eye,
  TrendUp,
  TrendDown,
  Medal,
  Wallet,
  Coins,
  Crown,
} from "phosphor-react";
import { fmtBKK } from "@/utils/time";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
// 🆕 Round 28s319 — tier-based split (shared payroll fn) so the dashboard's
//   shop cut matches Earnings / Pay-Therapists instead of a stale flat 40%.
// 🆕 Round 28s321 — also share isPayrollExcluded + commissionBaseFor so the
//   dashboard reconciles with Reports/Earnings (same exclusions, same shop base).
import { therapistPayoutFor, isPayrollExcluded, commissionBaseFor, noShowCompFor } from "@/utils/commission";
// 🆕 Round 28s234 — Control Room redesign (shared dark tokens).
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";

dayjs.extend(relativeTime);

const SANS  = adminFont.sans;


/** Lightweight CSS conic-gradient ring — no chart-library overhead for a single %. */
const DonutRing: React.FC<{ percent: number; color: string; size?: number; thickness?: number }> = ({
  percent, color, size = 84, thickness = 9,
}) => {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <Box
      sx={{
        position: "relative", width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `conic-gradient(${color} ${pct * 3.6}deg, ${adminColor.panel3} 0deg)`,
      }}
    >
      <Box
        sx={{
          position: "absolute", inset: thickness, borderRadius: "50%",
          background: adminColor.panel,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Typography sx={{ ...adminFigureSx, fontSize: size / 4.6, color: adminColor.text, lineHeight: 1 }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
  );
};

// ── types ─────────────────────────────────────────────────────────────
type FBTS = Timestamp | { seconds: number } | Date | string | null | undefined;

interface BookingRow {
  id?: string;
  createdAt?: FBTS;
  startAt?: Timestamp;
  date?: string;
  time?: string;
  status?: string;
  therapistId?: string;
  therapistName?: string;
  serviceId?: string;
  serviceName?: string;
  userName?: string;
  // 🆕 Round 28s230 — real customer name/phone live on contactName (customer
  //   flow) / customerName (admin add); userName was always blank.
  contactName?: string;
  customerName?: string;
  phone?: string;
  needsAdminReview?: boolean;
  locationName?: string;
  address?: string;
  servicePrice?: number;
  discountAmount?: number;
  taxiFee?: number;
  totalPrice?: number;
  duration?: number;
  therapistShare?: number;   // 🆕 28w.51 — split frozen at confirm/lock time
}

function toDate(v: FBTS): Date | null {
  try {
    if (!v) return null;
    if (typeof (v as any).toDate === "function") return (v as any).toDate();
    if (typeof (v as any).seconds === "number") return new Date((v as any).seconds * 1000);
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    return null;
  } catch { return null; }
}

const money = (n: number) => `฿${Number(n || 0).toLocaleString()}`;

// ── fade animation helper ──────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  transition: { duration: 0.22, ease: "easeOut" as const, delay },
});

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down("sm"));

  // ── filters ─────────────────────────────────────────────────────
  const [startDate,       setStartDate]       = useState<Dayjs>(dayjs().startOf("month"));
  const [endDate,         setEndDate]         = useState<Dayjs>(dayjs().endOf("month"));
  const [statusFilter,    setStatusFilter]    = useState("__ALL__");
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");

  // ── data ─────────────────────────────────────────────────────────
  const [loading,          setLoading]         = useState(true);
  const [allRows,          setAllRows]         = useState<BookingRow[]>([]);
  const [pendingBookings,  setPendingBookings] = useState<BookingRow[]>([]);
  const [counts,           setCounts]          = useState({ users: 0, therapists: 0, services: 0 });
  const [therapistOptions, setTherapistOptions] = useState<string[]>([]);
  // 🆕 Round 28s323 — lifetime totals (all bookings, no date filter), computed
  //   with the same rules as every other page: the real per-job therapist
  //   split (locked stamp → table → 60%), promo applied, cancelled/refunded
  //   excluded. Loaded once.
  // 🆕 Round 28r36 (founder 2026-05-07) — expanded to also track:
  //   • openedAtMs — earliest booking createdAt → "days since opening"
  //   • thisMonthShop / prevMonthShop → month-over-month delta chip
  //   Same single Firestore read — three passes over the same snap.
  const [lifetime, setLifetime] = useState({
    jobs: 0,
    service: 0,
    shop: 0,
    openedAtMs: 0,
    thisMonthShop: 0,
    prevMonthShop: 0,
  });

  const todayStart = useMemo(() => dayjs().startOf("day").toDate(), []);

  // ── lifetime cumulative revenue (all-time, one-shot read) ────────
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "bookings"));
      let jobs = 0, service = 0, shop = 0;
      let openedAtMs = Number.MAX_SAFE_INTEGER;
      let thisMonthShop = 0;
      let prevMonthShop = 0;
      const now = dayjs();
      const thisMonthStart = now.startOf("month").valueOf();
      const prevMonthStart = now.subtract(1, "month").startOf("month").valueOf();
      // createdAt can be a Timestamp, Date, string, or a raw { seconds } shape
      //   depending on where the doc was written (customer flow / admin add /
      //   legacy backfill). Normalise to ms via a permissive helper.
      const toMs = (c: unknown): number => {
        if (c && typeof c === "object") {
          const anyC = c as { toDate?: () => Date; seconds?: number };
          if (typeof anyC.toDate === "function") return anyC.toDate().getTime();
          if (typeof anyC.seconds === "number") return anyC.seconds * 1000;
          if (c instanceof Date) return c.getTime();
        } else if (typeof c === "string") {
          const t = Date.parse(c);
          if (!Number.isNaN(t)) return t;
        }
        return 0;
      };
      snap.forEach((d) => {
        const b = d.data() as BookingRow;
        const createdMs = toMs(b.createdAt);

        // 🆕 28w.53 — a no-show costs the shop the therapist's taxi comp
        //   (max ฿200 / actual fare) even though nothing was collected; other
        //   cancels touch nothing. Books reconcile: shop −comp, therapist +comp.
        if (isPayrollExcluded(b.status)) {
          const comp = noShowCompFor(b);
          if (comp > 0) {
            shop -= comp;
            if (createdMs >= thisMonthStart) thisMonthShop -= comp;
            else if (createdMs >= prevMonthStart) prevMonthShop -= comp;
          }
          return;
        }

        const svc = b.servicePrice || 0;
        // 🆕 28w.51 — pass the FULL booking (duration + frozen therapistShare)
        //   so the shop cut reads the locked split first, then the table, then
        //   60% — identical to the Bookings & Reports pages. Passing a stripped
        //   object (as before) always fell through to a flat 60/40, so the
        //   Dashboard's "shop net" disagreed with every other surface.
        const worker = therapistPayoutFor({ serviceId: b.serviceId, servicePrice: svc, discountAmount: b.discountAmount, duration: b.duration, therapistShare: b.therapistShare });
        const base   = commissionBaseFor({ servicePrice: svc, discountAmount: b.discountAmount });                          // service − promo
        const shopCut = Math.max(0, base - worker);
        jobs += 1;
        service += svc;
        shop += shopCut;                                 // shop cut after the real therapist split

        if (createdMs > 0 && createdMs < openedAtMs) openedAtMs = createdMs;  // earliest booking = "opening day"
        // this month / previous month — for MoM delta
        if (createdMs >= thisMonthStart) thisMonthShop += shopCut;
        else if (createdMs >= prevMonthStart) prevMonthShop += shopCut;
      });
      setLifetime({
        jobs,
        service,
        shop,
        openedAtMs: openedAtMs === Number.MAX_SAFE_INTEGER ? 0 : openedAtMs,
        thisMonthShop,
        prevMonthShop,
      });
    })();
  }, []);

  // ── collection counts ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [u, t, s] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "therapists")),
        getDocs(collection(db, "services")),
      ]);
      setCounts({ users: u.size, therapists: t.size, services: s.size });
    })();
  }, []);

  // ── pending bookings (always fresh, not date-filtered) ───────────
  useEffect(() => {
    const q = query(collection(db, "bookings"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setPendingBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BookingRow)));
    });
  }, []);

  // ── range bookings ───────────────────────────────────────────────
  // 🆕 Round 28s320 — query ONLY the date range in Firestore; status +
  //   therapist are filtered client-side in the stats memo below. The old
  //   code appended where("status"/"therapistId") clauses, which (a) needed
  //   composite indexes that don't exist → the listener errored silently and
  //   the numbers froze ("ค่าไม่ปรับ"), and (b) filtered therapistId by the
  //   dropdown's NAME value, so it could never match. Client-side is index-free
  //   and correct (the date range already bounds the row count).
  useEffect(() => {
    const s = Timestamp.fromDate(startDate.startOf("day").toDate());
    const e = Timestamp.fromDate(endDate.endOf("day").toDate());

    setLoading(true);
    return onSnapshot(
      query(
        collection(db, "bookings"),
        where("createdAt", ">=", s),
        where("createdAt", "<=", e),
        orderBy("createdAt", "asc"),
      ),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BookingRow));
        setAllRows(rows);
        // Options come from ALL rows in range (not the current filter) so the
        // therapist dropdown never collapses to just the selected one.
        setTherapistOptions([...new Set(rows.map((r) => r.therapistName || "").filter(Boolean))]);
        setLoading(false);
      },
      (err) => { console.error("[dashboard] range query failed:", err); setLoading(false); },
    );
  }, [startDate, endDate]);

  // ── derived stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    let todayBookings = 0, todayRevenue = 0, todayCancelled = 0;
    let periodBookings = 0, periodService = 0, periodCancelled = 0;
    // 🆕 Round 28s319 — accumulate the shop / therapist split per booking with
    //   the real tier %, so these reconcile with the Earnings page (the old
    //   flat ×0.4 / ×0.6 disagreed with tier-based payroll).
    let periodShop = 0, periodWorker = 0;
    const monthMap: Record<string, { bookings: number; revenue: number }> = {};
    // 🆕 Round 28s241 — ranked breakdowns for the "By Therapist" / "By Service"
    //   widgets (Sales-Report / Browser-Stats style rows in the reference).
    const byTherapistMap: Record<string, { name: string; bookings: number; revenue: number }> = {};
    const byServiceMap: Record<string, { name: string; bookings: number; revenue: number }> = {};

    // 🆕 Round 28s320 — status + therapist filters applied here (client-side,
    //   index-free). Therapist matches by NAME (the dropdown's value).
    const filteredRows = allRows.filter((r) =>
      (statusFilter    === "__ALL__" || r.status === statusFilter) &&
      (therapistFilter === "__ALL__" || (r.therapistName || "") === therapistFilter),
    );

    for (const r of filteredRows) {
      const created = toDate(r.createdAt);
      if (!created) continue;
      const service = r.servicePrice || 0;
      // 🆕 Round 28s321 — exclude the full payroll-excluded set (cancelled /
      //   refunded / no-show / rejected / failed), not just "cancelled", so
      //   revenue matches Reports & Earnings.
      const isCancelled = isPayrollExcluded(r.status);

      periodBookings++;
      if (!isCancelled) {
        periodService += service;
        // 🆕 Round 28s321 — shop share on the POST-discount base (service −
        //   discount) − payout, identical to Reports' `base − pay` and to
        //   Earnings' shopGross. The old `service − payout` used the full list
        //   price, over-counting shop revenue by the discount amount.
        const worker = therapistPayoutFor({ serviceId: r.serviceId, servicePrice: service, discountAmount: r.discountAmount, duration: r.duration, therapistShare: r.therapistShare });
        const base   = commissionBaseFor({ servicePrice: service, discountAmount: r.discountAmount });
        periodWorker += worker;
        periodShop   += Math.max(0, base - worker);
      } else {
        periodCancelled++;
        // 🆕 28w.53 — no-show: therapist taxi comp (max ฿200 / actual); shop
        //   bears it so the period books reconcile.
        const comp = noShowCompFor(r);
        periodWorker += comp;
        periodShop   -= comp;
      }

      if (created >= todayStart) {
        todayBookings++;
        if (!isCancelled) todayRevenue += service;
        if (isCancelled)  todayCancelled++;
      }

      const mKey = dayjs(created).format("MMM");
      if (!monthMap[mKey]) monthMap[mKey] = { bookings: 0, revenue: 0 };
      monthMap[mKey].bookings++;
      if (!isCancelled) monthMap[mKey].revenue += service;

      if (!isCancelled) {
        const tName = r.therapistName || "Unassigned";
        if (!byTherapistMap[tName]) byTherapistMap[tName] = { name: tName, bookings: 0, revenue: 0 };
        byTherapistMap[tName].bookings++;
        byTherapistMap[tName].revenue += service;

        // 🆕 Round 28s323 — key by the RESOLVED display label, normalized
        //   (letters+digits only, case-folded), not the raw serviceId/
        //   serviceName. This stops the same service splitting into two rows
        //   when one booking carries a serviceId and another only a
        //   serviceName, or when the label differs by punctuation/spacing
        //   (e.g. a straight ' vs a curly ' apostrophe in "Gentleman's
        //   Signature Therapy" → was ฿734,000 AND ฿8,800, now merged).
        const sName = getServiceLabel(r.serviceId, r.serviceName);
        const sKey = sName.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase() || "other";
        if (!byServiceMap[sKey]) byServiceMap[sKey] = { name: sName, bookings: 0, revenue: 0 };
        byServiceMap[sKey].bookings++;
        byServiceMap[sKey].revenue += service;
      }
    }

    const monthlyData = Object.entries(monthMap).map(([month, v]) => ({ month, ...v }));

    // Real month-over-month deltas (only shown when there's a prior month to
    // compare against — never fabricate a trend number without a baseline).
    let momBookingsChange: number | null = null;
    let momRevenueChange: number | null = null;
    if (monthlyData.length >= 2) {
      const prev = monthlyData[monthlyData.length - 2];
      const last = monthlyData[monthlyData.length - 1];
      if (prev.bookings > 0) momBookingsChange = Math.round(((last.bookings - prev.bookings) / prev.bookings) * 100);
      if (prev.revenue  > 0) momRevenueChange  = Math.round(((last.revenue  - prev.revenue)  / prev.revenue)  * 100);
    }

    // 🆕 Round 28s323 — show ALL therapists / services (no top-N slice) so the
    //   yearly breakdown pulls everything and reconciles with the totals.
    const byTherapist = Object.values(byTherapistMap).sort((a, b) => b.revenue - a.revenue);
    const byService   = Object.values(byServiceMap).sort((a, b) => b.revenue - a.revenue);
    const completionRate = periodBookings > 0
      ? Math.round(((periodBookings - periodCancelled) / periodBookings) * 100)
      : 0;
    const maxServiceRevenue = Math.max(1, ...byService.map((s) => s.revenue));

    return {
      todayBookings, todayRevenue, todayCancelled,
      periodBookings, periodService,
      periodShop,
      periodWorker,
      periodCancelled,
      monthlyData,
      momBookingsChange, momRevenueChange,
      byTherapist, byService, maxServiceRevenue,
      completionRate,
    };
  }, [allRows, todayStart, statusFilter, therapistFilter]);

  // ── confirm booking ──────────────────────────────────────────────
  const confirmBooking = async (id: string) => {
    // 🆕 Round 28s230 (FIX D) — settle the hold on confirm so the scheduler
    //   can't later mark the accepted order "expired".
    await updateDoc(doc(db, "bookings", id), {
      status: "confirmed",
      holdState: "confirmed",
      holdExpiresAt: null,
    });
    void logAdminAction("booking.confirm", { bookingId: id });
  };

  const todayLabel = dayjs().format("ddd D MMM YYYY");

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", pb: 10 }}>

      {/* ── header + hero + today strip — Round 28s234 Control Room ───
           🆕 Round 28r35 (founder 2026-05-07) — bilingual English-primary
           / Thai-subtitle labels + Lifetime Revenue hero card moved to
           top. Founder direction: "แก้ รายได้สะสมทั้งหมด · ตั้งแต่เปิดร้าน
           ไว้บนสุด · ใช้ภาษอังกฤษ กำกับภาษาไทยเล็กๆข้างล่าง". English is
           the operator-scan language (numbers + shorter labels read
           faster); Thai stays as a small subtitle so the meaning stays
           unambiguous when View glances between screens. */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 3, pb: 2.5 }}>
        <motion.div {...fadeUp(0)}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.4 }}>
            <Box>
              <Typography sx={{ fontFamily: adminFont.serif, fontSize: { xs: 24, md: 28 }, fontWeight: 600, color: adminColor.text, letterSpacing: "0.01em", lineHeight: 1 }}>
                Dashboard
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
                หน้าหลัก
              </Typography>
            </Box>
            {loading && <CircularProgress size={18} sx={{ color: adminColor.dim, mt: 0.5 }} />}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
            <CalendarBlank size={13} color={adminColor.dim} />
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>
              {todayLabel}
            </Typography>
          </Box>
        </motion.div>

        {/* ── 🆕 Round 28r35 → r36 — LIFETIME REVENUE HERO CARD.
             Moved from mid-dashboard to right below the page title so the
             first money figure View sees on open is the crown number.
             All-time, not date-filtered. Shop take = price − real therapist
             split (locked stamp / table / 60% fallback), cancelled excluded.
             r36 additions: MoM delta chip · days-since-opening + avg/day
             · animated shimmer border · richer three-column stats. */}
        <motion.div {...fadeUp(0.04)}>
          <Box
            sx={{
              mt: 2.25,
              borderRadius: "22px",
              background: `linear-gradient(135deg, ${adminColor.accent}26 0%, ${adminColor.panel} 55%, ${adminColor.panel} 100%)`,
              border: `1px solid ${adminColor.accent}44`,
              boxShadow: `0 10px 32px ${adminColor.accent}1E, 0 2px 4px rgba(0,0,0,0.06)`,
              p: { xs: "20px 18px 18px", md: "26px 28px 22px" },
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* corner glow — top-right */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${adminColor.accent}30 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            {/* corner glow — bottom-left, subtler */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                bottom: -80,
                left: -80,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${adminColor.accent}15 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            {/* eyebrow — bilingual + MoM delta chip on the right */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1.5, position: "relative" }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Crown size={15} color={adminColor.accent} weight="fill" />
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.accent, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1 }}>
                    Lifetime Revenue · Since Opening
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.4, ml: 2.75 }}>
                  รายได้สะสมทั้งหมด · ตั้งแต่เปิดร้าน
                </Typography>
              </Box>

              {/* MoM delta chip */}
              {(() => {
                if (lifetime.prevMonthShop <= 0) return null;
                const pct = Math.round(
                  ((lifetime.thisMonthShop - lifetime.prevMonthShop) / lifetime.prevMonthShop) * 100
                );
                const up = pct >= 0;
                const color = up ? adminColor.green : adminColor.red;
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1.25,
                      py: 0.6,
                      borderRadius: 999,
                      background: `${color}18`,
                      border: `1px solid ${color}44`,
                      flexShrink: 0,
                    }}
                  >
                    {up ? <TrendUp size={13} color={color} weight="bold" /> : <TrendDown size={13} color={color} weight="bold" />}
                    <Typography sx={{ ...adminFigureSx, fontSize: 12, color, lineHeight: 1 }}>
                      {up ? "+" : ""}{pct}%
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, color: adminColor.muted, ml: 0.4 }}>
                      MoM
                    </Typography>
                  </Box>
                );
              })()}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.6fr 1fr 1fr" }, gap: { xs: 2.5, sm: 2.5 }, alignItems: "center", position: "relative" }}>
              {/* hero shop-net column */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${adminColor.accent}, ${adminColor.accentDeep})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 6px 18px ${adminColor.accent}66, inset 0 1px 0 rgba(255,255,255,0.28)` }}>
                  <Wallet size={28} weight="duotone" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ ...adminFigureSx, fontSize: { xs: 36, md: 44 }, color: adminColor.text, lineHeight: 1, letterSpacing: "-0.015em" }}>
                    {money(lifetime.shop)}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.muted, mt: 0.55 }}>
                    Shop Net Earned
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.1 }}>
                    รายได้ร้านสะสม · หลังหักหมอ · ไม่รวมยกเลิก
                  </Typography>
                  {/* days-since-opening + avg/day sub-line */}
                  {lifetime.openedAtMs > 0 && (() => {
                    const days = Math.max(1, Math.round((Date.now() - lifetime.openedAtMs) / 86400000));
                    const avg  = Math.round(lifetime.shop / days);
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.8, flexWrap: "wrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 0.9, py: 0.35, borderRadius: 999, background: `${adminColor.accent}12`, border: `1px solid ${adminColor.accent}22` }}>
                          <CalendarBlank size={11} color={adminColor.accent} weight="duotone" />
                          <Typography sx={{ ...adminFigureSx, fontSize: 10.5, color: adminColor.text, lineHeight: 1 }}>
                            {days.toLocaleString()}
                          </Typography>
                          <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, color: adminColor.muted }}>
                            days
                          </Typography>
                        </Box>
                        <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim }}>
                          · avg {money(avg)}/day
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>
              </Box>

              {/* service revenue */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, borderLeft: { sm: `1px solid ${adminColor.accent}33` }, pl: { sm: 2 } }}>
                <Box sx={{ width: 38, height: 38, borderRadius: "50%", background: `${adminColor.highlight}18`, color: adminColor.highlight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5)` }}>
                  <ChartBar size={18} weight="duotone" />
                </Box>
                <Box>
                  <Typography sx={{ ...adminFigureSx, fontSize: { xs: 20, md: 23 }, color: adminColor.text, lineHeight: 1 }}>
                    {money(lifetime.service)}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, mt: 0.4, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
                    Gross Service
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.15 }}>
                    ค่าบริการสะสม
                  </Typography>
                </Box>
              </Box>

              {/* completed jobs */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, borderLeft: { sm: `1px solid ${adminColor.accent}33` }, pl: { sm: 2 } }}>
                <Box sx={{ width: 38, height: 38, borderRadius: "50%", background: `${adminColor.green}18`, color: adminColor.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5)` }}>
                  <CheckCircle size={18} weight="duotone" />
                </Box>
                <Box>
                  <Typography sx={{ ...adminFigureSx, fontSize: { xs: 20, md: 23 }, color: adminColor.text, lineHeight: 1 }}>
                    {lifetime.jobs.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, mt: 0.4, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
                    Sessions Delivered
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.15 }}>
                    งานสำเร็จสะสม
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>

        {/* today strip — 🆕 Round 28r35 bilingual labels */}
        <motion.div {...fadeUp(0.07)}>
          <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "16px", background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
            {[
              { en: "Today",        th: "วันนี้",       value: stats.todayBookings },
              { en: "Today Revenue", th: "รายได้วันนี้", value: money(stats.todayRevenue) },
              { en: "Pending",      th: "รอยืนยัน",     value: pendingBookings.length,  accent: pendingBookings.length > 0 },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${adminColor.line}` : "none" }}>
                <Typography sx={{ ...adminFigureSx, fontSize: 19, color: s.accent ? adminColor.accent : adminColor.text, lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, color: adminColor.muted, mt: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.en}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9, color: adminColor.dim, mt: 0.1 }}>
                  {s.th}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>

        {/* ── pending quick actions ────────────────────────────────────── */}
        {pendingBookings.length > 0 && (
          <motion.div {...fadeUp(0.05)}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: adminColor.accent, boxShadow: `0 0 0 3px ${adminColor.accent}33` }} />
                <Box>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.accent, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 }}>
                    Pending Confirmations — {pendingBookings.length}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
                    รอยืนยัน
                  </Typography>
                </Box>
              </Box>
              <Box
                onClick={() => navigate("/admin/bookings")}
                sx={{ display: "flex", alignItems: "center", gap: 0.4, cursor: "pointer" }}
              >
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.muted }}>View all · ดูทั้งหมด</Typography>
                <ArrowRight size={13} color={adminColor.dim} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {pendingBookings.slice(0, 5).map((b, i) => {
                const dateLabel = b.startAt?.toDate
                  ? fmtBKK(b.startAt.toDate(), "ddd D MMM · HH:mm")
                  : b.date && b.time ? `${fmtBKK(b.date, "ddd D MMM")} · ${b.time}`
                  : b.date ? fmtBKK(b.date, "ddd D MMM") : "—";

                return (
                  <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                    <Box
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        p: "12px 14px",
                        borderRadius: "14px",
                        background: adminColor.panel,
                        border: `1px solid ${adminColor.accent}33`,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                      }}
                    >
                      {/* red dot */}
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: adminColor.accent, flexShrink: 0 }} />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: adminColor.text, lineHeight: 1.2, mb: 0.2 }}>
                          {b.therapistName}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getServiceLabel(b.serviceId, b.serviceName)} · {dateLabel}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.1 }}>
                          👤 {b.userName || b.contactName || b.customerName || "—"}
                          {b.phone && (
                            <>
                              {" · "}
                              <Box
                                component="a"
                                href={`tel:${b.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ color: adminColor.green, fontWeight: 700, textDecoration: "none" }}
                              >
                                📞 {b.phone}
                              </Box>
                            </>
                          )}
                        </Typography>
                        {b.needsAdminReview && (
                          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.accent, mt: 0.2 }}>
                            ⚠️ เช็คก่อนยืนยัน — หมอนวดอาจไม่ว่าง
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                        {(b.totalPrice || b.servicePrice) && (
                          <Typography sx={{ ...adminFigureSx, fontSize: 13.5, color: adminColor.highlight }}>
                            {formatTHB(b.totalPrice ?? b.servicePrice ?? 0)}
                          </Typography>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => b.id && void confirmBooking(b.id)}
                          style={{
                            height: 34, padding: "0 14px", borderRadius: 999,
                            background: adminColor.accent,
                            color: "#fff", fontFamily: SANS, fontSize: 12, fontWeight: 700,
                            border: "none", cursor: "pointer",
                            boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <CheckCircle size={13} weight="fill" /> ยืนยัน
                        </motion.button>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}
            </Box>
          </motion.div>
        )}

        {/* ── filter bar ───────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.08)}>
          <Box
            sx={{
              borderRadius: "16px",
              background: adminColor.panel,
              border: `1px solid ${adminColor.line}`,
              p: "14px 16px",
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
              "& .MuiInputBase-root": { color: adminColor.text },
              "& .MuiInputLabel-root": { color: adminColor.muted },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
              "& .MuiSvgIcon-root": { color: adminColor.muted },
            }}
          >
            <Box sx={{ mr: 0.5 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
                Filter
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 9, color: adminColor.dim, mt: 0.2 }}>
                ช่วงเวลา
              </Typography>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="ตั้งแต่"
                value={startDate}
                onChange={(v) => v && setStartDate(v)}
                slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
              />
              <DatePicker
                label="ถึง"
                value={endDate}
                onChange={(v) => v && setEndDate(v)}
                slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
              />
            </LocalizationProvider>

            <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 130, fontSize: 13 }} MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" } } }}>
              <MenuItem value="__ALL__">ทุกสถานะ</MenuItem>
              <MenuItem value="pending">รอยืนยัน</MenuItem>
              <MenuItem value="confirmed">ยืนยันแล้ว</MenuItem>
              <MenuItem value="completed">เสร็จสิ้น</MenuItem>
              <MenuItem value="cancelled">ยกเลิก</MenuItem>
            </Select>

            {therapistOptions.length > 0 && (
              <Select size="small" value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)} sx={{ minWidth: 150, fontSize: 13 }} MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" } } }}>
                <MenuItem value="__ALL__">หมอทุกคน</MenuItem>
                {therapistOptions.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            )}
          </Box>
        </motion.div>

        {/* ── period stat icon row — 🆕 Round 28s241, circular-icon widget
             style borrowed from the reference "Statistics" section ────── */}
        <motion.div {...fadeUp(0.10)}>
          <Box sx={{ mb: 1.25 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
              Period Summary — {startDate.format("D MMM")} → {endDate.format("D MMM YYYY")}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
              สรุปช่วงเวลา
            </Typography>
          </Box>
          <Box
            sx={{
              borderRadius: "18px", background: adminColor.panel,
              border: `1px solid ${adminColor.line}`,
              boxShadow: "0 2px 10px rgba(31,41,51,0.04)",
              p: "20px 16px",
              display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 2,
            }}
          >
            {[
              { icon: <CalendarBlank size={20} weight="duotone" />, en: "Total Jobs",     th: "งานทั้งหมด",   value: String(stats.periodBookings), color: adminColor.accent },
              { icon: <ChartBar      size={20} weight="duotone" />, en: "Gross Service",  th: "ค่าบริการรวม",  value: money(stats.periodService),   color: adminColor.green },
              { icon: <Buildings     size={20} weight="duotone" />, en: "Shop Revenue",   th: "รายได้ร้าน",    value: money(stats.periodShop),      color: adminColor.highlight },
              { icon: <XCircle       size={20} weight="duotone" />, en: "Cancelled",      th: "ยกเลิก",       value: String(stats.periodCancelled), color: adminColor.red },
            ].map((c) => (
              <Box
                key={c.en}
                sx={{
                  display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0.6,
                  p: "8px 4px",
                  borderRadius: "12px",
                  transition: "background 0.18s ease, transform 0.18s ease",
                  "&:hover": {
                    background: `${c.color}0A`,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 46, height: 46, borderRadius: "50%",
                    background: `${c.color}1A`, color: c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px ${c.color}22`,
                  }}
                >
                  {c.icon}
                </Box>
                <Typography sx={{ ...adminFigureSx, fontSize: 18, color: adminColor.text, lineHeight: 1 }}>
                  {c.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1 }}>
                  {c.en}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9, color: adminColor.dim, mt: -0.2 }}>
                  {c.th}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>

        {/* ── revenue chart + completion ring + orders — 🆕 Round 28s241,
             mirrors the reference's "Revenue Report / Budget / Orders" row */}
        {stats.monthlyData.length > 0 && (
          <motion.div {...fadeUp(0.12)}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5 }}>
              <Box sx={{ flex: { md: "2 1 0" }, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px 16px 12px" }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
                    Monthly Revenue
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
                    รายได้รายเดือน
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
                  <BarChart data={stats.monthlyData} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={adminColor.line} />
                    <XAxis dataKey="month" tick={{ fontFamily: SANS, fontSize: 11, fill: adminColor.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: SANS, fontSize: 10, fill: adminColor.dim }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ fontFamily: SANS, fontSize: 12, borderRadius: 10, background: adminColor.panel2, border: `1px solid ${adminColor.line2}`, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", color: adminColor.text }}
                      formatter={(value, name) => [name === "revenue" ? money(Number(value)) : value, name === "revenue" ? "รายได้" : "งาน"]}
                    />
                    <Bar dataKey="bookings" fill={adminColor.panel3} radius={[4,4,0,0]} name="bookings" />
                    <Bar dataKey="revenue"  fill={adminColor.accent} radius={[4,4,0,0]} name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <Box sx={{ flex: { md: "1 1 0" }, display: "flex", flexDirection: "column", gap: 1.5 }}>
                {/* completion-rate ring */}
                <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px", display: "flex", alignItems: "center", gap: 1.5 }}>
                  <DonutRing percent={stats.completionRate} color={adminColor.accent} />
                  <Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1 }}>
                      Completion Rate
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 9, color: adminColor.dim, mt: 0.2 }}>
                      อัตราจบงาน
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4 }}>
                      {stats.periodBookings - stats.periodCancelled} จาก {stats.periodBookings} งาน
                    </Typography>
                  </Box>
                </Box>

                {/* orders sparkline */}
                <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1 }}>
                        Orders Today
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: 9, color: adminColor.dim, mt: 0.2 }}>
                        งานวันนี้
                      </Typography>
                      <Typography sx={{ ...adminFigureSx, fontSize: 23, color: adminColor.text, lineHeight: 1.2, mt: 0.4 }}>
                        {stats.todayBookings}
                      </Typography>
                    </Box>
                    {stats.momBookingsChange !== null && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, color: stats.momBookingsChange >= 0 ? adminColor.green : adminColor.red }}>
                        {stats.momBookingsChange >= 0 ? <TrendUp size={13} weight="bold" /> : <TrendDown size={13} weight="bold" />}
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700 }}>
                          {Math.abs(stats.momBookingsChange)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <ResponsiveContainer width="100%" height={44}>
                    <AreaChart data={stats.monthlyData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                      <Area type="monotone" dataKey="bookings" stroke={adminColor.accent} strokeWidth={2} fill={`${adminColor.accent}22`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* ── by therapist + by service — 🆕 Round 28s241, Sales-Report /
             Browser-Stats style ranked breakdown rows ─────────────────── */}
        {(stats.byTherapist.length > 0 || stats.byService.length > 0) && (
          <motion.div {...fadeUp(0.13)}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5 }}>
              <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
                    By Therapist
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
                    แยกตามหมอ
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
                  {stats.byTherapist.map((t, i) => (
                    <Box key={t.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? `${adminColor.accent}22` : adminColor.panel2, color: i === 0 ? adminColor.accent : adminColor.dim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i === 0 ? <Medal size={12} weight="fill" /> : <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</Typography>}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: adminColor.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim }}>
                          {t.bookings} งาน
                        </Typography>
                      </Box>
                      <Typography sx={{ ...adminFigureSx, fontSize: 12.5, color: adminColor.highlight, flexShrink: 0 }}>
                        {money(t.revenue)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
                    By Service
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
                    แยกตามบริการ
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {stats.byService.map((s) => (
                    <Box key={s.name}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.text }}>{s.name}</Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim }}>{money(s.revenue)}</Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 999, background: adminColor.panel3, overflow: "hidden" }}>
                        <Box sx={{ height: "100%", width: `${(s.revenue / stats.maxServiceRevenue) * 100}%`, background: adminColor.accent, borderRadius: 999 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* ── platform counts ─────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.15)}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1.5 }}>
            {[
              { icon: <Users       size={16} weight="duotone" />, label: "ลูกค้า",   value: counts.users,      onClick: () => navigate("/admin/users") },
              { icon: <UserCircle  size={16} weight="duotone" />, label: "หมอนวด",   value: counts.therapists, onClick: () => navigate("/admin/therapists") },
              { icon: <Sparkle     size={16} weight="duotone" />, label: "บริการ",   value: counts.services,   onClick: () => navigate("/admin/pages-list") },
            ].map((c) => (
              <Box
                key={c.label}
                onClick={c.onClick}
                sx={{
                  borderRadius: "14px", background: adminColor.panel,
                  border: `1px solid ${adminColor.line}`,
                  p: "12px 14px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 1,
                  "&:active": { background: adminColor.panel2 },
                }}
              >
                <Box sx={{ color: adminColor.accent }}>{c.icon}</Box>
                <Box>
                  <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.text, lineHeight: 1 }}>{c.value}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </motion.div>

        {/* ── quick action tiles ───────────────────────────────────────── */}
        <motion.div {...fadeUp(0.16)}>
          <Box sx={{ mb: 1.25 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
              Quick Actions
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
              เมนูด่วน
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3,1fr)" }, gap: 1.25 }}>
            {[
              { icon: <PlusCircle    size={22} weight="duotone" />, label: "จองใหม่",      path: "/admin/bookings/add",   accent: true  },
              { icon: <Coins         size={22} weight="duotone" />, label: "จ่ายเงินหมอ",   path: "/admin/pay-therapists", accent: false },
              { icon: <Wallet        size={22} weight="duotone" />, label: "รายได้ร้าน",    path: "/admin/earnings",       accent: false },
              { icon: <ClipboardText size={22} weight="duotone" />, label: "รายการจอง",     path: "/admin/bookings",       accent: false },
              { icon: <ChartBar      size={22} weight="duotone" />, label: "รายงาน",        path: "/admin/reports",        accent: false },
              { icon: <Eye           size={22} weight="duotone" />, label: "ดูเว็บไซต์",     path: "/",                     accent: false, blank: true },
            ].map((t) => (
              <motion.button
                key={t.label}
                whileTap={{ scale: 0.97 }}
                onClick={() => t.blank ? window.open(t.path, "_blank") : navigate(t.path)}
                style={{
                  borderRadius: 16, padding: "16px 12px",
                  background: t.accent ? adminColor.accent : adminColor.panel,
                  border: t.accent ? "none" : `1px solid ${adminColor.line}`,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  boxShadow: t.accent ? "0 4px 14px rgba(0,0,0,0.35)" : "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                <Box sx={{ color: t.accent ? "#fff" : adminColor.accent }}>{t.icon}</Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: t.accent ? "#fff" : adminColor.text }}>
                  {t.label}
                </Typography>
              </motion.button>
            ))}
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default AdminDashboardPage;
