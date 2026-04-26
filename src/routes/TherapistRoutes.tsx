import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import PrivateRoute from "@/routes/PrivateRoute";
import TherapistLayout from "@/components/layouts/TherapistLayout";

// Lazy pages
const TherapistProfilePage = React.lazy(() =>
  import("@/pages/therapist/TherapistProfilePage")
);
const TherapistStatusPage = React.lazy(() =>
  import("@/pages/therapist/TherapistStatusPage")
);
const TherapistLocationPage = React.lazy(() =>
  import("@/pages/therapist/TherapistLocationPage")
);
const TherapistBookingsPage = React.lazy(() =>
  import("@/pages/therapist/TherapistBookingsPage")
);

const TherapistRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "18px",
          }}
        >
          Loading...
        </div>
      }
    >
      <Routes>
        <Route
          element={
            <PrivateRoute requiredRoles={["therapist"]}>
              <TherapistLayout />
            </PrivateRoute>
          }
        >
          <Route path="profile" element={<TherapistProfilePage />} />
          <Route path="status" element={<TherapistStatusPage />} />
          <Route path="location" element={<TherapistLocationPage />} />
          <Route path="bookings" element={<TherapistBookingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default TherapistRoutes;