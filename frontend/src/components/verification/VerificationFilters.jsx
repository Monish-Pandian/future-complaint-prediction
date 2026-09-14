import React, { useState } from 'react';

/**
 * VerificationFilters: Search and multi-criteria dropdown filtering for field verifications
 */
export default function VerificationFilters({
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
    // Instant trigger for search / select if needed or let user apply
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
      evaluation: 'All evaluations',
      department: 'All departments',
      ward: 'All wards',
      communityArea: 'All community areas',
    };
    setLocalFilters(emptyFilters);
    if (onReset) {
      onReset(emptyFilters);
    }
  };

  const outcomeOptions = [
    'All outcomes',
    'PROBLEM_CONFIRMED',
    'PROBLEM_NOT_FOUND',
    'DIFFERENT_PROBLEM',
    'DUPLICATE',
    'UNABLE_TO_VERIFY',
  ];

  const severityOptions = [
    'All severities',
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
  ];

  const evaluationOptions = [
    'All evaluations',
    'TRUE_POSITIVE',
    'FALSE_POSITIVE',
    'UNDETERMINED',
  ];

  const deptOptions = filterOptions.departments || ['All departments', 'Streets & Sanitation', 'Transportation', 'Water Management', 'Buildings'];
  const wardOptions = filterOptions.wards || ['All wards', '1', '2', '3', '4', '5', '10', '15', '20', '25', '30'];

  const hasActiveFilters = Boolean(
    localFilters.search ||
    (localFilters.outcome && localFilters.outcome !== 'All outcomes') ||
    (localFilters.severity && localFilters.severity !== 'All severities') ||
    (localFilters.evaluation && localFilters.evaluation !== 'All evaluations') ||
    (localFilters.department && localFilters.department !== 'All departments') ||
    (localFilters.ward && localFilters.ward !== 'All wards')
  );

  return (
    <form className="verification-filter-card" onSubmit={handleApply} aria-label="Verification Filters">
      <div className="verification-filter-header">
        <div className="verification-filter-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filter Ground Truth Verifications
        </div>
        {totalFiltered !== null && (
          <span className="verification-filter-count-badge font-mono">
            {totalFiltered} verifications found
          </span>
        )}
      </div>

      <div className="verification-filter-row">
        {/* Search Input */}
        <div className="verification-search-wrap">
          <span className="verification-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            id="verif-search-input"
            type="text"
            className="verification-search-input"
            placeholder="Search prediction, officer, community, or notes..."
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
          {outcomeOptions.map((o) => (
            <option key={o} value={o}>
              {o === 'All outcomes' ? 'All Outcomes' : o.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Risk / Severity Filter */}
        <select
          id="verif-severity-filter"
          className="verification-select"
          value={localFilters.severity || 'All severities'}
          onChange={(e) => handleInputChange('severity', e.target.value)}
          aria-label="Risk Severity Filter"
        >
          {severityOptions.map((sev) => (
            <option key={sev} value={sev}>
              {sev === 'All severities' ? 'All Risk Levels' : sev}
            </option>
          ))}
        </select>

        {/* Evaluation Filter */}
        <select
          id="verif-eval-filter"
          className="verification-select"
          value={localFilters.evaluation || 'All evaluations'}
          onChange={(e) => handleInputChange('evaluation', e.target.value)}
          aria-label="Evaluation Classification Filter"
        >
          {evaluationOptions.map((ev) => (
            <option key={ev} value={ev}>
              {ev === 'All evaluations' ? 'All Evaluations' : ev.replace(/_/g, ' ')}
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
          {deptOptions.map((dept) => (
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
          {wardOptions.map((w) => (
            <option key={w} value={w}>
              {w.startsWith('All') || w.startsWith('Ward') ? w : `Ward ${w}`}
            </option>
          ))}
        </select>

        {/* Action Buttons */}
        <div className="verification-filter-actions">
          <button type="submit" className="verification-btn verification-btn-primary" id="verif-apply-btn">
            Apply
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="verification-btn verification-btn-secondary"
              id="verif-reset-btn"
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
