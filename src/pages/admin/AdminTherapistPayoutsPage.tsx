// src/pages/admin/AdminTherapistPayoutsPage.tsx
//
// 🆕 Round 28s313 (founder: "เพิ่มเมนู ระบบ กดจ่ายเงินหมอ · ดึงบุคกิ้งจาก
//   ลูกค้าจ่ายแบบโอน") — a "pay the therapist" queue sourced from every
//   completed booking the customer paid NON-CASH (transfer / PromptPay /
//   WeChat / Alipay / card). That money went to the shop's account, so the
//   shop owes the therapist their cut; cash is collected in hand so nothing
//   is owed. Filter = "ทุกแบบที่ไม่ใช่เงินสด".
//
// 🆕 Round 28s314 (founder: "เพิ่มตัวกรอง และวันที่ · เพิ่มพังชั่นโอนเงิน
//   พร้อมผูกเลขบัญชีของพนักงานแต่ละคน · ทุกยอดกดดูรายละเอียดได้จริงจาก
//   admin/bookings") — added a date-range + therapist + customer-paid filter,
//   surfaced each therapist's bound bank account with a copy button for the
//   transfer, and made every job's amount deep-link into the real booking
//   detail at /admin/bookings?open=<id>.
//
// Storage: the paid flag lives on the booking doc (`therapistPaid`,
// `therapistPaidAt`, `therapistPaidBy`). Bank details live on the therapist
// doc (`bankName`, `bankAccount`, `bankAccountName`, editable on the
// therapist detail page). Admin already has full read/write on both — no new
// collection or rule.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { CurrencyCircleDollar, Bank, Copy, Check } from "phosphor-react";

import { db, auth } from "@/lib/firebase";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";
import { therapistPayoutFor, isPayrollExcluded } from "@/utils/commission";

const SERIF = adminFont.serif;
const SANS = adminFont.sans;

// 🆕 Round 28s321 — "thismonth" (current calendar month) is the shared default
//   across Dashboard / Reports / Earnings so every page opens on the same window.
type Preset = "thismonth" | "d7" | "d30" | "d90" | "custom";
const PRESET_LABEL: Record<Preset, string> = {
  thismonth: "เดือนนี้",
  d7: "7 วัน",
  d30: "30 วัน",
  d90: "90 วัน",
  custom: "กำหนดเอง",
};
const PRESET_DAYS: Record<"d7" | "d30" | "d90", number> = { d7: 7, d30: 30, d90: 90 };

interface BankInfo {
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}

interface Job {
  id: string;
  therapistId: string;
  therapistName: string;
  serviceId?: string | null;
  serviceName?: string | null;
  status?: string;
  createdAt?: Timestamp | null;
  customerName?: string | null;
  customerPaid: boolean;
  // 🆕 Round 28s315 — the shop pays the therapist their service commission
  //   (tier %, "60%") PLUS the taxi fee (reimbursement for the trip). `payout`
  //   is the total; commission/taxi are kept for the breakdown line.
  commission: number;
  taxi: number;
  payout: number;
  therapistPaid: boolean;
  therapistPaidAt?: Timestamp | null;
}

type UnpaidGroup = { id: string; name: string; subtotal: number; jobs: Job[] };

// The booking `payment` field is written inconsistently across surfaces:
//   • customer flow  → a LABEL   ("Cash", "PromptPay", "WeChat Pay", …)
//   • admin add/edit → a raw VALUE ("cash", "transfer", "promptpay", …)
// Customer docs also carry `paymentMethodId` (the raw id). Cash is the ONLY
// method the therapist collects in hand, so treat anything NOT identifiably
// cash as non-cash (money that landed with the shop).
function isCashPayment(payment?: string | null, methodId?: string | null): boolean {
  const p = (payment ?? "").trim().toLowerCase();
  const m = (methodId ?? "").trim().toLowerCase();
  return m === "cash" || p === "cash" || p.startsWith("เงินสด");
}

const millis = (t?: Timestamp | null): number =>
  t && typeof t.toMillis === "function" ? t.toMillis() : 0;

