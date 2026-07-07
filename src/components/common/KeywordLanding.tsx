// src/components/common/KeywordLanding.tsx
//
// 🆕 Round 28s304 (founder: "ได้ทั้งหมด") — drop-in replacement for the
//   bare `<Navigate to="/" replace>` on the district SEO routes
//   (/outcall-massage-sukhumvit etc.). Behaviour for humans is unchanged
//   — they still get bounced to the home page — but first we record WHICH
//   district keyword page pulled them in, so the Analytics dashboard can
//   show which SEO page drives traffic. The capture is a client-only
//   side effect (recordLandingArea no-ops when there's no window), so the
//   prerendered static shell for these routes is byte-identical: this
//   component still renders exactly `<Navigate to="/" replace>` during
//   prerender.
//
//   The write is done in the render body (not an effect) on purpose: the
//   <Navigate> unmounts this component and mounts HomePage in the same
//   commit, and HomePage's home_view effect must read a value that's
//   already in sessionStorage — a useEffect here could race that read.

import React from "react";
import { Navigate } from "react-router-dom";
import { recordLandingArea } from "@/utils/analytics";

const KeywordLanding: React.FC<{ area: string }> = ({ area }) => {
  recordLandingArea(area);
  return <Navigate to="/" replace />;
};

export default KeywordLanding;
