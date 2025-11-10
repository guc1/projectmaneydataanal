import { UploadPanel } from '@/components/upload/upload-panel';

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Upload</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Bring your Polymarket data together</h1>
        <p className="text-base text-muted-foreground">
          Provide the dataset, dictionary, and summary files to unlock filtering and future analyses.
        </p>
      </header>
      <UploadPanel />
    </main>
  );
}
