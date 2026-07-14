// src/pages/user/MyCodesPage.tsx
//
// 🆕 Round 28w.89 (founder: "หน้า Guest profile เพิ่มเมนู โค้ดส่วนลดของฉัน") —
//   every discount the signed-in guest actually holds, in one place.
//
// Three real things, no filler:
//   1. Anniversary rewards they claimed (rewardClaims — pending until the
//      concierge applies it at booking; the copy says so rather than implying
//      the money is already off).
//   2. A code they were given and that is waiting at checkout (?ref= / ?promo=
//      captured into localStorage).
//   3. Their own referral code, to share.
//
// HONESTY GATE: promotions sit behind PROMOS_ENABLED, and the REFERRAL built-in
// can be switched off in /admin/promotions. When either is off, no code can
// actually reduce a bill — so this page must NOT present one as usable. The
// referral block is hidden in that state, exactly as ReferralDialog and TopNav
// already do, instead of advertising a reward the booking flow would refuse.

import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Ticket, Copy, ShareNetwork, Gift, ArrowLeft, Coins } from "phosphor-react";

import { useAuth } from "@/providers/AuthProvider";
import { useAnniversaryClaim } from "@/hooks/useAnniversaryClaim";
import { deriveReferralCode, getActiveReferralCode } from "@/utils/referral";
import { anniversaryPeriodLabel, anniversaryIsLive, SUNPOINT_THB } from "@/config/anniversary";
import { whatsappDeepLink } from "@/config/concierge";
import { getReferralConfig } from "@/utils/discount";
import { PROMOS_ENABLED } from "@/config/featureFlags";
import { responsiveShell } from "@/theme/breakpoints";
import { fonts } from "@/theme";

const ROSE = "#D97C95";

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      borderRadius: "16px",
      background: "var(--sr-panel)",
      border: "1px solid var(--sr-hairline)",
      boxShadow: "var(--sr-card-shadow)",
      p: "14px 15px",
    }}
  >
    {children}
  </Box>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontFamily: fonts.body, fontSize: 10.5, fontWeight: 800,
      letterSpacing: "0.14em", textTransform: "uppercase",
      color: "var(--sr-muted)", mb: 1, mt: 0.5,
    }}
  >
    {children}
  </Typography>
);

const MyCodesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    claims, loading, isMember, isReturning, eligibleRewards,
    activeClaim, submitting, claimReward,
    points, totalSpentTHB, visits,
  } = useAnniversaryClaim();
  const { i18n } = useTranslation();
  const period = anniversaryPeriodLabel(i18n.language);
  const campaignLive = anniversaryIsLive();

  // 🆕 28w.90 (founder: "ให้ไปเก็บโค้ดกันเอง ในนั้น") — the rewards this guest
  //   qualifies for, minus the one they already took. Anniversary is
  //   one-reward-per-guest, so once a claim exists the rest close.
  const collectable = eligibleRewards.filter((r) => !claims.some((c) => c.rewardId === r.id));

  const collect = async (id: typeof eligibleRewards[number]["id"]) => {
    const ok = await claimReward(id);
    if (ok) toast.success(t("codes.collected", "Code collected"));
    else toast.error(t("codes.collectFailed", "Could not collect the code. Please try again."));
  };

  const refCfg = getReferralConfig();
  const referralLive = PROMOS_ENABLED && refCfg.enabled;
  const myCode = deriveReferralCode(user?.uid);
  const heldCode = getActiveReferralCode();

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("codes.copied", "Code copied"));
    } catch {
      toast.error(t("codes.copyFailed", "Could not copy the code"));
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/?ref=${encodeURIComponent(myCode)}`;
    const text = t(
      "codes.shareText",
      "Book your first SunRed session with my code {{code}}.",
      { code: myCode },
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: "SunRed", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success(t("codes.linkCopied", "Invite link copied"));
      }
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  };

  const statusLabel = (s: string) =>
    s === "pending"
      ? t("codes.status.pending", "Awaiting concierge — applied to your next booking")
      : s === "approved"
        ? t("codes.status.approved", "Ready to use on your next booking")
        : s === "used"
          ? t("codes.status.used", "Already used")
          : t("codes.status.rejected", "Not approved");

  const nothing = claims.length === 0 && !heldCode && !referralLive && points === 0;

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 12 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pt: 2.5, pb: 1 }}>
        <Box
          component="button"
          type="button"
          aria-label={t("codes.back", "Back")}
          onClick={() => navigate("/profile")}
          sx={{
            width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "var(--sr-panel-2)", color: "var(--sr-ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ArrowLeft size={16} weight="bold" />
        </Box>
        <Typography
          component="h1"
          sx={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 500, color: "var(--sr-ink)" }}
        >
          {t("codes.title", "My discount codes")}
        </Typography>
      </Box>

      <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {(authLoading || loading) && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: ROSE }} />
          </Box>
        )}

        {/* Not signed in — codes belong to an account. */}
        {!authLoading && !user && (
          <Card>
            <Typography sx={{ fontFamily: fonts.body, fontSize: 13.5, color: "var(--sr-body)", mb: 1.5 }}>
              {t("codes.signInNote", "Sign in to see the discount codes and rewards on your account.")}
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => navigate("/login")}
              sx={ctaSx}
            >
              {t("codes.signIn", "Sign in")}
            </Box>
          </Card>
        )}

        {user && !loading && (
          <>
            {/* 🆕 28w.95 (founder: "กันลูกค้าเก่าน้อยใจ · ยอดสะสมจากการจองครั้งก่อนหน้า
                จะถูกเก็บเป็นเครดิตให้อัตโนมัติ หากยืนยันได้ว่ามีประวัติจริง") — SunPoints
                back-credited from sessions we ACTUALLY delivered (status
                completed/done on their phone), so the balance is always backed by
                real history. Shown first: a loyal guest should see what their past
                custom is worth before they see anything else.
                Hidden at zero rather than shown as "0 points" — a first-timer has
                nothing to be reassured about, and an empty balance reads as a
                broken promise. */}
            {points > 0 && (
              <>
                <Eyebrow>{t("codes.sunpoints", "SunPoints")}</Eyebrow>
                <Card>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 44, height: 44, borderRadius: "12px", flexShrink: 0,
                        background: "rgba(227,190,85,0.14)", color: "#E3BE55",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Coins size={22} weight="duotone" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: fonts.body, fontSize: 22, fontWeight: 800,
                          color: "var(--sr-ink)", lineHeight: 1.15,
                          fontVariantNumeric: "lining-nums tabular-nums",
                        }}
                      >
                        {points.toLocaleString()}{" "}
                        <Box component="span" sx={{ fontSize: 13, fontWeight: 600, color: "var(--sr-muted)" }}>
                          {t("codes.points", "SunPoints")}
                        </Box>
                      </Typography>
                      <Typography sx={{ fontFamily: fonts.body, fontSize: 12, color: ROSE, fontWeight: 700, mt: "1px" }}>
                        {t("codes.worth", "Worth ฿{{thb}} off your next booking", {
                          thb: (points * SUNPOINT_THB).toLocaleString(),
                        })}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontFamily: fonts.body, fontSize: 11.5, color: "var(--sr-muted)", mt: 1.25, lineHeight: 1.5 }}>
                    {t("codes.backCredited", "Credited automatically from your {{visits}} previous sessions (฿{{spent}} spent). Tell the concierge when you book to redeem.", {
                      visits,
                      spent: totalSpentTHB.toLocaleString(),
                    })}
                  </Typography>
                </Card>
              </>
            )}

            {/* 0 — Anniversary rewards still to collect. Members only: the
                   campaign is member-exclusive, so a signed-in non-member is
                   pointed at the concierge instead of shown a button that the
                   concierge would have to refuse. */}
            {campaignLive && collectable.length > 0 && !activeClaim && (
              <>
                <Eyebrow>
                  {t("codes.available", "Anniversary rewards")}
                  {period ? ` · ${period}` : ""}
                </Eyebrow>
                {!isMember ? (
                  <Card>
                    <Typography sx={{ fontFamily: fonts.body, fontSize: 13, color: "var(--sr-body)", lineHeight: 1.6, mb: 1.5 }}>
                      {t("anniv.notMemberNote", "Anniversary rewards are reserved for SunRed members. Our concierge will enrol you and apply your reward.")}
                    </Typography>
                    <Box
                      component="a"
                      href={whatsappDeepLink("Hello SunRed concierge. I would like to join SunRed membership and collect my 1st Anniversary reward. Could you assist me?")}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ ...ctaSx, textDecoration: "none" }}
                    >
                      {t("anniv.requestMembership", "Request membership & reward")}
                    </Box>
                  </Card>
                ) : (
                  <>
                    <Typography sx={{ fontFamily: fonts.body, fontSize: 11.5, color: "var(--sr-muted)", mb: 0.5, mt: -0.5 }}>
                      {isReturning
                        ? t("codes.pickOne", "You may collect one reward.")
                        : t("codes.welcomeOnly", "Your welcome reward as a first-time guest.")}
                    </Typography>
                    {collectable.map((r) => (
                      <Card key={r.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Box
                            aria-hidden
                            sx={{
                              width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
                              background: "rgba(217,124,149,0.12)", color: ROSE,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Ticket size={18} weight="duotone" />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.3 }}>
                              {t(`anniv.reward.${r.id}`, r.label)}
                            </Typography>
                            <Typography sx={{ fontFamily: fonts.body, fontSize: 11.5, color: "var(--sr-muted)", mt: "2px" }}>
                              {t(`anniv.reward.${r.id}.note`, r.note)}
                              {" · "}
                              {/* 🆕 28w.94 — 60 days on the ฿300 voucher, 30 on the rest. */}
                              {t("anniv.validDays", "valid {{days}} days", { days: r.validityDays })}
                            </Typography>
                          </Box>
                          <Box
                            component="button"
                            type="button"
                            disabled={submitting}
                            onClick={() => void collect(r.id)}
                            sx={{
                              flexShrink: 0, minHeight: 34, px: 1.75,
                              border: "none", borderRadius: 999, cursor: "pointer",
                              background: "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)",
                              color: "#fff", fontFamily: fonts.body, fontSize: 12.5, fontWeight: 700,
                              opacity: submitting ? 0.6 : 1,
                            }}
                          >
                            {t("codes.collect", "Collect")}
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}

            {/* 1 — Anniversary rewards */}
            {claims.length > 0 && (
              <>
                <Eyebrow>{t("codes.rewards", "My rewards")}</Eyebrow>
                {claims.map((c) => (
                  <Card key={c.id}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                      <Box
                        aria-hidden
                        sx={{
                          width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
                          background: "rgba(217,124,149,0.12)", color: ROSE,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Gift size={18} weight="duotone" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: "var(--sr-ink)" }}>
                          {c.rewardLabel}
                        </Typography>
                        <Typography sx={{ fontFamily: fonts.body, fontSize: 11.5, color: "var(--sr-muted)", mt: "2px" }}>
                          {statusLabel(c.status)}
                          {c.minSpendTHB
                            ? ` · ${t("codes.minSpend", "Minimum spend")} ฿${c.minSpendTHB.toLocaleString()}`
                            : ""}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </>
            )}

            {/* 2 — a code they were given, waiting at checkout */}
            {heldCode && (
              <>
                <Eyebrow>{t("codes.applied", "Ready at checkout")}</Eyebrow>
                <Card>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
                        background: "rgba(87,184,139,0.14)", color: "#57B88B",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Ticket size={18} weight="duotone" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 800, color: "var(--sr-ink)", letterSpacing: "0.06em" }}>
                        {heldCode}
                      </Typography>
                      <Typography sx={{ fontFamily: fonts.body, fontSize: 11.5, color: "var(--sr-muted)" }}>
                        {t("codes.appliedNote", "This code will be offered when you book.")}
                      </Typography>
                    </Box>
                    <Box component="button" type="button" onClick={() => void copy(heldCode)} sx={iconBtnSx} aria-label={t("codes.copy", "Copy code")}>
                      <Copy size={16} weight="bold" />
                    </Box>
                  </Box>
                </Card>
              </>
            )}

            {/* 3 — their own referral code. Hidden entirely when promos are off,
                   because no code can reduce a bill in that state. */}
            {referralLive && (
              <>
                <Eyebrow>{t("codes.myReferral", "My referral code")}</Eyebrow>
                <Card>
                  <Typography sx={{ fontFamily: fonts.body, fontSize: 12.5, color: "var(--sr-body)", mb: 1.25, lineHeight: 1.5 }}>
                    {t("codes.referralNote", "Share your code with a friend. They receive ฿{{amount}} off their first session — and so do you.", { amount: refCfg.amountThb.toLocaleString() })}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex", alignItems: "center", gap: 1,
                      p: "10px 12px", borderRadius: "10px",
                      background: "var(--sr-panel-2)", border: `1px dashed ${ROSE}`,
                      mb: 1.25,
                    }}
                  >
                    <Typography sx={{ flex: 1, fontFamily: fonts.body, fontSize: 16, fontWeight: 800, color: ROSE, letterSpacing: "0.08em" }}>
                      {myCode}
                    </Typography>
                    <Box component="button" type="button" onClick={() => void copy(myCode)} sx={iconBtnSx} aria-label={t("codes.copy", "Copy code")}>
                      <Copy size={16} weight="bold" />
                    </Box>
                  </Box>
                  <Box component="button" type="button" onClick={() => void share()} sx={ctaSx}>
                    <ShareNetwork size={16} weight="bold" />
                    {t("codes.share", "Share my code")}
                  </Box>
                </Card>
              </>
            )}

            {/* Nothing to show — say so plainly instead of an empty screen. */}
            {nothing && (
              <Card>
                <Typography sx={{ fontFamily: fonts.body, fontSize: 13.5, color: "var(--sr-body)", lineHeight: 1.6 }}>
                  {t(
                    "codes.empty",
                    "You have no discount codes yet. Rewards and offers you receive will appear here.",
                  )}
                </Typography>
              </Card>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

const iconBtnSx = {
  width: 32, height: 32, flexShrink: 0,
  borderRadius: "9px", cursor: "pointer",
  border: "1px solid var(--sr-hairline)",
  background: "var(--sr-panel-2)",
  color: "var(--sr-body)",
  display: "flex", alignItems: "center", justifyContent: "center",
} as const;

const ctaSx = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  width: "100%", minHeight: 42,
  border: "none", borderRadius: 999, cursor: "pointer",
  background: "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)",
  color: "#fff",
  fontFamily: fonts.body, fontSize: 13.5, fontWeight: 700,
} as const;

export default MyCodesPage;
