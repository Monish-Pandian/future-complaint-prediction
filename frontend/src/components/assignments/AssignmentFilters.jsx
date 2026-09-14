import React from 'react';
import Button from '../common/Button';

/**
 * AssignmentFilters: Search and multi-criteria dropdown filtering
 */
export default function AssignmentFilters({
  filters = {},
  filterOptions = {},
  onFilterChange,
  onReset,
  totalMatching = 0,
}) {
  const handleInputChange = (field, value) => {
    const next = { ...filters, [field]: value };
    if (onFilterChange) {
      onFilterChange(next);
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
    if (onReset) {
      onReset(emptyFilters);
    }
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (!v) return false;
    if (k === 'search' && v.trim() !== '') return true;
    if (typeof v === 'string' && !v.toLowerCase().startsWith('all')) return true;
    return false;
  }).length;

  return (
    <div className="card assignments-filter-card" role="search" aria-label="Assignment Filters">
      <div className="assignments-filter-row">
        {/* Search Input */}
        <div className="asgn-search-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="asgn-search-input"
            type="text"
            className="asgn-search-input"
            placeholder="Search officer, community, complaint type, or assignment..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            aria-label="Search assignments"
          />
          {filters.search && (
            <button
              type="button"
              className="asgn-search-clear"
              onClick={() => handleInputChange('search', '')}
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {/* 1. Status Filter */}
        <div className="asgn-filter-group">
          <label className="asgn-filter-label" htmlFor="asgn-status-filter">Status</label>
          <select
            id="asgn-status-filter"
            className="form-select asgn-select"
            value={filters.status || 'All assignment statuses'}
            onChange={(e) => handleInputChange('status', e.target.value)}
          >
            <option value="All assignment statuses">All assignment statuses</option>
            <option value="AI_ASSIGNED">AI Assigned</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* 2. Risk Level Filter */}
        <div className="asgn-filter-group">
          <label className="asgn-filter-label" htmlFor="asgn-risk-filter">Risk Level</label>
          <select
            id="asgn-risk-filter"
            className="form-select asgn-select"
            value={filters.riskLevel || 'All risk levels'}
            onChange={(e) => handleInputChange('riskLevel', e.target.value)}
          >
            <option value="All risk levels">All risk levels</option>
            <option value="CRITICAL">Critical (≥85.0)</option>
            <option value="HIGH">High (70.0–84.9)</option>
            <option value="MEDIUM">Medium (40.0–69.9)</option>
            <option value="LOW">Low (&lt;40.0)</option>
          </select>
        </div>

        {/* 3. Department Filter */}
        <div className="asgn-filter-group">
          <label className="asgn-filter-label" htmlFor="asgn-dept-filter">Department</label>
          <select
            id="asgn-dept-filter"
            className="form-select asgn-select"
            value={filters.department || 'All departments'}
            onChange={(e) => handleInputChange('department', e.target.value)}
          >
            <option value="All departments">All departments</option>
            {(filterOptions?.departments || [
              'Streets & Sanitation',
              'Water Management',
              'Transportation',
              'Buildings',
              'Public Health',
            ])
              .filter((d) => !d.startsWith('All '))
              .map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
          </select>
        </div>

        {/* 4. Ward / Area Filter */}
        <div className="asgn-filter-group">
          <label className="asgn-filter-label" htmlFor="asgn-ward-filter">Ward</label>
          <select
            id="asgn-ward-filter"
            className="form-select asgn-select"
            value={filters.ward || 'All wards'}
            onChange={(e) => handleInputChange('ward', e.target.value)}
          >
            <option value="All wards">All wards</option>
            {(filterOptions?.wards || [
              '1', '3', '8', '14', '22', '24', '27', '28', '32', '41', '68'
            ])
              .filter((w) => !w.startsWith('All '))
              .map((w) => (
                <option key={w} value={w}>
                  {w.startsWith('Ward') ? w : `Ward ${w}`}
                </option>
              ))}
          </select>
        </div>

        {/* Display Counter Badge */}
        <div className="asgn-count-badge font-mono" title="Total assignments matching filters">
          <span className="count-dot" aria-hidden="true" />
          <span>{totalMatching} assignments displayed</span>
        </div>

        {/* Reset Action */}
        {activeCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset Filters ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}

