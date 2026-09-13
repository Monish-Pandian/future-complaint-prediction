import React, { useState } from 'react';

/**
 * EvaluationFilters: Multi-criteria filtering for evaluated prediction records
 */
export default function EvaluationFilters({
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
      classification: 'All classifications',
      department: 'All departments',
      riskLevel: 'All risk levels',
      ward: 'All wards',
    };
    setLocalFilters(emptyFilters);
    if (onReset) {
      onReset(emptyFilters);
    }
  };

  return (
    <form className="evaluation-filter-card" onSubmit={handleApply} aria-label="AI Evaluation Filters">
      <div className="evaluation-filter-row">
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
            id="eval-search-input"
            type="text"
            className="evaluation-search-input"
            placeholder="Search Evaluation ID, Prediction Ref, Area, Officer..."
            value={localFilters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
          />
        </div>

        {/* Classification Filter */}
        <select
          id="eval-class-filter"
          className="evaluation-select"
          value={localFilters.classification || 'All classifications'}
          onChange={(e) => handleInputChange('classification', e.target.value)}
          aria-label="Classification Filter"
        >
          {filterOptions.classifications?.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          id="eval-dept-filter"
          className="evaluation-select"
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

        {/* Risk Level Filter */}
        <select
          id="eval-risk-filter"
          className="evaluation-select"
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
          id="eval-ward-filter"
          className="evaluation-select"
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
        <div className="evaluation-filter-actions">
          <button type="submit" className="evaluation-btn evaluation-btn-primary" id="eval-apply-btn">
            Apply
          </button>
          <button
            type="button"
            className="evaluation-btn evaluation-btn-secondary"
            id="eval-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
