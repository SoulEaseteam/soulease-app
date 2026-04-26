import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  Paper,
} from "@mui/material";

import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

import { useAuth } from "@/hooks/useAuth";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import dayjs from "dayjs";

// =============================
// TYPE
// =============================
type ManualStatus = "available" | "resting" | "Auto";

interface TherapistData {
  name?: string;
  statusOverride?: ManualStatus | null;
  isHoliday?: boolean;
  startTime?: string;
  endTime?: string;
  busyUntil?: any;
}

// =============================
// COMPONENT
// =============================
const TherapistStatusManager: React.FC = () => {
  const { user } = useAuth(); // therapist auth
  const [therapist, setTherapist] = useState<TherapistData | null>(null);
  const [loading, setLoading] = useState(true);

  const [manualStatus, setManualStatus] = useState<ManualStatus>("Auto");
  const [holiday, setHoliday] = useState(false);

  // ======================================================
  // FETCH THERAPIST REAL-TIME
  // ======================================================
  useEffect(() => {
    if (!user?.uid) return;

    const ref = doc(db, "therapists", user.uid);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TherapistData;
        setTherapist(data);

        setManualStatus(data.statusOverride || "Auto");
        setHoliday(data.isHoliday || false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // ======================================================
  // HANDLE STATUS UPDATE
  // ======================================================
  const updateStatus = async (newStatus: ManualStatus) => {
    if (!user?.uid) return;

    setManualStatus(newStatus);

    await updateDoc(doc(db, "therapists", user.uid), {
      statusOverride: newStatus,
      updatedAt: dayjs().toISOString(),
    });
  };

  // ======================================================
  // HANDLE HOLIDAY
  // ======================================================
  const updateHoliday = async (value: boolean) => {
    if (!user?.uid) return;
    setHoliday(value);

    await updateDoc(doc(db, "therapists", user.uid), {
      isHoliday: value,
      updatedAt: dayjs().toISOString(),
    });
  };

  if (loading || !therapist) {
    return (
      <Box p={3}>
        <Typography>Loading therapist status...</Typography>
      </Box>
    );
  }

  // ======================================================
  // AUTO STATUS PREVIEW
  // ======================================================
  const autoStatusPreview = calculateTherapistStatus({
    startTime: therapist.startTime ?? "",
    endTime: therapist.endTime ?? "",
    busyUntil: therapist.busyUntil,
    isHoliday: therapist.isHoliday,
    isBooked: false,
    statusOverride: "Auto",
  } as any);

  return (
    <Box p={3} sx={{ maxWidth: 480, mx: "auto" }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          💼 Therapist Status Manager
        </Typography>

        {/* HOLIDAY TOGGLE */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography fontSize={18}>🌴 Holiday Mode</Typography>

          <Switch
            checked={holiday}
            onChange={(e) => updateHoliday(e.target.checked)}
            color="error"
          />
        </Stack>

        {/* MANUAL STATUS */}
        <Typography fontSize={18} mb={1}>
          🔧 Manual Status Override
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={manualStatus}
          onChange={(_, val) => val && updateStatus(val)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="available" color="success">
            Available
          </ToggleButton>

          <ToggleButton value="resting" color="warning">
            Resting
          </ToggleButton>

          <ToggleButton value="Auto" color="primary">
            Auto
          </ToggleButton>
        </ToggleButtonGroup>

        {/* AUTO PREVIEW */}
        <Box mt={3} p={2} sx={{ bgcolor: "#FFF4E6", borderRadius: 2 }}>
          <Typography fontWeight="bold" mb={1}>
            🤖 Auto Mode Preview
          </Typography>

          <Typography>
            Working Hours: {therapist.startTime} → {therapist.endTime}
          </Typography>

          <Typography>
            Expected Status Now:{" "}
            <strong style={{ color: "#C62828" }}>{autoStatusPreview.status}</strong>
          </Typography>
        </Box>

        {/* CURRENT MODE */}
        <Box mt={4}>
          <Typography fontSize={18}>
            💡 Current Mode:{" "}
            <strong style={{ color: "#C62828" }}>{manualStatus}</strong>
          </Typography>

          {holiday && (
            <Typography mt={1} color="error">
              * Therapist is on Holiday — Auto mode disabled
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TherapistStatusManager;