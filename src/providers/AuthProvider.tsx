// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
  user: any;
  role: "admin" | "therapist" | "user" | null;
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

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<"admin" | "therapist" | "user" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const uid = firebaseUser.uid;

        let detectedRole: "admin" | "therapist" | "user" = "user";

        // ⭐ 1) Admin = highest priority
        const adminSnap = await getDoc(doc(db, "admins", uid));
        if (adminSnap.exists()) {
          detectedRole = "admin";
        }

        // ⭐ 2) Therapist = 2nd priority
        const therapistSnap = await getDoc(doc(db, "therapists", uid));
        if (therapistSnap.exists()) {
          detectedRole = "therapist";
        }

        // ⭐ 3) Normal user = default (users collection)
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists() && userSnap.data().role) {
          detectedRole = userSnap.data().role;
        }

        setRole(detectedRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;