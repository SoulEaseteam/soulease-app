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
  const audio = new Audio('/sounds/click.mp3');

  const handleClick = () => {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const styles: React.CSSProperties = {
    position: 'fixed',
    right: '20px',
    bottom: `${bottom}px`,
    background: 'linear-gradient(to bottom, #ffe4ec, #fff)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 6px 16px rgba(255, 192, 203, 0.35)',
    border: '1px solid rgba(255, 182, 193, 0.5)',
    cursor: 'pointer',
    zIndex: 1000,
    transition: 'transform 0.3s ease, box-shadow 0.4s ease-in-out',
    fontFamily: 'Orson, sans-serif',
  };

  const iconStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
  };

  return (
    <a
      role="button"
      tabIndex={0}
  
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={`Contact via ${platform}`}
      style={styles}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 182, 193, 0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 182, 193, 0.25)';
      }}
      aria-label={`Contact via ${platform}`}
    >
      <img src={icon} alt={`${platform} icon`} style={iconStyle} />
    </a>
  );
};

export default FloatingChatButton;