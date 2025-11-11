import type { ColumnMetadata } from '@/data/column-metadata';
import type { DatasetRow } from '@/lib/upload-parsers';
import {
  AnalysisMethodId,
  type AnalysisOperator,
  type AnalysisStepConfig,
  DEFAULT_ANALYSIS_WEIGHT,
  type ConditionalFlagConfig,
  type OneSidedConfig,
  type ZeroToOneConfig,
  type DistributionConfig,
  type SignificanceConfig
} from '@/lib/analysis-presets/types';

export type ParsedNumericColumn = (number | null)[];

type AnalysisMethodContext = {
  column: ColumnMetadata;
  values: ParsedNumericColumn;
  rawValues: (string | undefined)[];
};

type AnalysisComputation = {
  scores: (number | null)[];
  diagnostics: {
    mean: number;
    stdDev: number;
    maxZ: number;
  };
};

type AnalysisMethodDefinition = {
  id: AnalysisMethodId;
  name: string;
  description: string;
  shortDescription: string;
  compute: (context: AnalysisMethodContext, config?: AnalysisStepConfig) => AnalysisComputation;
};

const normaliseScore = (zScore: number, maxZ: number) => {
  if (!Number.isFinite(zScore) || maxZ <= 0) {
    return 0;
  }

  const denominator = Math.log1p(maxZ);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  const scaled = Math.log1p(zScore) / denominator;
  if (!Number.isFinite(scaled)) {
    return 0;
  }

  return Math.min(1, Math.max(0, scaled));
};

const computeDiagnostics = (scores: (number | null)[]): AnalysisComputation['diagnostics'] => {
  const numericScores = scores.filter((score): score is number => score !== null && Number.isFinite(score));

  if (numericScores.length === 0) {
    return { mean: 0, stdDev: 0, maxZ: 0 };
  }

  const mean = numericScores.reduce((acc, value) => acc + value, 0) / numericScores.length;
  const variance = numericScores.reduce((acc, value) => acc + (value - mean) ** 2, 0) / numericScores.length;
  const stdDev = Math.sqrt(variance);

  let maxZ = 0;
  if (stdDev > 0) {
    for (const value of numericScores) {
      const z = Math.abs(value - mean) / stdDev;
      if (Number.isFinite(z)) {
        maxZ = Math.max(maxZ, z);
      }
    }
  }

  return { mean, stdDev, maxZ };
};

const computeBellCurveDistance = ({ values }: AnalysisMethodContext): AnalysisComputation => {
  const numericValues = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (numericValues.length === 0) {
    return {
      scores: values.map(() => null),
      diagnostics: { mean: 0, stdDev: 0, maxZ: 0 }
    };
  }

  const mean = numericValues.reduce((acc, value) => acc + value, 0) / numericValues.length;
  const variance =
    numericValues.reduce((acc, value) => acc + (value - mean) ** 2, 0) / numericValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return {
      scores: values.map((value) => (value === null ? null : 0)),
      diagnostics: { mean, stdDev: 0, maxZ: 0 }
    };
  }

  const zScores = values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    return Math.abs(value - mean) / stdDev;
  });

  const maxZ = zScores.reduce((acc, value) => {
    if (value === null || !Number.isFinite(value)) {
      return acc;
    }
    return Math.max(acc, value);
  }, 0);

  const scores = zScores.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    if (maxZ === 0) {
      return 0;
    }
    return normaliseScore(value, maxZ);
  });

  return {
    scores,
    diagnostics: { mean, stdDev, maxZ }
  };
};

const normaliseRawText = (value: string | undefined) => value?.trim().toLowerCase() ?? '';

const isConditionalFlagConfig = (
  config: AnalysisStepConfig | undefined
): config is ConditionalFlagConfig => config?.kind === 'conditional-flag';

const isOneSidedConfig = (config: AnalysisStepConfig | undefined): config is OneSidedConfig =>
  config?.kind === 'one-sided';

const isZeroToOneConfig = (config: AnalysisStepConfig | undefined): config is ZeroToOneConfig =>
  config?.kind === 'zero-to-one';

