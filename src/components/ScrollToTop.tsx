import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // ❌ ไม่ควรเซ็ต font-family ตรงนี้
  }, [pathname]);

  return null;
};

export default ScrollToTop;