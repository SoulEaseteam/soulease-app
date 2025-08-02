import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { CircularProgress, Box, Typography } from "@mui/material";

interface PrivateRouteProps {
  allowedRoles: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        try {
          const therapistRef = doc(db, "therapists", user.uid);
          const therapistSnap = await getDoc(therapistRef);
          if (therapistSnap.exists()) {
            setRole("therapist");
            return;
          }

          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            setRole("admin");
            return;
          }

          setRole("user");
        } catch (error) {
          console.error("Error checking role:", error);
          setRole("user");
        }
      } else {
        setRole(null);
      }
    };

    checkRole();
  }, [user]);

  if (loading || role === null) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography ml={2}>Checking access...</Typography>
      </Box>
    );
  }

  return allowedRoles.includes(role || "") ? (
    <Outlet />
  ) : (
    <Navigate to="/unauthorized" replace />
  );
};

export default PrivateRoute;