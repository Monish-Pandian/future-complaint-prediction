import React from 'react';
import Button from '../common/Button';

export default function PredictionFilters({
  filters = {},
  filterOptions = {},
  onChange,
  onApply,
  onReset,
  totalMatching = 0,
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

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, val]) => {
    if (!val) return false;
    if (key === 'search' && val.trim() !== '') return true;
    if (typeof val === 'string' && !val.toLowerCase().startsWith('all')) return true;
    return false;
  }).length;

  return (
    <div className="card filter-toolbar-card" role="search" aria-label="Prediction Filters">
      <div className="filter-toolbar-top">
        {/* Search Field */}
        <div className="filter-search-box">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search community area, ward, or complaint type..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search predictions"
          />
          {filters.search && (
            <button
              type="button"
              className="filter-search-clear"
              onClick={() => handleInputChange('search', '')}
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="filter-action-buttons">
          <Button variant="primary" size="sm" onClick={onApply}>
            Apply Filters
          </Button>

          {activeFiltersCount > 0 && (
            <Button variant="secondary" size="sm" onClick={onReset}>
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Select Controls Grid */}
      <div className="filter-controls-grid">
        {/* 1. Risk Level */}
        <div className="filter-group-item">
          <label htmlFor="filter-risk" className="filter-label">
            Risk Level
          </label>
          <select
            id="filter-risk"
            className="form-select"
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

        {/* 2. Complaint Type */}
        <div className="filter-group-item">
          <label htmlFor="filter-complaint" className="filter-label">
            Complaint Type
          </label>
          <select
            id="filter-complaint"
            className="form-select"
            value={filters.complaintType || 'All complaint types'}
            onChange={(e) => handleInputChange('complaintType', e.target.value)}
          >
            <option value="All complaint types">All complaint types</option>
            {(filterOptions?.complaintTypes || [
              'Abandoned Vehicle Complaint',
              'Garbage Cart Maintenance',
              'Pothole in Street Complaint',
              'Rodent Baiting/Rat Complaint',
              'Street Light Out Complaint',
              'Traffic Signal Out Complaint',
              'Tree Debris Clean-Up Request',
            ])
              .filter((c) => !c.startsWith('All '))
              .map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
          </select>
        </div>

        {/* 3. Community Area */}
        <div className="filter-group-item">
          <label htmlFor="filter-area" className="filter-label">
            Community Area
          </label>
          <select
            id="filter-area"
            className="form-select"
            value={filters.communityArea || 'All community areas'}
            onChange={(e) => handleInputChange('communityArea', e.target.value)}
          >
            <option value="All community areas">All community areas (1–77)</option>
            {(filterOptions?.communityAreas || [
              '1 - Rogers Park',
              '3 - Uptown',
              '8 - Near North Side',
              '14 - Albany Park',
              '22 - Logan Square',
              '24 - West Town',
              '28 - Near West Side',
              '32 - The Loop',
              '41 - Hyde Park',
              '68 - Englewood',
            ])
              .filter((a) => !a.startsWith('All '))
              .map((ca) => (
                <option key={ca} value={ca}>
                  {ca}
                </option>
              ))}
          </select>
        </div>

        {/* 4. Verification Status */}
        <div className="filter-group-item">
          <label htmlFor="filter-verification" className="filter-label">
            Verification Status
          </label>
          <select
            id="filter-verification"
            className="form-select"
            value={filters.verificationStatus || 'All verification statuses'}
            onChange={(e) => handleInputChange('verificationStatus', e.target.value)}
          >
            <option value="All verification statuses">All verification statuses</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="VERIFIED_TRUE">Verified True (TP)</option>
            <option value="VERIFIED_FALSE">Verified False (FP)</option>
          </select>
        </div>

        {/* 5. Assignment Status */}
        <div className="filter-group-item">
          <label htmlFor="filter-assignment" className="filter-label">
            Assignment Status
          </label>
          <select
            id="filter-assignment"
            className="form-select"
            value={filters.assignmentStatus || 'All assignment statuses'}
            onChange={(e) => handleInputChange('assignmentStatus', e.target.value)}
          >
            <option value="All assignment statuses">All assignment statuses</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="AI_ASSIGNED">AI Assigned</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Filter Summary Footer */}
      <div className="filter-toolbar-footer">
        <div className="filter-summary-text">
          <span>Found <strong className="font-mono">{totalMatching}</strong> predictions</span>
          {activeFiltersCount > 0 && (
            <span style={{ color: 'var(--accent-text)', marginLeft: '6px' }}>
              • {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button type="button" onClick={onReset} className="filter-reset-link">
            Reset all filters
          </button>
        )}
      </div>
    </div>
  );
}
