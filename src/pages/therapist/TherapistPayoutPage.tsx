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
import { TextField } from "@mui/material";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { fieldSx } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";

interface PayoutForm {
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}
const EMPTY: PayoutForm = { bankName: "", bankAccount: "", bankAccountName: "" };

const TherapistPayoutPage: React.FC = () => {
  const { therapistDocId, loading: selfLoading } = useTherapistSelf();
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
      note="บัญชีที่ใช้รับเงินโอนจากแอดมิน — ทุกครั้งที่แก้ไข ระบบจะแจ้งแอดมินอัตโนมัติทาง Telegram เพื่อความปลอดภัย"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
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
