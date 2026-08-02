// src/pages/booking/BookingReviewPage.tsx
//
// 🆕 Round 28x.173 — booking-scoped guest review, no account required.
//
// Founder: "ถ้าอยากทำรีวิวแบบไม่ต้องสมัครหรือเป็นสมาชิกได้ไหม แค่หลังจบงาน
//   เอาลิ้งให้ลูกค้าให้คะแนนรีวิว ได้เลย".
//
// /booking/review/:id?t=<accessToken> — same URL shape as
// /booking/success/:id, same accessToken capability. The link itself gets
// posted into the "จบงานแล้ว" Telegram message in the report channel
// (functions/src/index.ts, advanceJobStatus) for View to relay to the
// guest — there is no direct guest-facing Telegram DM channel to send it
// through automatically (guests browse the site, they don't /start a bot
// the way practitioners do), so a human relay is the honest, buildable
// version of "send it automatically after the job's done" today.

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Box, Typography, Rating, TextField, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import { fonts } from "@/theme";
import { responsiveShellNarrow } from "@/theme/breakpoints";
import { claimBookingReview, submitBookingReview } from "@/lib/bookingReview";

const SANS = fonts.body;
const SERIF = fonts.heading;

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "notDoneYet" }
  | { kind: "alreadyReviewed" }
  | { kind: "ready"; therapistId: string; isOwner: boolean; therapistName: string | null }
  | { kind: "submitted" };

const BookingReviewPage: React.FC = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("t") ?? "";
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!bookingId) {
      setState({ kind: "error", message: t("review.invalidLink", "This review link isn't valid.") });
      return;
    }
    void (async () => {
      try {
        const claim = await claimBookingReview(bookingId, accessToken);
        if (!alive) return;
        if (claim.alreadyReviewed) {
          setState({ kind: "alreadyReviewed" });
          return;
        }
        setState({
          kind: "ready",
          therapistId: claim.therapistId ?? "",
          isOwner: claim.isOwner,
          therapistName: claim.therapistName,
        });
      } catch (e) {
        if (!alive) return;
        const code = (e as { code?: string })?.code ?? "";
        if (code.includes("failed-precondition")) {
          setState({ kind: "notDoneYet" });
        } else {
          setState({
            kind: "error",
            message: t("review.invalidLink", "This review link isn't valid."),
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookingId, accessToken, t]);

  const handleSubmit = async () => {
    if (state.kind !== "ready" || !bookingId || !rating) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitBookingReview({
        bookingId,
        therapistId: state.therapistId,
        rating,
        comment,
        isOwner: state.isOwner,
      });
      setState({ kind: "submitted" });
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : t("review.submitFailed", "Something went wrong. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "var(--sr-bg)" }}>
      <Box sx={{ ...responsiveShellNarrow, padding: "32px 20px 40px" }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--sr-ink)",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          {t("review.title", "Rate your session")}
        </Typography>

        {state.kind === "loading" && (
          <Box sx={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <CircularProgress size={26} sx={{ color: "#FF9999" }} />
          </Box>
        )}

        {state.kind === "error" && (
          <StatusCard text={state.message} />
        )}

        {state.kind === "notDoneYet" && (
          <StatusCard
            text={t(
              "review.notDoneYet",
              "This reservation hasn't been completed yet — the review link opens up right after."
            )}
          />
        )}

        {(state.kind === "alreadyReviewed" || state.kind === "submitted") && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              padding: "32px 20px",
              textAlign: "center",
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 40, color: "#57B88B" }} />
            <Typography sx={{ fontFamily: SANS, fontSize: "14px", color: "var(--sr-body)" }}>
              {state.kind === "submitted"
                ? t("review.thanksSubmitted", "Thank you — your review has been sent for approval.")
                : t("review.thanksAlready", "You've already reviewed this session. Thank you!")}
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => navigate("/")}
              sx={{
                marginTop: "8px",
                padding: "10px 22px",
                border: "1px solid var(--sr-hairline)",
                borderRadius: 999,
                background: "var(--sr-panel)",
                color: "var(--sr-ink)",
                fontFamily: SANS,
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("review.backHome", "Back to home")}
            </Box>
          </Box>
        )}

        {state.kind === "ready" && (
          <Box
            sx={{
              background: "var(--sr-panel)",
              border: "1px solid var(--sr-hairline)",
              borderRadius: "18px",
              padding: "22px 20px",
            }}
          >
            {state.therapistName && (
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "13px",
                  color: "var(--sr-muted)",
                  textAlign: "center",
                  marginBottom: "18px",
                }}
              >
                {t("review.withTherapist", "With {{name}}", { name: state.therapistName })}
              </Typography>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
              <Rating
                value={rating}
                onChange={(_, v) => setRating(v)}
                icon={<StarRoundedIcon sx={{ fontSize: 36, color: "#FF9999" }} />}
                emptyIcon={<StarRoundedIcon sx={{ fontSize: 36, color: "var(--sr-hairline)" }} />}
              />
            </Box>

            <TextField
              placeholder={t("review.commentPlaceholder", "Tell us about your session (optional)") as string}
              multiline
              minRows={3}
              fullWidth
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "var(--sr-panel-2)",
                  borderRadius: "12px",
                  fontFamily: SANS,
                  fontSize: "13.5px",
                  color: "var(--sr-ink)",
                },
              }}
            />

            {submitError && (
              <Typography
                sx={{ fontFamily: SANS, fontSize: "12px", color: "#f97316", marginTop: "10px" }}
              >
                {submitError}
              </Typography>
            )}

            <Box
              component="button"
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !rating}
              sx={{
                width: "100%",
                marginTop: "18px",
                padding: "13px",
                borderRadius: "999px",
                border: "none",
                background: submitting || !rating
                  ? "var(--sr-panel-2)"
                  : "linear-gradient(135deg, #FFB5C8 0%, #FF9999 55%, #E8607E 100%)",
                color: submitting || !rating ? "var(--sr-muted)" : "#fff",
                fontFamily: SANS,
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                cursor: submitting || !rating ? "not-allowed" : "pointer",
                boxShadow: submitting || !rating ? "none" : "0 10px 24px rgba(255, 99, 99, 0.35)",
              }}
            >
              {submitting
                ? t("review.submitting", "Sending…")
                : t("review.submit", "Submit review")}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const StatusCard: React.FC<{ text: string }> = ({ text }) => (
  <Box
    sx={{
      background: "var(--sr-panel)",
      border: "1px solid var(--sr-hairline)",
      borderRadius: "18px",
      padding: "28px 20px",
      textAlign: "center",
    }}
  >
    <Typography sx={{ fontFamily: SANS, fontSize: "13.5px", color: "var(--sr-body)" }}>
      {text}
    </Typography>
  </Box>
);

export default BookingReviewPage;