const isDistributionConfig = (config: AnalysisStepConfig | undefined): config is DistributionConfig =>
  config?.kind === 'distribution';

const isSignificanceConfig = (config: AnalysisStepConfig | undefined): config is SignificanceConfig =>
  config?.kind === 'significance';

const emptyConditionalResult = (length: number): AnalysisComputation => ({
  scores: Array.from({ length }, () => null),
  diagnostics: { mean: 0, stdDev: 0, maxZ: 0 }
});

const computeConditionalFlag = (
  { values, rawValues }: AnalysisMethodContext,
  config?: AnalysisStepConfig
): AnalysisComputation => {
  if (!isConditionalFlagConfig(config)) {
    return emptyConditionalResult(rawValues.length);
  }

  const scores: (number | null)[] = new Array(rawValues.length).fill(null);

  switch (config.mode) {
    case 'boolean': {
      for (let index = 0; index < rawValues.length; index += 1) {
        const rawValue = rawValues[index];
        const normalised = normaliseRawText(rawValue);
        if (!normalised) {
          scores[index] = 0;
          continue;
        }
        scores[index] = normalised === 'true' ? 1 : 0;
      }
      break;
    }
    case 'binary': {
      const target = normaliseRawText(config.trueValue);
      if (!target) {
        return emptyConditionalResult(rawValues.length);
      }

      for (let index = 0; index < rawValues.length; index += 1) {
        const rawValue = rawValues[index];
        if (!rawValue) {
          scores[index] = 0;
          continue;
        }
        scores[index] = normaliseRawText(rawValue) === target ? 1 : 0;
      }
      break;
    }
    case 'min': {
      const threshold = config.threshold;
      if (!Number.isFinite(threshold)) {
        return emptyConditionalResult(values.length);
      }

      for (let index = 0; index < values.length; index += 1) {
        const value = values[index];
        if (value === null || !Number.isFinite(value)) {
          scores[index] = 0;
          continue;
        }
        scores[index] = value >= threshold ? 1 : 0;
      }
      break;
    }
    case 'max': {
      const threshold = config.threshold;
      if (!Number.isFinite(threshold)) {
        return emptyConditionalResult(values.length);
      }

      for (let index = 0; index < values.length; index += 1) {
        const value = values[index];
        if (value === null || !Number.isFinite(value)) {
          scores[index] = 0;
          continue;
        }
        scores[index] = value <= threshold ? 1 : 0;
      }
      break;
    }
    case 'range': {
      const min = config.min;
      const max = config.max;
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return emptyConditionalResult(values.length);
      }

      const lower = Math.min(min, max);
      const upper = Math.max(min, max);

      for (let index = 0; index < values.length; index += 1) {
        const value = values[index];
        if (value === null || !Number.isFinite(value)) {
          scores[index] = 0;
          continue;
        }
        scores[index] = value >= lower && value <= upper ? 1 : 0;
      }
      break;
    }
    default:
      return emptyConditionalResult(values.length);
  }

  const numericScores = scores.filter((score): score is number => score !== null && Number.isFinite(score));

  if (numericScores.length === 0) {
    return {
      scores,
      diagnostics: { mean: 0, stdDev: 0, maxZ: 0 }
    };
  }

  const mean = numericScores.reduce((acc, score) => acc + score, 0) / numericScores.length;
  const variance = numericScores.reduce((acc, score) => acc + (score - mean) ** 2, 0) / numericScores.length;
  const stdDev = Math.sqrt(variance);

  let maxZ = 0;
  if (stdDev > 0) {
    for (const score of numericScores) {
      const z = Math.abs(score - mean) / stdDev;
      if (Number.isFinite(z)) {
        maxZ = Math.max(maxZ, z);
      }
    }
  }

  return {
    scores,
    diagnostics: { mean, stdDev, maxZ }
  };
};

const emptyNumericComputation = (length: number): AnalysisComputation => ({
  scores: Array.from({ length }, () => null),
  diagnostics: { mean: 0, stdDev: 0, maxZ: 0 }
});

const extractNumericValues = (values: ParsedNumericColumn) =>
  values.filter((value): value is number => value !== null && Number.isFinite(value));

