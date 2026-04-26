// src/components/ContactFloater.tsx
// Premium floating contact widget — conversion-optimized
// - Vector icons (no broken local images)
// - iOS safe-area handling
// - Gentle pulse to attract attention
// - Customer-facing copy
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Phone, X } from "lucide-react";

// ──────────────────────────────────────────
// Channels — customize numbers/links here
// ──────────────────────────────────────────
type Channel = {
  key: string;
  label: string;
  hint: string;
  href: string;
  bg: string;
  icon: React.ReactNode;
};

const CHANNELS: Channel[] = [
  {
    key: "line",
    label: "LINE",
    hint: "ตอบไวสุด • Reply fastest",
    href: "https://lin.ee/uqvdwWt",
    bg: "#06C755",
    // LINE official icon (simplified SVG)
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63h-1.755v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63h-1.755v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596a.587.587 0 0 1-.193.034c-.214 0-.412-.108-.531-.276l-2.443-3.328v3.005c0 .345-.279.629-.631.629a.624.624 0 0 1-.622-.629V8.108c0-.27.17-.51.432-.595a.572.572 0 0 1 .192-.033c.21 0 .412.108.529.275l2.443 3.328V8.108c0-.345.282-.63.631-.63.343 0 .626.285.626.63v4.771zm-5.741 0c0 .345-.282.629-.631.629a.624.624 0 0 1-.626-.629V8.108c0-.345.282-.63.626-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917a.624.624 0 0 1-.626-.629V8.108c0-.345.282-.63.626-.63.346 0 .628.285.628.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
      </svg>
    ),
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    hint: "International friendly",
    href: "https://wa.me/66634350987",
    bg: "#25D366",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
      </svg>
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    hint: "Channel + DM",
    href: "https://t.me/SunRed_BKK",
    bg: "#26A5E4",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    key: "phone",
    label: "Call",
    hint: "+66 63 435 0987",
    href: "tel:+66634350987",
    bg: "#FE0944",
    icon: <Phone size={22} color="white" />,
  },
];

const ContactFloater: React.FC = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();

  // ปิด panel เมื่อกด ESC
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  // ปิดเมื่อคลิกนอก
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideMenu = containerRef.current?.contains(t);
      const onTrigger = triggerRef.current?.contains(t);
      if (!insideMenu && !onTrigger) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // ปิดเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // ซ่อนใน admin layout (ลูกค้าไม่ต้องเห็นใน admin)
  if (location.pathname.startsWith("/admin")) return null;
  if (location.pathname.startsWith("/therapist-portal")) return null;

  return (
    <>
      {/* Trigger button — pulsing to attract */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close contact menu" : "Contact us"}
        onClick={() => setOpen((v) => !v)}
        className="cf-trigger"
      >
        {open ? (
          <X size={26} color="white" />
        ) : (
          <MessageCircle size={26} color="white" fill="white" />
        )}
        {!open && <span className="cf-pulse" aria-hidden="true" />}
      </button>

      {/* Channel menu */}
      {open && (
        <div ref={containerRef} className="cf-menu" role="menu">
          {/* Header — sets premium tone */}
          <div className="cf-menu-header">
            <div className="cf-menu-title">ติดต่อเรา • Contact Us</div>
            <div className="cf-menu-subtitle">
              ตอบเร็ว 24/7 • Available around the clock
            </div>
          </div>

          {CHANNELS.map((c, i) => (
            <a
              key={c.key}
              href={c.href}
              target={c.href.startsWith("tel:") ? undefined : "_blank"}
              rel={c.href.startsWith("tel:") ? undefined : "noopener noreferrer"}
              className="cf-channel"
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="cf-channel-icon" style={{ background: c.bg }}>
                {c.icon}
              </span>
              <span className="cf-channel-text">
                <span className="cf-channel-label">{c.label}</span>
                <span className="cf-channel-hint">{c.hint}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      <style>{`
        .cf-trigger {
          position: fixed;
          right: 18px;
          bottom: calc(96px + env(safe-area-inset-bottom, 0px));
          z-index: 1500;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(180deg, #FE0944 0%, #FEAE96 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(254, 9, 68, 0.45),
                      0 4px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }
        .cf-trigger:hover {
          transform: scale(1.06);
        }
        .cf-trigger:active {
          transform: scale(0.95);
        }
        .cf-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(254, 9, 68, 0.45);
          animation: cf-pulse 2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes cf-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .cf-menu {
          position: fixed;
          right: 18px;
          bottom: calc(170px + env(safe-area-inset-bottom, 0px));
          z-index: 1500;
          width: 280px;
          background: white;
          border-radius: 20px;
          padding: 8px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15),
                      0 8px 16px rgba(0, 0, 0, 0.06);
          animation: cf-menu-in 0.25s ease-out;
        }
        @keyframes cf-menu-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .cf-menu-header {
          padding: 12px 12px 8px;
          border-bottom: 1px solid #F1F5F9;
          margin-bottom: 4px;
        }
        .cf-menu-title {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: 0.2px;
        }
        .cf-menu-subtitle {
          font-size: 11px;
          color: #64748B;
          margin-top: 2px;
        }

        .cf-channel {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: background 0.15s ease;
          opacity: 0;
          transform: translateY(8px);
          animation: cf-channel-in 0.3s ease forwards;
        }
        .cf-channel:hover { background: #F8FAFC; }
        @keyframes cf-channel-in {
          to { opacity: 1; transform: translateY(0); }
        }

        .cf-channel-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }
        .cf-channel-text { display: flex; flex-direction: column; }
        .cf-channel-label {
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
        }
        .cf-channel-hint {
          font-size: 11px;
          color: #64748B;
          margin-top: 1px;
        }

        @media (max-width: 500px) {
          .cf-trigger {
            right: 14px;
            bottom: calc(88px + env(safe-area-inset-bottom, 0px));
            width: 54px;
            height: 54px;
          }
          .cf-menu {
            right: 14px;
            bottom: calc(154px + env(safe-area-inset-bottom, 0px));
            width: calc(100vw - 28px);
            max-width: 320px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cf-pulse, .cf-menu, .cf-channel { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </>
  );
};

export default ContactFloater;
