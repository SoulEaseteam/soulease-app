// src/components/home/ServiceFilterChips.tsx
//
// 🎯 Quick-filter service chips above the therapist grid
// Aurora Modern style — pastel gradient pills

import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import SpaIcon from "@mui/icons-material/Spa";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";

export type ServiceFilter =
  | "all"
  | "thai-massage"
  | "aromatherapy"
  | "couple"
  | "gentleman";

interface ChipDef {
  key: ServiceFilter;
  labelKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
  gradient: string;
}

const CHIPS: ChipDef[] = [
  {
    key: "all",
    labelKey: "filter.all",
    defaultLabel: "All",
    icon: <AllInclusiveIcon sx={{ fontSize: 14 }} />,
    gradient:
      "linear-gradient(135deg, #FFE5D9 0%, #E5D0FF 50%, #D4F4E2 100%)",
  },
  {
    key: "thai-massage",
    labelKey: "filter.thai",
    defaultLabel: "Thai",
    icon: <SpaIcon sx={{ fontSize: 14 }} />,
    gradient: "linear-gradient(135deg, #FFD6A5 0%, #FFB088 100%)",
  },
  {
    key: "aromatherapy",
    labelKey: "filter.aroma",
    defaultLabel: "Aroma",
    icon: <LocalFloristIcon sx={{ fontSize: 14 }} />,
    gradient: "linear-gradient(135deg, #E5D0FF 0%, #C5A8FF 100%)",
  },
  {
    key: "couple",
    labelKey: "filter.couple",
    defaultLabel: "Couple",
    icon: <FavoriteRoundedIcon sx={{ fontSize: 14 }} />,
    gradient: "linear-gradient(135deg, #FFD6E8 0%, #FFA8C9 100%)",
  },
];

interface ServiceFilterChipsProps {
  active: ServiceFilter;
  onChange: (s: ServiceFilter) => void;
}

const ServiceFilterChips: React.FC<ServiceFilterChipsProps> = ({
  active,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        pb: 1,
        pt: 1.5,
        px: 0.5,
        // hide scrollbar but keep scroll capability
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        WebkitOverflowScrolling: "touch",
      }}
      role="tablist"
      aria-label="Service filter"
    >
      {CHIPS.map((chip) => {
        const isActive = active === chip.key;
        return (
          <Box
            key={chip.key}
            component={motion.button}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.key)}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            sx={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.6,
              py: 0.7,
              borderRadius: 99,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: 0.2,
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.6)",
              transition: "all 0.25s ease",
              ...(isActive
                ? {
                    background: chip.gradient,
                    color: "#1a2b2e",
                    boxShadow: "0 4px 14px rgba(225, 29, 72, 0.18)",
                    transform: "translateY(-1px)",
                  }
                : {
                    backgroundColor: "rgba(255,255,255,0.65)",
                    color: "rgba(60, 60, 80, 0.75)",
                    backdropFilter: "blur(8px)",
                  }),
            }}
          >
            {chip.icon}
            {t(chip.labelKey, chip.defaultLabel)}
          </Box>
        );
      })}
    </Box>
  );
};

export default ServiceFilterChips;
