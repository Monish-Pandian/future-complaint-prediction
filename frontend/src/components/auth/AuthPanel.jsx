import React from 'react';

export default function AuthPanel({
  label = 'SYSTEM ACCESS',
  title = 'Access Civic Intelligence',
  description = 'Authenticate with your authorized civic intelligence account.',
  children,
}) {
  return (
    <div className="auth-panel" role="region" aria-label="Authentication Panel">
      <div className="auth-header">
        {label && <div className="auth-label">{label}</div>}
        {title && <h2 className="auth-title">{title}</h2>}
        {description && <p className="auth-description">{description}</p>}
      </div>

      {children}

      <div className="auth-authorized">
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>●</span>
        <span>
          <strong>AUTHORIZED PERSONNEL ONLY</strong> &mdash; This account is managed by the Civic Intelligence administration system.
        </span>
      </div>
    </div>
  );
}
