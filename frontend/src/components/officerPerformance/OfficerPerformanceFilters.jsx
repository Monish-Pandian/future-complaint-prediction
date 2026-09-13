import React from 'react';

function SearchIcon({ size = 16, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * OfficerPerformanceFilters: Search and multi-criteria operational filter panel
 */
export default function OfficerPerformanceFilters({
  filters,
  filterOptions,
  onChange,
  onApply,
  onReset,
}) {
  const handleInputChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onApply();
    }
  };

  return (
    <section className="officer-filter-panel" aria-label="Officer Performance Filters and Search">
      {/* Search Bar */}
      <div className="filter-search-row">
        <div className="search-field-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="SEARCH OFFICER BY NAME, EMPLOYEE CODE, OFFICER ID, OR DEPARTMENT..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search officers"
          />
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="officer-filter-grid">
        {/* 1. Department */}
        <div className="filter-item">
          <label htmlFor="filter-officer-dept" className="filter-label">
            Department
          </label>
          <select
            id="filter-officer-dept"
            className="filter-select"
            value={filters.department || 'All Departments'}
            onChange={(e) => handleInputChange('department', e.target.value)}
          >
            {filterOptions?.departments?.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Status */}
        <div className="filter-item">
          <label htmlFor="filter-officer-status" className="filter-label">
            Operational Status
          </label>
          <select
            id="filter-officer-status"
            className="filter-select"
            value={filters.status || 'All Statuses'}
            onChange={(e) => handleInputChange('status', e.target.value)}
          >
            {filterOptions?.statuses?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Workload */}
        <div className="filter-item">
          <label htmlFor="filter-officer-workload" className="filter-label">
            Active Workload
          </label>
          <select
            id="filter-officer-workload"
            className="filter-select"
            value={filters.workload || 'All Workloads'}
            onChange={(e) => handleInputChange('workload', e.target.value)}
          >
            {filterOptions?.workloads?.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Performance Range */}
        <div className="filter-item">
          <label htmlFor="filter-officer-perf" className="filter-label">
            Performance Range
          </label>
          <select
            id="filter-officer-perf"
            className="filter-select"
            value={filters.performanceRange || 'All Performance'}
            onChange={(e) => handleInputChange('performanceRange', e.target.value)}
          >
            {filterOptions?.performanceRanges?.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={onReset}
          className="btn-reset-filters"
        >
          RESET
        </button>
        <button
          type="button"
          onClick={onApply}
          className="btn-apply-filters"
          style={{ flex: '0 0 auto', minWidth: '140px' }}
        >
          APPLY
        </button>
      </div>
    </section>
  );
}
