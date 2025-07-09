// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type Role = 'user' | 'therapist' | 'admin';

interface AuthUser {
  uid: string;
  username: string;
  role: Role;
  image?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid); // 🔁 เปลี่ยนเป็น 'therapists' ได้ถ้าจำแนก role ที่ collection
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setUser({
            uid: firebaseUser.uid,
            username: data.username || 'Unnamed',
            role: data.role || 'user',
            image: data.image || '',
          });
        } else {
          setUser({
            uid: firebaseUser.uid,
            username: firebaseUser.email || 'Unknown',
            role: 'user',
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return { user, logout };
};