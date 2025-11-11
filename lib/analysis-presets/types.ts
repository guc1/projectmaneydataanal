import type { ColumnDataType } from '@/data/column-metadata';

export type AnalysisOperator = '+' | '-' | '*' | '/';

export type AnalysisMethodId =
  | 'bell-curve-distance'
  | 'conditional-flag'
  | 'one-sided-distance'
  | 'zero-to-one-scaling'
  | 'distribution-density'
  | 'significance-flag';

export type OneSidedBaselineMode = 'average' | 'median' | 'custom';
export type OneSidedSide = 'left' | 'right';
export type ScalingCurve = 'linear' | 'quadratic' | 'exponential' | 'logarithmic';

export type OneSidedConfig = {
  kind: 'one-sided';
  baselineMode: OneSidedBaselineMode;
  baselineValue: number;
  side: OneSidedSide;
  scaling: ScalingCurve;
  slope: number;
};

export type ZeroToOneScaling = 'linear' | 'exponential' | 'logarithmic';

export type ZeroToOneConfig = {
  kind: 'zero-to-one';
  scaling: ZeroToOneScaling;
  slope: number;
};

export type DistributionScaling = 'linear' | 'exponential' | 'logarithmic';
export type DistributionRewardMode = 'least' | 'most';

export type DistributionConfig = {
  kind: 'distribution';
  buckets: number;
  scaling: DistributionScaling;
  slope: number;
  reward: DistributionRewardMode;
};

export type SignificanceConfig = {
  kind: 'significance';
  significanceLevel: number;
  mode: 'one-sided' | 'two-sided';
  tail: 'lower' | 'upper';
  flagSignificant: boolean;
};

export type ConditionalFlagConfig =
  | {
      kind: 'conditional-flag';
      mode: 'binary';
      trueValue: string;
    }
  | {
      kind: 'conditional-flag';
      mode: 'boolean';
      trueValue?: string;
    }
  | {
      kind: 'conditional-flag';
      mode: 'min';
      threshold: number;
    }
  | {
      kind: 'conditional-flag';
      mode: 'max';
      threshold: number;
    }
  | {
      kind: 'conditional-flag';
      mode: 'range';
      min: number;
      max: number;
    };

export type AnalysisStepConfig =
  | ConditionalFlagConfig
  | OneSidedConfig
  | ZeroToOneConfig
  | DistributionConfig
  | SignificanceConfig;

export const DEFAULT_ANALYSIS_WEIGHT = 1;

export interface AnalysisTemplatePayload {
  columnKey: string;
  columnLabel: string;
  dataType: ColumnDataType;
  methodId: AnalysisMethodId;
  methodName: string;
  description?: string | null;
  weight?: number;
  config?: AnalysisStepConfig;
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
