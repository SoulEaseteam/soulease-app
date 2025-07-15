import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

const AdminRoute: React.FC = () => {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user]);

  if (loading || isAdmin === null) {
    return <div>Loading...</div>;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/unauthorized" />;
};

export default AdminRoute;