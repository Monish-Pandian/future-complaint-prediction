import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import { getMyAssignments } from '../../api/officerPortalApi';
import { getCommunityAreaName, getPredictionCoordinates, formatRiskScore } from '../../utils/geoUtils';

/**
 * Field Officer Operational History Page
 * Route: /officer/history
 */
export default function OfficerHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMyAssignments();
      if (res?.data) {
        // Filter to completed assignments or submitted verifications
        const list = Array.isArray(res.data) ? res.data : res.data.assignments || [];
        const completed = list.filter(
          (a) => a.status === 'COMPLETED' || a.status === 'VERIFICATION_SUBMITTED' || a.verification
        );
        setHistory(completed.length > 0 ? completed : list);
      }
    } catch (err) {
      console.error('Failed to load officer history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter((item) => {
    const pred = item.prediction || (typeof item.predictionId === 'object' ? item.predictionId : {}) || {};
    const complaintType = pred.complaintType || item.complaintType || '';
    const communityArea = pred.communityArea || item.communityArea || '';
    const areaName = getCommunityAreaName(communityArea);
    const predId = pred.predictionId || '';
    const asgnId = item.assignmentId || '';
    const outcome = item.verification?.outcome || item.verificationOutcome || '';

    const matchesSearch =
      complaintType.toLowerCase().includes(search.toLowerCase()) ||
      String(communityArea).toLowerCase().includes(search.toLowerCase()) ||
      areaName.toLowerCase().includes(search.toLowerCase()) ||
      predId.toLowerCase().includes(search.toLowerCase()) ||
      asgnId.toLowerCase().includes(search.toLowerCase());

    const matchesOutcome = outcomeFilter === 'ALL' || outcome === outcomeFilter;

    return matchesSearch && matchesOutcome;
  });

  return (
    <PageTransition>
      <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Operational Verification History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Historical record of your completed field dispatches, verifications, and ground-truth observations
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by complaint type or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              minWidth: '260px',
            }}
          />

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="PROBLEM_CONFIRMED">Problem Confirmed</option>
            <option value="PROBLEM_NOT_FOUND">Problem Not Found</option>
            <option value="DIFFERENT_PROBLEM">Different Problem</option>
            <option value="UNABLE_TO_VERIFY">Unable to Verify</option>
            <option value="DUPLICATE">Duplicate</option>
          </select>
        </div>

        {/* Table / List */}
        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading operational history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No completed verification history found matching your filters.
            </div>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-raised)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>DISPATCH ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>PREDICTION REF</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>COMPLAINT TYPE</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>LOCATION (AREA / WARD)</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>CENTROID COORDS</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>FORECAST RISK</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>VERIFICATION OUTCOME</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>COMPLETED DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, idx) => {
                  const pred = item.prediction || (typeof item.predictionId === 'object' ? item.predictionId : {}) || {};
                  const verif = item.verification || {};
                  const coords = getPredictionCoordinates(pred);
                  const areaName = getCommunityAreaName(pred.communityArea);
                  const predIdStr = pred.predictionId || (typeof item.predictionId === 'string' ? item.predictionId : '—');
                  return (
                    <tr key={item._id || item.assignmentId || idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: '600' }}>
                        {item.assignmentId || `ASGN-${idx + 1}`}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {predIdStr}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {pred.complaintType || item.complaintType || 'Civic Issue'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        <div>{areaName ? `${areaName} (CA ${pred.communityArea})` : (pred.communityArea ? `Area ${pred.communityArea}` : '—')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pred.ward ? `Ward ${pred.ward}` : ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {coords ? coords.formatted : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {renderRiskBadge(pred.riskLevel || item.riskLevel || 'MEDIUM')}
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                            {formatRiskScore(pred.riskScore)}/100
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          fontFamily: 'var(--font-mono)',
                          background: verif.outcome === 'PROBLEM_CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: verif.outcome === 'PROBLEM_CONFIRMED' ? 'var(--accent-success)' : 'var(--text-secondary)'
                        }}>
                          {verif.outcome || item.status || 'COMPLETED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
