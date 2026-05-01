// src/components/booking/AddonsSheet.tsx
//
// 🎨 Phase 4 — Bottom sheet for picking optional add-ons (Hot stone,
// Premium oil upgrade, Pair booking). Replaces the inline checkbox
// list on the Confirm Order page.

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography } from "@mui/material";
import { ADDONS } from "@/data/bookingExtras";
import { formatTHB } from "@/utils/servicePricing";
import { SheetHeader, SheetCTA } from "@/components/booking/LanguageSheet";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  open: boolean;
  onClose: () => void;
  value: string[]; // selected addon ids
  onConfirm: (next: string[]) => void;
}

const AddonsSheet: React.FC<Props> = ({ open, onClose, value, onConfirm }) => {
  const [draft, setDraft] = useState<string[]>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const toggle = (id: string) =>
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const draftTotal = ADDONS.filter((a) => draft.includes(a.id)).reduce(
    (sum, a) => sum + a.price,
    0
  );

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
          borderRadius: "24px 24px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          maxWidth: "430px",
          margin: "0 auto",
          left: 0,
          right: 0,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <SheetHeader title="Optional add-ons" onClose={onClose} />

      <Box sx={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "rgba(60, 30, 20, 0.6)",
            marginBottom: "14px",
          }}
        >
          Enhance your session — toggle any add-on, the total updates live.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ADDONS.map((a) => {
            const isSelected = draft.includes(a.id);
            return (
              <Box
                key={a.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => toggle(a.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggle(a.id);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  background: "rgba(255, 255, 255, 0.7)",
                  border: isSelected
                    ? "1.5px solid #FE0944"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "12px",
                    background: isSelected
                      ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                      : "rgba(254, 201, 167, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  {a.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#3c1e14",
                    }}
                  >
                    {a.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11.5px",
                      color: "rgba(60, 30, 20, 0.6)",
                    }}
                  >
                    {a.description}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#FE0944",
                  }}
                >
                  +{formatTHB(a.price)}
                </Typography>
                <Box
                  aria-hidden
                  sx={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: "6px",
                    border: isSelected
                      ? "none"
                      : "2px solid rgba(0, 0, 0, 0.2)",
                    background: isSelected ? "#FE0944" : "transparent",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  {isSelected && "✓"}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <SheetCTA
        label={
          draft.length === 0
            ? "Continue without add-ons"
            : `Confirm · +${formatTHB(draftTotal)}`
        }
        onClick={() => onConfirm(draft)}
      />
    </Drawer>
  );
};

export default AddonsSheet;
