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
 * PredictionFilters: Compact command-center search & multi-criteria filter panel
 */
export default function PredictionFilters({
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
    <section className="filter-panel" aria-label="Prediction Filters and Search">
      {/* Search Row */}
      <div className="filter-search-row">
        <div className="search-field-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="SEARCH PREDICTIONS BY ID, COMPLAINT TYPE, AREA, OR WARD..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search predictions"
          />
        </div>
      </div>

      {/* Filter Select Controls Grid */}
      <div className="filter-grid">
        {/* 1. Complaint Type */}
        <div className="filter-item">
          <label htmlFor="filter-complaint" className="filter-label">
            Complaint Type
          </label>
          <select
            id="filter-complaint"
            className="filter-select"
            value={filters.complaintType || 'All complaint types'}
            onChange={(e) => handleInputChange('complaintType', e.target.value)}
          >
            {filterOptions?.complaintTypes?.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Community Area */}
        <div className="filter-item">
          <label htmlFor="filter-area" className="filter-label">
            Community Area
          </label>
          <select
            id="filter-area"
            className="filter-select"
            value={filters.communityArea || 'All community areas'}
            onChange={(e) => handleInputChange('communityArea', e.target.value)}
          >
            {filterOptions?.communityAreas?.map((ca) => (
              <option key={ca} value={ca}>
                {ca}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Ward */}
        <div className="filter-item">
          <label htmlFor="filter-ward" className="filter-label">
            Ward
          </label>
          <select
            id="filter-ward"
            className="filter-select"
            value={filters.ward || 'All wards'}
            onChange={(e) => handleInputChange('ward', e.target.value)}
          >
            {filterOptions?.wards?.map((w) => (
              <option key={w} value={w}>
                {w.startsWith('All') ? w : `Ward ${w}`}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Risk Level */}
        <div className="filter-item">
          <label htmlFor="filter-risk" className="filter-label">
            Risk Level
          </label>
          <select
            id="filter-risk"
            className="filter-select"
            value={filters.riskLevel || 'All risk levels'}
            onChange={(e) => handleInputChange('riskLevel', e.target.value)}
          >
            {filterOptions?.riskLevels?.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Verification Status */}
        <div className="filter-item">
          <label htmlFor="filter-verif" className="filter-label">
            Verification Status
          </label>
          <select
            id="filter-verif"
            className="filter-select"
            value={filters.verificationStatus || 'All verification statuses'}
            onChange={(e) => handleInputChange('verificationStatus', e.target.value)}
          >
            {filterOptions?.verificationStatuses?.map((vs) => (
              <option key={vs} value={vs}>
                {vs}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Assignment Status & Actions */}
        <div className="filter-item">
          <label htmlFor="filter-asgn" className="filter-label">
            Assignment Status
          </label>
          <select
            id="filter-asgn"
            className="filter-select"
            value={filters.assignmentStatus || 'All assignment statuses'}
            onChange={(e) => handleInputChange('assignmentStatus', e.target.value)}
          >
            {filterOptions?.assignmentStatuses?.map((asgn) => (
              <option key={asgn} value={asgn}>
                {asgn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Action Buttons */}
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
          APPLY FILTERS
        </button>
      </div>
    </section>
  );
}
