'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

import { UploadProvider } from '@/components/upload/upload-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UploadProvider>{children}</UploadProvider>
    </SessionProvider>
  );
}

export default Providers;
