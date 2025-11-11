'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, LineChart, Plus, Trash2 } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { ColumnMetadata } from '@/data/column-metadata';
import { useUploadContext } from '@/components/upload/upload-context';
import { ANALYSIS_METHODS, analysisMethodMap, evaluateFormula } from '@/lib/analysis/methods';
import type {
  AnalysisOperator,
  AnalysisStepConfig,
  AnalysisTemplatePayload,
  SavedAnalysisChainRecord,
  SavedAnalysisPresetRecord,
  ConditionalFlagConfig
} from '@/lib/analysis-presets/types';
import { DEFAULT_ANALYSIS_WEIGHT } from '@/lib/analysis-presets/types';
import { METRIC_CATEGORY_GROUPS, mapCategoryColumns } from '@/lib/metrics/category-groups';
import type { DatasetRow } from '@/lib/upload-parsers';
import { cn } from '@/lib/utils';

const OPERATOR_OPTIONS: AnalysisOperator[] = ['+', '-', '*', '/'];

const EMPTY_COLUMNS: ColumnMetadata[] = [];

const NUMERIC_DATA_TYPES = new Set<ColumnMetadata['data_type']>(['numeric', 'percent', 'ratio', 'currency']);

const isNumericColumn = (column: ColumnMetadata | undefined | null) =>
  column ? NUMERIC_DATA_TYPES.has(column.data_type) : false;

const coerceWeight = (weight: number | undefined) =>
  typeof weight === 'number' && Number.isFinite(weight) ? weight : DEFAULT_ANALYSIS_WEIGHT;

const isConditionalStepConfig = (
  config: AnalysisStepConfig | undefined
): config is ConditionalFlagConfig => config?.kind === 'conditional-flag';

const deriveNumericBaseline = (column: ColumnMetadata | undefined) => {
  const candidate = column?.average ?? column?.median ?? 0;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0;
};

const createDefaultConditionalConfig = (column: ColumnMetadata | undefined): ConditionalFlagConfig => {
  if (isNumericColumn(column)) {
    return {
      kind: 'conditional-flag',
      mode: 'min',
      threshold: deriveNumericBaseline(column)
    };
  }

  return {
    kind: 'conditional-flag',
    mode: 'binary',
    trueValue: 'true'
  };
};

const ensureConditionalConfig = (
  column: ColumnMetadata | undefined,
  config: AnalysisStepConfig | undefined
): ConditionalFlagConfig => {
  if (isConditionalStepConfig(config)) {
    return config;
  }
  return createDefaultConditionalConfig(column);
};

const describeConditionalConfig = (config: ConditionalFlagConfig) => {
  switch (config.mode) {
    case 'boolean':
      return 'Text equals “true” (case-insensitive)';
    case 'binary':
      return `Value equals “${config.trueValue}”`;
    case 'min':
      return `Value ≥ ${config.threshold.toLocaleString()}`;
    case 'max':
      return `Value ≤ ${config.threshold.toLocaleString()}`;
    case 'range': {
      const lower = Math.min(config.min, config.max);
      const upper = Math.max(config.min, config.max);
      return `Value between ${lower.toLocaleString()} and ${upper.toLocaleString()}`;
    }
    default:
      return '';
  }
};

const validateConditionalConfig = (config: AnalysisStepConfig | undefined) => {
  if (!isConditionalStepConfig(config)) {
    return { valid: false, error: 'Configure the condition before adding this step.' } as const;
  }

  switch (config.mode) {
    case 'binary':
      if (!config.trueValue || config.trueValue.trim().length === 0) {
        return { valid: false, error: 'Provide the value that should be treated as true.' } as const;
      }
      return { valid: true, config } as const;
    case 'boolean':
      return { valid: true, config } as const;
    case 'min':
    case 'max':
      if (!Number.isFinite(config.threshold)) {
        return { valid: false, error: 'Enter a numeric threshold for this condition.' } as const;
      }
      return { valid: true, config } as const;
    case 'range':
      if (!Number.isFinite(config.min) || !Number.isFinite(config.max)) {
        return { valid: false, error: 'Enter both bounds for the numeric range.' } as const;
      }
      return { valid: true, config } as const;
    default:
      return { valid: false, error: 'Configure the condition before adding this step.' } as const;
  }
};

