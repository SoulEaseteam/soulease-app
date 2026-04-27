// src/providers/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
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

async function resolveRole(uid: string): Promise<Role> {
  try {
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
  } catch (err) {
    console.warn("[AuthProvider] resolveRole soft-fail:", err);
  }
  return "user";
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔓 ไม่ใช้ Anonymous Auth — รองรับ guest booking โดยตรง
    // (เลี่ยงปัญหา API key referrer restriction ที่ Google Cloud)
    const handleAuthChange = async (firebaseUser: User | null) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const detectedRole = await resolveRole(firebaseUser.uid);
        setRole(detectedRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void handleAuthChange(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, role, loading, logout }),
    [user, role, loading, logout]
  );

  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
