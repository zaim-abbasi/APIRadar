"use client";

import { useEffect } from 'react';

export function HydrationFix() {
  useEffect(() => {
    const setScreenCookie = () => {
      const width = window.innerWidth;
      let value = 'desktop';
      if (width < 768) value = 'mobile';
      else if (width < 1024) value = 'tablet';
      const existing = document.cookie.match(/(?:^|; )apiradar_screen=([^;]*)/);
      if (!existing || existing[1] !== value) {
        document.cookie = `apiradar_screen=${value}; path=/; max-age=86400`;
      }
    };

    const removeExtensionAttributes = () => {
      const attributes = ['bis_skin_checked', 'data-lastpass-icon-root', 'data-1p-ignore'];
      attributes.forEach((attr) => {
        const elements = document.querySelectorAll(`[${attr}]`);
        elements.forEach((el) => {
          el.removeAttribute(attr);
        });
      });
    };

    setScreenCookie();
    window.addEventListener('resize', setScreenCookie);

    removeExtensionAttributes();

    const observer = new MutationObserver(() => {
      removeExtensionAttributes();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['bis_skin_checked', 'data-lastpass-icon-root', 'data-1p-ignore'],
      });
    }

    return () => {
      window.removeEventListener('resize', setScreenCookie);
      observer.disconnect();
    };
  }, []);

  return null;
}

