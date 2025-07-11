import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { AuthProvider } from '@/components/providers/session-provider';
import { PlanProvider } from '@/components/providers/plan-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://apiradar.live'),
  title: 'API Radar',
  description: 'Live tracking of exposed API keys from millions of GitHub repositories. Discover leaks as they happen with unmatched detail and speed.',
  keywords: 'API keys, security, GitHub, leaks, monitoring, detection',
  authors: [{ name: 'Zaim Abbasi' }],
  creator: 'Zaim Abbasi',
  publisher: 'API Radar',
  robots: 'index, follow',
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
        {/* SEO Meta Tags */}
        <title>API Radar - Discover, Monitor, and Analyze Public APIs</title>
        <meta name="description" content="API Radar helps you discover, monitor, and analyze public APIs and code leaks from GitHub and other sources." />
        <meta name="keywords" content="apiradar, API Radar, public APIs, API monitoring, code leaks, GitHub APIs, security, leaks, monitoring, detection" />
        <link rel="canonical" href="https://apiradar.live" />

        {/* Open Graph */}
        <meta property="og:title" content="API Radar – Discover, Monitor, and Analyze Public APIs" />
        <meta property="og:description" content="API Radar helps you discover, monitor, and analyze public APIs and code leaks from GitHub and other sources." />
        <meta property="og:image" content="https://apiradar.live/og-image.png" />
        <meta property="og:url" content="https://apiradar.live" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="API Radar – Discover, Monitor, and Analyze Public APIs" />
        <meta name="twitter:description" content="API Radar helps you discover, monitor, and analyze public APIs and code leaks from GitHub and other sources." />
        <meta name="twitter:image" content="https://apiradar.live/og-image.png" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "API Radar",
            "url": "https://apiradar.live",
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
            "logo": "https://apiradar.live/logo/logo-png.png"
          })
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "API Radar",
            "description": "API Radar helps you discover, monitor, and analyze public APIs and code leaks from GitHub and other sources.",
            "brand": {
              "@type": "Brand",
              "name": "API Radar"
            }
          })
        }} />
        {/* Preload critical pages for faster navigation */}
        <link rel="prefetch" href="/explore" />
        <link rel="prefetch" href="/leaderboard" />
        
        {/* Preload critical fonts */}
        <link rel="preload" href="/logo/logo.ico" as="image" type="image/x-icon" />
        
        {/* Favicon */}
        <link rel="icon" href="/logo/logo-png.png" type="image/png" sizes="446x446" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//github.com" />
        <link rel="dns-prefetch" href="//linkedin.com" />
        
        {/* Preload critical CSS */}
        <link rel="preload" href="/globals.css" as="style" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <PlanProvider>
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
          </PlanProvider>
        </AuthProvider>
      </body>
    </html>
  );
}