import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getOfficerReadiness,
  renderOperationalReadinessBadge,
  renderOfficerStatusBadge,
  renderUtilizationBar,
} from './OfficerBadges';
import { getOfficerPerformanceById } from '../../api/officerApi';

/**
 * Slide-over Operational Detail Drawer for Field Officer Workforce Inspection
 */
export default function OfficerDetailDrawer({
  officer,
  onClose,
  onEdit,
}) {
  const [details, setDetails] = useState(null);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [assignmentSummary, setAssignmentSummary] = useState({});
  const [verificationSummary, setVerificationSummary] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'assignments' | 'dispatch'

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch full live officer details, assignments, and verifications
  useEffect(() => {
    if (!officer) return;

    let isMounted = true;
    async function loadOfficerDetails() {
      setIsLoading(true);
      try {
        const id = officer.id || officer._id || officer.officerId;
        const res = await getOfficerPerformanceById(id);
        if (isMounted && res) {
          setDetails(res.data || officer);
          setRecentAssignments(res.recentAssignments || res.data?.recentAssignments || []);
          setAssignmentSummary(res.assignmentSummary || res.data?.assignmentSummary || {});
          setVerificationSummary(res.verificationSummary || res.data?.verificationSummary || {});
        }
      } catch (err) {
        console.warn('Could not load detailed officer profile:', err);
        if (isMounted) {
          setDetails(officer);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadOfficerDetails();
    return () => {
      isMounted = false;
    };
  }, [officer]);

  if (!officer) return null;

  const currentOfficer = details || officer;
  const readiness = getOfficerReadiness(currentOfficer);
  const workload = currentOfficer.currentWorkload || 0;
  const maxCap = currentOfficer.maxAssignments || 5;
  const utilizationPct = Math.min(100, Math.round((workload / maxCap) * 100));

  return (
    <div className="officer-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="officer-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="officer-drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-officer-avatar">
              {currentOfficer.name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="drawer-header-text">
              <div className="drawer-telemetry-tag">
                <span className="stitch-live-dot" />
                <span>FIELD WORKFORCE INTELLIGENCE</span>
              </div>
              <h2 id="drawer-title" className="drawer-officer-name">
                {currentOfficer.name}
              </h2>
              <div className="drawer-id-strip">
                <span className="drawer-officer-id">{currentOfficer.officerId}</span>
                <span className="drawer-dot-separator">•</span>
                <span className="drawer-emp-code">{currentOfficer.employeeCode || 'EMP-N/A'}</span>
                <span className="drawer-dot-separator">•</span>
                <span className="drawer-dept-name">{currentOfficer.department}</span>
              </div>
            </div>
          </div>

          <div className="drawer-header-actions">
            <button
              type="button"
              className="drawer-edit-btn"
              onClick={() => onEdit(currentOfficer)}
              title="Edit Profile"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit</span>
            </button>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close Drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="drawer-tabs-bar">
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Operational Overview
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'assignments' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignment Activity ({recentAssignments.length})
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'dispatch' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('dispatch')}
          >
            AI Dispatch Matching Engine
          </button>
        </div>

        {/* Drawer Body */}
        <div className="officer-drawer-body">
          {activeTab === 'overview' && (
            <div className="drawer-section-stack">
              {/* Operational Readiness Banner */}
              <div className="drawer-readiness-banner">
                <div className="readiness-banner-left">
                  <span className="readiness-banner-label">CURRENT OPERATIONAL STATUS</span>
                  <div className="readiness-badge-large-wrap">
                    {renderOperationalReadinessBadge(readiness)}
                    {renderOfficerStatusBadge(currentOfficer.availability)}
                  </div>
                </div>
                <div className="readiness-banner-right">
                  <span className="readiness-util-label">CAPACITY UTILIZATION</span>
                  <span className="readiness-util-stat">{utilizationPct}%</span>
                </div>
              </div>

              {/* Workload & Capacity Telemetry */}
              <div className="drawer-card-box">
                <h4 className="drawer-box-title">Workload vs Dispatch Capacity</h4>
                <div className="drawer-workload-breakdown">
                  <div className="drawer-workload-stat-row">
                    <span className="stat-label">Active Dispatched Tasks:</span>
                    <strong className="stat-value highlight-cyan">{workload} tasks</strong>
                  </div>
                  <div className="drawer-workload-stat-row">
                    <span className="stat-label">Max Assigned Capacity:</span>
                    <strong className="stat-value">{maxCap} tasks</strong>
                  </div>
                  <div className="drawer-workload-stat-row">
                    <span className="stat-label">Remaining Free Capacity:</span>
                    <strong className="stat-value highlight-green">
                      {Math.max(0, maxCap - workload)} slots available
                    </strong>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  {renderUtilizationBar(workload, maxCap)}
                </div>
              </div>

              {/* Identity & Account Specs */}
              <div className="drawer-card-box">
                <h4 className="drawer-box-title">Personnel & System Identity</h4>
                <div className="drawer-grid-2col">
                  <div className="spec-item">
                    <span className="spec-label">OFFICER ID</span>
                    <span className="spec-value mono-text">{currentOfficer.officerId}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">EMPLOYEE CODE</span>
                    <span className="spec-value mono-text">{currentOfficer.employeeCode || '—'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">PRIMARY DEPARTMENT</span>
                    <span className="spec-value">{currentOfficer.department}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">OFFICIAL PHONE</span>
                    <span className="spec-value">{currentOfficer.phone || 'No phone registered'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">LINKED EMAIL</span>
                    <span className="spec-value">{currentOfficer.userId?.email || 'N/A'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">REGISTRY STATUS</span>
                    <span className={`spec-value ${currentOfficer.active !== false ? 'text-green' : 'text-red'}`}>
                      {currentOfficer.active !== false ? 'Active & Enabled' : 'Deactivated / Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Geographic Patrol Zone */}
              <div className="drawer-card-box">
                <h4 className="drawer-box-title">Geographic & Patrol Context</h4>
                <div className="drawer-grid-2col">
                  <div className="spec-item">
                    <span className="spec-label">HOME COMMUNITY AREA</span>
                    <span className="spec-value highlight-blue">
                      {currentOfficer.homeCommunityArea ? `Community Area ${currentOfficer.homeCommunityArea}` : 'Metro-wide Sector'}
                    </span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">GPS BASE COORDINATES</span>
                    <span className="spec-value mono-text">
                      {currentOfficer.location?.coordinates
                        ? `[${currentOfficer.location.coordinates[0]?.toFixed(4)}, ${currentOfficer.location.coordinates[1]?.toFixed(4)}]`
                        : '[-87.6298, 41.8781] (Chicago Center)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Skills & Patrol Capabilities */}
              <div className="drawer-card-box">
                <h4 className="drawer-box-title">Patrol Skills & Verification Capabilities</h4>
                <div className="drawer-skills-cluster">
                  {Array.isArray(currentOfficer.skills) && currentOfficer.skills.length > 0 ? (
                    currentOfficer.skills.map((skill, i) => (
                      <span key={i} className="drawer-skill-badge">
                        <span className="skill-badge-dot" />
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="drawer-skill-badge">
                      <span className="skill-badge-dot" />
                      General Inspection & Field Assessment
                    </span>
                  )}
                </div>
              </div>

              {/* Assignment & Verification Lifetime Telemetry */}
              <div className="drawer-card-box">
                <h4 className="drawer-box-title">Operational History Summary</h4>
                <div className="drawer-metrics-quad">
                  <div className="quad-metric">
                    <span className="quad-metric-num">{assignmentSummary.active ?? workload}</span>
                    <span className="quad-metric-lbl">Active Assignments</span>
                  </div>
                  <div className="quad-metric">
                    <span className="quad-metric-num">{assignmentSummary.completed ?? verificationSummary.completed ?? 0}</span>
                    <span className="quad-metric-lbl">Completed Verifications</span>
                  </div>
                  <div className="quad-metric">
                    <span className="quad-metric-num">{assignmentSummary.total ?? (workload + (verificationSummary.completed || 0))}</span>
                    <span className="quad-metric-lbl">Total Tasks Dispatched</span>
                  </div>
                  <div className="quad-metric">
                    <span className="quad-metric-num text-green">
                      {maxCap > 0 ? `${Math.max(0, maxCap - workload)}` : '0'}
                    </span>
                    <span className="quad-metric-lbl">Available Slots</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="drawer-assignments-view">
              <div className="drawer-view-header">
                <div>
                  <h4 className="drawer-box-title" style={{ margin: 0 }}>Recent Field Assignments</h4>
                  <p className="drawer-box-subtext">Recent dispatch tasks assigned to {currentOfficer.name}</p>
                </div>
                <Link
                  to={`/assignments?search=${encodeURIComponent(currentOfficer.name)}`}
                  className="drawer-view-all-link"
                >
                  View in Assignments Workspace →
                </Link>
              </div>

              {isLoading ? (
                <div className="drawer-loading-state">Loading assignment activity...</div>
              ) : recentAssignments.length === 0 ? (
                <div className="drawer-empty-state">
                  <span className="drawer-empty-icon">📋</span>
                  <div className="drawer-empty-title">No Recent Assignments</div>
                  <div className="drawer-empty-desc">
                    This officer currently has no active or recent complaint tasks dispatched in the system.
                  </div>
                </div>
              ) : (
                <div className="drawer-assignments-list">
                  {recentAssignments.map((asgn, idx) => {
                    const pred = asgn.predictionId || {};
                    return (
                      <div key={asgn._id || asgn.assignmentId || idx} className="drawer-assignment-card">
                        <div className="asgn-card-top">
                          <span className="asgn-id-tag">{asgn.assignmentId || `ASGN-${idx + 1}`}</span>
                          <span className={`asgn-status-pill status-${asgn.status?.toLowerCase() || 'assigned'}`}>
                            {asgn.status?.replace(/_/g, ' ') || 'AI ASSIGNED'}
                          </span>
                        </div>
                        <div className="asgn-complaint-name">
                          {pred.complaintType || asgn.complaintType || 'Civic Infrastructure Complaint'}
                        </div>
                        <div className="asgn-meta-grid">
                          <div>
                            <span className="meta-lbl">Risk Level:</span>
                            <span className={`meta-val risk-${pred.riskLevel?.toLowerCase() || 'medium'}`}>
                              {pred.riskLevel || 'MEDIUM'} (Score: {pred.riskScore ? (pred.riskScore * 100).toFixed(0) : '—'})
                            </span>
                          </div>
                          <div>
                            <span className="meta-lbl">Proximity Distance:</span>
                            <span className="meta-val mono-text">
                              {asgn.distanceKm !== undefined ? `${asgn.distanceKm.toFixed(2)} km` : 'Local Area'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="drawer-dispatch-view">
              <div className="drawer-card-box">
                <div className="dispatch-formula-tag">COMAI DISPATCH POLICY</div>
                <h4 className="drawer-box-title">Why & How Officers Are Selected</h4>
                <p className="drawer-box-subtext">
                  The COMAI dispatch engine automatically matches predicted civic problem candidates with field personnel using a scientifically balanced multi-criteria scoring algorithm:
                </p>

                <div className="weights-breakdown-card">
                  <div className="weight-row">
                    <div className="weight-title-wrap">
                      <span className="weight-dot weight-risk" />
                      <strong>Risk Severity Weight</strong>
                    </div>
                    <span className="weight-val">0.4 (40%)</span>
                  </div>
                  <p className="weight-desc">Prioritizes high-risk and critical predicted civic complaint zones.</p>

                  <div className="weight-row">
                    <div className="weight-title-wrap">
                      <span className="weight-dot weight-dist" />
                      <strong>Haversine Distance Weight</strong>
                    </div>
                    <span className="weight-val">0.3 (30%)</span>
                  </div>
                  <p className="weight-desc">Minimizes travel transit time between officer location and candidate centroid.</p>

                  <div className="weight-row">
                    <div className="weight-title-wrap">
                      <span className="weight-dot weight-load" />
                      <strong>Workload Balance Weight</strong>
                    </div>
                    <span className="weight-val">0.3 (30%)</span>
                  </div>
                  <p className="weight-desc">Balances dispatch across field workforce to prevent officer overload.</p>
                </div>
              </div>

              <div className="drawer-card-box">
                <h4 className="drawer-box-title">Eligibility Criteria for {currentOfficer.name}</h4>
                <ul className="dispatch-eligibility-list">
                  <li className={currentOfficer.active !== false ? 'check-pass' : 'check-fail'}>
                    <span className="check-icon">{currentOfficer.active !== false ? '✓' : '✕'}</span>
                    <span>Account Active in Dispatch Registry: <strong>{currentOfficer.active !== false ? 'YES' : 'NO'}</strong></span>
                  </li>
                  <li className={currentOfficer.availability === 'AVAILABLE' ? 'check-pass' : 'check-warn'}>
                    <span className="check-icon">{currentOfficer.availability === 'AVAILABLE' ? '✓' : '!'}</span>
                    <span>Availability Status: <strong>{currentOfficer.availability}</strong></span>
                  </li>
                  <li className={workload < maxCap ? 'check-pass' : 'check-fail'}>
                    <span className="check-icon">{workload < maxCap ? '✓' : '✕'}</span>
                    <span>Workload Capacity Check (<code>currentWorkload &lt; maxAssignments</code>): <strong>{workload} / {maxCap} ({workload < maxCap ? 'ELIGIBLE' : 'CAPACITY REACHED'})</strong></span>
                  </li>
                  <li className="check-pass">
                    <span className="check-icon">✓</span>
                    <span>Department Compatibility: <strong>{currentOfficer.department}</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="officer-drawer-footer">
          <div className="drawer-footer-links">
            <Link to="/assignments" className="drawer-quick-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>Assignments</span>
            </Link>
            <Link to="/verification" className="drawer-quick-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>Verification</span>
            </Link>
            <Link to="/risk-map" className="drawer-quick-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              <span>Risk Map</span>
            </Link>
          </div>

          <button
            type="button"
            className="drawer-close-action-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
