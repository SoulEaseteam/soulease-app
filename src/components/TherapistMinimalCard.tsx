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

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import StarRoundedIcon from "@mui/icons-material/StarRounded";
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
const oceanAccent = "#D97C95";
const oceanHighlight = "#F3E6DB";
import { enhanceImage } from "@/utils/cloudinary";
import type { Therapist, Avail } from "@/types/therapist";
// 🆕 Round 28s132 — Surface the therapist's lowest service price so
//   guests see "ราคาเริ่มต้น ฿X" without opening the detail page.
import staticServices from "@/data/services";
// 🆕 28t.7 — bucketed session-count display (20+ · 100+ · 2.9k+).
import { formatSessionCount } from "@/utils/formatCount";

interface Props {
  therapist: Therapist;
  computedStatus?: Avail;
  /** 🆕 28x.102 (founder "เปลี่ยนสถานะไปตามการจองจนถึงกี่โมง") — the
   *  engine's nextAvailable ("HH:mm" from busyUntil) — when the
   *  practitioner is bookable-but-busy the pill reads "ว่าง 23:30"
   *  instead of a bare "จองได้". Computed in HomeTherapistGrid's
   *  enrichment pass; null when there's no known free-at time. */
  nextFreeAt?: string | null;
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
  nextFreeAt,
  distanceKm,
  onBook,
  eager = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const heroImage =
    therapist.image || therapist.gallery?.[0] || "";
  const portrait = enhanceImage(heroImage, { variant: "hero" });

  // 🆕 28x.122 (founder: "ปุ่มจอง ชื่อ AVAILABLE สีก่อนกด #ff9999 ตอนกด
  //   จะเปลี่ยนเป็นชื่อ BOOK NOW สี #13bda6") — press-state feedback on the
  //   CTA button: idle reads AVAILABLE in coral-pink, and flashes to BOOK
  //   NOW in teal while actually pressed (pointerdown -> pointerup/leave),
  //   confirming the tap before the click navigates.
  const [isPressed, setIsPressed] = useState(false);
  // 🆕 28x.125 (founder: "เอาเมาท์วาง ก็เปลี่ยน") — desktop hover now also
  // triggers the BOOK NOW/#13bda6 state, not just an actual press/tap.
  const [isHovered, setIsHovered] = useState(false);
  const isBookNowActive = isPressed || isHovered;

  // 🆕 Round 28s139 — Founder: off-duty cards stay tappable for info
  //   ("กดดูข้อมูลได้ปกติ ยกเว้นจอง"). Only the Book Now action is
  //   gated; the whole card still routes to the detail page so guests
  //   can read the practitioner's bio + gallery and request a future
  //   reservation via concierge.
  const handleCardTap = () => {
    navigate(`/therapists/${therapist.id}`);
  };

