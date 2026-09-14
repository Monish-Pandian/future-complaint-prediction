import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import OfficerWorkload from '../../components/officerPerformance/OfficerWorkload';
import OfficerOutcomeChart from '../../components/officerPerformance/OfficerOutcomeChart';
import OfficerTaskChart from '../../components/officerPerformance/OfficerTaskChart';
import OfficerVerificationChart from '../../components/officerPerformance/OfficerVerificationChart';
import RecentAssignments from '../../components/officerPerformance/RecentAssignments';
import { renderOfficerStatusBadge } from '../../components/officerPerformance/OfficerBadges';
import { getOfficerPerformanceById } from '../../api/officerApi';

/**
 * OfficerPerformanceDetails: In-depth operational performance review for an individual officer
 * Route: /officer-performance/:id
 */
export default function OfficerPerformanceDetails() {
  const { id } = useParams();
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDetails() {
      setLoading(true);
      setError(null);
      try {
        const res = await getOfficerPerformanceById(id || 'OFF-1001');
        if (isMounted && res?.data) {
          setOfficer(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load officer performance details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PageTransition>
        <div className="officer-perf-detail-page">
          <div className="skeleton-box" style={{ height: '36px', width: '200px', marginBottom: '20px' }} />
          <div className="skeleton-box" style={{ height: '120px', width: '100%', marginBottom: '24px' }} />
          <div className="skeleton-box" style={{ height: '300px', width: '100%' }} />
        </div>
      </PageTransition>
    );
  }

  if (error || !officer) {
    return (
      <PageTransition>
        <div className="officer-perf-detail-page">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <div className="error-title">UNABLE TO LOAD OFFICER PERFORMANCE DETAIL</div>
            <div className="error-subtitle">{error || 'Officer record not found.'}</div>
            <Link to="/officer-performance" className="btn-back-link" style={{ marginTop: '16px' }}>
              ← BACK TO OFFICER PERFORMANCE
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  const completionPct = Math.round((officer.performance?.completionRate || 0.88) * 100);

  return (
    <PageTransition>
      <div className="officer-perf-detail-page">
        {/* Back Link & Header Badge */}
        <div className="detail-back-bar">
          <Link to="/officer-performance" className="btn-back-link">
            ← BACK TO OFFICER PERFORMANCE
          </Link>
          <span className="demo-badge">OFFICER INTEL</span>
        </div>

        {/* Officer Identity Header */}
        <header className="detail-identity-header">
          <div className="identity-main">
            <div className="identity-tag-row">
              <span className="identity-id">{officer.id}</span>
              <span className="workflow-badge">{officer.department}</span>
              <span className="cell-subtext" style={{ fontWeight: '700' }}>
                {officer.employeeCode}
              </span>
            </div>
            <h1 className="identity-title">{officer.name}</h1>
            <div className="identity-area-sub">
              {officer.department} &bull; Contact: {officer.phone || 'N/A'} &bull; Current Workload: {officer.workload?.active ?? 0} tasks
            </div>
            {officer.skills && officer.skills.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {officer.skills.map((skill, idx) => (
                  <span
                    key={`skill-${idx}`}
                    className="cell-subtext"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="identity-badges-group">
            {renderOfficerStatusBadge(officer.status)}
          </div>
        </header>

        {/* Operational Summary Narrative */}
        <div className="operational-summary-box" role="region" aria-label="Operational Narrative Summary">
          <strong>OPERATIONAL SUMMARY: </strong>
          {officer.name} currently has <strong>{officer.workload?.active ?? 0} active verification tasks</strong>.
          A total of <strong>{officer.performance?.completed ?? 0} tasks</strong> have been completed in the
          active evaluation cycle, with <strong>{officer.performance?.confirmed ?? 0} confirmed field observations</strong>,
          an average turnaround time of <strong>{officer.performance?.averageVerificationFormatted || '1h 42m'}</strong>,
          and an overall completion rate of <strong>{completionPct}%</strong>.
        </div>

        {/* 7-Metric Performance Summary Cards */}
        <section className="officer-kpis-top" style={{ gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '24px' }}>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Completed</div>
            <div className="meta-field-val" style={{ fontSize: '20px', color: '#4dd6a8' }}>
              {officer.performance?.completed ?? 0}
            </div>
          </div>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Pending</div>
            <div className="meta-field-val" style={{ fontSize: '20px', color: '#ecd06f' }}>
              {officer.performance?.pending ?? 0}
            </div>
          </div>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Confirmed</div>
            <div className="meta-field-val" style={{ fontSize: '20px', color: 'var(--accent)' }}>
              {officer.performance?.confirmed ?? 0}
            </div>
          </div>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Not Found</div>
            <div className="meta-field-val" style={{ fontSize: '20px', color: '#94a3b8' }}>
              {officer.performance?.notFound ?? 0}
            </div>
          </div>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Unable Verify</div>
            <div className="meta-field-val" style={{ fontSize: '20px', color: '#a78bfa' }}>
              {officer.performance?.unableToVerify ?? 0}
            </div>
          </div>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Avg. Duration</div>
            <div className="meta-field-val" style={{ fontSize: '18px' }}>
              {officer.performance?.averageVerificationFormatted || '1h 42m'}
            </div>
          </div>
          <div className="info-card" style={{ padding: '16px 14px' }}>
            <div className="meta-field-label">Completion</div>
            <div className="meta-field-val" style={{ fontSize: '20px', color: completionPct >= 85 ? '#4dd6a8' : '#ecd06f' }}>
              {completionPct}%
            </div>
          </div>
        </section>

        {/* Current Workload Progress Bar */}
        <div style={{ marginBottom: '24px' }}>
          <OfficerWorkload workload={officer.workload} />
        </div>

        {/* 2-Column Charts Grid */}
        <div className="detail-charts-2col">
          <OfficerOutcomeChart performance={officer.performance} />
          <OfficerTaskChart taskStatusCounts={officer.taskStatusCounts} />
        </div>

        {/* Verification Activity 14-Day Line Chart */}
        <div style={{ marginBottom: '24px' }}>
          <OfficerVerificationChart timeline={officer.verificationTimeline} />
        </div>

        {/* Recent AI Assignments */}
        <RecentAssignments assignments={officer.recentAssignments} />
      </div>
    </PageTransition>
  );
}
