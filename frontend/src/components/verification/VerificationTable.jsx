import React from 'react';
import {
  renderVerificationOutcomeBadge,
  renderEvaluationBadge,
  renderFeedbackPill,
} from './VerificationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';

/**
 * VerificationTable: Sortable table displaying field inspection records & evaluation outcomes
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
          Ground Truth Verification Logs & Feedback Queue
        </div>
        <div className="verification-table-count">
          Showing {verifications.length} of {pagination.total || verifications.length} verified logs
        </div>
      </div>

      {/* Table Content */}
      <div className="verification-table-responsive">
        <table className="verification-table" aria-label="Field Verification Records">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSortClick('verificationId')}>
                Verification ID{getSortIndicator('verificationId')}
              </th>
              <th>Complaint / Prediction</th>
              <th>Area / Ward</th>
              <th>Forecast Risk</th>
              <th>Field Inspector</th>
              <th className="sortable" onClick={() => handleSortClick('outcome')}>
                Field Outcome{getSortIndicator('outcome')}
              </th>
              <th>AI Evaluation</th>
              <th>Feedback Pipeline</th>
              <th className="sortable" onClick={() => handleSortClick('verifiedAt')}>
                Verified At{getSortIndicator('verifiedAt')}
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
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
                <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      No Verification Records Found
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      No field verification logs match the selected filter criteria or search parameters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              verifications.map((item) => (
                <tr key={item.id || item.verificationId}>
                  {/* Verification ID */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#10b981', fontSize: '12px' }}>
                      {item.verificationId}
                    </span>
                  </td>

                  {/* Complaint & Prediction Ref */}
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {item.prediction?.complaintType || 'Civic Complaint'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Ref: {item.prediction?.predictionId || 'N/A'}
                    </div>
                  </td>

                  {/* Area & Ward */}
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                      {item.prediction?.communityArea || 'Chicago'}
                    </div>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.prediction?.ward || 'Ward 1'}
                    </span>
                  </td>

                  {/* Forecast Risk */}
                  <td>
                    {renderRiskBadge(item.prediction?.riskLevel || 'LOW')}
                  </td>

                  {/* Field Inspector */}
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {item.officer?.name || 'Unassigned'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.officer?.officerId || 'OFF-N/A'}
                    </div>
                  </td>

                  {/* Field Outcome */}
                  <td>
                    {renderVerificationOutcomeBadge(item.outcome)}
                  </td>

                  {/* AI Evaluation */}
                  <td>
                    {renderEvaluationBadge(item.evaluation?.classification)}
                  </td>

                  {/* Feedback Pipeline */}
                  <td>
                    {renderFeedbackPill(item.feedback?.feedbackStatus)}
                  </td>

                  {/* Timestamp */}
                  <td>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {new Date(item.verifiedAt).toLocaleDateString()}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="verification-btn verification-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => onInspect && onInspect(item)}
                      title="Inspect Field Verification Details"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="verification-pagination">
        <div>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
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
