import React, { useState } from 'react';

/**
 * AssignmentFilters: Search and multi-criteria dropdown filtering
 */
export default function AssignmentFilters({
  filters = {},
  filterOptions = {},
  onFilterChange,
  onReset,
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleInputChange = (field, value) => {
    const next = { ...localFilters, [field]: value };
    setLocalFilters(next);
  };

  const handleApply = (e) => {
    e?.preventDefault();
    if (onFilterChange) {
      onFilterChange(localFilters);
    }
  };

  const handleReset = () => {
    const emptyFilters = {
      search: '',
      department: 'All departments',
      status: 'All assignment statuses',
      riskLevel: 'All risk levels',
      ward: 'All wards',
      communityArea: 'All community areas',
    };
    setLocalFilters(emptyFilters);
    if (onReset) {
      onReset(emptyFilters);
    }
  };

  return (
    <form className="assignments-filter-card" onSubmit={handleApply} aria-label="Assignment Filters">
      <div className="assignments-filter-row">
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            id="asgn-search-input"
            type="text"
            className="assignments-search-input"
            placeholder="Search by Assignment ID, Officer, Area, Ward..."
            value={localFilters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <select
          id="asgn-dept-filter"
          className="assignments-select"
          value={localFilters.department || 'All departments'}
          onChange={(e) => handleInputChange('department', e.target.value)}
          aria-label="Department Filter"
        >
          {filterOptions.departments?.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* Assignment Status Filter */}
        <select
          id="asgn-status-filter"
          className="assignments-select"
          value={localFilters.status || 'All assignment statuses'}
          onChange={(e) => handleInputChange('status', e.target.value)}
          aria-label="Assignment Status Filter"
        >
          {filterOptions.statuses?.map((st) => (
            <option key={st} value={st}>
              {st.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Risk Level Filter */}
        <select
          id="asgn-risk-filter"
          className="assignments-select"
          value={localFilters.riskLevel || 'All risk levels'}
          onChange={(e) => handleInputChange('riskLevel', e.target.value)}
          aria-label="Risk Level Filter"
        >
          {filterOptions.riskLevels?.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Ward Filter */}
        <select
          id="asgn-ward-filter"
          className="assignments-select"
          value={localFilters.ward || 'All wards'}
          onChange={(e) => handleInputChange('ward', e.target.value)}
          aria-label="Ward Filter"
        >
          {filterOptions.wards?.map((w) => (
            <option key={w} value={w}>
              {w.startsWith('All') || w.startsWith('Ward') ? w : `Ward ${w}`}
            </option>
          ))}
        </select>

        {/* Filter Action Buttons */}
        <div className="assignments-filter-actions">
          <button type="submit" className="assignments-btn assignments-btn-primary" id="asgn-apply-btn">
            Apply Filters
          </button>
          <button
            type="button"
            className="assignments-btn assignments-btn-secondary"
            id="asgn-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
