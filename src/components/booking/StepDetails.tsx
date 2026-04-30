// src/components/booking/StepDetails.tsx
//
// 🎨 Phase 3 Booking — Step 4 customer details.
//
// Three inputs:
//   1. Name           — min 2 chars (validated by parent)
//   2. Phone          — international format, react-phone-number-input
//                       defaults to TH (+66). isValidPhoneNumber check.
//   3. Notes          — optional, server-side profanity moderation
//                       runs on submit (commit 6) — here we just inform
//                       the user that notes are reviewed.
//
// Validation surfaces inline (red helper text). Parent's `canAdvance`
// in BookingFlowPage already gates the Next button on name+phone min-len,
// but here we additionally show a phone format hint.

import React, { useEffect, useState } from "react";
import { Box, Typography, TextField } from "@mui/material";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  customerName: string;
  customerPhone: string;
  notes: string;
  onChange: (next: Partial<{
    customerName: string;
    customerPhone: string;
    notes: string;
  }>) => void;
}

const fieldLabel = (text: string) => (
  <Typography
    sx={{
      fontFamily: SANS,
      fontSize: "11px",
      fontWeight: 700,
      color: "rgba(60, 30, 20, 0.55)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "8px",
      paddingLeft: "4px",
    }}
  >
    {text}
  </Typography>
);

const inputSx = {
  "& .MuiOutlinedInput-root": {
    background: "rgba(255, 255, 255, 0.65)",
    borderRadius: "14px",
    fontFamily: SANS,
    fontSize: "13.5px",
    "& fieldset": { borderColor: "rgba(0, 0, 0, 0.08)" },
    "&:hover fieldset": { borderColor: "rgba(254, 9, 68, 0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#FE0944", borderWidth: "1.5px" },
  },
};

const StepDetails: React.FC<Props> = ({
  customerName,
  customerPhone,
  notes,
  onChange,
}) => {
  // Phone field shows error only after the user has interacted with it
  // (avoids "invalid" flashing on a pristine field).
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneIsValid =
    customerPhone.trim() === "" ||
    isValidPhoneNumber(customerPhone);

  // Stamp the brand color onto react-phone-number-input's internal
  // class names — its DOM is opaque so we lean on a scoped <style> tag.
  useEffect(() => {
    const styleId = "sunred-phone-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .PhoneInput {
        background: rgba(255, 255, 255, 0.65);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        transition: border-color 0.15s ease;
      }
      .PhoneInput:focus-within {
        border-color: #FE0944;
        border-width: 1.5px;
        padding: calc(12px - 0.5px) calc(14px - 0.5px);
      }
      .PhoneInput--invalid {
        border-color: #FE0944;
      }
      .PhoneInputInput {
        background: transparent;
        border: none;
        outline: none;
        font-family: inherit;
        font-size: inherit;
        color: #3c1e14;
      }
      .PhoneInputCountrySelect {
        margin-right: 8px;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Name */}
      <Box>
        {fieldLabel("Your name")}
        <TextField
          fullWidth
          autoComplete="name"
          placeholder="As it appears on your hotel reservation"
          value={customerName}
          onChange={(e) => onChange({ customerName: e.target.value })}
          sx={inputSx}
        />
      </Box>

      {/* Phone */}
      <Box>
        {fieldLabel("Phone number")}
        <PhoneInput
          international
          defaultCountry="TH"
          value={customerPhone || undefined}
          onChange={(val) => onChange({ customerPhone: val ?? "" })}
          onBlur={() => setPhoneTouched(true)}
          placeholder="Enter phone number"
          className={
            phoneTouched && !phoneIsValid ? "PhoneInput--invalid" : undefined
          }
        />
        {phoneTouched && !phoneIsValid && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11.5px",
              color: "#FE0944",
              marginTop: "6px",
              paddingLeft: "8px",
            }}
          >
            Please enter a valid phone number with country code
          </Typography>
        )}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            color: "rgba(60, 30, 20, 0.5)",
            marginTop: "6px",
            paddingLeft: "8px",
            lineHeight: 1.4,
          }}
        >
          Used for arrival confirmation and en-route updates only — never
          shared with marketing.
        </Typography>
      </Box>

      {/* Notes */}
      <Box>
        {fieldLabel("Notes for therapist (optional)")}
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          placeholder="e.g. Focus on lower back, prefer firm pressure, allergies, mobility limitations…"
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          inputProps={{ maxLength: 500 }}
          sx={inputSx}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "6px",
            paddingLeft: "8px",
            paddingRight: "8px",
          }}
        >
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.5)",
              lineHeight: 1.4,
            }}
          >
            Notes are reviewed for safety before reaching your therapist.
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.4)",
              flexShrink: 0,
              marginLeft: "12px",
            }}
          >
            {notes.length}/500
          </Typography>
        </Box>
      </Box>

      {/* Reassurance copy — BRAND.md positioning */}
      <Box
        sx={{
          padding: "14px 16px",
          borderRadius: "14px",
          background: "rgba(254, 201, 167, 0.25)",
          border: "1px solid rgba(254, 122, 82, 0.2)",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <Box
          sx={{
            fontSize: "16px",
            lineHeight: 1,
            marginTop: "1px",
          }}
        >
          🛡
        </Box>
        <Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "13px",
              fontWeight: 600,
              color: "#3c1e14",
              marginBottom: "2px",
            }}
          >
            Verified service
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11.5px",
              color: "rgba(60, 30, 20, 0.7)",
              lineHeight: 1.45,
            }}
          >
            All therapists hold valid Thai Ministry of Public Health (ผ.พ.)
            certificates. Sessions are licensed therapeutic massage only.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default StepDetails;
