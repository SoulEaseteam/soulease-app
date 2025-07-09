// src/components/ScrollToTop.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Apply custom font globally
    document.body.style.setProperty('font-family', '"Orson", sans-serif');
  }, [pathname]);

  return null;
};

export default ScrollToTop;