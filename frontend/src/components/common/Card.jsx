import React from 'react';

export default function Card({
  title,
  subtitle,
  actions,
  children,
  footer,
  className = '',
  ...props
}) {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
