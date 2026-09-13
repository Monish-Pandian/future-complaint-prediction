import React from 'react';

export default function AuthInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  autoComplete,
  required = false,
}) {
  return (
    <div className="auth-field">
      {label && (
        <label htmlFor={name} className="auth-field-label">
          {label} {required && '*'}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className="auth-input"
        style={error ? { borderColor: 'rgba(233, 108, 108, 0.6)' } : {}}
      />
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  );
}
