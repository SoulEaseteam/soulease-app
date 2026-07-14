// src/hooks/useAdminIdentity.ts
//
// 🆕 Round 28x.3 (founder: "เบอร์โทรแอดมินละ จะระบุได้ไง ใครจอง") — who the
//   signed-in admin is, including the phone number they can actually be reached on.
//
// The phone lives on users/{uid}, NOT on admins/{uid}. That is not a shortcut —
// firestore.rules makes the admins collection `allow write: if false` on purpose
// (rights are granted from the Firebase console, never from the app), so there is
// nowhere on that doc for the client to put a phone. users/{uid} already accepts
// `phone` on its owner-editable whitelist, so the admin writes their own number to
// their own doc with no rules change and no new surface.
//
// Every booking the concierge creates is stamped with this identity (see
// utils/bookingAuthor), which is what makes "who booked this?" answerable.

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { normPhone } from "@/utils/phoneCountry";

export function useAdminIdentity() {
  const { user, role } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { setPhone(null); setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const p = snap.data()?.phone;
        setPhone(typeof p === "string" && p ? p : null);
        setLoading(false);
      },
      (err) => {
        console.warn("[admin-identity] read failed:", err.code);
        setPhone(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user]);

  const savePhone = useCallback(
    async (raw: string): Promise<boolean> => {
      if (!user) return false;
      // Store the SAME normalised form the rest of the app keys on (members,
      // blocked numbers, the returning-guest test), so an admin's number is
      // comparable with everything else instead of being a lone free-text string.
      const next = normPhone(raw.trim());
      if (!next || next.length < 9) return false;
      setSaving(true);
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { phone: next, updatedAt: serverTimestamp() },
          { merge: true },
        );
        return true;
      } catch (err) {
        console.error("[admin-identity] save failed", err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  return {
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    displayName: user?.displayName ?? null,
    isAdmin: role === "admin",
    phone,
    loading,
    saving,
    savePhone,
  };
}