const selectSx = {
  minWidth: 150,
  fontSize: 13,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
  color: adminColor.text,
};
const selectMenuProps = {
  PaperProps: {
    sx: {
      background: adminColor.panel2,
      color: adminColor.text,
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(31,41,51,0.15)",
    },
  },
};

const AdminTherapistPayoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Filters
  const [range, setRange] = useState<Preset>("thismonth");
  const [customStart, setCustomStart] = useState<Dayjs>(() => dayjs().subtract(30, "day").startOf("day"));
  const [customEnd, setCustomEnd] = useState<Dayjs>(() => dayjs());
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");
  const [paidOnly, setPaidOnly] = useState(false);

  // Therapist bank details (therapistId → account), loaded once from the
  // ADMIN-ONLY `payoutAccounts` collection (NOT the world-readable therapist
  // doc — bank numbers must never sit on a `read: if true` collection).
  const [bankMap, setBankMap] = useState<Record<string, BankInfo>>({});
  useEffect(() => {
    void getDocs(collection(db, "payoutAccounts")).then((snap) => {
      const m: Record<string, BankInfo> = {};
      snap.forEach((d) => {
        const data = d.data() as DocumentData;
        m[d.id] = {
          bankName: (data.bankName as string) || "",
          bankAccount: (data.bankAccount as string) || "",
          bankAccountName: (data.bankAccountName as string) || "",
        };
      });
      setBankMap(m);
    });
  }, []);

  // Bookings for the selected date range.
  useEffect(() => {
    setLoading(true);
    let start: Dayjs;
    let end: Dayjs | null = null;
    if (range === "custom") {
      start = customStart.startOf("day");
      end = customEnd.endOf("day");
    } else if (range === "thismonth") {
      start = dayjs().startOf("month");
    } else {
      start = dayjs().subtract(PRESET_DAYS[range], "day").startOf("day");
    }
    const constraints = [where("createdAt", ">=", Timestamp.fromDate(start.toDate()))];
    if (end) constraints.push(where("createdAt", "<=", Timestamp.fromDate(end.toDate())));
    const q = query(collection(db, "bookings"), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: Job[] = [];
        snap.forEach((d0) => {
          const d = d0.data() as DocumentData;
          const status = (d.status as string) ?? "";
          if (isPayrollExcluded(status)) return; // cancelled / refunded / no-show …
          if (isCashPayment(d.payment, d.paymentMethodId)) return; // cash → nothing owed
          const commission = therapistPayoutFor({
            serviceId: d.serviceId ?? null,
            servicePrice: d.servicePrice ?? null,
            discountAmount: d.discountAmount ?? null,
          });
          if (commission <= 0) return; // no service price yet → skip
          // 🆕 Round 28s315 — shop pays commission + taxi reimbursement.
          const taxi = (d.taxiFee as number) ?? 0;
          arr.push({
            id: d0.id,
            therapistId: (d.therapistId as string) ?? "(no therapist)",
            therapistName:
              (d.therapistName as string) ?? (d.therapistId as string) ?? "—",
            serviceId: d.serviceId ?? null,
            serviceName: d.serviceName ?? null,
            status,
            createdAt: d.createdAt ?? null,
            customerName: d.customerName ?? d.name ?? null,
            customerPaid: (d.paid as boolean) ?? d.paymentStatus === "paid",
            commission,
            taxi,
            payout: commission + taxi,
            therapistPaid: !!d.therapistPaid,
            therapistPaidAt: d.therapistPaidAt ?? null,
          });
        });
        setJobs(arr);
        setLoading(false);
      },
      (err) => {
        console.error("[therapist-payouts] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [range, customStart, customEnd]);

  // Therapist filter options come from the date-filtered set only.
  const therapistOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of jobs) m.set(j.therapistId, j.therapistName);
    return [...m.entries()];
  }, [jobs]);

  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        if (therapistFilter !== "__ALL__" && j.therapistId !== therapistFilter) return false;
        if (paidOnly && !j.customerPaid) return false;
        return true;
      }),
    [jobs, therapistFilter, paidOnly]
  );

  const { groups, unpaidTotal, unpaidJobCount, paidJobs, paidTotal } = useMemo(() => {
    const unpaid = filtered.filter((j) => !j.therapistPaid);
    const paid = filtered.filter((j) => j.therapistPaid);
    const byT: Record<string, UnpaidGroup> = {};
    for (const j of unpaid) {
      if (!byT[j.therapistId]) {
        byT[j.therapistId] = { id: j.therapistId, name: j.therapistName, subtotal: 0, jobs: [] };
      }
      byT[j.therapistId].jobs.push(j);
      byT[j.therapistId].subtotal += j.payout;
    }
    const grouped = Object.values(byT)
      .map((g) => ({ ...g, jobs: g.jobs.sort((a, b) => millis(b.createdAt) - millis(a.createdAt)) }))
      .sort((a, b) => b.subtotal - a.subtotal);
    paid.sort((a, b) => millis(b.therapistPaidAt) - millis(a.therapistPaidAt));
    return {
      groups: grouped,
      unpaidTotal: unpaid.reduce((s, j) => s + j.payout, 0),
      unpaidJobCount: unpaid.length,
      paidJobs: paid,
      paidTotal: paid.reduce((s, j) => s + j.payout, 0),
    };
  }, [filtered]);

  const copy = (text: string, key: string) => {
    const done = () => {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    };
    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text).then(done).catch(() => done());
      } else {
        done();
      }
    } catch {
      done();
    }
  };

  const setPaid = async (job: Job, paid: boolean) => {
    setBusy(job.id);
    try {
      await updateDoc(doc(db, "bookings", job.id), {
        therapistPaid: paid,
        therapistPaidAt: paid ? serverTimestamp() : null,
        therapistPaidBy: paid ? auth.currentUser?.email ?? null : null,
      });
      void logAdminAction(
        paid ? "therapist_payout.mark_paid" : "therapist_payout.mark_unpaid",
        { bookingId: job.id, therapistId: job.therapistId, therapistName: job.therapistName, amount: job.payout }
      );
    } catch (e) {
      console.error("[therapist-payouts] write failed", e);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่");
    } finally {
      setBusy(null);
    }
  };

  const payAllForTherapist = async (group: UnpaidGroup) => {
    const key = `T:${group.id}`;
    setBusy(key);
    try {
      const batch = writeBatch(db);
      for (const j of group.jobs) {
        batch.update(doc(db, "bookings", j.id), {
          therapistPaid: true,
          therapistPaidAt: serverTimestamp(),
          therapistPaidBy: auth.currentUser?.email ?? null,
        });
      }
      await batch.commit();
      void logAdminAction("therapist_payout.mark_paid_batch", {
        therapistId: group.id, therapistName: group.name, amount: group.subtotal, jobs: group.jobs.length,
      });
    } catch (e) {
      console.error("[therapist-payouts] batch failed", e);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่");
    } finally {
      setBusy(null);
    }
  };

  // A tabular amount that deep-links into the real booking detail.
  const AmountLink: React.FC<{ id: string; value: number; strong?: boolean }> = ({ id, value, strong }) => (
    <Box
      component="button"
      onClick={() => navigate(`/admin/bookings?open=${id}`)}
      title="ดูรายละเอียดใน admin/bookings"
      sx={{
        ...adminFigureSx,
        fontSize: strong ? 14 : 13.5,
        color: adminColor.highlight,
        background: "none", border: "none", cursor: "pointer", p: 0,
        borderBottom: `1px dashed ${adminColor.highlight}66`,
        "&:hover": { color: adminColor.accentDeep, borderBottomColor: adminColor.accentDeep },
      }}
    >
      {formatTHB(value)}
    </Box>
  );

  const rangeNote =
    range === "custom"
      ? `${customStart.format("D MMM")} – ${customEnd.format("D MMM YYYY")}`
      : range === "thismonth"
      ? `เดือนนี้ (${dayjs().startOf("month").format("D MMM")} – ${dayjs().format("D MMM YYYY")})`
      : `${PRESET_DAYS[range]} วันล่าสุด`;

  return (
    <Box sx={{ padding: { xs: 2, md: 3 }, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: SERIF, fontSize: { xs: 24, md: 30 }, fontWeight: 600,
            color: adminColor.text, letterSpacing: "-0.02em",
            "& em": { fontStyle: "italic", color: adminColor.highlight },
          }}
        >
          จ่ายเงิน<em>หมอนวด</em>
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted, mt: "4px" }}>
          บุคกิ้งที่ลูกค้าจ่ายแบบโอน (ไม่ใช่เงินสด) · กดจ่ายเมื่อโอนส่วนแบ่งให้หมอแล้ว
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 2.5 }}>
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, v) => v && setRange(v as Preset)}
          sx={{
            "& .MuiToggleButton-root": {
              color: adminColor.muted, borderColor: adminColor.line2, fontFamily: SANS, textTransform: "none",
              "&.Mui-selected": { color: "#fff", background: adminColor.accent, "&:hover": { background: adminColor.accentDeep } },
            },
          }}
        >
          {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
            <ToggleButton key={p} value={p}>{PRESET_LABEL[p]}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        {range === "custom" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="จาก" value={customStart} maxDate={customEnd}
              onChange={(v) => v && setCustomStart(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130, "& .MuiInputBase-root": { color: adminColor.text }, "& .MuiInputLabel-root": { color: adminColor.muted }, "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 }, "& .MuiSvgIcon-root": { color: adminColor.muted } } } }}
            />
            <DatePicker
              label="ถึง" value={customEnd} minDate={customStart} maxDate={dayjs()}
              onChange={(v) => v && setCustomEnd(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130, "& .MuiInputBase-root": { color: adminColor.text }, "& .MuiInputLabel-root": { color: adminColor.muted }, "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 }, "& .MuiSvgIcon-root": { color: adminColor.muted } } } }}
            />
          </LocalizationProvider>
        )}

        {therapistOptions.length > 0 && (
          <Select size="small" value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)} sx={selectSx} MenuProps={selectMenuProps}>
            <MenuItem value="__ALL__">หมอทุกคน</MenuItem>
            {therapistOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </Select>
        )}

        <Box
          onClick={() => setPaidOnly((v) => !v)}
          sx={{
            display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer",
            fontFamily: SANS, fontSize: 12.5, fontWeight: 700, borderRadius: "8px", padding: "6px 12px",
            border: `1px solid ${paidOnly ? adminColor.green : adminColor.line2}`,
            background: paidOnly ? "rgba(22,163,74,0.10)" : "transparent",
            color: paidOnly ? adminColor.green : adminColor.muted,
          }}
        >
          {paidOnly ? <Check size={14} weight="bold" /> : null}
          เฉพาะลูกค้าจ่ายแล้ว
        </Box>
      </Box>

      {/* Summary strip */}
      <Box
        sx={{
          mb: 3, borderRadius: "16px", background: adminColor.panel,
          border: `1px solid ${adminColor.line}`, p: "18px 20px",
          display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 46, height: 46, borderRadius: "50%",
              background: `${adminColor.accent}1A`, color: adminColor.accent,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <CurrencyCircleDollar size={24} weight="duotone" />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: adminColor.muted, fontWeight: 700 }}>
              ค้างจ่ายหมอ
            </Typography>
            <Typography sx={{ ...adminFigureSx, fontSize: 28, color: adminColor.text, lineHeight: 1.1 }}>
              {formatTHB(unpaidTotal)}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>
              {unpaidJobCount} งาน · {groups.length} หมอ
            </Typography>
          </Box>
        </Box>
        <Button
          onClick={() => setShowPaid((v) => !v)}
          sx={{
            textTransform: "none", fontFamily: SANS, fontSize: 12.5, fontWeight: 600,
            color: adminColor.highlight, borderRadius: "8px",
            "&:hover": { background: "rgba(78,126,140,0.10)" },
          }}
        >
          {showPaid ? "ซ่อน" : "ดู"}จ่ายแล้ว · {formatTHB(paidTotal)} ({paidJobs.length})
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: adminColor.accent }} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {groups.length === 0 ? (
            <Box
              sx={{
                borderRadius: "16px", background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.3)", p: "18px 20px",
              }}
            >
              <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: adminColor.green }}>
                ✓ ไม่มีค้างจ่าย
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 0.25 }}>
                จ่ายหมอครบทุกงานที่ลูกค้าโอนมาแล้ว ({rangeNote})
              </Typography>
            </Box>
          ) : (
            groups.map((g) => {
              const batchKey = `T:${g.id}`;
              const bank = bankMap[g.id];
              const hasAccount = !!bank?.bankAccount;
              return (
                <Box
                  key={g.id}
                  sx={{
                    borderRadius: "16px", background: adminColor.panel,
                    border: `1px solid ${adminColor.line}`, overflow: "hidden",
                  }}
                >
                  {/* therapist header + pay-all */}
                  <Box
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
                      p: "14px 18px 12px", background: adminColor.panel2,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: adminColor.text }}>
                        {g.name}
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.muted }}>
                        ค้าง {g.jobs.length} งาน
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
                      <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.text }}>
                        {formatTHB(g.subtotal)}
                      </Typography>
                      <Button
                        size="small"
                        disabled={busy === batchKey}
                        onClick={() => void payAllForTherapist(g)}
                        sx={{
                          minWidth: 96, borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: 12,
                          background: adminColor.green, color: "#fff", border: "none",
                          "&:hover": { background: adminColor.green },
                          "&.Mui-disabled": { background: adminColor.panel3, color: adminColor.dim },
                        }}
                      >
                        จ่ายหมด
                      </Button>
                    </Box>
                  </Box>

                  {/* bound bank account + copy (the "transfer" info) */}
                  <Box
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
                      px: "18px", py: "9px", background: adminColor.panel2,
                      borderTop: `1px dashed ${adminColor.line2}`, borderBottom: `1px solid ${adminColor.line}`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                      <Bank size={15} weight="duotone" color={adminColor.accent} style={{ flexShrink: 0 }} />
                      {hasAccount ? (
                        <Typography
                          sx={{
                            fontFamily: SANS, fontSize: 12, color: adminColor.text,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          {bank!.bankName && (
                            <Box component="span" sx={{ color: adminColor.muted }}>{bank!.bankName} · </Box>
                          )}
                          <Box component="span" sx={{ ...adminFigureSx, fontWeight: 700 }}>{bank!.bankAccount}</Box>
                          {bank!.bankAccountName && (
                            <Box component="span" sx={{ color: adminColor.muted }}> · {bank!.bankAccountName}</Box>
                          )}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.amber }}>
                          ยังไม่ผูกบัญชี
                        </Typography>
                      )}
                    </Box>
                    {hasAccount ? (
                      <Button
                        size="small"
                        onClick={() => copy(bank!.bankAccount, batchKey)}
                        startIcon={
                          copied === batchKey ? <Check size={13} weight="bold" /> : <Copy size={13} />
                        }
                        sx={{
                          flexShrink: 0, minWidth: 0, borderRadius: "8px", textTransform: "none",
                          fontFamily: SANS, fontSize: 11.5, fontWeight: 700,
                          color: copied === batchKey ? adminColor.green : adminColor.highlight,
                          "&:hover": { background: "rgba(78,126,140,0.10)" },
                        }}
                      >
                        {copied === batchKey ? "คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        onClick={() => navigate(`/admin/therapists/${g.id}?edit=1`)}
                        sx={{
                          flexShrink: 0, minWidth: 0, borderRadius: "8px", textTransform: "none",
                          fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: adminColor.highlight,
                          "&:hover": { background: "rgba(78,126,140,0.10)" },
                        }}
                      >
                        ตั้งค่าบัญชี
                      </Button>
                    )}
                  </Box>

                  {/* per-job rows */}
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {g.jobs.map((j) => (
                      <Box
                        key={j.id}
                        sx={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
                          p: "10px 18px", borderTop: `1px solid ${adminColor.line}`,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontFamily: SANS, fontSize: 13, fontWeight: 600, color: adminColor.text,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}
                          >
                            {getServiceLabel(j.serviceId, j.serviceName)}
                            {j.customerName && (
                              <Box component="span" sx={{ fontWeight: 400, color: adminColor.muted }}>
                                {" · "}{j.customerName}
                              </Box>
                            )}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim }}>
                              {j.createdAt?.toDate ? dayjs(j.createdAt.toDate()).format("D MMM · HH:mm") : "—"}
                            </Typography>
                            <Box
                              component="span"
                              sx={{
                                fontFamily: SANS, fontSize: 10, fontWeight: 700, px: 0.75, py: "1px", borderRadius: "6px",
                                background: j.customerPaid ? "rgba(22,163,74,0.12)" : "rgba(217,119,6,0.12)",
                                color: j.customerPaid ? adminColor.green : adminColor.amber,
                              }}
                            >
                              {j.customerPaid ? "ลูกค้าโอนแล้ว" : "ลูกค้ายังไม่จ่าย"}
                            </Box>
                          </Box>
                          {/* 🆕 28s315 — commission + taxi breakdown */}
                          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.25 }}>
                            ค่านวด {formatTHB(j.commission)}
                            {j.taxi > 0 && ` + เดินทาง ${formatTHB(j.taxi)}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
                          <AmountLink id={j.id} value={j.payout} />
                          <Button
                            size="small"
                            disabled={busy === j.id}
                            onClick={() => void setPaid(j, true)}
                            sx={{
                              minWidth: 74, borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: 11.5,
                              border: `1px solid ${adminColor.green}`, color: adminColor.green, background: "transparent",
                              "&:hover": { background: "rgba(22,163,74,0.1)" },
                            }}
                          >
                            กดจ่าย
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })
          )}

          {/* Paid history (collapsible) */}
          {showPaid && (
            <Box
              sx={{
                borderRadius: "16px", background: adminColor.panel,
                border: `1px solid ${adminColor.line}`, p: "18px 20px",
              }}
            >
              <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: adminColor.text, mb: 1 }}>
                จ่ายแล้ว · {rangeNote}
              </Typography>
              {paidJobs.length === 0 ? (
                <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim }}>
                  ยังไม่มีรายการที่จ่าย
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {paidJobs.map((j) => (
                    <Box
                      key={j.id}
                      sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
                        p: "9px 0", borderTop: `1px solid ${adminColor.line}`,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: adminColor.text }}>
                          {j.therapistName}
                          <Box component="span" sx={{ fontWeight: 400, color: adminColor.muted }}>
                            {" · "}{getServiceLabel(j.serviceId, j.serviceName)}
                          </Box>
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim }}>
                          {j.createdAt?.toDate ? dayjs(j.createdAt.toDate()).format("D MMM") : "—"}
                          {j.therapistPaidAt?.toDate && ` · จ่าย ${dayjs(j.therapistPaidAt.toDate()).format("D MMM")}`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
                        <AmountLink id={j.id} value={j.payout} />
                        <Button
                          size="small"
                          disabled={busy === j.id}
                          onClick={() => void setPaid(j, false)}
                          sx={{
                            minWidth: 0, px: 1, borderRadius: "8px", textTransform: "none",
                            fontWeight: 600, fontSize: 11, color: adminColor.muted,
                            "&:hover": { background: "rgba(220,38,38,0.08)", color: adminColor.red },
                          }}
                        >
                          ยกเลิก
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, textAlign: "center", mt: 0.5 }}>
            บุคกิ้ง {rangeNote} ที่ลูกค้าจ่ายแบบไม่ใช่เงินสด · ยอด = ค่านวด (ตาม tier · หักส่วนลด) + ค่าเดินทาง · กดยอดเพื่อดูรายละเอียดใน admin/bookings
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AdminTherapistPayoutsPage;
