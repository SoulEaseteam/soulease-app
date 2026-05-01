// src/components/therapist/detail/DetailHero.tsx
//
// 🎨 Phase 2 Detail — hero photo (verbatim port of `.detail-hero` from
// `01-mockups/sunred-therapists.html` Phone B) + restored gallery features.
//
// Restored from old TherapistDetailPage:
//   • 🖼 Multi-photo carousel — swipe / tap left/right to advance, dots
//        reflect the current index (replaces the static-dots mockup).
//   • 🔍 Tap-to-fullscreen modal — Dialog with the active image enlarged
//        (no Swiper to keep bundle lean — single-image at a time).
//   • 📤 Share button (top-right) — Web Share API with copy-to-clipboard
//        fallback + toast notification.

import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** 3-state availability — drives the colored status dot in the hero
 *  name strip:
 *    online  = ●green  · available now
 *    busy    = ●orange · in a session / on the way
 *    offline = ●gray   · not currently working
 */
export type AvailabilityStatus = "online" | "busy" | "offline";

interface Props {
  name: string;
  age: number;
  area: string;
  distance: string;
  /**
   * Either the legacy boolean (true → online, false → offline) or a
   * 3-state status string. Existing callers passing `online={t.online}`
   * keep working; pass `status="busy"` for the new orange state.
   */
  online: boolean | AvailabilityStatus;
  /** Cloudinary-enhanced image URLs. First is cover. Empty → photoBg only. */
  images?: string[];
  /** Fallback CSS background when `images` is empty (gradient placeholder). */
  photoBg: string;
}

const STATUS_COLORS: Record<AvailabilityStatus, { dot: string; label: string }> = {
  online: { dot: "#16a34a", label: "Online" },
  busy: { dot: "#f97316", label: "Busy" },
  offline: { dot: "#9ca3af", label: "Offline" },
};

function resolveStatus(input: boolean | AvailabilityStatus): AvailabilityStatus {
  if (typeof input === "string") return input;
  return input ? "online" : "offline";
}

