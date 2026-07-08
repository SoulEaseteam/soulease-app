// src/components/TherapistMinimalCard.tsx
//
// 🆕 Round 28s128 — Clean minimal card for the home therapist list.
//   Inspired by the founder's reference (medical/cardiologist app style):
//   white card · left-aligned info column · large portrait on the right ·
//   single "Book" pill CTA. Cuts visual noise vs. the full
//   TherapistProfileCard so the home page feels less crowded.
//
// TherapistProfileCard.tsx (1300+ lines) stays for ServiceDetail and
// admin contexts where richer chips/specs/states are still needed.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";

import { brand, fonts, accents } from "@/theme";

// 🆕 Round 28s238 (founder: "Ocean Study" trial on the customer-facing
//   browse card — scoped to THIS file only, not the global `brand` theme).
//   accent = primary CTA (Book Now button + focus ring) ·
//   highlight = prominent number emphasis (the price).
//   Scoped rather than touching theme.ts brand.red globally so the
//   booking/checkout flow and every other page keep the existing brand
//   red untouched while this one card style is trialed.
const oceanAccent = "#4E7E8C";
const oceanHighlight = "#1F2933";
import { enhanceImage } from "@/utils/cloudinary";
import type { Therapist, Avail } from "@/types/therapist";
// 🆕 Round 28s132 — Surface the therapist's lowest service price so
//   guests see "ราคาเริ่มต้น ฿X" without opening the detail page.
import staticServices from "@/data/services";

interface Props {
  therapist: Therapist;
  computedStatus?: Avail;
  /** Optional click → routes to booking flow with the therapist pre-picked. */
  onBook?: (therapist: Therapist) => void;
  /**
   * 🆕 Round 28s227 — Marks the first card as the LCP element.
   *   • loading="eager" + fetchPriority="high" on the portrait
   *   • Tells the browser to skip lazy-load + bump network priority
   *   First card is what Search Console scores for Core Web Vitals.
   */
  eager?: boolean;
}

// 🆕 Round 28s138 — Founder: split "Bookable" back out as its own
//   visible state (orange dot · "Bookable" label). Three states now:
//   • Available (green) — free right now, dispatch immediately
//   • Bookable  (orange) — busy now / has appt, but next slot reservable
//   • Offline   (grey)   — resting / holiday, can't book
//   `i18nKey` resolves via existing translation keys (available /
//   bookable / resting / holiday). Resting + holiday share the same
//   visual treatment but keep their own translation so e.g. TH reads
//   "วันหยุด" vs "พักวันนี้" if View ever wants to split them later.
const STATUS_DOT: Record<
  Avail,
  { color: string; i18nKey: string; fallback: string }
> = {
  available: { color: "#16a34a", i18nKey: "available", fallback: "Available" },
  bookable:  { color: "#f59e0b", i18nKey: "bookable",  fallback: "Bookable"  },
  resting:   { color: "#9ca3af", i18nKey: "offline",   fallback: "Offline"   },
  holiday:   { color: "#9ca3af", i18nKey: "offline",   fallback: "Offline"   },
};

// 🆕 Round 28r81 — When the therapist is `available` (free right now),
//   the pill switches from the default translucent-white background to
//   a soft mint-green tint (accents.availableBg) with darker green text
//   (accents.availableText) and a hairline teal border. Signals
//   "greenlight, book now" more strongly than a lonely status dot.
//   Other statuses keep the neutral pill treatment (their coloured dot
//   already carries the meaning).

