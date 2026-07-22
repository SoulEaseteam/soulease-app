// src/pages/LoginPage.tsx
//
// 🆕 Round 28w.1 (2026-07-13) — audit fixes:
//   • Retheme: retired taupe #8F8474 + brown #4B4B48 + Chonburi font +
//     navy shadows → rose #D97C95 on day/night var(--sr-*) tokens
//     (matches the rest of the app). White-on-taupe subtitle → var token
//     so it stays legible in day mode.
//   • Removed production emoji from snackbar copy (founder no-emoji rule).
//   • Real <form>: Enter now submits; button is type="submit".
//   • a11y / password-manager: labelled fields + type="email" +
//     autoComplete="email" / "current-password".
//   • Avatar (LCP image) → loading="eager".
import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { DeviceMobile, Export, DotsThreeVertical, Download } from "phosphor-react";
import PasswordField from "@/components/common/PasswordField";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import BottomNav from '../components/layouts/BottomNavGlass';
import { getErrorMessage } from "@/utils/getErrorMessage";
import { resolveLoginId } from "@/utils/loginId";
import { useTranslation } from "react-i18next";
// 🆕 28w.77 — "ลืมรหัสผ่าน?" hands the guest to the concierge (no self-serve reset).
import { whatsappDeepLink } from "@/config/concierge";

const SERIF = '"Fraunces", "Playfair Display", Georgia, serif';
const ROSE = "#D97C95";
const ROSE_HOVER = "#C96F89";

// 🆕 28w.76 (founder "ไม่เห็นข้อมูลในกล่อง · แก้ทั้ง 2 หน้า") — the outline and
//   label were themed but the INPUT TEXT never was, so MUI fell back to its
//   light-theme ink (#232B36) and painted near-black on the dark panel:
//   1.11:1 contrast — what you type is invisible. Pin text/placeholder/caret to
//   theme tokens and neutralise the browser's autofill repaint. Extracted to
//   one const (was duplicated inline on both fields) and mirrored in
//   RegisterPage so the two auth screens can't drift apart again.
const fieldSx = {
  mb: 2,
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    "& fieldset": { borderColor: "rgba(217, 124, 149, 0.55)" },
    "&:hover fieldset": { borderColor: ROSE },
    "&.Mui-focused fieldset": { borderColor: ROSE },
  },
  "& .MuiOutlinedInput-input": {
    color: "var(--sr-ink)",
    caretColor: "var(--sr-ink)",
    "&::placeholder": { color: "var(--sr-muted)", opacity: 1 },
    "&:-webkit-autofill": {
      WebkitTextFillColor: "var(--sr-ink)",
      WebkitBoxShadow: "0 0 0 1000px var(--sr-panel-2) inset",
      caretColor: "var(--sr-ink)",
      transition: "background-color 9999s ease-in-out 0s",
    },
  },
  "& label": { color: "var(--sr-muted)" },
  "& label.Mui-focused": { color: ROSE },
} as const;

type LoginRole = "admin" | "therapist" | "user";

// 🆕 Round 28x.119 — `beforeinstallprompt` is Chromium-only and not part of
// TypeScript's DOM lib, so it needs a local type. Shape per the (nonstandard)
// spec Chrome/Edge/Samsung Internet implement.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// 🆕 Round 28x.76 (founder: "ตั้งทางเข้าใหม่ ให้พนักงาน แยกออกจากทางเข้าเดียว
//   กับลูกค้าได้ไหม") — /staff renders this same page with staff framing.
//
//   Reusing the component rather than writing a second login is deliberate: the
//   subtle parts here — resolveLoginId's phone/username/email aliasing, and
//   friendlyAuthError collapsing invalid-credential/wrong-password/user-not-found
//   into one message so the form can't be used to test whether an account exists
//   — would drift the moment there were two copies.
//
//   To be clear about what this is NOT: it adds no security. Firebase Auth
//   accepts credentials at the API level, so anyone holding them can sign in
//   from anywhere regardless of which page exists. What it buys is that a
//   practitioner never lands on the customer storefront to reach her work.
interface LoginPageProps {
  /** Staff entrance: staff copy, and lands on the work surface, not /profile. */
  staff?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ staff = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // redirect กลับหน้าเดิมถ้า PrivateRoute ส่งมา; default ไปหน้าโปรไฟล์
  const fromPath =
    (location.state as { from?: string } | null)?.from ?? null;

  // 🆕 Round 28w.82 (founder: "ทุกอย่างเป็นภาษาอังกฤษ เพราะระบบเว็บเราทำแบบแปล
  //   ภาษาตามเครื่อง") — this page had ZERO i18n: every string was hardcoded
  //   English, so a Japanese or Chinese guest saw untranslated copy on the one
  //   screen where confusion costs an account. Routed through t() with the
  //   English source as the fallback, and the Thai strings I'd hardcoded in
  //   28w.77/.81 are gone — Thai now comes from the locale file like every
  //   other language.
  const { t } = useTranslation();

