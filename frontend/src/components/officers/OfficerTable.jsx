import React from 'react';
import {
  getOfficerReadiness,
  renderOperationalReadinessBadge,
  renderOfficerStatusBadge,
  renderUtilizationBar,
} from './OfficerBadges';
import EmptyState from '../common/EmptyState';
import { SkeletonTable } from '../common/LoadingState';

/**
 * Main Field Officer Workforce Table
 * High-density operational workspace for field personnel management
 */
export default function OfficerTable({
  officers = [],
  isLoading = false,
  pagination = { page: 1, limit: 10, total: 0, totalPages: 1 },
  sortBy = 'name',
  sortOrder = 'asc',
  onSort,
  onPageChange,
  onInspect,
  onEdit,
  onDelete,
  isFiltered = false,
  onResetFilters,
}) {
  const handleSortClick = (field) => {
    if (!onSort) return;
    if (sortBy === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <span className="sort-icon-neutral">⇅</span>;
    }
    return sortOrder === 'asc' ? <span className="sort-icon-active">↑</span> : <span className="sort-icon-active">↓</span>;
  };

  return (
    <div className="officers-table-card">
      <div className="officers-table-header">
        <div className="officers-table-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Field Officer Roster & Operational Readiness</span>
        </div>
        <div className="officers-table-count">
          Showing <strong>{officers.length}</strong> of <strong>{pagination.total}</strong> officers
        </div>
      </div>

      <div className="officers-table-responsive">
        <table className="officers-table" aria-label="Field Officer Operations Roster">
          <thead>
            <tr>
              <th onClick={() => handleSortClick('name')} className="sortable-th" scope="col">
                <div className="th-content">
                  <span>OFFICER</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th onClick={() => handleSortClick('employeeCode')} className="sortable-th" scope="col">
                <div className="th-content">
                  <span>OFFICER ID</span>
                  {getSortIcon('employeeCode')}
                </div>
              </th>
              <th onClick={() => handleSortClick('department')} className="sortable-th" scope="col">
                <div className="th-content">
                  <span>DEPARTMENT</span>
                  {getSortIcon('department')}
                </div>
              </th>
              <th onClick={() => handleSortClick('availability')} className="sortable-th" scope="col">
                <div className="th-content">
                  <span>AVAILABILITY</span>
                  {getSortIcon('availability')}
                </div>
              </th>
              <th scope="col">
                <span>OPERATIONAL READINESS</span>
              </th>
              <th onClick={() => handleSortClick('currentWorkload')} className="sortable-th" scope="col" style={{ minWidth: '150px' }}>
                <div className="th-content">
                  <span>WORKLOAD / CAPACITY</span>
                  {getSortIcon('currentWorkload')}
                </div>
              </th>
              <th scope="col">
                <span>HOME COMMUNITY AREA</span>
              </th>
              <th scope="col">
                <span>PATROL SKILLS</span>
              </th>
              <th scope="col" style={{ textAlign: 'right' }}>
                <span>ACTIONS</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ padding: 0 }}>
                  <SkeletonTable rows={8} />
                </td>
              </tr>
            ) : officers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <EmptyState
                    title={isFiltered ? 'No Officers Match Current Filters' : 'No Field Officers Found'}
                    description={
                      isFiltered
                        ? 'Try adjusting or clearing your department, availability, or capacity filters.'
                        : 'No field personnel records are registered in the municipal database.'
                    }
                    actionLabel={isFiltered ? 'Reset Filters' : undefined}
                    onAction={isFiltered ? onResetFilters : undefined}
                  />
                </td>
              </tr>
            ) : (
              officers.map((officer) => {
                const id = officer.id || officer._id || officer.officerId;
                const readiness = getOfficerReadiness(officer);
                const workload = officer.currentWorkload || 0;
                const maxCap = officer.maxAssignments || 5;

                return (
                  <tr
                    key={id}
                    className="officer-table-row"
                    onClick={() => onInspect(officer)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onInspect(officer);
                      }
                    }}
                  >
                    {/* Officer Name & Contact */}
                    <td>
                      <div className="officer-identity-cell">
                        <div className="officer-avatar-circle">
                          {officer.name?.charAt(0)?.toUpperCase() || 'O'}
                        </div>
                        <div className="officer-identity-info">
                          <span className="officer-name-text">{officer.name}</span>
                          <span className="officer-contact-subtext">
                            {officer.phone || officer.userId?.email || 'No direct phone'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Officer ID & Employee Code */}
                    <td>
                      <div className="officer-id-cell">
                        <span className="officer-id-badge">{officer.officerId || id}</span>
                        <span className="officer-emp-subtext">{officer.employeeCode || '—'}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td>
                      <span className="officer-dept-badge">{officer.department || 'Municipal'}</span>
                    </td>

                    {/* Availability Status */}
                    <td>
                      {renderOfficerStatusBadge(officer.availability)}
                    </td>

                    {/* Operational Readiness */}
                    <td>
                      {renderOperationalReadinessBadge(readiness)}
                    </td>

                    {/* Workload / Capacity Visualization */}
                    <td>
                      {renderUtilizationBar(workload, maxCap)}
                    </td>

                    {/* Home Community Area */}
                    <td>
                      <div className="officer-area-cell">
                        {officer.homeCommunityArea ? (
                          <span className="officer-area-badge">
                            Area {officer.homeCommunityArea}
                          </span>
                        ) : officer.location?.coordinates && (officer.location.coordinates[0] !== 0 || officer.location.coordinates[1] !== 0) ? (
                          <span className="officer-geo-coords">
                            [{officer.location.coordinates[0].toFixed(2)}, {officer.location.coordinates[1].toFixed(2)}]
                          </span>
                        ) : (
                          <span className="officer-area-unassigned">Metro Wide</span>
                        )}
                      </div>
                    </td>

                    {/* Patrol Skills */}
                    <td>
                      <div className="officer-skills-wrap">
                        {Array.isArray(officer.skills) && officer.skills.length > 0 ? (
                          officer.skills.slice(0, 2).map((skill, idx) => (
                            <span key={idx} className="officer-skill-tag" title={skill}>
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="officer-skill-tag skill-general">General</span>
                        )}
                        {Array.isArray(officer.skills) && officer.skills.length > 2 && (
                          <span className="officer-skill-more" title={officer.skills.slice(2).join(', ')}>
                            +{officer.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div
                        className="officers-actions-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn-officer-action btn-action-inspect"
                          onClick={() => onInspect(officer)}
                          title="Inspect Officer Readiness & Assignments"
                          aria-label={`Inspect ${officer.name}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          className="btn-officer-action btn-action-edit"
                          onClick={() => onEdit(officer)}
                          title="Edit Officer Profile"
                          aria-label={`Edit ${officer.name}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn-officer-action btn-action-delete"
                          onClick={() => onDelete(officer)}
                          title="Deactivate / Delete Officer"
                          aria-label={`Delete ${officer.name}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="officers-pagination">
        <span className="pagination-info">
          Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong> ({pagination.total} total officers)
        </span>
        <div className="officers-pagination-actions">
          <button
            type="button"
            className="btn-pagination"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label="Previous Page"
          >
            ← Previous
          </button>
          <div className="pagination-pages-indicator">
            {pagination.page} / {pagination.totalPages || 1}
          </div>
          <button
            type="button"
            className="btn-pagination"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            aria-label="Next Page"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
