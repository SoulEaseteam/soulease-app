// src/components/common/ErrorBoundary.tsx
//
// Class-based ErrorBoundary (React ยังไม่มี hook-based สำหรับการดักทาง render)
// — ครอบทั้งแอปใน main.tsx เพื่อกัน "white screen of death" จาก runtime error
// — หน้าตา fallback ใช้สี brand เดียวกับ LoginPage เพื่อความ consistent

import React from "react";
import i18n from "@/app/i18n";
// 🆕 Round 28x.36 — auto-recover from a stale-chunk error after a deploy.
import { isDynamicImportError, reloadOnceForStaleChunk } from "@/utils/staleChunkReload";

interface Props {
  children: React.ReactNode;
  /** ถ้าอยากปรับ UI fallback เอง */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
  /** 🆕 28x.36 — a stale-chunk reload is in flight; render a quiet placeholder
   *  instead of the scary error card (navigation is imminent). */
  reloading: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, reloading: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 🆕 Round 28x.36 — a lazy route whose hashed chunk was replaced by a new
    //   deploy rejects its import; that's not a real crash. Reload once (guarded
    //   against loops) so the browser pulls the current index.html + chunks.
    if (isDynamicImportError(error) && reloadOnceForStaleChunk()) {
      this.setState({ reloading: true });
      return;
    }

    // log → console (ในอนาคตเชื่อม Sentry / GA event ที่นี่)
    console.error("[ErrorBoundary]", error, info);

    // ส่ง event ไป GA ถ้ามี
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      try {
        window.gtag("event", "exception", {
          description: error.message,
          fatal: true,
        });
      } catch {
        /* ignore */
      }
    }
  }

  reset = () => this.setState({ error: null, reloading: false });

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    // 🆕 28x.36 — mid-reload after a stale-chunk error: keep it silent, no
    //   alarming copy for a self-healing hiccup.
    if (reloading) {
      return (
        <div
          role="status"
          aria-live="polite"
          style={{ minHeight: "100vh", background: "#F7F7F7" }}
        />
      );
    }

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          background: "#F7F7F7",
          color: "#232B36",
          fontFamily:
            "'Trebuchet MS', system-ui, -apple-system, Segoe UI, sans-serif",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            background: "rgba(255,255,255,0.96)",
            color: "#3a3420",
            padding: "32px 24px",
            borderRadius: 24,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>😵‍💫</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "#4B4B48" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 16px", fontSize: 14, opacity: 0.8 }}>
            {i18n.t("error.body", "Sorry, something unexpected went wrong. Please try again.")}
          </p>
          <pre
            style={{
              background: "#fdecec",
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: 12,
              maxHeight: 120,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              textAlign: "left",
              margin: "0 0 16px",
            }}
          >
            {error.message}
          </pre>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => {
                // 🆕 28x.36 — for a stale-chunk error a plain reset just re-runs
                //   the same failed import from the old index; force a hard
                //   reload so the fresh deploy's chunks load.
                if (isDynamicImportError(error)) window.location.reload();
                else this.reset();
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background: "#FF9999",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid #2D2D2B",
                background: "transparent",
                color: "#4B4B48",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
