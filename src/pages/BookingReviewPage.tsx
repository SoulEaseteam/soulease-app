// src/pages/BookingReviewPage.tsx
//
// 🆕 Round 28x.165 — the anonymous, link-based guest review surface.
//
// Founder (2026-08-14): "เรื่องส่งลิ้งให้ลูกค้ารีวิว ทำได้ไหม". The concierge
// sends `/review/b/{bookingId}?t={accessToken}` after a completed job; the
// guest taps it and rates. No account, no app, no name.
//
// WHY THIS PAGE EXISTS AND /review/:id DOESN'T ANYMORE — the old page was
// unusable for SunRed's actual guests, four ways over:
//   1. Its route param was `:id` while the component read
//      `useParams().therapistId` — permanently `undefined`, so the therapist
//      never loaded and submitting always threw "Invalid therapist."
//   2. It required a Firebase login. SunRed guests are signed out; most
//      bookings are keyed in by the concierge with `userId: null`.
//   3. Eligibility was `where("userId", "==", user.uid)` — null on those same
//      concierge bookings, so nobody would have qualified even signed in.
//   4. It wrote `userName: user.email` as the public byline, which is exactly
//      the guest exposure CLAUDE.md §🔐 bans Google reviews over.
//
// This page fixes all four by inverting the trust model: the LINK is the
// credential. `submitBookingReview` verifies the booking's `accessToken`
// server-side — the same capability that already powers the success page and
// the booking chat — and writes `rating` + `reviewText` onto the booking doc.
// The `onBookingWriteSyncPublicReview` trigger then mirrors it into the
// world-readable `reviewsPublic` collection (rating + text + service only), so
// it appears on the practitioner's card immediately, tagged `verified`, with
// the guest shown as nothing but "Booking #XXXX".
//
// Nothing here collects or transmits a name, an email, or a phone number.
// Please keep it that way.

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { httpsCallable, getFunctions } from "firebase/functions";
import { Box, Typography, Rating, TextField, Button, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

import { app } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { fonts } from "@/theme";
import { useDocumentMeta } from "@/utils/useDocumentMeta";

interface BookingLite {
  therapistName?: string | null;
  serviceName?: string | null;
  duration?: number | null;
}

const MAX_CHARS = 2000;

const BookingReviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("t") ?? "";

  const [booking, setBooking] = useState<BookingLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // A review link must never be indexed — the URL carries a bearer token.
  useDocumentMeta({
    title: t("review.meta.title", "Rate your session · SunRed"),
    description: t(
      "review.meta.description",
      "Share private feedback about your SunRed session."
    ),
    noIndex: true,
  });

  // Resolve the booking through the same capability callable the success page
  // uses. It returns a REDACTED booking (no phone, no address author), which
  // is all this page needs: whose session, which service.
  useEffect(() => {
    if (!id) {
      setLoadError(t("review.err.link", "This review link is not valid."));
      setLoading(false);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const fn = httpsCallable<
          { bookingId: string; token: string },
          { ok: boolean; booking: BookingLite }
        >(getFunctions(app, "asia-southeast1"), "getBookingPublic");
        const res = await fn({ bookingId: id, token: accessToken });
        if (!alive) return;
        setBooking(res.data?.booking ?? null);
      } catch {
        if (!alive) return;
        // Deliberately one message for every failure. The callable itself
        // returns an identical error for "no such booking" and "wrong token"
        // so the endpoint can't be used to discover real booking ids —
        // reporting them differently here would undo that.
        setLoadError(
          t("review.err.link", "This review link is not valid or has expired.")
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, accessToken, t]);

  const handleSubmit = async () => {
    if (!id || !rating || !text.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fn = httpsCallable<
        { bookingId: string; token: string; rating: number; text: string },
        { ok: boolean }
      >(getFunctions(app, "asia-southeast1"), "submitBookingReview");
      await fn({ bookingId: id, token: accessToken, rating, text: text.trim() });
      setDone(true);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      const msg = (e as { message?: string }).message ?? "";
      // These three the guest can act on, so say what happened. Everything
      // else stays generic.
      if (code.includes("already-exists")) {
        setSubmitError(
          t("review.err.already", "This session has already been reviewed. Thank you!")
        );
      } else if (code.includes("failed-precondition")) {
        setSubmitError(
          t("review.err.notdone", "This session isn't marked complete yet. Please try again later.")
        );
      } else if (msg.toLowerCase().includes("reword")) {
        setSubmitError(
          t("review.err.moderated", "We can't publish that wording. Please rephrase and try again.")
        );
      } else {
        setSubmitError(t("review.err.failed", "Couldn't send your review. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shell = {
    ...responsiveShell,
    background: "var(--sr-bg)",
    minHeight: "100vh",
    px: 2.5,
    py: 5,
  } as const;

  const eyebrow = {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "#b85c3c",
  };

  if (loading) {
    return (
      <Box sx={{ ...shell, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={26} sx={{ color: "#FF9999" }} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={shell}>
        <Typography sx={eyebrow}>{t("review.eyebrow", "SunRed")}</Typography>
        <Typography
          sx={{ fontFamily: fonts.heading, fontSize: 24, color: "var(--sr-body)", mt: 1.5 }}
        >
          {loadError}
        </Typography>
        <Typography sx={{ fontFamily: fonts.body, fontSize: 14, color: "var(--sr-muted)", mt: 1.5 }}>
          {t(
            "review.err.hint",
            "Please use the most recent link your concierge sent you."
          )}
        </Typography>
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={shell}>
        <Typography sx={eyebrow}>{t("review.eyebrow", "SunRed")}</Typography>
        <Typography
          sx={{ fontFamily: fonts.heading, fontSize: 28, color: "var(--sr-body)", mt: 1.5 }}
        >
          {t("review.thanks.title", "Thank you.")}
        </Typography>
        <Typography sx={{ fontFamily: fonts.body, fontSize: 15, color: "var(--sr-muted)", mt: 2, lineHeight: 1.7 }}>
          {t(
            "review.thanks.body",
            "Your feedback is published anonymously — your name is never shown alongside it."
          )}
        </Typography>
      </Box>
    );
  }

  const practitioner = booking?.therapistName ?? "";
  const service = [booking?.serviceName ?? "", booking?.duration ? `${booking.duration} min` : ""]
    .filter(Boolean)
    .join(" · ");
  const canSubmit = !!rating && text.trim().length > 0 && !submitting;

  return (
    <Box sx={shell}>
      <Typography sx={eyebrow}>{t("review.eyebrow", "SunRed")}</Typography>
      <Typography
        sx={{ fontFamily: fonts.heading, fontSize: 28, color: "var(--sr-body)", mt: 1.5, lineHeight: 1.25 }}
      >
        {practitioner
          ? t("review.title.named", "How was your session with {{name}}?", { name: practitioner })
          : t("review.title", "How was your session?")}
      </Typography>
      {service && (
        <Typography sx={{ fontFamily: fonts.body, fontSize: 13, color: "var(--sr-muted)", mt: 1 }}>
          {service}
        </Typography>
      )}

      <Box sx={{ mt: 4 }}>
        <Rating
          value={rating}
          onChange={(_, v) => setRating(v)}
          size="large"
          sx={{ fontSize: 40, "& .MuiRating-iconFilled": { color: "#F4C542" } }}
        />
      </Box>

      <TextField
        multiline
        minRows={4}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        placeholder={t(
          "review.placeholder",
          "What stood out? Punctuality, technique, how you felt afterwards…"
        )}
        sx={{
          mt: 3,
          "& .MuiOutlinedInput-root": {
            background: "var(--sr-panel)",
            borderRadius: "16px",
            color: "var(--sr-body)",
            fontFamily: fonts.body,
            fontSize: 15,
          },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--sr-hairline)" },
        }}
      />
      <Typography sx={{ fontFamily: fonts.body, fontSize: 11, color: "var(--sr-muted)", mt: 1 }}>
        {t(
          "review.privacy",
          "Published anonymously. We never show your name, phone or email."
        )}
      </Typography>

      {submitError && (
        <Typography sx={{ fontFamily: fonts.body, fontSize: 13, color: "#E4002B", mt: 2 }}>
          {submitError}
        </Typography>
      )}

      <Button
        fullWidth
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
        sx={{
          mt: 3,
          py: 1.6,
          borderRadius: "999px",
          textTransform: "none",
          fontFamily: fonts.body,
          fontSize: 15,
          fontWeight: 700,
          color: "#fff",
          background: "linear-gradient(135deg, #E0879E 0%, #FF9999 100%)",
          "&.Mui-disabled": { opacity: 0.45, color: "#fff" },
        }}
      >
        {submitting
          ? t("review.sending", "Sending…")
          : t("review.submit", "Send review")}
      </Button>
    </Box>
  );
};

export default BookingReviewPage;
