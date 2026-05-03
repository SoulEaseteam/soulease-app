// src/components/TherapistSearchBar.tsx
//
// 🔍 Glass-pill search bar — verbatim port of `02-mockups/sunred-therapists2.html`
// (`.search-bar` block). Drop above a TherapistProfileCard grid to filter
// the list by name / language / specialty.
//
// Usage:
//   const [q, setQ] = useState("");
//   <TherapistSearchBar value={q} onChange={setQ} />
//   const filtered = useMemo(
//     () => therapists.filter((t) => matchesQuery(t, q)),
//     [therapists, q]
//   );
//
// The component is purely presentational — filtering lives in the parent.

import React from "react";
import { Box, IconButton } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { brand, fonts } from "@/theme";

export interface TherapistSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Custom placeholder. Default: localized "Search by name, language, specialty…" */
  placeholder?: string;
  /** Outer margin in px. Defaults to "0 14px 12px" matching mockup spacing. */
  m?: string;
  /** Auto-focus on mount (e.g., when /therapists?focus=search). */
  autoFocus?: boolean;
}

const TherapistSearchBar: React.FC<TherapistSearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search by name, language, specialty…",
  m = "0 14px 12px",
  autoFocus = false,
}) => {
  const hasValue = value.length > 0;

  return (
    <Box
      sx={{
        margin: m,
        padding: "13px 16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        // 🆕 Round 28b1 (founder 2026-05-03) — search field bumped to be
        //   "ชัดขึ้นอีกนิด" on the new cool-neutral bg. Old glass.pill
        //   was 55% white + blur — too faint against #FAFBFC.
        //   New: solid white, crisp slate border, soft lift shadow,
        //   subtle red focus ring so it reads as an interactive control.
        background: "#FFFFFF",
        borderRadius: 99,
        border: "1px solid rgba(15, 23, 42, 0.10)",
        boxShadow:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.06)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:focus-within": {
          borderColor: "rgba(254, 9, 68, 0.45)",
          boxShadow:
            "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(254, 9, 68, 0.12), 0 0 0 3px rgba(254, 9, 68, 0.10)",
        },
      }}
    >
      <SearchRoundedIcon sx={{ fontSize: 20, color: brand.red, flexShrink: 0 }} />
      <Box
        component="input"
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        aria-label="Search therapists"
        sx={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: fonts.body,
          fontSize: 14,
          fontWeight: 500,
          color: brand.text,
          minWidth: 0, // allows shrink in flex container
          "&::placeholder": {
            color: "rgba(60, 30, 20, 0.55)",
            fontWeight: 500,
          },
          // Hide the native search × button — we render our own clear icon
          "&::-webkit-search-cancel-button": { display: "none" },
        }}
      />
      {hasValue && (
        <IconButton
          aria-label="clear search"
          size="small"
          onClick={() => onChange("")}
          sx={{
            width: 22,
            height: 22,
            color: brand.textMuted,
            "&:hover": { color: brand.red, background: "transparent" },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
};

export default TherapistSearchBar;
// Helper `matchesQuery` lives in `@/utils/therapistSearch` — kept out of
// this file so React Fast Refresh can reload the component without losing
// state.
