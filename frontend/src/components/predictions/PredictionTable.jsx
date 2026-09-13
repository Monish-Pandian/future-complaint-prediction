import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  renderRiskBadge,
  renderVerificationBadge,
  renderAssignmentBadge,
} from './PredictionBadges';

/**
 * PredictionTable: Interactive table with sortable columns, pagination, and skeleton loading
 */
export default function PredictionTable({
  predictions = [],
  pagination = {},
  loading = false,
  error = null,
  sortBy = 'riskScore',
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onRetry,
}) {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/predictions/${id}`);
  };

  const renderSortIndicator = (columnKey) => {
    if (sortBy !== columnKey) return null;
    return <span className="sort-icon">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  if (error) {
    return (
      <div className="prediction-table-panel">
        <div className="error-state" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <div className="error-title">UNABLE TO LOAD PREDICTIONS</div>
          <div className="error-subtitle">
            {error || 'A network error occurred while communicating with the civic forecasting service.'}
          </div>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-retry">
              RETRY
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="prediction-table-panel" aria-label="Predictions Table">
      <div className="prediction-table-header-row">
        <div className="prediction-table-count">
          Showing {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}–
          {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of{' '}
          {pagination.total || 0} predictions (DEMO DATA)
        </div>
      </div>

      <div className="prediction-table-wrapper">
        <table className="prediction-table">
          <thead>
            <tr>
              <th scope="col">Prediction ID</th>
              <th scope="col">Area</th>
              <th scope="col">Ward</th>
              <th scope="col">Complaint Type</th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('predictionDate')}
                title="Sort by prediction date"
              >
                Prediction Window {renderSortIndicator('predictionDate')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('riskScore')}
                title="Sort by risk score"
              >
                Risk {renderSortIndicator('riskScore')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('probability')}
                title="Sort by probability"
              >
                Probability {renderSortIndicator('probability')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('confidence')}
                title="Sort by confidence"
              >
                Confidence {renderSortIndicator('confidence')}
              </th>
              <th scope="col">Assignment</th>
              <th scope="col">Verification</th>
              <th scope="col" style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td colSpan={11}>
                    <div
                      className="skeleton-box"
                      style={{ height: '38px', width: '100%' }}
                    />
                  </td>
                </tr>
              ))
            ) : predictions.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="empty-state">
                    <div className="empty-icon" aria-hidden="true">🔍</div>
                    <div className="empty-title">NO PREDICTIONS FOUND</div>
                    <div className="empty-subtitle">
                      Try adjusting the search terms or resetting the selected filters.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              predictions.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item.id)}
                  className="prediction-row-clickable"
                >
                  <td>
                    <span className="identity-id">{item.id}</span>
                  </td>
                  <td>
                    <div className="cell-primary">
                      {item.area?.communityAreaName || `Area ${item.area?.communityArea}`}
                    </div>
                    <div className="cell-subtext">Area #{item.area?.communityArea}</div>
                  </td>
                  <td>
                    <span className="cell-primary">Ward {item.area?.ward}</span>
                  </td>
                  <td>
                    <div className="cell-primary">{item.complaintType}</div>
                    <div className="cell-subtext">{item.department}</div>
                  </td>
                  <td>
                    <span className="cell-window">
                      {item.predictionWindow?.display || `${item.predictionDate}`}
                    </span>
                  </td>
                  <td>{renderRiskBadge(item.riskLevel)}</td>
                  <td>
                    <span className="cell-primary">
                      {Math.round((item.probability ?? 0) * 100)}%
                    </span>
                  </td>
                  <td>
                    <span className="cell-primary">
                      {Math.round((item.confidence ?? 0) * 100)}%
                    </span>
                  </td>
                  <td>
                    <div>
                      {renderAssignmentBadge(item.assignment?.status)}
                      {item.assignment?.officerName && (
                        <div className="cell-subtext" style={{ marginTop: '3px' }}>
                          {item.assignment.officerName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{renderVerificationBadge(item.verification?.status)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(item.id)}
                      className="prediction-action"
                      aria-label={`View detail assessment for prediction ${item.id}`}
                    >
                      <span>VIEW</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && predictions.length > 0 && pagination.totalPages > 1 && (
        <div className="table-pagination">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="page-btn"
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <div className="pagination-pages">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`page-${p}`}
                type="button"
                className={`page-btn ${p === pagination.page ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={p === pagination.page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="page-btn"
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
