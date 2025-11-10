import { useMemo, useState } from 'react';
import { AccountRecord } from '../utils/dataParsers';

export type NumericOperation = 'range' | 'greaterThan' | 'lessThan';
export type TextOperation = 'contains' | 'equals';
export type BooleanOperation = 'equals';

export type FilterOperation = NumericOperation | TextOperation | BooleanOperation;

export interface FilterDefinition {
  id: string;
  column: string;
  label: string;
  operation: FilterOperation;
  values: (string | number | null)[];
  dataType: 'number' | 'text' | 'boolean' | 'other';
}

const operationLabels: Record<FilterOperation, string> = {
  range: 'Within range',
  greaterThan: 'Greater than',
  lessThan: 'Less than',
  contains: 'Contains',
  equals: 'Equals'
};

export function getOperationLabel(operation: FilterOperation): string {
  return operationLabels[operation];
}

export function filterRecords(records: AccountRecord[], filters: FilterDefinition[]): AccountRecord[] {
  if (!filters.length) {
    return records;
  }
  return records.filter((record) =>
    filters.every((filter) => {
      const value = record[filter.column];
      if (value === undefined || value === null) {
        return false;
      }
      switch (filter.operation) {
        case 'range': {
          const [min, max] = filter.values as number[];
          if (typeof value !== 'number') {
            return false;
          }
          if (typeof min === 'number' && value < min) {
            return false;
          }
          if (typeof max === 'number' && value > max) {
            return false;
          }
          return true;
        }
        case 'greaterThan': {
          const [threshold] = filter.values as number[];
          if (typeof value !== 'number' || typeof threshold !== 'number') {
            return false;
          }
          return value > threshold;
        }
        case 'lessThan': {
          const [threshold] = filter.values as number[];
          if (typeof value !== 'number' || typeof threshold !== 'number') {
            return false;
          }
          return value < threshold;
        }
        case 'contains': {
          const [needle] = filter.values as string[];
          if (typeof value !== 'string' || typeof needle !== 'string') {
            return false;
          }
          return value.toLowerCase().includes(needle.toLowerCase());
        }
        case 'equals': {
          const [expected] = filter.values;
          if (typeof expected === 'boolean') {
            return String(value).toLowerCase() === String(expected).toLowerCase();
          }
          return String(value).toLowerCase() === String(expected).toLowerCase();
        }
        default:
          return true;
      }
    })
  );
}

export const useFilters = (initial: FilterDefinition[] = []) => {
  const [filters, setFilters] = useState<FilterDefinition[]>(initial);

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  };

  const clearFilters = () => setFilters([]);

  const updateFilters = (updater: (filters: FilterDefinition[]) => FilterDefinition[]) => {
    setFilters((prev) => updater(prev));
  };

  return useMemo(
    () => ({
      filters,
      setFilters,
      removeFilter,
      clearFilters,
      updateFilters
    }),
    [filters]
  );
};
