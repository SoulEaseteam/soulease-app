import React from 'react';

interface FloatingChatButtonProps {
  platform: string;
  link: string;
  icon: string;
  bottom: number;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  platform,
  link,
  icon,
  bottom,
}) => {
  // ป้องกันเล่น audio ซ้ำถี่จน error, สร้าง audio ใหม่ทุกครั้ง
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    try {
      const audio = new Audio('/sounds/click.mp3');
      audio.currentTime = 0;
      audio.play();
    } catch {
      // ignore audio error
    }
  };

  const styles: React.CSSProperties = {
    position: 'fixed',
    right: 20,
    bottom,
    background: 'linear-gradient(to bottom, #ffe4ec, #fff)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '50%',
    width: 60,
    height: 60,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 6px 16px rgba(255, 182, 193, 0.35)',
    border: '1px solid rgba(255, 182, 193, 0.5)',
    cursor: 'pointer',
    zIndex: 1300,
    transition: 'transform 0.3s ease, box-shadow 0.4s',
    fontFamily: 'Orson, sans-serif',
    outline: 'none',
    userSelect: 'none',
  };

  const iconStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
    objectFit: 'contain',
  };

  // ป้องกันการ focus ด้วยคีย์บอร์ดและ accidental scroll
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={`Contact via ${platform}`}
      style={styles}
      aria-label={`Contact via ${platform}`}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 12px 28px rgba(255, 182, 193, 0.35)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 6px 16px rgba(255, 182, 193, 0.25)';
      }}
      tabIndex={0}
      draggable={false}
    >
      <img src={icon} alt={`${platform} icon`} style={iconStyle} draggable={false} />
    </a>
  );
};

export default FloatingChatButton;