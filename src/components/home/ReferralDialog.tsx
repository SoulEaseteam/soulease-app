// src/components/home/ReferralDialog.tsx
//
// 🎁 Refer-a-friend dialog — opened from the TopNav drawer.
//
// What it shows:
//   • Promo headline ("Give 200฿ · Get 200฿")
//   • Personal referral code (derived from user email/uid for now —
//     swap for a real backend code when /referrals API ships)
//   • Tap-to-copy with success feedback animation
//   • Native share button (Web Share API) → falls back to copy when
//     the device doesn't support sharing
//
// 🆕 Round 28g (founder 2026-05-02) — added per "Drawer Menu เพิ่มอะไร
// อีกดีเจ๋ง ๆ" direction. Viral growth lever; "give X / get X" is a
// proven referral pattern (Uber, Dropbox, Wise).
//
// 🆕 Round 28r33 (founder 2026-05-07) — Reward bumped DOWN from
// ฿500 → ฿200 to match the actual cap in `discount.ts` (lowered in
// r28). Dialog used to promise "Give 500 · Get 500" but the booking
// flow only credited ฿200 → confused tourist guests. Also added the
// "entry tier only" caveat in the fine print since r33 closed the
// referral-on-premium loophole.

import React, { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/providers/AuthProvider";
import { brand, fonts } from "@/theme";

const REFERRAL_REWARD_THB = 200;
const SHARE_HOST = "https://sunred.vip";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Build a stable, human-readable code from the user's identifier.
 * Format: `SUN-XXXXXX` (6 chars from base36 hash). Replace this with
 * a backend-issued code once the /referrals API exists.
 */
function deriveReferralCode(seed: string | null | undefined): string {
  if (!seed) return "SUN-WELCOME";
  // Tiny string-hash → base36 → first 6 chars uppercased.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const code = Math.abs(h).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `SUN-${code}`;
}

const ReferralDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  // 🆕 Round 28r21 — use the typed AuthProvider hook directly so
  //   `user` shape stays consistent with the rest of the app.
  const { user } = useAuth();
  const u = user;

  const code = useMemo(
    () => deriveReferralCode(u?.uid ?? u?.email ?? null),
    [u?.uid, u?.email]
  );

  const [copied, setCopied] = useState(false);

  const shareText = t(
    "referral.shareText",
    `I love SunRed — premium outcall massage delivered to your Bangkok hotel. Use my code ${code} for ${REFERRAL_REWARD_THB.toLocaleString()}฿ off your first booking: ${SHARE_HOST}/?ref=${code}`
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permissions) — at least
      // surface that something went wrong via the snackbar.
      setCopied(false);
    }
  };

  const handleShare = async () => {
    // Web Share API — present on iOS Safari + Android Chrome.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & {
          share: (data: ShareData) => Promise<void>;
        }).share({
          title: "SunRed",
          text: shareText,
          url: `${SHARE_HOST}/?ref=${code}`,
        });
        return;
      } catch {
        // User cancelled — fall through to copy fallback.
      }
    }
    // Fallback: copy the long share text instead of just the code.
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: "#F4F6F5",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
          margin: 2,
          overflow: "hidden",
        },
      }}
    >
      {/* Banner — gradient hero with reward callout */}
      <Box
        sx={{
          padding: "20px 22px 18px",
          background: "#8F8474",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
            animation: "referralShimmer 3.5s linear infinite",
            "@keyframes referralShimmer": {
              "0%": { transform: "translateX(-100%)" },
              "100%": { transform: "translateX(100%)" },
            },
          }}
        />
        <IconButton
          aria-label={t("common.close", "Close")}
          onClick={onClose}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#fff",
            background: "rgba(255,255,255,0.18)",
            zIndex: 2,
            "&:hover": { background: "rgba(255,255,255,0.28)" },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ zIndex: 1, position: "relative" }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <RedeemRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: "0.14em",
                opacity: 0.95,
                textTransform: "uppercase",
              }}
            >
              {t("referral.eyebrow", "Refer & earn")}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.heading,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginTop: "2px",
              }}
            >
              {t(
                "referral.title",
                `Give ${REFERRAL_REWARD_THB.toLocaleString()}฿ · Get ${REFERRAL_REWARD_THB.toLocaleString()}฿`
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <DialogTitle sx={{ display: "none" }}>{t("referral.title", "Refer & earn")}</DialogTitle>

      <DialogContent sx={{ padding: "18px 22px 22px" }}>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: brand.textMuted,
            lineHeight: 1.55,
            marginBottom: 2,
          }}
        >
          {t(
            "referral.intro",
            // 🆕 Round 28r79 — CLAUDE.md §3 euphemism: "discount"
            //   → "complimentary credit". Same math, brand-safe copy.
            "Share your code with friends. They receive a complimentary credit on their first reservation, and you receive the same credit once they complete it."
          )}
        </Typography>

        {/* Referral code card */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.85)",
            border: `2px dashed ${brand.peach}`,
            marginBottom: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 9.5,
                fontWeight: 700,
                color: brand.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "3px",
              }}
            >
              {t("referral.yourCode", "Your code")}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"IBM Plex Mono", "Inter", monospace',
                fontSize: 20,
                fontWeight: 700,
                color: brand.red,
                letterSpacing: "0.06em",
                lineHeight: 1,
              }}
            >
              {code}
            </Typography>
          </Box>
          <IconButton
            aria-label={t("referral.copy", "Copy code")}
            onClick={() => void handleCopy()}
            sx={{
              width: 40,
              height: 40,
              background: copied ? brand.green : brand.red,
              color: "#fff",
              transition: "background 0.25s ease",
              "&:hover": {
                background: copied ? brand.green : brand.red,
                opacity: 0.9,
              },
            }}
          >
            {copied ? (
              <CheckRoundedIcon sx={{ fontSize: 20 }} />
            ) : (
              <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Box>

        {/* Share button — opens system share sheet */}
        <Button
          fullWidth
          variant="contained"
          startIcon={<IosShareRoundedIcon />}
          onClick={() => void handleShare()}
          sx={{
            background: "#8F8474",
            textTransform: "none",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 14,
            padding: "11px",
            borderRadius: "12px",
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.28)",
            "&:hover": {
              background: "#7A7060",
              boxShadow: "0 8px 22px rgba(15, 23, 42, 0.36)",
            },
          }}
        >
          {t("referral.share", "Share with friends")}
        </Button>

        {/* Fine print */}
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 10,
            color: brand.textMuted,
            lineHeight: 1.5,
            marginTop: 1.5,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {t(
            "referral.terms",
            "Reward credited after their first completed session. One use per friend. Valid on Thai & Aromatherapy menu."
          )}
        </Typography>
      </DialogContent>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{ background: brand.green, fontFamily: fonts.body, fontWeight: 600 }}
          onClose={() => setCopied(false)}
        >
          {t("referral.copied", "Copied to clipboard")}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default ReferralDialog;
