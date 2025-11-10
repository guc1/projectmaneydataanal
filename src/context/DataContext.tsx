import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  AccountRecord,
  ColumnMetadata,
  SummaryMap,
  buildSummaryMap,
  convertRecords,
  enhanceMetadata,
  parseCsvFile
} from '../utils/dataParsers';

export interface DatasetState {
  records: AccountRecord[];
  metadata: ColumnMetadata[];
  summary: SummaryMap;
}

interface DataContextValue extends DatasetState {
  isReady: boolean;
  loadDataset: (file: File) => Promise<void>;
  loadMetadata: (file: File) => Promise<void>;
  loadSummary: (file: File) => Promise<void>;
  reset: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [metadataRows, setMetadataRows] = useState<Record<string, string>[]>([]);
  const [metadata, setMetadata] = useState<ColumnMetadata[]>([]);
  const [summary, setSummary] = useState<SummaryMap>({});

  const loadDataset = async (file: File) => {
    const data = await parseCsvFile<Record<string, string>>(file);
    setRecords(convertRecords(data));
  };

  const loadMetadata = async (file: File) => {
    const data = await parseCsvFile<Record<string, string>>(file);
    setMetadataRows(data);
    setMetadata(enhanceMetadata(data, summary));
  };

  const loadSummary = async (file: File) => {
    const rows = await parseCsvFile<Record<string, string>>(file);
    const summaryMap = buildSummaryMap(rows);
    setSummary(summaryMap);
    setMetadata((prev) => enhanceMetadata(metadataRows, summaryMap));
  };

  const reset = () => {
    setRecords([]);
    setMetadata([]);
    setMetadataRows([]);
    setSummary({});
  };

  const value = useMemo<DataContextValue>(
    () => ({
      records,
      metadata,
      summary,
      isReady: Boolean(records.length && metadata.length),
      loadDataset,
      loadMetadata,
      loadSummary,
      reset
    }),
    [records, metadata, summary]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = (): DataContextValue => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
