import type { ColumnDataType, ColumnMetadata } from '@/data/column-metadata';

type HigherIs = ColumnMetadata['higher_is'];

type DictionaryRecord = Omit<ColumnMetadata, 'average' | 'median'>;

type SummaryStats = Record<string, { mean?: number; median?: number }>;

const HIGHER_IS_VALUES: HigherIs[] = ['better', 'worse', 'depends'];
const DATA_TYPES: ColumnDataType[] = ['numeric', 'text', 'percent', 'currency', 'ratio'];

const DEFAULT_HIGHER_IS: HigherIs = 'depends';
const DEFAULT_DATA_TYPE: ColumnDataType = 'numeric';

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let insideQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell);
    currentCell = '';
  };

  const pushRow = () => {
    if (currentRow.length > 0 || rows.length === 0) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '\r') {
      continue;
    }

    if (char === '"') {
      if (insideQuotes && content[index + 1] === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      pushCell();
      continue;
    }

    if (char === '\n' && !insideQuotes) {
      pushCell();
      pushRow();
      continue;
    }

    currentCell += char;
  }

  if (insideQuotes) {
    throw new Error('Unterminated quoted value in CSV content.');
  }

  if (currentCell !== '' || currentRow.length > 0) {
    pushCell();
    pushRow();
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

function parseCsvToObjects(content: string): Array<Record<string, string>> {
  const rows = parseCsv(content);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((row) => {
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? '';
    });
    return entry;
  });
}

function normalizeHigherIs(value: string | undefined): HigherIs {
  if (!value) {
    return DEFAULT_HIGHER_IS;
  }

  const normalized = value.trim().toLowerCase();
  const match = HIGHER_IS_VALUES.find((candidate) => candidate === normalized);
  return match ?? DEFAULT_HIGHER_IS;
}

function normalizeDataType(value: string | undefined): ColumnDataType {
  if (!value) {
    return DEFAULT_DATA_TYPE;
  }

  const normalized = value.trim().toLowerCase();
  const match = DATA_TYPES.find((candidate) => candidate === normalized);
  return match ?? DEFAULT_DATA_TYPE;
}

export function parseDatasetHeaders(content: string): string[] {
  const rows = parseCsv(content);
  if (rows.length === 0) {
    return [];
  }
  return rows[0].map((header) => header.trim()).filter((header) => header.length > 0);
}

export function parseDictionaryCsv(content: string): DictionaryRecord[] {
  const entries = parseCsvToObjects(content);
  return entries
    .map((row) => ({
      metric: row.metric?.trim(),
      what_it_is: row.what_it_is?.trim() ?? '',
      data_type: normalizeDataType(row.data_type),
      higher_is: normalizeHigherIs(row.higher_is),
      units_or_range: row.units_or_range?.trim() ?? undefined
    }))
    .filter((row): row is DictionaryRecord => Boolean(row.metric));
}

export function parseDictionaryJson(content: string): DictionaryRecord[] {
  const parsed = JSON.parse(content) as Array<Record<string, unknown>>;
  return parsed
    .map((entry) => ({
      metric: typeof entry.metric === 'string' ? entry.metric.trim() : undefined,
      what_it_is: typeof entry.what_it_is === 'string' ? entry.what_it_is.trim() : '',
      data_type: normalizeDataType(typeof entry.data_type === 'string' ? entry.data_type : undefined),
      higher_is: normalizeHigherIs(typeof entry.higher_is === 'string' ? entry.higher_is : undefined),
      units_or_range: typeof entry.units_or_range === 'string' ? entry.units_or_range.trim() : undefined
    }))
    .filter((row): row is DictionaryRecord => Boolean(row.metric));
}

function parseLocaleNumber(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return Number.NaN;
  }

  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  let normalized = trimmed;

  if (hasComma && !hasDot) {
    normalized = trimmed.replace(/\./g, '').replace(/,/g, '.');
  } else {
    normalized = trimmed.replace(/,/g, '');
  }

  return Number(normalized);
}

export function parseSummaryCsv(content: string): SummaryStats {
  const rows = parseCsvToObjects(content);
  const stats: SummaryStats = {};

  rows.forEach((row) => {
    const statKey = (row.stat ?? row.Stat ?? row.STAT ?? '').trim().toLowerCase();
    if (!statKey) {
      return;
    }

    Object.entries(row).forEach(([key, rawValue]) => {
      if (key.toLowerCase() === 'stat') {
        return;
      }

      const numericValue = parseLocaleNumber(rawValue);
      if (Number.isNaN(numericValue)) {
        return;
      }

      if (!stats[key]) {
        stats[key] = {};
      }

      if (statKey === 'mean' || statKey === 'average') {
        stats[key].mean = numericValue;
      } else if (statKey === 'median') {
        stats[key].median = numericValue;
      }
    });
  });

  return stats;
}

export type { DictionaryRecord, SummaryStats };
