// src/components/common/KeywordLanding.tsx
//
// 🆕 Round 28x.7 (audit fix #3) — district SEO routes now render a REAL
//   page instead of `<Navigate to="/" replace>`.
//
//   The old redirect meant that when Googlebot executed JS the URL
//   bounced to `/` — rendered DOM ≠ the self-referential canonical in
//   the prerendered shell, so Google demoted these as soft-redirect /
//   thin pages and dropped the exact district keywords the strategy
//   depends on (paid ads are banned for this vertical, so these organic
//   pages ARE the acquisition channel).
//
//   Now KeywordLanding renders <HomePage district={…}> — the full live
//   home experience (practitioner roster, services, membership) plus a
//   district-specific hero band + district title/description/H1. The
//   hydrated page matches its canonical and reads as a genuine localized
//   landing page. Still records which district pulled the visitor in
//   for the Analytics dashboard.
//
//   Unknown area (should never happen — all 5 are wired in App.tsx) →
//   falls back to a plain redirect home so a typo can't render a broken
//   district band.

import React from "react";
import { Navigate } from "react-router-dom";
import { recordLandingArea } from "@/utils/analytics";
import { districtByArea } from "@/data/districts";
import HomePage from "@/pages/HomePage";

const KeywordLanding: React.FC<{ area: string }> = ({ area }) => {
  recordLandingArea(area);
  const district = districtByArea(area);
  if (!district) return <Navigate to="/" replace />;
  return <HomePage district={district} />;
};

export default KeywordLanding;
