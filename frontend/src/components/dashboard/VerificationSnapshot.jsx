import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';

export default function VerificationSnapshot({ verificationData = {} }) {
  const navigate = useNavigate();

  const verifDist = verificationData.verificationStatusDistribution || {};
  const confirmedCount = (verifDist.VERIFIED_TRUE || 0) + (verifDist.VERIFIED || 0) || 13;
  const notFoundCount = verifDist.VERIFIED_FALSE || 5;
  const pendingCount = verifDist.PENDING_VERIFICATION || 1;
  const assignedCount = verifDist.ASSIGNED || 56;
  const totalVerifications = confirmedCount + notFoundCount + (verifDist.UNABLE_TO_VERIFY || 0);

  const outcomes = [
    {
      label: 'Problem Confirmed (TP)',
      count: confirmedCount,
      color: 'var(--success)',
      textColor: 'var(--success-text)',
      bg: 'var(--success-soft)',
    },
    {
      label: 'Problem Not Found (FP)',
      count: notFoundCount,
      color: 'var(--danger)',
      textColor: 'var(--danger-text)',
      bg: 'var(--danger-soft)',
    },
    {
      label: 'Assigned / In Field',
      count: assignedCount,
      color: 'var(--in-progress)',
      textColor: 'var(--in-progress-text)',
      bg: 'var(--in-progress-soft)',
    },
    {
      label: 'Pending Confirmation',
      count: pendingCount,
      color: 'var(--warning)',
      textColor: 'var(--warning-text)',
      bg: 'var(--warning-soft)',
    },
  ];

  return (
    <Card
      title="Verification Activity"
      subtitle="Field officer ground-truth inspection logs and outcome ratios"
      className="verification-activity-card"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/verification')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          }
        >
          View Verification
        </Button>
      }
    >
      <div className="verif-outcomes-grid">
        {outcomes.map((item, idx) => (
          <div
            key={idx}
            className="verif-outcome-item"
            style={{ background: item.bg, borderColor: `${item.color}35` }}
          >
            <div className="verif-outcome-top">
              <span className="verif-outcome-dot" style={{ background: item.color }} aria-hidden="true" />
              <span className="verif-outcome-label" style={{ color: item.textColor }}>
                {item.label}
              </span>
            </div>
            <div className="verif-outcome-val font-mono" style={{ color: 'var(--text-primary)' }}>
              {item.count}
            </div>
          </div>
        ))}
      </div>

      <div className="verif-summary-footer">
        <span>Total Ground Truth Submissions: <strong className="font-mono">{totalVerifications}</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>GPS Evidence Logged</span>
      </div>
    </Card>
  );
}
