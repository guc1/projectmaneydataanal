import { UploadPanel } from '@/components/upload/upload-panel';

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Upload</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Stream files into the vault</h1>
        <p className="text-base text-muted-foreground">
          Capture new drops, annotate what changed, and browse every asset ever pushed through the workflow.
        </p>
      </header>
      <UploadPanel />
    </main>
  );
}