  // 🆕 Round 28w.81 — was `email`. Now holds whatever the guest types: a phone
  //   number, a username, or an email. resolveLoginId() maps it to the address
  //   Firebase Auth actually signs in with.
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // 🆕 Round 28x.119 (founder: "ทำหน้าทางเข้าให้พนักงานโหลดลงเครื่องได้") —
  // let a practitioner add /staff to her home screen like a real app icon.
  // No service worker / full PWA here — just a manifest + the platform's
  // native install affordances:
  //   • Android/Chrome fires `beforeinstallprompt`, which we capture and
  //     trigger from a real button (one tap, no browser menu-hunting).
  //   • iOS Safari has NO install API at all — Apple never shipped one —
  //     so that path is always manual instructions (Share → Add to Home
  //     Screen), OS-detected via user agent.
  // Skipped entirely if already running installed (display-mode: standalone
  // / iOS's `navigator.standalone`), or if this isn't the staff door.
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  useEffect(() => {
    if (!staff) return;
    const nav = navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) {
      setAlreadyInstalled(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setAlreadyInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Manifest + iOS home-screen meta tags — only linked on the staff door,
    // so a customer browsing the storefront never sees a "SunRed Staff"
    // install offer. Removed on unmount so it can't leak onto whatever page
    // she lands on right after logging in.
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = "/staff-manifest.webmanifest";
    document.head.appendChild(manifestLink);
    const appleTitle = document.createElement("meta");
    appleTitle.name = "apple-mobile-web-app-title";
    appleTitle.content = "SunRed Staff";
    document.head.appendChild(appleTitle);
    const appleCapable = document.createElement("meta");
    appleCapable.name = "apple-mobile-web-app-capable";
    appleCapable.content = "yes";
    document.head.appendChild(appleCapable);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      manifestLink.remove();
      appleTitle.remove();
      appleCapable.remove();
    };
  }, [staff]);

  const handleInstallTap = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  const isAndroid = /Android/.test(ua);

