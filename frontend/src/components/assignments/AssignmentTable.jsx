import React from 'react';
import {
  renderAssignmentStatusBadge,
  renderMatchScorePill,
  renderMiniWorkload,
} from './AssignmentBadges';
import { RiskBadge } from '../common/Badge';
import { renderVerificationBadge } from '../predictions/PredictionBadges';
import Button from '../common/Button';

/**
 * AssignmentTable: Operational data table for AI dispatches & field monitoring
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
    <div className="card assignments-table-card">
      {/* Table Header / Subtitle */}
      <div className="assignments-table-header">
        <div className="assignments-table-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Automated Dispatches & Verification Queue
        </div>
        <div className="assignments-table-count font-mono">
          Showing {assignments.length} of {pagination.total || assignments.length} active records
        </div>
      </div>

      {/* Responsive Table */}
      <div className="assignments-table-responsive">
        <table className="table assignments-table" aria-label="AI Verification Assignments">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSortClick('riskScore')}>
                Priority{getSortIndicator('riskScore')}
              </th>
              <th>Prediction / Community</th>
              <th>AI Risk</th>
              <th>Assigned Officer</th>
              <th>Dept Match</th>
              <th className="sortable" onClick={() => handleSortClick('distanceKm')}>
                Distance{getSortIndicator('distanceKm')}
              </th>
              <th className="sortable" onClick={() => handleSortClick('currentWorkload')}>
                Workload{getSortIndicator('currentWorkload')}
              </th>
              <th className="sortable" onClick={() => handleSortClick('status')}>
                Status{getSortIndicator('status')}
              </th>
              <th>Verification</th>
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
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div className="asgn-state-title">No Assignments Found</div>
                    <p style={{ fontSize: '13px', maxWidth: '400px', margin: 0, color: 'var(--text-muted)' }}>
                      No assignment records match the selected filter criteria or search query.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              assignments.map((item) => {
                const pred = item.prediction || {};
                const officer = item.officer || {};
                const score = typeof pred.riskScore === 'number' ? pred.riskScore.toFixed(1) : pred.riskScore || '—';
                const dist = typeof item.distanceKm === 'number'
                  ? `${item.distanceKm.toFixed(1)} km`
                  : item.distanceKm ? `${item.distanceKm} km` : 'Distance unavailable';

                return (
                  <tr key={item.id || item.assignmentId}>
                    {/* 1. Priority */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <RiskBadge level={pred.riskLevel || 'LOW'} />
                        <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>
                          Score: {score}
                        </span>
                      </div>
                    </td>

                    {/* 2. Prediction / Area */}
                    <td>
                      <div className="asgn-complaint-title">
                        {pred.complaintType || 'Civic Infrastructure Complaint'}
                      </div>
                      <div className="asgn-pred-ref font-mono">
                        {pred.communityArea || 'Chicago'} • {pred.ward ? (pred.ward.startsWith('Ward') ? pred.ward : `Ward ${pred.ward}`) : 'Ward 1'}
                      </div>
                    </td>

                    {/* 3. AI Risk (Probability & Ref) */}
                    <td>
                      <div className="font-mono text-bold" style={{ color: 'var(--accent-text)', fontSize: '12.5px' }}>
                        {Math.round((pred.probability ?? ((pred.riskScore ?? 50) / 100)) * 100)}%
                      </div>
                      <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                        {pred.predictionId || 'PRED-REF'}
                      </span>
                    </td>

                    {/* 4. Assigned Officer */}
                    <td>
                      <div className="asgn-officer-name">
                        {officer.name || 'Unassigned'}
                      </div>
                      <div className="asgn-officer-code font-mono">
                        {officer.officerId || officer.employeeCode || 'OFF-N/A'} • {officer.department || item.department || 'Operations'}
                      </div>
                    </td>

                    {/* 5. Department Compatibility */}
                    <td>
                      <span
                        className="font-mono text-bold"
                        style={{
                          fontSize: '11px',
                          color: item.departmentMatch !== false ? 'var(--success)' : 'var(--warning)',
                        }}
                      >
                        {item.departmentMatch !== false ? '✓ Compatible' : '⚠ Cross-Dept'}
                      </span>
                    </td>

                    {/* 6. Distance */}
                    <td>
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {dist}
                      </span>
                    </td>

                    {/* 7. Workload */}
                    <td>
                      {renderMiniWorkload(item.currentWorkload ?? officer.currentWorkload ?? 0, 5)}
                    </td>

                    {/* 8. Status Badge */}
                    <td>
                      {renderAssignmentStatusBadge(item.status)}
                    </td>

                    {/* 9. Verification State */}
                    <td>
                      {renderVerificationBadge(item.verification?.status || (item.status === 'COMPLETED' ? 'VERIFIED' : 'PENDING'))}
                    </td>

                    {/* 10. Action */}
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onInspect && onInspect(item)}
                        title="Inspect AI Dispatch Details"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="assignments-pagination">
        <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
        </div>
        <div className="assignments-pagination-btns">
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
          >
            ← Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => onPageChange && onPageChange(pagination.page + 1)}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}

