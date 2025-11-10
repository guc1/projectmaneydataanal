'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, FolderOpen, Save, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUploadContext, type UploadSlotKey } from '@/components/upload/upload-context';

const SLOT_LABELS: Record<UploadSlotKey, string> = {
  dataset: 'Account dataset',
  dictionary: 'Column dictionary',
  summary: 'Median & averages'
};

export default function PresetsPage() {
  const { selectedFiles, loadPreset } = useUploadContext();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('workspace-preset');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const normalizedName = presetName
      .trim()
      .replace(/\.json$/i, '')
      .replace(/[^a-z0-9-_]+/gi, '-');
    const downloadName = `${normalizedName || 'preset'}.json`;

    const payload = {
      dataset: selectedFiles.dataset ?? null,
      dictionary: selectedFiles.dictionary ?? null,
      summary: selectedFiles.summary ?? null
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadName;
    anchor.click();
    URL.revokeObjectURL(url);

    setError(null);
    setFeedback(`Preset saved as ${downloadName}.`);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<Record<UploadSlotKey, string | null>>;
      const sanitized: Partial<Record<UploadSlotKey, string | null>> = {};

      (Object.keys(SLOT_LABELS) as UploadSlotKey[]).forEach((key) => {
        const value = data[key];
        if (typeof value === 'string' || value === null) {
          sanitized[key] = value;
        }
      });

      loadPreset(sanitized);
      setFeedback('Preset loaded. Re-upload files if required to restore data.');
      setError(null);
    } catch (loadError) {
      console.error(loadError);
      setFeedback(null);
      setError('Failed to load preset. Ensure the JSON is valid.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 pb-16 pt-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-accent">Workspace presets</p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Save and restore your upload selections
          </h1>
          <p className="text-base text-muted-foreground">
            Export the current file paths or load a preset JSON to repopulate the account dataset, column dictionary, and
            median & averages uploads.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <ArrowLeft size={16} /> Back to workspace
          </Link>
        </Button>
      </div>

      <section className="mt-10 grid gap-6">
        <Card>
          <CardTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal size={20} /> Preset actions
          </CardTitle>
          <CardDescription>
            Download a preset JSON with your current selections or load one from disk to restore them later.
          </CardDescription>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="w-full max-w-xs">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Preset name
              </label>
              <Input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="workspace-preset"
                aria-label="Preset file name"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Saved as .json automatically. Only letters, numbers, dashes, and underscores are kept.
              </p>
            </div>
            <Button type="button" className="gap-2" onClick={handleSave}>
              <Save size={16} /> Save current state
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={handleLoadClick}>
              <FolderOpen size={16} /> Load preset
            </Button>
          </div>

          {(feedback || error) && (
            <p className={`mt-4 text-sm ${error ? 'text-red-400' : 'text-muted-foreground'}`}>
              {error ?? feedback}
            </p>
          )}
        </Card>

        <Card>
          <CardTitle className="text-xl">Current selections</CardTitle>
          <CardDescription>
            Review which file paths are linked to each slot before saving or after loading a preset.
          </CardDescription>

          <div className="mt-6 space-y-4">
            {(Object.keys(SLOT_LABELS) as UploadSlotKey[]).map((slot) => {
              const label = SLOT_LABELS[slot];
              const value = selectedFiles[slot];
              return (
                <div key={slot} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {value ? value : 'No file selected yet.'}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </main>
  );
}
