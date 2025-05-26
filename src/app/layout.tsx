
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { HeaderNav } from '@/components/layout/header-nav';
import Script from 'next/script';

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

// AdSense Publisher ID for Auto Ads and other ad units
const ADSENSE_PUBLISHER_ID = "ca-pub-8597282005680903";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Google AdSense script.
          Ensure Auto Ads are enabled in your AdSense account for this site (adsense.google.com).
          This script is necessary for Auto Ads and also for any manually placed ad units.
        */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <HeaderNav />
        {/* The main content padding-top might need adjustment if the header height changed significantly.
            The header itself is h-14. Current padding-top on main is calc(3.5rem + 1rem) or similar.
            3.5rem = 56px = h-14. The extra 1rem or 1.5rem is for spacing.
         */}
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 pt-[calc(3.5rem+1rem)] sm:pt-[calc(3.5rem+1.5rem)]"> {/* Adjusted padding-top slightly */}
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
