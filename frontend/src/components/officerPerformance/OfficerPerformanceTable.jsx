import React from 'react';
import { useNavigate } from 'react-router-dom';
import { renderOfficerStatusBadge, formatCompletionRate } from './OfficerBadges';

/**
 * OfficerPerformanceTable: Sortable table displaying field officer operational verification metrics
 */
export default function OfficerPerformanceTable({
  officers = [],
  pagination = {},
  loading = false,
  error = null,
  sortBy = 'completionRate',
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onRetry,
}) {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/officer-performance/${id}`);
  };

  const renderSortIndicator = (columnKey) => {
    if (sortBy !== columnKey) return null;
    return <span className="sort-icon">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  if (error) {
    return (
      <div className="officer-table-panel">
        <div className="error-state" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <div className="error-title">UNABLE TO LOAD OFFICER PERFORMANCE</div>
          <div className="error-subtitle">
            {error || 'A network error occurred while retrieving officer operational metrics.'}
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
    <section className="officer-table-panel" aria-label="Officer Performance Table">
      <div className="prediction-table-header-row">
        <div className="prediction-table-count">
          Showing {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}–
          {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of{' '}
          {pagination.total || 0} officers
        </div>
      </div>

      <div className="prediction-table-wrapper">
        <table className="prediction-table">
          <thead>
            <tr>
              <th scope="col">Officer</th>
              <th scope="col">Department</th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('activeTasks')}
                title="Sort by active workload"
              >
                Active Tasks {renderSortIndicator('activeTasks')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('completed')}
                title="Sort by completed verifications"
              >
                Completed {renderSortIndicator('completed')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('pending')}
                title="Sort by pending tasks"
              >
                Pending {renderSortIndicator('pending')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('confirmed')}
                title="Sort by confirmed problems"
              >
                Confirmed {renderSortIndicator('confirmed')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('notFound')}
                title="Sort by not found"
              >
                Not Found {renderSortIndicator('notFound')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('avgVerificationTime')}
                title="Sort by average verification time"
              >
                Avg. Verification {renderSortIndicator('avgVerificationTime')}
              </th>
              <th
                scope="col"
                className="sortable-th"
                onClick={() => onSort('completionRate')}
                title="Sort by completion rate"
              >
                Completion Rate {renderSortIndicator('completionRate')}
              </th>
              <th scope="col">Status</th>
              <th scope="col" style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td colSpan={11}>
                    <div
                      className="skeleton-box"
                      style={{ height: '38px', width: '100%' }}
                    />
                  </td>
                </tr>
              ))
            ) : officers.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="empty-state">
                    <div className="empty-icon" aria-hidden="true">👤</div>
                    <div className="empty-title">NO OFFICERS FOUND</div>
                    <div className="empty-subtitle">
                      Try adjusting the search terms or changing the selected filters.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              officers.map((officer) => (
                <tr
                  key={officer.id}
                  onClick={() => handleRowClick(officer.id)}
                  className="prediction-row-clickable"
                >
                  <td>
                    <div className="cell-primary">{officer.name}</div>
                    <div className="cell-subtext">{officer.id} ({officer.employeeCode})</div>
                  </td>
                  <td>
                    <span className="cell-primary">{officer.department}</span>
                  </td>
                  <td>
                    <span className="cell-primary" style={{ fontWeight: '700' }}>
                      {officer.workload?.active ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className="cell-primary">{officer.performance?.completed ?? 0}</span>
                  </td>
                  <td>
                    <span className="cell-primary">{officer.performance?.pending ?? 0}</span>
                  </td>
                  <td>
                    <span className="cell-primary" style={{ color: '#4dd6a8' }}>
                      {officer.performance?.confirmed ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className="cell-primary" style={{ color: '#94a3b8' }}>
                      {officer.performance?.notFound ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className="cell-window">
                      {officer.performance?.averageVerificationFormatted || `${officer.performance?.averageVerificationMinutes || 0}m`}
                    </span>
                  </td>
                  <td>{formatCompletionRate(officer.performance?.completionRate)}</td>
                  <td>{renderOfficerStatusBadge(officer.status)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(officer.id)}
                      className="prediction-action"
                      aria-label={`View performance details for ${officer.name}`}
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

      {/* Pagination */}
      {!loading && officers.length > 0 && pagination.totalPages > 1 && (
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
