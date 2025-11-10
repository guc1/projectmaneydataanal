'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudUpload, Files, History, RefreshCcw } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const uploadTargets = [
  {
    key: 'dataset',
    title: 'Alpha Upload',
    description: 'Push the latest wallet-level intelligence for deep dives.',
    helper: 'Upload CSV, JSON, or Parquet files captured from internal scrapes.'
  },
  {
    key: 'dictionary',
    title: 'Signals Upload',
    description: 'Enrich the workspace with dictionary-level annotations.',
    helper: 'Document metrics, transformations, and any caveats the team should know.'
  },
  {
    key: 'summary',
    title: 'Context Upload',
    description: 'Share summary slices that accelerate comparisons.',
    helper: 'Drop quick stats or curated snapshots to align on the bigger picture.'
  }
] as const;

interface UploadRecord {
  id: string;
  fileName: string;
  description: string | null;
  buttonKey: string;
  uploadedAt: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
}

type ExistingScope = 'all' | 'button';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function UploadList({ records }: { records: UploadRecord[] }) {
  if (records.length === 0) {
    return <p className="text-xs text-muted-foreground">No files yet for this view.</p>;
  }

  return (
    <ul className="mt-3 space-y-3 text-sm">
      {records.map((record) => (
        <li
          key={record.id}
          className="rounded-lg border border-border/60 bg-background/60 p-3 shadow-sm transition hover:border-accent/50"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{record.fileName}</p>
              {record.description && <p className="text-xs text-muted-foreground">{record.description}</p>}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {record.userImage ? (
                <img src={record.userImage} alt={record.userName ?? 'Uploader'} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-[11px] font-semibold uppercase">
                  {(record.userName ?? '?').slice(0, 2)}
                </div>
              )}
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">
                  {record.userName ?? 'Workspace analyst'}
                </p>
                <p className="text-[10px] text-muted-foreground">{formatDate(record.uploadedAt)}</p>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function UploadCard({
  target,
  records,
  allRecords,
  onRefresh
}: {
  target: (typeof uploadTargets)[number];
  records: UploadRecord[];
  allRecords: UploadRecord[];
  onRefresh: () => void;
}) {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<'idle' | 'upload' | 'existing'>('idle');
  const [scope, setScope] = useState<ExistingScope>('button');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  const visibleRecords = useMemo(() => (scope === 'all' ? allRecords : records), [scope, allRecords, records]);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError('Select a file to upload.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('buttonKey', target.key);
      if (description.trim()) {
        body.append('description', description.trim());
      }

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload.error === 'string' ? payload.error : 'Upload failed.';
        throw new Error(message);
      }

      setFile(null);
      setDescription('');
      setMode('idle');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="flex h-full flex-col gap-4">
      <div>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CloudUpload className="h-5 w-5 text-accent" />
          {target.title}
        </CardTitle>
        <CardDescription>{target.description}</CardDescription>
        <p className="mt-2 text-xs text-muted-foreground">{target.helper}</p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMode('upload')} disabled={!isAuthenticated}>
          <CloudUpload className="mr-2 h-4 w-4" /> Upload
        </Button>
        <Button
          size="sm"
          variant={mode === 'existing' ? 'default' : 'outline'}
          onClick={() => setMode('existing')}
        >
          <Files className="mr-2 h-4 w-4" /> Existing
        </Button>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {mode === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          {!isAuthenticated && (
            <p className="text-xs text-red-400">Select an account before uploading.</p>
          )}
          <Input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            disabled={!isAuthenticated}
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a short description for this upload"
            rows={3}
            className="w-full rounded-lg border border-border/60 bg-background/50 p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            maxLength={500}
            disabled={!isAuthenticated}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={!isAuthenticated || isSubmitting}>
            {isSubmitting ? 'Uploading…' : 'Save to workspace'}
          </Button>
        </form>
      )}

      {mode === 'existing' && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex items-center gap-2 text-xs">
            <Button
              type="button"
              size="sm"
              variant={scope === 'all' ? 'default' : 'outline'}
              onClick={() => setScope('all')}
            >
              <History className="mr-2 h-3 w-3" /> All files
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scope === 'button' ? 'default' : 'outline'}
              onClick={() => setScope('button')}
            >
              <CloudUpload className="mr-2 h-3 w-3" /> This button
            </Button>
          </div>
          <UploadList records={visibleRecords} />
        </div>
      )}
    </Card>
  );
}

export function UploadPanel() {
  const [allUploads, setAllUploads] = useState<UploadRecord[]>([]);
  const [uploadsByTarget, setUploadsByTarget] = useState<Record<string, UploadRecord[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allResponse, perTarget] = await Promise.all([
        fetch('/api/uploads?scope=all'),
        Promise.all(
          uploadTargets.map(async (target) => {
            const response = await fetch(`/api/uploads?scope=button&buttonKey=${target.key}`);
            if (!response.ok) {
              throw new Error('Failed to load uploads');
            }
            return [target.key, (await response.json()) as { uploads: UploadRecord[] }] as const;
          })
        )
      ]);

      if (!allResponse.ok) {
        throw new Error('Failed to load uploads');
      }

      const allPayload = (await allResponse.json()) as { uploads: UploadRecord[] };
      setAllUploads(allPayload.uploads);

      const mapped: Record<string, UploadRecord[]> = {};
      for (const [key, payload] of perTarget) {
        mapped[key] = payload.uploads ?? [];
      }
      setUploadsByTarget(mapped);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch uploads. Try refreshing later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUploads();
  }, [fetchUploads]);

  return (
    <section className="mt-12">
      <div className="max-w-3xl space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">Workspace vault</h2>
        <p className="text-base text-muted-foreground">
          Upload fresh signals, annotate what matters, and browse the institutional history of your drops.
        </p>
        {isLoading && <p className="text-xs text-muted-foreground">Refreshing uploads…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {uploadTargets.map((target) => (
          <UploadCard
            key={target.key}
            target={target}
            records={uploadsByTarget[target.key] ?? []}
            allRecords={allUploads}
            onRefresh={fetchUploads}
          />
        ))}
      </div>
    </section>
  );
}
