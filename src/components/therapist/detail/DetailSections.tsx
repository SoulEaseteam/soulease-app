// src/components/therapist/detail/DetailSections.tsx
//
// 🎨 Phase 2 Detail — middle body sections, each a verbatim port of one
// `.d-section` block from sunred-therapists2.html. Bundled for compactness;
// each export is structurally distinct per HANDOFF1.md (no consolidation
// of visual layers — each section's DOM matches its mockup `.d-section`).
//
// Exports: About, Credentials, Specialties, Languages, Pricing, Calendar, Reviews

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// shared .d-section + h2 wrapper
const DSectionH2: React.FC<{ children: React.ReactNode; em?: string }> = ({
  children,
  em,
}) => (
  <Typography
    component="h2"
    sx={{
      fontFamily: SERIF,
      fontWeight: 500,
      fontSize: "17px",
      color: "#2a1a14",
      marginBottom: "8px",
      letterSpacing: "-0.01em",
      "& em": { fontStyle: "italic", color: "#FE0944", fontWeight: 500 },
    }}
  >
    {children}
    {em && (
      <>
        {" "}
        <em>{em}</em>
      </>
    )}
  </Typography>
);

const dSection = { padding: "0 20px 20px" } as const;

// ─── About ───
export const About: React.FC<{ name: string; body: string }> = ({ name, body }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <DSectionH2 em={name}>{t("detail.about.title", "About")}</DSectionH2>
      <Box
        component="p"
        sx={{
          fontFamily: SANS,
          fontSize: "13px",
          color: "rgba(60, 30, 20, 0.72)",
          lineHeight: 1.55,
        }}
      >
        {body}
      </Box>
    </Box>
  );
};

// ─── Credentials ───
type Cred = { icon: string; label: string; meta: string };
export const Credentials: React.FC<{ creds: Cred[] }> = ({ creds }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.creds.title", "Credentials")}</DSectionH2>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {creds.map((c, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(15px)",
              WebkitBackdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              borderRadius: "12px",
            }}
          >
            <Box
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(22, 163, 74, 0.12)",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {c.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#2a1a14",
                  marginBottom: "1px",
                }}
              >
                {c.label}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  color: "rgba(60, 30, 20, 0.72)",
                }}
              >
                {c.meta}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Specialties ───
type Spec = { icon: string; name: string; yrs: string };
export const Specialties: React.FC<{ specs: Spec[] }> = ({ specs }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.specs.title", "Specialties")}</DSectionH2>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {specs.map((s, i) => (
          <Box
            key={i}
            sx={{
              padding: "12px",
              background: "rgba(255, 255, 255, 0.5)",
              backdropFilter: "blur(15px)",
              WebkitBackdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Box sx={{ fontSize: "20px" }}>{s.icon}</Box>
            <Box>
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#2a1a14",
                }}
              >
                {s.name}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "9.5px",
                  color: "rgba(60, 30, 20, 0.72)",
                  fontWeight: 600,
                  marginTop: "1px",
                }}
              >
                {s.yrs}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Languages ───
type Lang = { flag: string; name: string; level: string };
export const Languages: React.FC<{ langs: Lang[] }> = ({ langs }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.langs.title", "Languages")}</DSectionH2>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {langs.map((l, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              background: "rgba(255, 255, 255, 0.5)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.6)",
            }}
          >
            <Box sx={{ fontSize: "16px" }}>{l.flag}</Box>
            <Box
              sx={{
                flex: 1,
                fontFamily: SANS,
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#2a1a14",
              }}
            >
              {l.name}
            </Box>
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "10px",
                color: "#b85c3c",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {l.level}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Pricing ───
type Price = { name: string; duration: string; price: string };
export const Pricing: React.FC<{ items: Price[] }> = ({ items }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.pricing.title", "Pricing")}</DSectionH2>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((p, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "rgba(255, 255, 255, 0.5)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.6)",
            }}
          >
            <Box>
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#2a1a14",
                }}
              >
                {p.name}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "rgba(60, 30, 20, 0.72)",
                  marginTop: "1px",
                }}
              >
                {p.duration}
              </Box>
            </Box>
            <Box
              sx={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "14px",
                color: "#FE0944",
                letterSpacing: "-0.02em",
              }}
            >
              {p.price}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Calendar (day pills + slot grid) ───
type Day = { dow: string; num: string; unavailable?: boolean };
type Slot = { time: string; taken?: boolean };

