import type { ColumnDataType } from '@/data/column-metadata';
import type { DatasetRow } from '@/lib/upload-parsers';

export type NumericOperator = 'range' | 'greaterThan' | 'lessThan';
export type TextOperator = 'equals' | 'contains';
export type PercentOperator = 'range' | 'greaterThan' | 'lessThan';
export type RatioOperator = NumericOperator;
export type CurrencyOperator = NumericOperator;

export type FilterOperator =
  | { type: 'numeric'; operator: NumericOperator }
  | { type: 'percent'; operator: PercentOperator }
  | { type: 'ratio'; operator: RatioOperator }
  | { type: 'currency'; operator: CurrencyOperator }
  | { type: 'text'; operator: TextOperator };

export interface FilterDefinition {
  id: string;
  columnKey: string;
  columnLabel: string;
  dataType: ColumnDataType;
  operator: FilterOperator;
  value: string | number | [number, number];
  description: string;
}

export function getAvailableOperators(dataType: ColumnDataType): FilterOperator['operator'][] {
  switch (dataType) {
    case 'numeric':
    case 'currency':
    case 'ratio':
      return ['range', 'greaterThan', 'lessThan'];
    case 'percent':
      return ['range', 'greaterThan', 'lessThan'];
    case 'text':
    default:
      return ['equals', 'contains'];
  }
}

export function describeOperator(operator: FilterOperator['operator']): string {
  switch (operator) {
    case 'range':
      return 'Within range';
    case 'greaterThan':
      return 'Greater than';
    case 'lessThan':
      return 'Less than';
    case 'equals':
      return 'Exact match';
    case 'contains':
      return 'Contains text';
    default:
      return 'Custom';
  }
}

function parseNumericValue(rawValue: string | undefined): number {
  if (!rawValue) {
    return Number.NaN;
  }

  const trimmed = rawValue.trim();
  if (trimmed === '' || /^nan$/i.test(trimmed)) {
    return Number.NaN;
  }

  const withoutPercent = trimmed.endsWith('%') ? trimmed.slice(0, -1) : trimmed;
  const sanitized = withoutPercent.replace(/[^0-9,.-]/g, '');

  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');

  let normalized = sanitized;

  if (hasComma && !hasDot) {
    normalized = sanitized.replace(/\./g, '').replace(/,/g, '.');
  } else {
    normalized = sanitized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function matchesNumericOperator(value: number, operator: FilterDefinition['operator']['operator'], target: FilterDefinition['value']): boolean {
  if (Number.isNaN(value)) {
    return false;
  }

  switch (operator) {
    case 'range': {
      if (!Array.isArray(target)) {
        return false;
      }
      const [first, second] = target;
      const lowerBound = Math.min(first, second);
      const upperBound = Math.max(first, second);
      return value >= lowerBound && value <= upperBound;
    }
    case 'greaterThan':
      return typeof target === 'number' ? value > target : false;
    case 'lessThan':
      return typeof target === 'number' ? value < target : false;
    default:
      return false;
  }
}

function matchesTextOperator(value: string, operator: FilterDefinition['operator']['operator'], target: FilterDefinition['value']): boolean {
  const normalizedValue = value.toLowerCase();
  const normalizedTarget = String(target).toLowerCase();

  switch (operator) {
    case 'equals':
      return normalizedValue === normalizedTarget;
    case 'contains':
      return normalizedValue.includes(normalizedTarget);
    default:
      return false;
  }
}

export function rowMatchesFilter(row: DatasetRow, filter: FilterDefinition): boolean {
  const rawValue = row[filter.columnKey] ?? '';

  switch (filter.operator.type) {
    case 'text':
      return matchesTextOperator(rawValue, filter.operator.operator, filter.value);
    case 'numeric':
    case 'currency':
    case 'ratio':
    case 'percent': {
      const numericValue = parseNumericValue(rawValue);
      return matchesNumericOperator(numericValue, filter.operator.operator, filter.value);
    }
    default:
      return false;
  }
}

export function applyFilters(rows: DatasetRow[], filters: FilterDefinition[]): DatasetRow[] {
  if (filters.length === 0) {
    return rows;
  }

  return rows.filter((row) => filters.every((filter) => rowMatchesFilter(row, filter)));
}
