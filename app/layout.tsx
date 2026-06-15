import React from 'react';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { AuthProvider } from '@/components/providers/session-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/sonner';
import Analytics from '@/components/Analytics';
import { HydrationFix } from '@/components/hydration-fix';

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', 'arial']
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  metadataBase: new URL('https://apiradar.live'),
  title: 'APIRadar',
  description: 'Live tracking of exposed API keys from millions of GitHub repositories. Analyze exposure trends to mitigate organizational security risks with unmatched detail and speed.',
  keywords: 'API keys, security, GitHub, exposures, monitoring, detection, OpenAI, Google Cloud, Gemini, API exposure detector',
  authors: [{ name: 'Zaim Abbasi' }],
  creator: 'Zaim Abbasi',
  publisher: 'APIRadar',
  robots: 'index, follow',
  alternates: {
    canonical: '/',
    languages: {
      'en': '/',
    },
  },
  openGraph: {
    title: 'APIRadar - Real-time API Key Exposure Monitoring',
    description: 'Live tracking of exposed API keys from millions of GitHub repositories.',
    type: 'website',
    locale: 'en_US',
    url: 'https://apiradar.live',
    images: [
      {
        url: 'https://apiradar.live/og-image.png',
        width: 1200,
        height: 630,
        alt: 'APIRadar Open Graph Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APIRadar - Real-time API Key Leak Detection',
    description: 'Live tracking of exposed API keys from millions of GitHub repositories.',
    images: ['https://apiradar.live/og-image.png'],
    site: '@apiradar',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#222222',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://accounts.google.com" crossOrigin="anonymous" />
        {/* SEO Meta Tags and Canonical handled by Next.js metadata */}
        <link rel="icon" href="/logo/transparent_logo.webp" type="image/webp" sizes="446x446" />
        <link rel="privacy-policy" href="/privacy" />
        <link rel="terms-of-service" href="/terms" />
        {/* Open Graph & Twitter handled by Next.js metadata */}
      </head>
      <body className={`${inter.className} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        {/* JSON-LD Structured Data: WebSite and Organization */}
        <Script
          id="json-ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "APIRadar",
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
          }}
        />
        <Script
          id="json-ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "APIRadar",
              "url": "https://apiradar.live",
              "logo": "https://apiradar.live/logo/transparent_logo.webp",
              "sameAs": [
                "https://github.com/zaim-abbasi",
                "https://www.linkedin.com/in/zaim-abbasi/"
              ]
            })
          }}
        />

        {/* Google Analytics 4 (gtag.js) */}
        <Script
          id="gtag-load"
          src="https://www.googletagmanager.com/gtag/js?id=G-M8WZNWWCZL"
          strategy="afterInteractive"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-M8WZNWWCZL');
            `
          }}
        />

        <AuthProvider>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col" suppressHydrationWarning>
              <Navbar />
              <main className="flex-1 pt-[50px]">
                <React.Suspense fallback={null}>
                  {children}
                </React.Suspense>
              </main>
              <Footer />
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <HydrationFix />
        <Analytics />
      </body>
    </html>
  );
}