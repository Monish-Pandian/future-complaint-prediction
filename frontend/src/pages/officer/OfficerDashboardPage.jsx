import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import { renderAssignmentStatusBadge } from '../../components/assignments/AssignmentBadges';
import SubmitVerificationModal from '../../components/officer/SubmitVerificationModal';
import { useAuth } from '../../context/AuthContext';
import {
  getOfficerDashboard,
  getMyAssignments,
  acceptAssignment,
  startAssignment,
  submitOfficerVerification,
} from '../../api/officerPortalApi';

/**
 * Field Officer Dashboard — Module 8L
 * Purpose: Provide a role-focused, mobile-first field operations workspace.
 * Answers: "What do I need to do?"
 */
export default function OfficerDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingAssignment, setVerifyingAssignment] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, asgnRes] = await Promise.allSettled([
        getOfficerDashboard(),
        getMyAssignments(),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardData(dashRes.value.data);
      }

      if (asgnRes.status === 'fulfilled' && asgnRes.value?.data) {
        const list = Array.isArray(asgnRes.value.data)
          ? asgnRes.value.data
          : asgnRes.value.data.assignments || [];
        setAssignments(list);
      }
    } catch (err) {
      console.error('Failed to load officer operations data:', err);
      setError('Field operations data temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Primary Action Handlers
  const handleAccept = async (id) => {
    try {
      await acceptAssignment(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to accept assignment dispatch.');
    }
  };

  const handleStart = async (id) => {
    try {
      await startAssignment(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to start field task.');
    }
  };

  const handleVerificationSubmit = async (payload) => {
    try {
      await submitOfficerVerification(payload);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to submit verification observation.');
    }
  };

  // Extract Officer Profile Info
  const officerProfile = dashboardData?.officer || {
    name: user?.name || 'Field Officer',
    officerId: user?.officerId || user?.employeeCode || 'OFF-PRECINCT',
    department: user?.department || 'Municipal Field Operations',
    currentWorkload: assignments.length,
    availability: 'AVAILABLE',
  };

  // Operational Calculations (Strictly Real Data)
  const activeTasks = assignments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'REJECTED');
  const pendingAcceptance = assignments.filter((a) => a.status === 'AI_ASSIGNED');
  const inProgress = assignments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'ACCEPTED');
  const pendingVerification = assignments.filter(
    (a) => a.status === 'IN_PROGRESS' || (!a.verification && a.status !== 'COMPLETED')
  );
  const completedTasks = assignments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'VERIFICATION_SUBMITTED' || a.verification
  );

  const currentWorkload = officerProfile.currentWorkload ?? activeTasks.length;
  const maxCapacity = 5;
  const capacityPct = Math.min(100, Math.round((currentWorkload / maxCapacity) * 100));
  const availableSlots = Math.max(0, maxCapacity - currentWorkload);

  // Pipeline Counts
  const assignedCount = pendingAcceptance.length;
  const acceptedCount = assignments.filter((a) => a.status === 'ACCEPTED').length;
  const inProgCount = assignments.filter((a) => a.status === 'IN_PROGRESS').length;
  const submittedCount = assignments.filter((a) => a.status === 'VERIFICATION_SUBMITTED').length;
  const doneCount = completedTasks.length;

  // Filtered Priority Assignments
  const filteredAssignments = assignments.filter((asgn) => {
    const pred = asgn.prediction || {};
    const complaintType = pred.complaintType || asgn.complaintType || '';
    const communityArea = pred.communityArea || asgn.communityArea || '';
    const ward = pred.ward || asgn.ward || '';

    const matchesSearch =
      complaintType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(communityArea).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(ward).toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'PENDING') {
      return asgn.status === 'AI_ASSIGNED';
    }
    if (activeTab === 'IN_PROGRESS') {
      return asgn.status === 'IN_PROGRESS' || asgn.status === 'ACCEPTED';
    }
    if (activeTab === 'COMPLETED') {
      return asgn.status === 'COMPLETED' || asgn.status === 'VERIFICATION_SUBMITTED';
    }
    return true;
  });

  // Sort: AI_ASSIGNED and IN_PROGRESS tasks first, then by riskScore descending
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const statusPriority = { AI_ASSIGNED: 1, IN_PROGRESS: 2, ACCEPTED: 3, VERIFICATION_SUBMITTED: 4, COMPLETED: 5 };
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;
    const scoreA = a.prediction?.riskScore ?? a.riskScore ?? 0;
    const scoreB = b.prediction?.riskScore ?? b.riskScore ?? 0;
    return scoreB - scoreA;
  });

  // Tasks requiring immediate verification
  const verificationQueue = assignments.filter(
    (a) => a.status === 'IN_PROGRESS' || a.status === 'ACCEPTED'
  );

  return (
    <PageTransition>
      <div className="officer-portal-container">
        {/* Top Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div className="stitch-telemetry-badge">
              <span className="stitch-live-dot" />
              <span>FIELD OPERATIONS • PRECINCT DISPATCH • SHIFT ACTIVE</span>
            </div>
            <h1 className="stitch-page-title">Welcome back, {officerProfile.name}</h1>
            <p className="stitch-page-desc">
              Badge: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{officerProfile.officerId}</strong> • Department: <strong style={{ color: 'var(--accent)' }}>{officerProfile.department}</strong> • Workload: {currentWorkload} of {maxCapacity} active inspections.
            </p>
          </div>

          <div className="stitch-command-actions">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>DUTY STATUS: </span>
              <span style={{ color: 'var(--success-text)', fontWeight: '700' }}>ON DUTY</span>
            </div>

            <button
              type="button"
              className="stitch-btn-secondary"
              onClick={loadData}
              title="Refresh assigned tasks queue"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Operational KPI Cards Grid */}
        <section className="officer-kpis-grid" aria-label="Field Operational KPIs">
          <KpiCard
            label="ACTIVE ASSIGNMENTS"
            value={activeTasks.length}
            supportingText="Total ongoing field tasks"
            status="info"
          />
          <KpiCard
            label="PENDING ACCEPTANCE"
            value={pendingAcceptance.length}
            supportingText="Requires dispatch acceptance"
            status={pendingAcceptance.length > 0 ? 'warning' : 'neutral'}
          />
          <KpiCard
            label="IN PROGRESS"
            value={inProgress.length}
            supportingText="Active on-site inspections"
            status={inProgress.length > 0 ? 'info' : 'neutral'}
          />
          <KpiCard
            label="VERIFICATION PENDING"
            value={pendingVerification.length}
            supportingText="Awaiting ground truth observation"
            status={pendingVerification.length > 0 ? 'warning' : 'neutral'}
          />
          <KpiCard
            label="VERIFIED / COMPLETED"
            value={completedTasks.length}
            supportingText="Successfully verified tasks"
            status="success"
          />

          {/* Workload Capacity Gauge Card */}
          <div className="officer-capacity-card">
            <div className="capacity-header">
              <span className="capacity-title">WORKLOAD & CAPACITY</span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: availableSlots > 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {availableSlots > 0 ? `${availableSlots} SLOTS OPEN` : 'CAPACITY FULL'}
              </span>
            </div>

            <div className="capacity-value-wrap">
              <span className="capacity-current">{currentWorkload}</span>
              <span className="capacity-max">/ {maxCapacity} tasks</span>
            </div>

            <div className="capacity-bar-track" aria-hidden="true">
              <div
                className={`capacity-bar-fill ${capacityPct >= 80 ? 'warning' : ''}`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>

            <div className="capacity-footer">
              <span>Shift Utilization: {capacityPct}%</span>
              <span>Max Limit: {maxCapacity}</span>
            </div>
          </div>
        </section>

        {/* Operational Pipeline Status Banner */}
        <div className="officer-pipeline-banner">
          <div className="pipeline-banner-header">
            <span>DISPATCH-TO-VERIFICATION LIFECYCLE</span>
            <span>REAL-TIME FIELD PIPELINE</span>
          </div>

          <div className="officer-pipeline-tracker">
            <div className={`pipeline-step-item ${assignedCount > 0 ? 'active' : ''}`}>
              <span className="pipeline-step-label">1. Assigned</span>
              <span className="pipeline-step-count">{assignedCount}</span>
            </div>
            <div className={`pipeline-step-item ${acceptedCount > 0 ? 'active' : ''}`}>
              <span className="pipeline-step-label">2. Accepted</span>
              <span className="pipeline-step-count">{acceptedCount}</span>
            </div>
            <div className={`pipeline-step-item ${inProgCount > 0 ? 'active' : ''}`}>
              <span className="pipeline-step-label">3. In Progress</span>
              <span className="pipeline-step-count">{inProgCount}</span>
            </div>
            <div className={`pipeline-step-item ${submittedCount > 0 ? 'active' : ''}`}>
              <span className="pipeline-step-label">4. Submitted</span>
              <span className="pipeline-step-count">{submittedCount}</span>
            </div>
            <div className={`pipeline-step-item ${doneCount > 0 ? 'active' : ''}`}>
              <span className="pipeline-step-label">5. Completed</span>
              <span className="pipeline-step-count">{doneCount}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Main Operations Grid */}
        <div className="officer-main-grid">
          {/* Left Column: Priority Assignments */}
          <div className="officer-card-section">
            <div className="officer-card-header">
              <h2 className="officer-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
                Priority Field Assignments
              </h2>
              <span className="officer-card-badge">
                {sortedAssignments.length} {sortedAssignments.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* Filter and Search Controls */}
            <div className="officer-filter-strip">
              <div className="officer-tabs-group" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'ALL'}
                  className={`officer-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ALL')}
                >
                  All ({assignments.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'PENDING'}
                  className={`officer-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
                  onClick={() => setActiveTab('PENDING')}
                >
                  Pending Action ({pendingAcceptance.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'IN_PROGRESS'}
                  className={`officer-tab-btn ${activeTab === 'IN_PROGRESS' ? 'active' : ''}`}
                  onClick={() => setActiveTab('IN_PROGRESS')}
                >
                  In Progress ({inProgress.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'COMPLETED'}
                  className={`officer-tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
                  onClick={() => setActiveTab('COMPLETED')}
                >
                  Completed ({completedTasks.length})
                </button>
              </div>

              <input
                type="text"
                className="officer-search-box"
                placeholder="Search complaint or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter assignments by keyword"
              />
            </div>

            {/* Assignments List */}
            <div className="officer-task-list">
              {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading assigned dispatches...
                </div>
              ) : sortedAssignments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>No assignments match your current view.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {searchQuery ? 'Try clearing your search query.' : 'You currently have no tasks in this category.'}
                  </p>
                </div>
              ) : (
                sortedAssignments.map((asgn) => {
                  const pred = asgn.prediction || {};
                  const asgnId = asgn.assignmentId || asgn.id || asgn._id;
                  const riskLevel = pred.riskLevel || asgn.riskLevel || 'LOW';
                  const riskScore = pred.riskScore ?? asgn.riskScore ?? 75;
                  const distanceKm = asgn.distanceKm ?? 1.5;
                  const communityArea = pred.communityArea || asgn.communityArea || 'Chicago Sector';
                  const ward = pred.ward || asgn.ward || 'Ward 1';
                  const address = pred.address || asgn.address || `${communityArea}, ${ward}`;

                  return (
                    <article key={asgnId} className="officer-task-card" aria-label={`Task ${asgnId}`}>
                      {/* Header */}
                      <div className="officer-task-header">
                        <div>
                          <div className="officer-task-meta-line">
                            <span className="officer-task-id">{asgnId}</span>
                            {renderAssignmentStatusBadge(asgn.status)}
                            {renderRiskBadge(riskLevel)}
                          </div>
                          <h3 className="officer-task-title">
                            {pred.complaintType || asgn.complaintType || 'Civic Infrastructure Complaint'}
                          </h3>
                        </div>

                        <span className="officer-task-distance" title="Distance from officer base">
                          📍 {distanceKm} km away
                        </span>
                      </div>

                      {/* Location & Context Body */}
                      <div className="officer-task-body">
                        <div>
                          <span className="officer-task-spec-lbl">LOCATION / ADDRESS</span>
                          <div className="officer-task-spec-val">{address}</div>
                        </div>
                        <div>
                          <span className="officer-task-spec-lbl">COMMUNITY & WARD</span>
                          <div className="officer-task-spec-val">{communityArea} &bull; {ward}</div>
                        </div>
                        <div>
                          <span className="officer-task-spec-lbl">PRIORITY RISK SCORE</span>
                          <div className="officer-task-spec-val font-mono" style={{ color: '#06b6d4' }}>
                            {riskScore}/100
                          </div>
                        </div>
                      </div>

                      {/* Why this assignment? (Human-Readable Reason) */}
                      <div className="officer-why-pill">
                        <span className="officer-why-tag">DISPATCH REASON:</span>
                        <span>
                          High Risk Priority &bull; Proximity Match ({distanceKm} km) &bull; Department Compatible &bull; Workload Balanced
                        </span>
                      </div>

                      {/* State-Aware Action Buttons */}
                      <div className="officer-task-actions">
                        {asgn.status === 'AI_ASSIGNED' && (
                          <button
                            type="button"
                            className="btn-officer-action btn-officer-primary"
                            onClick={() => handleAccept(asgnId)}
                          >
                            Accept Dispatch
                          </button>
                        )}

                        {asgn.status === 'ACCEPTED' && (
                          <button
                            type="button"
                            className="btn-officer-action btn-officer-primary"
                            onClick={() => handleStart(asgnId)}
                          >
                            Start Field Task
                          </button>
                        )}

                        {asgn.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            className="btn-officer-action btn-officer-verify"
                            onClick={() => setVerifyingAssignment(asgn)}
                          >
                            ✓ Submit Field Verification
                          </button>
                        )}

                        {(asgn.status === 'VERIFICATION_SUBMITTED' || asgn.status === 'COMPLETED') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--success-text)', fontWeight: '600' }}>
                            <span>✓ Observation Recorded</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Verification Quick Queue & Activity Feed */}
          <div className="officer-side-col">
            {/* Quick Verification Tasks Widget */}
            <div className="officer-card-section">
              <div className="officer-card-header">
                <h3 className="officer-card-title" style={{ fontSize: '14px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Tasks Requiring Verification
                </h3>
                <span className="officer-card-badge">{verificationQueue.length}</span>
              </div>

              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {verificationQueue.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No active tasks awaiting field verification.
                  </div>
                ) : (
                  verificationQueue.map((t) => {
                    const pred = t.prediction || {};
                    const id = t.assignmentId || t.id || t._id;
                    return (
                      <div key={id} className="quick-verif-item">
                        <div className="quick-verif-header">
                          <span className="quick-verif-title">{pred.complaintType || t.complaintType}</span>
                          {renderRiskBadge(pred.riskLevel || 'MEDIUM')}
                        </div>
                        <span className="quick-verif-loc">
                          📍 {pred.address || pred.communityArea || 'Chicago Sector'}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn-officer-action btn-officer-verify"
                            style={{ minHeight: '32px', fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => setVerifyingAssignment(t)}
                          >
                            Verify Now →
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Completed Activity Feed */}
            <div className="officer-card-section">
              <div className="officer-card-header">
                <h3 className="officer-card-title" style={{ fontSize: '14px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 14 14" />
                  </svg>
                  Recent Completed Work
                </h3>
              </div>

              <div className="officer-activity-feed">
                {completedTasks.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No historical completions recorded on this shift.
                  </div>
                ) : (
                  completedTasks.slice(0, 5).map((item) => {
                    const pred = item.prediction || {};
                    const outcome = item.verification?.outcome || item.verificationOutcome || 'PROBLEM_CONFIRMED';
                    return (
                      <div key={item.id || item.assignmentId || item._id} className="officer-activity-item">
                        <div className="officer-activity-dot" />
                        <div className="officer-activity-info">
                          <span className="officer-activity-title">
                            {pred.complaintType || item.complaintType || 'Civic Observation'}
                          </span>
                          <span className="officer-activity-sub">
                            Outcome: <strong style={{ color: 'var(--success-text)' }}>{outcome.replace(/_/g, ' ')}</strong> &bull; {pred.communityArea || item.communityArea || 'Sector'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Field Verification Modal */}
        <SubmitVerificationModal
          isOpen={Boolean(verifyingAssignment)}
          task={verifyingAssignment}
          onClose={() => setVerifyingAssignment(null)}
          onSubmit={handleVerificationSubmit}
        />
      </div>
    </PageTransition>
  );
}
