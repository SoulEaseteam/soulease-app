// src/components/common/ErrorFallback.tsx
// Fallback UI ที่จะโผล่มาเวลา component throw error
// เพื่อไม่ให้ user เห็นหน้าจอขาว
import { Box, Typography, Button, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";

interface ErrorFallbackProps {
  // react-error-boundary ส่ง error เป็น unknown — เรา narrow เอง
  error: unknown;
  resetErrorBoundary?: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  // log ไปที่ console — production ควรส่งเข้า Sentry/LogRocket แทน
  console.error("[ErrorBoundary] caught:", error);

  // Narrow error เป็น Error object สำหรับ display
  const err: Error =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        bgcolor: "#fff5f5",
      }}
    >
      <Stack spacing={2} alignItems="center" maxWidth={420}>
        <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1 }}>
          😔
        </Typography>
        <Typography variant="h5" fontWeight={700} textAlign="center">
          มีบางอย่างผิดพลาด
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          ขออภัยในความไม่สะดวก ทีมงานได้รับแจ้งแล้ว
          คุณสามารถลองใหม่หรือกลับไปหน้าหลักได้
        </Typography>

        {/* แสดง error message เฉพาะตอน dev — ป้องกัน internal info รั่วในโปรดักชัน */}
        {import.meta.env.DEV && (
          <Box
            sx={{
              p: 2,
              bgcolor: "#1e1e1e",
              color: "#ff6b6b",
              borderRadius: 1,
              fontFamily: "monospace",
              fontSize: 12,
              maxWidth: "100%",
              overflow: "auto",
              maxHeight: 200,
            }}
          >
            <strong>{err.name}:</strong> {err.message}
            {err.stack && (
              <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                {err.stack.split("\n").slice(0, 5).join("\n")}
              </pre>
            )}
          </Box>
        )}

        <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
          {resetErrorBoundary && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={resetErrorBoundary}
            >
              ลองใหม่
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => {
              window.location.href = "/";
            }}
          >
            กลับหน้าหลัก
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
