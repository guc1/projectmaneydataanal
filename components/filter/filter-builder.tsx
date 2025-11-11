'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Filter, Plus, Trash2 } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { ColumnMetadata } from '@/data/column-metadata';
import { useUploadContext } from '@/components/upload/upload-context';
import { applyFilters, describeOperator, getAvailableOperators, type FilterDefinition } from '@/lib/filters';
import type { DatasetRow } from '@/lib/upload-parsers';
import { cn } from '@/lib/utils';
import type {
  FilterTemplatePayload,
  PresetAuthor,
  SavedPresetChainRecord,
  SavedPresetRecord
} from '@/lib/filter-presets/types';

const EMPTY_COLUMNS: ColumnMetadata[] = [];

const CATEGORY_GROUPS = [
  {
    id: 'other',
    label: 'Other',
    metrics: [
      'rank',
      'proxyWallet',
      'userName',
      'xUsername',
      'verifiedBadge',
      'vol',
      'pnl',
      'profileImage',
      'total_volume',
      'position_to_volume_ratio',
      'gaintovolume_pct',
      'losstovolume_pct',
      'nettotaltovolume_pct',
      'gaintoloss'
    ]
  },
  {
    id: 'delta',
    label: 'Delta',
    metrics: [
      'mean_delta_1d',
      'mean_delta_1w',
      'mean_delta_1m',
      'mean_delta_all',
      'smoothness_1d',
      'smoothness_1w',
      'smoothness_1m',
      'smoothness_all',
      'plus_delta_pct_1d',
      'plus_delta_pct_1w',
      'plus_delta_pct_1m',
      'plus_delta_pct_all',
      'min_delta_pct_1d',
      'min_delta_pct_1w',
      'min_delta_pct_1m',
      'min_delta_pct_all',
      'gain_1d',
      'gain_1w',
      'gain_1m',
      'gain_all',
      'loss_1d',
      'loss_1w',
      'loss_1m',
      'loss_all',
      'net_total_1d',
      'net_total_1w',
      'net_total_1m',
      'net_total_all'
    ]
  },
  {
    id: 'open',
    label: 'Open',
    metrics: [
      'OPEN_trades',
      'OPEN_largestWin',
      'OPEN_views',
      'OPEN_joinDate',
      'OPEN_pos_count',
      'OPEN_win_loss_ratio',
      'OPEN_avg_percentPnl_win',
      'OPEN_avg_percentPnl_loss',
      'OPEN_portfolio_nrr_all',
      'OPEN_pnl_std_all',
      'OPEN_risk_adjusted_score_all',
      'OPEN_avg_shares_win',
      'OPEN_avg_shares_loss',
      'OPEN_avg_avgPrice_win',
      'OPEN_median_avgPrice_win',
      'OPEN_avg_curPrice_win',
      'OPEN_median_curPrice_win',
      'OPEN_avg_avgPrice_loss',
      'OPEN_median_avgPrice_loss',
      'OPEN_avg_curPrice_loss',
      'OPEN_median_curPrice_loss',
      'OPEN_yes_no_ratio',
      'OPEN_eventId_spread_pct'
    ]
  },
  {
    id: 'closed',
    label: 'Closed',
    metrics: [
      'CLOSED_win_loss_ratio',
      'CLOSED_avg_percentPnl_win',
      'CLOSED_avg_percentPnl_loss',
      'CLOSED_portfolio_nrr_all',
      'CLOSED_pnl_std_all',
      'CLOSED_risk_adjusted_score_all',
      'CLOSED_avg_shares_win',
      'CLOSED_avg_shares_loss',
      'CLOSED_avg_realizedPnl_win',
      'CLOSED_median_realizedPnl_win',
      'CLOSED_avg_realizedPnl_loss',
      'CLOSED_median_realizedPnl_loss',
      'CLOSED_avg_avgPrice_win',
      'CLOSED_median_avgPrice_win',
      'CLOSED_avg_avgPrice_loss',
      'CLOSED_median_avgPrice_loss',
      'CLOSED_yes_no_ratio',
      'CLOSED_eventSlug_spread_pct',
      'CLOSED_arbitrage_pct',
      'CLOSED_zero_ratio',
      'CLOSED_<2%_wins_ratio',
      'CLOSED_2%to6%_wins_ratio',
      'CLOSED_6%to10%_wins_ratio',
      'CLOSED_10%to20%_wins_ratio',
      'CLOSED_20%to40%_wins_ratio',
      'CLOSED_40%to80%_wins_ratio',
      'CLOSED_80%to90%_wins_ratio',
      'CLOSED_90%to100%_wins_ratio'
    ]
  },
  {
    id: 'activity',
    label: 'Activity',
    metrics: [
      'ACTIVITY_tradecount',
      'ACTIVITY_avgintbettrades_min',
      'ACTIVITY_day_coverage_avg_pct',
      'ACTIVITY_day_coverage_max_pct',
      'ACTIVITY_concentration_score_avg',
      'ACTIVITY_avg_size_buy',
      'ACTIVITY_median_size_buy',
      'ACTIVITY_avg_size_sell',
      'ACTIVITY_median_size_sell',
      'ACTIVITY_avg_usdc_buy',
      'ACTIVITY_median_usdc_buy',
      'ACTIVITY_avg_usdc_sell',
      'ACTIVITY_median_usdc_sell',
      'ACTIVITY_avg_price_trade',
      'ACTIVITY_priceextremes_pct',
      'ACTIVITY_arbitrage_count',
      'ACTIVITY_arbitrage_trade_share_pct',
      'ACTIVITY_arbitrage_usd_earned_total',
      'ACTIVITY_quick_0_1s_pct',
      'ACTIVITY_quick_1_5s_pct',
      'ACTIVITY_quick_5_20s_pct',
      'ACTIVITY_quick_20_60s_pct',
      'ACTIVITY_quick_60_600s_pct',
      'ACTIVITY_quick_600_3600s_pct',
      'ACTIVITY_quick_3600_86400s_pct',
      'ACTIVITY_quick_ge_86400s_pct',
      'ACTIVITY_quick_profit_0_5s_usd',
      'ACTIVITY_quick_profit_5_20s_usd',
      'ACTIVITY_fillup_pct_of_trades',
      'ACTIVITY_fillup_usd_earned_total',
      'ACTIVITY_buy_gt_95_pct_of_trades',
      'ACTIVITY_merge_pct_all_types',
      'ACTIVITY_split_pct_all_types',
      'ACTIVITY_buy_sell_ratio',
      'ACTIVITY_rewards_usd_total',
      'ACTIVITY_rewards_share_of_approx_netprofit_pct',
      'ACTIVITY_mm_opposite_round_trip_5s_pct',
      'ACTIVITY_mm_simultaneous_dual_side_5s_pct'
    ]
  }
] as const;

