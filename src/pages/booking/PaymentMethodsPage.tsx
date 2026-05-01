// src/pages/booking/PaymentMethodsPage.tsx
//
// 🎨 Phase 5 round 14 (founder 2026-05-01): Payment Methods page.
// Mockup of Grab's Payment Methods screen, adapted to SunRed brand
// (red gradient + mint accents, phone-shell wrapper).
//
// Layout:
//   ┌──────────────────────────────────────────┐
//   │  ← Payment Methods                        │  sticky header
//   ├──────────────────────────────────────────┤
//   │  [Personal] [Work]                        │  segmented (Personal active)
//   │                                           │
//   │  Enjoy easier, cashless payments          │  cream banner card
//   │  ┌─────────────────────────────────────┐ │
//   │  │ [icon] PromptPay              ○      │ │  recommended row
//   │  │        Scan the driver's QR to pay   │ │
//   │  └─────────────────────────────────────┘ │
//   │                                           │
//   │  LINKED METHODS                           │
//   │  Swipe left to set your default           │
//   │   ┌──┐ Cash (default)              ●      │  active radio
//   │                                           │
//   │  ADD METHODS                              │
//   │   ┌──┐ Cards                       ›      │
//   │   ┌──┐ TrueMoney                   ›      │
//   │   ┌──┐ AliPay              [Alipay+]      │
//   │   ┌──┐ WeChat Pay                  ›      │
//   └──────────────────────────────────────────┘
//
// Storage: persists the user's selected method to localStorage under
// `sunred.paymentMethod`. Read by BookingFlowPage to show "Pay with: X"
// in the Confirm Order Payment cell. Admin still confirms payment via
// Telegram chat — this page is presentation only for now.

import React, { useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import LocalAtmRoundedIcon from "@mui/icons-material/LocalAtmRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const STORAGE_KEY = "sunred.paymentMethod";

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
}

const RECOMMENDED: PaymentOption = {
  id: "promptpay",
  label: "PromptPay",
  sub: "Scan the QR to pay on arrival",
  icon: <QrCodeScannerRoundedIcon />,
  iconBg: "rgba(20, 184, 166, 0.12)",
  iconFg: "#14b8a6",
};

const LINKED_DEFAULTS: PaymentOption[] = [
  {
    id: "cash",
    label: "Cash",
    sub: "Pay in cash on arrival",
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
    sub: "Scan QR after confirm",
    icon: <PaymentsRoundedIcon />,
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconFg: "#2563eb",
    badge: "Alipay+ Partner",
  },
  {
    id: "wechat",
    label: "WeChat Pay",
    sub: "Scan QR after confirm",
    icon: <PaymentsRoundedIcon />,
    iconBg: "rgba(34, 197, 94, 0.12)",
    iconFg: "#16a34a",
  },
];

const PaymentMethodsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PaymentMethodId>(() => {
    if (typeof window === "undefined") return "cash";
    return (
      (window.localStorage.getItem(STORAGE_KEY) as PaymentMethodId) || "cash"
    );
  });

  const persist = (id: PaymentMethodId) => {
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
        // Phone-shell wrapper — match BookingFlowPage / SelectLocation rhythm
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
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
          background: "rgba(255, 248, 240, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
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
            Linked Methods
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
            Tap to set as your default payment.
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

        {/* Add methods */}
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
            Add Methods
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
          }}
        >
          Our admin verifies and processes your payment after the booking
          is confirmed via Telegram.
        </Typography>
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
}> = ({ option, isActive, onSelect, showDefaultBadge, divider, elevated }) => (
  <Box
    role="radio"
    aria-checked={isActive}
    tabIndex={0}
    onClick={() => onSelect(option.id)}
    onKeyDown={(e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onSelect(option.id);
      }
    }}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: elevated ? "14px 12px" : "14px 16px",
      cursor: "pointer",
      userSelect: "none",
      borderTop: divider ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
      borderRadius: elevated ? "14px" : 0,
      background: elevated ? "#fff" : "transparent",
      border: elevated ? "1px solid rgba(0, 0, 0, 0.06)" : undefined,
      transition: "background 0.15s ease",
      "&:hover": {
        background: elevated ? "#fff" : "rgba(0, 0, 0, 0.02)",
      },
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

// ─── "Add" row (chevron, no radio) ──────────────────────────────────────
const AddMethodRow: React.FC<{
  option: PaymentOption;
  divider?: boolean;
}> = ({ option, divider }) => (
  <Box
    role="button"
    tabIndex={0}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "14px 16px",
      cursor: "pointer",
      userSelect: "none",
      borderTop: divider ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
      transition: "background 0.15s ease",
      "&:hover": { background: "rgba(0, 0, 0, 0.02)" },
      "&:focus-visible": {
        outline: "2px solid #FE0944",
        outlineOffset: "-2px",
      },
    }}
    onClick={() => {
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
    {option.badge && (
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
    )}
    <ChevronRightRoundedIcon
      sx={{ color: "rgba(60, 30, 20, 0.35)", fontSize: 22 }}
    />
  </Box>
);

export default PaymentMethodsPage;

/** Public helper for BookingFlowPage to read the user's chosen method. */
export function readSelectedPaymentMethod(): PaymentMethodId {
  if (typeof window === "undefined") return "cash";
  return (
    (window.localStorage.getItem(STORAGE_KEY) as PaymentMethodId) || "cash"
  );
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
