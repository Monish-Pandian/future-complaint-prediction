import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import { useAuth } from '../../context/AuthContext';
import {
  DashboardIcon,
  PredictionsIcon,
  RiskMapIcon,
  AssignmentsIcon,
  VerificationIcon,
  EvaluationIcon,
  OfficersIcon,
  AnalyticsIcon,
  ComplaintsIcon,
  HistoryIcon,
  LogoutIcon,
} from '../../components/common/Icons';

/**
 * User Profile Page
 * Redesigned for ADMIN with dedicated operational access & session governance (Module 8K)
 * Also seamlessly supports FIELD OFFICER profile view.
 */
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isAdmin = user?.role === 'ADMIN';

  const adminCapabilities = [
    {
      id: 'cap-predictions',
      name: 'Predictions Intelligence',
      path: '/predictions',
      icon: PredictionsIcon,
      desc: 'Forecast future civic complaint hotspots and inspect prediction confidence.',
    },
    {
      id: 'cap-risk-map',
      name: 'Spatial Risk Heatmap',
      path: '/risk-map',
      icon: RiskMapIcon,
      desc: 'Geographic risk concentration across 77 Chicago community areas.',
    },
    {
      id: 'cap-assignments',
      name: 'AI Dispatch Operations',
      path: '/assignments',
      icon: AssignmentsIcon,
      desc: 'Multi-criteria matching engine (0.4 Risk / 0.3 Distance / 0.3 Workload).',
    },
    {
      id: 'cap-verification',
      name: 'Field Verification Logs',
      path: '/verification',
      icon: VerificationIcon,
      desc: 'On-site inspections, GPS evidence, and ground-truth verification outcomes.',
    },
    {
      id: 'cap-evaluations',
      name: 'AI Model Governance',
      path: '/evaluations',
      icon: EvaluationIcon,
      desc: 'Model performance metrics, confusion matrix, and closed-loop feedback.',
    },
    {
      id: 'cap-officers',
      name: 'Field Workforce Roster',
      path: '/officers',
      icon: OfficersIcon,
      desc: 'Workforce dispatch capacity, availability, and department distribution.',
    },
    {
      id: 'cap-analytics',
      name: 'Civic Operations Analytics',
      path: '/analytics',
      icon: AnalyticsIcon,
      desc: 'Macro complaint trends, operational throughput, and 90:10 policy telemetry.',
    },
  ];

  const officerCapabilities = [
    {
      id: 'cap-officer-dash',
      name: 'Field Operations Dashboard',
      path: '/officer',
      icon: DashboardIcon,
      desc: 'View active daily inspection queue, priority risk dispatches, and shift overview.',
    },
    {
      id: 'cap-officer-assignments',
      name: 'My Assigned Dispatches',
      path: '/officer/assignments',
      icon: ComplaintsIcon,
      desc: 'Manage assigned civic risk tasks, accept dispatches, and begin field tasks.',
    },
    {
      id: 'cap-officer-verification',
      name: 'Field Verification Tasks',
      path: '/officer/verification',
      icon: VerificationIcon,
      desc: 'Inspect predicted risk locations on-site and record ground-truth observations.',
    },
    {
      id: 'cap-officer-history',
      name: 'Operational History',
      path: '/officer/history',
      icon: HistoryIcon,
      desc: 'Review your historical inspection records, verified outcomes, and logs.',
    },
  ];

  const activeCapabilities = isAdmin ? adminCapabilities : officerCapabilities;

  return (
    <PageTransition>
      <div className="profile-container">
        {/* Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div className="stitch-telemetry-badge">
              <span className="stitch-live-dot" />
              <span>{isAdmin ? 'ADMIN / PROFILE' : 'OPERATOR / PROFILE'} • ACCESS & GOVERNANCE</span>
            </div>
            <h1 className="stitch-page-title">
              {isAdmin ? 'Administrator Profile' : 'Field Officer Profile'}
            </h1>
            <p className="stitch-page-desc">
              {isAdmin
                ? 'Manage your account information and review your administrative access.'
                : 'Review your field officer identity, assigned sector, and operational authorizations.'}
            </p>
          </div>

          <div className="stitch-command-actions">
            <div className="profile-header-pill">
              <span className="pill-lbl">SESSION:</span>
              <span className="pill-val">ACTIVE & AUTHENTICATED</span>
            </div>
            <div className="profile-header-pill">
              <span className="pill-lbl">ROLE:</span>
              <span className="pill-val font-mono">{user?.role || 'ADMIN'}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Main Profile Grid */}
        <div className="profile-main-grid">
          {/* Left Column: Identity & Security */}
          <div className="profile-left-col">
            {/* Identity Card */}
            <div className="profile-identity-card">
              <div className="profile-card-header">
                <span className="profile-card-tag">PERSONNEL IDENTITY</span>
                <span className="profile-status-pill">
                  <span className="status-dot-green" />
                  Active
                </span>
              </div>

              <div className="profile-user-hero">
                <div className="profile-large-avatar" aria-hidden="true">
                  {getInitials(user?.name)}
                </div>
                <div className="profile-hero-info">
                  <h2 className="profile-hero-name">{user?.name || 'Authorized Operator'}</h2>
                  <div className="profile-role-badge-wrap">
                    <span className="profile-role-badge">
                      {isAdmin ? 'CENTRAL ADMINISTRATOR' : 'FIELD INSPECTOR'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-specs-list">
                <div className="profile-spec-row">
                  <span className="profile-spec-lbl">EMAIL ADDRESS</span>
                  <span className="profile-spec-val">{user?.email || 'N/A'}</span>
                </div>

                <div className="profile-spec-row">
                  <span className="profile-spec-lbl">USER ID</span>
                  <span className="profile-spec-val font-mono" style={{ color: 'var(--accent, #818cf8)' }}>
                    {user?._id || user?.id || 'USR-AUTH-ADMIN'}
                  </span>
                </div>

                <div className="profile-spec-row">
                  <span className="profile-spec-lbl">AUTHORITY SCOPE</span>
                  <span className="profile-spec-val">
                    {isAdmin ? 'Central Municipal Governance' : 'Field Inspection & Verification'}
                  </span>
                </div>

                <div className="profile-spec-row">
                  <span className="profile-spec-lbl">DEPARTMENT</span>
                  <span className="profile-spec-val">
                    {user?.department || 'Citywide Municipal Operations'}
                  </span>
                </div>

                <div className="profile-spec-row">
                  <span className="profile-spec-lbl">JURISDICTION</span>
                  <span className="profile-spec-val">
                    Chicago Metropolitan Area (77 Community Areas)
                  </span>
                </div>
              </div>
            </div>

            {/* Session Security & Sign Out Card */}
            <div className="profile-security-card">
              <div className="profile-card-header">
                <span className="profile-card-tag">SECURITY & SESSION</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  JWT Bearer
                </span>
              </div>

              <div className="security-specs-list">
                <div className="security-item">
                  <span className="security-icon">🔒</span>
                  <div className="security-text-wrap">
                    <span className="security-title">Encrypted Token Authentication</span>
                    <span className="security-desc">
                      Session secured with signed JSON Web Tokens validated on every municipal API request.
                    </span>
                  </div>
                </div>

                <div className="security-item">
                  <span className="security-icon">🛡️</span>
                  <div className="security-text-wrap">
                    <span className="security-title">Role-Based Access Control</span>
                    <span className="security-desc">
                      Privileges enforced strictly at the database and routing layers based on <code>{user?.role || 'ADMIN'}</code> authorization.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-profile-logout"
                onClick={handleLogout}
                aria-label="Sign out of administrative session"
              >
                <LogoutIcon />
                <span>Sign Out of Session</span>
              </button>
            </div>
          </div>

          {/* Right Column: Access & Capabilities Matrix */}
          <div className="profile-right-col">
            <div className="profile-capabilities-card">
              <div className="profile-card-header">
                <div>
                  <span className="profile-card-tag">OPERATIONAL ACCESS</span>
                  <h3 className="profile-card-title">
                    {isAdmin ? 'Administrative Capabilities & Subsystems' : 'Field Operations & Authorized Tasks'}
                  </h3>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent, #818cf8)' }}>
                  {activeCapabilities.length} Modules Authorized
                </span>
              </div>

              <div className="profile-capabilities-grid">
                {activeCapabilities.map((cap) => {
                  const IconComp = cap.icon;
                  return (
                    <Link
                      key={cap.id}
                      to={cap.path}
                      className="capability-card"
                      title={`Navigate to ${cap.name}`}
                    >
                      <div className="capability-top">
                        <div className="capability-name-wrap">
                          <div className="capability-icon-box">
                            <IconComp />
                          </div>
                          <span className="capability-name">{cap.name}</span>
                        </div>
                        <span className="capability-arrow">→</span>
                      </div>
                      <p className="capability-desc">{cap.desc}</p>
                      <span className="capability-path-pill">{cap.path}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Invariants / Operational Protocols Footer Callout */}
              <div className="profile-invariants-box">
                <div className="invariants-header">
                  <span className="invariants-title">
                    {isAdmin ? 'ACTIVE COMAI SYSTEM INVARIANTS' : 'FIELD INSPECTION PROTOCOLS'}
                  </span>
                  <span className="status-dot-green" />
                </div>
                {isAdmin ? (
                  <div className="invariants-grid">
                    <div className="invariant-item">
                      <span className="inv-lbl">MODEL:</span>
                      <span className="inv-val">xgb-test-v1</span>
                    </div>
                    <div className="invariant-item">
                      <span className="inv-lbl">THRESHOLD:</span>
                      <span className="inv-val" style={{ color: '#f59e0b' }}>0.38</span>
                    </div>
                    <div className="invariant-item">
                      <span className="inv-lbl">POLICY:</span>
                      <span className="inv-val" style={{ color: '#38bdf8' }}>90/10 Ratio</span>
                    </div>
                    <div className="invariant-item">
                      <span className="inv-lbl">WEIGHTS:</span>
                      <span className="inv-val" style={{ color: '#34d399' }}>0.4 / 0.3 / 0.3</span>
                    </div>
                  </div>
                ) : (
                  <div className="invariants-grid">
                    <div className="invariant-item">
                      <span className="inv-lbl">GPS AUDIT:</span>
                      <span className="inv-val" style={{ color: '#38bdf8' }}>Enforced</span>
                    </div>
                    <div className="invariant-item">
                      <span className="inv-lbl">OUTCOMES:</span>
                      <span className="inv-val" style={{ color: '#34d399' }}>5 Standard Codes</span>
                    </div>
                    <div className="invariant-item">
                      <span className="inv-lbl">WORKLOAD:</span>
                      <span className="inv-val" style={{ color: '#f59e0b' }}>Dynamic Decrement</span>
                    </div>
                    <div className="invariant-item">
                      <span className="inv-lbl">EVIDENCE:</span>
                      <span className="inv-val" style={{ color: 'var(--accent, #818cf8)' }}>Photo & Notes</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
