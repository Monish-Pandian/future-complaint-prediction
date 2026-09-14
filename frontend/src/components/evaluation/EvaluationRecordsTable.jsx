import React from 'react';
import { renderClassificationBadge, renderFeedbackTypeBadge } from './EvaluationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';
import { renderVerificationOutcomeBadge } from '../verification/VerificationBadges';
import EmptyState from '../common/EmptyState';

/**
 * EvaluationRecordsTable: 11-column operational table comparing AI Predictions against Ground Truth Outcomes
 */
export default function EvaluationRecordsTable({
  records = [],
  pagination = {},
  isLoading = false,
  sortBy = 'evaluatedAt',
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
    <div className="evaluation-table-card">
      {/* Table Header */}
      <div className="evaluation-table-header">
        <div className="evaluation-table-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Operational Field Evaluation Records
        </div>
        <div className="evaluation-table-count">
          Showing {records.length} of {pagination.total || records.length} evaluations
        </div>
      </div>

      {/* Table Content */}
      <div className="evaluation-table-responsive">
        <table className="evaluation-table" aria-label="Operational Evaluation Records">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSortClick('evaluationId')}>
                Evaluation ID{getSortIndicator('evaluationId')}
              </th>
              <th>Prediction Ref</th>
              <th>Complaint Type</th>
              <th>Community / Ward</th>
              <th>Forecast Risk</th>
              <th>Assigned Officer</th>
              <th>Verification Outcome</th>
              <th className="sortable" onClick={() => handleSortClick('classification')}>
                Evaluation Result{getSortIndicator('classification')}
              </th>
              <th>Feedback Signal</th>
              <th className="sortable" onClick={() => handleSortClick('evaluatedAt')}>
                Evaluated At{getSortIndicator('evaluatedAt')}
              </th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`eval-skel-${i}`}>
                  <td colSpan={11} style={{ padding: '16px' }}>
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
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <EmptyState
                    title="No evaluation records found"
                    description="No prediction evaluation cases match the selected filter criteria."
                    action={
                      onResetFilters && (
                        <button
                          type="button"
                          className="evaluation-btn evaluation-btn-secondary"
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
              records.map((item) => {
                const pred = item.prediction || {};
                const verif = item.verification || {};
                const officer = verif.officer || item.officer || {};
                const feedback = item.feedback || {};
                const riskLevel = pred.riskLevel || 'LOW';

                return (
                  <tr key={item.id || item.evaluationId || item._id}>
                    {/* Evaluation ID */}
                    <td>
                      <span className="font-mono text-bold" style={{ color: '#06b6d4', fontSize: '12px' }}>
                        {item.evaluationId}
                      </span>
                    </td>

                    {/* Prediction Ref */}
                    <td>
                      <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {pred.predictionId || 'N/A'}
                      </span>
                    </td>

                    {/* Complaint Type */}
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {pred.complaintType || 'Civic Problem'}
                      </div>
                      <div className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {pred.department || 'Municipal'}
                      </div>
                    </td>

                    {/* Area & Ward */}
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {pred.communityArea || 'Chicago'}
                      </div>
                      <span className="eval-ward-badge font-mono">
                        {pred.ward || 'Ward 1'}
                      </span>
                    </td>

                    {/* Forecast Risk */}
                    <td>
                      {renderRiskBadge(riskLevel)}
                    </td>

                    {/* Assigned Officer */}
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {officer.name || 'Assigned Officer'}
                      </div>
                      <div className="font-mono text-muted" style={{ fontSize: '11px' }}>
                        {officer.officerId || officer.employeeCode || 'OFF-N/A'}
                      </div>
                    </td>

                    {/* Verification Outcome */}
                    <td>
                      {renderVerificationOutcomeBadge(item.actualOutcome || verif.outcome || 'PROBLEM_CONFIRMED')}
                    </td>

                    {/* Matrix Classification */}
                    <td>
                      {renderClassificationBadge(item.classification)}
                    </td>

                    {/* Feedback Signal */}
                    <td>
                      {renderFeedbackTypeBadge(feedback.feedbackType || (item.classification === 'TRUE_POSITIVE' ? 'FEEDBACK_TRUE_POSITIVE' : 'FEEDBACK_FALSE_POSITIVE'))}
                    </td>

                    {/* Evaluated At */}
                    <td>
                      <span className="font-mono text-secondary" style={{ fontSize: '12px' }}>
                        {new Date(item.evaluatedAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="evaluation-btn evaluation-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                        onClick={() => onInspect && onInspect(item)}
                        title="Inspect Prediction Evaluation Details"
                        aria-label={`Inspect evaluation ${item.evaluationId}`}
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
      <div className="evaluation-pagination">
        <div>
          Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total || records.length} total)
        </div>
        <div className="evaluation-pagination-btns">
          <button
            type="button"
            className="eval-page-btn"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="eval-page-btn"
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
