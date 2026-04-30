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

import React, { useState } from "react";
import { Box, Typography, Dialog, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  name: string;
  age: number;
  area: string;
  distance: string;
  online: boolean;
  /** Cloudinary-enhanced image URLs. First is cover. Empty → photoBg only. */
  images?: string[];
  /** Fallback CSS background when `images` is empty (gradient placeholder). */
  photoBg: string;
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
              navigate(-1);
            }}
          >
            ←
          </IconBtnGlass>
          <Box sx={{ display: "flex", gap: "8px" }}>
            <IconBtnGlass
              label="share"
              onClick={(e) => {
                e?.stopPropagation();
                void handleShare();
              }}
            >
              ↗
            </IconBtnGlass>
            <IconBtnGlass label="more" onClick={(e) => e?.stopPropagation()}>
              ⋯
            </IconBtnGlass>
          </Box>
        </Box>

        {/* .photo-dots — reflects activeIdx now (was static in mockup) */}
        <Box
          sx={{
            position: "absolute",
            top: "60px",
            left: "14px",
            right: "14px",
            display: "flex",
            gap: "4px",
            zIndex: 3,
          }}
        >
          {Array.from({ length: photoCount }).map((_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: "3px",
                borderRadius: "2px",
                background: i === activeIdx ? "#fff" : "rgba(255, 255, 255, 0.4)",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </Box>

        {/* .info-overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: "24px",
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
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {online ? "●Online" : "●Offline"}
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
