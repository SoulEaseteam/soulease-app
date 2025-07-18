// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// ✅ ประเภทของ Role ที่รองรับ
type UserRole = 'admin' | 'therapist' | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  logout: () => void;
}

// ✅ สร้าง context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  logout: () => {},
});

// ✅ AuthProvider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setRole(userData.role as UserRole);
          } else {
            console.warn('No user data found in Firestore.');
            setRole(null);
          }
        } catch (err) {
          console.error('Failed to get role from Firestore:', err);
          setRole(null);
        }
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = () => {
    signOut(auth).catch((err) => console.error('Logout error:', err));
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Hook สำหรับใช้งาน Context
export const useAuth = () => useContext(AuthContext);