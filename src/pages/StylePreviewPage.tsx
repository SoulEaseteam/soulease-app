// ─────────────────────────────────────────────────────────────────────
// 🧊 StylePreviewPage — /style-preview
//
// A REVIEW SURFACE, not a customer page. Deliberately not linked from
// any nav and not in scripts/prerender-routes.mjs, so it carries no SEO
// weight and no guest ever lands on it.
//
// Purpose: let the founder judge the glassmorphism direction
// (2026-07-28) on a real phone, composed the way an actual booking
// surface would be — rather than as a component zoo. If the direction
// is approved this page can be deleted; the primitives it exercises
// (src/components/common/Frost.tsx) are what ships.
//
// Compare modes without waiting for the clock:
//   /style-preview?theme=night   ← the design target
//   /style-preview?theme=day
//   /style-preview?theme=auto    ← restore normal behaviour
// ─────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import {
  ArrowLeft,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkle,
  User,
} from "phosphor-react";

import {
  FrostCard,
  FrostChip,
  FrostDivider,
  FrostHeroSheet,
  FrostRow,
} from "@/components/common/Frost";
import { frost } from "@/theme/frost";

/** Real catalogue values (SR-HJ2200) so the preview prices aren't fiction. */
const DURATIONS = [
  { id: "70", label: "70 min", price: 2200 },
  { id: "120", label: "120 min", price: 3000 },
] as const;

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

export default function StylePreviewPage() {
  const [duration, setDuration] = useState<string>("70");
  const selected =
    DURATIONS.find((d) => d.id === duration) ?? DURATIONS[0];

  return (
    <FrostHeroSheet
      image="/images/xing/xingxing1.jpg"
      alt=""
      overlay={
        <Box sx={{ px: 2.5, pt: 2.5 }}>
          <ButtonBase
            aria-label="Back"
            sx={{
              ...frost.pill,
              width: 40,
              height: 40,
              color: "var(--sr-glass-ink)",
            }}
          >
            <ArrowLeft size={18} weight="light" />
          </ButtonBase>
        </Box>
      }
    >
      {/* ── Title block ─────────────────────────────────────────── */}
      <Typography sx={{ ...frost.text.eyebrow, mb: 1 }}>
        SunRed · Signature
      </Typography>

      <Typography
        component="h1"
        sx={{ ...frost.text.heading, fontSize: "1.75rem", lineHeight: 1.2 }}
      >
        Gentleman&rsquo;s Signature
      </Typography>

      <Typography sx={{ ...frost.text.muted, fontSize: "0.9375rem", mt: 1 }}>
        Aromatherapy with a personalised finishing ritual, delivered to
        your hotel or residence.
      </Typography>

      {/* ── Duration chips — glass until chosen, then solid ─────── */}
      <Box sx={{ display: "flex", gap: 1.25, mt: 3 }}>
        {DURATIONS.map((d) => (
          <FrostChip
            key={d.id}
            label={d.label}
            selected={duration === d.id}
            onClick={() => setDuration(d.id)}
          />
        ))}
      </Box>

      {/* ── Detail card — rows separated by hairlines ───────────── */}
      <FrostCard sx={{ mt: 2.5, py: 0.5 }}>
        <FrostRow
          icon={<User size={20} weight="light" />}
          label="Practitioner"
          trailing="Assigned by concierge"
        />
        <FrostDivider inset={2.25} />
        <FrostRow
          icon={<Clock size={20} weight="light" />}
          label="Typical arrival"
          trailing="45–60 min"
        />
        <FrostDivider inset={2.25} />
        <FrostRow
          icon={<MapPin size={20} weight="light" />}
          label="Coverage"
          trailing="Central Bangkok"
        />
        <FrostDivider inset={2.25} />
        <FrostRow
          icon={<ShieldCheck size={20} weight="light" />}
          label="Discretion"
          trailing="Unmarked arrival"
        />
      </FrostCard>

      {/* ── Price + CTA ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          mt: 3,
          mb: 1.5,
        }}
      >
        <Typography sx={{ ...frost.text.muted, fontSize: "0.8125rem" }}>
          {selected.label} · all-inclusive
        </Typography>
        <Typography
          sx={{ ...frost.text.heading, fontSize: "1.5rem", fontWeight: 500 }}
        >
          {baht(selected.price)}
        </Typography>
      </Box>

      <ButtonBase
        sx={{
          ...frost.chipSelected,
          width: "100%",
          py: 1.75,
          borderRadius: "16px",
          fontSize: "0.9375rem",
          letterSpacing: "0.02em",
          gap: 1,
        }}
      >
        <Sparkle size={17} weight="light" />
        Request this reservation
      </ButtonBase>

      <Typography
        sx={{ ...frost.text.muted, fontSize: "0.75rem", mt: 1.5, textAlign: "center" }}
      >
        A concierge confirms availability before any payment is taken.
      </Typography>

      {/* ── Reviewer-only mode switcher ─────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "center",
          mt: 5,
          pt: 3,
          borderTop: "1px solid var(--sr-glass-line)",
        }}
      >
        {(["night", "day", "auto"] as const).map((m) => (
          <Box
            key={m}
            component="a"
            href={`/style-preview?theme=${m}`}
            sx={{
              ...frost.text.muted,
              fontSize: "0.75rem",
              textDecoration: "none",
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              border: "1px solid var(--sr-glass-border-soft)",
            }}
          >
            {m}
          </Box>
        ))}
      </Box>
    </FrostHeroSheet>
  );
}
