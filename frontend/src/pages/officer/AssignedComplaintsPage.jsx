import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import { renderAssignmentStatusBadge, renderCandidateStatusBadge, renderSelectionTypeBadge } from '../../components/assignments/AssignmentBadges';
import SubmitVerificationModal from '../../components/officer/SubmitVerificationModal';
import {
  getMyAssignments,
  getOfficerVerificationCandidates,
  acceptAssignment,
  startAssignment,
  acceptVerificationCandidate,
  rejectVerificationCandidate,
  submitOfficerVerification,
} from '../../api/officerPortalApi';

/**
 * Officer Task Queue: Assigned Complaints & Verification Tasks
 * Urban Intelligence Command Center — Module 12
 */
export default function AssignedComplaintsPage() {
  const [assignments, setAssignments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isLiveCandidates, setIsLiveCandidates] = useState(false);
  const [verifyingAssignment, setVerifyingAssignment] = useState(null);
  const [verifyingCandidate, setVerifyingCandidate] = useState(null);
  const [candidateError, setCandidateError] = useState(null);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMyAssignments();
      if (res?.data) {
        setAssignments(res.data);
        setIsLive(Boolean(res.isLive));
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    setCandidateError(null);
    try {
      const res = await getOfficerVerificationCandidates({ status: 'ASSIGNED,VERIFICATION_SUBMITTED' });
      if (res?.data) {
        setCandidates(res.data.candidates || res.data);
        setIsLiveCandidates(Boolean(res.isLive));
      }
    } catch (err) {
      console.error('Failed to load verification candidates:', err);
      setCandidateError(err.message || 'Failed to load verification candidates');
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (activeTab === 'VERIFICATION_CANDIDATES') {
      loadCandidates();
    }
  }, [activeTab, loadCandidates]);

  const handleAccept = async (id) => {
    try {
      await acceptAssignment(id);
      await loadAssignments();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to accept.');
    }
  };

  const handleStart = async (id) => {
    try {
      await startAssignment(id);
      await loadAssignments();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to start.');
    }
  };

  const handleVerificationSubmit = async (payload) => {
    await submitOfficerVerification(payload);
    await loadAssignments();
  };

  const handleAcceptCandidate = async (candidateId) => {
    try {
      await acceptVerificationCandidate(candidateId);
      await loadCandidates();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to accept candidate.');
    }
  };

  const handleRejectCandidate = async (candidateId) => {
    if (!confirm('Reject this verification candidate? This will cancel the candidate assignment.')) {
      return;
    }
    try {
      await rejectVerificationCandidate(candidateId, { reason: 'Officer rejected' });
      await loadCandidates();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reject candidate.');
    }
  };

  const handleCandidateVerificationSubmit = async (payload) => {
    // The payload already includes candidateId if it's a candidate
    await submitOfficerVerification(payload);
    await loadCandidates();
  };

  // Filtering
  let filteredAssignments = [...assignments];
  if (activeTab !== 'ALL' && activeTab !== 'VERIFICATION_CANDIDATES') {
    filteredAssignments = filteredAssignments.filter((a) => (a.status || '').toUpperCase() === activeTab);
  }
  if (search.trim() && activeTab !== 'VERIFICATION_CANDIDATES') {
    const q = search.trim().toLowerCase();
    filteredAssignments = filteredAssignments.filter(
      (a) =>
        (a.assignmentId || a.id || '').toLowerCase().includes(q) ||
        (a.prediction?.complaintType || '').toLowerCase().includes(q) ||
        (a.prediction?.communityArea || '').toLowerCase().includes(q)
    );
  }

  let filteredCandidates = [...candidates];
  if (search.trim() && activeTab === 'VERIFICATION_CANDIDATES') {
    const q = search.trim().toLowerCase();
    filteredCandidates = filteredCandidates.filter(
      (c) =>
        (c.candidateId || c.id || '').toLowerCase().includes(q) ||
        (c.prediction?.complaintType || '').toLowerCase().includes(q) ||
        (c.prediction?.communityArea || '').toLowerCase().includes(q) ||
        (c.selectionType || '').toLowerCase().includes(q)
    );
  }

  return (
    <PageTransition>
      <div className="officer-portal-container">
        {/* Header Bar */}
        <header className="stitch-card mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="stitch-badge stitch-badge-emerald font-mono">FIELD OPERATIONAL DEPLOYMENT</span>
              <span className="stitch-badge stitch-badge-slate font-mono">MUNICIPAL DISPATCH</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Field Inspection & Verification Queue
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Execute field inspections dispatched by AI routing. Track assignment lifecycle from acceptance through ground truth verification.
            </p>
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

        {/* Filter / Search Card */}
        <div className="stitch-card mb-6" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Tasks', count: assignments.length },
                { id: 'AI_ASSIGNED', label: 'Pending Acceptance', count: assignments.filter(a => a.status === 'AI_ASSIGNED').length },
                { id: 'ACCEPTED', label: 'Accepted', count: assignments.filter(a => a.status === 'ACCEPTED').length },
                { id: 'IN_PROGRESS', label: 'In Progress', count: assignments.filter(a => a.status === 'IN_PROGRESS').length },
                { id: 'COMPLETED', label: 'Completed', count: assignments.filter(a => a.status === 'COMPLETED').length },
                { id: 'VERIFICATION_CANDIDATES', label: 'Verification Candidates', count: candidates.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`stitch-btn ${activeTab === tab.id ? 'stitch-btn-primary' : 'stitch-btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '6px 14px' }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{ 
                      marginLeft: '6px', 
                      background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-hover)', 
                      padding: '1px 6px', 
                      borderRadius: '10px',
                      fontSize: '10px'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Search */}
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                className="verification-search-input"
                placeholder="Search tasks by type, area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
{/*
            Task Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTab === 'VERIFICATION_CANDIDATES' ? (
              // Verification Candidates Rendering
              isLoadingCandidates ? (
                <div>Loading verification candidates...</div>
              ) : candidateError ? (
                <div className="verification-table-card" style={{ padding: '48px', textAlign: 'center', color: '#ff6b6b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Failed to Load Candidates
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      {candidateError}
                    </p>
                    <button
                      type="button"
                      className="verification-btn verification-btn-primary"
                      onClick={loadCandidates}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="verification-table-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No verification candidates match the selected filters.
                </div>
              ) : (
                filteredCandidates.map((cand) => {
                  const pred = cand.prediction || {};
                  return (
                    <div key={cand.id || cand.candidateId} className="stitch-card p-5" style={{ transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#10b981', fontSize: '13px' }}>
                              {cand.candidateId || cand.id}
                            </span>
                            {renderCandidateStatusBadge(cand.status)}
                            {renderSelectionTypeBadge(cand.selectionType)}
                            {renderRiskBadge(pred.riskLevel || 'LOW')}
                          </div>
                          <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                            {pred.complaintType}
                          </div>
                        </div>
                        <span className="stitch-badge stitch-badge-amber font-mono" style={{ fontSize: '12px' }}>
                          Selection Rank #{cand.selectionRank || '1'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px', background: 'var(--bg-surface-hover)', padding: '12px 14px', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>TARGET GEOMETRY</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {pred.address || pred.communityArea || 'Chicago Sector'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>WARD / SECTOR</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {pred.ward || 'Ward 1'} &bull; {pred.communityArea || 'Central'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>PREDICTED RISK</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                            {pred.riskScore ?? 75}/100
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>ML PROBABILITY</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                            {((pred.probability ?? 0.75) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>DEPARTMENT</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {pred.department || 'Municipal Operations'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                        {cand.status === 'ASSIGNED' && (
                          <>
                            <button
                              type="button"
                              className="stitch-btn stitch-btn-primary"
                              style={{ fontSize: '12px', padding: '8px 16px' }}
                              onClick={() => handleAcceptCandidate(cand.id || cand._id || cand.candidateId)}
                            >
                              Accept Candidate
                            </button>
                            <button
                              type="button"
                              className="stitch-btn stitch-btn-secondary"
                              style={{ fontSize: '12px', padding: '8px 16px' }}
                              onClick={() => handleRejectCandidate(cand.id || cand._id || cand.candidateId)}
                            >
                              Reject Candidate
                            </button>
                          </>
                        )}

                        {cand.status === 'VERIFICATION_SUBMITTED' && (
                          <button
                            type="button"
                            className="stitch-btn stitch-btn-primary"
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontSize: '12px', padding: '8px 16px' }}
                            onClick={() => setVerifyingCandidate(cand)}
                          >
                            ✓ Submit Field Verification
                          </button>
                        )}

                        {cand.status === 'COMPLETED' && (
                          <span className="stitch-badge stitch-badge-emerald font-mono">
                            ✓ Verification Submitted
                          </span>
                        )}

                        {cand.status === 'CANCELLED' && (
                          <span className="stitch-badge stitch-badge-rose font-mono">
                            ✗ Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // Assignment Rendering
              isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading task queue...</div>
              ) : filteredAssignments.length === 0 ? (
                <div className="stitch-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No assigned tasks match the selected status or search filter.
                </div>
              ) : (
                filteredAssignments.map((asgn) => {
                  const pred = asgn.prediction || {};
                  return (
                    <div key={asgn.id || asgn.assignmentId} className="stitch-card p-5" style={{ transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#10b981', fontSize: '13px' }}>
                              {asgn.assignmentId || asgn.id}
                            </span>
                            {renderAssignmentStatusBadge(asgn.status)}
                            {renderRiskBadge(pred.riskLevel || 'LOW')}
                          </div>
                          <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                            {pred.complaintType}
                          </div>
                        </div>
                        <span className="stitch-badge stitch-badge-cyan font-mono" style={{ fontSize: '12px' }}>
                          Distance: {asgn.distanceKm ?? 1.5} km
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px', background: 'var(--bg-surface-hover)', padding: '12px 14px', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>LOCATION</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {pred.address || pred.communityArea || 'Chicago Sector'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>WARD / SECTOR</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {pred.ward || 'Ward 1'} &bull; {pred.communityArea || 'Central'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>FORECAST RISK SCORE</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                            {pred.riskScore ?? 75}/100
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                        {asgn.status === 'AI_ASSIGNED' && (
                          <button
                            type="button"
                            className="stitch-btn stitch-btn-primary"
                            style={{ fontSize: '12px', padding: '8px 16px' }}
                            onClick={() => handleAccept(asgn.id || asgn._id || asgn.assignmentId)}
                          >
                            Accept Dispatch
                          </button>
                        )}

                        {asgn.status === 'ACCEPTED' && (
                          <button
                            type="button"
                            className="stitch-btn stitch-btn-primary"
                            style={{ fontSize: '12px', padding: '8px 16px' }}
                            onClick={() => handleStart(asgn.id || asgn._id || asgn.assignmentId)}
                          >
                            Start Field Task
                          </button>
                        )}

                        {asgn.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            className="stitch-btn stitch-btn-primary"
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontSize: '12px', padding: '8px 16px' }}
                            onClick={() => setVerifyingAssignment(asgn)}
                          >
                            ✓ Submit Field Verification
                          </button>
                        )}

                        {asgn.status === 'COMPLETED' && (
                          <span className="stitch-badge stitch-badge-emerald font-mono">
                            ✓ Verification Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

        {/* Verification Modal */}
        <SubmitVerificationModal
          isOpen={Boolean(verifyingAssignment)}
          task={verifyingAssignment}
          onClose={() => setVerifyingAssignment(null)}
          onSubmit={handleVerificationSubmit}
        />
        <SubmitVerificationModal
          isOpen={Boolean(verifyingCandidate)}
          task={verifyingCandidate}
          onClose={() => setVerifyingCandidate(null)}
          onSubmit={handleCandidateVerificationSubmit}
        />
      </div>
    </PageTransition>
  );
}
