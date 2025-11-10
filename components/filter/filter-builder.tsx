'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Download, Filter, FolderOpen, PlusCircle, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import type { ColumnMetadata } from '@/data/column-metadata';
import { useUploadContext, type UploadSlotKey } from '@/components/upload/upload-context';
import { applyFilters, describeOperator, getAvailableOperators, type FilterDefinition } from '@/lib/filters';
import type { DatasetRow } from '@/lib/upload-parsers';
import { cn } from '@/lib/utils';

const EMPTY_COLUMNS: ColumnMetadata[] = [];

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
  const {
    columnMetadata,
    datasetColumns,
    datasetRows,
    isReady,
    missing,
    selectedFiles,
    loadPreset
  } = useUploadContext();
  const [form, setForm] = useState<FormState>({ valuePrimary: '', valueSecondary: '' });
  const [filters, setFilters] = useState<FilterDefinition[]>([]);
  const [filterResult, setFilterResult] = useState<DatasetRow[] | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);

  const availableColumns = columnMetadata ?? EMPTY_COLUMNS;

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
    setFilterResult(null);
    setFilterError(null);
  }, [availableColumns]);

  useEffect(() => {
    setFilterResult(null);
    setFilterError(null);
  }, [datasetRows]);

  useEffect(() => {
    if (!presetOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!presetMenuRef.current) {
        return;
      }

      if (!presetMenuRef.current.contains(event.target as Node)) {
        setPresetOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [presetOpen]);

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
    setForm({ column, operator: operators[0], valuePrimary: '', valueSecondary: '' });
    setFilterError(null);
  };

  const handleAddFilter = () => {
    if (!form.column || !form.operator) {
      setForm((prev) => ({ ...prev, error: 'Choose a column and operator first.' }));
      return;
    }

    const { column, operator, valuePrimary, valueSecondary } = form;
    const isRange = operator === 'range';
    const requiresValue = operator === 'contains' || operator === 'equals' ? valuePrimary.trim() : valuePrimary !== '';

    if (!requiresValue || (isRange && valueSecondary === '')) {
      setForm((prev) => ({ ...prev, error: 'Provide filter values before saving.' }));
      return;
    }

    let parsedValue: FilterDefinition['value'] = valuePrimary;

    if (column.data_type !== 'text') {
      const primaryNumber = Number(valuePrimary);
      if (Number.isNaN(primaryNumber)) {
        setForm((prev) => ({ ...prev, error: 'Numeric filters require a valid number.' }));
        return;
      }

      if (isRange) {
        const secondaryNumber = Number(valueSecondary);
        if (Number.isNaN(secondaryNumber)) {
          setForm((prev) => ({ ...prev, error: 'Provide a valid upper bound.' }));
          return;
        }
        parsedValue = [Math.min(primaryNumber, secondaryNumber), Math.max(primaryNumber, secondaryNumber)];
      } else {
        parsedValue = primaryNumber;
      }
    } else if (operator === 'contains' || operator === 'equals') {
      parsedValue = valuePrimary.trim();
    }

    const nextFilter: FilterDefinition = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `filter-${Date.now()}`,
      columnKey: column.metric,
      columnLabel: column.metric,
      dataType: column.data_type,
      operator: { type: column.data_type, operator } as FilterDefinition['operator'],
      value: parsedValue,
      description: column.what_it_is
    };

    setFilters((prev) => [...prev, nextFilter]);
    setFilterResult(null);
    setFilterError(null);
    setForm({ column, operator, valuePrimary: '', valueSecondary: '', error: undefined });
  };

  const handleRemoveFilter = (id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
    setFilterResult(null);
    setFilterError(null);
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
  };

  const handleExportFiltered = () => {
    if (!filterResult || !datasetColumns) {
      return;
    }

    downloadFilteredCsv(filterResult, datasetColumns);
  };

  const handlePresetToggle = () => {
    setPresetOpen((previous) => !previous);
  };

  const handlePresetSave = () => {
    const payload = {
      dataset: selectedFiles.dataset ?? null,
      dictionary: selectedFiles.dictionary ?? null,
      summary: selectedFiles.summary ?? null
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'preset.json';
    anchor.click();
    URL.revokeObjectURL(url);

    setPresetError(null);
    setPresetFeedback('Preset saved as preset.json.');
    setPresetOpen(false);
  };

  const handlePresetLoadRequest = () => {
    presetInputRef.current?.click();
    setPresetOpen(false);
  };

  const handlePresetFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<Record<UploadSlotKey, string | null>>;
      const sanitized: Partial<Record<UploadSlotKey, string | null>> = {};

      (['dataset', 'dictionary', 'summary'] as UploadSlotKey[]).forEach((key) => {
        const value = data[key];
        if (typeof value === 'string' || value === null) {
          sanitized[key] = value;
        }
      });

      loadPreset(sanitized);
      setPresetError(null);
      setPresetFeedback('Preset loaded. Re-upload files if required to restore data.');
    } catch (error) {
      console.error(error);
      setPresetFeedback(null);
      setPresetError('Failed to load preset. Ensure the JSON is valid.');
    } finally {
      event.target.value = '';
    }
  };

  const totalRows = datasetRows?.length ?? 0;

  return (
    <div className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <Card className="h-full">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter size={20} /> Build account filters
          </CardTitle>
          <CardDescription>
            Combine as many column rules as needed to narrow the wallet cohort you want to investigate.
          </CardDescription>

          <div className="mt-8 space-y-8">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Choose a column</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {availableColumns.map((column) => {
                  const active = form.column?.metric === column.metric;
                  return (
                    <Tooltip.Provider key={column.metric} delayDuration={150}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            type="button"
                            onClick={() => handleSelectColumn(column)}
                            className={cn(
                              'w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left text-sm transition',
                              active ? 'border-accent bg-accent/10 shadow-glow' : 'hover:border-accent/30 hover:bg-white/10'
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-foreground">{column.metric}</span>
                              <Badge className="bg-transparent text-xs text-muted-foreground">{column.data_type}</Badge>
                            </div>
                            <p className="mt-2 h-[3.2rem] overflow-hidden text-xs text-muted-foreground">
                              {column.what_it_is}
                            </p>
                            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
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
                        <Tooltip.Content side="bottom" className="max-w-xs rounded-md bg-muted/95 p-3 text-xs text-foreground shadow-lg">
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

            {form.column && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Configure the rule</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Operator</span>
                      <select
                        value={form.operator}
                        onChange={(event) => setForm((prev) => ({ ...prev, operator: event.target.value }))}
                        className="h-11 w-full rounded-lg border border-white/5 bg-muted/60 px-4 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
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
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={handleAddFilter} className="gap-2">
                    <PlusCircle size={18} /> Save filter
                  </Button>
                  {form.error && <p className="text-sm text-red-400">{form.error}</p>}
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <Filter size={18} /> Active filters
          </CardTitle>
          <CardDescription>Adjust or remove saved filters before applying them to the dataset.</CardDescription>

          <div className="mt-6 space-y-3">
            {filters.length === 0 && <p className="text-sm text-muted-foreground">No filters saved yet.</p>}
            {filters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">
                    {filter.columnLabel}{' '}
                    <span className="text-muted-foreground">· {describeOperator(filter.operator.operator)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{filter.description}</p>
                  <Badge className="bg-transparent text-muted-foreground">
                    Value:{' '}
                    {Array.isArray(filter.value) ? `${filter.value[0]} → ${filter.value[1]}` : String(filter.value)}
                  </Badge>
                </div>
                <Button variant="muted" size="sm" onClick={() => handleRemoveFilter(filter.id)} className="gap-2">
                  <Trash2 size={16} /> Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleFilterDown}
              disabled={filters.length === 0 || !datasetRows}
            >
              <Filter size={16} /> Filter down
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={handleExportFiltered}
              disabled={!filterResult || !datasetColumns}
            >
              <Download size={16} /> Export filtered
            </Button>
            <div className="relative" ref={presetMenuRef}>
              <Button type="button" variant="outline" className="gap-2" onClick={handlePresetToggle}>
                <SlidersHorizontal size={16} /> Preset
              </Button>
              {presetOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-white/10 bg-background/95 p-2 shadow-xl backdrop-blur">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-white/10"
                    onClick={handlePresetSave}
                  >
                    <Save size={16} /> Save current state
                  </button>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-white/10"
                    onClick={handlePresetLoadRequest}
                  >
                    <FolderOpen size={16} /> Load current state
                  </button>
                </div>
              )}
            </div>
            <input
              ref={presetInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handlePresetFileChange}
            />
          </div>

          {(presetFeedback || presetError) && (
            <p className={`mt-3 text-sm ${presetError ? 'text-red-400' : 'text-muted-foreground'}`}>
              {presetError ?? presetFeedback}
            </p>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            {filterResult === null
              ? totalRows > 0
                ? `Apply the filters to preview how many of the ${totalRows.toLocaleString()} uploaded rows remain.`
                : 'Upload a dataset to calculate filtered results.'
              : `Filtered rows: ${filterResult.length.toLocaleString()} of ${totalRows.toLocaleString()}`}
          </p>
          {filterError && <p className="mt-2 text-sm text-red-400">{filterError}</p>}
        </Card>
      </aside>
    </div>
  );
}