const computeMean = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const computeMedian = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const applyScaling = (value: number, scaling: 'linear' | 'quadratic' | 'exponential' | 'logarithmic') => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.min(1, Math.max(0, value));

  switch (scaling) {
    case 'quadratic':
      return clamped ** 2;
    case 'exponential':
      return clamped ** 2;
    case 'logarithmic': {
      if (clamped <= 0) {
        return 0;
      }
      return Math.log1p(clamped * 9) / Math.log(10);
    }
    case 'linear':
    default:
      return clamped;
  }
};

const resolveOneSidedBaseline = (values: number[], column: ColumnMetadata, config: OneSidedConfig) => {
  switch (config.baselineMode) {
    case 'average': {
      if (typeof column.average === 'number' && Number.isFinite(column.average)) {
        return column.average;
      }
      return computeMean(values);
    }
    case 'median': {
      if (typeof column.median === 'number' && Number.isFinite(column.median)) {
        return column.median;
      }
      return computeMedian(values);
    }
    case 'custom':
    default:
      return config.baselineValue;
  }
};

const computeOneSidedDistance = (
  context: AnalysisMethodContext,
  config?: AnalysisStepConfig
): AnalysisComputation => {
  if (!isOneSidedConfig(config)) {
    return emptyNumericComputation(context.values.length);
  }

  const numericValues = extractNumericValues(context.values);
  if (numericValues.length === 0) {
    return emptyNumericComputation(context.values.length);
  }

  const baseline = resolveOneSidedBaseline(numericValues, context.column, config);
  if (!Number.isFinite(baseline)) {
    return emptyNumericComputation(context.values.length);
  }

  const extreme =
    config.side === 'right'
      ? Math.max(baseline, ...numericValues)
      : Math.min(baseline, ...numericValues);

  const denominator = config.side === 'right' ? extreme - baseline : baseline - extreme;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    const scores = context.values.map((value) => (value === null || !Number.isFinite(value) ? null : 0));
    return { scores, diagnostics: computeDiagnostics(scores) };
  }

  const scores = context.values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    if (config.side === 'right') {
      if (value <= baseline) {
        return 0;
      }
      const distance = (value - baseline) / denominator;
      return applyScaling(distance, config.scaling === 'linear' ? 'linear' : 'quadratic');
    }

    if (value >= baseline) {
      return 0;
    }
    const distance = (baseline - value) / denominator;
    return applyScaling(distance, config.scaling === 'linear' ? 'linear' : 'quadratic');
  });

  return {
    scores,
    diagnostics: computeDiagnostics(scores)
  };
};

const computeZeroToOneScaling = (
  context: AnalysisMethodContext,
  config?: AnalysisStepConfig
): AnalysisComputation => {
  if (!isZeroToOneConfig(config)) {
    return emptyNumericComputation(context.values.length);
  }

  const numericValues = extractNumericValues(context.values);
  if (numericValues.length === 0) {
    return emptyNumericComputation(context.values.length);
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  const range = max - min;
  if (!Number.isFinite(range) || range <= 0) {
    const scores = context.values.map((value) => (value === null || !Number.isFinite(value) ? null : 0));
    return { scores, diagnostics: computeDiagnostics(scores) };
  }

  const scores = context.values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    const ratio = (value - min) / range;
    const scaling = config.scaling === 'exponential' ? 'exponential' : 'linear';
    return applyScaling(ratio, scaling);
  });

  return {
    scores,
    diagnostics: computeDiagnostics(scores)
  };
};

