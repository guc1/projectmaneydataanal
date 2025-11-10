import type { ColumnDataType } from '@/data/column-metadata';

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

export const TOTAL_SAMPLE_ROWS = 9428;

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

export function estimateFilteredRows(filterCount: number): number {
  const decayRate = 0.62;
  return Math.max(0, Math.round(TOTAL_SAMPLE_ROWS * Math.pow(decayRate, filterCount)));
}