const DetailHero: React.FC<Props> = ({
  name,
  age,
  area,
  distance,
  online,
  images = [],
  photoBg,
}) => {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  // ⋯ menu — combines Share + Save + Report into one anchor (was 3 buttons)
  const moreBtnRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const photoCount = Math.max(images.length, 1);
  const currentImage = images[activeIdx];

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIdx((i) => (i - 1 + photoCount) % photoCount);
  };
  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIdx((i) => (i + 1) % photoCount);
  };

  const handleShare = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const url = window.location.href;
    const title = `SunRed · ${name}`;
    // 1. Try Web Share API (mobile native sheet)
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        // user cancelled — silent
        return;
      }
    }
    // 2. Fallback to clipboard copy + toast
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // clipboard blocked — silent
    }
  };

  // Background = either current Cloudinary image (in carousel mode) or the
  // original photoBg gradient. We render the image as the .bg layer so the
  // existing gradient overlay (::after radial + linear) sits on top.
  const bgValue = currentImage
    ? `center / cover no-repeat url("${currentImage}"), ${photoBg}`
    : photoBg;

  return (
    <>
      <Box
        sx={{
          // .detail-hero — verbatim
          position: "relative",
          aspectRatio: "4 / 5",
          overflow: "hidden",
          cursor: images.length > 0 ? "zoom-in" : "default",
        }}
        onClick={() => images.length > 0 && setFullscreen(true)}
      >
        {/* .bg + overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: bgValue,
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: [
                "radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)",
                "linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, transparent 30%, transparent 60%, rgba(0, 0, 0, 0.65) 100%)",
              ].join(", "),
            },
          }}
        />

        {/* Prev/Next chevrons — only show when there's > 1 image */}
        {images.length > 1 && (
          <>
            <IconButton
              aria-label="previous photo"
              onClick={goPrev}
              sx={{
                position: "absolute",
                top: "50%",
                left: 8,
                transform: "translateY(-50%)",
                zIndex: 4,
                color: "#fff",
                background: "rgba(0, 0, 0, 0.25)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                width: 36,
                height: 36,
                "&:hover": { background: "rgba(0, 0, 0, 0.4)" },
              }}
            >
              <ChevronLeftRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
            <IconButton
              aria-label="next photo"
              onClick={goNext}
              sx={{
                position: "absolute",
                top: "50%",
                right: 8,
                transform: "translateY(-50%)",
                zIndex: 4,
                color: "#fff",
                background: "rgba(0, 0, 0, 0.25)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                width: 36,
                height: 36,
                "&:hover": { background: "rgba(0, 0, 0, 0.4)" },
              }}
            >
              <ChevronRightRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </>
        )}

        {/* .top-overlay */}
        <Box
          sx={{
            position: "absolute",
            top: "14px",
            left: "14px",
            right: "14px",
            zIndex: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <IconBtnGlass
            label="back"
            onClick={(e) => {
              e?.stopPropagation();
              void navigate(-1);
            }}
          >
            ←
          </IconBtnGlass>
          <Box ref={moreBtnRef}>
            <IconBtnGlass
              label="more"
              onClick={(e) => {
                e?.stopPropagation();
                setMenuOpen(true);
              }}
            >
              ⋯
            </IconBtnGlass>
          </Box>
        </Box>

        {/* .photo-dots — moved BELOW the status line (bottom 38px) so the
            top edge stays clean. Centered ~70% width, 2px tall, 3px gap
            for a more refined look — Instagram story bars but slimmer. */}
        <Box
          sx={{
            position: "absolute",
            bottom: "38px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            display: "flex",
            gap: "3px",
            zIndex: 3,
          }}
        >
          {Array.from({ length: photoCount }).map((_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: "2px",
                borderRadius: "2px",
                background:
                  i === activeIdx
                    ? "#fff"
                    : "rgba(255, 255, 255, 0.32)",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </Box>

        {/* .info-overlay — bottom 70px lifts the name+status above the
            StatsCard's -30px overlap zone (was 24px → got covered). */}
        <Box
          sx={{
            position: "absolute",
            bottom: "70px",
            left: "20px",
            right: "20px",
            zIndex: 3,
            color: "#fff",
          }}
        >
          {/* .name-line */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "6px",
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontFamily: SERIF,
                fontWeight: 500,
                fontSize: "30px",
                letterSpacing: "-0.02em",
                lineHeight: 1.0,
                "& em": {
                  fontStyle: "italic",
                  opacity: 0.85,
                  fontWeight: 400,
                  fontSize: "22px",
                },
              }}
            >
              {name} <em>{age}</em>
            </Typography>
            {/* .verified-large */}
            <Box
              sx={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.95)",
                color: "#1d9bf0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                fontFamily: SANS,
              }}
            >
              ✓
            </Box>
          </Box>
          {/* .quick-meta */}
          <Box
            sx={{
              display: "flex",
              gap: "12px",
              fontSize: "11.5px",
              opacity: 0.95,
              fontWeight: 500,
              fontFamily: SANS,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
              📍 {area} · {distance}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
              {(() => {
                const status = resolveStatus(online);
                const meta = STATUS_COLORS[status];
                return (
                  <>
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: meta.dot,
                        boxShadow: `0 0 10px ${meta.dot}`,
                        display: "inline-block",
                        flexShrink: 0,
                        // Pulse for all statuses (color-tinted glow per status).
                        animation: "sunredPulseDot 1.8s ease-in-out infinite",
                        "@keyframes sunredPulseDot": {
                          "0%, 100%": { transform: "scale(1)", opacity: 1 },
                          "50%": { transform: "scale(1.2)", opacity: 0.72 },
                        },
                      }}
                    />
                    {meta.label}
                  </>
                );
              })()}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 🔍 Fullscreen image viewer (Dialog) — restored from old TherapistDetailPage */}
      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        fullScreen
        PaperProps={{
          sx: {
            background: "#000",
            position: "relative",
          },
        }}
      >
        <IconButton
          aria-label="close"
          onClick={() => setFullscreen(false)}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            color: "#fff",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            "&:hover": { background: "rgba(255, 255, 255, 0.25)" },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>

        {currentImage && (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `center / contain no-repeat url("${currentImage}")`,
            }}
          />
        )}

        {/* Prev/Next inside fullscreen */}
        {images.length > 1 && (
          <>
            <IconButton
              aria-label="previous photo"
              onClick={goPrev}
              sx={{
                position: "absolute",
                top: "50%",
                left: 16,
                transform: "translateY(-50%)",
                color: "#fff",
                background: "rgba(255, 255, 255, 0.15)",
                "&:hover": { background: "rgba(255, 255, 255, 0.25)" },
              }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>
            <IconButton
              aria-label="next photo"
              onClick={goNext}
              sx={{
                position: "absolute",
                top: "50%",
                right: 16,
                transform: "translateY(-50%)",
                color: "#fff",
                background: "rgba(255, 255, 255, 0.15)",
                "&:hover": { background: "rgba(255, 255, 255, 0.25)" },
              }}
            >
              <ChevronRightRoundedIcon />
            </IconButton>

            {/* Dot pager inside fullscreen */}
            <Box
              sx={{
                position: "absolute",
                bottom: 24,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {images.map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: i === activeIdx ? 12 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === activeIdx ? "#fff" : "rgba(255, 255, 255, 0.4)",
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Dialog>

      {/* ⋯ More menu — Share / Save / Report. Replaces the standalone
          ↗ Share button so the hero top row is just [← back] [⋯ more]. */}
      <Menu
        anchorEl={moreBtnRef.current}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            marginTop: "6px",
            minWidth: 180,
            borderRadius: "14px",
            background: "rgba(255, 248, 240, 0.96)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: "0 12px 32px rgba(126, 30, 46, 0.18)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            void handleShare();
          }}
        >
          <ListItemIcon>
            <IosShareRoundedIcon
              fontSize="small"
              sx={{ color: "#3c1e14" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              sx: {
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#3c1e14",
              },
            }}
          >
            Share profile
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            // TODO Task 5 — wire to favoriteTherapists in users/{uid}
          }}
        >
          <ListItemIcon>
            <FavoriteBorderRoundedIcon
              fontSize="small"
              sx={{ color: "#FE0944" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              sx: {
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#3c1e14",
              },
            }}
          >
            Save to favorites
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            // TODO Task 6 — open ReportPage with therapistId pre-filled
          }}
        >
          <ListItemIcon>
            <FlagOutlinedIcon
              fontSize="small"
              sx={{ color: "rgba(60, 30, 20, 0.7)" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              sx: {
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "rgba(60, 30, 20, 0.7)",
              },
            }}
          >
            Report
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

// .icon-btn-glass — small reusable
const IconBtnGlass: React.FC<{
  children: React.ReactNode;
  label: string;
  onClick?: (e?: React.MouseEvent) => void;
}> = ({ children, label, onClick }) => (
  <Box
    role="button"
    tabIndex={0}
    aria-label={label}
    onClick={onClick}
    sx={{
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.18)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      cursor: "pointer",
      fontFamily: SANS,
    }}
  >
    {children}
  </Box>
);

export default DetailHero;