  // 🆕 28x.124 (founder repeated: "ตอนกด จะเปลี่ยนเป็นชื่อ BOOK NOW สี
  //   #13bda6") — on a real tap, pointerup fires (reverting isPressed)
  //   BEFORE the click handler navigates, so the teal "BOOK NOW" state
  //   never actually got seen — the button was back to pink the instant
  //   navigation happened. Now the click itself holds the pressed state
  //   and waits one beat so BOOK NOW/teal is genuinely the last thing on
  //   screen before the page transitions, instead of a state that only
  //   existed in code and never rendered long enough to see.
  const handleBookTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOffDuty) return; // booking blocked when resting/holiday
    setIsPressed(true);
    window.setTimeout(() => {
      if (onBook) onBook(therapist);
      // 🆕 28s343 — Book Now lands on the detail page's Services tab (founder
      //   "กด book now ต้องไปที่แท็บ Services") so the guest sees the picker.
      else navigate(`/therapists/${therapist.id}#services`);
    }, 220);
  };

  const status = computedStatus ?? "bookable";

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
    // 🕯️ 28t — founder badge spec: VIP gold+brown · NEW rose+white · HOT
    //   #F56B6B+white · TOP STAR gold+brown.
    TOP_RATED: { label: "TOP STAR", bg: "#F4C542",     color: "#232B36" },
    VIP:       { label: "VIP",        bg: "#B8567F",     color: "#FFFFFF" },
    HOT:       { label: "HOT",        bg: "#F56B6B",     color: "#FFFFFF" },
    NEW:       { label: "NEW",        bg: "#D97C95",     color: "#FFFFFF" },
  };
  const badgeKey =
    (therapist.badgeKey as keyof typeof BADGE_STYLE | null | undefined) ?? null;
  const badgeMeta =
    badgeKey && badgeKey in BADGE_STYLE ? BADGE_STYLE[badgeKey] : null;
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

  // 🆕 28t.7 — profile-view count no longer shown on the card (founder will
  //   relocate it). `therapist.viewCount` still tracked in Firestore.

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
      : "0.1km";

  return (
    <Box
      onClick={handleCardTap}
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
        // 🆕 28x.119 (founder reference screenshot: "ลองเปลี่ยนการ์ดสไตล์นี้
        //   แต่สีเดิม") — photo is now INSET (padded frame) instead of
        //   edge-to-edge, so overflow can no longer be hidden at the
        //   outer card level — the photo container below owns its own
        //   clip + radius instead.
        padding: "10px 10px 0",
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
          // 🆕 28x.119 — inset frame instead of edge-to-edge; owns its own
          //   radius + clip now that the outer card is padded instead of
          //   flush.
          // 🆕 28x.120 (founder: "ทำการ์ดให้สูงขึ้น ให้เห็นรูปพนักงาน") —
          //   the 4:3 landscape crop cut off too much of the (mostly
          //   full-body, portrait-shot) practitioner photos. Back to a
          //   taller 3:4 portrait frame, same ratio the card used before
          //   28x.119, now inset instead of edge-to-edge.
          aspectRatio: "3 / 4",
          borderRadius: "14px",
          overflow: "hidden",
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

        {/* 🆕 28x.123 (founder: selected the status pill, "เอาออก") — the
            on-photo status pill (and its STATUS_DOT/statusMeta/statusLabel
            plumbing, 28s138) is removed entirely. Status/availability
            communication now lives on the CTA button below (28x.122's
            AVAILABLE/#FF9999 idle -> BOOK NOW/#13bda6 press state) instead
            of a separate badge here. `status` itself is still very much
            in use — isOffDuty gating, opacity/filter dimming, the price
            badge's `!isOnHoliday` guard, and the CTA button. */}

        {/* 🆕 28x.119 (founder reference screenshot) — floating price
            badge, bottom-right of the photo. Frosted-glass white chip
            (not the reference's dark chip) so it stays in SunRed's own
            palette per "แต่สีเดิม" — same dusty-rose the price already
            used in the info column below. */}
        {!isOnHoliday && (
          <Box
            sx={{
              position: "absolute",
              right: "10px",
              bottom: "10px",
              zIndex: 2,
              padding: "5px 12px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.heading,
                fontSize: "13.5px",
                fontWeight: 800,
                color: "#D97C95",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              ฿{startingPrice.toLocaleString("en-US")}+
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
          {/* 🆕 28x.119 (founder reference screenshot: "ลองเปลี่ยนการ์ด
              สไตล์นี้ แต่สีเดิม") — name + star rating on ONE line, tighter
              and closer to the reference's compact header. The PHOTOS pill
              is dropped (tapping the card already opens the detail page,
              gallery included) — pure simplification, no functional loss. */}
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              marginBottom: "4px",
              minWidth: 0,
            }}
          >
            <Typography
              component="h3"
              noWrap
              sx={{
                fontFamily:
                  '"Inter", "Sarabun", system-ui, sans-serif',
                fontSize: { xs: "18px", sm: "20px", md: "21px" },
                fontWeight: 800,
                color: "var(--sr-ink)",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {therapist.name}
            </Typography>
            {therapist.rating && therapist.rating > 0 ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  flexShrink: 0,
                }}
              >
                <StarRoundedIcon sx={{ fontSize: 16, color: "#ffc31e" }} />
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--sr-ink)",
                    lineHeight: 1,
                  }}
                >
                  {therapist.rating.toFixed(1)}
                </Typography>
              </Box>
            ) : null}
          </Box>

          {/* 🆕 28x.119 — compact meta line under the name, mirroring the
              reference's specialty-tag row. SunRed doesn't have per-
              therapist specialty tags (the reference's "นวดเท้า ·
              ประคบสมุนไพร · แผนไทย" is from a different app's menu, not
              ours) — kept honest with the real trust numbers this card
              already tracked (reviews + sessions), just restyled to read
              as one quiet dot-separated line instead of two chip rows. */}
          {(therapist.reviews && therapist.reviews > 0) || sessionCount > 0 ? (
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "11.5px",
                fontWeight: 500,
                color: "var(--sr-muted)",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {[
                therapist.reviews && therapist.reviews > 0
                  ? `${therapist.reviews} ${t("therapistCard.reviews", "reviews")}`
                  : null,
                sessionCount > 0
                  ? `${formatSessionCount(sessionCount)} ${t("therapistCard.sessions", "sessions")}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          ) : null}
        </Box>

        {/* 🆕 28x.119 — hairline divider before the footer row, matching
            the reference's rule between the tag line and the CTA row. */}
        <Box sx={{ borderTop: "1px solid var(--sr-hairline)" }} />

        {/* 🆕 28x.119 — footer row: distance LEFT (real GPS data, standing
            in for the reference's ETA — SunRed doesn't compute a live
            driving ETA on this grid, so distance is the honest
            equivalent) + Book button RIGHT. Price moved to the floating
            badge on the photo above, so this row is lighter than before. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: distanceLabel ? "space-between" : "flex-end",
            gap: "10px",
            // 🆕 28x.99z (founder "ปุ่มล้น ช่วยปรับด้วย จอมือถือ") — on the
            //   2-col mobile grid the row is ~190px wide and the uppercase
            //   "BOOK RIGHT NOW" clipped mid-word. Let the row wrap: on
            //   narrow cards the button drops to its own full-width line,
            //   on wide cards nothing changes.
            flexWrap: "wrap",
          }}
        >
          {distanceLabel && (
            <Box
              sx={{ display: "inline-flex", alignItems: "center", gap: "3px", minWidth: 0 }}
              aria-label={`${distanceLabel} away`}
            >
              <LocationOnRoundedIcon sx={{ fontSize: 14, color: "var(--sr-muted)" }} />
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "12px",
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
          <Box
            component="button"
            type="button"
            onClick={handleBookTap}
            disabled={isOffDuty}
            onPointerDown={() => !isOffDuty && setIsPressed(true)}
            onPointerUp={() => setIsPressed(false)}
            onPointerLeave={() => {
              setIsPressed(false);
              setIsHovered(false);
            }}
            onPointerCancel={() => setIsPressed(false)}
            onMouseEnter={() => !isOffDuty && setIsHovered(true)}
            sx={{
              // 🆕 28x.99z — grow to fill the wrapped line on narrow cards;
              //   tighter type so the label fits without clipping.
              flex: "1 1 auto",
              minWidth: 0,
              textAlign: "center",
              padding: { xs: "9px 12px", sm: "10px 20px" },
              fontSize: { xs: "12px", sm: "13.5px" },
              borderRadius: "999px",
              // 🆕 28x.122 (founder: "ปุ่มจอง ชื่อ AVAILABLE สีก่อนกด #ff9999
              //   ตอนกด จะเปลี่ยนเป็นชื่อ BOOK NOW สี #13bda6") — idle state
              //   is the 28x.118b coral-pink; pressed state flashes teal.
              //   🆕 28x.125 (founder: "เอาเมาท์วาง ก็เปลี่ยน") — desktop
              //   hover (isHovered) now triggers the same teal/BOOK NOW
              //   state as an actual press, via isBookNowActive.
              //   Superseded the dusty-rose family (#E38EA5→#D97C95→
              //   #C96F89, 28x.103) and the plain flat swap (28x.118/118b)
              //   — see those rounds' history if this trial gets reverted.
              background: isOffDuty
                ? "var(--sr-panel-2)"
                : isBookNowActive
                  ? "#13bda6"
                  : "#FF9999",
              color: isOffDuty ? "var(--sr-dim)" : "#ffffff",
              border: "none",
              cursor: isOffDuty ? "not-allowed" : "pointer",
              fontFamily: fonts.body,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              boxShadow: isOffDuty
                ? "none"
                : isBookNowActive
                  ? "0 6px 16px rgba(19, 189, 166, 0.45)"
                  : "0 6px 16px rgba(255, 99, 99, 0.40)",
              transition: "transform 0.15s ease, background 0.15s ease",
              "&:hover": isOffDuty
                ? {}
                : {
                    transform: "translateY(-1px)",
                  },
              "&:focus-visible": {
                outline: "2px solid #F3E6DB",
                outlineOffset: 2,
              },
            }}
          >
            {isOffDuty
              ? t("therapistCard.bookNow", "Book Now")
              : isBookNowActive
                ? t("therapistCard.bookNow", "Book Now")
                : t("available", "Available")}
          </Box>
        </Box>
      </Box>


    </Box>
  );
};

export default TherapistMinimalCard;
