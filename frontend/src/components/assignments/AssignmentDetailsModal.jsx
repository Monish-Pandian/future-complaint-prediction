import React from 'react';
import {
  renderAssignmentStatusBadge,
  renderMatchScorePill,
  renderMiniWorkload,
} from './AssignmentBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';

/**
 * AssignmentDetailsModal: 4-tier slide-in drawer detailing Prediction, AI Reasoning, Officer Workload, and Verification Lifecycle
 */
export default function AssignmentDetailsModal({ assignment, onClose }) {
  if (!assignment) return null;

  const pred = assignment.prediction || {};
  const officer = assignment.officer || {};
  const verif = assignment.verification || {};

  return (
    <div className="asgn-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="asgn-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="asgn-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: '800', color: '#4dd6c7' }}>
                {assignment.assignmentId}
              </span>
              {renderAssignmentStatusBadge(assignment.status)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Created: {new Date(assignment.assignedAt).toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="asgn-drawer-close"
            onClick={onClose}
            aria-label="Close detail modal"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="asgn-drawer-content">
          {/* SECTION 1: AI PREDICTION INTEL */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              1. Predicted Problem Intel
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Complaint Type</span>
                <span className="asgn-detail-val">{pred.complaintType || 'Civic Infrastructure'}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Prediction Ref</span>
                <span className="asgn-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#68b3e8' }}>
                  {pred.predictionId || 'N/A'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Risk Severity</span>
                <div>{renderRiskBadge(pred.riskLevel || 'LOW')}</div>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Forecast Probability</span>
                <span className="asgn-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#ffd166' }}>
                  {Math.round((pred.probability ?? 0.5) * 100)}% (Score: {pred.riskScore ?? 50})
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Community Area</span>
                <span className="asgn-detail-val">{pred.communityArea || 'Chicago Central'}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Ward</span>
                <span className="asgn-detail-val">{pred.ward || 'Ward 1'}</span>
              </div>
              <div className="asgn-detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="asgn-detail-label">Geographic Location</span>
                <span className="asgn-detail-val" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {pred.location?.address || 'Chicago, IL'} ({pred.location?.lat?.toFixed(4)}, {pred.location?.lng?.toFixed(4)})
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: AI DISPATCH HEURISTIC & REASONING */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              2. AI Dispatch Heuristic & Match Reasoning
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Composite Match Score</span>
                <div>{renderMatchScorePill(assignment.assignmentScore)}</div>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Department Match</span>
                <span className="asgn-detail-val" style={{ color: assignment.departmentMatch ? '#4dd6a8' : '#ff6b6b' }}>
                  {assignment.departmentMatch ? '✓ Direct Match' : '⚠ Cross-Dispatched'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Estimated Distance</span>
                <span className="asgn-detail-val" style={{ fontFamily: 'var(--font-mono)' }}>
                  {assignment.distanceKm ?? 1.2} km
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Estimated Travel Time</span>
                <span className="asgn-detail-val" style={{ fontFamily: 'var(--font-mono)' }}>
                  {assignment.estimatedTravelMinutes ?? 15} mins
                </span>
              </div>
            </div>
            <div className="asgn-reason-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Algorithmic Selection Justification:
              </strong>
              {assignment.reasoning || 'Automated capacity optimization dispatch.'}
            </div>
          </div>

          {/* SECTION 3: ASSIGNED OFFICER WORKLOAD & PROFILE */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              3. Assigned Officer Workload & Context
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Officer Name</span>
                <span className="asgn-detail-val">{officer.name || 'Unassigned'}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Officer ID / Code</span>
                <span className="asgn-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#68b3e8' }}>
                  {officer.officerId || 'OFF-N/A'} ({officer.employeeCode || 'N/A'})
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Department</span>
                <span className="asgn-detail-val">{officer.department || assignment.department}</span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Current Workload</span>
                <div>{renderMiniWorkload(assignment.currentWorkload ?? officer.currentWorkload ?? 0)}</div>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Availability</span>
                <span className="asgn-detail-val" style={{ color: '#4dd6a8' }}>
                  {officer.availability || assignment.availability || 'AVAILABLE'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Contact Dispatch</span>
                <span className="asgn-detail-val" style={{ fontSize: '12px' }}>
                  {officer.phone || '+1-312-555-0100'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: FIELD VERIFICATION & LIFECYCLE */}
          <div className="asgn-section-card">
            <div className="asgn-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              4. Field Verification Lifecycle
            </div>
            <div className="asgn-detail-grid">
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Verification Status</span>
                <span className="asgn-detail-val" style={{ color: '#c4b5fd' }}>
                  {verif.status || 'PENDING_VERIFICATION'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Ground Outcome</span>
                <span className="asgn-detail-val">
                  {verif.outcome ? verif.outcome.replace('_', ' ') : 'Awaiting Inspection'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Accepted At</span>
                <span className="asgn-detail-val" style={{ fontSize: '12px' }}>
                  {assignment.acceptedAt ? new Date(assignment.acceptedAt).toLocaleString() : 'Pending Acceptance'}
                </span>
              </div>
              <div className="asgn-detail-item">
                <span className="asgn-detail-label">Completed At</span>
                <span className="asgn-detail-val" style={{ fontSize: '12px' }}>
                  {assignment.completedAt ? new Date(assignment.completedAt).toLocaleString() : 'In Queue / Active'}
                </span>
              </div>
              <div className="asgn-detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="asgn-detail-label">Inspector Notes</span>
                <span className="asgn-detail-val" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                  {verif.notes || 'No field report notes logged yet.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
