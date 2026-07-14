// src/components/home/AnniversaryDialog.tsx
//
// 🆕 Round 28w.88 (founder: "กดบัตรนี้ แล้วขึ้นป๊อปอับ แสดงรายละเอียด และ ปุ่มรับสิท
//   และปุ่มสมัครสามชิก ถ้ามีสามชิก สิทจะไปยุในหน้า ยูสเซอเลย ถ้า ยัง ให้ส่งข้อความไปขอ
//   สมัคร รับสิทกับแอดมิน · ขอภาษาอังกฤษ กึ่งทางการ")
//
// Tapping the Anniversary banner opens this. It shows the campaign, the three
// rewards with their spend floors, who qualifies, what the reward can't be
// combined with, and the terms — then branches on ONE question:
//
//   member?  → "Claim reward" sends them to /my-codes, where every reward they
//              qualify for is listed and they collect the ones they want. 28w.90
//              moved the picking OUT of this dialog (founder: "สิทธิ์ทั้งหมดจะถูก
//              โชว์ใน my-codes … ให้ไปเก็บโค้ดกันเอง ในนั้น") — the dialog explains
//              the campaign, the codes wallet holds the codes.
//   not?     → "Request membership" opens the concierge chat. There is no
//              self-serve enrolment: the concierge enrols by phone from
//              /admin/members, so pretending otherwise would dead-end the guest.
//   signed out? → send them to sign in first; a claim needs an account to land in.
//
// Copy is English in a semi-formal register (founder's explicit ask), routed
// through t() so it still follows the guest's device language.

import React from "react";
import {
  Box,
  Dialog,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Check, Gift, Crown, Lock, Ticket } from "phosphor-react";
import { fonts } from "@/theme";
import { whatsappDeepLink } from "@/config/concierge";
import {
  ANNIVERSARY_EXCLUSIONS,
  anniversaryPeriodLabel,
} from "@/config/anniversary";
import { useAnniversaryClaim } from "@/hooks/useAnniversaryClaim";

