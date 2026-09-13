import React from 'react';
import { renderClassificationBadge } from './EvaluationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';
import { renderVerificationOutcomeBadge } from '../verification/VerificationBadges';

/**
 * EvaluationRecordsTable: Table comparing AI Prediction vs Ground Truth Verified Outcome with Lead Time
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
          Evaluated Prediction Benchmark Records
        </div>
        <div className="evaluation-table-count">
          Showing {records.length} of {pagination.total || records.length} evaluations
        </div>
      </div>

      {/* Table Content */}
      <div className="evaluation-table-responsive">
        <table className="evaluation-table" aria-label="AI Evaluation Records">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSortClick('evaluationId')}>
                Evaluation ID{getSortIndicator('evaluationId')}
              </th>
              <th>Complaint / Ref</th>
              <th>Area / Ward</th>
              <th>Forecast Risk</th>
              <th>Actual Observed</th>
              <th>Matrix Classification</th>
              <th className="sortable" onClick={() => handleSortClick('leadTimeHours')}>
                Lead Time{getSortIndicator('leadTimeHours')}
              </th>
              <th>Feedback Ingest</th>
              <th className="sortable" onClick={() => handleSortClick('evaluatedAt')}>
                Evaluated At{getSortIndicator('evaluatedAt')}
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`eval-skel-${i}`}>
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
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      No Evaluation Records Found
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      No evaluation records match the selected filter criteria or search parameters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((item) => (
                <tr key={item.id || item.evaluationId}>
                  {/* Evaluation ID */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#06b6d4', fontSize: '12px' }}>
                      {item.evaluationId}
                    </span>
                  </td>

                  {/* Complaint & Ref */}
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {item.prediction?.complaintType || 'Civic Problem'}
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

                  {/* Actual Observed Outcome */}
                  <td>
                    {renderVerificationOutcomeBadge(item.actualOutcome || item.verification?.outcome)}
                  </td>

                  {/* Matrix Classification */}
                  <td>
                    {renderClassificationBadge(item.classification)}
                  </td>

                  {/* Lead Time */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#ffd166', fontSize: '12px' }}>
                      {item.leadTimeHours ? `${item.leadTimeHours}h` : 'N/A'}
                    </span>
                  </td>

                  {/* Feedback State */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#4dd6a8', background: 'rgba(77, 214, 168, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.feedback?.feedbackStatus === 'MODEL_REFINED' ? 'Retrained' : 'Feature Store'}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
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
      <div className="evaluation-pagination">
        <div>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
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
