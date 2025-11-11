'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, CloudUpload, Files, History, RefreshCcw, Trash2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUploadContext, type UploadSlotKey } from '@/components/upload/upload-context';

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
  isSelected: boolean;
}

type UploadResponse = {
  uploads: UploadRecord[];
  selected?: Record<string, string>;
};

type ExistingScope = 'all' | 'button';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function UploadSelectionList({
  records,
  selectedUploadId,
  targetKey,
  onSelect,
  onDeselect,
  onDelete,
  pendingSelectionId,
  pendingDeletionId,
  isAuthenticated
}: {
  records: UploadRecord[];
  selectedUploadId: string | null;
  targetKey: string;
  onSelect: (uploadId: string) => void;
  onDeselect: (uploadId: string) => void;
  onDelete: (uploadId: string) => void;
  pendingSelectionId: string | null;
  pendingDeletionId: string | null;
  isAuthenticated: boolean;
}) {
  if (records.length === 0) {
    return <p className="text-xs text-muted-foreground">No files available in this view yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-4 text-sm">
      {records.map((record) => {
        const isActive = record.buttonKey === targetKey && record.id === selectedUploadId;
        const isSelectedElsewhere = record.buttonKey !== targetKey && record.isSelected;
        const recordTarget = uploadTargets.find((target) => target.key === record.buttonKey);
        const canSelect = record.buttonKey === targetKey;
        const isSelecting = pendingSelectionId === record.id;
        const isDeleting = pendingDeletionId === record.id;

        return (
          <li
            key={record.id}
            className={`rounded-2xl border bg-background/80 p-4 transition ${
              isActive ? 'border-accent/60 shadow-lg shadow-accent/10' : 'border-border/60 hover:border-accent/40'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{record.fileName}</p>
                  {isActive && (
                    <Badge className="bg-accent/15 text-accent">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                    </Badge>
                  )}
                  {!isActive && isSelectedElsewhere && (
                    <Badge className="bg-muted/50 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Selected for {recordTarget?.title ?? record.buttonKey}
                    </Badge>
                  )}
                </div>
                {record.description && <p className="text-xs text-muted-foreground">{record.description}</p>}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {record.userImage ? (
                    <img
                      src={record.userImage}
                      alt={record.userName ?? 'Uploader'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-[11px] font-semibold uppercase">
                      {(record.userName ?? '?').slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p>{record.userName ?? 'Workspace analyst'}</p>
                    <p className="text-[10px]">{formatDate(record.uploadedAt)}</p>
                    <p className="text-[10px] text-muted-foreground/80">
                      Upload type: {recordTarget?.title ?? record.buttonKey}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2 self-stretch sm:flex-col sm:items-end">
                {canSelect ? (
                  isActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onDeselect(record.id)}
                      disabled={!isAuthenticated || pendingSelectionId !== null}
                    >
                      {isSelecting ? 'Clearing…' : 'Deselect'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onSelect(record.id)}
                      disabled={!isAuthenticated || pendingSelectionId !== null}
                    >
                      {isSelecting ? 'Selecting…' : 'Select'}
                    </Button>
                  )
                ) : (
                  <span className="rounded-full border border-border/60 px-3 py-1 text-[11px] text-muted-foreground">
                    Not selectable for this slot
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => onDelete(record.id)}
                  disabled={
                    !isAuthenticated ||
                    isDeleting ||
                    (pendingDeletionId !== null && pendingDeletionId !== record.id)
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {isDeleting ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function UploadCard({
  target,
  records,
  allRecords,
  selectedUploadId,
  onRefresh
}: {
  target: (typeof uploadTargets)[number];
  records: UploadRecord[];
  allRecords: UploadRecord[];
  selectedUploadId: string | null;
  onRefresh: () => Promise<void> | void;
}) {
  const { status } = useSession();
  const [mode, setMode] = useState<'idle' | 'upload'>('idle');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scope, setScope] = useState<ExistingScope>('button');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const isAuthenticated = status === 'authenticated';

  const visibleRecords = useMemo(() => (scope === 'all' ? allRecords : records), [scope, allRecords, records]);

  const selectedRecord = useMemo(() => {
    if (!selectedUploadId) {
      return null;
    }
    return allRecords.find((record) => record.id === selectedUploadId) ?? null;
  }, [allRecords, selectedUploadId]);

  useEffect(() => {
    if (!isDialogOpen) {
      setScope('button');
      setSelectionError(null);
    }
  }, [isDialogOpen]);

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
      setSelectionError(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseErrorMessage = (payload: unknown, fallback: string) => {
    if (!payload || typeof payload !== 'object') {
      return fallback;
    }
    if ('error' in payload) {
      const value = (payload as { error?: unknown }).error;
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object') {
        const firstMessage = Object.values(value as Record<string, unknown>)
          .flatMap((entry) => (Array.isArray(entry) ? entry : []))
          .find((entry): entry is string => typeof entry === 'string');
        if (firstMessage) {
          return firstMessage;
        }
      }
    }
    return fallback;
  };

  const handleSelect = async (uploadId: string) => {
    if (!isAuthenticated) {
      setSelectionError('Select an account before choosing files.');
      return;
    }

    setSelectionError(null);
    setPendingSelectionId(uploadId);

    try {
      const response = await fetch('/api/uploads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonKey: target.key, uploadId, select: true })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(parseErrorMessage(payload, 'Unable to select this file.'));
      }

      await Promise.resolve(onRefresh());
    } catch (err) {
      setSelectionError(err instanceof Error ? err.message : 'Unable to select this file.');
    } finally {
      setPendingSelectionId(null);
    }
  };

  const handleDeselect = async (uploadId: string) => {
    if (!isAuthenticated) {
      setSelectionError('Select an account before choosing files.');
      return;
    }

    setSelectionError(null);
    setPendingSelectionId(uploadId);

    try {
      const response = await fetch('/api/uploads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonKey: target.key, uploadId, select: false })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(parseErrorMessage(payload, 'Unable to clear the selection.'));
      }

      await Promise.resolve(onRefresh());
    } catch (err) {
      setSelectionError(err instanceof Error ? err.message : 'Unable to clear the selection.');
    } finally {
      setPendingSelectionId(null);
    }
  };

  const handleDelete = async (uploadId: string) => {
    if (!isAuthenticated) {
      setSelectionError('Select an account before managing files.');
      return;
    }

    setSelectionError(null);
    setPendingDeletionId(uploadId);

    try {
      const response = await fetch(`/api/uploads/${uploadId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(parseErrorMessage(payload, 'Unable to delete this file.'));
      }

      await Promise.resolve(onRefresh());
    } catch (err) {
      setSelectionError(err instanceof Error ? err.message : 'Unable to delete this file.');
    } finally {
      setPendingDeletionId(null);
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

      <div className="space-y-3">
        {selectedRecord ? (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{selectedRecord.fileName}</p>
                {selectedRecord.description && (
                  <p className="text-xs text-muted-foreground">{selectedRecord.description}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Selected {formatDate(selectedRecord.uploadedAt)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-accent hover:text-accent"
                onClick={() => handleDeselect(selectedRecord.id)}
                disabled={!isAuthenticated || pendingSelectionId !== null}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No file selected yet.</p>
            <p>Upload a new file or choose one from the vault.</p>
          </div>
        )}
        {selectionError && !isDialogOpen && (
          <p className="text-xs text-red-400">{selectionError}</p>
        )}
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

      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMode((prev) => (prev === 'upload' ? 'idle' : 'upload'))} disabled={!isAuthenticated}>
          <CloudUpload className="mr-2 h-4 w-4" /> {mode === 'upload' ? 'Close upload' : 'Upload'}
        </Button>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <Button size="sm" variant="outline">
              <Files className="mr-2 h-4 w-4" /> Existing
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 bg-background/95 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Choose an existing file
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">
                    Browse previous uploads, select the right asset, or clean up old entries.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
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

              <div className="mt-4 max-h-[420px] overflow-y-auto pr-2">
                {selectionError && <p className="mb-3 text-xs text-red-400">{selectionError}</p>}
                <UploadSelectionList
                  records={visibleRecords}
                  selectedUploadId={selectedUploadId}
                  targetKey={target.key}
                  onSelect={handleSelect}
                  onDeselect={handleDeselect}
                  onDelete={handleDelete}
                  pendingSelectionId={pendingSelectionId}
                  pendingDeletionId={pendingDeletionId}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
    </Card>
  );
}

export function UploadPanel() {
  const { ingestUpload, clearFile } = useUploadContext();
  const [allUploads, setAllUploads] = useState<UploadRecord[]>([]);
  const [uploadsByTarget, setUploadsByTarget] = useState<Record<string, UploadRecord[]>>({});
  const [selectedUploads, setSelectedUploads] = useState<Record<UploadSlotKey, string | null>>({
    dataset: null,
    dictionary: null,
    summary: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedSelectionsRef = useRef<Record<UploadSlotKey, string | null>>({
    dataset: null,
    dictionary: null,
    summary: null
  });

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
            return [target.key, (await response.json()) as UploadResponse] as const;
          })
        )
      ]);

      if (!allResponse.ok) {
        throw new Error('Failed to load uploads');
      }

      const allPayload = (await allResponse.json()) as UploadResponse;
      setAllUploads(allPayload.uploads);

      const mapped: Record<string, UploadRecord[]> = {};
      for (const [key, payload] of perTarget) {
        mapped[key] = payload.uploads ?? [];
      }
      setUploadsByTarget(mapped);

      const selectionMap: Record<UploadSlotKey, string | null> = {
        dataset: null,
        dictionary: null,
        summary: null
      };
      for (const target of uploadTargets) {
        const slot = target.key as UploadSlotKey;
        selectionMap[slot] = allPayload.selected?.[target.key] ?? null;
      }
      setSelectedUploads(selectionMap);
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

  useEffect(() => {
    let isActive = true;

    const syncSelectedUploads = async () => {
      const entries = Object.entries(selectedUploads) as [UploadSlotKey, string | null][];

      for (const [slot, uploadId] of entries) {
        const previousId = loadedSelectionsRef.current[slot];

        if (uploadId === previousId) {
          continue;
        }

        if (uploadId) {
          try {
            const response = await fetch(`/api/uploads/${uploadId}`);
            if (!response.ok) {
              throw new Error('Unable to load the selected file.');
            }

            const payload = (await response.json()) as {
              upload: { fileName: string };
              content: string;
              mimeType?: string;
            };

            const mimeType = payload.mimeType
              ? payload.mimeType
              : payload.upload.fileName.toLowerCase().endsWith('.json')
                ? 'application/json'
                : 'text/csv';

            await ingestUpload(slot, {
              name: payload.upload.fileName,
              content: payload.content,
              mimeType
            });

            if (!isActive) {
              return;
            }

            loadedSelectionsRef.current = {
              ...loadedSelectionsRef.current,
              [slot]: uploadId
            };
          } catch (err) {
            console.error(err);
            if (!isActive) {
              return;
            }
            setError((previous) => previous ?? 'Unable to sync selected files. Try refreshing.');
          }
        } else if (previousId) {
          try {
            await clearFile(slot);
          } finally {
            if (!isActive) {
              return;
            }
            loadedSelectionsRef.current = {
              ...loadedSelectionsRef.current,
              [slot]: null
            };
          }
        }
      }
    };

    void syncSelectedUploads();

    return () => {
      isActive = false;
    };
  }, [selectedUploads, ingestUpload, clearFile]);

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
            selectedUploadId={selectedUploads[target.key] ?? null}
            onRefresh={fetchUploads}
          />
        ))}
      </div>
    </section>
  );
}
