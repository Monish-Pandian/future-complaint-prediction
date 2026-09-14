import React from 'react';

export function LoadingSpinner({ message = 'Loading intelligence data...', size = 28 }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" style={{ width: `${size}px`, height: `${size}px` }} />
      {message && <span>{message}</span>}
    </div>
  );
}

export function SkeletonCard({ height = 120, className = '' }) {
  return (
    <div
      className={`skeleton skeleton-card ${className}`.trim()}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container" aria-hidden="true">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="skeleton skeleton-text" style={{ width: '80px', height: '12px', margin: 0 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div className="skeleton skeleton-text" style={{ width: c === 0 ? '120px' : '70px', margin: 0 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default {
  LoadingSpinner,
  SkeletonCard,
  SkeletonTable,
};
