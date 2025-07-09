// src/components/AdminFloatingChat.tsx

import React, { useState } from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import { FaLine, FaTelegramPlane, FaWhatsapp, FaWeixin } from 'react-icons/fa';

const chatButtons = [
  { icon: <FaLine size={20} />, href: 'https://line.me/ti/p/-TZBrEWmPx', color: '#00c300', title: 'LINE', delay: 0.05 },
  { icon: <FaTelegramPlane size={20} />, href: 'https://t.me/yourusername', color: '#229ED9', title: 'Telegram', delay: 0.15 },
  { icon: <FaWhatsapp size={20} />, href: 'https://wa.me/66981234567', color: '#25D366', title: 'WhatsApp', delay: 0.25 },
  { icon: <FaWeixin size={20} />, href: 'https://your-wechat-link-or-qr', color: '#7BB32E', title: 'WeChat', delay: 0.35 },
];

const AdminFloatingChat: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Main Floating Button */}
      <button
        className="admin-contact-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Contact Admin"
      >
        <img
          src="images/icon/admins.png"
          alt="admin"
          style={{ width: 60, height: 60 }}
        />
      </button>

      {/* Floating Chat Options */}
      {isExpanded && (
        <Box className="chat-buttons-container">
          {chatButtons.map((btn) => (
            <Tooltip title={btn.title} placement="left" key={btn.title}>
              <IconButton
                component="a"
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  bgcolor: btn.color,
                  color: 'white',
                  width: 48,
                  height: 48,
                  mb: 1,
                  borderRadius: '50%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  opacity: 0,
                  transform: 'translateY(20px)',
                  animation: `fadeSlideUpBtn 0.4s ease ${btn.delay}s forwards`,
                  '&:hover': { transform: 'scale(1.1)' },
                }}
              >
                {btn.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Embedded CSS */}
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
      `}</style>
    </>
  );
};

export default AdminFloatingChat;