import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'API Radar - Real-time API Key Leak Detection',
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Radar - Real-time API Key Leak Detection',
    description: 'Live tracking of exposed API keys from millions of GitHub repositories.',
  },
  viewport: 'width=device-width, initial-scale=1',
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
        {/* Preload critical pages for faster navigation */}
        <link rel="prefetch" href="/explore" />
        <link rel="prefetch" href="/leaderboard" />
        
        {/* Preload critical fonts */}
        <link rel="preload" href="/logo/logo.ico" as="image" type="image/x-icon" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//github.com" />
        <link rel="dns-prefetch" href="//linkedin.com" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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
        </ThemeProvider>
      </body>
    </html>
  );
}