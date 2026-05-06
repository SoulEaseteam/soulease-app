
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import LocalAtmRoundedIcon from "@mui/icons-material/LocalAtmRounded";
// 🆕 Round 28b7 — `fonts` import was unused (default-import shape was
//   also wrong: the theme module exports `fonts` as a named export,
//   not default). Removed to silence the warning.

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const STORAGE_KEY = "sunred.paymentMethod";

// ─── Payment & Policy FAQ — moved from ServicesPage (Round 28c1) ──────
//   Canonical home for all payment-related questions. ServicesPage no
//   longer duplicates this content; it links here instead.
type FaqItem = { q: string; a: React.ReactNode };

const FAQ_POLICY: FaqItem[] = [
  {
    q: "What is the cost of a session?",
    a: "Each practitioner sets their own rates — the exact starting price is shown on their profile. The total reflects the service fee plus a transparent travel fee, aligned with GrabCar pricing (฿45 base, tiered per kilometre, return at half rate).",
  },
  {
    q: "When is a deposit required?",
    a: "For long-distance reservations — beyond approximately 25 km from central Sukhumvit — we request a modest deposit to secure the practitioner's travel commitment. This is communicated in advance, never as a surprise.",
  },
  {
    q: "Cancellation & rescheduling",
    a: "Complimentary cancellation or rescheduling up to 30 minutes before the appointment. Beyond that window — or once the practitioner is en route — a 50% service-fee charge applies, in respect of their committed time and travel.",
  },
  {
    q: "Are my payment details secure?",
    a: "Yes. We use plain-card statements (no service description), tokenised processing for online methods, and never store your card numbers ourselves. Your booking, your privacy.",
  },
];

export type PaymentMethodId =
  | "promptpay"
  | "cash"
  | "card"
  | "truemoney"
  | "alipay"
  | "wechat";

interface PaymentOption {
  id: PaymentMethodId;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  badge?: string; // e.g. "Alipay+ Partner"
  /**
   * 🆕 Round 28o (founder 2026-05-02) — when true, the row renders a
   * "Coming soon" pill, dims the icon, and disables the click handler.
   * For payment methods that aren't wired to a real processor yet —
   * we show them as upcoming so customers know what to expect.
   */
  comingSoon?: boolean;
}

const RECOMMENDED: PaymentOption = {
  id: "promptpay",
  label: "PromptPay",
  sub: "Scan QR on arrival (Details after booking)",
  icon: <QrCodeScannerRoundedIcon />,
  iconBg: "rgba(20, 184, 166, 0.12)",
  iconFg: "#14b8a6",
};

// 🆕 Round 28t (founder 2026-05-02, corrected) — Cards (Visa/Mastercard/
// JCB) is the only method that's NOT wired to a real processor yet, so
// only that row shows the "Coming soon" state. Cash, TrueMoney, Alipay,
// WeChat — all available. PromptPay (RECOMMENDED) stays available as
// the cashless default.
const LINKED_DEFAULTS: PaymentOption[] = [
  {
    id: "cash",
    label: "Cash",
    sub: "Pay with cash on arrival",
    icon: <LocalAtmRoundedIcon />,
    iconBg: "rgba(20, 184, 166, 0.10)",
    iconFg: "#14b8a6",
  },
];

const ADD_METHODS: PaymentOption[] = [
  {
    id: "card",
    label: "Cards",
    sub: "Visa / Mastercard / JCB",
    icon: <CreditCardRoundedIcon />,
    iconBg: "rgba(254, 9, 68, 0.10)",
    iconFg: "#FE0944",
    badge: "not available",
    comingSoon: true,
  },
  {
    id: "truemoney",
    label: "TrueMoney",
    icon: <AccountBalanceWalletRoundedIcon />,
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconFg: "#d97706",
  },
  {
    id: "alipay",
    label: "Alipay",
    sub: "Scan QR once confirmed",
    icon: <PaymentsRoundedIcon />,
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconFg: "#2563eb",
    badge: "Alipay+ Partner",
  },
  {
    id: "wechat",
    label: "WeChat Pay",
    sub: "Scan QR once confirmed",
    icon: <PaymentsRoundedIcon />,
    iconBg: "rgba(34, 197, 94, 0.12)",
    iconFg: "#16a34a",
    
  },
];

