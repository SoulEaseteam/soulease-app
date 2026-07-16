// src/components/home/AnniversaryDialog.tsx
//
// 🆕 Round 28x.11 (founder: "เอาไปแทนการ์ด นอกและใน · เอา ปุ่มในไว้ใต้รูป")
//   — the dialog body is now the founder-designed privileges infographic
//   (public/images/anniversary/privileges.jpg). All the campaign detail
//   (rewards, spend floors, eligibility, exclusions, SunPoints, terms)
//   lives inside that image now, so the built-out sections were removed.
//   The actionable CTA stays and sits directly BELOW the image.
//
//   The CTA still branches on ONE question (unchanged from 28w.88):
//     member?     → "Claim reward" → /my-codes (collect the codes there)
//     not member? → "Request membership & reward" → concierge chat
//     signed out? → "Sign in to claim" → /login (a claim needs an account)
//     claimed?    → shows what was claimed, links to /profile
//
//   ⚠️ The image text is English-only + bakes in the 15 Jul–15 Aug window,
//   so it no longer re-translates per locale. Alt text describes it for
//   screen readers.

import React from "react";
import {
  Box,
  Dialog,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Check, Gift, Crown, Lock } from "phosphor-react";
import { fonts } from "@/theme";
import { whatsappDeepLink } from "@/config/concierge";
import { useAnniversaryClaim } from "@/hooks/useAnniversaryClaim";
import { maskBookingRef } from "@/utils/bookingRef";

const ROSE = "#D97C95";
const GOLD = "#E3BE55";

const PRIVILEGES_IMG = "/images/anniversary/privileges.jpg";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AnniversaryDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    signedIn,
    isMember,
    bookingRefCode,
    activeClaim,
    loading,
  } = useAnniversaryClaim();

  const goCollect = () => {
    onClose();
    void navigate("/my-codes");
  };

  const conciergeHref = whatsappDeepLink(
    "Hello SunRed concierge. I would like to ask about the 1st Anniversary rewards and how to receive mine. Could you assist me?",
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      scroll="paper"
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
      <DialogContent sx={{ padding: 0 }}>
        {/* Founder-designed privileges infographic (full-bleed) + close */}
        <Box sx={{ position: "relative" }}>
          <Box
            component="img"
            src={PRIVILEGES_IMG}
            alt={t(
              "anniv.image.alt",
              "SunRed 1st Anniversary exclusive privileges. New guests: THB 100 welcome gift, minimum spend THB 1,400. Returning guests choose one — THB 200 gift, THB 300 voucher, or double SunPoints. Valid 15 July to 15 August 2026. Cannot be combined with other promotions.",
            )}
            loading="lazy"
            decoding="async"
            sx={{ display: "block", width: "100%", height: "auto" }}
          />
          <Box
            component="button"
            type="button"
            aria-label={t("anniv.close", "Close")}
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: "rgba(0,0,0,0.32)",
              backdropFilter: "blur(4px)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} weight="bold" />
          </Box>
        </Box>

        {/* ── CTA, directly under the image (founder: "ปุ่มในไว้ใต้รูป") ── */}
        <Box sx={{ padding: "16px 18px 20px" }}>
          {activeClaim ? (
            // Already claimed — point at the profile.
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                padding: "12px 13px",
                borderRadius: "12px",
                background: "rgba(87,184,139,0.12)",
                border: "1px solid rgba(87,184,139,0.4)",
                fontFamily: fonts.body,
                fontSize: 12.5,
                color: "var(--sr-body)",
              }}
            >
              <Check size={16} weight="bold" color="#57B88B" />
              <Box>
                {t("anniv.already", "You have already claimed:")}{" "}
                <strong style={{ color: "var(--sr-ink)" }}>
                  {activeClaim.rewardLabel}
                </strong>
                {" · "}
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    onClose();
                    void navigate("/profile");
                  }}
                  sx={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: ROSE,
                    fontWeight: 700,
                    fontFamily: fonts.body,
                    fontSize: 12.5,
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
              onClick={() => {
                onClose();
                void navigate("/login");
              }}
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
              {bookingRefCode && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    mt: 1,
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: "var(--sr-muted)",
                  }}
                >
                  <Crown size={12} weight="fill" color={GOLD} />
                  {t("anniv.bookingRef", "Booking ref")} ·{" "}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      color: "var(--sr-body)",
                    }}
                  >
                    {maskBookingRef(bookingRefCode)}
                  </Box>
                </Box>
              )}
            </>
          ) : (
            // Not a member — no self-serve enrolment, hand to the concierge.
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
                  mt: 1,
                  textAlign: "center",
                  fontFamily: fonts.body,
                  fontSize: 11,
                  color: "var(--sr-muted)",
                  lineHeight: 1.5,
                }}
              >
                {t(
                  "anniv.notMemberNote",
                  "Anniversary rewards are reserved for SunRed members. Our concierge will enrol you and apply your reward.",
                )}
              </Box>
            </>
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
