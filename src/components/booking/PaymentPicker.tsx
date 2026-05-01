// src/components/booking/PaymentPicker.tsx
//
// 🎨 Phase 3 Booking — Payment method picker (used inside StepConfirm).
//
// 5 methods that match BRAND.md target segments:
//   • Card        — Visa / Mastercard / JCB / UnionPay (intl tourists)
//   • WeChat Pay  — Chinese tourists
//   • AliPay      — Chinese tourists
//   • PromptPay   — Thai locals + expats
//   • Cash        — fallback / no-card scenarios
//
// 🚧 Real payment SDK integration (Stripe / Omise / WeChat) deferred to a
// follow-up. Commit 6 stores the user's *selection* on the booking doc
// (`payment` field) — settlement happens out-of-band on arrival, the same
// pattern the legacy BookingPage used.

import React from "react";
import { Box, Typography } from "@mui/material";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export type PaymentMethod =
  | "card"
  | "wechat"
  | "alipay"
  | "promptpay"
  | "cash";

interface MethodOption {
  id: PaymentMethod;
  name: string;
  desc: string;
  icon: string;
}

const METHODS: MethodOption[] = [
  { id: "card", name: "Credit / Debit Card", desc: "Visa · Mastercard · JCB · UnionPay", icon: "💳" },
  { id: "wechat", name: "WeChat Pay", desc: "微信支付 · scan QR on arrival", icon: "💬" },
  { id: "alipay", name: "AliPay", desc: "支付宝 · scan QR on arrival", icon: "🅰" },
  { id: "promptpay", name: "PromptPay", desc: "Thai bank transfer · QR on arrival", icon: "🇹🇭" },
  { id: "cash", name: "Cash", desc: "Pay on arrival · THB only", icon: "💵" },
];

interface Props {
  value: PaymentMethod | null;
  onChange: (val: PaymentMethod) => void;
}

const PaymentPicker: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Box
      role="radiogroup"
      aria-label="Payment method"
      sx={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {METHODS.map((m) => {
        const isActive = value === m.id;
        return (
          <Box
            key={m.id}
            role="radio"
            aria-checked={isActive}
            tabIndex={0}
            onClick={() => onChange(m.id)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onChange(m.id);
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "14px",
              cursor: "pointer",
              userSelect: "none",
              background: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: isActive
                ? "2px solid #FE0944"
                : "1px solid rgba(0, 0, 0, 0.06)",
              boxShadow: isActive
                ? "0 6px 18px rgba(254, 9, 68, 0.15)"
                : "0 2px 6px rgba(126, 30, 46, 0.05)",
              transition: "all 0.15s ease",
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: "2px",
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: "10px",
                background: "rgba(254, 201, 167, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              {m.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  lineHeight: 1.2,
                  marginBottom: "2px",
                }}
              >
                {m.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "rgba(60, 30, 20, 0.6)",
                  lineHeight: 1.3,
                }}
              >
                {m.desc}
              </Typography>
            </Box>
            <Box
              aria-hidden
              sx={{
                width: 18,
                height: 18,
                flexShrink: 0,
                borderRadius: "50%",
                border: isActive
                  ? "5px solid #FE0944"
                  : "2px solid rgba(0, 0, 0, 0.2)",
                background: isActive ? "#fff" : "transparent",
                transition: "all 0.15s ease",
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default PaymentPicker;
