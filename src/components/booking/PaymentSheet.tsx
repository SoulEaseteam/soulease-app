// src/components/booking/PaymentSheet.tsx
//
// 🎨 Phase 4 — Bottom sheet for picking the payment method. Wraps the
// existing PaymentPicker so the Confirm Order page can show a compact
// cell instead of 5 inline radio rows.

import React, { useEffect, useState } from "react";
import { Drawer, Box } from "@mui/material";
import PaymentPicker, {
  type PaymentMethod,
} from "@/components/booking/PaymentPicker";
import { SheetHeader, SheetCTA } from "@/components/booking/LanguageSheet";

interface Props {
  open: boolean;
  onClose: () => void;
  value: PaymentMethod | null;
  onConfirm: (method: PaymentMethod) => void;
}

const PaymentSheet: React.FC<Props> = ({ open, onClose, value, onConfirm }) => {
  const [draft, setDraft] = useState<PaymentMethod | null>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
          borderRadius: "24px 24px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          maxWidth: "430px",
          margin: "0 auto",
          left: 0,
          right: 0,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <SheetHeader title="Payment method" onClose={onClose} />

      <Box sx={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        <PaymentPicker value={draft} onChange={setDraft} />
      </Box>

      <SheetCTA
        label={draft ? "Confirm payment method" : "Pick a payment method"}
        onClick={() => {
          if (draft) onConfirm(draft);
        }}
        disabled={!draft}
      />
    </Drawer>
  );
};

export default PaymentSheet;
