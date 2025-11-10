'use client';

import type { PropsWithChildren } from 'react';

import { UploadProvider } from '@/components/upload/upload-context';

export function AppProviders({ children }: PropsWithChildren) {
  return <UploadProvider>{children}</UploadProvider>;
}
