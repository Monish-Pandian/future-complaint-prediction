import React from 'react';
import { RiskBadge, AssignmentStatusBadge } from '../common/Badge';
import { renderVerificationBadge } from './PredictionBadges';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';

export default function PredictionTable({
  predictions = [],
  pagination = {},
  loading = false,
  error = null,
  sortBy = 'riskScore',
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onSelectPrediction,
}) {
  const renderSortIndicator = (columnKey) => {
    if (sortBy !== columnKey) {
      return (
        <span className="sort-icon inactive" aria-hidden="true">
          ↕
        </span>
      );
    }
    return (
      <span className="sort-icon active" aria-hidden="true">
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const formatProbability = (prob) => {
    if (typeof prob !== 'number') return '—';
    return `${(prob * 100).toFixed(1)}%`;
  };

  const formatRiskScore = (score, prob) => {
    if (typeof score === 'number') return score.toFixed(1);
    if (typeof prob === 'number') return (prob * 100).toFixed(1);
    return '0.0';
  };

  return (
    <div className="card prediction-table-card" aria-label="Predictions Intelligence Table">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('riskScore')}
                title="Sort by Risk"
              >
                <span>Risk Level</span> {renderSortIndicator('riskScore')}
              </th>

              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('communityArea')}
                title="Sort by Community Area"
              >
                <span>Community Area & Ward</span> {renderSortIndicator('communityArea')}
              </th>

              <th scope="col">Complaint Type</th>

              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('probability')}
                title="Sort by Probability"
                style={{ textAlign: 'right' }}
              >
                <span>Probability</span> {renderSortIndicator('probability')}
              </th>

              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('riskScore')}
                title="Sort by Risk Score"
                style={{ textAlign: 'right' }}
              >
                <span>Risk Score</span> {renderSortIndicator('riskScore')}
              </th>

              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('predictionDate')}
                title="Sort by Target Window"
              >
                <span>Prediction Window</span> {renderSortIndicator('predictionDate')}
              </th>

              <th scope="col">Assignment</th>

              <th scope="col">Verification</th>

              <th scope="col" style={{ textAlign: 'right' }}>
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td colSpan={9}>
                    <div className="skeleton skeleton-text" style={{ height: '32px', width: '100%', margin: 0 }} />
                  </td>
                </tr>
              ))
            ) : predictions.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No prediction results found"
                    description="No predictions match the active cycle, search term, or filters."
                  />
                </td>
              </tr>
            ) : (
              predictions.map((item, idx) => {
                const id = item.predictionId || item.id || item._id;
                const caName = item.communityArea || item.area?.communityAreaName || `Area ${item.area?.communityArea || idx + 1}`;
                const ward = item.ward || item.area?.ward || 'Ward N/A';
                const probStr = formatProbability(item.probability);
                const scoreStr = formatRiskScore(item.riskScore, item.probability);
                const windowDisplay = item.predictionWindow?.display || item.predictionDate || 'Next 7 days';

                return (
                  <tr
                    key={id || idx}
                    className="prediction-row-interactive"
                    onClick={() => onSelectPrediction(item)}
                    title="Click to view prediction details"
                  >
                    {/* 1. Risk Level */}
                    <td>
                      <RiskBadge level={item.riskLevel} />
                    </td>

                    {/* 2. Community Area & Ward */}
                    <td>
                      <div className="table-primary-text">{caName}</div>
                      <div className="table-sub-text">{ward.startsWith('Ward') ? ward : `Ward ${ward}`}</div>
                    </td>

                    {/* 3. Complaint Type & Department */}
                    <td>
                      <div className="table-primary-text">{item.complaintType || 'Civic Issue'}</div>
                      <div className="table-sub-text">{item.department || 'Municipal Operations'}</div>
                    </td>

                    {/* 4. Probability */}
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-mono table-prob-val">
                        {probStr}
                      </span>
                    </td>

                    {/* 5. Risk Score */}
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-mono table-score-val">
                        {scoreStr}
                      </span>
                    </td>

                    {/* 6. Target Window */}
                    <td>
                      <span className="table-window-pill font-mono">
                        {windowDisplay}
                      </span>
                    </td>

                    {/* 7. Assignment */}
                    <td>
                      <AssignmentStatusBadge status={item.assignment?.status || item.assignmentStatus || 'UNASSIGNED'} />
                      {item.assignedOfficer?.name && (
                        <div className="table-sub-text" style={{ marginTop: '2px' }}>
                          {item.assignedOfficer.name}
                        </div>
                      )}
                    </td>

                    {/* 8. Verification */}
                    <td>
                      {renderVerificationBadge(item.verification?.status || item.verificationStatus || 'UNASSIGNED')}
                    </td>

                    {/* 9. Action */}
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectPrediction(item)}
                        aria-label={`View detail assessment for prediction ${id}`}
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
      {!loading && predictions.length > 0 && pagination.totalPages > 1 && (
        <div className="table-pagination-bar">
          <div className="pagination-info font-mono">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total || predictions.length)} of{' '}
            {pagination.total || predictions.length} predictions
          </div>

          <div className="pagination-buttons">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="btn btn-secondary btn-sm"
              aria-label="Previous page"
            >
              ← Previous
            </button>

            <span className="pagination-page-indicator font-mono">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="btn btn-secondary btn-sm"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
