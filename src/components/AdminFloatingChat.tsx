// src/components/AdminFloatingChat.tsx
import React, { useState, useEffect, useRef } from "react";
import { IconButton, Tooltip, Box } from "@mui/material";
import { useLocation } from "react-router-dom";

const chatButtons = [
  {
    title: "WeChat",
    href: "/wechat-scan",
    src: "/images/profli/wechat_2626283.png",
  },
  {
    title: "Telegram",
    href: "https://t.me/SunRedvip_bkk",
    src: "/images/profli/telegram.png",
  },
  {
    title: "WhatsApp",
    href: "https://wa.me/66634350987",
    src: "/images/profli/whatsapp.png",
  },
  {
    title: "LINE",
    href: "https://lin.ee/uqvdwWt",
    src: "/images/profli/line.png",
  },
  {
    title: "X (Twitter)",
    href: "https://x.com/SunredBangkok",
    src: "/images/profli/twitter.png",
  },
];

const AdminFloatingChat: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      const clickedInsideContainer =
        !!containerRef.current && containerRef.current.contains(target);

      const clickedMainButton =
        !!buttonRef.current && buttonRef.current.contains(target);

      if (!clickedInsideContainer && !clickedMainButton) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isExpanded]);

  useEffect(() => {
    setIsExpanded(false);
  }, [location.pathname]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleChatClick = () => {
    setIsExpanded(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="admin-contact-btn"
        onClick={handleToggle}
        type="button"
        aria-label="Open admin contact"
      >
        <img src="/images/icon/24-hours.png" alt="Admin Contact" />
      </button>

      {isExpanded && (
        <Box className="chat-buttons-container" ref={containerRef}>
          {chatButtons.map((btn, index) => (
            <Tooltip title={btn.title} placement="left" key={btn.title}>
              <IconButton
                component="a"
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={btn.title}
                onClick={handleChatClick}
                sx={{
                  bgcolor: "white",
                  width: 52,
                  height: 52,
                  mb: 2,
                  borderRadius: "50%",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                  opacity: 0,
                  transform: "translateY(16px)",
                  animation: `fadeUp 0.35s ease ${index * 0.07}s forwards`,
                  p: 0,
                }}
              >
                <Box
                  component="img"
                  src={btn.src}
                  alt={btn.title}
                  sx={{ width: 28, height: 28 }}
                />
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}

      <style>{`
        .admin-contact-btn {
          position: fixed;
          bottom: 96px;
          right: 18px;
          z-index: 1500;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .admin-contact-btn img {
          width: 105px;
          height: 105px;
          transition: transform .25s ease, filter .25s ease;
        }

        .admin-contact-btn:hover img {
          transform: scale(1.06);
          filter: brightness(1.1);
        }

        .chat-buttons-container {
          position: fixed;
          right: 22px;
          bottom: 182px;
          z-index: 1400;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chat-buttons-container button {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        @media (max-width: 500px) {
          .admin-contact-btn img {
            width: 70px;
            height: 70px;
          }

          .admin-contact-btn {
            bottom: 88px;
            right: 12px;
          }

          .chat-buttons-container {
            bottom: 158px;
            right: 12px;
          }
        }
      `}</style>
    </>
  );
};

export default AdminFloatingChat;