const computeDistributionDensity = (
  context: AnalysisMethodContext,
  config?: AnalysisStepConfig
): AnalysisComputation => {
  if (!isDistributionConfig(config)) {
    return emptyNumericComputation(context.values.length);
  }

  const bucketCount = Math.max(0, Math.floor(config.buckets));
  if (bucketCount <= 0) {
    return emptyNumericComputation(context.values.length);
  }

  const numericValues = extractNumericValues(context.values);
  if (numericValues.length === 0) {
    return emptyNumericComputation(context.values.length);
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  const range = max - min;
  if (!Number.isFinite(range) || range === 0) {
    const scores = context.values.map((value) => (value === null || !Number.isFinite(value) ? null : 0));
    return { scores, diagnostics: computeDiagnostics(scores) };
  }

  const bucketWidth = range / bucketCount;
  if (!Number.isFinite(bucketWidth) || bucketWidth === 0) {
    const scores = context.values.map((value) => (value === null || !Number.isFinite(value) ? null : 0));
    return { scores, diagnostics: computeDiagnostics(scores) };
  }

  const counts = new Array(bucketCount).fill(0);
  const bucketIndices: (number | null)[] = context.values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    if (value <= min) {
      counts[0] += 1;
      return 0;
    }
    if (value >= max) {
      counts[bucketCount - 1] += 1;
      return bucketCount - 1;
    }
    const relative = (value - min) / bucketWidth;
    const index = Math.min(bucketCount - 1, Math.floor(relative));
    counts[index] += 1;
    return index;
  });

  const nonZeroCounts = counts.filter((count) => count > 0);
  if (nonZeroCounts.length === 0) {
    return emptyNumericComputation(context.values.length);
  }

  const minCount = Math.min(...nonZeroCounts);
  const maxCount = Math.max(...nonZeroCounts);
  const denominator = maxCount - minCount;

  const computeRatio = (count: number) => {
    if (count <= 0) {
      return null;
    }

    if (denominator === 0) {
      return config.reward === 'most' ? 1 : 0;
    }

    if (config.reward === 'most') {
      return (count - minCount) / denominator;
    }

    return (maxCount - count) / denominator;
  };

  const scaling: 'linear' | 'logarithmic' = config.scaling;

  const scores = bucketIndices.map((index) => {
    if (index === null) {
      return null;
    }
    const ratio = computeRatio(counts[index]);
    if (ratio === null) {
      return null;
    }
    if (scaling === 'logarithmic') {
      return applyScaling(ratio, 'logarithmic');
    }
    return applyScaling(ratio, 'linear');
  });

  return {
    scores,
    diagnostics: computeDiagnostics(scores)
  };
};

const computeSignificanceFlag = (
  context: AnalysisMethodContext,
  config?: AnalysisStepConfig
): AnalysisComputation => {
  if (!isSignificanceConfig(config)) {
    return emptyNumericComputation(context.values.length);
  }

  const threshold = config.significanceLevel;
  if (!Number.isFinite(threshold)) {
    return emptyNumericComputation(context.values.length);
  }

  const scores = context.values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    const isSignificant = value <= threshold;
    const score = config.flagSignificant ? (isSignificant ? 1 : 0) : isSignificant ? 0 : 1;
    return score;
  });

  return {
    scores,
    diagnostics: computeDiagnostics(scores)
  };
};

export const ANALYSIS_METHODS: AnalysisMethodDefinition[] = [
  {
    id: 'bell-curve-distance',
    name: 'Bell curve anomaly score',
    shortDescription: 'Highlights outliers by measuring log-scaled distance from the mean.',
    description:
      'Creates a bell curve from the column values and scores each row based on how far it sits from the centre. The furthest values converge to 1, while typical values stay near 0.',
    compute: computeBellCurveDistance
  },
  {
    id: 'conditional-flag',
    name: 'Conditional statement',
    shortDescription: 'Outputs 1 when a custom rule is true for the row, otherwise 0.',
    description:
      'Define a true/false check for the selected column. You can match a specific value, interpret boolean text, or set a numeric threshold/range. Rows that satisfy the condition receive a score of 1, while the rest receive 0.',
    compute: computeConditionalFlag
  },
  {
    id: 'one-sided-distance',
    name: 'One-sided distance',
    shortDescription: 'Scores rows based on how far they sit to one side of a baseline.',
    description:
      'Pick a reference point (custom value, average, or median), choose which side of it should earn points, and select a linear or x² ramp. Distances on the chosen side scale from 0 at the baseline to 1 at the furthest value.',
    compute: computeOneSidedDistance
  },
  {
    id: 'zero-to-one-scaling',
    name: '0 to 1 scaling',
    shortDescription: 'Normalises values between the observed minimum and maximum.',
    description:
      'Linearly or exponentially scale the column so the minimum maps to 0 and the maximum maps to 1. Use this to standardise metrics without considering their distribution.',
    compute: computeZeroToOneScaling
  },
  {
    id: 'distribution-density',
    name: 'Distribution buckets',
    shortDescription: 'Assign scores based on how densely populated each value band is.',
    description:
      'Split the range into equal-width buckets, count how many rows fall into each, and reward either the least- or most-populated buckets. Scores can grow linearly or follow a logarithmic curve.',
    compute: computeDistributionDensity
  },
  {
    id: 'significance-flag',
    name: 'Significance test',
    shortDescription: 'Marks rows that pass a custom significance level.',
    description:
      'Provide a significance level and flag rows whose values fall at or below it. You can decide whether significant rows emit 1 or 0.',
    compute: computeSignificanceFlag
  }
];

