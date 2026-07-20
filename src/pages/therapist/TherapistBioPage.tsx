// src/pages/therapist/TherapistBioPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Bio · ประวัติแนะนำ (per
// language)") — self-service edit for `bios` on her own therapist doc.
// Reuses BiosEditor from therapistFormKit — same 5-language layout as the
// admin form. Note this is the customer-facing "About" bio (Therapist.bios),
// a different field from the promo-bot rotation bios in functions/src —
// those are hand-maintained server copy, unrelated to this.

import React, { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { BiosEditor } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";

const TherapistBioPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("{}");

  useEffect(() => {
    if (!therapist) return;
    const obj = (therapist.bios ?? {}) as Record<string, string>;
    setValue(obj);
    initialRef.current = JSON.stringify(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(therapist?.bios ?? {})]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) if ((v ?? "").trim()) trimmed[k] = v.trim();
      await updateDoc(doc(db, "therapists", therapistDocId), {
        bios: trimmed,
        bioGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      initialRef.current = JSON.stringify(trimmed);
      setValue(trimmed);
      setToast({ msg: "บันทึกประวัติแนะนำแล้ว", severity: "success" });
    } catch (err) {
      console.error("[TherapistBio] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="ประวัติแนะนำ · Bio"
      loading={loading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="เขียนแนะนำตัวสั้นๆ ทีละภาษา — ปล่อยว่างภาษาไหนก็ได้ถ้ายังไม่พร้อม"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <BiosEditor value={value} onChange={(code, v) => setValue((prev) => ({ ...prev, [code]: v }))} />
    </SelfEditShell>
  );
};

export default TherapistBioPage;
