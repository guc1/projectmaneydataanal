import React from 'react';
import { FilterDefinition, getOperationLabel } from '../hooks/useFilters';
import './ActiveFiltersList.css';

interface ActiveFiltersListProps {
  filters: FilterDefinition[];
  onRemove: (id: string) => void;
}

const ActiveFiltersList: React.FC<ActiveFiltersListProps> = ({ filters, onRemove }) => {
  if (!filters.length) {
    return (
      <div className="active-filters empty">
        <p>No filters applied yet.</p>
      </div>
    );
  }

  return (
    <div className="active-filters">
      {filters.map((filter) => (
        <div key={filter.id} className="filter-pill">
          <div>
            <strong>{filter.column}</strong>
            <span>{getOperationLabel(filter.operation)}</span>
            <code>{filter.values.filter((value) => value !== null).join(' – ') || 'Any'}</code>
          </div>
          <button type="button" onClick={() => onRemove(filter.id)} aria-label="Remove filter">
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ActiveFiltersList;
