'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-sm font-medium text-foreground transition hover:bg-white/10"
      >
        <span>{title}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : '')} />
      </button>
      {open ? <div className="border-t border-white/10 px-5 py-4 text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}
