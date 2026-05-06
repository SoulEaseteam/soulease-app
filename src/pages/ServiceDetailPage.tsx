// src/pages/ServiceDetailPage.tsx
//
// Round 28c5 (founder 2026-05-05) — full redesign matching the SunRed
// design system. Replaces the Trebuchet-MS / warm-tan / emoji-heavy
// layout with the cool-neutral, Fraunces+Inter, no-emoji editorial
// system used throughout the rest of the app.
//
// Section flow (top → bottom):
//   1. Sticky header — back arrow + small service name
//   2. Hero image with brand badge
//   3. Title block — eyebrow (badge as small caps) + serif title +
//      italic description
//   4. Duration & price tiles — 60 / 90 / 120 min, three tiles side by
//      side with the per-duration price (computed via servicePricing)
//   5. "Reserved by N guests" chip — live Firestore booking count
//   6. About-this-therapy hero card — uses service.detail
//   7. Therapeutic benefits — single-column list of check-tick cards
//      from service.benefit
//   8. Payment & Policy CTA — links to canonical /payment-methods
//   9. Sticky bottom CTA — "Reserve this therapy" gradient red button
//
// Legacy slug compatibility kept via resolveServiceId.

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Typography, IconButton, Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import { Link as RouterLink } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import services from "@/data/services";
import { resolveServiceId } from "@/utils/serviceCatalog";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";
import { db } from "@/lib/firebase";
import { useServiceUsageStats } from "@/hooks/useServiceUsageStats";

// ─── Enhancements (add-ons) — display-only catalog ────────────────────
//   Round 28c24 (founder 2026-05-05) — re-grounded in the reality of
//   Bangkok outcall after-dark: most reservations land between 22:00
//   and 04:00, guests stay scattered across hotels far beyond the
//   central districts, and longer / paired engagements are common
//   premium asks. Pricing is a guide; actual figures are confirmed by
//   the concierge during booking so margin stays under our control.
const ENHANCEMENTS: Array<{
  Icon: typeof SpaRoundedIcon;
  label: string;
  detail: string;
  price: string;
  tone: { bg: string; fg: string };
}> = [
  {
    Icon: DirectionsCarFilledRoundedIcon,
    label: "Beyond-central travel",
    detail:
      "Reservations outside Sukhumvit · Silom · Asok · Sathorn · Thonglor",
    price: "quoted",
    tone: { bg: "rgba(254, 9, 68, 0.08)", fg: "#FE0944" },
  },
  {
    Icon: HourglassBottomRoundedIcon,
    label: "Extend your session",
    detail: "Add 30 or 60 minutes to your reservation",
    price: "tier-priced",
    tone: { bg: "rgba(14, 165, 233, 0.10)", fg: "#0284C7" },
  },
  {
    Icon: SpaRoundedIcon,
    label: "Premium aromatic oil",
    detail: "Lavender, neroli, or sandalwood blend",
    price: "+฿150",
    tone: { bg: "rgba(22, 163, 74, 0.10)", fg: "#16a34a" },
  },
  {
    Icon: GroupRoundedIcon,
    label: "Duo experience",
    detail: "Two practitioners, one session — reserved for VIP",
    price: "quoted",
    tone: { bg: "rgba(245, 158, 11, 0.10)", fg: "#D97706" },
  },
];

// ─── Service reviews — live, filtered by serviceId ────────────────────
type ServiceReview = {
  bookingId: string;
  rating: number;
  body: string;
  ago: string;
  ts: number;
};

type FsDate = Timestamp | Date | string | number | null | undefined;

