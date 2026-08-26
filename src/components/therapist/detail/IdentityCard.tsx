// src/components/therapist/detail/IdentityCard.tsx
//
// 🆕 Round 28x.176 (founder reference screenshot, a pet-adoption app
//   listing: "sunred.vip/therapists/ ลองปรับให้เหมือนอันนี้") — name,
//   location and the stat chips move OFF the photo (where they lived as
//   a text-on-scrim overlay, DetailHero pre-28x.176) and into their own
//   floating white card that overlaps the photo's bottom edge, matching
//   the reference's card-over-photo structure instead of text-over-photo.
//   Reuses the exact overlap mechanic StatsCard already established
//   (negative top margin on mobile, flat on desktop's 2-col layout) so
//   this card and the bio StatsCard right below it read as one system.
//
//   Deliberately does NOT copy the reference's "breed" / "owner" rows —
//   SunRed has no clean equivalent for either (about-copy already covers
//   that ground elsewhere on the page) and duplicating it would just be
//   reference-chasing, not a real content gap. Name+age+verified,
//   location, and the sessions/rebook/rating chips are the fields that
//   actually transfer.
//
// 🆕 Round 28x.178 (founder: "ดูเยอะไปนะ ลอง อันไหนรวมได้ก็รวม") — this used
//   to be the first of three separate stacked white cards/rows (this one,
//   the bio StatsCard, the heart+StatusPill row) reading as visual clutter.
//   Now accepts `children`, rendered inside the SAME card below a hairline,
//   so the page can compose the bio grid and the CTA row into ONE card
//   instead of three.

import React from "react";
// 🆕 (founder /doctor หน้า therapists) — this card's chrome (location hints +
//   sessions/rebook/reviews chips) was hardcoded English; now through t().
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  name: string;
  age: number;
  distanceLabel?: string | null;
  onRequestLocation?: () => void;
  geoStatus?: "idle" | "prompt" | "ready" | "denied" | "unsupported";
  rating?: string;
  reviewCount?: number;
  totalSessions?: number;
  rebookRate?: string;
  /** 🆕 Round 28x.178 — extra sections (bio grid, CTA row) rendered
   *  inside this same card, each preceded by a hairline divider. */
  children?: React.ReactNode;
}

const IdentityCard: React.FC<Props> = ({
  name,
  age,
  distanceLabel,
  onRequestLocation,
  geoStatus = "idle",
  rating,
  reviewCount,
  totalSessions,
  rebookRate,
  children,
}) => {
  const { t } = useTranslation();
  const hasLocation = distanceLabel?.trim() && distanceLabel !== "—";

  return (
    <Box
      sx={{
        // Same overlap geometry as StatsCard (bio mode) below it —
        // negative top margin bleeds this card into the hero photo on
        // mobile; flat on desktop where the hero lives in its own column.
        margin: { xs: "-30px 14px 10px", md: "0 0 12px" },
        position: "relative",
        zIndex: 5,
      }}
    >
      <Box
        sx={{
          padding: "16px 18px",
          borderRadius: "18px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "26px",
              letterSpacing: "-0.02em",
              lineHeight: 1.0,
              color: "var(--sr-ink)",
              "& em": {
                fontStyle: "italic",
                opacity: 0.65,
                fontWeight: 400,
                fontSize: "19px",
              },
            }}
          >
            {name} <em>{age}</em>
          </Typography>
          <VerifiedRoundedIcon
            aria-label="verified"
            titleAccess="Verified by SunRed"
            sx={{ fontSize: 22, color: "#FF9999", marginLeft: "auto" }}
          />
        </Box>

        <Box
          role={hasLocation ? undefined : "button"}
          tabIndex={hasLocation ? undefined : 0}
          onClick={(e) => {
            if (hasLocation || geoStatus === "denied") return;
            e.stopPropagation();
            onRequestLocation?.();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            if (hasLocation || geoStatus === "denied") return;
            e.preventDefault();
            e.stopPropagation();
            onRequestLocation?.();
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "6px",
            fontFamily: SANS,
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--sr-muted)",
            cursor: hasLocation || geoStatus === "denied" ? "default" : "pointer",
          }}
        >
          {hasLocation ? (
            <>
              <LocationOnRoundedIcon sx={{ fontSize: 14 }} />
              {distanceLabel}
            </>
          ) : (
            <>
              <NearMeRoundedIcon sx={{ fontSize: 14 }} />
              {geoStatus === "prompt"
                ? t("detail.loc.locating", "Locating…")
                : geoStatus === "denied"
                  ? t("detail.loc.blocked", "Location blocked — allow it in your browser settings")
                  : geoStatus === "unsupported"
                    ? t("detail.loc.unsupported", "Location unavailable on this device")
                    : t("detail.loc.allow", "Allow location")}
            </>
          )}
        </Box>

        {(totalSessions != null && totalSessions > 0) || (rebookRate && rebookRate !== "—" && parseFloat(rebookRate) > 0) || (rating && rating !== "—") ? (
          <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
            {totalSessions != null && totalSessions > 0 && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(217,124,149,0.12)",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "var(--sr-ink)",
                }}
              >
                {totalSessions >= 1000
                  ? `${Math.round(totalSessions / 100) / 10}k`
                  : totalSessions}{" "}
                {t("detail.chip.sessions", "sessions")}
              </Box>
            )}
            {rebookRate && rebookRate !== "—" && parseFloat(rebookRate) > 0 && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(217,124,149,0.12)",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "var(--sr-ink)",
                }}
              >
                {rebookRate} {t("detail.chip.rebook", "rebook")}
              </Box>
            )}
            {rating && rating !== "—" && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  background: "rgba(217,124,149,0.12)",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "var(--sr-ink)",
                }}
              >
                <Box component="span" sx={{ color: "#F5A623", fontSize: "12px" }}>★</Box>
                {rating}
                {reviewCount != null && reviewCount > 0 && (
                  <Box component="span" sx={{ fontWeight: 400, opacity: 0.75 }}>
                    {" "}· {reviewCount} {t("detail.chip.reviews", "reviews")}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ) : null}

        {React.Children.map(children, (child, i) =>
          child == null ? null : (
            <React.Fragment key={i}>
              <Box sx={{ height: "1px", background: "var(--sr-line)", margin: "14px 0" }} />
              {child}
            </React.Fragment>
          ),
        )}
      </Box>
    </Box>
  );
};

export default IdentityCard;
