// src/components/common/ErrorBoundary.tsx
//
// Class-based ErrorBoundary (React ยังไม่มี hook-based สำหรับการดักทาง render)
// — ครอบทั้งแอปใน main.tsx เพื่อกัน "white screen of death" จาก runtime error
// — หน้าตา fallback ใช้สี brand เดียวกับ LoginPage เพื่อความ consistent

import React from "react";

interface Props {
  children: React.ReactNode;
  /** ถ้าอยากปรับ UI fallback เอง */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
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

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

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
          background: "#B4000A",
          color: "#fff",
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
          <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "#B4000A" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 16px", fontSize: 14, opacity: 0.8 }}>
            ขออภัย มีข้อผิดพลาดที่ไม่คาดคิดเกิดขึ้น โปรดลองใหม่อีกครั้ง
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
              onClick={this.reset}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background: "#B4000A",
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
                border: "1px solid #B4000A",
                background: "transparent",
                color: "#B4000A",
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
