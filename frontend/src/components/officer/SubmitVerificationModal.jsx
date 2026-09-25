import React, { useState } from 'react';
import { getCommunityAreaName, getPredictionCoordinates, formatRiskScore } from '../../utils/geoUtils';

/**
 * SubmitVerificationModal: Enables field officers to record ground truth observation outcome, severity, notes, and GPS coordinates
 * Supports both Assignment and VerificationCandidate objects
 */
export default function SubmitVerificationModal({ isOpen, task, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState('PROBLEM_CONFIRMED');
  const [severity, setSeverity] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [gpsAvailable, setGpsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !task) return null;

  const isCandidate = task.selectionType !== undefined;
  const pred = task.prediction || (typeof task.predictionId === 'object' ? task.predictionId : {}) || {};
  const coords = getPredictionCoordinates(pred);
  const areaName = getCommunityAreaName(pred.communityArea);
  const predictionDbId =
    pred._id ||
    pred.id ||
    (typeof task.predictionId === 'string' ? task.predictionId : null) ||
    pred.predictionId;
  const predictionDisplayId =
    pred.predictionId ||
    (typeof task.predictionId === 'string' ? task.predictionId : null) ||
    'N/A';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      const coords = pred.location?.coordinates || [-87.6298, 41.8781];

      const payload = {
        predictionId: predictionDbId,
        outcome,
        severity,
        notes: notes.trim() || 'Ground truth observation submitted by on-site officer.',
        evidenceUrl: evidenceUrl.trim() || null,
        gpsAvailable,
        location: {
          type: 'Point',
          coordinates: coords,
        },
      };

      // Add assignmentId if available (for assignments)
      if (!isCandidate) {
        payload.assignmentId = task._id || task.id || task.assignmentId;
      }
      // Add candidateId for candidates (backend may use this)
      if (isCandidate) {
        payload.candidateId = task._id || task.id || task.candidateId;
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="officer-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="verif-submit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="officer-modal-header">
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Submit Field Ground Truth Verification
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {isCandidate
                ? `Candidate: ${task.candidateId || task.id} • Pred Ref: ${predictionDisplayId}`
                : `Task: ${task.assignmentId || task.id || task._id} • Pred Ref: ${predictionDisplayId}`
              }
            </div>
          </div>
          <button type="button" className="verif-drawer-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="officer-modal-body">
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#ff6b6b', borderRadius: '4px', fontSize: '12px' }}>
                {error}
              </div>
            )}

            {/* Prediction Context */}
            <div style={{ padding: '12px 14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>FORECASTED CIVIC TARGET</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: '700', fontSize: '11px' }}>
                  Risk: {formatRiskScore(pred.riskScore)}/100 ({pred.riskLevel || 'UNRATED'})
                </span>
              </div>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '6px' }}>
                {pred.complaintType || 'Civic Infrastructure Complaint'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Location: </span>
                  <span style={{ fontWeight: '600' }}>
                    {areaName ? `${areaName} (CA ${pred.communityArea})` : (pred.communityArea ? `Area ${pred.communityArea}` : 'Chicago Sector')}
                  </span>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Basis: Community Area centroid</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ward: </span>
                  <span style={{ fontWeight: '600' }}>{pred.ward ? `Ward ${pred.ward}` : '—'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Centroid Coordinates: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {coords ? coords.formatted : 'Coordinates pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div className="officer-form-group">
              <label className="officer-form-label">Observed Verification Outcome</label>
              <select
                className="officer-form-input"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                required
              >
                <option value="PROBLEM_CONFIRMED">PROBLEM CONFIRMED (Physical Issue Observed)</option>
                <option value="PROBLEM_NOT_FOUND">PROBLEM NOT FOUND (False Positive / Clear)</option>
                <option value="DIFFERENT_PROBLEM">DIFFERENT PROBLEM (Alternate Issue Discovered)</option>
                <option value="DUPLICATE">DUPLICATE REPORT</option>
                <option value="UNABLE_TO_VERIFY">UNABLE TO VERIFY (Inaccessible / Obstructed)</option>
              </select>
            </div>

            {/* Severity */}
            <div className="officer-form-group">
              <label className="officer-form-label">Assessed Severity</label>
              <select
                className="officer-form-input"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {/* Notes */}
            <div className="officer-form-group">
              <label className="officer-form-label">Field Inspector Ground Notes</label>
              <textarea
                className="officer-form-input"
                rows={3}
                placeholder="Describe ground observation, physical measurements, repair status..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Evidence URL */}
            <div className="officer-form-group">
              <label className="officer-form-label">Photo / Evidence URL (Optional)</label>
              <input
                type="text"
                className="officer-form-input"
                placeholder="https://..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
            </div>

            {/* GPS Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="gps-verify-toggle"
                checked={gpsAvailable}
                onChange={(e) => setGpsAvailable(e.target.checked)}
              />
              <label htmlFor="gps-verify-toggle" style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Verify device GPS coordinates at inspection site
              </label>
            </div>
          </div>

          <div className="officer-modal-footer">
            <button type="button" className="verification-btn verification-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="verification-btn verification-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
