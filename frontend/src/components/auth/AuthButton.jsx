import React from 'react';

export default function AuthButton({
  type = 'submit',
  loading = false,
  loadingText = 'AUTHENTICATING...',
  children,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="auth-submit"
    >
      {loading ? (
        <>
          <div className="auth-spinner" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
