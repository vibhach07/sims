import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  const prevPathname = useRef(pathname);
  const navType = useNavigationType();

  useEffect(() => {
    // Leave browser Back/Forward (POP) alone where the browser restores it
    if (navType === 'POP' && prevPathname.current === pathname) {
      return;
    }

    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (hash) {
        setTimeout(() => {
          const id = hash.replace('#', '');
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView();
          } else {
            window.scrollTo(0, 0);
          }
        }, 0);
      } else {
        window.scrollTo(0, 0);
      }
    } else if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollToTop;
