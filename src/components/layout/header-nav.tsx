
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Waves, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import React from 'react';

const navigationItems = [
  { href: '/', label: 'Overview' },
  { href: '/asterdex', label: 'AsterDex' },
  // { href: '/edgex', label: 'EdgeX' }, // Removed EdgeX
];

export function HeaderNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Waves className="h-6 w-6 text-primary" />
          <span className="font-bold inline-block">EdgeView</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden flex-1 items-center space-x-1 sm:space-x-4 md:flex">
          {navigationItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary px-3 py-2 h-auto',
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-muted-foreground/80'
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        {/* Mobile Navigation Trigger */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-3/4 sm:w-1/2 pr-0 pt-8">
              <Link 
                href="/" 
                className="mb-8 flex items-center space-x-2 px-4" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Waves className="h-7 w-7 text-primary" />
                <span className="text-lg font-bold">EdgeView</span>
              </Link>
              <nav className="flex flex-col space-y-2 px-4">
                {navigationItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    asChild
                    className={cn(
                      'w-full justify-start text-base font-medium transition-colors hover:text-primary h-auto py-3',
                      pathname === item.href
                        ? 'text-primary bg-accent'
                        : 'text-muted-foreground hover:text-foreground/80'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
