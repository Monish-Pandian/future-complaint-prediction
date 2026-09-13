import React from 'react';
import {
  renderAssignmentStatusBadge,
  renderMatchScorePill,
  renderMiniWorkload,
} from './AssignmentBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';

/**
 * AssignmentTable: Sortable, interactive assignments monitoring data table
 */
export default function AssignmentTable({
  assignments = [],
  pagination = {},
  isLoading = false,
  sortBy = 'assignedAt',
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onInspect,
}) {
  const handleSortClick = (field) => {
    if (onSort) {
      const nextOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
      onSort(field, nextOrder);
    }
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="assignments-table-card">
      {/* Table Header / Subtitle */}
      <div className="assignments-table-header">
        <div className="assignments-table-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4dd6c7" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Automated Dispatches & Monitoring Queue
        </div>
        <div className="assignments-table-count">
          Showing {assignments.length} of {pagination.total || assignments.length} active records
        </div>
      </div>

      {/* Responsive Table */}
      <div className="assignments-table-responsive">
        <table className="assignments-table" aria-label="AI Verification Assignments">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSortClick('assignmentId')}>
                Assignment ID{getSortIndicator('assignmentId')}
              </th>
              <th>Complaint / Prediction</th>
              <th>Area / Ward</th>
              <th>AI Risk</th>
              <th>Assigned Officer</th>
              <th>Department</th>
              <th className="sortable" onClick={() => handleSortClick('currentWorkload')}>
                Workload{getSortIndicator('currentWorkload')}
              </th>
              <th className="sortable" onClick={() => handleSortClick('assignmentScore')}>
                Match Score{getSortIndicator('assignmentScore')}
              </th>
              <th className="sortable" onClick={() => handleSortClick('status')}>
                Status{getSortIndicator('status')}
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Shimmer Loading Skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={10} style={{ padding: '16px' }}>
                    <div
                      style={{
                        height: '24px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '4px',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div className="asgn-state-box">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div className="asgn-state-title">No Assignments Found</div>
                    <p style={{ fontSize: '13px', maxWidth: '400px', margin: 0 }}>
                      No assignment records match the selected filter criteria or search query.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              assignments.map((item) => (
                <tr key={item.id || item.assignmentId}>
                  {/* Assignment ID */}
                  <td>
                    <span className="asgn-id-cell">{item.assignmentId}</span>
                  </td>

                  {/* Complaint & Prediction Reference */}
                  <td>
                    <div className="asgn-complaint-title">
                      {item.prediction?.complaintType || 'Civic Complaint'}
                    </div>
                    <div className="asgn-pred-ref">
                      Ref: {item.prediction?.predictionId || 'N/A'}
                    </div>
                  </td>

                  {/* Area & Ward */}
                  <td>
                    <div className="asgn-area-name">
                      {item.prediction?.communityArea || 'Chicago'}
                    </div>
                    <span className="asgn-ward-pill">{item.prediction?.ward || 'Ward 1'}</span>
                  </td>

                  {/* AI Risk */}
                  <td>
                    {renderRiskBadge(item.prediction?.riskLevel || 'LOW')}
                  </td>

                  {/* Assigned Officer */}
                  <td>
                    <div className="asgn-officer-name">
                      {item.officer?.name || 'Unassigned'}
                    </div>
                    <div className="asgn-officer-code">
                      {item.officer?.officerId || 'OFF-N/A'}
                    </div>
                  </td>

                  {/* Department */}
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      {item.department}
                    </span>
                  </td>

                  {/* Officer Workload */}
                  <td>
                    {renderMiniWorkload(item.currentWorkload ?? item.officer?.currentWorkload ?? 0)}
                  </td>

                  {/* Composite Match Score */}
                  <td>
                    {renderMatchScorePill(item.assignmentScore)}
                  </td>

                  {/* Status Badge */}
                  <td>
                    {renderAssignmentStatusBadge(item.status)}
                  </td>

                  {/* Action Button */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="asgn-action-btn"
                      onClick={() => onInspect && onInspect(item)}
                      title="Inspect AI Dispatch Details"
                    >
                      Inspect Dispatch
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="assignments-pagination">
        <div>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
        </div>
        <div className="assignments-pagination-btns">
          <button
            type="button"
            className="asgn-page-btn"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="asgn-page-btn"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => onPageChange && onPageChange(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
