"use client";

import { useEffect } from 'react';

export function HydrationFix() {
  useEffect(() => {
    const removeExtensionAttributes = () => {
      const attributes = ['bis_skin_checked', 'data-lastpass-icon-root', 'data-1p-ignore'];
      attributes.forEach((attr) => {
        const elements = document.querySelectorAll(`[${attr}]`);
        elements.forEach((el) => {
          el.removeAttribute(attr);
        });
      });
    };

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
      observer.disconnect();
    };
  }, []);

  return null;
}

