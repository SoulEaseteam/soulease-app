// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthContextType = {
  user: FirebaseUser | null;
  isGuest: boolean;
  loading: boolean;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isGuest: false,
  loading: true,
  loginAsGuest: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Keep session between reload
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsGuest(currentUser?.isAnonymous ?? false);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const loginAsGuest = async () => {
    const result = await signInAnonymously(auth);
    setUser(result.user);
    setIsGuest(true);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        loading,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);