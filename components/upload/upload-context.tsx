'use client';

import { createContext, useContext, useMemo, useState } from 'react';

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

export type UploadSlotKey = 'dataset' | 'dictionary' | 'summary';

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
  loadPreset: (preset: Partial<Record<UploadSlotKey, string | null>>) => void;
};

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

const EMPTY_FILES: SelectedFiles = { dataset: null, dictionary: null, summary: null };
const EMPTY_ERRORS: UploadErrors = { dataset: null, dictionary: null, summary: null };

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>(EMPTY_FILES);
  const [errors, setErrors] = useState<UploadErrors>(EMPTY_ERRORS);
  const [datasetColumns, setDatasetColumns] = useState<string[] | null>(null);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[] | null>(null);
  const [dictionary, setDictionary] = useState<DictionaryRecord[] | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});

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

  const registerFile = async (slot: UploadSlotKey, file: File) => {
    setErrors((prev) => ({ ...prev, [slot]: null }));

    try {
      const text = await file.text();

      switch (slot) {
        case 'dataset': {
          if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error('Only CSV datasets are supported at the moment.');
          }
          const { headers, rows } = parseDataset(text);
          if (headers.length === 0) {
            throw new Error('No columns detected in dataset.');
          }
          setDatasetColumns(headers);
          setDatasetRows(rows);
          break;
        }
        case 'dictionary': {
          const lowerName = file.name.toLowerCase();
          const records = lowerName.endsWith('.json')
            ? parseDictionaryJson(text)
            : parseDictionaryCsv(text);
          if (records.length === 0) {
            throw new Error('No columns detected in dictionary file.');
          }
          setDictionary(records);
          break;
        }
        case 'summary': {
          if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error('Summary upload must be a CSV file.');
          }
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

      setSelectedFiles((prev) => ({ ...prev, [slot]: file.name }));
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to process file.';
      setErrors((prev) => ({ ...prev, [slot]: message }));
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
      setSelectedFiles((prev) => ({ ...prev, [slot]: null }));
    }
  };

  const loadPreset = (preset: Partial<Record<UploadSlotKey, string | null>>) => {
    setSelectedFiles((previous) => ({
      dataset: preset.dataset ?? previous.dataset,
      dictionary: preset.dictionary ?? previous.dictionary,
      summary: preset.summary ?? previous.summary
    }));
  };

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
    loadPreset
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
