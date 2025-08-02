import React from "react";
import { Routes, Route } from "react-router-dom";
import PrivateRoute from "@/components/PrivateRoute";

import TherapistProfilePage from "@/pages/therapist/TherapistProfilePage";
import TherapistStatusPage from "@/pages/therapist/TherapistStatusPage";
import TherapistLocationPage from "@/pages/therapist/TherapistLocationPage";
import TherapistBookingsPage from "@/pages/therapist/TherapistBookingsPage";
import TherapistLayout from "@/layouts/TherapistLayout";

const TherapistRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<PrivateRoute allowedRoles={["therapist"]} />}>
        {/* ✅ ครอบ Layout ให้ทุกหน้าของ Therapist */}
        <Route element={<TherapistLayout />}>
          <Route path="/therapist/profile" element={<TherapistProfilePage />} />
          <Route path="/therapist/status" element={<TherapistStatusPage />} />
          <Route path="/therapist/location" element={<TherapistLocationPage />} />
          <Route path="/therapist/bookings" element={<TherapistBookingsPage />} />
        
        </Route>
      </Route>
    </Routes>
  );
};

export default TherapistRoutes;