// 🆕 Round 28u (founder 2026-05-02) — bug-fix layer.
// Builds a single source of truth for which payment IDs are actually
// usable (not coming-soon, not unknown). Used by both the page state
// and the exported `readSelectedPaymentMethod()` so a stale localStorage
// value (e.g., user picked "card" before it was disabled) can't crash
// the booking flow downstream.
const ALL_OPTIONS: PaymentOption[] = [RECOMMENDED, ...LINKED_DEFAULTS, ...ADD_METHODS];

const AVAILABLE_IDS: ReadonlySet<PaymentMethodId> = new Set(
  ALL_OPTIONS.filter((o) => !o.comingSoon).map((o) => o.id)
);

// 🆕 Round 28b15 (founder 2026-05-04) — default flipped from
//   "promptpay" to "cash". Founder spec: most customers prefer
//   pay-on-arrival (cash) for outcall in Bangkok. Confirm Order
//   pre-selects Cash, customers can switch to PromptPay/etc. if
//   they want cashless.
const DEFAULT_PAYMENT_ID: PaymentMethodId = "cash";

/** Resolve any incoming string into a guaranteed-usable PaymentMethodId. */
function safePaymentId(raw: string | null | undefined): PaymentMethodId {
  if (raw && AVAILABLE_IDS.has(raw as PaymentMethodId)) {
    return raw as PaymentMethodId;
  }
  return DEFAULT_PAYMENT_ID;
}

const PaymentMethodsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PaymentMethodId>(() => {
    if (typeof window === "undefined") return DEFAULT_PAYMENT_ID;
    return safePaymentId(window.localStorage.getItem(STORAGE_KEY));
  });

  // 🆕 Round 28u — heal stale persistence on first mount.
  // If the user landed here with localStorage holding a now-disabled or
  // unknown method (e.g., "card" after we flagged it coming-soon), write
  // the resolved safe id back so downstream readers don't see the stale
  // value either.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== selected) {
      try {
        window.localStorage.setItem(STORAGE_KEY, selected);
      } catch {
        /* ignore */
      }
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (id: PaymentMethodId) => {
    // 🆕 Round 28u — guard against accidental persist of a coming-soon
    // method (e.g., if PaymentRow ever accepts a flagged option).
    if (!AVAILABLE_IDS.has(id)) return;
    setSelected(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore quota / privacy mode failures */
    }
  };

  return (
    <Box
      sx={{
        // Phone-shell wrapper — Round 28b1 Clean v3 cool-neutral palette
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        position: "relative",
        paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Sticky header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(250, 251, 252, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label="back"
          onClick={() => void navigate(-1)}
          sx={{
            width: 38,
            height: 38,
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#3c1e14",
            boxShadow: "0 2px 8px rgba(126, 30, 46, 0.06)",
            "&:hover": { background: "#fff" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: "18px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.01em",
            marginRight: "38px",
          }}
        >
          Payment Methods
        </Typography>
      </Box>

      <Box
        sx={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Recommended cashless banner */}
        <Box
          sx={{
            padding: "14px 14px 6px",
            borderRadius: "20px",
            background: "rgba(20, 184, 166, 0.08)",
            border: "1px solid rgba(20, 184, 166, 0.18)",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "14.5px",
              fontWeight: 700,
              color: "#3c1e14",
              marginBottom: "10px",
              paddingLeft: "2px",
            }}
          >
            Enjoy easier, cashless payments
          </Typography>
          <PaymentRow
            option={RECOMMENDED}
            isActive={selected === RECOMMENDED.id}
            onSelect={persist}
            elevated
          />
        </Box>

        {/* Linked methods */}
        <Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "16px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "2px",
              paddingLeft: "2px",
            }}
          >
            We accept all major currencies.
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.55)",
              marginBottom: "12px",
              paddingLeft: "2px",
            }}
          >
            Flexible payment options for international guests.
          </Typography>
          <Box
            sx={{
              borderRadius: "16px",
              background: "#fff",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              overflow: "hidden",
            }}
          >
            {LINKED_DEFAULTS.map((opt, idx) => (
              <PaymentRow
                key={opt.id}
                option={opt}
                isActive={selected === opt.id}
                onSelect={persist}
                showDefaultBadge
                divider={idx > 0}
              />
            ))}
          </Box>
        </Box>

        {/* Online Booking | Payment Options */}
        <Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "16px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "12px",
              paddingLeft: "2px",
            }}
          >
            Bank Transfer
          </Typography>
          <Box
            sx={{
              borderRadius: "16px",
              background: "#fff",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              overflow: "hidden",
            }}
          >
            {ADD_METHODS.map((opt, idx) => (
              <AddMethodRow key={opt.id} option={opt} divider={idx > 0} />
            ))}
          </Box>
        </Box>

        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            color: "rgba(60, 30, 20, 0.5)",
            textAlign: "center",
            marginTop: "8px",
            lineHeight: 1.5,
            whiteSpace: "pre-line",
          }}
        >
          Our team will verify and process your payment{"\n"}
          once confirmed via our{" "}
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              color: "rgba(60, 30, 20, 0.8)",
            }}
          >
            official contact channels
          </Box>
          .
        </Typography>

        {/* ─── Payment & Policy FAQ — refined editorial accordion ─── */}
        <Box sx={{ mt: 3 }}>
          {/* Eyebrow + serif title with italic em accent */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#b85c3c",
              fontWeight: 700,
              mb: 0.75,
              fontFamily: SANS,
              "&::before": {
                content: '""',
                width: "22px",
                height: "1px",
                background: "rgba(184, 92, 60, 0.55)",
              },
            }}
          >
            Payment & Policy
          </Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 400,
              color: "#2a1a14",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              "& em": { fontStyle: "italic", color: "#FE0944" },
            }}
          >
            What you should <em>know</em>
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 13,
              color: "rgba(60,30,20,0.65)",
              lineHeight: 1.55,
              mt: 0.75,
              mb: 2,
              maxWidth: "38ch",
            }}
          >
            Pricing, deposits, cancellation, and how we keep your details
            private.
          </Typography>

          {FAQ_POLICY.map((item) => (
            <FaqRow key={item.q} item={item} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Selectable row (radio) ─────────────────────────────────────────────
const PaymentRow: React.FC<{
  option: PaymentOption;
  isActive: boolean;
  onSelect: (id: PaymentMethodId) => void;
  showDefaultBadge?: boolean;
  divider?: boolean;
  elevated?: boolean;
}> = ({ option, isActive, onSelect, showDefaultBadge, divider, elevated }) => {
  // 🆕 Round 28u — symmetric coming-soon guard with AddMethodRow so a
  // future Linked-method flag (e.g., Cash temporarily off) renders
  // disabled instead of silently letting the user pick it.
  const isDisabled = option.comingSoon === true;
  const handleSelect = () => {
    if (isDisabled) return;
    onSelect(option.id);
  };
  return (
  <Box
    role="radio"
    aria-checked={isActive}
    aria-disabled={isDisabled || undefined}
    tabIndex={isDisabled ? -1 : 0}
    onClick={handleSelect}
    onKeyDown={(e) => {
      if (isDisabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleSelect();
      }
    }}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: elevated ? "14px 12px" : "14px 16px",
      cursor: isDisabled ? "not-allowed" : "pointer",
      userSelect: "none",
      borderTop: divider ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
      borderRadius: elevated ? "14px" : 0,
      background: elevated ? "#fff" : "transparent",
      border: elevated ? "1px solid rgba(0, 0, 0, 0.06)" : undefined,
      opacity: isDisabled ? 0.62 : 1,
      transition: "background 0.15s ease",
      "&:hover": isDisabled
        ? {}
        : { background: elevated ? "#fff" : "rgba(0, 0, 0, 0.02)" },
      "&:focus-visible": {
        outline: "2px solid #FE0944",
        outlineOffset: "-2px",
      },
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: "12px",
        background: option.iconBg,
        color: option.iconFg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& svg": { fontSize: 22 },
      }}
    >
      {option.icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "15px",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          {option.label}
        </Typography>
        {showDefaultBadge && isActive && (
          <Box
            component="span"
            sx={{
              fontFamily: SANS,
              fontSize: "10.5px",
              fontWeight: 700,
              color: "rgba(60, 30, 20, 0.6)",
              background: "rgba(0, 0, 0, 0.06)",
              borderRadius: "999px",
              padding: "2px 8px",
              letterSpacing: "0.04em",
            }}
          >
            Default
          </Box>
        )}
      </Box>
      {option.sub && (
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "rgba(60, 30, 20, 0.6)",
            marginTop: "2px",
          }}
        >
          {option.sub}
        </Typography>
      )}
    </Box>
    {/* Active radio = filled red disc with check; inactive = outlined ring */}
    <Box
      aria-hidden
      sx={{
        width: 24,
        height: 24,
        flexShrink: 0,
        borderRadius: "50%",
        border: isActive ? "none" : "2px solid rgba(0, 0, 0, 0.2)",
        background: isActive
          ? "linear-gradient(135deg, #FE0944, #FE7A52)"
          : "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isActive
          ? "0 4px 10px rgba(254, 9, 68, 0.3)"
          : "none",
        "& svg": { fontSize: 16 },
        transition: "all 0.15s ease",
      }}
    >
      {isActive && <CheckRoundedIcon />}
    </Box>
  </Box>
  );
};

