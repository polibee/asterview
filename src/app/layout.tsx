
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarRail, // Added SidebarRail
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { LayoutDashboard, CandlestickChart, BarChart3, Waves } from 'lucide-react';

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
  description: 'Displaying and visualizing data from EdgeX and AsterDex exchanges.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <SidebarProvider defaultOpen>
          <Sidebar> {/* Default collapsible prop is "offcanvas" which works with SidebarRail */}
            <SidebarHeader>
              <Link href="/" className="flex items-center gap-2 px-2 py-1 group">
                <Waves className="h-7 w-7 text-sidebar-primary" />
                <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  EdgeView
                </span>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/">
                      <LayoutDashboard />
                      <span className="group-data-[collapsible=icon]:hidden">Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/asterdex">
                      <CandlestickChart />
                      <span className="group-data-[collapsible=icon]:hidden">AsterDex</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/edgex">
                      <BarChart3 />
                      <span className="group-data-[collapsible=icon]:hidden">EdgeX</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarRail /> {/* Added this component to enable desktop collapse/expand */}
          <SidebarInset>
            <div className="flex flex-col min-h-screen bg-muted/30">
              <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
                <SidebarTrigger />
                <Link href="/" className="flex items-center gap-2">
                  <Waves className="h-6 w-6 text-primary" />
                  <h1 className="text-lg font-semibold">EdgeView</h1>
                </Link>
              </header>
              <main className="flex-grow">
                {children}
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
