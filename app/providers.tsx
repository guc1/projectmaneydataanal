'use client';

import type { ReactNode } from 'react';

import { UploadProvider } from '@/components/upload/upload-context';

export function Providers({ children }: { children: ReactNode }) {
  return <UploadProvider>{children}</UploadProvider>;
}

export default Providers;
