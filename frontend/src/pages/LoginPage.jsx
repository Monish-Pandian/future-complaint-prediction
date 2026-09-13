import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthPanel from '../components/auth/AuthPanel';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import AuthButton from '../components/auth/AuthButton';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to appropriate role portal
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = (user.role || '').toUpperCase();
      if (role === 'ADMIN') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'OFFICER') {
        navigate('/officer', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
    if (infoMessage) {
      setInfoMessage('');
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailTrimmed = formData.email.trim();

    if (!emailTrimmed) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      newErrors.email = 'Invalid email format.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setInfoMessage('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const authUser = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const userRole = (authUser?.role || '').toUpperCase();
      const fromPath = location.state?.from?.pathname;

      if (userRole === 'ADMIN') {
        navigate(fromPath && fromPath.startsWith('/dashboard') ? fromPath : '/dashboard', { replace: true });
      } else if (userRole === 'OFFICER') {
        navigate(fromPath && fromPath.startsWith('/officer') ? fromPath : '/officer', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setApiError(err.message || 'Unable to authenticate with the provided credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setInfoMessage('Contact your system administrator to reset or recover your account credentials.');
  };

  return (
    <AuthLayout>
      <AuthPanel
        label="SYSTEM ACCESS"
        title="Access Civic Intelligence"
        description="Authenticate with your authorized civic intelligence account."
      >
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {apiError && (
            <div className="auth-error" role="alert">
              <strong>AUTHENTICATION FAILED</strong> &mdash; {apiError}
            </div>
          )}

          {infoMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                fontSize: '12px',
                lineHeight: '1.4',
              }}
            >
              {infoMessage}
            </div>
          )}

          <AuthInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter authorized email"
            error={errors.email}
            disabled={loading}
            autoComplete="email"
            required
          />

          <PasswordInput
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            error={errors.password}
            disabled={loading}
            autoComplete="current-password"
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Forgot password?
            </button>
          </div>

          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Authenticating..."
            disabled={loading}
          >
            LOGIN
          </AuthButton>
        </form>
      </AuthPanel>
    </AuthLayout>
  );
}