interface CalendarProps {
  days: Day[];
  slots: Slot[];
}
export const Calendar: React.FC<CalendarProps> = ({ days, slots }) => {
  const { t } = useTranslation();
  const [activeDay, setActiveDay] = useState(0);
  const [activeSlot, setActiveSlot] = useState<number | null>(3);

  return (
    <Box sx={dSection}>
      <DSectionH2 em={t("detail.calendar.subtitle", "today & tomorrow")}>
        {t("detail.calendar.title", "Available")}
      </DSectionH2>

      {/* .calendar-row */}
      <Box
        sx={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          marginBottom: "12px",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {days.map((d, i) => {
          const active = activeDay === i;
          return (
            <Box
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => !d.unavailable && setActiveDay(i)}
              sx={{
                flexShrink: 0,
                padding: "8px 10px",
                borderRadius: "12px",
                background: active
                  ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                  : "rgba(255, 255, 255, 0.5)",
                border: active
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.7)",
                textAlign: "center",
                minWidth: "50px",
                cursor: d.unavailable ? "not-allowed" : "pointer",
                opacity: d.unavailable ? 0.45 : 1,
                ...(active && {
                  boxShadow: "0 4px 12px rgba(254, 9, 68, 0.35)",
                }),
              }}
            >
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "9.5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: active ? "rgba(255, 255, 255, 0.85)" : "rgba(60, 30, 20, 0.72)",
                }}
              >
                {d.dow}
              </Box>
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: "16px",
                  color: active ? "#fff" : "#2a1a14",
                  marginTop: "1px",
                }}
              >
                {d.num}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* .slot-grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "6px",
        }}
      >
        {slots.map((s, i) => {
          const active = activeSlot === i;
          return (
            <Box
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => !s.taken && setActiveSlot(i)}
              sx={{
                padding: "8px 4px",
                borderRadius: "10px",
                background: active
                  ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                  : "rgba(255, 255, 255, 0.5)",
                border: active
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.7)",
                textAlign: "center",
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 700,
                color: active ? "#fff" : "#2a1a14",
                cursor: s.taken ? "not-allowed" : "pointer",
                ...(s.taken && { opacity: 0.4, textDecoration: "line-through" }),
                ...(active && {
                  boxShadow: "0 4px 12px rgba(254, 9, 68, 0.3)",
                }),
              }}
            >
              {s.time}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Reviews ───
type Bucket = { num: number; count: number; pct: number };
type Review = {
  initial: string;
  name: string;
  flag: string;
  meta: string;
  quote: string;
};
interface ReviewsProps {
  rating: string;
  total: number;
  buckets: Bucket[];
  reviews: Review[];
}
export const Reviews: React.FC<ReviewsProps> = ({ rating, total, buckets, reviews }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <Typography
        component="h2"
        sx={{
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: "17px",
          color: "#2a1a14",
          marginBottom: "8px",
          letterSpacing: "-0.01em",
        }}
      >
        {t("detail.reviews.title", "Reviews")}{" "}
        <Box
          component="span"
          sx={{
            color: "rgba(60, 30, 20, 0.72)",
            fontWeight: 400,
            fontSize: "13px",
            fontFamily: SANS,
          }}
        >
          · {total}
        </Box>
      </Typography>

      {/* .review-summary */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px",
          background: "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          borderRadius: "14px",
          marginBottom: "12px",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "32px",
              color: "#FE0944",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {rating}
          </Box>
          <Box sx={{ color: "#FBBF24", fontSize: "11px", marginTop: "2px", letterSpacing: "1px" }}>
            ★★★★★
          </Box>
          <Box
            sx={{
              fontFamily: SANS,
              fontSize: "9.5px",
              color: "rgba(60, 30, 20, 0.72)",
              marginTop: "2px",
              fontWeight: 600,
            }}
          >
            {t("detail.reviews.total", "{{count}} reviews", { count: total })}
          </Box>
        </Box>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          {buckets.map((b) => (
            <Box
              key={b.num}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: SANS,
                fontSize: "9.5px",
                color: "rgba(60, 30, 20, 0.72)",
              }}
            >
              <Box sx={{ width: "8px", fontWeight: 700 }}>{b.num}</Box>
              <Box
                sx={{
                  flex: 1,
                  height: "4px",
                  background: "rgba(184, 92, 60, 0.15)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${b.pct}%`,
                    background: "linear-gradient(90deg, #FE0944, #FE7A52)",
                    borderRadius: "2px",
                  }}
                />
              </Box>
              <Box>{b.count}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* review cards */}
      {reviews.map((r, i) => (
        <Box
          key={i}
          sx={{
            padding: "14px",
            background: "rgba(255, 255, 255, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            borderRadius: "14px",
            marginBottom: "8px",
          }}
        >
          {/* .head */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <Box
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FE7A52, #FFB088)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
                fontFamily: SANS,
              }}
            >
              {r.initial}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#2a1a14",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {r.name} {r.flag}{" "}
                <Box
                  component="span"
                  sx={{
                    color: "rgba(60, 30, 20, 0.72)",
                    fontWeight: 400,
                    fontSize: "10px",
                  }}
                >
                  · {t("detail.reviews.verified", "Verified booking")}
                </Box>
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "rgba(60, 30, 20, 0.72)",
                  marginTop: "1px",
                }}
              >
                {r.meta}
              </Box>
            </Box>
            <Box sx={{ color: "#FBBF24", fontSize: "11px", letterSpacing: "1px" }}>
              ★★★★★
            </Box>
          </Box>
          <Box
            sx={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "13px",
              lineHeight: 1.45,
              color: "#2a1a14",
            }}
          >
            &ldquo;{r.quote}&rdquo;
          </Box>
        </Box>
      ))}

      <Box
        sx={{
          textAlign: "center",
          padding: "8px",
          color: "#b85c3c",
          fontSize: "12px",
          fontWeight: 700,
          fontFamily: SANS,
          cursor: "pointer",
        }}
      >
        {t("detail.reviews.seeAll", "See all {{count}} reviews", { count: total })} →
      </Box>
    </Box>
  );
};
