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
        background: "var(--sr-panel)",
        border: fullySet
          ? "1.5px solid var(--sr-ink)"
          : "1px solid var(--sr-hairline)",
        transition: "all 0.15s ease",
        "&:hover": { background: "var(--sr-panel-2)" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "10px",
          background: location.hasCoords
            ? "var(--sr-panel-2)"
            : "var(--sr-panel-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--sr-body)",
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
                color: "var(--sr-ink)",
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
                color: "var(--sr-body)",
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
                  color: "var(--sr-muted)",
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
                  color: "var(--sr-body)",
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
              color: "var(--sr-muted)",
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
          color: fullySet ? "var(--sr-ink)" : "var(--sr-muted)",
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
