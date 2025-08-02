import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CircularProgress, Box, Typography } from '@mui/material';

const AdminRoute: React.FC = () => {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          setIsAdmin(adminDocSnap.exists());
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false); // fallback: treat as unauthorized
        }
      } else {
        setIsAdmin(false); // not logged in
      }
    };

    checkAdminStatus();
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography ml={2}>Checking access...</Typography>
      </Box>
    );
  }

  return isAdmin ? <Outlet /> : <Navigate to="/unauthorized" replace />;
};

export default AdminRoute;