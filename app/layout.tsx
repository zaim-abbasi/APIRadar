import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'API Radar - Real-Time API Security Monitoring',
  description: 'Real-time monitoring of leaked API keys from public repositories. Discover vulnerabilities, learn from mistakes, and secure your code with API Radar.',
  keywords: 'API security, leaked keys, GitHub monitoring, security tools, developer tools, API Radar',
  authors: [{ name: 'API Radar Team' }],
  openGraph: {
    title: 'API Radar - Real-Time API Security Monitoring',
    description: 'Real-time monitoring of leaked API keys from public repositories.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Radar - Real-Time API Security Monitoring',
    description: 'Real-time monitoring of leaked API keys from public repositories.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 relative">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}