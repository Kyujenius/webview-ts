export type Filter = 'all' | 'success' | 'error' | 'pending' | 'event';

interface FilterBarProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  totalCount: number;
}

const FILTERS: Filter[] = ['all', 'success', 'error', 'pending', 'event'];

export function FilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  totalCount,
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
    </div>
  );
}
