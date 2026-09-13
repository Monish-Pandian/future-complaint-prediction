import React from 'react';

/**
 * HeatmapFilters: Compact spatial risk filter toolbar
 */
export default function HeatmapFilters({
  filters,
  filterOptions,
  onChange,
  onReset,
}) {
  const handleInputChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="heatmap-compact-toolbar" aria-label="Spatial Risk Filters">
      {/* Search Input */}
      <div className="heatmap-search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="heatmap-toolbar-input"
          placeholder="Search area, ward, or complaint..."
          value={filters.search || ''}
          onChange={(e) => handleInputChange('search', e.target.value)}
          aria-label="Search area or complaint"
        />
      </div>

      {/* Risk Filter */}
      <select
        className="heatmap-toolbar-select"
        value={filters.riskLevel || 'All risk levels'}
        onChange={(e) => handleInputChange('riskLevel', e.target.value)}
        aria-label="Filter by Risk Level"
      >
        {filterOptions?.riskLevels?.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Ward Filter */}
      <select
        className="heatmap-toolbar-select"
        value={filters.ward || 'All wards'}
        onChange={(e) => handleInputChange('ward', e.target.value)}
        aria-label="Filter by Ward"
      >
        {filterOptions?.wards?.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>

      {/* Complaint Type Filter */}
      <select
        className="heatmap-toolbar-select"
        value={filters.complaintType || 'All complaint types'}
        onChange={(e) => handleInputChange('complaintType', e.target.value)}
        aria-label="Filter by Complaint Type"
      >
        {filterOptions?.complaintTypes?.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Reset Action */}
      <button
        type="button"
        className="heatmap-toolbar-reset"
        onClick={onReset}
        title="Reset all filters"
      >
        Reset
      </button>
    </div>
  );
}
