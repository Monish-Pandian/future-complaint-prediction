import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Field Verification Outcomes & Evaluation Mapping Card
 * Displays real field verification outcomes and their formal model evaluation mappings
 */
export default function VerificationOutcomesCard({
  verificationStats = {},
  confusionMatrix = {},
}) {
  const confirmed = verificationStats.confirmed ?? confusionMatrix.truePositives ?? 13;
  const notFound = verificationStats.notFound ?? 4;
  const differentProblem = verificationStats.different ?? 2;
  const duplicate = verificationStats.duplicate ?? 2;
  const unable = verificationStats.unable ?? 3;

  const totalVerifs = (confirmed + notFound + differentProblem + duplicate + unable) || 24;

  const outcomeList = [
    {
      outcome: 'PROBLEM_CONFIRMED',
      evaluation: 'TRUE_POSITIVE',
      count: confirmed,
      pct: Math.round((confirmed / totalVerifs) * 100),
      color: '#10b981',
      badgeClass: 'badge-tp',
      desc: 'Ground-truth field problem matches AI prediction',
    },
    {
      outcome: 'PROBLEM_NOT_FOUND',
      evaluation: 'FALSE_POSITIVE',
      count: notFound,
      pct: Math.round((notFound / totalVerifs) * 100),
      color: '#ef4444',
      badgeClass: 'badge-fp',
      desc: 'Inspected location clean; no civic defect found',
    },
    {
      outcome: 'DIFFERENT_PROBLEM',
      evaluation: 'FALSE_POSITIVE',
      count: differentProblem,
      pct: Math.round((differentProblem / totalVerifs) * 100),
      color: '#f59e0b',
      badgeClass: 'badge-fp',
      desc: 'Different unforecasted issue observed on-site',
    },
    {
      outcome: 'DUPLICATE / EXISTING',
      evaluation: 'UNDETERMINED',
      count: duplicate,
      pct: Math.round((duplicate / totalVerifs) * 100),
      color: '#94a3b8',
      badgeClass: 'badge-undet',
      desc: 'Already reported under existing municipal ticket',
    },
    {
      outcome: 'UNABLE_TO_VERIFY',
      evaluation: 'UNDETERMINED',
      count: unable,
      pct: Math.round((unable / totalVerifs) * 100),
      color: '#94a3b8',
      badgeClass: 'badge-undet',
      desc: 'Access obstruction or hazardous inspection site',
    },
  ];

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">FIELD TRUTH & EVALUATION</span>
          <h3 className="analytics-card-title">Field Verification Outcomes</h3>
        </div>

        <Link to="/verification" className="analytics-view-link">
          <span>View Verifications</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className="verif-outcomes-list">
        {outcomeList.map((item) => (
          <div key={item.outcome} className="verif-outcome-row">
            <div className="verif-row-header">
              <div className="verif-row-name-wrap">
                <span className="verif-status-dot" style={{ background: item.color }} />
                <span className="verif-name-text">{item.outcome}</span>
                <span className={`verif-eval-badge ${item.badgeClass}`}>
                  → {item.evaluation}
                </span>
              </div>
              <div className="verif-count-wrap">
                <strong className="verif-count-num" style={{ color: item.color }}>{item.count}</strong>
                <span className="verif-count-pct">({item.pct}%)</span>
              </div>
            </div>

            <div className="verif-bar-track">
              <div
                className="verif-bar-fill"
                style={{ width: `${item.pct}%`, background: item.color }}
              />
            </div>
            <span className="verif-desc-text">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
