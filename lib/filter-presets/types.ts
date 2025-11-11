import type { ColumnDataType } from '@/data/column-metadata';
import type { FilterOperator } from '@/lib/filters';

export interface FilterTemplatePayload {
  columnKey: string;
  columnLabel: string;
  dataType: ColumnDataType;
  operator: FilterOperator;
  value: string | number | [number, number];
  description?: string | null;
}

export interface PresetAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface SavedPresetRecord {
  id: string;
  name: string;
  template: FilterTemplatePayload;
  createdAt: string;
  createdBy: PresetAuthor;
}

export interface SavedPresetChainRecord {
  id: string;
  name: string;
  templates: FilterTemplatePayload[];
  createdAt: string;
  createdBy: PresetAuthor;
}
