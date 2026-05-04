

import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  MenuItem,
  Stack,
  Paper,
  Alert,
} from "@mui/material";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/utils/getErrorMessage";

// ------------------------
// FORM TYPE
// ------------------------
interface TherapistFeatureForm {
  age: string;
  height: string;
  weight: string;
  gender: string;
  ethnicity: string;
  bodyType: string;
  bustSize: string;
  hairColor: string;
  skintone: string;
  vaccinated: string;
  smoker: string;
  language: string;
}

interface TherapistFormData {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  galleryInput: string;
  rating: number | string;
  reviews: number | string;
  startTime: string;
  endTime: string;
  employmentType: string;
  specialty: string;
  servicesAvailable: string;
  features: TherapistFeatureForm;
}

// ------------------------
// SERVICE NORMALIZATION MAP
// ------------------------
// 🆕 Round 28b18 — keywords map to current SKU codes
const SERVICE_MAP: Record<string, string> = {
  thai: "xSR-Thai",
  "thai massage": "xSR-Thai",
  aromatherapy: "SR-Aroma",
  aroma: "SR-Aroma",
  gentleman: "SR-HJ2200",
  gentlemen: "SR-HJ2200",
  recovery: "SR-HJ2200",
  signature: "SR-B2B3200",
  exclusive: "SR-B2B3200",
  therapeutic: "SR-B2B3200",
};

const normalizeService = (s: string) => {
  const key = s.trim().toLowerCase();
  return SERVICE_MAP[key] || s.trim();
};

