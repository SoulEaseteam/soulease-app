import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

type UserRole = 'admin' | 'therapist' | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  logout: () => {},
});

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
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setRole(userData.role as UserRole);
          } else {
            console.warn('🔔 ไม่มีข้อมูล role ของผู้ใช้ใน Firestore');
            setRole(null);
          }
        } catch (err) {
          console.error('❌ เกิดข้อผิดพลาดในการดึง role:', err);
          setRole(null);
        }
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = () => {
    signOut(auth).catch((err) => console.error('❌ Logout failed:', err));
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);