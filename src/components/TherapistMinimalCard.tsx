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
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";

import { fonts, accents } from "@/theme";

// 🆕 Round 28s238 (founder: "Ocean Study" trial on the customer-facing
//   browse card — scoped to THIS file only, not the global `brand` theme).
//   accent = primary CTA (Book Now button + focus ring) ·
//   highlight = prominent number emphasis (the price).
//   Scoped rather than touching theme.ts brand.red globally so the
//   booking/checkout flow and every other page keep the existing brand
//   red untouched while this one card style is trialed.
// 🕯️ 28t dark-luxury — focus ring is dusty rose; highlight ink is ivory.
const oceanAccent = "#C56A6D";
const oceanHighlight = "#F3E6DB";
import { enhanceImage } from "@/utils/cloudinary";
import type { Therapist, Avail } from "@/types/therapist";
// 🆕 Round 28s132 — Surface the therapist's lowest service price so
//   guests see "ราคาเริ่มต้น ฿X" without opening the detail page.
import staticServices from "@/data/services";

interface Props {
  therapist: Therapist;
  computedStatus?: Avail;
  /** 🆕 28s392 — live guest↔practitioner distance in km (from the grid's GPS
   *  watcher). Shown as "📍 2.4km" on the meta line; undefined until the guest
   *  grants location. Distance-only by design — the standby area is never
   *  shown (privacy). */
  distanceKm?: number;
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
  available: { color: "#D7B56D", i18nKey: "available", fallback: "Available" },
  bookable:  { color: "#C56A6D", i18nKey: "bookable",  fallback: "Bookable"  },
  resting:   { color: "#B0A090", i18nKey: "offline",   fallback: "Offline"   },
  holiday:   { color: "#B0A090", i18nKey: "offline",   fallback: "Offline"   },
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
  distanceKm,
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
    // 🆕 28s343 — Book Now lands on the detail page's Services tab (founder
    //   "กด book now ต้องไปที่แท็บ Services") so the guest sees the picker.
    else navigate(`/therapists/${therapist.id}#services`);
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
    // 🕯️ 28t dark-luxury — Soft-Gold "TOP STAR", rose HOT, gold NEW.
    TOP_RATED: { label: "TOP STAR", bg: "linear-gradient(135deg,#E4C888 0%,#C99A4E 100%)", color: "#2A1B10" },
    VIP:       { label: "VIP",        bg: "#2A1D16",     color: "#D7B56D" },
    HOT:       { label: "HOT",        bg: "#A16256",     color: "#F3E6DB" },
    NEW:       { label: "NEW",        bg: "linear-gradient(135deg,#E4C888 0%,#C99A4E 100%)", color: "#2A1B10" },
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

  // 🆕 28s386 — tag pills (Thai/Verified/English) removed (founder: "เอาออก").
  //   Nationality/language still live on the detail page; the card is cleaner.

  // 🆕 28s387 — anonymous profile-view count (real, grows from 0). Shown only
  //   once a practitioner has genuine views; never fabricated.
  const viewCount =
    typeof therapist.viewCount === "number" ? therapist.viewCount : 0;

  // 🆕 28s389 — real completed-session count (founder wants a Moko-style
  //   engagement number NOW; no historical browse data exists, so the honest
  //   substantial number is real bookings). Endorsed by CLAUDE.md §🔐 #4/#6
  //   ("N sessions completed" trust chip). 0 => hidden (Milo/Pare stay clean).
  const sessionCount =
    typeof therapist.totalSessions === "number" ? therapist.totalSessions : 0;

