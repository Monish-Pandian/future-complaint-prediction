import React from 'react';
import { useNavigate } from 'react-router-dom';
import { renderAssignmentBadge } from './PredictionBadges';

/**
 * PredictionAssignment: AI officer assignment status and proximity details
 */
export default function PredictionAssignment({ assignment = {} }) {
  const navigate = useNavigate();

  const handleViewAssignments = () => {
    navigate('/assignments');
  };

  const isAssigned = Boolean(assignment?.officerName);

  return (
    <div className="info-card" aria-label="AI Officer Assignment Panel">
      <div className="info-card-header">
        <h3 className="info-card-title">AI OFFICER ASSIGNMENT</h3>
        {renderAssignmentBadge(assignment?.status)}
      </div>

      {isAssigned ? (
        <div className="meta-grid-2col" style={{ marginBottom: '16px' }}>
          <div className="meta-field">
            <span className="meta-field-label">Assigned Field Officer</span>
            <span className="meta-field-val" style={{ color: 'var(--accent)' }}>
              {assignment.officerName}
            </span>
          </div>

          <div className="meta-field">
            <span className="meta-field-label">Department</span>
            <span className="meta-field-val">{assignment.department || 'Streets & Sanitation'}</span>
          </div>

          <div className="meta-field">
            <span className="meta-field-label">Proximity Distance</span>
            <span className="meta-field-val">{assignment.distanceKm ? `${assignment.distanceKm} km` : '1.2 km'}</span>
          </div>

          <div className="meta-field">
            <span className="meta-field-label">Active Workload</span>
            <span className="meta-field-val">{assignment.workload ?? 1} active tasks</span>
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          <strong>OFFICER NOT ASSIGNED</strong> &mdash; Prediction is in dispatch optimization queue.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
        <button
          type="button"
          onClick={handleViewAssignments}
          className="prediction-action"
          aria-label="View assignment in AI dispatch console"
        >
          <span>VIEW ASSIGNMENT</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
