'use client';

import { useId } from 'react';
import { CloudUpload, FileCheck2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { useUploadContext, type UploadSlotKey } from './upload-context';

interface UploadSlot {
  key: UploadSlotKey;
  title: string;
  description: string;
  helper: string;
  accept: string;
  cta: string;
}

const uploadSlots: UploadSlot[] = [
  {
    key: 'dataset',
    title: 'Account dataset',
    description: 'Upload the CSV export with wallet-level metrics for analysis.',
    helper: 'Accepts .csv or .parquet files up to 200 MB.',
    accept: '.csv,.parquet',
    cta: 'Upload dataset'
  },
  {
    key: 'dictionary',
    title: 'Column dictionary',
    description: 'Provide the data dictionary that explains each metric.',
    helper: 'Accepts .csv, .json with columns: metric, what_it_is, data_type, higher_is, units_or_range.',
    accept: '.csv,.json',
    cta: 'Upload dictionary'
  },
  {
    key: 'summary',
    title: 'Median & averages',
    description: 'Upload aggregated statistics to enrich contextual insights.',
    helper: 'Accepts .csv with rows `median` and `average` mirroring dataset columns.',
    accept: '.csv',
    cta: 'Upload summary'
  }
];

export function UploadPanel() {
  const controlId = useId();
  const { selectedFiles, errors, registerFile } = useUploadContext();

  const handleFileChange = async (slot: UploadSlotKey, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await registerFile(slot, file);
    event.target.value = '';
  };

  return (
    <section className="mt-12">
      <div className="max-w-3xl space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">Upload your sources</h2>
        <p className="text-base text-muted-foreground">
          Consolidate the core artefacts for the analysis flow. Once uploaded, the platform will validate schemas and pre-compute
          the insights required for fast filtering and comparisons.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {uploadSlots.map((slot, index) => (
          <Card key={slot.key} className="h-full space-y-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CloudUpload size={18} className="text-accent" />
              {slot.title}
            </CardTitle>
            <CardDescription>{slot.description}</CardDescription>
            <p className="text-xs text-muted-foreground">{slot.helper}</p>

            <div>
              <input
                id={`${controlId}-${index}`}
                type="file"
                accept={slot.accept}
                onChange={(event) => void handleFileChange(slot.key, event)}
                className="hidden"
              />
              <Button asChild className="w-full justify-center">
                <label htmlFor={`${controlId}-${index}`} className="cursor-pointer">
                  {slot.cta}
                </label>
              </Button>
            </div>

            {selectedFiles[slot.key] && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
                <FileCheck2 size={16} />
                <span>{selectedFiles[slot.key]}</span>
              </div>
            )}
            {errors[slot.key] && <p className="text-xs text-red-400">{errors[slot.key]}</p>}
          </Card>
        ))}
      </div>
    </section>
  );
}
