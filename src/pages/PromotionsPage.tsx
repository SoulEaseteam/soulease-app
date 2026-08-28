// src/pages/PromotionsPage.tsx
//
// 🆕 Round 28w.4 (founder 2026-07-13) — customer-facing "Promotions &
//   News" page. Replaces the "Therapists" slot in QuickNavRow (founder:
//   "Therapy เปลี่ยน เป็นหน้า โปรโมชั่น และข่าวสาร"). Two sections:
//     1. Current Offers — live promo codes + bundle packages from the
//        shared useActivePromos() hook (same source as PromoStrip).
//     2. News & Updates — follow the Telegram/LINE channels where SunRed
//        actually posts nightly availability + flash offers.
//   Rose day/night theme (var(--sr-*)), rose-berry hero — matches
//   LoginPage/BookingHistoryPage 28w series.

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
// 🆕 (founder audit: "หน้า promotions") — this page never imported i18n at
//   all; every visible string was hardcoded English. All chrome now runs
//   through t().
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, Package, CheckCircle, Megaphone } from "phosphor-react";

// 🆕 28w.23 — page renders under MainLayout, which already provides the
//   bottom nav; the page-level <BottomNav/> was a duplicate (removed below).
import { responsiveShell } from "@/theme/breakpoints";
import { useActivePromos } from "@/hooks/useActivePromos";
import { formatTHB } from "@/utils/servicePricing";
import { CONCIERGE } from "@/config/concierge";
import { useDocumentMeta } from "@/utils/useDocumentMeta";
// 🆕 28x.16 (founder: "หน้า promotions เอา การ์ดนี้ไปใส่") — surface the
//   1st-anniversary privileges card here while the campaign is live, and
//   stop showing "No promotions running" when it is.
import { anniversaryIsLive } from "@/config/anniversary";
import { useAnniversaryConfigVersion } from "@/hooks/useAnniversaryConfigVersion";
import AnniversaryDialog from "@/components/home/AnniversaryDialog";

const ANNIV_IMG = "/images/anniversary/privileges.jpg";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

const ROSE = "#FF9999";
const HERO_GRADIENT = "linear-gradient(160deg, #FF9999 0%, #FF9999 100%)";

/** One-line human discount label for a custom promo code. */
function codeDiscountLabel(t: TFunction, type: "percent" | "fixed", amount: number, capThb?: number | null): string {
  if (type === "percent") {
    return capThb && capThb > 0
      ? t("promos.percentOffCap", "{{amount}}% off · up to {{cap}}", { amount, cap: formatTHB(capThb) })
      : t("promos.percentOff", "{{amount}}% off", { amount });
  }
  return t("promos.fixedOff", "{{amount}} off", { amount: formatTHB(amount) });
}

const PromotionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCustomCodes, activeBundles, totalCount } = useActivePromos();
  const [copied, setCopied] = useState<string | null>(null);
  // 🆕 28x.16 — anniversary campaign card + its reward dialog.
  const [annivOpen, setAnnivOpen] = useState(false);
  // 2026-08-14 — subscribe so ending the campaign (config lands async /
  // changes mid-session) removes this card without a reload; a bare
  // anniversaryIsLive() read only re-evaluates when something ELSE re-renders.
  useAnniversaryConfigVersion();
  const annivLive = anniversaryIsLive();

  useDocumentMeta({
    title: t("meta.promos.title", "Promotions & News · SunRed Bangkok"),
    description: t(
      "meta.promos.description",
      "Current SunRed offers and where to follow nightly availability and flash promotions.",
    ),
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
    } catch {
      /* clipboard blocked — non-fatal */
    }
  };

  return (
      <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 14, fontFamily: SANS }}>
        {/* ── Rose-berry hero ─────────────────────────────────────── */}
        <Box
          sx={{
            background: HERO_GRADIENT,
            pt: "env(safe-area-inset-top, 16px)",
            pb: 3.5,
            px: 2.5,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            component="button"
            onClick={() => void navigate(-1)}
            aria-label={t("common.goBack", "Go back")}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "#fff",
              cursor: "pointer",
              mb: 2.5,
              p: 0,
            }}
          >
            <ArrowLeft size={18} weight="bold" />
          </Box>

          <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {t("promos.title", "Promotions & News")}
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.72)", mt: 0.5 }}>
            {totalCount > 0
              ? t("promos.liveCount", "{{count}} offers live right now", { count: totalCount })
              : annivLive
              ? t("promos.annivLive", "Our 1st Anniversary privileges are live")
              : t("promos.followNext", "Follow our channels for the next drop")}
          </Typography>
        </Box>

        {/* ── Current offers ──────────────────────────────────────── */}
        <Box sx={{ px: 2, pt: 3 }}>
          <SectionEyebrow>{t("promos.current", "Current Offers")}</SectionEyebrow>

          {/* 🆕 28x.16 — anniversary privileges card (only while the campaign
              is live). Tapping it opens the same reward dialog as the home
              banner, so a guest can claim from here too. */}
          {annivLive && (
            <AnniversaryOfferCard onOpen={() => setAnnivOpen(true)} />
          )}

          {totalCount === 0 ? (
            annivLive ? null : <EmptyOffers />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1.5 }}>
              {activeCustomCodes.map((p, i) => (
                <motion.div
                  key={`code-${p.code}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <OfferCard
                    icon={<Ticket size={22} weight="duotone" />}
                    title={p.label}
                    subtitle={codeDiscountLabel(t, p.type, p.amount, p.capThb)}
                    code={p.code}
                    copied={copied === p.code}
                    onCopy={() => void copyCode(p.code)}
                  />
                </motion.div>
              ))}
              {activeBundles.map((b, i) => (
                <motion.div
                  key={`bundle-${b.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: (activeCustomCodes.length + i) * 0.05 }}
                >
                  <OfferCard
                    icon={<Package size={22} weight="duotone" />}
                    title={b.name}
                    subtitle={`${t("promos.bundleSub", "{{n}} sessions · {{pct}}% off", { n: b.sessionCount, pct: b.discountPct })}${b.label ? ` · ${b.label}` : ""}`}
                  />
                </motion.div>
              ))}
            </Box>
          )}
        </Box>

        {/* ── News & updates ──────────────────────────────────────── */}
        <Box sx={{ px: 2, pt: 3.5 }}>
          <SectionEyebrow>{t("promos.news", "News & Updates")}</SectionEyebrow>
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)", mt: 0.5, mb: 1.5, lineHeight: 1.5 }}>
            {t("promos.newsBody", "Nightly availability, new practitioners and flash offers are posted first on our channels.")}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <ChannelCard
              iconSrc="/images/profli/telegram.png"
              tint="#26A1E0"
              title={t("promos.telegram", "Telegram Channel")}
              subtitle={CONCIERGE.telegramChannel}
              href={CONCIERGE.telegramChannelUrl}
            />
            <ChannelCard
              iconSrc="/images/profli/line.png"
              tint="#06C755"
              title={t("promos.line", "LINE Official")}
              subtitle={t("promos.lineSub", "Add for updates in your language")}
              href={CONCIERGE.lineUrl}
            />
          </Box>
        </Box>

        <AnniversaryDialog open={annivOpen} onClose={() => setAnnivOpen(false)} />
      </Box>
  );
};

// ── Anniversary privileges card — full infographic, tap to open the
//    reward dialog. Shown on the Promotions page only while the campaign
//    is live (28x.16).
const AnniversaryOfferCard: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { t } = useTranslation();
  return (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    onClick={onOpen}
    role="button"
    tabIndex={0}
    onKeyDown={(e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    }}
    aria-label={t("promos.annivAria", "SunRed 1st Anniversary privileges, tap to claim your reward")}
    sx={{
      position: "relative",
      display: "block",
      width: "100%",
      mt: 1.5,
      borderRadius: "18px",
      overflow: "hidden",
      cursor: "pointer",
      outline: "none",
      border: "1px solid var(--sr-hairline)",
      boxShadow: "var(--sr-card-shadow)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": { transform: "translateY(-2px)" },
      "&:focus-visible": { boxShadow: "0 0 0 3px rgba(217,124,149,0.55)" },
    }}
  >
    <Box
      component="img"
      src={ANNIV_IMG}
      alt={t("anniv.image.alt", "SunRed 1st Anniversary exclusive privileges poster")}
      loading="lazy"
      decoding="async"
      sx={{ display: "block", width: "100%", height: "auto" }}
    />
    {/* claim hint bar */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.75,
        py: 1.1,
        background: "linear-gradient(135deg,#FF9999 0%,#FF9999 100%)",
        color: "#fff",
        fontFamily: SANS,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.02em",
      }}
    >
      <Ticket size={16} weight="fill" />
      {t("promos.annivTap", "Tap to claim your reward")}
    </Box>
  </Box>
  );
};

