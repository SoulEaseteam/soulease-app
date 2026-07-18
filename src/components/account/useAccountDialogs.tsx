// src/components/account/useAccountDialogs.tsx
//
// 🆕 Round 28x.78 — the language picker and change-password dialogs, shared.
//
//   They were written inline on the customer ProfilePage in 28x.57. The
//   practitioner Settings page needs exactly the same two, and a second copy of
//   a password flow is how the two drift until one of them stops re-authing
//   properly. One implementation, two callers.

import React, { useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { Check } from "phosphor-react";
import PasswordField from "@/components/common/PasswordField";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import { SUPPORTED_LANGS, setLangPref, langLabel, type LangCode } from "@/utils/langPref";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";
const ROSE_DEEP = "#C96F89";

export interface AccountDialogs {
  activeLangLabel: string;
  openLanguage: () => void;
  openPassword: () => void;
  dialogs: React.ReactNode;
}

export function useAccountDialogs(): AccountDialogs {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const activeLang = (i18n.language || "en").split("-")[0];

  const pickLang = (code: LangCode) => {
    setLangPref(code);
    void i18n.changeLanguage(code);
    setLangOpen(false);
  };

  const [pwOpen, setPwOpen] = useState(false);
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  const closePw = () => {
    if (pwBusy) return;
    setPwOpen(false);
    setPwCur(""); setPwNew(""); setPwNew2("");
    setPwErr(null); setPwDone(false);
  };

  const submitPw = async () => {
    setPwErr(null);
    if (pwNew.length < 6) { setPwErr("\u0e23\u0e2b\u0e31\u0e2a\u0e43\u0e2b\u0e21\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e22\u0e32\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 6 \u0e15\u0e31\u0e27"); return; }
    if (pwNew !== pwNew2) { setPwErr("\u0e23\u0e2b\u0e31\u0e2a\u0e43\u0e2b\u0e21\u0e48\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e2d\u0e07\u0e0a\u0e48\u0e2d\u0e07\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19"); return; }
    const current = auth.currentUser;
    if (!current?.email) { setPwErr("\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e43\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u2014 \u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d\u0e04\u0e2d\u0e19\u0e40\u0e0b\u0e35\u0e22\u0e23\u0e4c\u0e08"); return; }

    setPwBusy(true);
    try {
      await reauthenticateWithCredential(
        current,
        EmailAuthProvider.credential(current.email, pwCur)
      );
      await updatePassword(current, pwNew);
      setPwDone(true);
      setPwCur(""); setPwNew(""); setPwNew2("");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setPwErr(
        code.includes("wrong-password") || code.includes("invalid-credential")
          ? "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07"
          : code.includes("weak-password")
          ? "\u0e23\u0e2b\u0e31\u0e2a\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e48\u0e2d\u0e19\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b \u2014 \u0e43\u0e0a\u0e49\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 6 \u0e15\u0e31\u0e27"
          : code.includes("too-many-requests")
          ? "\u0e25\u0e2d\u0e07\u0e1c\u0e34\u0e14\u0e2b\u0e25\u0e32\u0e22\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b \u2014 \u0e23\u0e2d\u0e2a\u0e31\u0e01\u0e04\u0e23\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48"
          : "\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u2014 \u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07"
      );
    } finally {
      setPwBusy(false);
    }
  };

  const dialogs = (
    <>
      {/* ── 🆕 28x.57 · Language picker ─────────────────────────────── */}
      <Dialog
        open={langOpen}
        onClose={() => setLangOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            backgroundImage: "none",   // MUI dark-mode overlay would grey the panel
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 20, color: "var(--sr-ink)", pb: 1 }}>
          Language
        </DialogTitle>
        <DialogContent sx={{ px: 1.5, pb: 2 }}>
          {SUPPORTED_LANGS.map((l) => {
            const on = l.code === activeLang;
            return (
              <Box
                key={l.code}
                role="button"
                tabIndex={0}
                onClick={() => pickLang(l.code)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickLang(l.code); }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: on ? "rgba(217,124,149,0.14)" : "transparent",
                  transition: "background 160ms ease",
                  "&:hover": { background: "rgba(217,124,149,0.10)" },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 15,
                    fontWeight: on ? 700 : 500,
                    color: on ? ROSE_DEEP : "var(--sr-body)",
                  }}
                >
                  {l.label}
                </Typography>
                {on && <Check size={18} weight="bold" color={ROSE_DEEP} />}
              </Box>
            );
          })}
        </DialogContent>
      </Dialog>

      {/* ── 🆕 28x.57 · Change password ─────────────────────────────── */}
      <Dialog
        open={pwOpen}
        onClose={closePw}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: SERIF, fontSize: 20, color: "var(--sr-ink)", pb: 1 }}>
          Change password
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {pwDone ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ครั้งหน้าเข้าระบบด้วยรหัสใหม่
            </Alert>
          ) : (
            <>
              {pwErr && <Alert severity="error" sx={{ borderRadius: 2 }}>{pwErr}</Alert>}
              {/* explicit input color — dark theme inherits white-on-white otherwise */}
              {([
                { label: "รหัสผ่านปัจจุบัน", v: pwCur,  set: setPwCur,  ac: "current-password" },
                { label: "รหัสผ่านใหม่",     v: pwNew,  set: setPwNew,  ac: "new-password" },
                { label: "ยืนยันรหัสใหม่",   v: pwNew2, set: setPwNew2, ac: "new-password" },
              ] as const).map((f) => (
                <PasswordField
                  key={f.label}
                  label={f.label}
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  autoComplete={f.ac}
                  size="small"
                  fullWidth
                  disabled={pwBusy}
                  InputProps={{ sx: { color: "var(--sr-ink)", borderRadius: 2 } }}
                  InputLabelProps={{ sx: { color: "var(--sr-muted)" } }}
                />
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closePw} disabled={pwBusy} sx={{ color: "var(--sr-muted)", fontFamily: SANS }}>
            {pwDone ? "ปิด" : "ยกเลิก"}
          </Button>
          {!pwDone && (
            <Button
              onClick={() => void submitPw()}
              disabled={pwBusy || !pwCur || !pwNew || !pwNew2}
              variant="contained"
              sx={{
                fontFamily: SANS,
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                background: `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`,
                boxShadow: "none",
                "&:hover": { background: `linear-gradient(135deg, ${ROSE_DEEP}, ${ROSE_DEEP})`, boxShadow: "none" },
              }}
            >
              {pwBusy ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "บันทึก"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );

  return {
    activeLangLabel: langLabel(activeLang),
    openLanguage: () => setLangOpen(true),
    openPassword: () => setPwOpen(true),
    dialogs,
  };
}