const downloadCsv = (rows: DatasetRow[], columns: string[], filename: string) => {
  const escapeCell = (value: string | undefined) => {
    const cell = value ?? '';
    if (/[",\n]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const lines = [columns.map((column) => escapeCell(column)).join(',')];

  rows.forEach((row) => {
    lines.push(columns.map((column) => escapeCell(row[column])).join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

type FormulaStep = {
  id: string;
  column: ColumnMetadata;
  methodId: AnalysisTemplatePayload['methodId'];
  weight: number;
  config?: AnalysisStepConfig;
};

type FormState = {
  column?: ColumnMetadata;
  methodId?: AnalysisTemplatePayload['methodId'];
  weight: number;
  config?: AnalysisStepConfig;
  error?: string | null;
};

type AnalysisLibraryResponse = {
  presets?: SavedAnalysisPresetRecord[];
  chains?: SavedAnalysisChainRecord[];
};

type PresetAuthor = SavedAnalysisPresetRecord['createdBy'];

type ChainPayload = SavedAnalysisChainRecord['chain'];

type TemplatePayload = AnalysisTemplatePayload;

export function AnalysisBuilder() {
  const { columnMetadata, datasetColumns, datasetRows, isReady, missing } = useUploadContext();
  const { data: session } = useSession();

  const availableColumns = columnMetadata ?? EMPTY_COLUMNS;
  const currentUserId = session?.user?.id ?? null;

  const [form, setForm] = useState<FormState>({ weight: DEFAULT_ANALYSIS_WEIGHT });
  const [steps, setSteps] = useState<FormulaStep[]>([]);
  const [operators, setOperators] = useState<AnalysisOperator[]>([]);
  const [pendingOperator, setPendingOperator] = useState<AnalysisOperator>('+');
  const [resultName, setResultName] = useState<string>('analysis_score');
  const [analysisResultRows, setAnalysisResultRows] = useState<DatasetRow[] | null>(null);
  const [analysisResultColumns, setAnalysisResultColumns] = useState<string[] | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'category' | 'single' | 'chain' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(METRIC_CATEGORY_GROUPS[0]?.id ?? null);
  const [isBrowsingMetrics, setIsBrowsingMetrics] = useState(true);
  const [savedPresets, setSavedPresets] = useState<SavedAnalysisPresetRecord[]>([]);
  const [savedChains, setSavedChains] = useState<SavedAnalysisChainRecord[]>([]);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isSavingChain, setIsSavingChain] = useState(false);

  useEffect(() => {
    if (form.methodId === 'conditional-flag' && !isConditionalStepConfig(form.config)) {
      setForm((previous) => {
        if (previous.methodId !== 'conditional-flag' || isConditionalStepConfig(previous.config)) {
          return previous;
        }
        return {
          ...previous,
          config: createDefaultConditionalConfig(previous.column)
        };
      });
    }
  }, [form.methodId, form.config, form.column]);

  const generateId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const totalRows = datasetRows?.length ?? 0;

  const selectedCategoryGroup = useMemo(
    () => METRIC_CATEGORY_GROUPS.find((group) => group.id === selectedCategory) ?? null,
    [selectedCategory]
  );

  const categoryColumns = useMemo(() => {
    if (!selectedCategoryGroup) {
      return [] as ColumnMetadata[];
    }
    return mapCategoryColumns(availableColumns, selectedCategoryGroup.metrics);
  }, [availableColumns, selectedCategoryGroup]);

  const availableAuthors = useMemo(() => {
    const map = new Map<string, PresetAuthor>();
    savedPresets.forEach((preset) => {
      map.set(preset.createdBy.id, preset.createdBy);
    });
    savedChains.forEach((chain) => {
      map.set(chain.createdBy.id, chain.createdBy);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aName = a.name?.toLowerCase() ?? '';
      const bName = b.name?.toLowerCase() ?? '';
      if (aName && bName) {
        return aName.localeCompare(bName);
      }
      if (aName) return -1;
      if (bName) return 1;
      return 0;
    });
  }, [savedPresets, savedChains]);

  useEffect(() => {
    if (!currentUserId && authorFilter === 'mine') {
      setAuthorFilter('all');
    }
  }, [authorFilter, currentUserId]);

  const matchesAuthor = useCallback(
    (authorId: string) => {
      if (authorFilter === 'all') {
        return true;
      }
      if (authorFilter === 'mine') {
        return currentUserId ? authorId === currentUserId : false;
      }
      return authorFilter === authorId;
    },
    [authorFilter, currentUserId]
  );

  const availableMetricKeys = useMemo(
    () => new Set(availableColumns.map((column) => column.metric)),
    [availableColumns]
  );

  const compatiblePresets = useMemo(
    () => savedPresets.filter((preset) => availableMetricKeys.has(preset.template.columnKey)),
    [availableMetricKeys, savedPresets]
  );

  const compatibleChains = useMemo(
    () =>
      savedChains
        .map((chain) => {
          const steps = chain.chain.steps.filter((step) => availableMetricKeys.has(step.columnKey));
          return {
            ...chain,
            chain: {
              ...chain.chain,
              steps,
              operators: chain.chain.operators.slice(0, Math.max(0, steps.length - 1))
            }
          };
        })
        .filter((chain) => chain.chain.steps.length > 0),
    [availableMetricKeys, savedChains]
  );

  const filteredPresets = useMemo(
    () => compatiblePresets.filter((preset) => matchesAuthor(preset.createdBy.id)),
    [compatiblePresets, matchesAuthor]
  );

  const filteredChains = useMemo(
    () => compatibleChains.filter((chain) => matchesAuthor(chain.createdBy.id)),
    [compatibleChains, matchesAuthor]
  );

  useEffect(() => {
    let isActive = true;

    const fetchLibrary = async () => {
      setIsSyncingLibrary(true);
      setLibraryError(null);
      try {
        const response = await fetch('/api/analysis-presets');
        if (!response.ok) {
          let message = 'Unable to load saved analysis presets.';
          try {
            const data = (await response.json()) as { error?: string };
            if (data && typeof data.error === 'string') {
              message = data.error;
            }
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as AnalysisLibraryResponse & { authors?: PresetAuthor[] };
        if (!isActive) {
          return;
        }

        setSavedPresets(payload.presets ?? []);
        setSavedChains(payload.chains ?? []);
      } catch (error) {
        console.error(error);
        if (!isActive) {
          return;
        }
        setLibraryError(error instanceof Error ? error.message : 'Unable to load saved analysis presets.');
      } finally {
        if (isActive) {
          setIsSyncingLibrary(false);
        }
      }
    };

    void fetchLibrary();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setForm((previous) => {
      if (!previous.column) {
        return previous;
      }
      const updatedColumn = availableColumns.find((column) => column.metric === previous.column?.metric);
      if (updatedColumn) {
        return { ...previous, column: updatedColumn };
      }
      return {};
    });

    setSteps((previous) => {
      const availableMetrics = new Set(availableColumns.map((column) => column.metric));
      const filtered = previous.filter((step) => availableMetrics.has(step.column.metric));
      if (filtered.length !== previous.length) {
        setOperators((ops) => {
          const next = [...ops];
          while (next.length > filtered.length - 1) {
            next.pop();
          }
          return next;
        });
      }
      return filtered.map((step) => ({
        ...step,
        column: availableColumns.find((column) => column.metric === step.column.metric) ?? step.column
      }));
    });

    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  }, [availableColumns]);

  useEffect(() => {
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  }, [datasetRows]);

  const handleRevealMetricBrowser = () => {
    setIsBrowsingMetrics(true);
    setActivePanel('category');
  };

  const handleOpenPanel = (panel: 'category' | 'single' | 'chain') => {
    setActivePanel((previous) => {
      const next = previous === panel ? null : panel;
      if (next === 'category') {
        setSelectedCategory((current) => current ?? METRIC_CATEGORY_GROUPS[0]?.id ?? null);
      }
      if (panel === 'category') {
        setIsBrowsingMetrics(next === 'category');
      } else {
        setIsBrowsingMetrics(false);
      }
      return next;
    });
    if (panel === 'category') {
      setAnalysisError(null);
      setForm((prev) => ({ ...prev, error: null }));
    }
  };

  const handleSelectColumn = (column: ColumnMetadata) => {
    setForm({ column, methodId: undefined, weight: DEFAULT_ANALYSIS_WEIGHT, config: undefined, error: null });
    setIsBrowsingMetrics(false);
  };

  const handleSelectMethod = (methodId: AnalysisTemplatePayload['methodId']) => {
    setForm((previous) => ({
      ...previous,
      methodId,
      config: methodId === 'conditional-flag' ? createDefaultConditionalConfig(previous.column) : undefined,
      error: null
    }));
  };

  const handleAddStep = () => {
    if (!form.column || !form.methodId) {
      setForm((previous) => ({ ...previous, error: 'Choose a column and analysis method first.' }));
      return;
    }

    const weight = coerceWeight(form.weight);
    let stepConfig: ConditionalFlagConfig | undefined;

    if (form.methodId === 'conditional-flag') {
      const validation = validateConditionalConfig(form.config);
      if (!validation.valid) {
        setForm((previous) => ({ ...previous, error: validation.error }));
        return;
      }
      stepConfig = validation.config;
    }

    setSteps((previous) => {
      const nextStep: FormulaStep = {
        id: generateId(),
        column: form.column as ColumnMetadata,
        methodId: form.methodId,
        weight,
        config: stepConfig ? { ...stepConfig } : undefined
      };
      const updated = [...previous, nextStep];
      if (updated.length > 1) {
        setOperators((ops) => [...ops, pendingOperator]);
      }
      return updated;
    });
    setForm((previous) => ({
      ...previous,
      methodId: undefined,
      weight: DEFAULT_ANALYSIS_WEIGHT,
      config: undefined,
      error: null
    }));
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const handleRemoveStep = (id: string) => {
    setSteps((previous) => {
      const index = previous.findIndex((step) => step.id === id);
      if (index === -1) {
        return previous;
      }
      const updated = previous.filter((step) => step.id !== id);
      setOperators((ops) => {
        const next = [...ops];
        if (index < next.length) {
          next.splice(index, 1);
        } else {
          next.pop();
        }
        return next;
      });
      return updated;
    });
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const handleStepWeightChange = (id: string, value: string) => {
    const parsed = Number.parseFloat(value);
    const nextWeight = Number.isNaN(parsed) ? DEFAULT_ANALYSIS_WEIGHT : parsed;

    setSteps((previous) =>
      previous.map((step) => (step.id === id ? { ...step, weight: coerceWeight(nextWeight) } : step))
    );
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const handleFormWeightChange = (value: string) => {
    const parsed = Number.parseFloat(value);
    setForm((previous) => ({
      ...previous,
      weight: Number.isNaN(parsed) ? DEFAULT_ANALYSIS_WEIGHT : parsed
    }));
  };

  const handleConditionalModeChange = (mode: ConditionalFlagConfig['mode']) => {
    setForm((previous) => {
      if (previous.methodId !== 'conditional-flag') {
        return previous;
      }

      const base = ensureConditionalConfig(previous.column, previous.config);
      let nextConfig: ConditionalFlagConfig;

      switch (mode) {
        case 'binary': {
          const trueValue =
            base.mode === 'binary' && base.trueValue.trim().length > 0
              ? base.trueValue
              : base.mode === 'boolean' && base.trueValue && base.trueValue.trim().length > 0
                ? base.trueValue
                : 'true';
          nextConfig = { kind: 'conditional-flag', mode: 'binary', trueValue };
          break;
        }
        case 'boolean': {
          const trueValue =
            base.mode === 'binary' && base.trueValue.trim().length > 0
              ? base.trueValue
              : base.mode === 'boolean' && base.trueValue && base.trueValue.trim().length > 0
                ? base.trueValue
                : 'true';
          nextConfig = { kind: 'conditional-flag', mode: 'boolean', trueValue };
          break;
        }
        case 'min': {
          const fallback = deriveNumericBaseline(previous.column);
          const candidate =
            base.mode === 'min' ? base.threshold : base.mode === 'range' ? base.min : fallback;
          const threshold = Number.isFinite(candidate) ? candidate : fallback;
          nextConfig = { kind: 'conditional-flag', mode: 'min', threshold };
          break;
        }
        case 'max': {
          const fallback = deriveNumericBaseline(previous.column);
          const candidate =
            base.mode === 'max' ? base.threshold : base.mode === 'range' ? base.max : fallback;
          const threshold = Number.isFinite(candidate) ? candidate : fallback;
          nextConfig = { kind: 'conditional-flag', mode: 'max', threshold };
          break;
        }
        case 'range': {
          const fallback = deriveNumericBaseline(previous.column);
          const min =
            base.mode === 'range'
              ? base.min
              : base.mode === 'min'
                ? base.threshold
                : fallback;
          const max =
            base.mode === 'range'
              ? base.max
              : base.mode === 'max'
                ? base.threshold
                : fallback;
          const safeMin = Number.isFinite(min) ? min : fallback;
          const safeMax = Number.isFinite(max) ? max : fallback;
          nextConfig = { kind: 'conditional-flag', mode: 'range', min: safeMin, max: safeMax };
          break;
        }
        default:
          nextConfig = base;
      }

      return { ...previous, config: nextConfig, error: null };
    });
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const handleConditionalTrueValueChange = (value: string) => {
    setForm((previous) => {
      if (
        previous.methodId !== 'conditional-flag' ||
        !isConditionalStepConfig(previous.config) ||
        previous.config.mode !== 'binary'
      ) {
        return previous;
      }

      return {
        ...previous,
        config: { ...previous.config, trueValue: value },
        error: null
      };
    });
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const handleConditionalThresholdChange = (mode: 'min' | 'max', value: string) => {
    const parsed = Number.parseFloat(value);
    setForm((previous) => {
      if (
        previous.methodId !== 'conditional-flag' ||
        !isConditionalStepConfig(previous.config) ||
        previous.config.mode !== mode
      ) {
        return previous;
      }

      return {
        ...previous,
        config: {
          ...previous.config,
          threshold: Number.isNaN(parsed) ? previous.config.threshold : parsed
        },
        error: null
      };
    });
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const handleConditionalRangeChange = (bound: 'min' | 'max', value: string) => {
    const parsed = Number.parseFloat(value);
    setForm((previous) => {
      if (
        previous.methodId !== 'conditional-flag' ||
        !isConditionalStepConfig(previous.config) ||
        previous.config.mode !== 'range'
      ) {
        return previous;
      }

      return {
        ...previous,
        config: {
          ...previous.config,
          [bound]: Number.isNaN(parsed) ? previous.config[bound] : parsed
        },
        error: null
      };
    });
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const formatNumber = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return '';
    }
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const handlePerformAnalysis = () => {
    if (!datasetRows || !datasetColumns) {
      setAnalysisError('Upload a dataset, dictionary, and summary statistics first.');
      return;
    }

    if (!resultName.trim()) {
      setAnalysisError('Provide a name for the new column.');
      return;
    }

    if (steps.length === 0) {
      setAnalysisError('Add at least one analysis step to build the formula.');
      return;
    }

    const requiredOperators = Math.max(0, steps.length - 1);
    const normalisedOperators = operators.slice(0, requiredOperators);

    if (normalisedOperators.length !== operators.length || operators.length !== requiredOperators) {
      while (normalisedOperators.length < requiredOperators) {
        normalisedOperators.push('+');
      }
      setOperators(normalisedOperators);
    }

    const { result } = evaluateFormula(datasetRows, steps, normalisedOperators);

    const computedRows = datasetRows.map((row, index) => ({
      ...row,
      [resultName]: formatNumber(result[index] ?? null)
    }));

    setAnalysisResultRows(computedRows);
    setAnalysisResultColumns([...datasetColumns, resultName]);
    setAnalysisError(null);
  };

  const handleDownloadResult = () => {
    if (!analysisResultRows || !analysisResultColumns) {
      return;
    }
    downloadCsv(analysisResultRows, analysisResultColumns, `${resultName || 'analysis'}-results.csv`);
  };

  const buildTemplate = (
    column: ColumnMetadata,
    methodId: AnalysisTemplatePayload['methodId'],
    weight: number,
    config?: AnalysisStepConfig
  ): TemplatePayload => {
    const method = analysisMethodMap.get(methodId);
    return {
      columnKey: column.metric,
      columnLabel: column.metric,
      dataType: column.data_type,
      methodId,
      methodName: method?.name ?? methodId,
      description: column.what_it_is,
      weight,
      config: methodId === 'conditional-flag' && config ? { ...config } : undefined
    };
  };

  const handleLoadPreset = (preset: SavedAnalysisPresetRecord) => {
    const column = availableColumns.find((candidate) => candidate.metric === preset.template.columnKey);
    if (!column) {
      setForm((previous) => ({ ...previous, error: 'Column not available in the current dataset.' }));
      return;
    }

    const weight = coerceWeight(preset.template.weight);
    const config =
      preset.template.methodId === 'conditional-flag'
        ? ensureConditionalConfig(column, preset.template.config)
        : undefined;

    setForm({ column, methodId: preset.template.methodId, weight, config, error: null });
    setIsBrowsingMetrics(false);
  };

  const handleLoadChain = (record: SavedAnalysisChainRecord) => {
    const chain = record.chain;
    const resolvedSteps: FormulaStep[] = [];
    const resolvedOperators: AnalysisOperator[] = [];

    for (let index = 0; index < chain.steps.length; index += 1) {
      const template = chain.steps[index];
      const column = availableColumns.find((candidate) => candidate.metric === template.columnKey);
      if (!column) {
        continue;
      }
      const weight = coerceWeight(template.weight);
      const config =
        template.methodId === 'conditional-flag'
          ? ensureConditionalConfig(column, template.config)
          : undefined;

      resolvedSteps.push({ id: generateId(), column, methodId: template.methodId, weight, config });
      if (index < chain.operators.length) {
        resolvedOperators.push(chain.operators[index]);
      }
    }

    if (resolvedSteps.length === 0) {
      setAnalysisError('None of the saved chain steps are compatible with the current dataset.');
      return;
    }

    setSteps(resolvedSteps);
    setOperators(resolvedOperators.slice(0, Math.max(0, resolvedSteps.length - 1)));
    setResultName(chain.resultName || 'analysis_score');
    setForm({});
    setActivePanel(null);
    setAnalysisResultRows(null);
    setAnalysisResultColumns(null);
    setAnalysisError(null);
  };

  const saveSinglePreset = async () => {
    if (!form.column || !form.methodId) {
      setForm((previous) => ({ ...previous, error: 'Select a column and method to save as a preset.' }));
      return;
    }

    const weight = coerceWeight(form.weight);
    let presetConfig: ConditionalFlagConfig | undefined;

    if (form.methodId === 'conditional-flag') {
      const validation = validateConditionalConfig(form.config);
      if (!validation.valid) {
        setForm((previous) => ({ ...previous, error: validation.error }));
        return;
      }
      presetConfig = validation.config;
    }

    const defaultName = `${form.column.metric} · ${analysisMethodMap.get(form.methodId)?.name ?? form.methodId}`;
    const response = window.prompt('Name this analysis preset', defaultName);
    if (!response) {
      return;
    }

    setIsSavingPreset(true);
    setLibraryError(null);
    try {
      const payload = {
        type: 'single' as const,
        name: response.trim(),
        template: buildTemplate(form.column, form.methodId, weight, presetConfig)
      };

      const request = await fetch('/api/analysis-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!request.ok) {
        let message = 'Unable to save analysis preset.';
        try {
          const data = await request.json();
          if (data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await request.json()) as { preset: SavedAnalysisPresetRecord };
      setSavedPresets((previous) => [data.preset, ...previous]);
    } catch (error) {
      console.error(error);
      setLibraryError(error instanceof Error ? error.message : 'Unable to save analysis preset.');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const saveChainPreset = async () => {
    if (steps.length === 0) {
      setAnalysisError('Add at least one step before saving a chain preset.');
      return;
    }

    if (operators.length !== steps.length - 1) {
      setAnalysisError('Complete the formula before saving it as a chain preset.');
      return;
    }

    const defaultName = `${resultName || 'analysis'} (${steps.length} steps)`;
    const response = window.prompt('Name this analysis chain', defaultName);
    if (!response) {
      return;
    }

    const trimmedName = response.trim();
    if (!trimmedName) {
      setAnalysisError('Provide a valid name for the chain preset.');
      return;
    }

    setIsSavingChain(true);
    setLibraryError(null);
    try {
      const chainPayload: ChainPayload = {
        resultName: resultName || 'analysis_score',
        steps: steps.map((step) =>
          buildTemplate(step.column, step.methodId, coerceWeight(step.weight), step.config)
        ),
        operators: operators.slice(0, Math.max(0, steps.length - 1))
      };

      const payload = {
        type: 'chain' as const,
        name: trimmedName,
        chain: chainPayload
      };

      const request = await fetch('/api/analysis-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!request.ok) {
        let message = 'Unable to save analysis chain.';
        try {
          const data = await request.json();
          if (data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await request.json()) as { chain: SavedAnalysisChainRecord };
      setSavedChains((previous) => [data.chain, ...previous]);
    } catch (error) {
      console.error(error);
      setLibraryError(error instanceof Error ? error.message : 'Unable to save analysis chain.');
    } finally {
      setIsSavingChain(false);
    }
  };

  const shouldShowCategoryBrowser = (!form.column || isBrowsingMetrics) && activePanel !== 'single' && activePanel !== 'chain';
  const previewRows = analysisResultRows?.slice(0, 10) ?? null;
  const conditionalFormConfig =
    form.methodId === 'conditional-flag' && isConditionalStepConfig(form.config)
      ? form.config
      : null;
  const selectedColumnIsNumeric = isNumericColumn(form.column);
  const textConditionalMode =
    conditionalFormConfig && !selectedColumnIsNumeric
      ? conditionalFormConfig.mode === 'boolean'
        ? 'boolean'
        : 'binary'
      : null;
  const textTrueValue =
    conditionalFormConfig?.mode === 'binary'
      ? conditionalFormConfig.trueValue
      : conditionalFormConfig?.mode === 'boolean'
        ? conditionalFormConfig.trueValue ?? 'true'
        : 'true';

  if (!isReady) {
    return (
      <div className="mt-16">
        <Card className="border-dashed border-white/10 bg-white/5 p-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <LineChart size={20} /> Build account analysis
          </CardTitle>
          <CardDescription>
            Upload the account dataset, column dictionary, and median & averages file to unlock the analysis builder.
          </CardDescription>
          <p className="mt-6 text-sm text-muted-foreground">
            Missing uploads:{' '}
            <span className="font-medium text-foreground">
              {missing.map((slot) => (slot === 'summary' ? 'median & averages' : `${slot} file`)).join(', ')}
            </span>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-16 space-y-10">
      <Card className="border border-white/10 bg-background/80 p-6 shadow-lg shadow-accent/10 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <LineChart size={20} /> Run analysis flow
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Execute the current analysis workflow to create a new column that spotlights outliers and multi-step insights.
            </CardDescription>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
            <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Uploaded rows</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{totalRows.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Steps in workflow</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{steps.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Result ready</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {analysisResultRows === null ? '—' : analysisResultRows.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              className="w-full gap-2 text-base font-semibold sm:w-auto"
              onClick={handlePerformAnalysis}
              disabled={steps.length === 0}
            >
              <LineChart size={18} /> Perform analysis
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={handleDownloadResult}
              disabled={!analysisResultRows || !analysisResultColumns}
            >
              <Download size={16} /> Download analysed CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground lg:max-w-md">
            {analysisResultRows === null
              ? totalRows > 0
                ? 'Run the workflow to compute the new column across every wallet.'
                : 'Upload a dataset to start analysing.'
              : `Generated column “${resultName}” for ${analysisResultRows.length.toLocaleString()} rows.`}
          </p>
        </div>
        {analysisError && <p className="mt-4 text-sm text-red-400">{analysisError}</p>}
      </Card>

      <section>
        <Card className="h-full">
          <div className="space-y-8">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LineChart size={20} /> Compose the analysis formula
              </CardTitle>
              <CardDescription>
                Chain statistical analyses together and build reusable workflows that surface unusual wallet behaviour.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenPanel('category')}
                className={cn(
                  'group flex items-center gap-3 rounded-full border border-orange-400/60 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-400 hover:bg-orange-500/20',
                  activePanel === 'category' && 'border-orange-300 bg-orange-500/30 text-white'
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40">
                  <Plus size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.35em]">Add</span>
              </button>
              <Button
                type="button"
                variant="muted"
                onClick={() => handleOpenPanel('single')}
                className={cn(
                  'rounded-full border border-white/10 bg-white/10 px-5 text-sm font-semibold text-foreground backdrop-blur-sm hover:border-accent/40 hover:bg-accent/10',
                  activePanel === 'single' && 'border-accent/60 bg-accent/20 text-accent shadow-glow'
                )}
              >
                Load single preset
              </Button>
              <Button
                type="button"
                variant="muted"
                onClick={() => handleOpenPanel('chain')}
                className={cn(
                  'rounded-full border border-white/10 bg-white/10 px-5 text-sm font-semibold text-foreground backdrop-blur-sm hover:border-accent/40 hover:bg-accent/10',
                  activePanel === 'chain' && 'border-accent/60 bg-accent/20 text-accent shadow-glow'
                )}
              >
                Load chain preset
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/80 p-6 shadow-inner">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Choose a metric</h4>
                {form.column && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/20 bg-transparent text-xs text-muted-foreground">
                      {form.column.data_type}
                    </Badge>
                    {!shouldShowCategoryBrowser && (
                      <Button
                        type="button"
                        variant="muted"
                        size="sm"
                        onClick={handleRevealMetricBrowser}
                        className="rounded-full border border-white/10 bg-white/10 px-3 text-xs"
                      >
                        Browse metrics
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {form.column && !shouldShowCategoryBrowser && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-foreground">{form.column.metric}</p>
                      <p className="text-xs text-muted-foreground">{form.column.what_it_is}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="rounded-full bg-background/70 px-3 py-1">
                        Higher is <strong className="text-foreground">{form.column.higher_is}</strong>
                      </span>
                      {form.column.units_or_range && (
                        <span className="rounded-full bg-background/70 px-3 py-1">
                          Range: <strong className="text-foreground">{form.column.units_or_range}</strong>
                        </span>
                      )}
                      <span className="rounded-full bg-background/70 px-3 py-1">
                        Type: <strong className="text-foreground">{form.column.data_type}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {shouldShowCategoryBrowser && (
                <div className="mt-6 grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    {METRIC_CATEGORY_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedCategory(group.id)}
                        className={cn(
                          'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-accent/40 hover:bg-white/10 hover:text-foreground',
                          selectedCategory === group.id && 'border-accent/60 bg-accent/10 text-foreground shadow-glow'
                        )}
                      >
                        <p className="font-semibold uppercase tracking-wide">{group.label}</p>
                        <p className="mt-1 text-xs opacity-70">{group.metrics.length} metrics</p>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available metrics</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {categoryColumns.length === 0 && (
                        <p className="text-sm text-muted-foreground">No columns from this category are present in the dataset.</p>
                      )}
                      {categoryColumns.map((column) => {
                        const group = METRIC_CATEGORY_GROUPS.find((category) => category.metrics.includes(column.metric));
                        return (
                          <button
                            key={column.metric}
                            type="button"
                            onClick={() => handleSelectColumn(column)}
                            className="rounded-xl border border-white/10 bg-background/70 p-3 text-left transition hover:border-accent/40 hover:bg-background"
                          >
                            <p className="text-sm font-semibold text-foreground">{column.metric}</p>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{column.what_it_is}</p>
                            {group && (
                              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">{group.label}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Select analysis</h4>
                  {form.column && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {form.column.metric} · {form.column.what_it_is}
                    </p>
                  )}
                </div>
                {form.error && <p className="text-sm text-red-400">{form.error}</p>}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ANALYSIS_METHODS.map((method) => {
                  const isActive = form.methodId === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      disabled={!form.column}
                      onClick={() => handleSelectMethod(method.id)}
                      className={cn(
                        'h-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-accent/40 hover:bg-white/10',
                        !form.column && 'cursor-not-allowed opacity-60',
                        isActive && 'border-accent/60 bg-accent/10 text-foreground shadow-glow'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{method.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{method.shortDescription}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground/80">{method.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-6">
                <div className="max-w-xs">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Weight
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(event) => handleFormWeightChange(event.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Each row score from this analysis is multiplied by the weight before it joins the formula.
                  </p>
                </div>

                {form.methodId === 'conditional-flag' && form.column && conditionalFormConfig && (
                  <div className="space-y-4 rounded-xl border border-white/10 bg-background/80 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Condition settings
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Define when the statement should return 1 (true) for this column.
                      </p>
                    </div>

                    {selectedColumnIsNumeric ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {(['min', 'max', 'range'] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => handleConditionalModeChange(mode)}
                              className={cn(
                                'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-foreground',
                                conditionalFormConfig.mode === mode && 'border-accent/60 bg-accent/10 text-foreground shadow-glow'
                              )}
                            >
                              {mode === 'min' && 'Minimum'}
                              {mode === 'max' && 'Maximum'}
                              {mode === 'range' && 'Range'}
                            </button>
                          ))}
                        </div>

                        {conditionalFormConfig.mode === 'min' && (
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Minimum value
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={conditionalFormConfig.threshold}
                              onChange={(event) => handleConditionalThresholdChange('min', event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Rows receive 1 when the value is at least this threshold.
                            </p>
                          </div>
                        )}

                        {conditionalFormConfig.mode === 'max' && (
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Maximum value
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={conditionalFormConfig.threshold}
                              onChange={(event) => handleConditionalThresholdChange('max', event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Rows receive 1 when the value stays at or below this threshold.
                            </p>
                          </div>
                        )}

                        {conditionalFormConfig.mode === 'range' && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Minimum
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={conditionalFormConfig.min}
                                onChange={(event) => handleConditionalRangeChange('min', event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Maximum
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={conditionalFormConfig.max}
                                onChange={(event) => handleConditionalRangeChange('max', event.target.value)}
                              />
                            </div>
                            <p className="sm:col-span-2 text-xs text-muted-foreground">
                              Rows receive 1 when the value stays within this inclusive range.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(['binary', 'boolean'] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => handleConditionalModeChange(mode)}
                              className={cn(
                                'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-foreground',
                                textConditionalMode === mode &&
                                  'border-accent/60 bg-accent/10 text-foreground shadow-glow'
                              )}
                            >
                              {mode === 'binary' ? 'Match value' : 'Boolean text'}
                            </button>
                          ))}
                        </div>

                        {textConditionalMode === 'boolean' ? (
                          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">
                            <p>
                              Rows receive 1 when the cell contains the text{' '}
                              <strong className="text-foreground">true</strong> (case-insensitive). Empty or other values return
                              0.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Value treated as true
                            </label>
                            <Input
                              value={textTrueValue}
                              onChange={(event) => handleConditionalTrueValueChange(event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Rows matching this value receive 1; everything else returns 0.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-white/5 px-3 py-1 uppercase tracking-wide">3. Add to formula</span>
                  <span>Chain analyses to build rich signals.</span>
                </div>
                <Button
                  type="button"
                  variant="muted"
                  onClick={handleAddStep}
                  disabled={!form.column || !form.methodId}
                  className="rounded-full"
                >
                  Add step
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">4. Result column</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Name your output and fine-tune the formula.</p>
                </div>
                <div className="w-full max-w-xs">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Column name
                  </label>
                  <Input value={resultName} onChange={(event) => setResultName(event.target.value)} className="mt-1" />
                </div>
              </div>

              {steps.length > 0 ? (
                <div className="mt-6 space-y-5">
                  <div className="flex flex-wrap items-start gap-3">
                    {steps.map((step, index) => {
                      const method = analysisMethodMap.get(step.methodId);
                      return (
                        <div key={step.id} className="flex items-start gap-2">
                          <Tooltip.Provider delayDuration={150}>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <div className="group flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">{step.column.metric}</p>
                                      <p className="text-xs text-muted-foreground">{method?.name ?? step.methodId}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStep(step.id)}
                                      className="rounded-full bg-background/70 p-1 text-muted-foreground transition hover:bg-red-500/20 hover:text-red-300"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Weight
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={step.weight}
                                      onChange={(event) => handleStepWeightChange(step.id, event.target.value)}
                                      className="mt-1 h-8"
                                    />
                                  </div>
                                  {isConditionalStepConfig(step.config) && (
                                    <p className="text-[11px] text-muted-foreground">
                                      Condition:{' '}
                                      <span className="font-medium text-foreground">
                                        {describeConditionalConfig(step.config)}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Content className="max-w-xs rounded-lg bg-background/90 p-3 text-xs text-muted-foreground backdrop-blur">
                                <p className="font-semibold text-foreground">{method?.name ?? step.methodId}</p>
                                <p className="mt-1">{method?.description}</p>
                                <Tooltip.Arrow className="fill-background/90" />
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                          {index < operators.length && (
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-foreground">
                              {operators[index]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {steps.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Next operator
                      </p>
                      <div className="flex items-center gap-2">
                        {OPERATOR_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setPendingOperator(option)}
                            className={cn(
                              'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-foreground',
                              pendingOperator === option && 'border-accent/60 bg-accent/10 text-foreground shadow-glow'
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">
                  Add steps to see your formula take shape. Each step produces a score between 0 and 1 that you can combine with arithmetic operators.
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={saveSinglePreset} disabled={isSavingPreset}>
                  Save as preset
                </Button>
                <Button type="button" variant="outline" onClick={saveChainPreset} disabled={isSavingChain}>
                  Save chain
                </Button>
              </div>
              {(isSavingPreset || isSavingChain) && (
                <p className="mt-2 text-xs text-muted-foreground">Saving to workspace library…</p>
              )}
            </div>

            {activePanel === 'single' && (
              <div className="rounded-2xl border border-white/10 bg-background/80 p-6 shadow-inner">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Saved analysis presets</p>
                    {filteredPresets.length > 0 && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {filteredPresets.length} {filteredPresets.length === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                </div>
                {libraryError && <p className="mt-3 text-xs text-red-400">{libraryError}</p>}
                {isSyncingLibrary && <p className="mt-3 text-xs text-muted-foreground">Loading library…</p>}
                <div className="mt-4 space-y-3">
                  {filteredPresets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {authorFilter === 'all'
                        ? 'Save an analysis to reuse it later on compatible datasets.'
                        : authorFilter === 'mine'
                          ? 'You have not saved analysis presets for this dataset yet.'
                          : 'No presets from this analyst match the current dataset yet.'}
                    </p>
                  ) : (
                    filteredPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleLoadPreset(preset)}
                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white/10"
                      >
                        <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {preset.template.columnLabel} · {analysisMethodMap.get(preset.template.methodId)?.name ?? preset.template.methodId}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <UserAvatar
                            image={preset.createdBy.image}
                            name={preset.createdBy.name ?? 'Workspace analyst'}
                            size="sm"
                          />
                          <span>{preset.createdBy.name ?? 'Workspace analyst'}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {activePanel === 'chain' && (
              <div className="rounded-2xl border border-white/10 bg-background/80 p-6 shadow-inner">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Saved chain presets</p>
                    {filteredChains.length > 0 && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {filteredChains.length} {filteredChains.length === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                  <div className="w-full sm:w-60">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Analyst</label>
                    <select
                      value={authorFilter}
                      onChange={(event) => setAuthorFilter(event.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      <option value="all">All analysts</option>
                      {currentUserId && <option value="mine">My presets</option>}
                      {availableAuthors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name ?? 'Workspace analyst'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {libraryError && <p className="mt-3 text-xs text-red-400">{libraryError}</p>}
                {isSyncingLibrary && <p className="mt-3 text-xs text-muted-foreground">Loading library…</p>}
                <div className="mt-4 space-y-3">
                  {filteredChains.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {authorFilter === 'all'
                        ? 'Save a workflow to build a reusable library of analyses.'
                        : authorFilter === 'mine'
                          ? 'You have not saved chain presets for this dataset yet.'
                          : 'No chain presets from this analyst are compatible with the current dataset yet.'}
                    </p>
                  ) : (
                    filteredChains.map((chain) => (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => handleLoadChain(chain)}
                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white/10"
                      >
                        <p className="text-sm font-semibold text-foreground">{chain.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {chain.chain.steps.length} steps · output “{chain.chain.resultName}”
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <UserAvatar
                            image={chain.createdBy.image}
                            name={chain.createdBy.name ?? 'Workspace analyst'}
                            size="sm"
                          />
                          <span>{chain.createdBy.name ?? 'Workspace analyst'}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {previewRows && analysisResultColumns && (
              <div className="rounded-2xl border border-white/10 bg-background/80 p-6 shadow-inner">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                  <span className="text-xs text-muted-foreground">
                    Showing {previewRows.length} of {analysisResultRows?.length.toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] table-fixed border-collapse text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        {analysisResultColumns.map((column) => (
                          <th key={column} className="border-b border-white/5 px-3 py-2 font-semibold uppercase tracking-wide">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`preview-${rowIndex}`} className="odd:bg-white/5">
                          {analysisResultColumns.map((column) => (
                            <td key={`${rowIndex}-${column}`} className="px-3 py-2 text-foreground">
                              {row[column] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
