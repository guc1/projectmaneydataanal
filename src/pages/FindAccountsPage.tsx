import React from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import ColumnSelector from '../components/ColumnSelector';
import FilterConfigurator from '../components/FilterConfigurator';
import ActiveFiltersList from '../components/ActiveFiltersList';
import { useDataContext } from '../context/DataContext';
import { filterRecords, useFilters, FilterDefinition } from '../hooks/useFilters';
import { AccountRecord, ColumnMetadata } from '../utils/dataParsers';
import './FindAccountsPage.css';

const FindAccountsPage: React.FC = () => {
  const { metadata, records, isReady } = useDataContext();
  const { filters, setFilters, removeFilter, clearFilters } = useFilters();
  const [selectedColumn, setSelectedColumn] = React.useState<ColumnMetadata | null>(null);
  const [filteredData, setFilteredData] = React.useState<AccountRecord[]>(records);
  const [hasFiltered, setHasFiltered] = React.useState(false);

  React.useEffect(() => {
    setFilteredData(records);
    setHasFiltered(false);
  }, [records]);

  const handleCreateFilter = (filter: FilterDefinition) => {
    setFilters((prev) => [...prev, filter]);
  };

  const handleFilterDown = () => {
    const result = filterRecords(records, filters);
    setFilteredData(result);
    setHasFiltered(true);
  };

  const handleClear = () => {
    clearFilters();
    setFilteredData(records);
    setHasFiltered(false);
  };

  const handleExport = () => {
    if (!filteredData.length) {
      return;
    }
    const headers = Object.keys(filteredData[0]);
    const rows = filteredData.map((row) => headers.map((header) => row[header] ?? ''));
    const csv = [headers.join(','), ...rows.map((values) => values.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `filtered-accounts-${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isReady) {
    return (
      <Layout>
        <PageHeader title="Find accounts" subtitle="Upload your dataset first to start filtering wallets." />
        <div className="empty-state">
          <p>Head to the upload area to load the leaderboard export and column descriptions.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Find accounts"
        subtitle="Hover metrics for guidance, stack filters, then export the narrowed dataset."
        actions={
          <div className="action-group">
            <button type="button" className="ghost-button" onClick={handleClear} disabled={!filters.length}>
              Clear filters
            </button>
            <button type="button" className="primary-button" onClick={handleFilterDown} disabled={!filters.length}>
              Filter down
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleExport}
              disabled={!hasFiltered || !filteredData.length}
            >
              Export filtered
            </button>
          </div>
        }
      />
      <section className="status-bar">
        <div>
          <span className="label">Total rows</span>
          <strong>{records.length.toLocaleString()}</strong>
        </div>
        <div>
          <span className="label">Active filters</span>
          <strong>{filters.length}</strong>
        </div>
        <div>
          <span className="label">Filtered result</span>
          <strong>{hasFiltered ? filteredData.length.toLocaleString() : '—'}</strong>
        </div>
      </section>
      <section className="filter-layout">
        <div className="columns-panel">
          <ColumnSelector columns={metadata} onSelect={setSelectedColumn} />
        </div>
        <div className="builder-panel">
          <FilterConfigurator column={selectedColumn} onCreate={handleCreateFilter} />
          <div className="filters-list">
            <h3>Saved filters</h3>
            <ActiveFiltersList filters={filters} onRemove={removeFilter} />
          </div>
        </div>
      </section>
      {hasFiltered && (
        <section className="results-preview">
          <h3>Preview ({filteredData.length.toLocaleString()} rows)</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {Object.keys(filteredData[0] || {}).slice(0, 6).map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(filteredData[0] || {})
                      .slice(0, 6)
                      .map((header) => (
                        <td key={header}>{String(row[header] ?? '')}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > 5 && <p className="preview-hint">Preview limited to first 5 rows.</p>}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default FindAccountsPage;
