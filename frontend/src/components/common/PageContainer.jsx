import React from 'react';

export default function PageContainer({
  title,
  description,
  actions,
  children,
  className = '',
}) {
  return (
    <div className={`page-container ${className}`.trim()}>
      {(title || actions) && (
        <div className="page-header">
          <div className="page-title-group">
            {title && <h2 className="page-title">{title}</h2>}
            {description && <p className="page-description">{description}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </div>
      )}
      <div className="page-content">{children}</div>
    </div>
  );
}
