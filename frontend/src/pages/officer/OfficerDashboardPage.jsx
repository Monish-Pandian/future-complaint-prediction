import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import { renderAssignmentStatusBadge } from '../../components/assignments/AssignmentBadges';
import SubmitVerificationModal from '../../components/officer/SubmitVerificationModal';
import {
  getOfficerDashboard,
  acceptAssignment,
  startAssignment,
  submitOfficerVerification,
} from '../../api/officerPortalApi';

/**
 * Officer Dashboard: Operational Dispatch & Task Management
 * Urban Intelligence Command Center — Module 12
 */
export default function OfficerDashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [verifyingAssignment, setVerifyingAssignment] = useState(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOfficerDashboard();
      if (res?.data) {
        setDashboardData(res.data);
        setIsLive(Boolean(res.isLive));
      }
    } catch (err) {
      console.error('Failed to load officer dashboard:', err);
      setError('OFFICER DASHBOARD UNAVAILABLE');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleAccept = async (id) => {
    try {
      await acceptAssignment(id);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to accept assignment.');
    }
  };

  const handleStart = async (id) => {
    try {
      await startAssignment(id);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to start assignment.');
    }
  };

  const handleVerificationSubmit = async (payload) => {
    await submitOfficerVerification(payload);
    await loadDashboard();
  };

  const profile = dashboardData?.profile || {
    name: 'Officer Sanjay',
    officerId: 'OFF-SANJAY',
    department: 'Streets & Sanitation',
    currentWorkload: 2,
  };
  const stats = dashboardData?.stats || {
    assignedTasks: 2,
    pendingVerification: 1,
    verifiedToday: 3,
    highRiskPredictions: 1,
  };
  const assignments = dashboardData?.recentAssignments || [];

  return (
    <PageTransition>
      <div className="officer-portal-container">
        {/* Header Bar */}
        <header className="officer-header-card">
          <div>
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              MUNICIPAL FIELD DISPATCH
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)' }}>
              Welcome, {profile.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span className="officer-profile-badge">{profile.department}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                Badge: {profile.officerId}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`verification-mode-pill ${isLive ? 'live' : 'demo'}`}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isLive ? '#4dd6a8' : '#ecd06f',
                }}
              />
              {isLive ? 'Real API Data' : 'Demo Data'}
            </span>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div style={{ padding: '14px 18px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#ff6b6b', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        {/* Top KPIs */}
        <section className="verification-kpis-grid" aria-label="Officer KPIs">
          <KpiCard
            label="ASSIGNED TASKS"
            value={stats.assignedTasks ?? assignments.length}
            supportingText="Active verification queue"
            status="info"
          />
          <KpiCard
            label="PENDING VERIFICATION"
            value={stats.pendingVerification ?? 1}
            supportingText="Requires on-site inspection"
            status="warning"
          />
          <KpiCard
            label="VERIFIED TODAY"
            value={stats.verifiedToday ?? 3}
            supportingText="Completed field observations"
            status="success"
          />
          <KpiCard
            label="HIGH RISK FORECASTS"
            value={stats.highRiskPredictions ?? 1}
            supportingText="Priority risk escalation targets"
            status="info"
          />
        </section>

        {/* Assigned Tasks Section */}
        <div className="verification-table-card">
          <div className="verification-table-header">
            <div className="verification-table-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1"></rect>
                <path d="M9 12h6M9 16h4"></path>
              </svg>
              Active Assigned Complaints & Inspection Tasks
            </div>
            <div className="verification-table-count">
              {assignments.length} tasks in queue
            </div>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isLoading ? (
              <div>Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active tasks assigned to your officer profile.
              </div>
            ) : (
              assignments.map((asgn) => {
                const pred = asgn.prediction || {};
                return (
                  <div key={asgn.id || asgn.assignmentId} className="officer-task-card">
                    <div className="officer-task-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#10b981', fontSize: '13px' }}>
                            {asgn.assignmentId || asgn.id}
                          </span>
                          {renderAssignmentStatusBadge(asgn.status)}
                          {renderRiskBadge(pred.riskLevel || 'LOW')}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {pred.complaintType}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#ffd166' }}>
                        Distance: {asgn.distanceKm ?? 1.5} km
                      </span>
                    </div>

                    <div className="officer-task-body">
                      <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LOCATION</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {pred.address || pred.communityArea || 'Chicago Sector'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>WARD / AREA</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {pred.ward || 'Ward 1'} &bull; {pred.communityArea || 'Central'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FORECAST RISK SCORE</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                          {pred.riskScore ?? 75}/100
                        </div>
                      </div>
                    </div>

                    <div className="officer-task-actions">
                      {asgn.status === 'AI_ASSIGNED' && (
                        <button
                          type="button"
                          className="verification-btn verification-btn-primary"
                          onClick={() => handleAccept(asgn.id || asgn._id || asgn.assignmentId)}
                        >
                          Accept Dispatch
                        </button>
                      )}

                      {asgn.status === 'ACCEPTED' && (
                        <button
                          type="button"
                          className="verification-btn verification-btn-primary"
                          onClick={() => handleStart(asgn.id || asgn._id || asgn.assignmentId)}
                        >
                          Start Field Task
                        </button>
                      )}

                      {asgn.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          className="verification-btn verification-btn-primary"
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                          onClick={() => setVerifyingAssignment(asgn)}
                        >
                          ✓ Submit Field Verification
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Verification Modal */}
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
