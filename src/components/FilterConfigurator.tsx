import React, { useMemo, useState } from 'react';
import { ColumnMetadata, normaliseNumber } from '../utils/dataParsers';
import { FilterDefinition, FilterOperation } from '../hooks/useFilters';
import './FilterConfigurator.css';

interface FilterConfiguratorProps {
  column: ColumnMetadata | null;
  onCreate: (filter: FilterDefinition) => void;
}

const SUPPORTED_NUMERIC = new Set(['number', 'numeric', 'float', 'integer', 'int', 'decimal']);
const SUPPORTED_BOOLEAN = new Set(['boolean', 'bool']);

const FilterConfigurator: React.FC<FilterConfiguratorProps> = ({ column, onCreate }) => {
  const [operation, setOperation] = useState<FilterOperation>('range');
  const [valueA, setValueA] = useState('');
  const [valueB, setValueB] = useState('');

  const resetValues = () => {
    setValueA('');
    setValueB('');
  };

  React.useEffect(() => {
    resetValues();
    if (!column) {
      return;
    }
    if (SUPPORTED_NUMERIC.has(column.data_type.toLowerCase())) {
      setOperation('range');
    } else if (SUPPORTED_BOOLEAN.has(column.data_type.toLowerCase())) {
      setOperation('equals');
      setValueA('true');
    } else {
      setOperation('contains');
    }
  }, [column]);

  const dataType = useMemo(() => {
    if (!column) {
      return 'other';
    }
    const type = column.data_type.toLowerCase();
    if (SUPPORTED_NUMERIC.has(type)) {
      return 'number';
    }
    if (SUPPORTED_BOOLEAN.has(type)) {
      return 'boolean';
    }
    if (type.includes('text') || type.includes('string') || type.includes('category')) {
      return 'text';
    }
    return 'other';
  }, [column]);

  const operationOptions = useMemo(() => {
    switch (dataType) {
      case 'number':
        return [
          { value: 'range', label: 'Within range' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' }
        ];
      case 'boolean':
        return [{ value: 'equals', label: 'Equals' }];
      default:
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' }
        ];
    }
  }, [dataType]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!column) {
      return;
    }

    const id = `${column.metric}-${Date.now()}`;
    const label = `${column.metric} ${operation}`;

    const parseNumeric = (input: string): number | null => normaliseNumber(input);

    let values: (string | number | null)[] = [];

    if (dataType === 'number') {
      if (operation === 'range') {
        const min = parseNumeric(valueA);
        const max = parseNumeric(valueB);
        values = [min, max];
      } else {
        values = [parseNumeric(valueA)];
      }
    } else if (dataType === 'boolean') {
      values = [valueA.toLowerCase() === 'true'];
    } else {
      values = [valueA];
    }

    onCreate({
      id,
      column: column.metric,
      label,
      operation,
      values,
      dataType
    });
    resetValues();
  };

  if (!column) {
    return (
      <div className="filter-configurator empty">
        <p>Select a metric to start configuring a filter.</p>
      </div>
    );
  }

  const isRange = dataType === 'number' && operation === 'range';
  const canSubmit = isRange ? Boolean(valueA || valueB) : Boolean(valueA);

  return (
    <form className="filter-configurator" onSubmit={handleSubmit}>
      <header>
        <h3>{column.metric}</h3>
        <p>{column.what_it_is}</p>
        <dl>
          <div>
            <dt>Data type</dt>
            <dd>{column.data_type || 'n/a'}</dd>
          </div>
          <div>
            <dt>Higher is</dt>
            <dd>{column.higher_is || 'depends'}</dd>
          </div>
          <div>
            <dt>Units / range</dt>
            <dd>{column.units_or_range || 'n/a'}</dd>
          </div>
          <div>
            <dt>Average</dt>
            <dd>{column.average ?? '—'}</dd>
          </div>
          <div>
            <dt>Median</dt>
            <dd>{column.median ?? '—'}</dd>
          </div>
        </dl>
      </header>
      <label className="field">
        <span>Filter type</span>
        <select value={operation} onChange={(event) => setOperation(event.target.value as FilterOperation)}>
          {operationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {dataType === 'number' && operation === 'range' && (
        <div className="two-columns">
          <label className="field">
            <span>Min</span>
            <input value={valueA} onChange={(event) => setValueA(event.target.value)} placeholder="e.g. 1000" />
          </label>
          <label className="field">
            <span>Max</span>
            <input value={valueB} onChange={(event) => setValueB(event.target.value)} placeholder="e.g. 5000" />
          </label>
        </div>
      )}
      {dataType === 'number' && operation !== 'range' && (
        <label className="field">
          <span>Threshold</span>
          <input value={valueA} onChange={(event) => setValueA(event.target.value)} placeholder="Enter a number" />
        </label>
      )}
      {dataType === 'boolean' && (
        <label className="field">
          <span>Value</span>
          <select value={valueA} onChange={(event) => setValueA(event.target.value)}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
      )}
      {dataType === 'text' && (
        <label className="field">
          <span>{operation === 'contains' ? 'Contains text' : 'Equals text'}</span>
          <input value={valueA} onChange={(event) => setValueA(event.target.value)} placeholder="Type text" />
        </label>
      )}
      {dataType === 'other' && (
        <label className="field">
          <span>Value</span>
          <input value={valueA} onChange={(event) => setValueA(event.target.value)} placeholder="Enter filter value" />
        </label>
      )}
      <button type="submit" className="primary-button" disabled={!canSubmit}>
        Save filter
      </button>
    </form>
  );
};

export default FilterConfigurator;
