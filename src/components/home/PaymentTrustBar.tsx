// src/components/home/PaymentTrustBar.tsx
//
// 💳 Payment Trust Bar — สื่อสารวิธีจ่ายให้ลูกค้าต่างชาติ
//
// ลูกค้าจีน 70% จ่ายด้วย WeChat Pay / AliPay
// ลูกค้าญี่ปุ่น/เกาหลี ใช้บัตร + cash
// ลูกค้าไทย ใช้ PromptPay
// แสดง logos ทั้งหมด → build trust + reduce friction ก่อน book

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

interface PaymentMethod {
  name: string;
  emoji: string;
  bg: string;
}

// ใช้ emoji + text แทน external logos (ปลอดภัยจาก trademark, ไม่ต้อง host)
const METHODS: PaymentMethod[] = [
  { name: "WeChat Pay", emoji: "💚", bg: "#09B83E" },
  { name: "AliPay", emoji: "🅰️", bg: "#1677FF" },
  { name: "PromptPay", emoji: "🇹🇭", bg: "#003D80" },
  { name: "Visa", emoji: "💳", bg: "#1A1F71" },
  { name: "Mastercard", emoji: "🔴", bg: "#EB001B" },
  { name: "Cash", emoji: "💵", bg: "#1B5E20" },
];

const PaymentTrustBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 0.5,
        px: 0.5,
        textAlign: "center",
      }}
      aria-label="Accepted payment methods"
    >
      <Typography
        sx={{
          fontSize: 10.5,
          letterSpacing: 1.4,
          fontWeight: 600,
          color: "rgba(120, 105, 130, 0.7)",
          textTransform: "uppercase",
          mb: 0.7,
        }}
      >
        {t("trust.payments", "Trusted Payment Methods")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 0.6,
        }}
      >
        {METHODS.map((m) => (
          <Box
            key={m.name}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.4,
              px: 1,
              py: 0.4,
              borderRadius: 99,
              fontSize: 10.5,
              fontWeight: 600,
              color: "rgba(60, 60, 80, 0.85)",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.6)",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{m.emoji}</span>
            {m.name}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PaymentTrustBar;
