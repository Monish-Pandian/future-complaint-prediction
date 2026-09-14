import React, { useState } from 'react';

/**
 * EvaluationFilters: Multi-criteria filtering for evaluated prediction records
 */
export default function EvaluationFilters({
  filters = {},
  filterOptions = {},
  totalFiltered = null,
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
      outcome: 'All outcomes',
      department: 'All departments',
      riskLevel: 'All risk levels',
      ward: 'All wards',
    };
    setLocalFilters(emptyFilters);
    if (onReset) {
      onReset(emptyFilters);
    }
  };

  const classificationOptions = [
    'All classifications',
    'TRUE_POSITIVE',
    'FALSE_POSITIVE',
    'UNDETERMINED',
  ];

  const outcomeOptions = [
    'All outcomes',
    'PROBLEM_CONFIRMED',
    'PROBLEM_NOT_FOUND',
    'DIFFERENT_PROBLEM',
    'DUPLICATE',
    'UNABLE_TO_VERIFY',
  ];

  const riskOptions = ['All risk levels', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const deptOptions = filterOptions.departments || [
    'All departments',
    'Streets & Sanitation',
    'Transportation',
    'Water Management',
    'Buildings',
  ];

  const wardOptions = filterOptions.wards || [
    'All wards',
    '1',
    '3',
    '5',
    '7',
    '11',
    '14',
    '16',
    '20',
    '24',
    '27',
    '28',
    '35',
    '42',
  ];

  const hasActiveFilters = Boolean(
    localFilters.search ||
    (localFilters.classification && localFilters.classification !== 'All classifications') ||
    (localFilters.outcome && localFilters.outcome !== 'All outcomes') ||
    (localFilters.riskLevel && localFilters.riskLevel !== 'All risk levels') ||
    (localFilters.department && localFilters.department !== 'All departments') ||
    (localFilters.ward && localFilters.ward !== 'All wards')
  );

  return (
    <form className="evaluation-filter-card" onSubmit={handleApply} aria-label="AI Evaluation Filters">
      <div className="evaluation-filter-header">
        <div className="evaluation-filter-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filter Operational Evaluation Records
        </div>
        {totalFiltered !== null && (
          <span className="eval-filter-count-badge font-mono">
            {totalFiltered} evaluations found
          </span>
        )}
      </div>

      <div className="evaluation-filter-row">
        {/* Search Input */}
        <div className="eval-search-wrap">
          <span className="eval-search-icon" aria-hidden="true">
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
          aria-label="Evaluation Result Filter"
        >
          {classificationOptions.map((c) => (
            <option key={c} value={c}>
              {c === 'All classifications' ? 'All Evaluation Results' : c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Verification Outcome Filter */}
        <select
          id="eval-outcome-filter"
          className="evaluation-select"
          value={localFilters.outcome || 'All outcomes'}
          onChange={(e) => handleInputChange('outcome', e.target.value)}
          aria-label="Verification Outcome Filter"
        >
          {outcomeOptions.map((o) => (
            <option key={o} value={o}>
              {o === 'All outcomes' ? 'All Outcomes' : o.replace(/_/g, ' ')}
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
          {riskOptions.map((r) => (
            <option key={r} value={r}>
              {r === 'All risk levels' ? 'All Risk Levels' : r}
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
          {deptOptions.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
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
          {wardOptions.map((w) => (
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
          {hasActiveFilters && (
            <button
              type="button"
              className="evaluation-btn evaluation-btn-secondary"
              id="eval-reset-btn"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
