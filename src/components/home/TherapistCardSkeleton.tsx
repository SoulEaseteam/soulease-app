// src/components/home/TherapistCardSkeleton.tsx
//
// 💎 Aurora-themed skeleton loader for TherapistProfileCard
// แสดงตอน first paint หรือ data ยังโหลด — ดู polished กว่า blank cards

import React from "react";
import { Box } from "@mui/material";

const TherapistCardSkeleton: React.FC = () => {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 200,
        borderRadius: 6,
        p: 1.7,
        backgroundColor: "rgba(255, 255, 255, 0.45)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
        // ✨ Aurora shimmer animation
        position: "relative",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          animation: "auroraShimmer 1.6s ease-in-out infinite",
        },
        "@keyframes auroraShimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      }}
    >
      {/* Image placeholder */}
      <Box
        sx={{
          width: "100%",
          height: 260,
          borderRadius: 4,
          background:
            "linear-gradient(120deg, #FFE5D9 0%, #FFD6E8 50%, #E5D0FF 100%)",
          opacity: 0.75,
        }}
      />

      {/* Name line */}
      <Box
        sx={{
          mt: 1.2,
          height: 16,
          width: "60%",
          mx: "auto",
          borderRadius: 1,
          background: "rgba(225, 29, 72, 0.12)",
        }}
      />

      {/* Rating line */}
      <Box
        sx={{
          mt: 0.8,
          height: 11,
          width: "45%",
          mx: "auto",
          borderRadius: 1,
          background: "rgba(0, 0, 0, 0.06)",
        }}
      />

      {/* Button placeholder */}
      <Box
        sx={{
          mt: 1.2,
          height: 36,
          borderRadius: 99,
          background:
            "linear-gradient(90deg, #FFD6E8 0%, #E5D0FF 50%, #D4F4E2 100%)",
          opacity: 0.6,
        }}
      />
    </Box>
  );
};

export default TherapistCardSkeleton;