type FilterTemplate = FilterTemplatePayload;

type SavedPreset = SavedPresetRecord;

type SavedChain = SavedPresetChainRecord;

type FormState = {
  column?: ColumnMetadata;
  operator?: string;
  valuePrimary: string;
  valueSecondary: string;
  error?: string;
};

const downloadFilteredCsv = (rows: DatasetRow[], columns: string[]) => {
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
  anchor.download = 'filtered-results.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

export function FilterBuilder() {
  const { columnMetadata, datasetColumns, datasetRows, isReady, missing } = useUploadContext();
  const { data: session } = useSession();
  const [form, setForm] = useState<FormState>({ valuePrimary: '', valueSecondary: '' });
  const [filters, setFilters] = useState<FilterDefinition[]>([]);
  const [filterResult, setFilterResult] = useState<DatasetRow[] | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'category' | 'single' | 'chain' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isBrowsingMetrics, setIsBrowsingMetrics] = useState(true);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [savedChains, setSavedChains] = useState<SavedChain[]>([]);
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isSavingChain, setIsSavingChain] = useState(false);

  const availableColumns = columnMetadata ?? EMPTY_COLUMNS;
  const currentUserId = session?.user?.id ?? null;

  const generateId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const instantiateFilter = (template: FilterTemplate): FilterDefinition => ({
    ...template,
    id: generateId()
  });

  useEffect(() => {
    let isActive = true;

    const fetchLibrary = async () => {
      setIsSyncingLibrary(true);
      setLibraryError(null);
      try {
        const response = await fetch('/api/filter-presets');
        if (!response.ok) {
          let message = 'Unable to load saved presets.';
          try {
            const data = await response.json();
            if (data && typeof data.error === 'string') {
              message = data.error;
            }
          } catch {
            // ignore JSON parse errors
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          presets?: SavedPresetRecord[];
          chains?: SavedPresetChainRecord[];
        };

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
        setLibraryError(error instanceof Error ? error.message : 'Unable to load saved presets.');
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
      return { valuePrimary: '', valueSecondary: '' };
    });

    setFilters((previous) =>
      previous.filter((filter) => availableColumns.some((column) => column.metric === filter.columnKey))
    );
    setSavedPresets((previous) =>
      previous.filter((preset) => availableColumns.some((column) => column.metric === preset.template.columnKey))
    );
    setSavedChains((previous) =>
      previous
        .map((chain) => ({
          ...chain,
          templates: chain.templates.filter((template) =>
            availableColumns.some((column) => column.metric === template.columnKey)
          )
        }))
        .filter((chain) => chain.templates.length > 0)
    );
    setFilterResult(null);
    setFilterError(null);
  }, [availableColumns]);

  useEffect(() => {
    setFilterResult(null);
    setFilterError(null);
  }, [datasetRows]);

  const formatNumber = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const availableOperators = useMemo(() => {
    if (!form.column) return [];
    return getAvailableOperators(form.column.data_type);
  }, [form.column]);

  const selectedCategoryGroup = useMemo(
    () => CATEGORY_GROUPS.find((group) => group.id === selectedCategory) ?? null,
    [selectedCategory]
  );

  const categoryColumns = useMemo(() => {
    if (!selectedCategoryGroup) {
      return [] as ColumnMetadata[];
    }
    return selectedCategoryGroup.metrics
      .map((metric) => availableColumns.find((column) => column.metric === metric))
      .filter((column): column is ColumnMetadata => Boolean(column));
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
  }, [currentUserId, authorFilter]);

  useEffect(() => {
    if (authorFilter !== 'all' && authorFilter !== 'mine') {
      const exists = availableAuthors.some((author) => author.id === authorFilter);
      if (!exists) {
        setAuthorFilter('all');
      }
    }
  }, [availableAuthors, authorFilter]);

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

  const filteredPresets = useMemo(
    () => savedPresets.filter((preset) => matchesAuthor(preset.createdBy.id)),
    [savedPresets, matchesAuthor]
  );

  const filteredChains = useMemo(
    () => savedChains.filter((chain) => matchesAuthor(chain.createdBy.id)),
    [savedChains, matchesAuthor]
  );

  const createTemplateFromForm = (): FilterTemplate | null => {
    if (!form.column || !form.operator) {
      setForm((prev) => ({ ...prev, error: 'Choose a column and operator first.' }));
      return null;
    }

    const { column, operator, valuePrimary, valueSecondary } = form;
    const isRange = operator === 'range';
    const requiresValue = operator === 'contains' || operator === 'equals' ? valuePrimary.trim() : valuePrimary !== '';

    if (!requiresValue || (isRange && valueSecondary === '')) {
      setForm((prev) => ({ ...prev, error: 'Provide filter values before continuing.' }));
      return null;
    }

    let parsedValue: FilterDefinition['value'] = valuePrimary;

    if (column.data_type !== 'text') {
      const primaryNumber = Number(valuePrimary);
      if (Number.isNaN(primaryNumber)) {
        setForm((prev) => ({ ...prev, error: 'Numeric filters require a valid number.' }));
        return null;
      }

      if (isRange) {
        const secondaryNumber = Number(valueSecondary);
        if (Number.isNaN(secondaryNumber)) {
          setForm((prev) => ({ ...prev, error: 'Provide a valid upper bound.' }));
          return null;
        }
        parsedValue = [Math.min(primaryNumber, secondaryNumber), Math.max(primaryNumber, secondaryNumber)];
      } else {
        parsedValue = primaryNumber;
      }
    } else if (operator === 'contains' || operator === 'equals') {
      parsedValue = valuePrimary.trim();
    }

    const template: FilterTemplate = {
      columnKey: column.metric,
      columnLabel: column.metric,
      dataType: column.data_type,
      operator: { type: column.data_type, operator } as FilterDefinition['operator'],
      value: parsedValue,
      description: column.what_it_is
    };

    return template;
  };

  const extractErrorMessage = async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      if (data && typeof data.error === 'string') {
        return data.error;
      }
      if (data && typeof data.error === 'object') {
        const candidates = Object.values(data.error as Record<string, unknown>);
        for (const candidate of candidates) {
          if (Array.isArray(candidate)) {
            const first = candidate.find((entry) => typeof entry === 'string');
            if (first) {
              return first;
            }
          }
        }
      }
    } catch {
      // ignore parsing failures
    }
    return fallback;
  };

  const formatPresetDate = (value: string) => new Date(value).toLocaleString();

  if (!isReady) {
    return (
      <div className="mt-16">
        <Card className="border-dashed border-white/10 bg-white/5">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter size={20} /> Build account filters
          </CardTitle>
          <CardDescription>
            Upload the account dataset, column dictionary, and median & averages file to enable filtering.
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

  const handleSelectColumn = (column: ColumnMetadata) => {
    const operators = getAvailableOperators(column.data_type);
    setForm({ column, operator: operators[0], valuePrimary: '', valueSecondary: '', error: undefined });
    setFilterError(null);
    setActivePanel(null);
    const group = CATEGORY_GROUPS.find((category) => category.metrics.includes(column.metric));
    setSelectedCategory(group ? group.id : null);
    setIsBrowsingMetrics(false);
  };

  const handleAddToFlow = () => {
    const template = createTemplateFromForm();
    if (!template) {
      return;
    }

    setFilters((prev) => [...prev, instantiateFilter(template)]);
    setFilterResult(null);
    setFilterError(null);
    setForm((prev) => ({ ...prev, valuePrimary: '', valueSecondary: '', error: undefined }));
    setActivePanel(null);
  };

  const setFormFromTemplate = (template: FilterTemplate) => {
    const column = availableColumns.find((item) => item.metric === template.columnKey);
    if (!column) {
      setForm({ valuePrimary: '', valueSecondary: '', error: 'Column not available in current dataset.' });
      return;
    }

    const operator = template.operator.operator;
    let valuePrimary = '';
    let valueSecondary = '';

    if (Array.isArray(template.value)) {
      valuePrimary = String(template.value[0] ?? '');
      valueSecondary = String(template.value[1] ?? '');
    } else {
      valuePrimary = String(template.value ?? '');
    }

    setForm({ column, operator, valuePrimary, valueSecondary, error: undefined });
    const group = CATEGORY_GROUPS.find((category) => category.metrics.includes(column.metric));
    setSelectedCategory(group ? group.id : null);
  };

  const handleSavePreset = async () => {
    const template = createTemplateFromForm();
    if (!template) {
      return;
    }

    if (!session?.user?.id) {
      setFilterError('Sign in before saving presets.');
      return;
    }

    const defaultName = `${template.columnLabel} · ${describeOperator(template.operator.operator)}`;
    let name = defaultName;
    if (typeof window !== 'undefined') {
      const response = window.prompt('Name this preset', defaultName);
      if (!response) {
        return;
      }
      name = response.trim();
      if (!name) {
        return;
      }
    }

    setIsSavingPreset(true);
    setLibraryError(null);
    setFilterError(null);

    try {
      const response = await fetch('/api/filter-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'single', name, template })
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Unable to save preset.');
        throw new Error(message);
      }

      const payload = (await response.json()) as { preset: SavedPresetRecord };
      setSavedPresets((prev) => [payload.preset, ...prev]);
      setForm((prev) => ({ ...prev, error: undefined }));
      if (currentUserId) {
        setAuthorFilter((prev) => (prev === 'all' ? 'mine' : prev));
      }
    } catch (error) {
      console.error(error);
      setLibraryError(error instanceof Error ? error.message : 'Unable to save preset.');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleLoadSinglePreset = (preset: SavedPreset) => {
    setFilterError(null);
    setFilterResult(null);
    setActivePanel(null);
    setFormFromTemplate(preset.template);
  };

  const handleSaveChain = async () => {
    if (filters.length === 0) {
      setFilterError('Add at least one filter before saving a preset chain.');
      return;
    }

    if (!session?.user?.id) {
      setFilterError('Sign in before saving preset chains.');
      return;
    }

    const defaultName = `Chain · ${filters.length} filter${filters.length === 1 ? '' : 's'}`;
    let name = defaultName;
    if (typeof window !== 'undefined') {
      const response = window.prompt('Name this preset chain', defaultName);
      if (!response) {
        return;
      }
      name = response.trim();
      if (!name) {
        return;
      }
    }

    const templates = filters.map(({ id: _id, ...rest }) => rest);
    setIsSavingChain(true);
    setLibraryError(null);
    setFilterError(null);

    try {
      const response = await fetch('/api/filter-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chain', name, templates })
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Unable to save preset chain.');
        throw new Error(message);
      }

      const payload = (await response.json()) as { chain: SavedPresetChainRecord };
      setSavedChains((prev) => [payload.chain, ...prev]);
      if (currentUserId) {
        setAuthorFilter((prev) => (prev === 'all' ? 'mine' : prev));
      }
    } catch (error) {
      console.error(error);
      setLibraryError(error instanceof Error ? error.message : 'Unable to save preset chain.');
    } finally {
      setIsSavingChain(false);
    }
  };

  const handleLoadPresetChain = (chain: SavedChain) => {
    setFilters(chain.templates.map((template) => instantiateFilter(template)));
    setFilterError(null);
    setFilterResult(null);
    setActivePanel(null);
    if (chain.templates.length > 0) {
      setFormFromTemplate(chain.templates[chain.templates.length - 1]);
    }
  };

  const handleOpenPanel = (panel: 'category' | 'single' | 'chain') => {
    setActivePanel((previous) => {
      const next = previous === panel ? null : panel;
      if (next === 'category') {
        setSelectedCategory((current) => current ?? CATEGORY_GROUPS[0]?.id ?? null);
      }
      if (panel === 'category') {
        setIsBrowsingMetrics(next === 'category');
      } else {
        setIsBrowsingMetrics(false);
      }
      return next;
    });
    if (panel === 'category') {
      setFilterError(null);
    }
  };

  const handleRevealMetricBrowser = () => {
    setIsBrowsingMetrics(true);
    setActivePanel('category');
  };

  const handleRemoveFilter = (id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
    setFilterResult(null);
    setFilterError(null);
    setActivePanel(null);
  };

  const handleFilterDown = () => {
    if (!datasetRows) {
      setFilterError('Upload a dataset before applying filters.');
      return;
    }

    if (filters.length === 0) {
      setFilterError('Add at least one filter before applying.');
      return;
    }

    const result = applyFilters(datasetRows, filters);
    setFilterResult(result);
    setFilterError(null);
    setActivePanel(null);
  };

  const handleExportFiltered = () => {
    if (!filterResult || !datasetColumns) {
      return;
    }

    downloadFilteredCsv(filterResult, datasetColumns);
  };

  const totalRows = datasetRows?.length ?? 0;
  const shouldShowCategoryBrowser = (!form.column || isBrowsingMetrics) && activePanel !== 'single' && activePanel !== 'chain';

  return (
    <div className="mt-16 space-y-10">
      <Card className="border border-white/10 bg-background/80 p-6 shadow-lg shadow-accent/10 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter size={20} /> Apply flow
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Run the current flow against the uploaded dataset, preview the remaining rows, and export the result.
            </CardDescription>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
            <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Uploaded rows</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{totalRows.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Filters in flow</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{filters.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preview</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {filterResult === null ? '—' : filterResult.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              className="w-full gap-2 text-base font-semibold sm:w-auto"
              onClick={handleFilterDown}
              disabled={filters.length === 0 || !datasetRows}
            >
              <Filter size={18} /> Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={handleExportFiltered}
              disabled={!filterResult || !datasetColumns}
            >
              <Download size={16} /> Download filtered CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground lg:max-w-md">
            {filterResult === null
              ? totalRows > 0
                ? 'Apply the flow to reveal how many wallets remain.'
                : 'Upload a dataset to begin filtering.'
              : `Filtered rows: ${filterResult.length.toLocaleString()} of ${totalRows.toLocaleString()}`}
          </p>
        </div>
        {filterError && <p className="mt-4 text-sm text-red-400">{filterError}</p>}
      </Card>

      <section>
        <Card className="h-full">
          <div className="space-y-8">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Filter size={20} /> Build account filters
              </CardTitle>
              <CardDescription>
                Visualise and orchestrate multi-step filters to surface the wallets that matter most.
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
                Load preset chain
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
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {form.column.average !== undefined && (
                      <span className="rounded-full bg-background/70 px-3 py-1">
                        avg: <strong className="text-foreground">{formatNumber(form.column.average)}</strong>
                      </span>
                    )}
                    {form.column.median !== undefined && (
                      <span className="rounded-full bg-background/70 px-3 py-1">
                        median: <strong className="text-foreground">{formatNumber(form.column.median)}</strong>
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="muted"
                      size="sm"
                      onClick={handleRevealMetricBrowser}
                      className="rounded-full border border-white/10 bg-white/10 px-4"
                    >
                      Pick a different metric
                    </Button>
                  </div>
                </div>
              )}

              {shouldShowCategoryBrowser && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {CATEGORY_GROUPS.map((group) => {
                      const availableCount = group.metrics.filter((metric) =>
                        availableColumns.some((column) => column.metric === metric)
                      ).length;
                      const isActive = selectedCategory === group.id;
                      const hasColumns = availableCount > 0;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => hasColumns && setSelectedCategory(group.id)}
                          disabled={!hasColumns}
                          className={cn(
                            'min-w-[160px] rounded-xl border border-white/5 bg-white/5 px-5 py-3 text-left text-sm transition hover:border-accent/40 hover:bg-white/10',
                            isActive && 'border-accent/60 bg-accent/15 text-foreground shadow-glow',
                            !hasColumns && 'cursor-not-allowed opacity-50 hover:border-white/5 hover:bg-white/5'
                          )}
                        >
                          <span className="block font-semibold text-foreground">{group.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {hasColumns ? `${availableCount} metrics` : 'Unavailable'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedCategoryGroup && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {selectedCategoryGroup.label} metrics
                      </p>
                      <div className="mt-4 grid gap-5 md:grid-cols-2">
                        {categoryColumns.length === 0 && (
                          <p className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-12 text-center text-sm text-muted-foreground">
                            No uploaded columns match this category yet.
                          </p>
                        )}
                        {categoryColumns.map((column) => {
                          const active = form.column?.metric === column.metric;
                          return (
                            <Tooltip.Provider key={column.metric} delayDuration={150}>
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectColumn(column)}
                                    className={cn(
                                      'h-full w-full rounded-2xl border border-white/5 bg-white/5 p-5 text-left text-sm transition hover:border-accent/40 hover:bg-white/10',
                                      active && 'border-accent/60 bg-accent/20 shadow-glow'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <span className="font-semibold text-foreground">{column.metric}</span>
                                      <Badge className="border-white/20 bg-transparent text-xs text-muted-foreground">
                                        {column.data_type}
                                      </Badge>
                                    </div>
                                    <p className="mt-3 min-h-[3.75rem] overflow-hidden text-xs leading-5 text-muted-foreground">
                                      {column.what_it_is}
                                    </p>
                                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                      {column.average !== undefined && (
                                        <span>
                                          avg: <strong className="text-foreground">{formatNumber(column.average)}</strong>
                                        </span>
                                      )}
                                      {column.median !== undefined && (
                                        <span>
                                          median: <strong className="text-foreground">{formatNumber(column.median)}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                </Tooltip.Trigger>
                                <Tooltip.Content
                                  side="bottom"
                                  className="max-w-xs rounded-md bg-muted/95 p-3 text-xs text-foreground shadow-lg"
                                >
                                  <p className="font-semibold">{column.metric}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">{column.what_it_is}</p>
                                  <div className="mt-2 space-y-1 text-[11px]">
                                    <p>
                                      <span className="font-semibold text-foreground">Data type:</span> {column.data_type}
                                    </p>
                                    <p>
                                      <span className="font-semibold text-foreground">Higher is:</span> {column.higher_is}
                                    </p>
                                    {column.units_or_range && (
                                      <p>
                                        <span className="font-semibold text-foreground">Units / range:</span> {column.units_or_range}
                                      </p>
                                    )}
                                  </div>
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {activePanel === 'single' && (
              <div className="rounded-2xl border border-white/10 bg-background/80 p-6 shadow-inner">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Saved presets</p>
                    {filteredPresets.length > 0 && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {filteredPresets.length} {filteredPresets.length === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                  <div className="w-full sm:w-60">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Analyst
                    </label>
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
                {isSyncingLibrary && (
                  <p className="mt-3 text-xs text-muted-foreground">Loading library…</p>
                )}
                <div className="mt-4 space-y-3">
                  {filteredPresets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {authorFilter === 'all'
                        ? 'Save a rule to reuse it later on any dataset with the same column.'
                        : authorFilter === 'mine'
                          ? 'You haven’t saved presets for this dataset yet.'
                          : 'No presets from this analyst are compatible with the current dataset yet.'}
                    </p>
                  ) : (
                    filteredPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleLoadSinglePreset(preset)}
                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white/10"
                      >
                        <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {preset.template.columnLabel} · {describeOperator(preset.template.operator.operator)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <UserAvatar
                            image={preset.createdBy.image}
                            name={preset.createdBy.name ?? 'Workspace analyst'}
                            size="sm"
                          />
                          <span>{preset.createdBy.name ?? 'Workspace analyst'}</span>
                          <span className="hidden text-muted-foreground/70 sm:inline">•</span>
                          <span className="text-muted-foreground/80">{formatPresetDate(preset.createdAt)}</span>
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
                    <p className="text-sm font-semibold text-foreground">Saved preset chains</p>
                    {filteredChains.length > 0 && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {filteredChains.length} {filteredChains.length === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                  <div className="w-full sm:w-60">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Analyst
                    </label>
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
                {isSyncingLibrary && (
                  <p className="mt-3 text-xs text-muted-foreground">Loading library…</p>
                )}
                <div className="mt-4 space-y-3">
                  {filteredChains.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {authorFilter === 'all'
                        ? 'Save a flow to build libraries of multi-step filters.'
                        : authorFilter === 'mine'
                          ? 'You haven’t saved preset chains for this dataset yet.'
                          : 'No preset chains from this analyst are compatible with the current dataset yet.'}
                    </p>
                  ) : (
                    filteredChains.map((chain) => (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => handleLoadPresetChain(chain)}
                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white/10"
                      >
                        <p className="text-sm font-semibold text-foreground">{chain.name}</p>
                        <p className="text-xs text-muted-foreground">{chain.templates.length} filters</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <UserAvatar
                            image={chain.createdBy.image}
                            name={chain.createdBy.name ?? 'Workspace analyst'}
                            size="sm"
                          />
                          <span>{chain.createdBy.name ?? 'Workspace analyst'}</span>
                          <span className="hidden text-muted-foreground/70 sm:inline">•</span>
                          <span className="text-muted-foreground/80">{formatPresetDate(chain.createdAt)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-background/70 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Configure the rule</h4>
                  {form.column && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {form.column.metric} · {form.column.what_it_is}
                    </p>
                  )}
                </div>
                {form.column && (
                  <Badge className="border-white/20 bg-accent/20 text-xs text-accent">
                    {form.column.data_type}
                  </Badge>
                )}
              </div>
              {form.column ? (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Operator</span>
                      <select
                        value={form.operator}
                        onChange={(event) => setForm((prev) => ({ ...prev, operator: event.target.value }))}
                        className="h-11 w-full rounded-lg border border-white/10 bg-muted/60 px-4 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        {availableOperators.map((operator) => (
                          <option key={operator} value={operator}>
                            {describeOperator(operator)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {form.operator === 'range' ? 'Lower bound' : 'Value'}
                      </span>
                      <Input
                        type={form.column.data_type === 'text' ? 'text' : 'number'}
                        value={form.valuePrimary}
                        placeholder={form.column.data_type === 'text' ? 'Enter text value' : 'Enter value'}
                        onChange={(event) => setForm((prev) => ({ ...prev, valuePrimary: event.target.value }))}
                      />
                    </label>

                    {form.operator === 'range' && (
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Upper bound</span>
                        <Input
                          type="number"
                          value={form.valueSecondary}
                          placeholder="Enter maximum"
                          onChange={(event) => setForm((prev) => ({ ...prev, valueSecondary: event.target.value }))}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="muted"
                      onClick={() => void handleSavePreset()}
                      className="gap-2 rounded-full border border-white/10 bg-white/10 px-6"
                      disabled={isSavingPreset}
                    >
                      <Plus size={16} /> {isSavingPreset ? 'Saving…' : 'Save preset'}
                    </Button>
                    <Button type="button" onClick={handleAddToFlow} className="gap-2 rounded-full px-6">
                      <Filter size={16} /> Add to flow
                    </Button>
                    {form.error && <p className="text-sm text-red-400">{form.error}</p>}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">
                  Choose a metric from the categories to configure your first rule.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">3. Filter flow</h4>
                <Button
                  type="button"
                  variant="muted"
                  size="sm"
                  disabled={filters.length === 0 || isSavingChain}
                  onClick={() => void handleSaveChain()}
                  className="gap-2 rounded-full border border-white/10 bg-white/10 px-4"
                >
                  {isSavingChain ? 'Saving…' : 'Save chain'}
                </Button>
              </div>
              <div className="mt-6 space-y-4">
                {filters.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-muted-foreground">
                    Your flow is empty. Add a filter to start crafting a preset chain.
                  </p>
                )}
                {filters.map((filter, index) => (
                  <div key={filter.id} className="relative">
                    {index > 0 && <div className="absolute left-5 top-[-1.5rem] h-6 w-px bg-accent/40" />}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{filter.columnLabel}</p>
                          <p className="text-xs text-muted-foreground">{filter.description}</p>
                        </div>
                        <Badge className="border-white/20 bg-transparent text-xs text-muted-foreground">
                          {describeOperator(filter.operator.operator)}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className="rounded-full bg-background/70 px-3 py-1 font-medium text-foreground">
                          {Array.isArray(filter.value)
                            ? `${filter.value[0]} → ${filter.value[1]}`
                            : String(filter.value)}
                        </span>
                        <Button
                          type="button"
                          variant="muted"
                          size="sm"
                          onClick={() => handleRemoveFilter(filter.id)}
                          className="gap-2"
                        >
                          <Trash2 size={16} /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenPanel('category')}
                  className="flex items-center gap-3 rounded-full border border-dashed border-orange-400/70 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/20"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Plus size={18} />
                  </span>
                  Add another filter
                </button>
                <p className="text-xs text-muted-foreground">
                  Chain length:{' '}
                  <span className="font-semibold text-foreground">{filters.length}</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
