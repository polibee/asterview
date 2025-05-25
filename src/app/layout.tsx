
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { HeaderNav } from '@/components/layout/header-nav';
import Script from 'next/script';
// Removed AdSenseAdUnit import as it's not used directly here anymore for the header ad, but could be for body ads.
// import { AdSenseAdUnit } from '@/components/ads/adsense-ad-unit'; 

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EdgeView - Exchange Data Visualizer',
  description: 'Displaying and visualizing data from AsterDex exchange.',
};

// Updated with the user's AdSense Publisher ID
const ADSENSE_PUBLISHER_ID = "ca-pub-8597282005680903"; 
// Example: const HEADER_AD_SLOT_ID = "YOUR_HEADER_AD_SLOT_ID"; // This specific slot is now handled in header-nav.tsx


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive" 
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <HeaderNav />
        {/* If you want a banner ad directly below the header but outside of its sticky behavior, you could place an <AdSenseAdUnit> here */}
        {/* Example: <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={SOME_OTHER_SLOT_ID} className="my-2 container" /> */}

        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 pt-[calc(3.5rem+1rem)] sm:pt-[calc(3.5rem+1.5rem)]"> {/* Adjusted padding-top slightly */}
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