// ── bits ────────────────────────────────────────────────────────────
const SectionEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    className="deco-eyebrow-left"
    sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--sr-gold-text)" }}
  >
    <Megaphone size={15} weight="fill" color={ROSE} />
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--sr-gold-text)",
      }}
    >
      {children}
    </Typography>
  </Box>
);

const OfferCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  code?: string;
  copied?: boolean;
  onCopy?: () => void;
}> = ({ icon, title, subtitle, code, copied, onCopy }) => {
  const { t } = useTranslation();
  return (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      p: "14px 16px",
      borderRadius: "18px",
      background: "var(--sr-panel)",
      border: "1px solid var(--sr-hairline)",
      boxShadow: "var(--sr-card-shadow)",
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 42,
        height: 42,
        borderRadius: "12px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(217,124,149,0.14)",
        color: ROSE,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.25 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", mt: 0.25 }}>
        {subtitle}
      </Typography>
    </Box>
    {code && (
      <Box
        component="button"
        type="button"
        onClick={onCopy}
        aria-label={t("promos.copyAria", "Copy promo code {{code}}", { code })}
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: "12px",
          py: "8px",
          borderRadius: "999px",
          border: `1px dashed ${ROSE}`,
          background: copied ? "rgba(87,184,139,0.14)" : "rgba(217,124,149,0.10)",
          color: copied ? "#2E7D57" : ROSE,
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.04em",
          cursor: "pointer",
          transition: "background 0.2s ease, color 0.2s ease",
        }}
      >
        {copied ? <CheckCircle size={14} weight="fill" /> : null}
        {copied ? t("promos.copied", "Copied") : code}
      </Box>
    )}
  </Box>
  );
};

const ChannelCard: React.FC<{
  iconSrc: string;
  tint: string;
  title: string;
  subtitle: string;
  href: string;
}> = ({ iconSrc, tint, title, subtitle, href }) => (
  <Box
    component="a"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      p: "14px 16px",
      borderRadius: "18px",
      background: "var(--sr-panel)",
      border: "1px solid var(--sr-hairline)",
      boxShadow: "var(--sr-card-shadow)",
      textDecoration: "none",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": { transform: "translateY(-1px)" },
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 42,
        height: 42,
        borderRadius: "12px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tint,
        color: "#fff",
      }}
    >
      <Box component="img" src={iconSrc} alt="" width={22} height={22} loading="lazy" sx={{ width: 22, height: 22, objectFit: "contain" }} />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.25 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", mt: 0.25 }}>
        {subtitle}
      </Typography>
    </Box>
    <Box aria-hidden sx={{ flexShrink: 0, fontSize: 20, fontWeight: 700, color: "var(--sr-muted)" }}>
      ›
    </Box>
  </Box>
);

const EmptyOffers: React.FC = () => {
  const { t } = useTranslation();
  return (
  <Box
    sx={{
      mt: 1.5,
      px: 2,
      py: 4,
      borderRadius: "18px",
      background: "var(--sr-panel-2)",
      border: "1px solid var(--sr-hairline)",
      textAlign: "center",
    }}
  >
    <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: "var(--sr-ink)" }}>
      {t("promos.empty.title", "No promotions running right now")}
    </Typography>
    <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)", mt: 0.5, lineHeight: 1.5 }}>
      {t("promos.empty.body", "Follow our channels below — new offers drop there first.")}
    </Typography>
  </Box>
  );
};

export default PromotionsPage;
