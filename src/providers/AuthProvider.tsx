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
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { setCachedRole } from "@/utils/currentRole";

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
    // 🆕 Round 28x.93 (founder screenshot: Yuri signing in through /staff kept
    //   landing on the CUSTOMER profile) — `doc(db, "therapists", uid)` treats
    //   the Firebase Auth uid as the therapist DOC ID, but therapist doc IDs
    //   are slugs ("YuriSunRed"); `uid` only exists as a FIELD on that doc.
    //   This lookup has never once matched a real therapist — PrivateRoute's
    //   requiredRoles=["therapist"] check was silently failing for everyone,
    //   every time, and falling through to whatever /users/{uid}.role happened
    //   to hold (fragile, and in Yuri's case that mirror doc didn't exist at
    //   all). Query by the uid FIELD instead — the same approach LoginPage's
    //   own getUserRole already uses successfully for the post-login redirect.
    const [adminSnap, therapistQuery, userSnap] = await Promise.all([
      getDoc(doc(db, "admins", uid)),
      getDocs(query(collection(db, "therapists"), where("uid", "==", uid), limit(1))),
      getDoc(doc(db, "users", uid)),
    ]);

    if (adminSnap.exists()) return "admin";
    if (!therapistQuery.empty) return "therapist";

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

        // 🆕 Round 28x.107 — force one ID-token refresh per session for staff.
        //   storage.rules now reads `role`/`tid` OUT OF THE TOKEN (it can't do
        //   a cross-service Firestore read — 28s281 proved that path silently
        //   denies). A cached token is valid for up to an hour, so an admin
        //   whose claim was just granted — or backfilled — would keep getting
        //   "storage/unauthorized" on her own uploads with nothing on screen
        //   explaining why. Refreshing only for staff keeps guest page loads
        //   free of the extra round trip.
        if (detectedRole !== "user") {
          await firebaseUser.getIdToken(true).catch(() => {
            /* offline / transient — the hourly auto-refresh still lands it */
          });
        }
        // 🆕 28x.99 — mirror into the module-level cache so analytics.ts
        // (a plain util, not a component) can skip tracking staff sessions.
        setCachedRole(detectedRole);
      } else {
        setRole(null);
        setCachedRole(null);
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
    setCachedRole(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, role, loading, logout }),
    [user, role, loading, logout]
  );

  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
