import type { ColumnMetadata } from '@/data/column-metadata';
import type { DatasetRow } from '@/lib/upload-parsers';
import { AnalysisMethodId, type AnalysisOperator } from '@/lib/analysis-presets/types';

export type ParsedNumericColumn = (number | null)[];

type AnalysisMethodContext = {
  column: ColumnMetadata;
  values: ParsedNumericColumn;
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
  compute: (context: AnalysisMethodContext) => AnalysisComputation;
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

export const ANALYSIS_METHODS: AnalysisMethodDefinition[] = [
  {
    id: 'bell-curve-distance',
    name: 'Bell curve anomaly score',
    shortDescription: 'Highlights outliers by measuring log-scaled distance from the mean.',
    description:
      'Creates a bell curve from the column values and scores each row based on how far it sits from the centre. The furthest values converge to 1, while typical values stay near 0.',
    compute: computeBellCurveDistance
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

export const evaluateFormula = (
  rows: DatasetRow[],
  steps: { column: ColumnMetadata; methodId: AnalysisMethodId }[],
  operators: AnalysisOperator[]
): { result: (number | null)[]; stepValues: (number | null)[][] } => {
  if (steps.length === 0) {
    return { result: [], stepValues: [] };
  }

  const cache = new Map<string, ParsedNumericColumn>();
  const stepOutputs: (number | null)[][] = [];

  steps.forEach((step) => {
    const method = analysisMethodMap.get(step.methodId);
    if (!method) {
      stepOutputs.push([]);
      return;
    }

    let values = cache.get(step.column.metric);
    if (!values) {
      values = extractColumnValues(rows, step.column.metric);
      cache.set(step.column.metric, values);
    }

    const computation = method.compute({ column: step.column, values });
    stepOutputs.push(computation.scores);
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
