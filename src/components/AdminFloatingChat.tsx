// src/components/AdminFloatingChat.tsx
import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';

const chatButtons = [
  {
    title: 'WeChat',
    href: 'weixin://dl/chat?SoulEase2025',
    src: '/images/profli/wechat_2626283.png',
    delay: 0.1,
  },
  {
    title: 'Telegram',
    href: 'https://t.me/SoulEasevip_bkk',
    src: '/images/profli/telegram.png',
    delay: 0.2,
  },
  {
    title: 'WhatsApp',
    href: 'https://wa.me/66634350987',
    src: '/images/profli/whatsapp.png',
    delay: 0.3,
  },
  {
    title: 'LINE',
    href: 'https://line.me/ti/p/-TZBrEWmPx',
    src: '/images/profli/line.png',
    delay: 0.4,
  },
  {
    title: 'X (Twitter)',
    href: 'https://x.com/SoulEase_bkk',
    src: "public/images/profli/twitter.png",
    delay: 0.5,
  },
];
const AdminFloatingChat: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      <button
        className="admin-contact-btn"
        onClick={() => setIsExpanded((v) => !v)}
        aria-label="Contact Admin"
        aria-expanded={isExpanded}
        type="button"
      >
        <img
          src="/images/icon/admins.png"
          alt="admin"
          width={60}
          height={60}
        />
      </button>

      {isExpanded && (
        <Box className="chat-buttons-container">
          {chatButtons.map((btn, index) => (
            <Tooltip title={btn.title} placement="left" key={btn.title}>
              <IconButton
                component="a"
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={btn.title}
                sx={{
                  bgcolor: 'white',
                  width: 48,
                  height: 48,
                  mb: 1,
                  borderRadius: '50%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  opacity: 0,
                  transform: 'translateY(20px)',
                  animation: `fadeSlideUpBtn 0.4s ease ${index * 0.1}s forwards`,
                  '&:hover': { transform: 'scale(1.1)' },
                  p: 0
                }}
              >
                <Box
                  component="img"
                  src={btn.src}
                  alt={btn.alt}
                  sx={{ width: 30, height: 30 }}
                />
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}

      <style>{`
        .admin-contact-btn {
          position: fixed;
          bottom: 80px;
          right: 18px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          z-index: 1300;
          transition: all 0.3s ease;
        }
        .admin-contact-btn:hover {
          transform: scale(1.06);
          filter: brightness(1.1);
        }
        .chat-buttons-container {
          position: fixed;
          right: 20px;
          bottom: 150px;
          z-index: 1200;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        @keyframes fadeSlideUpBtn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 500px) {
          .admin-contact-btn,
          .admin-contact-btn img {
            width: 48px;
            height: 48px;
          }
          .chat-buttons-container {
            right: 10px;
            bottom: 110px;
          }
        }
      `}</style>
    </>
  );
};

export default AdminFloatingChat;