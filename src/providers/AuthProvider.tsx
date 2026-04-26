// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import LoadingSpinner from "@/components/common/LoadingSpinner";

type Role = "admin" | "therapist" | "user" | null;

interface AuthContextType {
  user: FirebaseUser | null;
  role: Role;
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

// =====================================================
// Role caching — ลด Firestore reads ตอน user navigate
// Cache key ผูกกับ uid + version เผื่อ schema เปลี่ยน
// =====================================================
const CACHE_VERSION = "v1";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 นาที

const cacheKey = (uid: string) => `sunred:auth:${CACHE_VERSION}:${uid}`;

function readRoleCache(uid: string): Role | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const { role, ts } = JSON.parse(raw);
    if (typeof ts !== "number" || Date.now() - ts > CACHE_TTL_MS) {
      // หมดอายุ
      localStorage.removeItem(cacheKey(uid));
      return null;
    }
    return role ?? null;
  } catch {
    return null;
  }
}

function writeRoleCache(uid: string, role: Role) {
  try {
    localStorage.setItem(
      cacheKey(uid),
      JSON.stringify({ role, ts: Date.now() })
    );
  } catch {
    // localStorage เต็ม — ปล่อยไป
  }
}

function clearRoleCache(uid?: string) {
  try {
    if (uid) {
      localStorage.removeItem(cacheKey(uid));
    } else {
      // เคลียร์ทุก auth cache (ตอน logout)
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`sunred:auth:`))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // ignore
  }
}

// =====================================================
// Resolve role — เช็ค admin → therapist → users.role → default
// ใช้ Promise.all (parallel) แทน sequential await
// =====================================================
async function resolveRole(uid: string): Promise<Role> {
  const [adminSnap, therapistSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "admins", uid)),
    getDoc(doc(db, "therapists", uid)),
    getDoc(doc(db, "users", uid)),
  ]);

  // Admin = priority สูงสุด (ถ้ามีใน admins collection)
  if (adminSnap.exists()) return "admin";

  // Therapist = priority รอง
  if (therapistSnap.exists()) return "therapist";

  // ดู role จาก users doc (อาจเป็น "admin"/"therapist" ก็ตามนั้น เผื่อระบบเก่า)
  if (userSnap.exists()) {
    const r = userSnap.data()?.role;
    if (r === "admin" || r === "therapist") return r;
  }

  // default
  return "user";
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      const uid = firebaseUser.uid;

      // 1) ลอง cache ก่อน — ตอบ UI ทันทีเพื่อไม่ให้หน้าค้าง
      const cached = readRoleCache(uid);
      if (cached) {
        setRole(cached);
        setLoading(false);

        // 2) Refresh background — ถ้า role เปลี่ยน (เช่นโดน promote/demote) ก็ update
        try {
          const fresh = await resolveRole(uid);
          if (fresh !== cached) {
            setRole(fresh);
            writeRoleCache(uid, fresh);
          }
        } catch (e) {
          console.warn("[Auth] background refresh failed:", e);
        }
        return;
      }

      // 3) ไม่มี cache — fetch แล้ว save
      try {
        const fresh = await resolveRole(uid);
        setRole(fresh);
        writeRoleCache(uid, fresh);
      } catch (e) {
        console.error("[Auth] role resolve failed, defaulting to user:", e);
        setRole("user");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const uid = user?.uid;
    await signOut(auth);
    clearRoleCache(uid);
    setUser(null);
    setRole(null);
  };

  // Loading screen แทน null — ผู้ใช้จะรู้ว่าระบบกำลังโหลด ไม่ใช่ค้าง
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
