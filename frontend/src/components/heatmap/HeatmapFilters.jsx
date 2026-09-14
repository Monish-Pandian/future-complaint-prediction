import React from 'react';
import Button from '../common/Button';

export default function HeatmapFilters({
  filters = {},
  filterOptions = {},
  onChange,
  onReset,
  totalMatching = 0,
}) {
  const handleInputChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (!v) return false;
    if (k === 'search' && v.trim() !== '') return true;
    if (typeof v === 'string' && !v.toLowerCase().startsWith('all')) return true;
    return false;
  }).length;

  return (
    <div className="card map-toolbar-card" role="search" aria-label="Risk Map Filters">
      <div className="map-toolbar-row">
        {/* Search Input */}
        <div className="map-search-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="map-search-input"
            placeholder="Search community area, ward, or complaint type..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            aria-label="Search map risk areas"
          />
          {filters.search && (
            <button
              type="button"
              className="map-search-clear"
              onClick={() => handleInputChange('search', '')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* 1. Risk Level */}
        <div className="map-filter-group">
          <label className="map-filter-label" htmlFor="map-filter-risk">Risk Level</label>
          <select
            id="map-filter-risk"
            className="form-select map-select"
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
        <div className="map-filter-group">
          <label className="map-filter-label" htmlFor="map-filter-complaint">Complaint Type</label>
          <select
            id="map-filter-complaint"
            className="form-select map-select"
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
        <div className="map-filter-group">
          <label className="map-filter-label" htmlFor="map-filter-area">Community Area</label>
          <select
            id="map-filter-area"
            className="form-select map-select"
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

        {/* 4. Forecast Horizon Window */}
        <div className="map-filter-group">
          <label className="map-filter-label" htmlFor="map-filter-date">Window</label>
          <select
            id="map-filter-date"
            className="form-select map-select"
            value={filters.dateRange || 'Next 7 days'}
            onChange={(e) => handleInputChange('dateRange', e.target.value)}
          >
            <option value="Next 7 days">Next 7 days</option>
            <option value="Next 14 days">Next 14 days</option>
            <option value="Today">Today</option>
          </select>
        </div>

        {/* Counter Badge */}
        <div className="map-count-badge font-mono" title="Total predictions currently displayed">
          <span className="count-dot" aria-hidden="true" />
          <span>{totalMatching} predictions displayed</span>
        </div>

        {/* Reset Action */}
        {activeCount > 0 && (
          <Button variant="secondary" size="sm" onClick={onReset}>
            Reset Filters ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
