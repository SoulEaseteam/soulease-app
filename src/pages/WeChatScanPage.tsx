// src/pages/WeChatScanPage.tsx
import React from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";

const WECHAT_ID = "SunRedvip";

const WeChatScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(WECHAT_ID);
      } else {
        // fallback สำหรับเบราว์เซอร์/บริบทที่ไม่รองรับ clipboard API
        const el = document.createElement("textarea");
        el.value = WECHAT_ID;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
    } catch {
      setCopied(true); // แสดง snackbar แม้คัดลอกล้มเหลว เพื่อแจ้งให้ผู้ใช้ลองคัดลอกเอง
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Scan to Add Us on WeChat
      </Typography>

      <Typography variant="body1" mb={5}>
        Open WeChat on your phone and use the built-in scanner to add our account.
      </Typography>

      <Box
        sx={{
          p: 2,
          borderRadius: 4,
          background: "#fff",
          boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          mb: 4,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <img
          src="/images/Service/wechat.jpg"
          alt="WeChat QR Code"
          style={{ width: "100%", height: "auto", objectFit: "contain" }}
        />

        <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mt: -6 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: 18, fontWeight: "bold" }}>
            WeChat ID: {WECHAT_ID}
          </Typography>
          <Tooltip title="Copy ID">
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={() => navigate("/")}
        sx={{ px: 4, borderRadius: 4, backgroundColor: "#f36c60", maxWidth: 200, width: "100%" }}
      >
        BACK TO HOME
      </Button>

      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)} message="WeChat ID copied!" />
    </Box>
  );
};

export default WeChatScanPage;