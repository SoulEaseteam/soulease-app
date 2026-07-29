// src/pages/therapist/TherapistPayoutPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Payout Account · บัญชีธนาคาร")
//   — self-service edit for her own `payoutAccounts/{id}` doc (bank
//   transfer destination). This collection was strictly admin-only before
//   (payoutAccounts bank numbers deliberately sit off the world-readable
//   therapist doc — see AdminTherapistPayoutsPage). Opening it to
//   self-edit is a real security-relevant process change (previously an
//   admin manually entered every therapist's bank details), so the safe
//   default shipped alongside this: functions/src/index.ts
//   notifyPayoutAccountChanged fires a Telegram alert to the admin Report
//   channel on every non-admin write here — the therapist can update her
//   own destination, but View is always told when it changes.

import React, { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Box, TextField, Typography } from "@mui/material";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { fieldSx } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";
// 🆕 Round 28x.114 (stage 4/4) — My Wallet. Same settlement engine the admin
//   payslip uses, over the therapist's OWN bookings, so her number can't
//   disagree with View's.
import { useOwnBookingsSnapshot } from "@/hooks/useOwnBookingsSnapshot";
import { settlementTotals, type SettlementInput } from "@/utils/commission";
import dayjs from "dayjs";

const thb = (n: number) => `฿${Math.round(Math.abs(n)).toLocaleString()}`;

interface WalletTotals {
  balance: number; noShowComp: number; bonus: number; deduction: number;
  cashShopShare: number; transferOwedToHer: number; therapistEarned: number; jobs: number;
  loading: boolean;
}
const EMPTY_WALLET: WalletTotals = {
  balance: 0, noShowComp: 0, bonus: 0, deduction: 0, cashShopShare: 0,
  transferOwedToHer: 0, therapistEarned: 0, jobs: 0, loading: false,
};

// This calendar month only — matches the admin payslip's default period, so the
// two surfaces show the same balance for the same window.
function selectWallet(snap: { docs: { data: () => Record<string, unknown> }[] }): WalletTotals {
  const monthStart = dayjs().startOf("month");
  const rows: SettlementInput[] = [];
  for (const d of snap.docs) {
    const b = d.data();
    const created = (b.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
    if (created && dayjs(created).isBefore(monthStart)) continue;
    rows.push(b as SettlementInput);
  }
  const t = settlementTotals(rows);
  return { ...t, loading: false };
}

interface PayoutForm {
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}
const EMPTY: PayoutForm = { bankName: "", bankAccount: "", bankAccountName: "" };

const ROSE = "#FF9999";
const GREEN = "#2f9e6f";
const RED = "#C0392B";
const INK = "#2a1a14";
const MUTED = "#7a6a63";

const WalletCard: React.FC<{ w: WalletTotals }> = ({ w }) => {
  const shopOwesMe = w.balance >= 0;
  const rows: { label: string; value: string; color?: string }[] = [];
  if (w.transferOwedToHer > 0) rows.push({ label: "งานที่ลูกค้าโอน (ร้านค้างจ่ายคุณ)", value: `+ ${thb(w.transferOwedToHer)}`, color: GREEN });
  if (w.noShowComp > 0) rows.push({ label: "No-show taxi (ร้านคืนให้)", value: `+ ${thb(w.noShowComp)}`, color: GREEN });
  if (w.bonus > 0) rows.push({ label: "โบนัส", value: `+ ${thb(w.bonus)}`, color: GREEN });
  if (w.cashShopShare > 0) rows.push({ label: "ส่วนแบ่งร้าน (งานเงินสด คุณเก็บไว้)", value: `− ${thb(w.cashShopShare)}`, color: MUTED });
  if (w.deduction > 0) rows.push({ label: "หักเงิน", value: `− ${thb(w.deduction)}`, color: RED });

  return (
    <Box sx={{ mb: 2, p: 2, borderRadius: "16px", background: "#fff", border: "1px solid #efe2e6", boxShadow: "0 6px 18px rgba(120,60,80,0.06)" }}>
      <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>
        กระเป๋าเงินของฉัน · My Wallet
      </Typography>
      <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED, mt: 0.2 }}>
        {dayjs().format("MMMM YYYY")} · {w.jobs} งาน
      </Typography>

      {/* headline balance */}
      <Box sx={{ mt: 1.5, mb: 1, p: 1.75, borderRadius: "14px", background: shopOwesMe ? "rgba(47,158,111,0.08)" : "rgba(201,111,137,0.09)", textAlign: "center" }}>
        <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: shopOwesMe ? GREEN : ROSE }}>
          {shopOwesMe ? "ร้านค้างจ่ายคุณ · เงินโอนค้างรับ" : "คุณต้องโอนให้ร้าน"}
        </Typography>
        <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 32, fontWeight: 800, color: shopOwesMe ? GREEN : ROSE, lineHeight: 1.1, mt: 0.3 }}>
          {thb(w.balance)}
        </Typography>
      </Box>

      {rows.map((r) => (
        <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
          <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: MUTED }}>{r.label}</Typography>
          <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 700, color: r.color || INK }}>{r.value}</Typography>
        </Box>
      ))}

      <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: MUTED, mt: 1.25, lineHeight: 1.5 }}>
        คิดจากงานเดือนนี้ · หักลบจากค่าแท็กซี่และส่วนแบ่งแล้ว · แอดมินยืนยันยอดจริงตอนโอน
      </Typography>
    </Box>
  );
};

