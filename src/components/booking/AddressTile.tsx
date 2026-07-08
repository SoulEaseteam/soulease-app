// src/components/booking/AddressTile.tsx
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage.
//
// Summary tile rendered inside the Confirm Order page. Tapping it
// opens the full Select Location page (map + place autocomplete).
// Two visual states:
//   • Empty — soft tan icon disc + "Tap to set your location"
//   • Filled — brand-red ring around the tile + place name + line
//     for full address. Once contact name + phone are also captured
//     we surface them on a third line so the customer can verify
//     before placing the order.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export interface AddressTileProps {
  location: {
    name: string | null;
    address: string | null;
    addressDetails: string;
    hasCoords: boolean;
    contactName: string;
    phone: string;
  };
  onTap: () => void;
}

export const AddressTile: React.FC<AddressTileProps> = ({ location, onTap }) => {
  const { t } = useTranslation();
  const phoneClean = location.phone.replace(/\D/g, "");
  const phoneOk = phoneClean.length >= 10;
  const fullySet = location.hasCoords && location.contactName.trim() && phoneOk;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onTap();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px",
        borderRadius: "16px",
        cursor: "pointer",
        background: "rgba(255, 255, 255, 0.85)",
        border: fullySet
          ? "1.5px solid #2D2D2B"
          : "1px solid rgba(0, 0, 0, 0.06)",
        transition: "all 0.15s ease",
        "&:hover": { background: "rgba(255, 255, 255, 0.95)" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "10px",
          background: location.hasCoords
            ? "rgba(15, 23, 42, 0.12)"
            : "rgba(255, 240, 240, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2D2D2B",
        }}
      >
        <LocationOnRoundedIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {location.hasCoords ? (
          <>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "14px",
                fontWeight: 600,
                color: "#1A2B2E",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {location.name ?? t("booking.address.pinned", "Pinned location")}
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                color: "rgba(15, 23, 42, 0.6)",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {location.addressDetails || location.address || "—"}
            </Typography>
            {fullySet && (
              <Typography
                component="div"
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "rgba(15, 23, 42, 0.55)",
                  marginTop: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <PersonRoundedIcon sx={{ fontSize: 13 }} />
                {location.contactName}
                <Box component="span" sx={{ opacity: 0.5 }}>
                  ·
                </Box>
                <PhoneRoundedIcon sx={{ fontSize: 13 }} />
                {location.phone}
              </Typography>
            )}
            {!fullySet && (
              <Typography
                component="div"
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "#2D2D2B",
                  fontWeight: 600,
                  marginTop: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <WarningAmberRoundedIcon sx={{ fontSize: 13, color: "#d97706" }} />
                {t("booking.address.addContact", "Add contact name + phone")}
              </Typography>
            )}
          </>
        ) : (
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(15, 23, 42, 0.55)",
              lineHeight: 1.2,
            }}
          >
            Tap to set your location
          </Typography>
        )}
      </Box>
      <Box
        aria-hidden
        sx={{
          fontSize: "20px",
          color: fullySet ? "#2D2D2B" : "rgba(15, 23, 42, 0.35)",
          flexShrink: 0,
          fontWeight: 800,
        }}
      >
        ›
      </Box>
    </Box>
  );
};

export default AddressTile;
