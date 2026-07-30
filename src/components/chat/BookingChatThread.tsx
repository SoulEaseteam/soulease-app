// src/components/chat/BookingChatThread.tsx
//
// 🆕 Round 28x.140 — the one thread UI, rendered on both sides of the
// conversation.
//
// Founder: "ต้องจองแล้วเท่านั้นถึงจะแชทกับพนักงานเพื่อคอนเฟิร์มออเดอได้".
//
// Guest mode runs on the isolated guest Firebase app (see src/lib/bookingChat.ts
// for why that exists); staff mode runs on the primary session, where the
// practitioner's own uid already satisfies the rules. Everything below the
// transport — the list, the bubbles, the composer, the empty state — is shared
// so the two sides can never drift into looking like different products.
//
// ⚠️ The write payload here is the SAME list firestore.rules pins with
//    `keys().hasOnly([...])`. Adding a field to a message without adding it
//    there makes every send permission-deny. See the 28x.116 note in CLAUDE.md
//    for what that failure looks like in production (silent, and only visible
//    to real customers).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { PaperPlaneRight } from "phosphor-react";

import { db as primaryDb } from "@/lib/firebase";
import { claimBookingChat } from "@/lib/bookingChat";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';
const ROSE_DEEP = "#C2185B";
const ROSE_SOFT = "#FCE7F0";
const INK = "#2a1a14";
const MUTED = "#8A7A72";

/** Cap mirrors the rules' `text.size() <= 1000`. */
const MAX_LEN = 1000;
/** A confirmation thread is short-lived; 200 covers any real exchange. */
const MAX_MESSAGES = 200;

export type ChatSender = "guest" | "therapist" | "admin";

interface Message {
  id: string;
  text: string;
  sender: ChatSender;
  senderName?: string;
  createdAtMs: number | null;
}

interface Props {
  bookingId: string;
  /** guest → isolated session via capability token · staff → primary session. */
  mode: "guest" | "staff";
  /** Guest only: the `?t=` capability token from the success-page URL. */
  accessToken?: string;
  /** Staff only: which side of the room this composer speaks as. */
  sender?: Exclude<ChatSender, "guest">;
  /** Staff only: byline shown to the guest. */
  senderName?: string;
  /** Staff only: name used in the guest-side empty state before claim resolves. */
  therapistNameHint?: string;
  height?: number;
}

/** localStorage key for the staff-side unread dot (see useBookingChatUnread). */
export const chatSeenKey = (bookingId: string) => `sunred.chat.seen.${bookingId}`;

function toMillis(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return null;
}

