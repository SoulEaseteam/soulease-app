// src/pages/therapist/TherapistLanguagesPage.tsx
//
// 🆕 Round 28x.96 (founder Home quick-menu: "Languages · ภาษา") —
// self-service edit for `languageSkills` on her own therapist doc. Reuses
// LanguagesEditor from therapistFormKit (same code/level options as the
// admin form). `languageSkills` was added to firestore.rules
// therapistEditableKeys() in this round — it wasn't there before since no
// self-service surface needed it.

import React, { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { LanguageSkill } from "@/types/therapist";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { LanguagesEditor } from "@/pages/admin/therapistFormKit";
import { SelfEditShell } from "./selfEditKit";

const TherapistLanguagesPage: React.FC = () => {
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const [value, setValue] = useState<LanguageSkill[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const initialRef = useRef<string>("[]");

  useEffect(() => {
    if (!therapist) return;
    const list = therapist.languageSkills ?? [];
    setValue(list);
    initialRef.current = JSON.stringify(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(therapist?.languageSkills ?? [])]);

  const dirty = JSON.stringify(value) !== initialRef.current;

  const save = async () => {
    if (!therapistDocId) return;
    setSaving(true);
    try {
      const cleaned = value.filter((l) => l.code);
      await updateDoc(doc(db, "therapists", therapistDocId), {
        languageSkills: cleaned,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      initialRef.current = JSON.stringify(cleaned);
      setValue(cleaned);
      setToast({ msg: "บันทึกภาษาแล้ว", severity: "success" });
    } catch (err) {
      console.error("[TherapistLanguages] save failed:", err);
      setToast({ msg: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelfEditShell
      title="ภาษา · Languages"
      loading={loading}
      onSave={() => void save()}
      saving={saving}
      dirty={dirty}
      note="ภาษาที่คุณพูดได้ + ระดับความคล่อง — ลูกค้าใช้เลือกนักบำบัดตามภาษา"
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <LanguagesEditor value={value} onChange={setValue} />
    </SelfEditShell>
  );
};

export default TherapistLanguagesPage;
