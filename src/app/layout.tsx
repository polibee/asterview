
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 
          Google AdSense Script
          IMPORTANT: Replace 'ca-pub-YOUR_PUBLISHER_ID' with your actual AdSense publisher ID.
        */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID"
          crossOrigin="anonymous"
          strategy="afterInteractive" 
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <HeaderNav />
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 pt-[calc(3.5rem+2rem)] sm:pt-[calc(3.5rem+2.5rem)]"> {/* Adjusted padding-top */}
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
