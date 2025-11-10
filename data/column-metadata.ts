export type ColumnDataType = 'numeric' | 'text' | 'percent' | 'currency' | 'ratio';

export interface ColumnMetadata {
  metric: string;
  what_it_is: string;
  data_type: ColumnDataType;
  higher_is: 'better' | 'worse' | 'depends';
  units_or_range?: string;
  average?: number;
  median?: number;
}
