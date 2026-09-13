import React, { useState } from 'react';

/**
 * VerificationFilters: Search and multi-criteria dropdown filtering
 */
export default function VerificationFilters({
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
      outcome: 'All outcomes',
      severity: 'All severities',
      department: 'All departments',
      ward: 'All wards',
      communityArea: 'All community areas',
    };
    setLocalFilters(emptyFilters);
    if (onReset) {
      onReset(emptyFilters);
    }
  };

  return (
    <form className="verification-filter-card" onSubmit={handleApply} aria-label="Verification Filters">
      <div className="verification-filter-row">
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
            id="verif-search-input"
            type="text"
            className="verification-search-input"
            placeholder="Search by Verification ID, Inspector Notes, Officer, Area..."
            value={localFilters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
          />
        </div>

        {/* Outcome Filter */}
        <select
          id="verif-outcome-filter"
          className="verification-select"
          value={localFilters.outcome || 'All outcomes'}
          onChange={(e) => handleInputChange('outcome', e.target.value)}
          aria-label="Outcome Filter"
        >
          {filterOptions.outcomes?.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Severity Filter */}
        <select
          id="verif-severity-filter"
          className="verification-select"
          value={localFilters.severity || 'All severities'}
          onChange={(e) => handleInputChange('severity', e.target.value)}
          aria-label="Severity Filter"
        >
          {filterOptions.severities?.map((sev) => (
            <option key={sev} value={sev}>
              {sev}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          id="verif-dept-filter"
          className="verification-select"
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

        {/* Ward Filter */}
        <select
          id="verif-ward-filter"
          className="verification-select"
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

        {/* Action Buttons */}
        <div className="verification-filter-actions">
          <button type="submit" className="verification-btn verification-btn-primary" id="verif-apply-btn">
            Apply Filters
          </button>
          <button
            type="button"
            className="verification-btn verification-btn-secondary"
            id="verif-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
