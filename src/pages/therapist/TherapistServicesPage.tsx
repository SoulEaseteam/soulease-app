// src/pages/therapist/TherapistServicesPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Services · บริการที่ทำได้") —
// self-service edit for `servicesAvailable` on her own therapist doc.
// Already whitelisted in firestore.rules therapistEditableKeys(); reuses
// the same ServicesEditor the admin Add/Edit Therapist forms use, so the
// option list can never drift between admin and self-service.

import React, { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { ServicesEditor } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";

const TherapistServicesPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("[]");

  useEffect(() => {
    if (!therapist) return;
    const list = therapist.servicesAvailable ?? [];
    setValue(list);
    initialRef.current = JSON.stringify(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(therapist?.servicesAvailable ?? [])]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "therapists", therapistDocId), {
        servicesAvailable: value,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      initialRef.current = JSON.stringify(value);
      setToast({ msg: "บันทึกบริการแล้ว", severity: "success" });
    } catch (err) {
      console.error("[TherapistServices] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="บริการที่ทำได้ · Services"
      loading={loading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="เลือกบริการที่คุณเปิดรับตอนนี้ — ลูกค้าจะเห็นตรงนี้บนโปรไฟล์สาธารณะของคุณ"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <ServicesEditor value={value} onChange={setValue} />
    </SelfEditShell>
  );
};

export default TherapistServicesPage;