export const analysisMethodMap = new Map<AnalysisMethodId, AnalysisMethodDefinition>(
  ANALYSIS_METHODS.map((method) => [method.id, method])
);

export const parseNumericValue = (rawValue: string | undefined): number | null => {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return null;
  const normalised = trimmed.replace(/\u00a0/g, '').replace(/,/g, '.');
  const cleaned = normalised.replace(/[^0-9+\-.eE]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

export const extractColumnValues = (rows: DatasetRow[], columnKey: string): ParsedNumericColumn =>
  rows.map((row) => parseNumericValue(row[columnKey]));

const extractRawColumnValues = (rows: DatasetRow[], columnKey: string): (string | undefined)[] =>
  rows.map((row) => row[columnKey]);

export const evaluateFormula = (
  rows: DatasetRow[],
  steps: {
    column: ColumnMetadata;
    methodId: AnalysisMethodId;
    weight?: number;
    config?: AnalysisStepConfig;
  }[],
  operators: AnalysisOperator[]
): { result: (number | null)[]; stepValues: (number | null)[][] } => {
  if (steps.length === 0) {
    return { result: [], stepValues: [] };
  }

  const numericCache = new Map<string, ParsedNumericColumn>();
  const rawCache = new Map<string, (string | undefined)[]>();
  const stepOutputs: (number | null)[][] = [];

  steps.forEach((step) => {
    const method = analysisMethodMap.get(step.methodId);
    if (!method) {
      stepOutputs.push([]);
      return;
    }

    let values = numericCache.get(step.column.metric);
    if (!values) {
      values = extractColumnValues(rows, step.column.metric);
      numericCache.set(step.column.metric, values);
    }

    let rawValues = rawCache.get(step.column.metric);
    if (!rawValues) {
      rawValues = extractRawColumnValues(rows, step.column.metric);
      rawCache.set(step.column.metric, rawValues);
    }

    const computation = method.compute({ column: step.column, values, rawValues }, step.config);
    const weight = typeof step.weight === 'number' && Number.isFinite(step.weight)
      ? step.weight
      : DEFAULT_ANALYSIS_WEIGHT;
    const weightedScores = computation.scores.map((score) =>
      score === null || !Number.isFinite(score) ? score : score * weight
    );
    stepOutputs.push(weightedScores);
  });

  const rowCount = rows.length;
  const result: (number | null)[] = new Array(rowCount).fill(null);

  for (let index = 0; index < rowCount; index += 1) {
    let value = stepOutputs[0]?.[index] ?? null;

    for (let stepIndex = 1; stepIndex < steps.length; stepIndex += 1) {
      const operator = operators[stepIndex - 1];
      const nextValue = stepOutputs[stepIndex]?.[index] ?? null;

      if (value === null || nextValue === null) {
        value = value ?? nextValue;
        continue;
      }

      switch (operator) {
        case '+':
          value = value + nextValue;
          break;
        case '-':
          value = value - nextValue;
          break;
        case '*':
          value = value * nextValue;
          break;
        case '/':
          value = nextValue === 0 ? null : value / nextValue;
          break;
        default:
          value = null;
      }
    }

    result[index] = value;
  }

  return { result, stepValues: stepOutputs };
};
