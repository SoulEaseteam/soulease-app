// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously, User } from 'firebase/auth';
import { auth } from '@/firebase';

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isGuest: false,
  loginAsGuest: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsGuest(currentUser?.isAnonymous ?? false);
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
    <AuthContext.Provider value={{ user, isGuest, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);