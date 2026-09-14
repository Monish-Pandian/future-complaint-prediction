import React from 'react';

export default function MetricCard({
  label,
  value,
  subtext,
  icon,
  status = 'info', // 'critical' | 'high' | 'warning' | 'success' | 'info' | 'neutral'
  change,
  footer,
  className = '',
}) {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'critical':
      case 'danger':
        return 'danger';
      case 'high':
      case 'warning':
        return 'warning';
      case 'success':
      case 'low':
        return 'success';
      case 'neutral':
        return 'neutral';
      default:
        return 'accent';
    }
  };

  const statusClass = getStatusClass();

  return (
    <div className={`metric-card ${className}`.trim()} role="region" aria-label={label}>
      <div className="metric-card-top">
        <span className="metric-card-label">{label}</span>
        <div className={`metric-card-icon ${statusClass}`}>
          {icon || <span className="stitch-live-dot" />}
        </div>
      </div>

      <div className="metric-card-value-wrap">
        <span className="metric-card-value">{value}</span>
      </div>

      {subtext && <p className="metric-card-subtext">{subtext}</p>}

      {(change || footer) && (
        <div className="metric-card-footer">
          {change ? <span>{change}</span> : null}
          {footer ? <span>{footer}</span> : null}
        </div>
      )}
    </div>
  );
}
