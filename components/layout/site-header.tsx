'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AccountSwitcher } from '@/components/accounts/account-switcher';
import { Button } from '@/components/ui/button';

const navigationItems = [
  { href: '/upload', label: 'Upload' },
  { href: '/filter', label: 'Filter' },
  { href: '/analysis', label: 'Analysis' }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.3em] text-accent transition hover:text-accent/80"
        >
          Project Maney
        </Link>

        <nav className="flex items-center gap-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={isActive ? 'shadow-lg shadow-accent/30' : undefined}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            );
          })}
          <AccountSwitcher />
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
