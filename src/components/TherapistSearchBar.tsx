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
import { brand, fonts } from "@/theme/theme";

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
  // 🆕 Round 28s167 — Founder: "ตรงค้นหา ลดข้อความลง". Was
  //   "Search by name, language, specialty…" — too busy. Short
  //   reads cleaner with the rest of the page.
  // 🆕 Round 28s224 — "Search…" → "Find your practitioner…" — the
  //   premium register from CLAUDE.md §3, and a softer concierge
  //   tone than a blank "Search…".
  placeholder = "Find your practitioner…",
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
        // 🕯️ 28t — mode-aware search pill (white by day, dark panel by night).
        background: "var(--sr-panel)",
        borderRadius: 99,
        border: "1px solid var(--sr-hairline)",
        boxShadow: "var(--sr-card-shadow)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:focus-within": {
          borderColor: "#D97C95",
          boxShadow:
            "var(--sr-card-shadow), 0 0 0 3px rgba(217, 124, 149, 0.18)",
        },
      }}
    >
      {/* 🆕 Round 28s167 — Founder: "สีอ่อนลง". Magnifier was brand
          red — too loud against the muted page. Soft cool gray now. */}
      <SearchRoundedIcon
        sx={{ fontSize: 20, color: "var(--sr-muted)", flexShrink: 0 }}
      />
      <Box
        component="input"
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        aria-label="Search practitioners"
        sx={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: fonts.body,
          // 🆕 Round 28b15 (founder bug-fix) — Mobile Safari/Chrome iOS
          //   auto-zoom when an input has font-size < 16px. That zoom
          //   blocks users from completing booking. Bumping to 16px
          //   keeps the visual identical (CSS pixels) but prevents
          //   the zoom-on-focus.
          fontSize: 16,
          fontWeight: 500,
          color: brand.text,
          minWidth: 0, // allows shrink in flex container
          "&::placeholder": {
            color: "var(--sr-muted)",
            opacity: 0.85,
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