const TherapistMinimalCard: React.FC<Props> = ({
  therapist,
  computedStatus,
  onBook,
  eager = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const heroImage =
    therapist.image || therapist.gallery?.[0] || "";
  const portrait = enhanceImage(heroImage, { variant: "hero" });

  // 🆕 Round 28s139 — Founder: off-duty cards stay tappable for info
  //   ("กดดูข้อมูลได้ปกติ ยกเว้นจอง"). Only the Book Now action is
  //   gated; the whole card still routes to the detail page so guests
  //   can read the practitioner's bio + gallery and request a future
  //   reservation via concierge.
  const handleCardTap = () => {
    navigate(`/therapists/${therapist.id}`);
  };

  const handleBookTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOffDuty) return; // booking blocked when resting/holiday
    if (onBook) onBook(therapist);
    else navigate(`/therapists/${therapist.id}`);
  };

  const status = computedStatus ?? "bookable";
  const statusMeta = STATUS_DOT[status];

  // 🚨 Round 28r66 HOTFIX — Bug 2b. Founder set `badgeKey: "NEW"` on a
  //   Firestore therapist doc via /admin/* but the card never rendered
  //   it. `badgeKey` is computed on the therapist object in
  //   HomeTherapistGrid (getBadgeForTherapist + TOP_RATED override) and
  //   set on the Firestore doc from admin; this card just wasn't wired
  //   to display it. Simple corner chip so NEW / HOT / VIP / TOP_RATED
  //   all surface without redesigning the composition. Suppressed on
  //   holiday cards so the blurred "Holiday" pill stays the singular
  //   attention grabber (mirrors the status-pill suppression above).
  // 🆕 Round 28r81 — NEW badge switched from green (#16a34a) to teal
  //   mint (accents.teal = #2EC4B0). Founder direction: teal is the
  //   Nordic-accent tone for signal-highlight moments — NEW is the
  //   canonical "look at me" chip on a therapist card.
  const BADGE_STYLE: Record<
    "TOP_RATED" | "VIP" | "HOT" | "NEW",
    { label: string; bg: string; color: string }
  > = {
    TOP_RATED: { label: "TOP RATED", bg: accents.amber, color: "#1A1200" },
    VIP:       { label: "VIP",        bg: "#1A2B2E",     color: "#FFE5EC" },
    HOT:       { label: "HOT",        bg: "#2D2D2B",     color: "#fff"    },
    NEW:       { label: "NEW",        bg: accents.teal,  color: "#fff"    },
  };
  const badgeKey =
    (therapist.badgeKey as keyof typeof BADGE_STYLE | null | undefined) ?? null;
  const badgeMeta =
    badgeKey && badgeKey in BADGE_STYLE ? BADGE_STYLE[badgeKey] : null;
  // 🆕 Round 28s138 — Label flows through i18n so the pill speaks
  //   the visitor's language (EN/TH/ZH/JA/KO). Falls back to English
  //   if the bundle hasn't loaded yet.
  const statusLabel = t(statusMeta.i18nKey, statusMeta.fallback);
  // 🆕 Round 28s136 — Founder: "ใครหยุดก็เบลอการ์ดไป จองไม่ได้".
  //   Resting / holiday therapists render desaturated + dimmed, the
  //   Book Now button becomes inert, and tapping the card no longer
  //   routes to detail.
  // 🆕 Round 28s141 — Founder: "Holiday ก็เบลอรูปไปเลย". Split out
  //   holiday from the generic "off-duty" treatment: holiday now
  //   carries a HARD blur on the portrait so the unavailability
  //   reads at a glance. Resting keeps the soft dim from 28s139.
  const isOffDuty = status === "resting" || status === "holiday";
  const isOnHoliday = status === "holiday";

  // Languages from languageSkills (preferred) or features.language fallback.
  const langTag =
    therapist.languageSkills && therapist.languageSkills.length > 0
      ? therapist.languageSkills
          .map((l) => l.code.toUpperCase())
          .slice(0, 3)
          .join(" · ")
      : therapist.features?.language?.split(/[,/]/)[0]?.trim();

  const formatTime = (hhmm: string): string => {
    if (!hhmm) return "";
    const [hStr, mStr] = hhmm.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0
      ? `${hour12} ${period}`
      : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  // 🆕 Round 28s132 — Lowest 60-min base price across servicesAvailable.
  //   Falls back to ฿1,200 (Thai base) when the therapist has no
  //   services attached.
  const startingPrice = (() => {
    const sids =
      therapist.servicesAvailable ?? therapist.services ?? [];
    const prices = sids
      .map((id) => staticServices.find((s) => s.id === id)?.price)
      .filter((p): p is number => typeof p === "number");
    if (prices.length === 0) return 1200;
    return Math.min(...prices);
  })();

  return (
    <Box
      onClick={handleCardTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardTap();
        }
      }}
      aria-label={`View ${therapist.name}`}
      sx={{
        // 🆕 Round 28r53 — Phase 3.2 responsive grid. Card restacked
        //   from horizontal (row-reverse, fixed 150×190) to vertical
        //   portrait so it scales cleanly from a 2-col 375px mobile
        //   grid (~180px wide) all the way up to a 5-col 1200px
        //   desktop grid (~220px wide). Photo on TOP with
        //   aspect-ratio 3/4, info stacked BELOW. Every info element
        //   from the horizontal design is preserved.
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: "18px",
        overflow: "hidden",
        boxShadow:
          "0 6px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
        // 🆕 Round 28r53 — margin dropped: parent grid supplies gap.
        // marginBottom left at 0 (was 14px for the flex-column list).
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, filter 0.18s ease",
        opacity: isOffDuty ? 0.82 : 1,
        filter: isOffDuty ? "grayscale(0.25)" : "none",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 12px 28px rgba(15, 23, 42, 0.10), 0 2px 4px rgba(15, 23, 42, 0.05)",
        },
        "&:focus-visible": {
          outline: `2px solid ${oceanAccent}`,
          outlineOffset: 2,
        },
        // Height drives itself now — photo aspect 3/4 + info block.
        // No fixed row height (was 190). Uniform across cards because
        // the info block is stable content (name + 4 meta rows + CTA).
      }}
    >
      {/* 🚨 Round 28r66 HOTFIX — NEW/HOT/VIP/TOP_RATED badge (see the
          BADGE_STYLE block above). Anchored to the TOP-LEFT corner so
          it never collides with the status pill at TOP-RIGHT.
          Suppressed on holiday cards for the same reason as the status
          pill — the Holiday tag on the blurred portrait is the only
          thing that should draw the eye. */}
      {badgeMeta && !isOnHoliday && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 9px",
            borderRadius: "999px",
            background: badgeMeta.bg,
            color: badgeMeta.color,
            fontFamily: fonts.body,
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            boxShadow: "0 2px 6px rgba(0,0,0,0.14)",
          }}
          aria-label={badgeMeta.label}
        >
          {badgeMeta.label}
        </Box>
      )}
      {/* 🆕 Round 28s135 — Status pill moved OUT of the portrait box
          (founder feedback "บังรูป") and pinned to the top-right
          corner of the WHOLE card so it sits on the info side, not
          over the face.
          🆕 Round 28s146 (audit #5) — Suppress the pill on holiday
          cards. The "Holiday" badge that floats on the blurred
          portrait already says it; rendering both was redundant. */}
      {!isOnHoliday && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            // 🆕 Round 28r81 — mint-green tint + hairline teal border
            //   for the `available` pill; plain white for the rest.
            background:
              status === "available"
                ? accents.availableBg
                : "rgba(255,255,255,0.95)",
            border:
              status === "available"
                ? "1px solid rgba(46, 196, 176, 0.24)"
                : "1px solid transparent",
            padding: "4px 9px",
            borderRadius: "999px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
          aria-label={statusLabel}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusMeta.color,
            }}
          />
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: "10px",
              fontWeight: 700,
              // 🆕 Round 28r81 — darker green text on the mint bg for
              //   AA-legibility. Non-available pills keep brand.text.
              color:
                status === "available" ? accents.availableText : brand.text,
              letterSpacing: "0.02em",
            }}
          >
            {statusLabel}
          </Typography>
        </Box>
      )}
      {/* ── Portrait on TOP (Round 28r53 vertical portrait card) ──── */}
      <Box
        sx={{
          width: "100%",
          // 🆕 Round 28r53 — Photo container is aspect-ratio 3/4
          //   (portrait). Height scales with width so the card
          //   remains proportionate across every column width.
          aspectRatio: "3 / 4",
          position: "relative",
          background: "#fafafa",
          flexShrink: 0,
        }}
      >
        {portrait && (
          <Box
            component="img"
            src={portrait}
            alt={therapist.name}
            /* 🆕 Round 28s227 — explicit intrinsic dims (3:4 portrait
               aspect ratio at 2× for retina) reserve layout space
               before the image loads → eliminates CLS on slow networks
               even without aspect-ratio CSS. The CSS below stretches
               it to 100% width/height of the parent. */
            width={300}
            height={400}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding={eager ? "sync" : "async"}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              // Holiday → soft blur (28s141 pattern preserved).
              filter: isOnHoliday ? "blur(3px) saturate(0.85)" : "none",
              transform: isOnHoliday ? "scale(1.04)" : "none",
              transition: "filter 0.25s ease, transform 0.25s ease",
            }}
          />
        )}
        {isOnHoliday && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#fff",
                background: "rgba(0,0,0,0.42)",
                padding: "4px 9px",
                borderRadius: "999px",
                backdropFilter: "blur(2px)",
              }}
            >
              {t("holiday", "Holiday")}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Info column (rendered BELOW the portrait) ──── */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          padding: "12px 14px 12px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "8px",
          overflow: "hidden",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {/* 🆕 Round 28r82 — Founder direction (2026-07-08 reference
              screenshot): name typography swaps from Playfair-serif ALL
              CAPS to Inter/Sarabun sans-heavy for a warmer, friendlier
              register. Deepest ink #2D2D2B for high contrast against
              the white card. Rendered on the same row as an outlined
              PHOTOS pill (right-aligned) which opens the therapist's
              photo gallery in a future dialog — for now it routes to
              the detail page since the gallery view lives there. */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "6px",
              minWidth: 0,
            }}
          >
            <Typography
              component="h3"
              noWrap
              sx={{
                fontFamily:
                  '"Inter", "Sarabun", system-ui, sans-serif',
                // Sans-heavy · sized larger than the previous
                //   serif-caps treatment for stronger visual weight
                //   as the primary card headline.
                fontSize: { xs: "20px", sm: "22px", md: "23px" },
                fontWeight: 800,
                color: "#2D2D2B",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {therapist.name}
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Founder direction: opens photo gallery when one
                //   exists. Gallery view lives on the detail page,
                //   so we route there. Analytics no-op otherwise.
                if (therapist.gallery && therapist.gallery.length > 0) {
                  navigate(`/therapists/${therapist.id}#gallery`);
                }
              }}
              aria-label={`Photos of ${therapist.name}`}
              sx={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: "999px",
                background: "transparent",
                border: "1.5px solid #4B4B48",
                color: "#4B4B48",
                fontFamily: fonts.body,
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                whiteSpace: "nowrap",
                lineHeight: 1,
                transition: "background 0.15s ease, color 0.15s ease",
                "&:hover": {
                  background: "rgba(75, 75, 72, 0.06)",
                },
                "&:focus-visible": {
                  outline: "2px solid #4B4B48",
                  outlineOffset: 2,
                },
              }}
            >
              Photos
            </Box>
          </Box>
          {/* 🆕 Round 28s174 — Restored to founder's prescribed 4-row
              layout (28s158): Hours · AGE/VERIFIED · ★ rating ·
              📍 location. 28s173 trim was wrong — View wanted to
              ADD the rating, not drop the other rows. */}

          {/* Row 1 — Hours */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "5px",
            }}
          >
            <AccessTimeRoundedIcon
              sx={{ fontSize: 15, color: brand.textMuted }}
            />
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "12.5px",
                fontWeight: 500,
                color: brand.textMuted,
              }}
            >
              {formatTime(therapist.startTime)} – {formatTime(therapist.endTime)}
            </Typography>
          </Box>

          {/* Row 2 — AGE · VERIFIED */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "5px",
            }}
          >
            {therapist.features?.age && (
              <>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: brand.textMuted,
                  }}
                >
                  Age:
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: brand.text,
                  }}
                >
                  {therapist.features.age}
                </Typography>
                <Typography
                  component="span"
                  sx={{ color: brand.textMuted, fontSize: "10px" }}
                >
                  ·
                </Typography>
              </>
            )}
            <VerifiedRoundedIcon
              sx={{ fontSize: 14, color: "#1D9BF0" }}
              aria-label="Verified practitioner"
            />
            <Typography
              component="span"
              sx={{
                fontFamily: fonts.body,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: brand.textMuted,
              }}
            >
              Verified
            </Typography>
          </Box>

          {/* Row 3 — Rating + comment count chip
              🆕 Round 28r82 — Founder direction (reference screenshot):
                • Star swaps from amber → soft pink #EF9AA1 for the
                  warmer/friendlier register on the browse card. Amber
                  stays elsewhere on the site (detail page, admin).
                • Rating text format changes from "4.5 (N reviews)" →
                  "4.5 | N served" (served = totalSessions ?? reviews).
                • A pink speech-bubble chip is appended on the same
                  row with the comment count = review count. */}
          {therapist.rating && therapist.rating > 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "5px",
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <StarRoundedIcon sx={{ fontSize: 16, color: "#EF9AA1" }} />
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#4B4B48",
                  }}
                >
                  {therapist.rating.toFixed(1)}
                  {(() => {
                    const served =
                      (typeof therapist.totalSessions === "number"
                        ? therapist.totalSessions
                        : undefined) ??
                      (typeof therapist.reviews === "number"
                        ? therapist.reviews
                        : undefined);
                    if (!served) return null;
                    return (
                      <Box
                        component="span"
                        sx={{
                          fontWeight: 500,
                          color: "#4B4B48",
                          marginLeft: "6px",
                        }}
                      >
                        | {served} {t("therapistCard.served", "served")}
                      </Box>
                    );
                  })()}
                </Typography>
              </Box>
              {therapist.reviews && therapist.reviews > 0 ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "#FFE5E7",
                  }}
                  aria-label={`${therapist.reviews} comments`}
                >
                  <ChatBubbleOutlineRoundedIcon
                    sx={{ fontSize: 13, color: "#D66B70" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "#4B4B48",
                      lineHeight: 1,
                    }}
                  >
                    {therapist.reviews}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {/* Row 4 — Location (founder format: "RATCHADA · BANGKOK") */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <PlaceRoundedIcon sx={{ fontSize: 15, color: brand.textMuted }} />
            <Typography
              noWrap
              sx={{
                fontFamily: fonts.body,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: brand.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {(() => {
                const raw = therapist.area?.trim();
                if (!raw) return "Bangkok";
                // 🆕 Round 28s164 — Founder format:
                //   "SUKHUMVIT · BANGKOK", "SILOM · BANGKOK",
                //   "ASOK · BANGKOK", "THONGLOR · BANGKOK".
                //   Always 2 parts: neighbourhood (most specific) +
                //   Bangkok. Data is "เขต · neighbourhood" so the
                //   LAST segment is the recognisable neighbourhood
                //   the guest knows.
                //   "Huai Khwang · RCA" → "RCA · BANGKOK"
                //   "Rama 4 · Silom" → "SILOM · BANGKOK"
                //   "Huai Khwang" → "HUAI KHWANG · BANGKOK"
                const segments = raw
                  .split(/\s*·\s*|\s*,\s*/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const neighbourhood = segments[segments.length - 1] ?? "Bangkok";
                return `${neighbourhood} · Bangkok`;
              })()}
            </Typography>
          </Box>
        </Box>

        {/* 🆕 Round 28s132 — Bottom row: price label LEFT + Book Now
            button RIGHT. Justifies space-between so card has a clear
            "info → action" visual rhythm at the bottom edge. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "9.5px",
                fontWeight: 700,
                color: "#9b8b80",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                lineHeight: 1,
                marginBottom: "2px",
              }}
            >
              {t("therapistCard.startingFrom", "Starting from")}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.heading,
                fontSize: "16px",
                fontWeight: 700,
                color: oceanHighlight,
                lineHeight: 1,
              }}
            >
              ฿{startingPrice.toLocaleString("en-US")}
            </Typography>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleBookTap}
            disabled={isOffDuty}
            sx={{
              // 🆕 Round 28r82 — Coral CTA for the therapist browse
              //   card (founder reference screenshot 2026-07-08).
              //   Warmer/friendlier than the sitewide taupe primary,
              //   scoped to THIS card only (see r80 · sitewide primary
              //   stays warm taupe #8F8474 on hero/booking/checkout).
              padding: "10px 20px",
              borderRadius: "999px",
              background: isOffDuty
                ? "rgba(0,0,0,0.18)"
                : "#E88585",
              color: "#fff",
              border: "none",
              cursor: isOffDuty ? "not-allowed" : "pointer",
              fontFamily: fonts.body,
              fontSize: "13.5px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              boxShadow: isOffDuty
                ? "none"
                : "0 6px 14px rgba(232, 133, 133, 0.32), 0 1px 3px rgba(232, 133, 133, 0.18)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
              "&:hover": isOffDuty
                ? {}
                : {
                    background: "#D67373",
                    transform: "translateY(-1px)",
                    boxShadow:
                      "0 10px 22px rgba(214, 115, 115, 0.36), 0 2px 5px rgba(214, 115, 115, 0.20)",
                  },
              "&:focus-visible": {
                outline: "2px solid #fff",
                outlineOffset: 2,
              },
            }}
          >
            {t("therapistCard.bookNow", "Book Now")}
          </Box>
        </Box>
      </Box>

      {/* Portrait block moved to TOP of card (28r53 vertical portrait
          restack). Original tail portrait removed to avoid duplicate
          rendering. Status pill still sits at card root (top-right)
          — see the Box above the portrait — so it overlays the
          portrait's upper-right corner as before. */}
    </Box>
  );
};

export default TherapistMinimalCard;
