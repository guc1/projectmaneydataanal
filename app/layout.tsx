import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import Providers from './providers';
import { SiteHeader } from '@/components/layout/site-header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Project Maney Data Analysis',
  description:
    'Upload, explore, and filter Polymarket wallet intelligence with a modern data analysis cockpit.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background min-h-screen`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
