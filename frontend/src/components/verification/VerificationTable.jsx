import React from 'react';
import {
  renderVerificationOutcomeBadge,
  renderVerificationLifecycleBadge,
  renderEvaluationBadge,
  renderFeedbackPill,
} from './VerificationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';
import EmptyState from '../common/EmptyState';

/**
 * VerificationTable: Sortable, accessible table displaying field inspection records & evaluation outcomes
 */
export default function VerificationTable({
  verifications = [],
  pagination = {},
  isLoading = false,
  sortBy = 'verifiedAt',
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onInspect,
  onResetFilters,
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
    <div className="verification-table-card">
      {/* Table Header */}
      <div className="verification-table-header">
        <div className="verification-table-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Ground Truth Verification Logs
        </div>
        <div className="verification-table-count">
          Showing {verifications.length} of {pagination.total || verifications.length} records
        </div>
      </div>

      {/* Table Content */}
      <div className="verification-table-responsive">
        <table className="verification-table" aria-label="Field Verification Records">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSortClick('verificationId')}>
                Prediction Ref{getSortIndicator('verificationId')}
              </th>
              <th>Forecast Risk</th>
              <th>Community / Ward</th>
              <th>Complaint Type</th>
              <th>Field Officer</th>
              <th>Status</th>
              <th className="sortable" onClick={() => handleSortClick('outcome')}>
                Field Outcome{getSortIndicator('outcome')}
              </th>
              <th>Evaluation Result</th>
              <th className="sortable" onClick={() => handleSortClick('verifiedAt')}>
                Updated{getSortIndicator('verifiedAt')}
              </th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`verif-skel-${i}`}>
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
            ) : verifications.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <EmptyState
                    title="No verification records available"
                    description="No verification cases match the current filters or search criteria."
                    action={
                      onResetFilters && (
                        <button
                          type="button"
                          className="verification-btn verification-btn-secondary"
                          onClick={onResetFilters}
                        >
                          Clear Filters
                        </button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              verifications.map((item) => {
                const riskLevel = item.prediction?.riskLevel || 'LOW';
                const isHighRisk = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
                const prob = item.prediction?.probability !== undefined
                  ? Math.round(item.prediction.probability * 100)
                  : item.prediction?.riskScore || 50;

                return (
                  <tr key={item.id || item.verificationId || item._id}>
                    {/* Prediction Ref & Priority */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="font-mono text-bold" style={{ color: '#10b981', fontSize: '12px' }}>
                          {item.verificationId}
                        </span>
                        {isHighRisk && (
                          <span className="verif-priority-pill" title="High Risk Verification Candidate">
                            Priority
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                        Ref: {item.prediction?.predictionId || 'N/A'}
                      </div>
                    </td>

                    {/* Forecast Risk & Score */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {renderRiskBadge(riskLevel)}
                        <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          {prob}%
                        </span>
                      </div>
                    </td>

                    {/* Community / Ward */}
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {item.prediction?.communityArea || 'Chicago'}
                      </div>
                      <span className="verif-ward-badge font-mono">
                        {item.prediction?.ward || 'Ward 1'}
                      </span>
                    </td>

                    {/* Complaint Type */}
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {item.prediction?.complaintType || 'Civic Infrastructure'}
                      </div>
                      <div className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {item.officer?.department || item.prediction?.department || 'Municipal'}
                      </div>
                    </td>

                    {/* Field Officer */}
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {item.officer?.name || 'Unassigned'}
                      </div>
                      <div className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {item.officer?.officerId || 'OFF-N/A'}
                      </div>
                    </td>

                    {/* Workflow Status */}
                    <td>
                      {renderVerificationLifecycleBadge(item.assignment?.status || 'COMPLETED')}
                    </td>

                    {/* Field Outcome */}
                    <td>
                      {renderVerificationOutcomeBadge(item.outcome)}
                    </td>

                    {/* Evaluation Result */}
                    <td>
                      {renderEvaluationBadge(item.evaluation?.classification)}
                    </td>

                    {/* Timestamp */}
                    <td>
                      <span className="font-mono text-secondary" style={{ fontSize: '12px' }}>
                        {new Date(item.verifiedAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="verification-btn verification-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                        onClick={() => onInspect && onInspect(item)}
                        title="Inspect Field Verification Details"
                        aria-label={`Inspect verification ${item.verificationId}`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="verification-pagination">
        <div>
          Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total || verifications.length} total)
        </div>
        <div className="verification-pagination-btns">
          <button
            type="button"
            className="verif-page-btn"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="verif-page-btn"
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
