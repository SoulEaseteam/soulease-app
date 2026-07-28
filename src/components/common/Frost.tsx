// ─────────────────────────────────────────────────────────────────────
// 🧊 Frost — glassmorphism primitives (founder direction 2026-07-28)
//
// Thin wrappers over the `frost` recipes in src/theme/frost.ts. Use these
// rather than re-spreading the recipes by hand so the glass stays
// consistent (same radii, same hairline, same sheen) across surfaces.
//
//   <FrostCard>            translucent panel
//   <FrostRow>             icon · label · trailing count row
//   <FrostDivider>         hairline between rows
//   <FrostChip selected>   glass chip → solid when selected
//   <FrostHeroSheet>       full-bleed photo → scrim → glass sheet
//
// All colour comes from CSS variables, so every one of these flips with
// DayNightSync automatically. Nothing here hardcodes a hex.
// ─────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

import { frost } from "@/theme/frost";

type WithSx = { sx?: SxProps<Theme>; children?: ReactNode };

// ─────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────
export function FrostCard({ sx, children }: WithSx) {
  return <Box sx={{ ...frost.card, ...sx }}>{children}</Box>;
}

/** Nested surface — sits on a FrostCard, so it carries no outer shadow. */
export function FrostPanel({ sx, children }: WithSx) {
  return <Box sx={{ ...frost.cardRaised, ...sx }}>{children}</Box>;
}

// ─────────────────────────────────────────────────────────────────────
// Divider — hairline, inset so it doesn't touch the card's own border
// ─────────────────────────────────────────────────────────────────────
export function FrostDivider({ inset = 0 }: { inset?: number }) {
  return <Box component="hr" sx={{ ...frost.divider, mx: inset, my: 0 }} />;
}

// ─────────────────────────────────────────────────────────────────────
// Row — icon · label · trailing value
// The reference layout: generous vertical padding, quiet right-aligned
// count, no badge chrome.
// ─────────────────────────────────────────────────────────────────────
export function FrostRow({
  icon,
  label,
  trailing,
  onClick,
  sx,
}: {
  icon?: ReactNode;
  label: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}) {
  const interactive = typeof onClick === "function";

  return (
    <Box
      component={interactive ? ButtonBase : "div"}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        width: "100%",
        px: 2.25,
        py: 1.75,
        textAlign: "left",
        borderRadius: "14px",
        transition: "background 160ms ease",
        ...(interactive && {
          "&:hover": { background: "var(--sr-glass-raised)" },
        }),
        ...sx,
      }}
    >
      {icon ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            // phosphor icons inherit `currentColor`; size is set by the
            // caller's `size` prop, not here, so both icon families work.
            color: "var(--sr-glass-body)",
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Typography sx={{ ...frost.text.body, fontSize: "0.9375rem", flex: 1 }}>
        {label}
      </Typography>

      {trailing != null ? (
        <Typography sx={{ ...frost.text.muted, fontSize: "0.875rem" }}>
          {trailing}
        </Typography>
      ) : null}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Chip — glass by default, solid white (night) / solid ink (day) when
// selected. The mode flip lives in the CSS variables, not here.
// ─────────────────────────────────────────────────────────────────────
export function FrostChip({
  label,
  selected = false,
  onClick,
  sx,
}: {
  label: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        ...(selected ? frost.chipSelected : frost.chip),
        px: 2,
        py: 0.875,
        fontSize: "0.8125rem",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        transition: "background 180ms ease, color 180ms ease",
        ...sx,
      }}
    >
      {label}
    </ButtonBase>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hero sheet — full-bleed photo, scrim fading down, glass sheet joining
//
// The sheet's top edge deliberately overlaps the photo's lower third,
// where the scrim is already near-opaque, so the seam reads as one
// continuous surface instead of two stacked panels.
// ─────────────────────────────────────────────────────────────────────
export function FrostHeroSheet({
  image,
  alt = "",
  photoHeight = "62dvh",
  sheetTop = "46dvh",
  overlay,
  children,
  sx,
}: {
  image: string;
  alt?: string;
  /** How tall the photo runs before the scrim finishes it. */
  photoHeight?: string;
  /** Where the glass sheet's top edge lands. Must be < photoHeight. */
  sheetTop?: string;
  /** Content drawn over the photo, above the sheet (title, back button). */
  overlay?: ReactNode;
  children?: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100dvh",
        background: "var(--sr-bg)",
        ...sx,
      }}
    >
      {/* photo + scrim, pinned to the top of the scroll container */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: photoHeight,
          overflow: "hidden",
        }}
      >
        <Box component="img" src={image} alt={alt} sx={frost.heroPhoto} />
        <Box sx={frost.heroScrim} />
      </Box>

      {/* anything that should sit on the photo itself */}
      {overlay ? (
        <Box sx={{ position: "relative", zIndex: 2 }}>{overlay}</Box>
      ) : null}

      {/* the glass sheet — pulled up so it overlaps the scrimmed photo */}
      <Box sx={{ position: "relative", zIndex: 1, pt: sheetTop }}>
        <Box
          sx={{
            ...frost.sheet,
            minHeight: `calc(100dvh - ${sheetTop})`,
            px: 2.5,
            pt: 2,
            pb: "calc(var(--cta-bottom-offset) + 16px)",
          }}
        >
          {/* grab handle — signals "this sheet is the content surface" */}
          <Box
            aria-hidden
            sx={{
              width: 38,
              height: 4,
              mx: "auto",
              mb: 2.5,
              borderRadius: 999,
              background: "var(--sr-glass-border)",
            }}
          />
          {children}
        </Box>
      </Box>
    </Box>
  );
}
