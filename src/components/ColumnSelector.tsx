import React from 'react';
import { ColumnMetadata } from '../utils/dataParsers';
import './ColumnSelector.css';

interface ColumnSelectorProps {
  columns: ColumnMetadata[];
  onSelect: (column: ColumnMetadata) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, onSelect }) => {
  const [search, setSearch] = React.useState('');
  const filteredColumns = React.useMemo(() => {
    if (!search) {
      return columns;
    }
    const query = search.toLowerCase();
    return columns.filter((column) => column.metric.toLowerCase().includes(query));
  }, [columns, search]);

  const formatStat = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return '—';
    }
    return Number.isFinite(value) ? new Intl.NumberFormat().format(value) : String(value);
  };

  return (
    <div className="column-selector">
      <div className="column-selector-header">
        <h3>Metrics</h3>
        <input
          type="search"
          placeholder="Search columns"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="column-list">
        {filteredColumns.map((column) => (
          <button
            type="button"
            key={column.metric}
            className="column-item"
            onClick={() => onSelect(column)}
            title={`${column.what_it_is}\nType: ${column.data_type || 'n/a'}\nHigher is: ${
              column.higher_is || 'depends'
            }\nUnits / range: ${column.units_or_range || 'n/a'}`}
          >
            <div>
              <strong>{column.metric}</strong>
              <p>{column.what_it_is}</p>
            </div>
            <div className="column-meta">
              <span>{column.data_type || 'n/a'}</span>
              <span>
                avg {formatStat(column.average)} • median {formatStat(column.median)}
              </span>
            </div>
          </button>
        ))}
        {!filteredColumns.length && <p className="empty-state">No columns match this search.</p>}
      </div>
    </div>
  );
};

export default ColumnSelector;
