// src/components/therapist/TherapistGrid.tsx
//
// 🎨 Phase 2 — 2-col therapist grid (verbatim port of `.therapist-list`).

import React from "react";
import { Box } from "@mui/material";
import TherapistCard, { type TherapistCardData } from "./TherapistCard";

interface Props {
  therapists: TherapistCardData[];
}

const TherapistGrid: React.FC<Props> = ({ therapists }) => (
  <Box
    sx={{
      // .therapist-list — verbatim
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
      padding: "0 14px 16px",
    }}
  >
    {therapists.map((t) => (
      <TherapistCard key={t.id} t={t} />
    ))}
  </Box>
);

export default TherapistGrid;