// ─── "Add" row (chevron, no radio) ──────────────────────────────────────
const AddMethodRow: React.FC<{
  option: PaymentOption;
  divider?: boolean;
}> = ({ option, divider }) => {
  const isDisabled = option.comingSoon === true;
  return (
    <Box
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled || undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 16px",
        cursor: isDisabled ? "not-allowed" : "pointer",
        userSelect: "none",
        borderTop: divider ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
        transition: "background 0.15s ease",
        opacity: isDisabled ? 0.62 : 1,
        // Faint stripe pattern in the background tells the eye "not
        // active" without using a hard "DISABLED" stamp.
        ...(isDisabled && {
          background:
            "repeating-linear-gradient(135deg, transparent 0 8px, rgba(184, 92, 60, 0.04) 8px 16px)",
        }),
        "&:hover": isDisabled
          ? {}
          : { background: "rgba(0, 0, 0, 0.02)" },
        "&:focus-visible": {
          outline: "2px solid #FE0944",
          outlineOffset: "-2px",
        },
      }}
      onClick={() => {
        if (isDisabled) return;
        // Hook for future linking flows — for now no-op (admin-handled).
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "12px",
          background: option.iconBg,
          color: option.iconFg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& svg": { fontSize: 22 },
          // Slightly desaturate the icon when coming-soon to match
          // the dim row.
          filter: isDisabled ? "saturate(0.7)" : "none",
        }}
      >
        {option.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "15px",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          {option.label}
        </Typography>
        {option.sub && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "2px",
            }}
          >
            {option.sub}
          </Typography>
        )}
      </Box>

      {/* 🆕 Round 28o — Coming-soon pill (takes precedence over partner badge) */}
      {isDisabled ? (
        <Box
          component="span"
          aria-label="Currently unavailable."
          sx={{
            fontFamily: SANS,
            fontSize: "7px",
            fontWeight: 800,
            color: "#fff",
            background: "#a39f9e",
            borderRadius: "99px",
            padding: "5px 6px",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            boxShadow: "0 2px 6px rgba(113, 113, 113, 0.32)",
            marginRight: "4px",
            whiteSpace: "nowrap",
          }}
        >
          Currently unavailable.
        </Box>
      ) : (
        option.badge && (
          <Box
            component="span"
            sx={{
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 700,
              color: "#2563eb",
              background: "rgba(59, 130, 246, 0.10)",
              borderRadius: "6px",
              padding: "2px 6px",
              letterSpacing: "0.04em",
              marginRight: "4px",
            }}
          >
            {option.badge}
          </Box>
        )
      )}
      <ChevronRightRoundedIcon
        sx={{
          color: "rgba(60, 30, 20, 0.35)",
          fontSize: 22,
          opacity: isDisabled ? 0.45 : 1,
        }}
      />
    </Box>
  );
};