function toMs(v: FsDate): number {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

function formatAgo(ms: number): string {
  if (!ms) return "";
  const diff = Math.max(0, (Date.now() - ms) / 1000);
  if (diff < 60) return "just now";
  const m = Math.round(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.round(mo / 12);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const ServiceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const therapistId = searchParams.get("therapistId") || null;

  const canonicalId = resolveServiceId(id);
  const service = canonicalId
    ? services.find((s) => s.id === canonicalId)
    : undefined;

  // Same hook as ServicesPage. Round 28c10 — we use raw session count
  // (servedById) only. Unique-guest dedup is unreliable for this
  // product (foreign guests, occasionally inaccurate phones, concierge
  // chat as the source of human truth), so we count sessions where
  // status ∈ {completed, done} grouped by serviceId — two fields are
  // enough for the public chip.
  const { servedById } = useServiceUsageStats();
  const sessionCount = service ? servedById.get(service.id) ?? 0 : 0;

  // Live service reviews — fetched directly from `bookings/{id}` where
  // serviceId matches and the doc carries a non-empty reviewText.
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  useEffect(() => {
    if (!service?.id) {
      setReviews([]);
      return;
    }
    const q = query(
      collection(db, "bookings"),
      where("serviceId", "==", service.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ServiceReview[] = [];
        snap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          const b = d.data();
          const text = ((b.reviewText as string) ?? "").trim();
          if (!text) return;
          const ts = toMs((b.createdAt ?? b.startAt) as FsDate);
          list.push({
            bookingId: d.id,
            rating: typeof b.rating === "number" ? b.rating : 5,
            body: text,
            ago: formatAgo(ts),
            ts,
          });
        });
        list.sort((a, b) => b.ts - a.ts);
        setReviews(list.slice(0, 8));
      },
      (err) => {
        console.warn("[ServiceDetailPage] reviews snapshot error:", err);
      }
    );
    return unsub;
  }, [service?.id]);

  if (!service) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
          fontFamily: SANS,
          p: 4,
        }}
      >
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 500,
            color: "#3c1e14",
          }}
        >
          Service not found.
        </Typography>
      </Box>
    );
  }

  const tiers = durationsFor(service);

  const handleReserve = () => {
    const q = new URLSearchParams({ service: service.id });
    if (therapistId) q.set("therapistId", therapistId);
    void navigate(`/therapists?${q.toString()}`);
  };

  return (
    <Box
      sx={{
        // Phone shell — Clean v3 cool-neutral palette
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        position: "relative",
        // Reserve room for the sticky bottom CTA
        pb: "calc(96px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* ───────── 1. Sticky header ───────── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(250, 251, 252, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label="back"
          onClick={() => void navigate(-1)}
          sx={{
            width: 38,
            height: 38,
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#3c1e14",
            boxShadow: "0 2px 8px rgba(126, 30, 46, 0.06)",
            "&:hover": { background: "#fff" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: 17,
            fontWeight: 500,
            color: "#3c1e14",
            letterSpacing: "-0.01em",
            mr: "38px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {service.name}
        </Typography>
      </Box>

      {/* ───────── 2. Hero image with badge ───────── */}
      <Box sx={{ px: 2, mt: 2, position: "relative" }}>
        <Box
          sx={{
            position: "relative",
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.10)",
          }}
        >
          <Box
            component="img"
            src={service.image}
            alt={service.name}
            sx={{
              width: "100%",
              display: "block",
              aspectRatio: "16 / 11",
              objectFit: "cover",
            }}
          />
          {/* Bottom gradient for legibility if any text overlaps */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)",
              pointerEvents: "none",
            }}
          />
          {service.badge && (
            <Box
              sx={{
                position: "absolute",
                top: 14,
                left: 14,
                px: 1.2,
                py: 0.4,
                fontFamily: SANS,
                fontSize: 10.5,
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                borderRadius: 1.2,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                boxShadow: "0 4px 10px rgba(254, 9, 68, 0.35)",
              }}
            >
              {service.badge}
            </Box>
          )}
        </Box>
      </Box>

      {/* ───────── 3+. Body — title, tiles, about, benefits, CTA ───────── */}
      <Box
        sx={{
          px: 2,
          mt: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {/* 3. Title block */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#b85c3c",
              fontWeight: 700,
              mb: 0.75,
              fontFamily: SANS,
              "&::before": {
                content: '""',
                width: "22px",
                height: "1px",
                background: "rgba(184, 92, 60, 0.55)",
              },
            }}
          >
            {service.badge.toLowerCase()}
          </Box>
          <Typography
            component="h2"
            sx={{
              fontFamily: SERIF,
              fontSize: 26,
              fontWeight: 400,
              color: "#2a1a14",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {service.name}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 13.5,
              fontStyle: "italic",
              color: "rgba(60,30,20,0.7)",
              lineHeight: 1.55,
              mt: 0.75,
            }}
          >
            {service.desc}
          </Typography>
        </Box>

        {/* 4. Duration & price tiles */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${tiers.length}, 1fr)`,
            gap: 1,
          }}
        >
          {tiers.map((duration) => {
            const price = priceForDuration(service, duration);
            return (
              <Box
                key={duration}
                sx={{
                  p: 1.25,
                  borderRadius: "14px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                  textAlign: "center",
                  transition:
                    "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: "rgba(254, 9, 68, 0.14)",
                    boxShadow:
                      "0 1px 2px rgba(254, 9, 68, 0.05), 0 8px 22px rgba(254, 9, 68, 0.05)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(60,30,20,0.55)",
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                >
                  {duration} min
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#2a1a14",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                  }}
                >
                  {formatTHB(price)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* 5. Sessions-delivered chip — brand-red wash on light card */}
        {sessionCount > 0 && (
          <Box
            sx={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "baseline",
              gap: 0.7,
              px: 1.2,
              py: 0.55,
              borderRadius: 999,
              background:
                "linear-gradient(135deg, rgba(254, 9, 68, 0.06) 0%, rgba(254, 122, 82, 0.05) 100%)",
              border: "1px solid rgba(254, 9, 68, 0.20)",
              boxShadow:
                "0 1px 2px rgba(254, 9, 68, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
              fontFamily: SANS,
              whiteSpace: "nowrap",
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                transform: "translateY(1px)",
              }}
            >
              <StarRoundedIcon
                sx={{
                  fontSize: 14,
                  color: "#FE0944",
                  filter: "drop-shadow(0 1px 2px rgba(254, 9, 68, 0.25))",
                }}
              />
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#b85c3c",
              }}
            >
              Delivered
            </Box>
            <Box
              component="span"
              sx={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 15,
                fontWeight: 600,
                color: "#FE0944",
                letterSpacing: "-0.01em",
              }}
            >
              {sessionCount.toLocaleString()}
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: 11.5,
                fontWeight: 500,
                color: "rgba(60, 30, 20, 0.7)",
                letterSpacing: "0.01em",
              }}
            >
              {sessionCount === 1 ? "session" : "sessions"}
            </Box>
          </Box>
        )}

        {/* 6. About this therapy — hero card */}
        <Box
          sx={{
            p: 2.25,
            borderRadius: "18px",
            background: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.05)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#b85c3c",
              fontWeight: 700,
              mb: 0.5,
              fontFamily: SANS,
              "&::before": {
                content: '""',
                width: "22px",
                height: "1px",
                background: "rgba(184, 92, 60, 0.55)",
              },
            }}
          >
            About this therapy
          </Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 17,
              fontWeight: 500,
              color: "#2a1a14",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
              mb: 1,
              "& em": { fontStyle: "italic", color: "#FE0944" },
            }}
          >
            A considered <em>ritual.</em>
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: "rgba(60,30,20,0.78)",
            }}
          >
            {service.detail}
          </Typography>
        </Box>

        {/* 7. Therapeutic benefits */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#b85c3c",
              fontWeight: 700,
              mb: 0.75,
              fontFamily: SANS,
              "&::before": {
                content: '""',
                width: "22px",
                height: "1px",
                background: "rgba(184, 92, 60, 0.55)",
              },
            }}
          >
            Therapeutic benefits
          </Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 400,
              color: "#2a1a14",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              mb: 1.5,
              "& em": { fontStyle: "italic", color: "#FE0944" },
            }}
          >
            What you can <em>expect</em>
          </Typography>

          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            {service.benefit.map((b) => (
              <Box
                key={b}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                  p: 1.5,
                  borderRadius: "14px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                  transition:
                    "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: "rgba(22, 163, 74, 0.18)",
                    boxShadow:
                      "0 1px 2px rgba(22, 163, 74, 0.05), 0 8px 22px rgba(22, 163, 74, 0.05)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: "rgba(22, 163, 74, 0.10)",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: 16 },
                    mt: "1px",
                  }}
                >
                  <CheckRoundedIcon />
                </Box>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    color: "rgba(60,30,20,0.82)",
                    pt: "1px",
                  }}
                >
                  {b}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* 7b. Enhancements — display-only add-ons (Round 28c21).
              Pricing is a guide; actual selection happens via the
              concierge during booking, so margin stays under control. */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#b85c3c",
              fontWeight: 700,
              mb: 0.75,
              fontFamily: SANS,
              "&::before": {
                content: '""',
                width: "22px",
                height: "1px",
                background: "rgba(184, 92, 60, 0.55)",
              },
            }}
          >
            Enhancements
          </Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 400,
              color: "#2a1a14",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              mb: 1.5,
              "& em": { fontStyle: "italic", color: "#FE0944" },
            }}
          >
            Add to your <em>therapy</em>
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {ENHANCEMENTS.map(({ Icon, label, detail, price, tone }) => (
              <Box
                key={label}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  transition:
                    "border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: "rgba(254, 9, 68, 0.18)",
                    boxShadow:
                      "0 1px 2px rgba(254, 9, 68, 0.05), 0 8px 22px rgba(254, 9, 68, 0.06)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: "12px",
                    background: tone.bg,
                    color: tone.fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: 20 },
                  }}
                >
                  <Icon />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#2a1a14",
                      lineHeight: 1.25,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11.5,
                      color: "rgba(60,30,20,0.65)",
                      lineHeight: 1.4,
                      mt: 0.25,
                    }}
                  >
                    {detail}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flexShrink: 0,
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#FE0944",
                    letterSpacing: "-0.005em",
                    whiteSpace: "nowrap",
                    pl: 1,
                  }}
                >
                  {price}
                </Box>
              </Box>
            ))}
          </Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 11.5,
              color: "rgba(60, 30, 20, 0.55)",
              fontStyle: "italic",
              lineHeight: 1.5,
              mt: 2.5,
              textAlign: "center",
            }}
          >
            Available on request your concierge will confirm at booking.
          </Typography>
        </Box>

        {/* 7c. Reviews carousel — Round 28c21.
              Live snapshot of `bookings` where serviceId matches and
              reviewText is non-empty. Horizontal scroll, no identity
              data exposed (booking id only). Hidden when no reviews. */}
        {reviews.length > 0 && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#b85c3c",
                fontWeight: 700,
                mb: 0.75,
                fontFamily: SANS,
                "&::before": {
                  content: '""',
                  width: "22px",
                  height: "1px",
                  background: "rgba(184, 92, 60, 0.55)",
                },
              }}
            >
              Guest Reviews
            </Box>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 22,
                fontWeight: 400,
                color: "#2a1a14",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                mb: 1.5,
                "& em": { fontStyle: "italic", color: "#FE0944" },
              }}
            >
              From verified <em>guests</em>
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 1.25,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                pb: 1,
                mx: -2,
                px: 2,
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {reviews.map((r) => (
                <Box
                  key={r.bookingId}
                  sx={{
                    flex: "0 0 84%",
                    maxWidth: 320,
                    minWidth: 240,
                    p: 1.75,
                    borderRadius: "16px",
                    background: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    boxShadow:
                      "0 1px 2px rgba(15, 23, 42, 0.03), 0 6px 18px rgba(15, 23, 42, 0.04)",
                    scrollSnapAlign: "start",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Stars */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                      mb: 1,
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarRoundedIcon
                        key={i}
                        sx={{
                          fontSize: 16,
                          color:
                            i < Math.round(r.rating)
                              ? "#FE0944"
                              : "rgba(15, 23, 42, 0.12)",
                          filter:
                            i < Math.round(r.rating)
                              ? "drop-shadow(0 1px 2px rgba(254, 9, 68, 0.25))"
                              : "none",
                        }}
                      />
                    ))}
                  </Box>

                  {/* Body */}
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: 14,
                      fontStyle: "italic",
                      color: "#2a1a14",
                      lineHeight: 1.55,
                      letterSpacing: "-0.005em",
                      flex: 1,
                      display: "-webkit-box",
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    “{r.body}”
                  </Typography>

                  {/* Footer — verified badge + time */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 1.25,
                      pt: 1,
                      borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <Box
                      sx={{
                        fontFamily: SANS,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#16a34a",
                      }}
                    >
                      Verified guest
                    </Box>
                    {r.ago && (
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 10.5,
                          color: "rgba(60, 30, 20, 0.55)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {r.ago}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* 8. Payment & Policy CTA — single source of truth */}
        <Box
          component={RouterLink}
          to="/payment-methods"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.75,
            borderRadius: "14px",
            background: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            textDecoration: "none",
            color: "inherit",
            transition:
              "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
            "&:hover": {
              transform: "translateY(-1px)",
              borderColor: "rgba(254, 9, 68, 0.18)",
              boxShadow:
                "0 1px 2px rgba(254, 9, 68, 0.05), 0 8px 22px rgba(254, 9, 68, 0.06)",
            },
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: "12px",
              background: "rgba(20, 184, 166, 0.10)",
              color: "#0d9488",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "& svg": { fontSize: 20 },
            }}
          >
            <PaymentsRoundedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#b85c3c",
                lineHeight: 1.2,
                mb: 0.25,
              }}
            >
              Payment & Policy
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 14,
                fontWeight: 500,
                color: "#2a1a14",
                letterSpacing: "-0.005em",
                lineHeight: 1.3,
              }}
            >
              Pricing, deposits & cancellation
            </Typography>
          </Box>
          <ChevronRightRoundedIcon
            sx={{ color: "rgba(60,30,20,0.4)", fontSize: 22 }}
          />
        </Box>
      </Box>

      {/* ───────── 9. Sticky bottom CTA — Reserve this therapy ───────── */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background:
            "linear-gradient(180deg, rgba(250,251,252,0) 0%, rgba(250,251,252,0.92) 30%, rgba(250,251,252,0.98) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          px: 2,
          pt: 2,
          pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
          // Pull it up so it overlaps the bottom edge of the scroll area
          marginTop: "-64px",
        }}
      >
        <Button
          fullWidth
          variant="contained"
          onClick={handleReserve}
    
          sx={{
            height: 50,
            borderRadius: 999,
            background: "linear-gradient(135deg, #FE0944, #FE7A52)",
            color: "#fff",
            fontFamily: SANS,
            fontSize: 14.5,
            fontWeight: 700,
            textTransform: "none",
            letterSpacing: "0.01em",
            boxShadow: "0 8px 22px rgba(254, 9, 68, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #E50840, #E56A47)",
              boxShadow: "0 10px 26px rgba(254, 9, 68, 0.42)",
            },
          }}
        >
          Reserve this therapy
        </Button>
      </Box>
    </Box>
  );
};

export default ServiceDetailPage;
