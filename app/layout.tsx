import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TravelMind AI - AI-Powered Travel Recommendations',
  description: 'Discover your perfect travel destination with AI-powered recommendations. Find hidden gems, generate itineraries, and match your travel preferences.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'TravelMind AI - AI-Powered Travel Recommendations',
    description: 'Discover your perfect travel destination with AI-powered recommendations.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelMind AI',
    description: 'AI-Powered Travel Recommendations on GenLayer Blockchain',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <div className="fixed inset-0 bg-world-map pointer-events-none z-0" />
        <div className="fixed inset-0 bg-dot-travel pointer-events-none z-0" />
        <div className="relative z-10">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
