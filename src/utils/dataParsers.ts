import Papa from 'papaparse';

export interface AccountRecord {
  [key: string]: string | number | null;
}

export interface ColumnMetadata {
  metric: string;
  what_it_is: string;
  data_type: string;
  higher_is: string;
  units_or_range: string;
  notes_caveats?: string;
  average?: number | null;
  median?: number | null;
}

export type SummaryMap = Record<string, { average: number | null; median: number | null }>;

export function parseCsvFile<T = Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length) {
          reject(result.errors);
          return;
        }
        resolve(result.data);
      },
      error: (err) => reject(err)
    });
  });
}

export function normaliseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalised = trimmed
    .replace(/\s+/g, '')
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, '')
    .replace(/,/, '.');
  const numeric = Number(normalised);
  return Number.isNaN(numeric) ? null : numeric;
}

export function buildSummaryMap(rows: Record<string, string>[]): SummaryMap {
  const summary: SummaryMap = {};
  rows.forEach((row) => {
    const label = row[Object.keys(row)[0]]?.toLowerCase();
    if (!label || (label !== 'average' && label !== 'median')) {
      return;
    }
    Object.entries(row).forEach(([key, value]) => {
      if (key === Object.keys(row)[0]) {
        return;
      }
      if (!summary[key]) {
        summary[key] = { average: null, median: null };
      }
      const numeric = normaliseNumber(value ?? null);
      if (label === 'average') {
        summary[key].average = numeric;
      } else if (label === 'median') {
        summary[key].median = numeric;
      }
    });
  });
  return summary;
}

export function enhanceMetadata(
  metadataRows: Record<string, string>[],
  summary: SummaryMap
): ColumnMetadata[] {
  return metadataRows
    .map((row) => ({
      metric: row.metric?.trim() ?? '',
      what_it_is: row.what_it_is?.trim() ?? '',
      data_type: row.data_type?.trim() ?? '',
      higher_is: row.higher_is?.trim() ?? '',
      units_or_range: row.units_or_range?.trim() ?? '',
      notes_caveats: row.notes_caveats?.trim() ?? ''
    }))
    .filter((row) => row.metric)
    .map((row) => ({
      ...row,
      average: summary[row.metric]?.average ?? null,
      median: summary[row.metric]?.median ?? null
    }));
}

export function getValueForFilter(value: string | number | null | undefined): string | number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const numeric = normaliseNumber(trimmed);
  return numeric ?? trimmed;
}

export function convertRecords(records: Record<string, string>[]): AccountRecord[] {
  return records.map((record) => {
    const converted: AccountRecord = {};
    Object.entries(record).forEach(([key, value]) => {
      const parsed = getValueForFilter(value);
      converted[key] = parsed;
    });
    return converted;
  });
}