const ROSE = "#D97C95";
const GOLD = "#E3BE55";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AnniversaryDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    signedIn,
    isMember,
    isReturning,
    eligibleRewards,
    membership,
    activeClaim,
    loading,
  } = useAnniversaryClaim();

  // 🆕 28w.90 — the period is rendered in the GUEST'S locale, so a Thai guest
  //   sees 2569 and a Japanese guest sees Japanese months.
  const period = anniversaryPeriodLabel(i18n.language);

  const goCollect = () => {
    onClose();
    navigate("/my-codes");
  };

  const conciergeHref = whatsappDeepLink(
    "Hello SunRed concierge. I would like to join SunRed membership and claim my 1st Anniversary reward. Could you assist me?",
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          backgroundImage: "none",
          overflow: "hidden",
        },
      }}
    >
      {/* Header band */}
      <Box
        sx={{
          position: "relative",
          padding: "22px 20px 18px",
          background: "linear-gradient(120deg,#B8567F 0%,#8A3A57 100%)",
          color: "#fff",
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label={t("anniv.close", "Close")}
          onClick={onClose}
          sx={{
            position: "absolute", top: 12, right: 12,
            width: 30, height: 30, borderRadius: "50%",
            border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.18)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={15} weight="bold" />
        </Box>
        <Box sx={{ fontSize: 26, lineHeight: 1, mb: 0.75 }} aria-hidden>🎉</Box>
        <Box
          sx={{
            fontFamily: fonts.body, fontSize: 10, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            opacity: 0.85, mb: 0.5,
          }}
        >
          {t("anniv.eyebrow", "Celebrating one year")}
        </Box>
        <Box
          component="h2"
          sx={{
            fontFamily: fonts.heading, fontSize: 22, fontWeight: 500,
            margin: 0, lineHeight: 1.2,
          }}
        >
          {t("anniv.title", "SunRed 1st Anniversary")}
        </Box>
        {period && (
          <Box sx={{ fontFamily: fonts.body, fontSize: 12, opacity: 0.9, mt: 0.75 }}>
            {period}
          </Box>
        )}
      </Box>

      <DialogContent sx={{ padding: "18px 20px 22px" }}>
        {/* Lead */}
        <Box
          sx={{
            fontFamily: fonts.body, fontSize: 13, lineHeight: 1.6,
            color: "var(--sr-body)", mb: 2,
          }}
        >
          {t(
            "anniv.lead",
            "Thank you for choosing SunRed and being part of our journey over the past year. As a token of our appreciation, we are pleased to offer exclusive Anniversary rewards to both new and returning guests.",
          )}
        </Box>

        {/* 🆕 28w.90 — READ-ONLY list now. Collecting happens in /my-codes, so
            this stopped being a picker: showing selectable radios here and then
            asking them to pick again on the codes page would be the same choice
            twice. Only the rewards THIS guest qualifies for are listed — a first
            timer sees the welcome offer, not the returning-guest menu. */}
        <Box
          sx={{
            fontFamily: fonts.body, fontSize: 10.5, fontWeight: 800,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--sr-muted)", mb: 1,
          }}
        >
          {isReturning
            ? t("anniv.chooseOne", "Choose one reward")
            : t("anniv.yourWelcome", "Your welcome reward")}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
          {eligibleRewards.map((r) => (
            <Box
              key={r.id}
              sx={{
                display: "flex", alignItems: "center", gap: 1.25,
                padding: "11px 13px", borderRadius: "12px",
                background: "var(--sr-panel-2)",
                border: "1px solid var(--sr-hairline)",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 30, height: 30, borderRadius: "9px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(217,124,149,0.12)", color: ROSE,
                }}
              >
                <Ticket size={16} weight="duotone" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    fontFamily: fonts.body, fontSize: 13.5, fontWeight: 700,
                    color: "var(--sr-ink)", lineHeight: 1.3,
                  }}
                >
                  {t(`anniv.reward.${r.id}`, r.label)}
                </Box>
                <Box
                  sx={{
                    fontFamily: fonts.body, fontSize: 11.5,
                    color: "var(--sr-muted)", mt: "2px",
                  }}
                >
                  {t(`anniv.reward.${r.id}.note`, r.note)}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Eligibility */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {[
            { k: "new", title: t("anniv.new.title", "New guests"), body: t("anniv.new.body", "One reward, valid for 30 days") },
            { k: "returning", title: t("anniv.returning.title", "Returning guests"), body: t("anniv.returning.body", "One reward, valid during the campaign") },
          ].map((c) => (
            <Box
              key={c.k}
              sx={{
                flex: 1, padding: "10px 11px", borderRadius: "10px",
                background: "var(--sr-panel-2)", border: "1px solid var(--sr-hairline)",
              }}
            >
              <Box sx={{ fontFamily: fonts.body, fontSize: 11.5, fontWeight: 800, color: "var(--sr-ink)" }}>
                {c.title}
              </Box>
              <Box sx={{ fontFamily: fonts.body, fontSize: 11, color: "var(--sr-muted)", mt: "2px", lineHeight: 1.4 }}>
                {c.body}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Exclusions */}
        <Box
          sx={{
            fontFamily: fonts.body, fontSize: 11.5, color: "var(--sr-muted)",
            lineHeight: 1.6, mb: 1.5,
          }}
        >
          <strong style={{ color: "var(--sr-body)" }}>
            {t("anniv.notCombined", "Cannot be combined with")}:
          </strong>{" "}
          {ANNIVERSARY_EXCLUSIONS.map((e, i) => (
            <React.Fragment key={e}>
              {i > 0 && " · "}
              {t(`anniv.exclusion.${i}`, e)}
            </React.Fragment>
          ))}
        </Box>

        {/* ── The branch ── */}
        {activeClaim ? (
          // Already claimed — nothing more to do here; point at the profile.
          <Box
            sx={{
              display: "flex", alignItems: "center", gap: 1,
              padding: "12px 13px", borderRadius: "12px",
              background: "rgba(87,184,139,0.12)",
              border: "1px solid rgba(87,184,139,0.4)",
              fontFamily: fonts.body, fontSize: 12.5, color: "var(--sr-body)",
            }}
          >
            <Check size={16} weight="bold" color="#57B88B" />
            <Box>
              {t("anniv.already", "You have already claimed:")}{" "}
              <strong style={{ color: "var(--sr-ink)" }}>{activeClaim.rewardLabel}</strong>
              {" — "}
              <Box
                component="button"
                type="button"
                onClick={() => { onClose(); navigate("/profile"); }}
                sx={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: ROSE, fontWeight: 700, fontFamily: fonts.body, fontSize: 12.5,
                  textDecoration: "underline",
                }}
              >
                {t("anniv.viewInProfile", "view it in your profile")}
              </Box>
            </Box>
          </Box>
        ) : loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
            <CircularProgress size={22} sx={{ color: ROSE }} />
          </Box>
        ) : !signedIn ? (
          // A claim has to land in an account, so sign-in comes first.
          <Box
            component="button"
            type="button"
            onClick={() => { onClose(); navigate("/login"); }}
            sx={ctaSx}
          >
            <Lock size={16} weight="bold" />
            {t("anniv.signInToClaim", "Sign in to claim your reward")}
          </Box>
        ) : isMember ? (
          // Member — send them to the codes wallet to collect.
          <>
            <Box component="button" type="button" onClick={goCollect} sx={ctaSx}>
              <Gift size={16} weight="bold" />
              {t("anniv.claim", "Claim reward")}
            </Box>
            <Box
              sx={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 0.5, mt: 1,
                fontFamily: fonts.body, fontSize: 11, color: "var(--sr-muted)",
              }}
            >
              <Crown size={12} weight="fill" color={GOLD} />
              {t("anniv.memberAs", "Member")} · {membership?.code}
            </Box>
          </>
        ) : (
          // Not a member — there is no self-serve enrolment, so hand them to the
          // concierge rather than showing a button that cannot work.
          <>
            <Box
              component="a"
              href={conciergeHref}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ ...ctaSx, textDecoration: "none" }}
            >
              <Crown size={16} weight="bold" />
              {t("anniv.requestMembership", "Request membership & reward")}
            </Box>
            <Box
              sx={{
                mt: 1, textAlign: "center",
                fontFamily: fonts.body, fontSize: 11, color: "var(--sr-muted)", lineHeight: 1.5,
              }}
            >
              {t(
                "anniv.notMemberNote",
                "Anniversary rewards are reserved for SunRed members. Our concierge will enrol you and apply your reward.",
              )}
            </Box>
          </>
        )}

        {/* Terms */}
        <Box
          sx={{
            mt: 2, paddingTop: 1.5, borderTop: "1px solid var(--sr-hairline)",
            fontFamily: fonts.body, fontSize: 10, color: "var(--sr-dim)", lineHeight: 1.6,
          }}
        >
          <Box sx={{ fontWeight: 800, mb: 0.25, color: "var(--sr-muted)" }}>
            {t("anniv.terms.title", "Terms & Conditions")}
          </Box>
          {t(
            "anniv.terms.body",
            "Valid for one-time use only · Minimum spend applies · Cannot be combined with other promotions or vouchers · Valid during the Anniversary campaign only.",
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const ctaSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  minHeight: 46,
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  background: "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)",
  color: "#fff",
  fontFamily: fonts.body,
  fontSize: 14,
  fontWeight: 700,
  boxShadow: "0 6px 16px rgba(217,124,149,0.30)",
  "&:hover": { background: "linear-gradient(135deg,#C96F89 0%,#B36079 100%)" },
} as const;

export default AnniversaryDialog;
