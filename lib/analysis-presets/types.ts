import type { ColumnDataType } from '@/data/column-metadata';

export type AnalysisOperator = '+' | '-' | '*' | '/';

export type AnalysisMethodId = 'bell-curve-distance';

export interface AnalysisTemplatePayload {
  columnKey: string;
  columnLabel: string;
  dataType: ColumnDataType;
  methodId: AnalysisMethodId;
  methodName: string;
  description?: string | null;
}

export interface AnalysisChainPayload {
  resultName: string;
  steps: AnalysisTemplatePayload[];
  operators: AnalysisOperator[];
}

export interface PresetAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface SavedAnalysisPresetRecord {
  id: string;
  name: string;
  template: AnalysisTemplatePayload;
  createdAt: string;
  createdBy: PresetAuthor;
}

export interface SavedAnalysisChainRecord {
  id: string;
  name: string;
  chain: AnalysisChainPayload;
  createdAt: string;
  createdBy: PresetAuthor;
}