const BookingChatThread: React.FC<Props> = ({
  bookingId,
  mode,
  accessToken = "",
  sender = "therapist",
  senderName,
  therapistNameHint,
  height = 320,
}) => {
  const { t } = useTranslation();
  const [chatDb, setChatDb] = useState<Firestore | null>(
    mode === "staff" ? primaryDb : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  // 🆕 Stores WHICH error, not its translated text. Keeping the translated
  //   string in state would put `t` in the dependency list of the Firestore
  //   listener effect below — and `t` is only stable by convention. Anything
  //   that makes it change identity per render (a language switch, an i18n
  //   `bindI18n` event, a test harness with a plain function) tears the
  //   listener down and reopens it on every snapshot, which is an infinite
  //   re-subscribe loop on a live chat. Caught while rendering this component
  //   in a preview harness, where `t` genuinely is a fresh function each render.
  const [errorKey, setErrorKey] = useState<"listen" | "send" | null>(null);
  const [therapistName, setTherapistName] = useState<string | null>(
    therapistNameHint ?? null
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ── 1. Guest: exchange the checkout token for a chat session ──────────
  useEffect(() => {
    if (mode === "staff") {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setErrorKey(null);
    void (async () => {
      try {
        const claim = await claimBookingChat(bookingId, accessToken);
        if (!alive) return;
        setChatDb(claim.db);
        setTherapistName(claim.therapistName);
      } catch (e) {
        if (!alive) return;
        // Any claim failure HIDES the panel rather than showing a fault box.
        // The two real causes are both non-events for the guest: View has
        // closed chat from admin settings (`failed-precondition`), or the
        // link predates the capability token / isn't hers
        // (`permission-denied`). In every one of those cases the concierge
        // channels sit directly below this panel, so an error card would add
        // alarm without adding an option.
        console.warn("[bookingChat] claim failed", e);
        setClosed(true);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookingId, accessToken, mode]);

  // ── 2. Listen ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatDb) return;
    const q = query(
      collection(chatDb, "bookings", bookingId, "messages"),
      orderBy("createdAt", "asc"),
      limit(MAX_MESSAGES)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Message[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData;
          return {
            id: d.id,
            text: String(data.text ?? ""),
            sender: (data.sender as ChatSender) ?? "guest",
            senderName: data.senderName as string | undefined,
            // Null while the serverTimestamp resolves — that's the local echo
            // of a message the sender just wrote, and it renders as "sending".
            createdAtMs: toMillis(data.createdAt),
          };
        });
        setMessages(rows);
        setLoading(false);
      },
      (err) => {
        console.warn("[bookingChat] listen failed", err);
        setErrorKey("listen");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [chatDb, bookingId]);

  // ── 3. Keep the newest message in view ────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ── 4. Mark seen (drives the staff job-list unread dot) ───────────────
  useEffect(() => {
    if (mode !== "staff" || messages.length === 0) return;
    try {
      window.localStorage.setItem(chatSeenKey(bookingId), String(Date.now()));
    } catch {
      /* private mode — the dot just stays on, which is the safe direction */
    }
  }, [mode, bookingId, messages.length]);

  const myRole: ChatSender = mode === "guest" ? "guest" : sender;

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !chatDb || sending) return;
    setSending(true);
    setErrorKey(null);
    try {
      // EXACTLY the keys firestore.rules allows — guest writes 3, staff 4.
      await addDoc(collection(chatDb, "bookings", bookingId, "messages"), {
        text: text.slice(0, MAX_LEN),
        sender: myRole,
        ...(mode === "staff" && senderName ? { senderName } : {}),
        createdAt: serverTimestamp(),
      });
      setDraft("");
    } catch (e) {
      console.warn("[bookingChat] send failed", e);
      setErrorKey("send");
    } finally {
      setSending(false);
    }
  }, [draft, chatDb, sending, bookingId, myRole, mode, senderName]);

  const headerLabel = useMemo(() => {
    if (mode === "staff") return "แชทกับลูกค้า";
    return therapistName
      ? t("bookingChat.withPractitioner", "Chat with {{name}}", { name: therapistName })
      : t("bookingChat.withConcierge", "Chat with your concierge");
  }, [mode, therapistName, t]);

  if (closed) return null;

  return (
    <Box
      sx={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      {/* header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#22C55E",
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: INK }}
        >
          {headerLabel}
        </Typography>
      </Box>

      {/* messages */}
      <Box
        ref={scrollRef}
        sx={{
          height,
          overflowY: "auto",
          px: 2,
          py: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          bgcolor: "#FBF8F7",
        }}
      >
        {loading ? (
          <Box sx={{ m: "auto" }}>
            <CircularProgress size={20} sx={{ color: ROSE_DEEP }} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography
            sx={{
              m: "auto",
              maxWidth: 280,
              textAlign: "center",
              fontFamily: SANS,
              fontSize: 13,
              lineHeight: 1.6,
              color: MUTED,
            }}
          >
            {mode === "staff"
              ? "ยังไม่มีข้อความ — ทักลูกค้าเพื่อยืนยันออเดอร์ได้เลย"
              : t(
                  "bookingChat.empty",
                  "Your reservation is confirmed with the concierge. Send a message here if you'd like to adjust the time, the address, or anything else before arrival."
                )}
          </Typography>
        ) : (
          messages.map((m) => {
            const mine = m.sender === myRole;
            return (
              <Box
                key={m.id}
                sx={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  px: 1.5,
                  py: 1,
                  borderRadius: 2.5,
                  bgcolor: mine ? ROSE_DEEP : ROSE_SOFT,
                  color: mine ? "#fff" : INK,
                }}
              >
                {!mine && m.senderName && (
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 10.5,
                      fontWeight: 700,
                      opacity: 0.7,
                      mb: 0.25,
                    }}
                  >
                    {m.senderName}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10,
                    mt: 0.4,
                    opacity: 0.65,
                    textAlign: "right",
                  }}
                >
                  {m.createdAtMs
                    ? new Date(m.createdAtMs).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : t("bookingChat.sending", "sending…")}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>

      {errorKey && (
        <Typography
          sx={{
            px: 2,
            py: 0.75,
            fontFamily: SANS,
            fontSize: 12,
            color: "#DC2626",
            bgcolor: "#FEF2F2",
          }}
        >
          {errorKey === "send"
            ? t("bookingChat.err.send", "Message not sent. Please try again.")
            : t("bookingChat.err.listen", "Couldn't load the conversation. Please refresh.")}
        </Typography>
      )}

      {/* composer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          p: 1.25,
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line — the convention every
            // messaging app the guest already uses follows.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={
            mode === "staff"
              ? "พิมพ์ข้อความถึงลูกค้า…"
              : t("bookingChat.placeholder", "Write a message…")
          }
          multiline
          maxRows={4}
          fullWidth
          size="small"
          disabled={!chatDb}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2.5,
              fontFamily: SANS,
              fontSize: 13.5,
            },
          }}
        />
        <IconButton
          onClick={() => void send()}
          disabled={!draft.trim() || sending || !chatDb}
          aria-label={t("bookingChat.send", "Send")}
          sx={{
            bgcolor: ROSE_DEEP,
            color: "#fff",
            width: 38,
            height: 38,
            "&:hover": { bgcolor: "#A3134A" },
            "&.Mui-disabled": { bgcolor: "rgba(0,0,0,0.12)", color: "#fff" },
          }}
        >
          {sending ? (
            <CircularProgress size={16} sx={{ color: "#fff" }} />
          ) : (
            <PaperPlaneRight size={18} weight="fill" />
          )}
        </IconButton>
      </Box>
    </Box>
  );
};

export default BookingChatThread;
