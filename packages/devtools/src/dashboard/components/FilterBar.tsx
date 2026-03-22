export type Filter = 'all' | 'success' | 'error' | 'pending' | 'event';

interface FilterBarProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  totalCount: number;
  sourceIds: string[];
  sourceFilter: string;
  onSourceFilterChange: (s: string) => void;
}

const FILTERS: Filter[] = ['all', 'success', 'error', 'pending', 'event'];

export function FilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  totalCount,
  sourceIds,
  sourceFilter,
  onSourceFilterChange,
}: FilterBarProps) {
  return (
    <div id="filter-bar">
      {FILTERS.map((f) => (
        <button
          key={f}
          className={`filter-btn${filter === f ? ' active' : ''}`}
          onClick={() => onFilterChange(f)}
        >
          {f === 'all' ? `All (${totalCount})` : f}
        </button>
      ))}
      <input
        id="search"
        type="text"
        placeholder="Filter actions..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {sourceIds.length > 0 && (
        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value)}
          style={{
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 12,
          }}
        >
          <option value="">All sources</option>
          {sourceIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
