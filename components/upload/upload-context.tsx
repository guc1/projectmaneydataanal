'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { ColumnMetadata } from '@/data/column-metadata';
import {
  parseDataset,
  parseDictionaryCsv,
  parseDictionaryJson,
  parseSummaryCsv,
  type DatasetRow,
  type DictionaryRecord,
  type SummaryStats
} from '@/lib/upload-parsers';
import { persistUpload, retrieveUpload, removeUpload } from '@/lib/uploads/storage';
import type { UploadSlotKey } from '@/lib/uploads/types';

export type { UploadSlotKey } from '@/lib/uploads/types';

type SelectedFiles = Record<UploadSlotKey, string | null>;
type UploadErrors = Record<UploadSlotKey, string | null>;

type UploadContextValue = {
  columnMetadata: ColumnMetadata[] | null;
  datasetColumns: string[] | null;
  datasetRows: DatasetRow[] | null;
  dictionary: DictionaryRecord[] | null;
  summaryStats: SummaryStats;
  selectedFiles: SelectedFiles;
  errors: UploadErrors;
  isReady: boolean;
  missing: UploadSlotKey[];
  registerFile: (slot: UploadSlotKey, file: File) => Promise<void>;
  clearFile: (slot: UploadSlotKey) => Promise<void>;
};

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

const EMPTY_FILES: SelectedFiles = { dataset: null, dictionary: null, summary: null };
const EMPTY_ERRORS: UploadErrors = { dataset: null, dictionary: null, summary: null };
const ALL_SLOTS: UploadSlotKey[] = ['dataset', 'dictionary', 'summary'];

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>(EMPTY_FILES);
  const [errors, setErrors] = useState<UploadErrors>(EMPTY_ERRORS);
  const [datasetColumns, setDatasetColumns] = useState<string[] | null>(null);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[] | null>(null);
  const [dictionary, setDictionary] = useState<DictionaryRecord[] | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});

  const clearSlotData = useCallback((slot: UploadSlotKey) => {
    setSelectedFiles((prev) => ({ ...prev, [slot]: null }));

    if (slot === 'dataset') {
      setDatasetColumns(null);
      setDatasetRows(null);
    }

    if (slot === 'dictionary') {
      setDictionary(null);
    }

    if (slot === 'summary') {
      setSummaryStats({});
    }
  }, []);

  const processUpload = useCallback(
    async (
      slot: UploadSlotKey,
      name: string,
      text: string,
      shouldPersist: boolean,
      mimeType?: string
    ) => {
      setErrors((prev) => ({ ...prev, [slot]: null }));

      try {
        switch (slot) {
          case 'dataset': {
            const { headers, rows } = parseDataset(text);
            if (headers.length === 0) {
              throw new Error('No columns detected in dataset.');
            }
            setDatasetColumns(headers);
            setDatasetRows(rows);
            break;
          }
          case 'dictionary': {
            const lowerName = name.toLowerCase();
            const records = lowerName.endsWith('.json') ? parseDictionaryJson(text) : parseDictionaryCsv(text);
            if (records.length === 0) {
              throw new Error('No columns detected in dictionary file.');
            }
            setDictionary(records);
            break;
          }
          case 'summary': {
            const stats = parseSummaryCsv(text);
            if (Object.keys(stats).length === 0) {
              throw new Error('No summary statistics found.');
            }
            setSummaryStats(stats);
            break;
          }
          default: {
            throw new Error('Unsupported upload slot.');
          }
        }

        setSelectedFiles((prev) => ({ ...prev, [slot]: name }));

        if (shouldPersist) {
          await persistUpload(slot, {
            name,
            content: text,
            mimeType,
            updatedAt: Date.now()
          });
        }
      } catch (error) {
        console.error(error);
        clearSlotData(slot);
        const message = error instanceof Error ? error.message : 'Failed to process file.';
        setErrors((prev) => ({ ...prev, [slot]: message }));

        if (!shouldPersist) {
          await removeUpload(slot);
        }

        throw error;
      }
    },
    [clearSlotData]
  );

  useEffect(() => {
    let isActive = true;

    const restorePersistedUploads = async () => {
      for (const slot of ALL_SLOTS) {
        const stored = await retrieveUpload(slot);
        if (!isActive || !stored) continue;

        try {
          await processUpload(slot, stored.name, stored.content, false, stored.mimeType);
        } catch (error) {
          if (!isActive) return;
          console.error('Failed to restore persisted upload', error);
          setErrors((prev) => ({ ...prev, [slot]: 'Stored file could not be restored. Please upload again.' }));
        }
      }
    };

    void restorePersistedUploads();

    return () => {
      isActive = false;
    };
  }, [processUpload]);

  const columnMetadata = useMemo<ColumnMetadata[] | null>(() => {
    if (!dictionary) {
      return null;
    }

    const datasetColumnSet = datasetColumns ? new Set(datasetColumns) : null;

    return dictionary
      .filter((entry) => (datasetColumnSet ? datasetColumnSet.has(entry.metric) : true))
      .map((entry) => ({
        ...entry,
        average: summaryStats[entry.metric]?.mean,
        median: summaryStats[entry.metric]?.median
      }));
  }, [dictionary, datasetColumns, summaryStats]);

  const missing = useMemo<UploadSlotKey[]>(() => {
    const slots: UploadSlotKey[] = [];
    if (!datasetColumns) slots.push('dataset');
    if (!dictionary) slots.push('dictionary');
    if (Object.keys(summaryStats).length === 0) slots.push('summary');
    return slots;
  }, [datasetColumns, dictionary, summaryStats]);

  const isReady = missing.length === 0 && (columnMetadata?.length ?? 0) > 0;

  const registerFile = useCallback(
    async (slot: UploadSlotKey, file: File) => {
      try {
        if (slot !== 'dictionary' && !file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Only CSV uploads are supported for dataset and summary.');
        }

        const text = await file.text();
        await processUpload(slot, file.name, text, true, file.type || undefined);
      } catch {
        // Errors are surfaced via the upload context state.
      }
    },
    [processUpload]
  );

  const clearFile = useCallback(
    async (slot: UploadSlotKey) => {
      setErrors((prev) => ({ ...prev, [slot]: null }));
      clearSlotData(slot);
      await removeUpload(slot);
    },
    [clearSlotData]
  );

  const value: UploadContextValue = {
    columnMetadata,
    datasetColumns,
    datasetRows,
    dictionary,
    summaryStats,
    selectedFiles,
    errors,
    isReady,
    missing,
    registerFile,
    clearFile
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadContext must be used within an UploadProvider.');
  }
  return context;
}