  // 🆕 Round 28w.81 — a failed sign-in used to surface the raw SDK string
  //   ("Login failed: Firebase: Error (auth/invalid-credential)."), which tells
  //   a guest nothing and looks broken. Modern Firebase deliberately collapses
  //   wrong-password and no-such-account into ONE code (email-enumeration
  //   protection), so we must not claim to know which it was — one honest
  //   message covers both, and quietly preserves that privacy property.
  const friendlyAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return t("auth.error.badCredentials", "Wrong login or password. Forgotten it? Tap “Forgot password?” below.");
      case "auth/too-many-requests":
        return t("auth.error.tooMany", "Too many attempts. Wait a moment, or message the concierge.");
      case "auth/network-request-failed":
        return t("auth.error.network", "No connection. Check your network and try again.");
      case "auth/user-disabled":
        return t("auth.error.disabled", "This account is disabled. Please contact the concierge.");
      default:
        return `${t("auth.error.generic", "Login failed")}: ${getErrorMessage(err)}`;
    }
  };

  // =============================================================
  // 🔥 ROLE CHECK: SunRed Role Logic (Admin > Therapist > User)
  //   normalize "customer" → "user" ให้ตรงกับ PrivateRoute / AuthProvider
  // =============================================================
  const getUserRole = async (uid: string, email: string): Promise<LoginRole> => {
    const lower = email.toLowerCase();

    // ทำขนานเพื่อลด round-trip
    const [adminDoc, tSnap, uDoc] = await Promise.all([
      getDoc(doc(db, "admins", uid)),
      getDocs(query(collection(db, "therapists"), where("email", "==", lower))),
      getDoc(doc(db, "users", uid)),
    ]);

    if (adminDoc.exists()) return "admin";
    if (!tSnap.empty) return "therapist";

    if (uDoc.exists()) {
      const r = uDoc.data().role as string | undefined;
      if (r === "admin" || r === "therapist") return r;
      // legacy: เคยเก็บ "customer" → normalize เป็น "user"
    }
    return "user";
  };

  // =============================================================
  // 🔥 HANDLE LOGIN
  // =============================================================
  const handleLogin = async () => {
    if (!loginId || !password) {
      return setSnackbar({
        open: true,
        message: t("auth.error.missingFields", "Please enter your phone, username, or email, and your password"),
        severity: "error",
      });
    }

    // 🆕 Round 28w.81 — resolve phone / username / email to the Auth address.
    const resolved = resolveLoginId(loginId);
    if (!resolved) {
      return setSnackbar({
        open: true,
        message: t("auth.error.invalidId", "That doesn't look like a phone number, username, or email"),
        severity: "error",
      });
    }

    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, resolved.authEmail, password);
      const uid = userCred.user.uid;
      const userEmail = userCred.user.email ?? "";

      const role = await getUserRole(uid, userEmail);

      setSnackbar({
        open: true,
        message: t("auth.login.success", "Login successful"),
        severity: "success",
      });

      setTimeout(() => {
        // 🆕 Round 28x.92 (founder screenshot: Yuri signed in through /staff
        //   and landed on the CUSTOMER profile) — fromPath used to be checked
        //   FIRST, ahead of role. Any leftover `location.state.from` (e.g. she'd
        //   earlier been bounced off a guest-only page before switching to her
        //   staff login on the same tab) silently overrode the role-based
        //   redirect below it, even for a therapist. Role now always wins;
        //   fromPath is only a fallback for the plain "user" case it was meant
        //   for.
        if (role === "admin") return navigate("/admin/dashboard", { replace: true });
        // 🆕 28x.77 (founder: "อยากให้พนักงานล็อกอินเข้าหน้า therapist/profile
        //   เลย ไม่ต้องกด Practitioner อีก") — straight into the practitioner
        //   panel. 28x.76 sent her to /therapist/jobs, which still left the
        //   customer-shaped /profile as the thing the PROFILE tab returned to.
        // 🆕 28x.87 — StaffLayout grew a Home tab (Working Status + quick
        //   menu); that's the landing dashboard now, same role /therapist/profile
        //   played before Working Status moved off of it.
        if (role === "therapist") return navigate("/therapist/home", { replace: true });
        // Signed in through the staff door but not staff — say so rather than
        // dropping her on a guest profile with no explanation.
        if (staff) {
          setSnackbar({
            open: true,
            message: t(
              "auth.login.notStaff",
              "บัญชีนี้ยังไม่ได้เป็นพนักงาน · ติดต่อแอดมิน",
            ),
            severity: "error",
          });
          return;
        }
        // ถ้าถูก redirect มาจาก PrivateRoute ให้กลับหน้าเดิม
        if (fromPath) return navigate(fromPath, { replace: true });
        return navigate("/profile", { replace: true });
      }, 300);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: friendlyAuthError(err),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =============================================================
  // UI
  // =============================================================
  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          background: "var(--sr-bg)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 320,
            textAlign: "center",
            p: 4,
            borderRadius: 6,
            background: "var(--sr-panel)",
            color: "var(--sr-ink)",
            border: "1px solid var(--sr-hairline)",
            boxShadow: "var(--sr-card-shadow)",
          }}
        >
          {/* Avatar */}
          <Box sx={{ textAlign: "center", mt: -12 }}>
            <Box
              component="img"
              src="/images/icon/User.webp"
              alt="User Icon"
              width={120}
              height={120}
              loading="eager"
              decoding="async"
              sx={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                boxShadow: "0 6px 18px rgba(138, 58, 87, 0.20)",
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            fontWeight="bold"
            mt={3}
            mb={4}
            sx={{
              fontFamily: SERIF,
              fontSize: "2rem",
              color: "var(--sr-ink)",
            }}
          >
            {staff ? "SunRed Staff" : t("auth.login.title", "Login")}
          </Typography>
          {/* 🆕 28x.76 — one line so a practitioner knows she's in the right
              place. Deliberately says nothing about who works here. */}
          {staff && (
            <Typography
              mt={-3}
              mb={3}
              fontSize={13}
              sx={{ color: "var(--sr-muted)", fontFamily: '"Inter", system-ui, sans-serif' }}
            >
              เข้าสู่ระบบสำหรับพนักงาน
            </Typography>
          )}

          {/* Form — Enter submits */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) void handleLogin();
            }}
          >
            {/* 🆕 Round 28w.81 — one field, three accepted forms. type="text"
                (not "email") or the browser's own validation rejects a phone
                number before our resolver ever sees it. */}
            <TextField
              label={t("auth.field.loginId", "Phone, username, or email")}
              type="text"
              autoComplete="username"
              fullWidth
              size="small"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              sx={fieldSx}
            />

            <PasswordField
              label={t("auth.field.password", "Password")}
              autoComplete="current-password"
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={fieldSx}
            />

            {/* LOGIN BUTTON */}
            <Button
              type="submit"
              fullWidth
              sx={{
                mt: 1,
                py: 1.2,
                fontWeight: "bold",
                borderRadius: "20px",
                background: ROSE,
                color: "#fff",
                "&:hover": { background: ROSE_HOVER },
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : (
                t("auth.login.cta", "LOGIN")
              )}
            </Button>
          </Box>

          {/* Register — 🆕 28x.76: staff accounts are issued by an admin, never
              self-registered, so the staff door offers no sign-up. */}
          {!staff && (
          <Typography mt={3} fontSize={14} sx={{ color: "var(--sr-body)" }}>
            {t("auth.login.noAccount", "Don't have an account?")}{" "}
            <Link to="/register" style={{ color: ROSE, fontWeight: "bold" }}>
              {t("auth.login.signUp", "Sign up")}
            </Link>
          </Typography>
          )}

          {/* 🆕 28w.77 (founder "ใส่ ลืมรหัสผ่าน? แล้วให้ลิ้งไปที่แอดมิน") — no
              self-serve reset flow exists, so this hands the guest straight to
              the concierge with a pre-filled request instead of a dead end. */}
          <Typography mt={1} fontSize={14} sx={{ color: "var(--sr-body)" }}>
            <Box
              component="a"
              href={whatsappDeepLink(
                "Hi SunRed concierge, I've forgotten my account password. Could you help me reset it?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: ROSE,
                fontWeight: "bold",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                "&:hover": { color: ROSE_HOVER },
              }}
            >
              {staff ? "ลืมรหัสผ่าน? ติดต่อแอดมิน" : t("auth.login.forgot", "Forgot password?")}
            </Box>
          </Typography>
        </Paper>
        {/* 🆕 28x.76 — "you can book without an account" is guidance for a
            customer standing at a checkout. On the staff door it's noise. */}
        {!staff && (
          <Typography mt={4} fontSize={14} sx={{ color: "var(--sr-muted)" }} textAlign="center">
            {t("auth.guestNote", "You may proceed with booking without an account.")}
          </Typography>
        )}

        {/* 🆕 Round 28x.119 (founder: "ทำหน้าทางเข้าให้พนักงานโหลดลงเครื่องได้") —
            add-to-home-screen card. Hidden once already installed. */}
        {staff && !alreadyInstalled && (
          <Box
            sx={{
              mt: 3,
              p: "16px",
              borderRadius: 3,
              background: "var(--sr-panel)",
              border: "1px solid var(--sr-hairline)",
              boxShadow: "var(--sr-card-shadow)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #E0708F, #C2185B)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DeviceMobile size={16} weight="duotone" color="#fff" />
              </Box>
              <Typography sx={{ fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 700, fontSize: 14, color: "var(--sr-ink)" }}>
                ติดตั้งแอปลงเครื่อง · Add to Home Screen
              </Typography>
            </Box>

            {installEvent ? (
              <Button
                fullWidth
                onClick={() => void handleInstallTap()}
                startIcon={<Download size={16} weight="bold" />}
                sx={{
                  mt: 0.5, py: 1.1, borderRadius: 999, textTransform: "none", fontWeight: 700,
                  background: "linear-gradient(135deg, #E0708F, #B23A63)", color: "#fff",
                  boxShadow: "0 6px 16px rgba(194,24,91,0.30)",
                  "&:hover": { boxShadow: "0 6px 16px rgba(194,24,91,0.30)" },
                }}
              >
                ติดตั้งเลย
              </Button>
            ) : isIOS ? (
              <Typography sx={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12.5, color: "var(--sr-body)", lineHeight: 1.6 }}>
                แตะไอคอนแชร์ <Export size={13} weight="bold" style={{ verticalAlign: "-2px" }} /> ที่แถบด้านล่างของ Safari
                แล้วเลือก <b>&ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo;</b> (Add to Home Screen)
              </Typography>
            ) : isAndroid ? (
              <Typography sx={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12.5, color: "var(--sr-body)", lineHeight: 1.6 }}>
                แตะเมนู <DotsThreeVertical size={15} weight="bold" style={{ verticalAlign: "-3px" }} /> มุมขวาบนของเบราว์เซอร์
                แล้วเลือก <b>&ldquo;ติดตั้งแอป&rdquo;</b> หรือ <b>&ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo;</b>
              </Typography>
            ) : (
              <Typography sx={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12.5, color: "var(--sr-body)", lineHeight: 1.6 }}>
                เปิดหน้านี้บนมือถือ แล้วเพิ่มไปยังหน้าจอโฮมจากเมนูเบราว์เซอร์ เพื่อเข้าแอปได้เร็วเหมือนแอปจริง
              </Typography>
            )}
          </Box>
        )}
      </Box>
      {/* 🆕 28x.76 — the customer tab bar (Practitioners · Services · History)
          under a staff sign-in is the storefront leaking back in. */}
      {!staff && <BottomNav />}
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default LoginPage;