const TherapistPayoutPage: React.FC = () => {
  const { therapistDocId, loading: selfLoading } = useTherapistSelf();
  const wallet = useOwnBookingsSnapshot<WalletTotals>(
    auth.currentUser?.uid ?? null,
    selectWallet,
    EMPTY_WALLET,
  );
  const [value, setValue] = useState<PayoutForm>(EMPTY);
  const [docLoading, setDocLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>(JSON.stringify(EMPTY));

  useEffect(() => {
    if (!therapistDocId) return;
    void (async () => {
      setDocLoading(true);
      try {
        const snap = await getDoc(doc(db, "payoutAccounts", therapistDocId));
        const d = snap.exists() ? (snap.data() as Partial<PayoutForm>) : {};
        const next: PayoutForm = {
          bankName: d.bankName ?? "",
          bankAccount: d.bankAccount ?? "",
          bankAccountName: d.bankAccountName ?? "",
        };
        setValue(next);
        initialRef.current = JSON.stringify(next);
      } catch (err) {
        console.error("[TherapistPayout] load failed:", err);
      } finally {
        setDocLoading(false);
      }
    })();
  }, [therapistDocId]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "payoutAccounts", therapistDocId),
        {
          bankName: value.bankName.trim(),
          bankAccount: value.bankAccount.trim(),
          bankAccountName: value.bankAccountName.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid ?? null,
        },
        { merge: true },
      );
      initialRef.current = JSON.stringify(value);
      setToast({ msg: "บันทึกบัญชีธนาคารแล้ว · แจ้งแอดมินอัตโนมัติ", severity: "success" });
    } catch (err) {
      console.error("[TherapistPayout] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="บัญชีธนาคาร · Payout"
      loading={selfLoading || docLoading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="บัญชีที่ใช้รับเงินโอนจากแอดมิน ทุกครั้งที่แก้ไข ระบบจะแจ้งแอดมินอัตโนมัติทาง Telegram เพื่อความปลอดภัย"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      {/* 🆕 28x.114 — My Wallet: this month's settlement with the shop. */}
      <WalletCard w={wallet} />

      <TextField
        label="ธนาคาร" fullWidth size="small" margin="dense" sx={fieldSx}
        placeholder="เช่น กสิกรไทย · SCB · พร้อมเพย์"
        value={value.bankName}
        onChange={(e) => setValue((v) => ({ ...v, bankName: e.target.value }))}
      />
      <TextField
        label="เลขบัญชี / พร้อมเพย์" fullWidth size="small" margin="dense" sx={fieldSx}
        placeholder="เช่น 123-4-56789-0"
        inputProps={{ inputMode: "numeric" }}
        value={value.bankAccount}
        onChange={(e) => setValue((v) => ({ ...v, bankAccount: e.target.value }))}
      />
      <TextField
        label="ชื่อบัญชี" fullWidth size="small" margin="dense" sx={fieldSx}
        placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
        value={value.bankAccountName}
        onChange={(e) => setValue((v) => ({ ...v, bankAccountName: e.target.value }))}
      />
    </SelfEditShell>
  );
};

export default TherapistPayoutPage;
