// src/pages/admin/AdminTherapistPayoutsPage.tsx
//
// 🆕 Round 28s313 (founder: "เพิ่มเมนู ระบบ กดจ่ายเงินหมอ · ดึงบุคกิ้งจาก
//   ลูกค้าจ่ายแบบโอน") — a dedicated "pay the therapist" queue. It sources
//   every completed booking the customer paid NON-CASH (transfer / PromptPay
//   / WeChat / Alipay / card — anything but cash). That money went to the
//   shop's account, so the shop owes the therapist their cut; cash is
//   collected in hand by the therapist so nothing is owed. Founder picked
//   "ทุกแบบที่ไม่ใช่เงินสด" for the filter.
//
// Storage: the paid flag lives on the booking doc itself — `therapistPaid`,
// `therapistPaidAt`, `therapistPaidBy`. Admin already has full write on
// bookings (firestore.rules `allow update: if isAdmin()`), so no new
// collection or rule is needed, and the mark is per-job (survives any period
// view). Payout amount uses the shared `therapistPayoutFor` so it matches
// Earnings / Reports exactly.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import dayjs from "dayjs";
import { CurrencyCircleDollar } from "phosphor-react";

import { db, auth } from "@/lib/firebase";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";
import { therapistPayoutFor, isPayrollExcluded } from "@/utils/commission";

const SERIF = adminFont.serif;
const SANS = adminFont.sans;

// Look back far enough that nothing still owed slips off the list, while
// keeping the read bounded. A small studio clears payouts weekly/monthly, so
// 120 days is a wide safety margin.
const WINDOW_DAYS = 120;

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

const AdminTherapistPayoutsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  useEffect(() => {
    setLoading(true);
    const cutoff = Timestamp.fromDate(
      dayjs().subtract(WINDOW_DAYS, "day").startOf("day").toDate()
    );
    const q = query(collection(db, "bookings"), where("createdAt", ">=", cutoff));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: Job[] = [];
        snap.forEach((d0) => {
          const d = d0.data() as DocumentData;
          const status = (d.status as string) ?? "";
          if (isPayrollExcluded(status)) return; // cancelled / refunded / no-show …
          if (isCashPayment(d.payment, d.paymentMethodId)) return; // cash → nothing owed
          const payout = therapistPayoutFor({
            serviceId: d.serviceId ?? null,
            servicePrice: d.servicePrice ?? null,
            discountAmount: d.discountAmount ?? null,
          });
          if (payout <= 0) return; // no service price yet → skip
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
            payout,
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
  }, []);

  const { groups, unpaidTotal, unpaidJobCount, paidJobs, paidTotal } = useMemo(() => {
    const unpaid = jobs.filter((j) => !j.therapistPaid);
    const paid = jobs.filter((j) => j.therapistPaid);
    const byT: Record<string, UnpaidGroup> = {};
    for (const j of unpaid) {
      if (!byT[j.therapistId]) {
        byT[j.therapistId] = { id: j.therapistId, name: j.therapistName, subtotal: 0, jobs: [] };
      }
      byT[j.therapistId].jobs.push(j);
      byT[j.therapistId].subtotal += j.payout;
    }
    const grouped = Object.values(byT)
      .map((g) => ({
        ...g,
        jobs: g.jobs.sort((a, b) => millis(b.createdAt) - millis(a.createdAt)),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
    paid.sort((a, b) => millis(b.therapistPaidAt) - millis(a.therapistPaidAt));
    return {
      groups: grouped,
      unpaidTotal: unpaid.reduce((s, j) => s + j.payout, 0),
      unpaidJobCount: unpaid.length,
      paidJobs: paid,
      paidTotal: paid.reduce((s, j) => s + j.payout, 0),
    };
  }, [jobs]);

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
          {/* ── Outstanding, grouped by therapist ── */}
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
                จ่ายหมอครบทุกงานที่ลูกค้าโอนมาแล้ว (ช่วง {WINDOW_DAYS} วันล่าสุด)
              </Typography>
            </Box>
          ) : (
            groups.map((g) => {
              const batchKey = `T:${g.id}`;
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
                      p: "14px 18px", background: adminColor.panel2, borderBottom: `1px solid ${adminColor.line}`,
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
                            {/* customer-paid signal — don't pay the therapist before the money's in */}
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
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
                          <Typography sx={{ ...adminFigureSx, fontSize: 13.5, color: adminColor.highlight }}>
                            {formatTHB(j.payout)}
                          </Typography>
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

          {/* ── Paid history (collapsible) ── */}
          {showPaid && (
            <Box
              sx={{
                borderRadius: "16px", background: adminColor.panel,
                border: `1px solid ${adminColor.line}`, p: "18px 20px",
              }}
            >
              <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: adminColor.text, mb: 1 }}>
                จ่ายแล้ว · {WINDOW_DAYS} วันล่าสุด
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
                        <Typography sx={{ ...adminFigureSx, fontSize: 13, color: adminColor.text }}>
                          {formatTHB(j.payout)}
                        </Typography>
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
            แสดงบุคกิ้ง {WINDOW_DAYS} วันล่าสุดที่ลูกค้าจ่ายแบบไม่ใช่เงินสด · ยอด = ส่วนแบ่งหมอ (ตาม tier · หักส่วนลด)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AdminTherapistPayoutsPage;
