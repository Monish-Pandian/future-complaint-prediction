import React from 'react';

/**
 * Global Analytics Filter Toolbar for Civic Operations Intelligence
 */
export default function AnalyticsFilterBar({
  filters = {},
  onChange,
  onApply,
  onReset,
  departments = [],
  complaintTypes = [],
  isFiltered = false,
}) {
  const deptList = departments.length > 0 ? departments : [
    'All departments',
    'Streets and Sanitation',
    'CDOT - Department of Transportation',
    'DOB - Buildings',
    'Water Management',
    'Municipal',
  ];

  const typesList = complaintTypes.length > 0 ? complaintTypes : [
    'All complaint types',
    'Pothole in Street Complaint',
    'Street Light Out Complaint',
    'Graffiti Removal Request',
    'Garbage Cart Maintenance',
    'Abandoned Vehicle Complaint',
    'Rodent Baiting/Rat Complaint',
    'Tree Debris Clean-Up Request',
    'Building Violation',
    'Traffic Signal Out Complaint',
    'Blue Recycling Cart',
  ];

  const riskLevels = [
    'All risk levels',
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
  ];

  const horizons = [
    { value: 'All Horizons', label: 'All Horizons' },
    { value: 'Next 7 days', label: 'Next 7 Days' },
    { value: 'Next 14 days', label: 'Next 14 Days' },
  ];

  return (
    <div className="analytics-filter-toolbar">
      {/* Department Filter */}
      <div className="analytics-filter-group">
        <label htmlFor="analytics-dept-select" className="analytics-filter-lbl">DEPARTMENT</label>
        <select
          id="analytics-dept-select"
          className="analytics-filter-select"
          value={filters.department || 'All departments'}
          onChange={(e) => onChange('department', e.target.value)}
        >
          {deptList.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Risk Level Filter */}
      <div className="analytics-filter-group">
        <label htmlFor="analytics-risk-select" className="analytics-filter-lbl">RISK LEVEL</label>
        <select
          id="analytics-risk-select"
          className="analytics-filter-select"
          value={filters.riskLevel || 'All risk levels'}
          onChange={(e) => onChange('riskLevel', e.target.value)}
        >
          {riskLevels.map((r) => (
            <option key={r} value={r}>{r.startsWith('All') ? 'All Risk Levels' : r}</option>
          ))}
        </select>
      </div>

      {/* Complaint Type Filter */}
      <div className="analytics-filter-group" style={{ flex: 1.5, minWidth: '200px' }}>
        <label htmlFor="analytics-type-select" className="analytics-filter-lbl">COMPLAINT TYPE</label>
        <select
          id="analytics-type-select"
          className="analytics-filter-select"
          value={filters.complaintType || 'All complaint types'}
          onChange={(e) => onChange('complaintType', e.target.value)}
        >
          {typesList.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Horizon Filter */}
      <div className="analytics-filter-group">
        <label htmlFor="analytics-horizon-select" className="analytics-filter-lbl">HORIZON</label>
        <select
          id="analytics-horizon-select"
          className="analytics-filter-select"
          value={filters.horizon || 'All Horizons'}
          onChange={(e) => onChange('horizon', e.target.value)}
        >
          {horizons.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="analytics-filter-actions">
        {isFiltered && (
          <span className="analytics-filter-pill">
            Filters Active
          </span>
        )}
        <button
          type="button"
          className="btn-analytics-apply"
          onClick={onApply}
        >
          Apply
        </button>
        <button
          type="button"
          className="btn-analytics-reset"
          onClick={onReset}
          disabled={!isFiltered}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
