declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const GA_ID = 'G-M8WZNWWCZL';

export const pageview = (url: string) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag('config', GA_ID, {
    page_path: url,
  });
}; 