  // 🆕 28s392 — live guest↔practitioner distance (founder "ใส่เลขระยะทาง
  //   ...แทน · 📍2.4km"). Distance-only by design — the standby area is never
  //   shown (privacy). undefined until the guest grants location.
  const hasDistance = typeof distanceKm === "number" && isFinite(distanceKm);
  const distanceLabel = !hasDistance
    ? null
    : distanceKm >= 0.1
      ? `${distanceKm.toFixed(1)}km`
      : "<0.1km";

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
        // 🕯️ 28t — panel + gold "embroidery" hairline (flips day/night).
        background: "var(--sr-panel)",
        border: "1px solid var(--sr-hairline)",
        borderRadius: "18px",
        overflow: "hidden",
        boxShadow: "var(--sr-card-shadow)",
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
            "0 18px 40px rgba(0, 0, 0, 0.52), 0 2px 4px rgba(0, 0, 0, 0.34)",
        },
        "&:focus-visible": {
          outline: `2px solid ${oceanAccent}`,
          outlineOffset: 2,
        },
        // Height drives itself now — photo aspect 3/4 + info block.
        // No fixed row height (was 190). Uniform across cards because
        // the info block is stable content (name + rating row + CTA).
        // 🆕 Round 28r83 — trimmed from 4 meta rows to 1 (rating only).
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
      {/* Round 28r84 — Status pill relocated to bottom-center of the
          photo (founder direction 2026-07-08 reference screenshots).
          Was top-right of the card (r81 light-green tint). Now the
          dominant status indicator at the bottom edge of the photo:
          solid teal mint (#2EC4B0) fill + white text + larger padding
          when `available`, so it reads as the primary "greenlight,
          book now" signal. Bookable / offline states keep the same
          bottom-center location but with warm neutral fills.
          Holiday cards still suppress the pill (the Holiday badge on
          the blurred portrait carries the meaning — 28s146). */}
      {/* ── Portrait on TOP (Round 28r53 vertical portrait card) ──── */}
      <Box
        sx={{
          width: "100%",
          // 🆕 Round 28r53 — Photo container is aspect-ratio 3/4
          //   (portrait). Height scales with width so the card
          //   remains proportionate across every column width.
          aspectRatio: "3 / 4",
          position: "relative",
          background: "var(--sr-panel-deep)",
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
            /* 🆕 28s375 — lowercase `fetchpriority` (valid HTML attr) so React
               18 doesn't warn about an unknown `fetchPriority` DOM prop on
               every card render. Matches TherapistProfileCard. */
            {...(eager ? { fetchpriority: "high" as const } : {})}
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

        {/* Round 28r84 — Status pill at bottom-center of the photo.
            🆕 Round 28r86 (founder 2026-07-08 · live screenshot) —
            three tweaks on the pill:
              • Uniform SMALL size across every state (was: Available
                bigger than Bookable/Offline). Matches the Offline chip
                size from the reference — compact, doesn't overwhelm
                the photo.
              • Nudged up so it sits fully INSIDE the photo instead of
                straddling the bottom edge (was bottom:-14 → now 10).
              • Bookable fill switched from GRAY_800 #4B4B48 to amber
                #F5A623 — matches the amber "next slot open" register
                that the star rating uses. */}
        {!isOnHoliday && (
          <Box
            sx={{
              position: "absolute",
              // 🆕 28s393 — status pill moved from centered to LEFT
              //   (founder "ขยับสถานะมาไว้ด้านซ้าย").
              left: "10px",
              bottom: "10px",
              zIndex: 2,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 14px",
              borderRadius: "999px",
              // 🕯️ 28t — unified translucent espresso pill for every state;
              //   a colour-coded dot (gold=available · rose=bookable) carries
              //   the meaning while ivory text stays legible over any photo.
              background: "rgba(33, 24, 19, 0.72)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              color: "#F3E6DB",
              border: "1px solid rgba(215,181,109,0.20)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.34)",
              whiteSpace: "nowrap",
            }}
            aria-label={statusLabel}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: statusMeta.color,
                boxShadow:
                  status === "available"
                    ? "0 0 6px rgba(215,181,109,0.9)"
                    : "none",
              }}
            />
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "10px",
                fontWeight: 700,
                color: "#F3E6DB",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {statusLabel}
            </Typography>
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
                color: "var(--sr-ink)",
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
                // Round 28r84 — Photos pill always routes to the
                //   detail page's #gallery anchor. When the
                //   practitioner has gallery photos, the section
                //   scrolls into view; when she doesn't, the section
                //   still renders an empty-state card so guests
                //   understand there just isn't more to show yet.
                navigate(`/therapists/${therapist.id}#gallery`);
              }}
              aria-label={`Photos of ${therapist.name}`}
              sx={{
                // Round 28r84 — Outline recolored from #4B4B48 to warm
                //   taupe #8F8474 per founder direction (2026-07-08 —
                //   'warm taupe on PHOTOS pill outline'). Text stays at
                //   #4B4B48 (sitewide card text color).
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: "999px",
                background: "transparent",
                border: "1.5px solid var(--sr-hairline)",
                color: "var(--sr-body)",
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
                  background: "rgba(215, 181, 109, 0.12)",
                },
                "&:focus-visible": {
                  outline: "2px solid #C56A6D",
                  outlineOffset: 2,
                },
              }}
            >
              Photos
            </Box>
          </Box>
          {/* 🆕 Round 28r83 — Founder direction (2026-07-08 live
              screenshot: "ข้อมูลมัน รกไป"). Dropped Hours row,
              AGE/VERIFIED row, and Location row. Only the rating +
              comment-count row remains between the name and the
              price/CTA — matches the r82 reference silhouette
              (name · rating · chat · price · CTA). All the trimmed
              detail is still available on the therapist detail page. */}

          {/* Rating row — amber star + "N.N | K reviews" + chat chip
              Round 28r84 — Founder direction (reference screenshots
              2026-07-08):
                • Star reverts from r82 pink #EF9AA1 back to amber
                  #F5A623 (accents.amber). Amber is the canonical
                  star tone across the site (detail page, admin).
                • Rating text reverts from "N served" (r82 wording) to
                  "N reviews" — reviews are the honest count guests
                  care about; totalSessions can hide behind detail.
                • Chat speech-bubble chip glyph reverts from r82 coral
                  #D66B70 to warm taupe #8F8474 to shed the coral
                  overspill; chip bg uses a soft warm-taupe tint. */}
          {therapist.rating && therapist.rating > 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  // 🕯️ 28t — gold star + ivory number in a soft-gold chip.
                  background: "rgba(215,181,109,0.15)",
                  borderRadius: "8px",
                  padding: "2px 8px",
                }}
              >
                <StarRoundedIcon
                  sx={{ fontSize: 15, color: "var(--sr-gold-text)" }}
                />
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--sr-ink)",
                  }}
                >
                  {therapist.rating.toFixed(1)}
                  {therapist.reviews && therapist.reviews > 0 ? (
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 500,
                        color: "var(--sr-muted)",
                        marginLeft: "6px",
                      }}
                    >
                      | {therapist.reviews}{" "}
                      {t("therapistCard.reviews", "reviews")}
                    </Box>
                  ) : null}
                </Typography>
              </Box>
              {/* 🆕 28s390 — comment chip replaced by the 👁 view count
                  (founder "เอากล่องข้อความออก เปลี่ยนเป็น view count"). */}
              {viewCount > 0 ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "rgba(215, 181, 109, 0.10)",
                  }}
                  aria-label={`${viewCount} profile views`}
                >
                  <VisibilityRoundedIcon
                    sx={{ fontSize: 13, color: "var(--sr-muted)" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "var(--sr-body)",
                      lineHeight: 1,
                    }}
                  >
                    {viewCount.toLocaleString("en-US")}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {/* 🆕 28s386 — tag pills removed (founder "เอาออก"). */}

          {/* 🆕 28s389 — real completed-session count (Moko-style engagement
              number, honest — real bookings, not fabricated views).
              🆕 28s392 — meta line now carries the live guest↔practitioner
              DISTANCE (📍 2.4km) instead of the area name (founder "ใส่เลข
              ระยะทาง...แทน"). Distance-only is also the privacy-correct choice
              — the standby district is never exposed. */}
          {(sessionCount > 0 || hasDistance) && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: therapist.rating && therapist.rating > 0 ? "7px" : "3px",
              }}
            >
              {sessionCount > 0 && (
                <Box
                  sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  aria-label={`${sessionCount} completed sessions`}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 14, color: "var(--sr-gold-text)" }} />
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "var(--sr-body)",
                      lineHeight: 1,
                    }}
                  >
                    {sessionCount.toLocaleString("en-US")}{" "}
                    <Box component="span" sx={{ fontWeight: 500, color: "var(--sr-dim)" }}>
                      {t("therapistCard.sessions", "sessions")}
                    </Box>
                  </Typography>
                </Box>
              )}
              {distanceLabel && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    minWidth: 0,
                  }}
                  aria-label={`${distanceLabel} away`}
                >
                  <LocationOnRoundedIcon sx={{ fontSize: 14, color: "var(--sr-muted)" }} />
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "var(--sr-muted)",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {distanceLabel}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

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
                color: "var(--sr-muted)",
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
                // 🕯️ 28t — Soft-Gold price (money = gold), deepens in day mode.
                color: "var(--sr-gold-text)",
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
              // 🕯️ 28t — dusty-rose gradient CTA (was Moko magenta). Flat,
              //   no glow — the gradient alone carries the primary action.
              padding: "10px 20px",
              borderRadius: "999px",
              background: isOffDuty
                ? "var(--sr-panel-2)"
                : "linear-gradient(135deg,#C56A6D 0%,#A16256 100%)",
              color: isOffDuty ? "var(--sr-dim)" : "#FFF7F0",
              border: "none",
              cursor: isOffDuty ? "not-allowed" : "pointer",
              fontFamily: fonts.body,
              fontSize: "13.5px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              boxShadow: "none",
              transition: "transform 0.15s ease, background 0.15s ease",
              "&:hover": isOffDuty
                ? {}
                : {
                    background: "linear-gradient(135deg,#A16256 0%,#8E4F49 100%)",
                    transform: "translateY(-1px)",
                  },
              "&:focus-visible": {
                outline: "2px solid #F3E6DB",
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
