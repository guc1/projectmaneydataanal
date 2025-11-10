import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl flex-col items-center justify-center gap-10 px-6 py-12 text-center">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Project Maney</p>
        <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">Wallet Intelligence Workspace</h1>
        <p className="text-base text-muted-foreground">
          Upload the latest datasets or jump straight into filtering to uncover unusual wallet behaviour.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="w-48 justify-center gap-2">
          <a href="/upload">
            Upload <ArrowRight size={18} />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-48 justify-center gap-2">
          <a href="/filter">
            Filter <ArrowRight size={18} />
          </a>
        </Button>
      </div>
    </main>
  );
}
