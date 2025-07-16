import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { AuthProvider } from '@/components/providers/session-provider';
import { PlanProvider } from '@/components/providers/plan-provider';
import { PlanDowngradeHandler } from '@/components/providers/plan-downgrade-handler';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from 'sonner';
import Analytics from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://apiradar.live'),
  title: 'API Radar',
  description: 'Live tracking of exposed API keys from millions of GitHub repositories. Discover leaks as they happen with unmatched detail and speed.',
  keywords: 'API keys, security, GitHub, leaks, monitoring, detection, OpenAI, Google Cloud, Gemini, API leak detector',
  authors: [{ name: 'Zaim Abbasi' }],
  creator: 'Zaim Abbasi',
  publisher: 'API Radar',
  robots: 'index, follow',
  alternates: {
    canonical: '/',
    languages: {
      'en': '/',
    },
  },
  openGraph: {
    title: 'API Radar - Real-time API Key Leak Detection',
    description: 'Live tracking of exposed API keys from millions of GitHub repositories.',
    type: 'website',
    locale: 'en_US',
    url: 'https://apiradar.live',
    images: [
      {
        url: 'https://apiradar.live/og-image.png',
        width: 1200,
        height: 630,
        alt: 'API Radar Open Graph Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Radar - Real-time API Key Leak Detection',
    description: 'Live tracking of exposed API keys from millions of GitHub repositories.',
    images: ['https://apiradar.live/og-image.png'],
    site: '@apiradar',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ef4444',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* SEO Meta Tags and Canonical handled by Next.js metadata */}
        {/* Favicon: fallback to logo-png.png if favicon.ico is missing */}
        <link rel="icon" href="/logo/logo-webp.webp" type="image/webp" sizes="446x446" />
        {/* Preload critical CSS (correct path) */}
        <link rel="preload" href="/app/globals.css" as="style" />
        {/* Open Graph & Twitter handled by Next.js metadata */}
        {/* JSON-LD Structured Data: WebSite and Organization with social profiles */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "API Radar",
            "url": "https://apiradar.live",
            "sameAs": [
              "https://github.com/zaim-abbasi",
              "https://www.linkedin.com/in/zaim-abbasi/"
            ],
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://apiradar.live/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "API Radar",
            "url": "https://apiradar.live",
            "logo": "https://apiradar.live/logo/logo-webp.webp",
            "sameAs": [
              "https://github.com/zaim-abbasi",
              "https://www.linkedin.com/in/zaim-abbasi/"
            ]
          })
        }} />
        {/* Google Analytics 4 (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-M8WZNWWCZL"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-M8WZNWWCZL');
          `
        }} />
        {/* Set screen size cookie for middleware-based mobile/tablet redirect */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function setScreenCookie() {
                var width = window.innerWidth;
                var value = 'desktop';
                if (width < 768) value = 'mobile';
                else if (width < 1024) value = 'tablet';
                var existing = document.cookie.match(/(?:^|; )apiradar_screen=([^;]*)/);
                if (!existing || existing[1] !== value) {
                  document.cookie = 'apiradar_screen=' + value + '; path=/; max-age=86400';
                }
              }
              setScreenCookie();
              window.addEventListener('resize', setScreenCookie);
            })();
          `
        }} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <PlanProvider>
            <PlanDowngradeHandler>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
              >
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
                <Toaster />
              </ThemeProvider>
            </PlanDowngradeHandler>
          </PlanProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}