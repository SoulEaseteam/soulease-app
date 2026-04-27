// src/providers/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type Role = "admin" | "therapist" | "user";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * resolveRole — แยกออกมาเพื่อ test ง่ายและอ่านง่าย
 * priority: admin > therapist > users.role > "user"
 */
async function resolveRole(uid: string): Promise<Role> {
  // ทำงานพร้อมกันเพื่อลด round-trip (เดิมเรียกแบบ sequential)
  const [adminSnap, therapistSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "admins", uid)),
    getDoc(doc(db, "therapists", uid)),
    getDoc(doc(db, "users", uid)),
  ]);

  if (adminSnap.exists()) return "admin";
  if (therapistSnap.exists()) return "therapist";

  if (userSnap.exists()) {
    const r = userSnap.data().role as Role | undefined;
    if (r === "admin" || r === "therapist" || r === "user") return r;
  }
  return "user";
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // ✅ Guest → sign in anonymously
      // เหตุผล: Cloud Function `notifyBooking` ต้องการ auth token เพื่อกัน spam
      // ถ้า guest ไม่มี auth → จองได้แต่ Telegram noti จะ fail
      // anonymous user มี uid ชั่วคราว, ไม่ได้ผูกกับอีเมล/ข้อมูลส่วนตัว
      if (!firebaseUser) {
        try {
          const cred = await signInAnonymously(auth);
          // onAuthStateChanged จะถูกเรียกอีกรอบหลัง sign-in
          // → ไม่ต้อง setUser ตรงนี้, รอ event ถัดไป
          void cred;
          return;
        } catch (err) {
          console.error("[AuthProvider] anonymous sign-in failed:", err);
          // ปล่อย flow ต่อ — booking จะทำได้แต่ Telegram noti อาจ fail
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }
      }

      setUser(firebaseUser);

      // anonymous user → role = "user" ทันที, ไม่ต้องอ่าน admins/therapists
      if (firebaseUser.isAnonymous) {
        setRole("user");
        setLoading(false);
        return;
      }

      try {
        const detectedRole = await resolveRole(firebaseUser.uid);
        setRole(detectedRole);
      } catch (err) {
        // ถ้า rules ไม่ให้อ่าน users/{uid} ก็ fallback เป็น "user"
        console.error("[AuthProvider] resolveRole failed:", err);
        setRole("user");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  }, []);

  // memoize เพื่อกัน re-render ทุก consumer ทุกครั้งที่ AuthProvider re-render
  const value = useMemo<AuthContextType>(
    () => ({ user, role, loading, logout }),
    [user, role, loading, logout]
  );

  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;