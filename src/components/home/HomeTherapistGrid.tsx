// src/components/home/HomeTherapistGrid.tsx
//
// 🆕 Round 25b (founder 2026-05-02): bring /therapists list onto HomePage
//    as a compact 2-col grid. Founder asked: "เอา /therapists มาไว้น่าโฮม
//    แบบเรียง2การ์ด".
//
// Hard rules:
//   • Real Firestore via onSnapshot — NO demo fallback (Round 21 rationale).
//   • Same enrich + sort logic as TherapistListPage so the home preview is
//     a faithful slice of the canonical list (no divergent ranking).
//   • rating coerced via Number() to dodge the toFixed-on-string crash
//     fixed earlier this session.
//   • Privacy mask on in-session therapists (matches TherapistProfileCard).
//   • Phone-shell-aware: 2-col grid sized for the 430px container.

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

import { db } from "@/lib/firebase";
import type { Therapist as TherapistType, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { getBadgeForTherapist } from "@/utils/getTherapistBadge";
import { enhanceImage } from "@/utils/cloudinary";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  todayBookings?: number;
  totalBookings?: number;
  badgeKey?: "VIP" | "HOT" | "NEW" | null;
  badgeUpdatedAt?: number | null;
  computedStatus?: Avail;
  hideProfile?: boolean;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

const PRIVACY_PLACEHOLDER = "/images/icon/sunred-logo.png";

/** Status pill color per Avail state — mirrors TherapistProfileCard CTA gradient. */
const STATUS_STYLES: Record<Avail, { bg: string; color: string; label: string }> = {
  available: {
    bg: "linear-gradient(135deg, #FE0944 0%, #FEAE96 100%)",
    color: "#fff",
    label: "BOOK NOW",
  },
  bookable: {
    bg: "linear-gradient(135deg, #FFB088 0%, #FE7A52 100%)",
    color: "#fff",
    label: "IN SESSION",
  },
  resting: {
    bg: "linear-gradient(135deg, #FFD6E8 0%, #E5D0FF 100%)",
    color: "#7E1F4D",
    label: "PRE-BOOK",
  },
};

const HomeTherapistGrid: React.FC = () => {
  const navigate = useNavigate();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Firestore live subscription — same shape as TherapistListPage ──
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "therapists"), (snap) => {
      const raw: Therapist[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data() as Therapist;
        raw.push({
          ...data,
          id: data.id || docSnap.id,
        });
      });

      // Enrich with computed status + badge.
      // Defensive: clamp engine output to a known Avail union — Firestore
      // statusOverride is type-as-cast inside the engine, so unexpected
      // strings can leak through and break downstream sort + STATUS_STYLES.
      const enriched = raw.map((t) => {
        const { status } = calculateTherapistStatus(t as unknown as TherapistType);
        // TS sees status as Avail, but engine casts statusOverride to Avail —
        // an admin typo in Firestore can leak a non-Avail string at runtime.
        /* eslint-disable @typescript-eslint/no-unnecessary-condition */
        const safeStatus: Avail =
          status === "available" || status === "bookable" || status === "resting"
            ? status
            : "resting";
        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
        const badge = getBadgeForTherapist({
          totalBookings: t.totalBookings ?? 0,
          todayBookings: t.todayBookings ?? 0,
          badgeKey: t.badgeKey,
          badgeUpdatedAt: t.badgeUpdatedAt,
        });
        return { ...t, computedStatus: safeStatus, badgeKey: badge.key };
      });

      // Sort: badge priority → status → rating
      enriched.sort((a, b) => {
        const badgeOrder: Array<"VIP" | "HOT" | "NEW" | null> = [
          "VIP",
          "HOT",
          "NEW",
          null,
        ];
        const statusOrder: Record<Avail, number> = {
          available: 1,
          bookable: 2,
          resting: 3,
        };
        const aBadge = badgeOrder.indexOf(a.badgeKey ?? null);
        const bBadge = badgeOrder.indexOf(b.badgeKey ?? null);
        if (aBadge !== bBadge) return aBadge - bBadge;
        const stA = statusOrder[a.computedStatus];
        const stB = statusOrder[b.computedStatus];
        if (stA !== stB) return stA - stB;
        // Number() can return NaN — `||` is correct fallback (NaN ?? 0 → NaN)
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });

      setTherapists(enriched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Live "available now" count for header social proof
  const availableNow = therapists.filter(
    (t) => t.computedStatus === "available"
  ).length;

  return (
    <Box
      component="section"
      id="therapist-grid"
      aria-label="available therapists"
      sx={{ margin: "20px 14px 4px", scrollMarginTop: "12px" }}
    >
      {/* Header: serif title + live count.
          🆕 Round 25c — "See all →" link removed. There's no separate
          /therapists page anymore; the grid below IS the canonical list. */}
      <Box
        sx={{
          marginBottom: "10px",
          paddingX: "2px",
        }}
      >
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Our <em style={{ color: "#FE0944", fontStyle: "italic" }}>therapists</em>
        </Typography>
        {!loading && therapists.length > 0 && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "3px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {availableNow > 0 && (
              <>
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#16a34a",
                    boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
                    animation: "homeGridBlink 1.4s ease-in-out infinite",
                    "@keyframes homeGridBlink": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                <Box component="span" sx={{ color: "#16a34a", fontWeight: 700 }}>
                  {availableNow} online now
                </Box>
                <Box component="span" sx={{ opacity: 0.4 }}>·</Box>
              </>
            )}
            <Box component="span">{therapists.length} verified</Box>
          </Typography>
        )}
      </Box>

      {/* Body */}
      {loading ? (
        <Box
          sx={{
            minHeight: 220,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress size={28} sx={{ color: "#FE0944" }} />
        </Box>
      ) : therapists.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            padding: "40px 16px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "15px",
              color: "#3c1e14",
              fontWeight: 600,
            }}
          >
            No therapists right now
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "4px",
            }}
          >
            Check back in a moment.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "10px",
          }}
        >
          {therapists.map((t) => (
            <CompactCard
              key={t.id}
              t={t}
              onClick={() => navigate(`/therapists/${t.id}`)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

/** ---------------- Compact Card ---------------- */
interface CompactCardProps {
  t: Therapist;
  onClick: () => void;
}

const CompactCard: React.FC<CompactCardProps> = ({ t, onClick }) => {
  // Defensive: any statusOverride can leak from Firestore (admin typo etc.)
  // and break STATUS_STYLES lookup. Coerce anything non-Avail back to "resting".
  const raw = t.computedStatus;
  const status: Avail =
    raw === "available" || raw === "bookable" || raw === "resting"
      ? raw
      : "resting";
  const inSession = status === "bookable" || !!t.hideProfile;
  const styles = STATUS_STYLES[status];

  const img = t.image || "placeholder.jpg";
  const resolvedImage =
    img.startsWith("http") || img.startsWith("/") ? img : `/images/${img}`;

  // Number() can return NaN — `||` is correct fallback (NaN ?? 0 → NaN)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const ratingNum = (Number(t.rating) || 0).toFixed(1);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const reviewsNum = Number(t.reviews) || 0;

  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        position: "relative",
        cursor: "pointer",
        borderRadius: "16px",
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.65)",
        boxShadow:
          "0 6px 18px rgba(126, 30, 46, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
        padding: "6px 6px 10px",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 12px 28px rgba(254, 9, 68, 0.16)",
        },
      }}
    >
      {/* Image — 1:1 square */}
      <Box sx={{ position: "relative" }}>
        <Box
          component="img"
          src={
            inSession
              ? PRIVACY_PLACEHOLDER
              : enhanceImage(resolvedImage, { variant: "card" })
          }
          alt={inSession ? "Therapist in session" : t.name}
          loading="lazy"
          decoding="async"
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            objectFit: inSession ? "contain" : "cover",
            borderRadius: "12px",
            background: inSession
              ? "linear-gradient(135deg, #FFE5D9 0%, #E5D0FF 100%)"
              : "transparent",
            padding: inSession ? 3 : 0,
            display: "block",
          }}
        />

        {/* Badge corner overlay */}
        {t.badgeKey && (
          <Box
            sx={{
              position: "absolute",
              top: 6,
              left: 6,
              padding: "2px 7px",
              borderRadius: "99px",
              background:
                t.badgeKey === "VIP"
                  ? "linear-gradient(135deg, #FE0944, #831843)"
                  : t.badgeKey === "HOT"
                  ? "linear-gradient(135deg, #FE7A52, #FE0944)"
                  : "linear-gradient(135deg, #14b8a6, #0d9488)",
              color: "#fff",
              fontFamily: SANS,
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            }}
          >
            {t.badgeKey}
          </Box>
        )}

        {/* Status pulse dot — top right */}
        {status === "available" && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#16a34a",
              boxShadow: "0 0 0 3px rgba(22,163,74,0.25)",
              animation: "compactBlink 1.4s ease-in-out infinite",
              "@keyframes compactBlink": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
            }}
          />
        )}
      </Box>

      {/* Name */}
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: "14px",
          fontWeight: 600,
          color: "#2a1a14",
          marginTop: "6px",
          paddingX: "4px",
          lineHeight: 1.15,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {t.name}
      </Typography>

      {/* Rating row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          paddingX: "4px",
          marginTop: "1px",
        }}
      >
        <StarRoundedIcon sx={{ fontSize: 12, color: "#F59E0B" }} />
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            color: "rgba(60, 30, 20, 0.7)",
            fontWeight: 600,
          }}
        >
          {ratingNum}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10px",
            color: "rgba(60, 30, 20, 0.45)",
          }}
        >
          · {reviewsNum}
        </Typography>
      </Box>

      {/* Status pill */}
      <Box
        sx={{
          marginTop: "6px",
          marginX: "4px",
          padding: "5px 8px",
          borderRadius: "99px",
          background: styles.bg,
          color: styles.color,
          fontFamily: SANS,
          fontSize: "10px",
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: "0.05em",
          boxShadow: "0 4px 10px rgba(254, 9, 68, 0.15)",
        }}
      >
        {styles.label}
      </Box>
    </Box>
  );
};

export default HomeTherapistGrid;
