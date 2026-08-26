// src/components/therapist/detail/StatusPill.tsx
//
// 🎨 Phase 4 — Big availability pill on the detail page (above the
// Service picker). Surfaces the therapist's live status with an
// estimated arrival window so customers know whether they can book
// right now or need to wait.
//
//   Currently Available!   ←  green pill
//   Estimated arrival: 17:41–17:51. Can depart right away!
//
//   Currently Busy         ←  orange pill
//   Available from 19:00. Wait or switch?
//
//   Off duty               ←  gray pill
//   Returns Tomorrow at 14:00.
//
// Pulled from the same status taxonomy used in TherapistCard +
// DetailHero (online / busy / offline) for visual consistency.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
// 🆕 28t.21 — MUI icons replace the ⏱ / 💤 status emoji (CLAUDE.md §3
//   no-emoji production rule; the ✓ online glyph → CheckRounded too).
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BedtimeRoundedIcon from "@mui/icons-material/BedtimeRounded";
// 🆕 Round 28ap — BKK-anchored time, used to compute relative
//   "in 2 hours" hint on the next-available subtitle.
// 🆕 Round 28b15 — `prettyHHMM` adds the 12h reading "(7:30 PM)"
//   alongside 24h to remove ambiguity for tourist visitors.
import { nowBKK, parseHHMMatBKK, prettyHHMM } from "@/utils/time";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** Build a "in 2 hours" / "in 35 min" / "tomorrow" hint relative to now-BKK. */
function relativeUntilHHMM(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const target = parseHHMMatBKK(hhmm);
  if (!target) return null;
  const now = nowBKK();
  // If the target HH:mm has already passed today, assume tomorrow.
  let diffMin = target.diff(now, "minute");
  if (diffMin < 0) {
    diffMin = target.add(1, "day").diff(now, "minute");
  }
  if (diffMin < 60) return `in ${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  return "tomorrow";
}

export type AvailabilityStatus = "online" | "busy" | "offline";

interface Props {
  status: AvailabilityStatus;
  /** 🆕 28t.9 — when provided, the whole pill becomes a tappable button
   *  (founder: "กดได้ ให้เชื่อมต่อไปที่ แถบ services"). A trailing arrow +
   *  bounce animation signal the affordance. */
  onClick?: () => void;
  /** Optional therapist next-available HH:mm — used for busy/offline copy */
  nextAvailable?: string | null;
  /** 🆕 Round 28b9 — when status === "online" but the therapist has
   *  a future booking on the schedule (within today's shift), pass
   *  the next booking start time HH:mm here. The pill will append
   *  "Next booked at HH:mm" to the subtitle so customers see
   *  upcoming sessions without opening the time picker. */
  nextBookingAt?: string | null;
  /** "Apartment" / "Hotel" — used for arrival hint copy */
  arriveLowerBoundMin?: number; // default 25
  arriveUpperBoundMin?: number; // default 45
}

const VARIANTS: Record<
  AvailabilityStatus,
  {
    icon: React.ReactNode;
    title: string;
    titleKey: string;
    bg: string;
    shadow: string;
    iconBg: string;
  }
> = {
  // 🆕 Round 28x.169 (founder: "ป้ายสีเขียวนี้ ทำให้เหมือนปุ่มขึ้น") — this is
  //   tappable on every real call site (TherapistDetailPage always passes
  //   onClick, jumps to the Services tab), but read as a soft info-alert:
  //   light tint fill, thin border, a left accent stripe — the "notice
  //   banner" pattern, not the app's actual button language. Switched to
  //   the same solid-fill / full-pill / shadow language every real CTA in
  //   this app uses (ConfirmBar, TherapistMinimalCard's Book button), so
  //   text/icon flip to white-on-solid instead of tint-on-light.
  online: {
    icon: <CheckRoundedIcon sx={{ fontSize: 16 }} />,
    // Round 28s61 — `title` kept as the English fallback; the
    // rendered label now goes through t("detail.status.*") so
    // ZH/JA/KO/TH visitors see their language.
    title: "Currently Available!",
    titleKey: "detail.status.available",
    bg: "#57B88B",
    shadow: "rgba(46, 125, 87, 0.40)",
    iconBg: "#57B88B",
  },
  busy: {
    icon: <AccessTimeRoundedIcon sx={{ fontSize: 15 }} />,
    title: "Currently Busy",
    titleKey: "detail.status.busy",
    bg: "#f97316",
    shadow: "rgba(194, 65, 12, 0.40)",
    iconBg: "#f97316",
  },
  offline: {
    icon: <BedtimeRoundedIcon sx={{ fontSize: 15 }} />,
    title: "Off duty",
    titleKey: "detail.status.offline",
    bg: "var(--sr-muted)",
    shadow: "rgba(0, 0, 0, 0.24)",
    iconBg: "var(--sr-muted)",
  },
};

const StatusPill: React.FC<Props> = ({
  status,
  onClick,
  nextAvailable,
  nextBookingAt,
  arriveLowerBoundMin = 25,
  arriveUpperBoundMin = 45,
}) => {
  const { t } = useTranslation();
  const v = VARIANTS[status];
  const titleText = t(v.titleKey, v.title);

  // 🆕 Round 28ap — richer subtitle with relative time hints so the
  //   customer sees BOTH the wall-clock and "how long from now". All
  //   anchored to BKK via /utils/time.
  const now = nowBKK();
  const relHint = relativeUntilHHMM(nextAvailable ?? null);

  // 🆕 Round 28b15 — wrap every wall-clock time in `prettyHHMM()` so
  //   subtitles read e.g. "Available from 21:00 (9:00 PM)" rather than
  //   ambiguous "21:00". Tourist-friendly without losing 24h precision.
  let subtitle = "";
  if (status === "online") {
    const lo = now.add(arriveLowerBoundMin, "minute").format("HH:mm");
    const hi = now.add(arriveUpperBoundMin, "minute").format("HH:mm");
    // 🆕 Round 28b39 — wrap with prettyHHMM so "00:34–00:54" shows
    //   "00:34 AM–00:54 AM" — eliminates after-midnight confusion.
    // 🆕 (founder /doctor หน้า therapists) — the whole subtitle family was
    //   hardcoded English; every sentence now goes through t() with the time
    //   interpolated, so the pill follows the chosen language.
    subtitle = t("detail.status.arrival", "Estimated arrival: {{lo}}–{{hi}}.", {
      lo: prettyHHMM(lo),
      hi: prettyHHMM(hi),
    });
    if (nextBookingAt) {
      const bookHint = relativeUntilHHMM(nextBookingAt);
      subtitle += ` ${t("detail.status.nextBooked", "Next booked at {{time}}", {
        time: prettyHHMM(nextBookingAt),
      })}${bookHint ? ` · ${bookHint}` : ""}.`;
    } else {
      subtitle += ` ${t("detail.status.canDepart", "Can depart right away!")}`;
    }
  } else if (status === "busy") {
    subtitle = nextAvailable
      ? `${t("detail.status.availableFrom", "Available from {{time}}", {
          time: prettyHHMM(nextAvailable),
        })}${relHint ? ` · ${relHint}` : ""}. ${t("detail.status.waitOrSwitch", "Wait or switch?")}`
      : `${t("detail.status.onSession", "On a session right now.")} ${t("detail.status.waitOrSwitch", "Wait or switch?")}`;
  } else {
    subtitle = nextAvailable
      ? `${t("detail.status.returnsAt", "Returns at {{time}}", {
          time: prettyHHMM(nextAvailable),
        })}${relHint ? ` · ${relHint}` : ""}`
      : t("detail.status.returnsNext", "Returns next shift.");
  }

  // 🆕 28t.9 — compact, tappable pill with a gentle bounce affordance.
  const clickable = typeof onClick === "function";
  return (
    <Box
      component={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={onClick}
      aria-label={clickable ? `${titleText} — see services` : undefined}
      sx={{
        all: clickable ? "unset" : undefined,
        boxSizing: "border-box",
        // 🆕 28w.68 (founder "จัดกึ่งกลาง ให้บาลานซ์กับคอลัมอื่น") — `all: unset`
        //   made the <button> shrink-to-fit, so the pill hugged the left edge
        //   while the stat columns above spanned the full card. Was spanning
        //   the full card width to line up with the stat columns above it.
        // 🆕 28x.172 (founder "ลดความยาวของปุ่มลง") — full-bleed width read as
        //   a banner/bar, not a button. Capped so it's genuinely button-sized
        //   and centered instead, still clamped to the card width on narrow
        //   screens so it can't overflow.
        width: "min(300px, calc(100% - 28px))",
        margin: "12px auto 0",
        padding: "11px 16px",
        // 🆕 28x.169 — full pill radius + solid fill + real shadow, matching
        //   ConfirmBar/TherapistMinimalCard's actual button language instead
        //   of the "info alert" card pattern (tint bg, thin border, left
        //   accent stripe) this used to have.
        borderRadius: "999px",
        background: v.bg,
        border: "none",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: clickable ? "pointer" : "default",
        boxShadow: `0 8px 20px ${v.shadow}`,
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
        // 🆕 28t.10 — gentle "blink" glow ONLY while the therapist is
        //   online/open for work (founder "กระพริบเบาๆ เฉพาะตอนเปิดงาน").
        animation:
          status === "online"
            ? "srPillGlow 2.6s ease-in-out infinite"
            : "none",
        "@keyframes srPillGlow": {
          "0%, 100%": { boxShadow: `0 8px 20px ${v.shadow}` },
          "50%": { boxShadow: `0 8px 20px ${v.shadow}, 0 0 0 4px rgba(87,184,139,0.20)` },
        },
        "&:hover": clickable
          ? { transform: "translateY(-1px)", boxShadow: `0 12px 26px ${v.shadow}` }
          : undefined,
        "&:active": clickable ? { transform: "scale(0.99)" } : undefined,
        "&:focus-visible": clickable
          ? { outline: "2px solid #fff", outlineOffset: 2 }
          : undefined,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {/* icon — gentle bounce. Frosted-glass chip on the solid fill, same
          treatment as the trust chips on DetailHero, instead of a
          same-color-as-background circle that would now disappear. */}
      <Box
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.24)",
          border: "1px solid rgba(255,255,255,0.35)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 800,
          animation:
            status === "online" ? "srPillBounce 1.6s ease-in-out infinite" : "none",
          "@keyframes srPillBounce": {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-2.5px)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {v.icon}
      </Box>
      {/* 🆕 28w.68 — centred so it balances the centred stat columns above */}
      <Box sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "13px",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {titleText}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </Typography>
      </Box>
      {/* tap affordance — nudging arrow */}
      {clickable && (
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            color: "#fff",
            fontSize: "18px",
            fontWeight: 700,
            // 🆕 28t.10 — nudge only while online (founder "เฉพาะตอนเปิดงาน").
            animation:
              status === "online" ? "srPillNudge 1.4s ease-in-out infinite" : "none",
            "@keyframes srPillNudge": {
              "0%, 100%": { transform: "translateX(0)" },
              "50%": { transform: "translateX(3px)" },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          ›
        </Box>
      )}
    </Box>
  );
};

export default StatusPill;