// ------------------------
// SEO SLUG MAKER
// ------------------------
const makeSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ==========================================================
// PAGE START
// ==========================================================
const AddTherapistPage: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<TherapistFormData>({
    id: "",
    name: "",
    email: "",
    phone: "",
    image: "",
    galleryInput: "",
    rating: 5,
    reviews: 0,

    // Time
    startTime: "10:00",
    endTime: "04:00",

    // Employment
    employmentType: "",
    specialty: "",

    // Services
    servicesAvailable: "",

    // Features block
    features: {
      age: "",
      height: "",
      weight: "",
      gender: "",
      ethnicity: "",
      bodyType: "",
      bustSize: "",
      hairColor: "",
      skintone: "",
      vaccinated: "",
      smoker: "",
      language: "",
    },
  });

  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setData((p) => ({ ...p, [name]: value }));
  };

  const handleFeatureChange = (k: keyof TherapistFeatureForm, v: string) => {
    setData((p) => ({
      ...p,
      features: { ...p.features, [k]: v },
    }));
  };

  // ==========================================================
  // VALIDATION
  // ==========================================================
  const validate = () => {
    if (!data.id.trim()) return "❌ ID is required";
    if (!data.name.trim()) return "❌ Name is required";
    if (!data.startTime || !data.endTime) return "❌ Working hours missing";

    return null;
  };

  // ==========================================================
  // SUBMIT HANDLER (ULTRA MODE)
  // ==========================================================
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setSnackbar(error);
      return;
    }

    setLoading(true);

    try {
      const ref = doc(db, "therapists", data.id);
      const check = await getDoc(ref);

      if (check.exists()) {
        setSnackbar("❌ This therapist ID already exists");
        setLoading(false);
        return;
      }

      // -----------------------------
      // AUTO-NORMALIZE SERVICES
      // -----------------------------
      const serviceList = (data.servicesAvailable || "")
        .split(",")
        .map((x) => normalizeService(x))
        .filter((x) => x.length > 0);

      // -----------------------------
      // CLEAN GALLERY
      // -----------------------------
      const gallery = (data.galleryInput || "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 3);

      // -----------------------------
      // AUTO GENERATE CUSTOM FIELDS
      // -----------------------------
      const slug = makeSlug(data.name);

      // -----------------------------
      // FINAL PAYLOAD
      // -----------------------------
      const payload = {
        id: data.id.trim(),
        name: data.name.trim(),
        slug,
        email: data.email.trim(),
        phone: data.phone.trim(),
        image: data.image.trim(),
        gallery,

        rating: Number(data.rating) || 5,
        reviews: Number(data.reviews) || 0,

        startTime: data.startTime,
        endTime: data.endTime,

        employmentType: data.employmentType.trim(),
        specialty: data.specialty.trim(),
        servicesAvailable: serviceList,

        features: { ...data.features },

        // ULTRA DEFAULTS
        holiday: false,
        todayBookings: 0,
        totalBookings: 0,
        badge: "NONE",

        statusOverride: "Auto",
        manualStatus: null,
        isBooked: false,
        busyUntil: null,

        createdAt: serverTimestamp(),
      };

      // -----------------------------
      // SAVE
      // -----------------------------
      await setDoc(ref, payload);

      setSnackbar("✅ Therapist created successfully");
      setTimeout(() => navigate("/admin/therapists"), 1200);
    } catch (err: unknown) {
      console.error("[AddTherapist]", err);
      setSnackbar(`❌ Failed to add therapist: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================
  return (
    <Box p={3} maxWidth={600} mx="auto">
      <Typography variant="h4" fontWeight="bold" mb={2}>
        ➕ Add New Therapist (ULTRA)
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <TextField label="Therapist ID (Unique)" name="id" value={data.id} onChange={handleChange} />

          <TextField label="Name" name="name" value={data.name} onChange={handleChange} fullWidth />

          <TextField label="Email" name="email" value={data.email} onChange={handleChange} />
          <TextField label="Phone" name="phone" value={data.phone} onChange={handleChange} />

          <TextField label="Image URL" name="image" value={data.image} onChange={handleChange} fullWidth />

          <TextField
            label="Gallery URLs (comma separated)"
            name="galleryInput"
            value={data.galleryInput}
            onChange={handleChange}
            fullWidth
          />

          {/* Working Hours */}
          <Stack direction="row" spacing={2}>
            <TextField label="Start Time" name="startTime" type="time" value={data.startTime} onChange={handleChange} />
            <TextField label="End Time" name="endTime" type="time" value={data.endTime} onChange={handleChange} />
          </Stack>

          <TextField label="Employment Type" name="employmentType" value={data.employmentType} onChange={handleChange} />

          <TextField label="Specialty" name="specialty" value={data.specialty} onChange={handleChange} />

          <TextField
            label="Services Available (comma separated)"
            name="servicesAvailable"
            value={data.servicesAvailable}
            onChange={handleChange}
          />

          {/* FEATURES */}
          <Typography fontWeight="bold" mt={2}>
            Features
          </Typography>

          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="Age" value={data.features.age} onChange={(e) => handleFeatureChange("age", e.target.value)} />
              <TextField label="Height" value={data.features.height} onChange={(e) => handleFeatureChange("height", e.target.value)} />
              <TextField label="Weight" value={data.features.weight} onChange={(e) => handleFeatureChange("weight", e.target.value)} />
            </Stack>

            <TextField label="Gender" value={data.features.gender} onChange={(e) => handleFeatureChange("gender", e.target.value)} />
            <TextField label="Ethnicity" value={data.features.ethnicity} onChange={(e) => handleFeatureChange("ethnicity", e.target.value)} />
            <TextField label="Body Type" value={data.features.bodyType} onChange={(e) => handleFeatureChange("bodyType", e.target.value)} />
            <TextField label="Bust Size" value={data.features.bustSize} onChange={(e) => handleFeatureChange("bustSize", e.target.value)} />
            <TextField label="Hair Color" value={data.features.hairColor} onChange={(e) => handleFeatureChange("hairColor", e.target.value)} />
            <TextField label="Skin Tone" value={data.features.skintone} onChange={(e) => handleFeatureChange("skintone", e.target.value)} />
            <TextField label="Vaccinated" value={data.features.vaccinated} onChange={(e) => handleFeatureChange("vaccinated", e.target.value)} />
            <TextField label="Smoker" value={data.features.smoker} onChange={(e) => handleFeatureChange("smoker", e.target.value)} />
            <TextField label="Language" value={data.features.language} onChange={(e) => handleFeatureChange("language", e.target.value)} />
          </Stack>

          <Button variant="contained" disabled={loading} onClick={handleSubmit}>
            {loading ? "Saving…" : "Add Therapist"}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
      >
        <Alert severity="info">{snackbar}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AddTherapistPage;