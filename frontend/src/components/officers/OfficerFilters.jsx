import React from 'react';

/**
 * Filter toolbar for Officer operations
 * Handles search, department, availability, and capacity filters
 */
export default function OfficerFilters({
  filters = {},
  filterOptions = {},
  onChange,
  onReset,
  totalCount = 0,
  filteredCount = 0,
}) {
  const departments = filterOptions.departments || [
    'All departments',
    'Streets & Sanitation',
    'Water & Drainage',
    'Traffic & Infrastructure',
    'Electricity & Lighting',
    'Buildings & Housing',
    'Police',
    'Municipal',
  ];

  const availabilities = filterOptions.availabilities || [
    'All statuses',
    'AVAILABLE',
    'BUSY',
    'ON_LEAVE',
    'OFF_DUTY',
    'OFFLINE',
  ];

  const capacityOptions = [
    { value: 'All', label: 'All Workloads' },
    { value: 'AVAILABLE_CAPACITY', label: 'Available Capacity (< 80%)' },
    { value: 'NEAR_CAPACITY', label: 'Near Capacity (80–99%)' },
    { value: 'AT_CAPACITY', label: 'At Capacity (100%)' },
  ];

  const isFiltered =
    Boolean(filters.search?.trim()) ||
    (filters.department && !filters.department.startsWith('All')) ||
    (filters.availability && !filters.availability.startsWith('All')) ||
    (filters.capacityFilter && filters.capacityFilter !== 'All');

  return (
    <div className="officers-filter-toolbar">
      {/* Search Input */}
      <div className="officers-search-wrapper">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="officer-search-input"
          type="text"
          className="officers-search-input"
          placeholder="Search by officer name, ID, employee code, area, or skills..."
          value={filters.search || ''}
          onChange={(e) => onChange('search', e.target.value)}
        />
        {filters.search && (
          <button
            type="button"
            className="filter-clear-btn"
            onClick={() => onChange('search', '')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Department Dropdown */}
      <div className="filter-select-wrapper">
        <label htmlFor="officer-dept-select" className="filter-label-inline">DEPT:</label>
        <select
          id="officer-dept-select"
          className="officers-select"
          value={filters.department || 'All departments'}
          onChange={(e) => onChange('department', e.target.value)}
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Availability Status Dropdown */}
      <div className="filter-select-wrapper">
        <label htmlFor="officer-avail-select" className="filter-label-inline">STATUS:</label>
        <select
          id="officer-avail-select"
          className="officers-select"
          value={filters.availability || 'All statuses'}
          onChange={(e) => onChange('availability', e.target.value)}
        >
          {availabilities.map((a) => (
            <option key={a} value={a}>
              {a.startsWith('All') ? 'All Statuses' : a.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Capacity / Workload Filter Dropdown */}
      <div className="filter-select-wrapper">
        <label htmlFor="officer-cap-select" className="filter-label-inline">CAPACITY:</label>
        <select
          id="officer-cap-select"
          className="officers-select"
          value={filters.capacityFilter || 'All'}
          onChange={(e) => onChange('capacityFilter', e.target.value)}
        >
          {capacityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reset / Clear Filters */}
      <div className="filter-actions-wrapper">
        {isFiltered && (
          <span className="filter-active-pill">
            Filtered ({filteredCount} / {totalCount})
          </span>
        )}
        <button
          type="button"
          className={`officers-btn-reset ${isFiltered ? 'btn-active-reset' : ''}`}
          onClick={onReset}
          disabled={!isFiltered}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
