// src/pages/admin/AdminBotComingSoonPage.tsx
//
// 🆕 Round 28x.88 (founder: "จะมีเมนูแยก line OA bot / WhatsApp bot /
//   Telegram bot") — placeholder for the two platforms that don't have a
//   real bot integration yet. Deliberately honest ("ยังไม่เชื่อมต่อ"), not a
//   disabled nav item, so tapping in still explains what's missing instead
//   of looking broken.

import React from "react";
import { Box, Typography } from "@mui/material";
import { Robot } from "phosphor-react";
import { adminColor, adminFont } from "@/theme/adminTheme";

const AdminBotComingSoonPage: React.FC<{ platform: string; note?: string }> = ({ platform, note }) => (
  <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: "auto" }}>
    <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5, lineHeight: 1 }}>
      {platform} Bot
    </Typography>
    <Typography sx={{ fontFamily: adminFont.sans, fontSize: 11, color: adminColor.dim, mt: 0.4, mb: 3 }}>
      SunRed Bot → {platform}
    </Typography>

    <Box
      sx={{
        background: adminColor.panel2, border: `1px solid ${adminColor.line}`, borderRadius: "16px",
        p: 4, textAlign: "center", color: adminColor.dim,
      }}
    >
      <Robot size={32} weight="duotone" color={adminColor.dim} />
      <Typography sx={{ fontFamily: adminFont.sans, fontSize: 14, fontWeight: 700, color: adminColor.text, mt: 1.5 }}>
        ยังไม่เชื่อมต่อ · Not connected yet
      </Typography>
      <Typography sx={{ fontFamily: adminFont.sans, fontSize: 12.5, color: adminColor.muted, mt: 0.75, maxWidth: 420, mx: "auto" }}>
        {note ?? `${platform} ยังไม่มีบอทจริงในระบบ — หน้านี้จองที่ไว้สำหรับตอนที่เชื่อมต่อ ${platform} API`}
      </Typography>
    </Box>
  </Box>
);

export default AdminBotComingSoonPage;