// ─── Reusable FAQ row — refined accordion with red left-edge on expand ─
const FaqRow: React.FC<{ item: FaqItem }> = ({ item }) => (
  <Accordion
    disableGutters
    elevation={0}
    sx={{
      mb: 1,
      position: "relative",
      borderRadius: "14px !important",
      background: "#FFFFFF",
      border: "1px solid rgba(15, 23, 42, 0.06)",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
      overflow: "hidden",
      transition: "border-color 200ms ease, box-shadow 200ms ease",
      "&::before": { display: "none" },
      "&::after": {
        content: '""',
        position: "absolute",
        left: 0,
        top: "12%",
        bottom: "12%",
        width: "2px",
        background: "linear-gradient(180deg, #FE0944, #FE7A52)",
        borderRadius: "2px",
        opacity: 0,
        transition: "opacity 220ms ease",
      },
      "&.Mui-expanded": {
        borderColor: "rgba(254, 9, 68, 0.18)",
        boxShadow:
          "0 1px 2px rgba(254, 9, 68, 0.06), 0 8px 22px rgba(254, 9, 68, 0.06)",
        "&::after": { opacity: 1 },
      },
    }}
  >
    <AccordionSummary
      expandIcon={
        <ExpandMoreRoundedIcon
          sx={{ color: "rgba(60,30,20,0.55)", fontSize: 22 }}
        />
      }
      sx={{
        minHeight: 52,
        px: 2,
        "& .MuiAccordionSummary-content": { my: 1.25 },
      }}
    >
      <Typography
        sx={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 13.5,
          color: "#2a1a14",
          letterSpacing: "-0.005em",
          lineHeight: 1.4,
        }}
      >
        {item.q}
      </Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
      {typeof item.a === "string" ? (
        item.a
          .split("\n\n")
          .map((para, i) => (
            <Typography
              key={i}
              sx={{
                fontFamily: SANS,
                fontSize: 13,
                lineHeight: 1.7,
                color: "rgba(60,30,20,0.78)",
                mb: 1,
                "&:last-child": { mb: 0 },
              }}
            >
              {para}
            </Typography>
          ))
      ) : (
        <Box
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            lineHeight: 1.7,
            color: "rgba(60,30,20,0.78)",
          }}
        >
          {item.a}
        </Box>
      )}
    </AccordionDetails>
  </Accordion>
);

export default PaymentMethodsPage;

/** Public helper for BookingFlowPage to read the user's chosen method.
 *  🆕 Round 28u — runs the same `safePaymentId` validation as the page
 *  itself so a stale or coming-soon method id can never leak into the
 *  Confirm Order summary or the Telegram booking payload.
 */
export function readSelectedPaymentMethod(): PaymentMethodId {
  if (typeof window === "undefined") return DEFAULT_PAYMENT_ID;
  return safePaymentId(window.localStorage.getItem(STORAGE_KEY));
}

/** Map id → display label. Used by Confirm Order Payment cell. */
export const PAYMENT_LABELS: Record<PaymentMethodId, string> = {
  promptpay: "PromptPay",
  cash: "Cash",
  card: "Card",
  truemoney: "TrueMoney",
  alipay: "Alipay",
  wechat: "WeChat Pay",
};
