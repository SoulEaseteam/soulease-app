// src/pages/admin/EditTherapistPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  MenuItem,
  Stack,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/utils/getErrorMessage";

const statusOptions = ["available", "bookable", "resting"] as const;
const badgeOptions = ["VIP", "HOT", "NEW", "none"] as const;

/** narrow shape ของฟอร์มแก้ therapist (subset ของ Therapist สำหรับ admin) */
interface EditTherapistForm {
  name?: string;
  customId?: string;
  image?: string;
  specialty?: string;
  rating?: number;
  startTime?: string;
  endTime?: string;
  badge?: (typeof badgeOptions)[number];
  statusOverride?: (typeof statusOptions)[number] | "" | null;
}

const EditTherapistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [therapist, setTherapist] = useState<EditTherapistForm>({});

  useEffect(() => {
    if (!id) return;
    const fetchTherapist = async () => {
      try {
        const ref = doc(db, "therapists", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTherapist(snap.data() as EditTherapistForm);
        }
      } catch (err) {
        console.error("Error loading therapist:", err);
        toast.error(`Failed to load therapist: ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapist();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setTherapist((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "therapists", id), {
        name: therapist.name || "",
        customId: therapist.customId || "",
        image: therapist.image || "",
        specialty: therapist.specialty || "",
        rating: therapist.rating || 0,
        startTime: therapist.startTime || "",
        endTime: therapist.endTime || "",
        badge: therapist.badge === "none" ? null : therapist.badge ?? null,
        statusOverride: therapist.statusOverride || null,
        updatedAt: serverTimestamp(),
      });

      toast.success("Saved");
      navigate("/admin/therapists");
    } catch (err) {
      console.error("Error saving therapist:", err);
      toast.error(`Save failed: ${getErrorMessage(err)}`);
    }
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: 600 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        ✏️ Edit Therapist
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Name"
          name="name"
          fullWidth
          value={therapist.name || ""}
          onChange={handleChange}
        />

        {/* Custom ID */}
        <TextField
          label="Custom ID (for URL)"
          name="customId"
          fullWidth
          value={therapist.customId || ""}
          onChange={handleChange}
        />

        <TextField
          label="Image URL"
          name="image"
          fullWidth
          value={therapist.image || ""}
          onChange={handleChange}
        />

        <TextField
          label="Specialty"
          name="specialty"
          fullWidth
          value={therapist.specialty || ""}
          onChange={handleChange}
        />

        <TextField
          label="Rating"
          name="rating"
          type="number"
          fullWidth
          inputProps={{ step: 0.1, min: 0, max: 5 }}
          value={therapist.rating || 0}
          onChange={handleChange}
        />

        <TextField
          label="Start Time"
          name="startTime"
          type="time"
          fullWidth
          value={therapist.startTime || ""}
          onChange={handleChange}
        />

        <TextField
          label="End Time"
          name="endTime"
          type="time"
          fullWidth
          value={therapist.endTime || ""}
          onChange={handleChange}
        />

        <TextField
          label="Badge"
          name="badge"
          select
          fullWidth
          value={therapist.badge || "none"}
          onChange={handleChange}
        >
          {badgeOptions.map((b) => (
            <MenuItem key={b} value={b}>
              {b === "none" ? "None" : b}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Status Override"
          name="statusOverride"
          select
          fullWidth
          value={therapist.statusOverride || ""}
          onChange={handleChange}
        >
          <MenuItem value="">Auto</MenuItem>
          {statusOptions.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box mt={4}>
        <Button variant="contained" onClick={handleSave}>💾 Save</Button>
        <Button sx={{ ml: 2 }} onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default EditTherapistPage;