import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  renderAssignmentStatusBadge,
  renderMatchScorePill,
  renderMiniWorkload,
} from './AssignmentBadges';
import { RiskBadge } from '../common/Badge';
import { renderVerificationBadge } from '../predictions/PredictionBadges';
import Button from '../common/Button';

/**
 * AssignmentDetailDrawer: Slide-over drawer presenting complete assignment intelligence,
 * algorithmic dispatch justification ("Why This Officer?"), officer workload, and operational links.
 */
export default function AssignmentDetailDrawer({ assignment, onClose }) {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!assignment) return null;

  const pred = assignment.prediction || {};
  const officer = assignment.officer || {};
  const verif = assignment.verification || {};
  const score = typeof pred.riskScore === 'number' ? pred.riskScore.toFixed(1) : pred.riskScore || '—';
  const prob = typeof pred.probability === 'number' ? `${(pred.probability * 100).toFixed(1)}%` : '—';
  const dist = typeof assignment.distanceKm === 'number'
    ? `${assignment.distanceKm.toFixed(1)} km`
    : assignment.distanceKm ? `${assignment.distanceKm} km` : 'Distance unavailable';

  const workloadNum = assignment.currentWorkload ?? officer.currentWorkload ?? 0;
  const isDeptMatch = assignment.departmentMatch !== false;

  return (
    <div className="asgn-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="asgn-drawer-title">
      <div className="asgn-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="asgn-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span id="asgn-drawer-title" className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-text)' }}>
                {assignment.assignmentId}
              </span>
              {renderAssignmentStatusBadge(assignment.status)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Assigned: {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
          <button
            type="button"
            className="asgn-drawer-close"
            onClick={onClose}
            aria-label="Close detail drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="asgn-drawer-content">
          {/* SECTION 1: PREDICTION INTELLIGENCE */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              1. Prediction Intelligence
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Complaint Type</span>
                <span className="asgn-detail-val" style={{ color: 'var(--accent-text)', fontWeight: '600' }}>
                  {pred.complaintType || 'Civic Infrastructure'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Prediction Ref</span>
                <span className="asgn-detail-val font-mono">
                  {pred.predictionId || 'N/A'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Risk Priority</span>
                <div><RiskBadge level={pred.riskLevel || 'LOW'} /></div>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Probability / Score</span>
                <span className="asgn-detail-val font-mono">
                  {prob} (Score: {score} / 100)
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Community Area</span>
                <span className="asgn-detail-val">{pred.communityArea || 'Chicago Central'}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Ward</span>
                <span className="asgn-detail-val">{pred.ward ? (pred.ward.startsWith('Ward') ? pred.ward : `Ward ${pred.ward}`) : 'Ward 1'}</span>
              </div>
              <div className="asgn-detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="asgn-detail-label">Geographic Centroid</span>
                <span className="asgn-detail-val font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {pred.location?.lat?.toFixed(4)}, {pred.location?.lng?.toFixed(4)} ({pred.location?.address || `${pred.communityArea || 'Chicago'}, IL`})
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: WHY THIS OFFICER? (DISPATCH JUSTIFICATION) */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              2. Why This Officer? (Dispatch Assessment)
            </div>

            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Risk Priority (40%)</span>
                <span className="asgn-detail-val font-mono" style={{ color: 'var(--text-primary)' }}>
                  {pred.riskLevel || 'LOW'} (Score {score})
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Distance (30%)</span>
                <span className="asgn-detail-val font-mono">
                  {dist}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Workload (30%)</span>
                <span className="asgn-detail-val font-mono">
                  {workloadNum} / 5 tasks
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Dept Compatibility</span>
                <span className="asgn-detail-val font-mono" style={{ color: isDeptMatch ? 'var(--success)' : 'var(--warning)' }}>
                  {isDeptMatch ? '✓ Direct Match' : '⚠ Cross-Department'}
                </span>
              </div>
            </div>

            <div className="asgn-reason-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px', fontSize: '11.5px' }}>
                Algorithmic Justification:
              </strong>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                {assignment.reasoning || `Selected because officer ${officer.name || 'on duty'} is ${isDeptMatch ? 'department-compatible' : 'qualified'}, within proximity (${dist}), and has available capacity (${workloadNum}/5) while serving a ${pred.riskLevel || 'standard'} priority prediction.`}
              </p>
            </div>
          </div>

          {/* SECTION 3: ASSIGNED OFFICER WORKLOAD & PROFILE */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              3. Assigned Officer Context
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Officer Name</span>
                <span className="asgn-detail-val" style={{ fontWeight: '600' }}>{officer.name || 'Unassigned'}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Officer ID / Code</span>
                <span className="asgn-detail-val font-mono">
                  {officer.officerId || officer.employeeCode || 'OFF-N/A'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Department</span>
                <span className="asgn-detail-val">{officer.department || assignment.department || 'Municipal Operations'}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Current Workload</span>
                <div>{renderMiniWorkload(workloadNum, 5)}</div>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Availability</span>
                <span className="asgn-detail-val font-mono" style={{ color: 'var(--success)' }}>
                  {officer.availability || assignment.availability || 'AVAILABLE'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Dispatch Phone</span>
                <span className="asgn-detail-val font-mono" style={{ fontSize: '11.5px' }}>
                  {officer.phone || '+1-312-555-0100'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: FIELD VERIFICATION LIFECYCLE */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              4. Field Verification Lifecycle
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Verification Status</span>
                <div>{renderVerificationBadge(verif.status || (assignment.status === 'COMPLETED' ? 'VERIFIED' : 'PENDING'))}</div>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Ground Outcome</span>
                <span className="asgn-detail-val font-mono" style={{ fontSize: '11.5px' }}>
                  {verif.outcome ? verif.outcome.replace(/_/g, ' ') : 'Awaiting Inspection'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Accepted At</span>
                <span className="asgn-detail-val font-mono" style={{ fontSize: '11px' }}>
                  {assignment.acceptedAt ? new Date(assignment.acceptedAt).toLocaleString() : 'Pending Acceptance'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Completed At</span>
                <span className="asgn-detail-val font-mono" style={{ fontSize: '11px' }}>
                  {assignment.completedAt ? new Date(assignment.completedAt).toLocaleString() : 'In Queue / Active'}
                </span>
              </div>
              <div className="asgn-detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="asgn-detail-label">Inspector Notes</span>
                <span className="asgn-detail-val" style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                  {verif.notes || 'Dispatch queue monitored by Command Center.'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: OPERATIONAL NAVIGATION LINKS */}
          <div className="asgn-actions-grid">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/predictions');
              }}
            >
              View in Predictions →
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/risk-map');
              }}
            >
              View on Risk Map →
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/verification');
              }}
            >
              View in Verification →
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/evaluations');
              }}
            >
              View in Evaluation →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
