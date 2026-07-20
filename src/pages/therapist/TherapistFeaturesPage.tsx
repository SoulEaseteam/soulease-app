// src/pages/therapist/TherapistFeaturesPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Features · ลักษณะเฉพาะตัว") —
// self-service edit for `features` on her own therapist doc. Reuses
// FeaturesEditor from therapistFormKit — same field set + labels as the
// admin Add/Edit Therapist form. `features` is written as a plain
// Record<string,string> (matches AddTherapistPage's own save shape, not
// the stricter Features interface — Firestore doesn't enforce it either
// way).

import React, { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { FeaturesEditor } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";

const TherapistFeaturesPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("{}");

  useEffect(() => {
    if (!therapist) return;
    const obj = (therapist.features ?? {}) as unknown as Record<string, string>;
    setValue(obj);
    initialRef.current = JSON.stringify(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(therapist?.features ?? {})]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) if ((v ?? "").trim()) trimmed[k] = v.trim();
      await updateDoc(doc(db, "therapists", therapistDocId), {
        features: trimmed,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      initialRef.current = JSON.stringify(trimmed);
      setValue(trimmed);
      setToast({ msg: "บันทึกข้อมูลแล้ว", severity: "success" });
    } catch (err) {
      console.error("[TherapistFeatures] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="ลักษณะเฉพาะตัว · Features"
      loading={loading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="ข้อมูลเหล่านี้แสดงในหน้าโปรไฟล์สาธารณะของคุณ ปล่อยว่างช่องไหนก็ได้ถ้าไม่อยากระบุ"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <FeaturesEditor value={value} onChange={(k, v) => setValue((prev) => ({ ...prev, [k]: v }))} />
    </SelfEditShell>
  );
};

export default TherapistFeaturesPage;
