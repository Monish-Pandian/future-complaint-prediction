import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import PredictionProbability from '../../components/predictions/PredictionProbability';
import HistoricalEvidence from '../../components/predictions/HistoricalEvidence';
import PredictionExplanation from '../../components/predictions/PredictionExplanation';
import PredictionAssignment from '../../components/predictions/PredictionAssignment';
import PredictionVerification from '../../components/predictions/PredictionVerification';
import PredictionMapPreview from '../../components/predictions/PredictionMapPreview';
import ResearchLoopVisual from '../../components/predictions/ResearchLoopVisual';
import { renderRiskBadge, renderVerificationBadge } from '../../components/predictions/PredictionBadges';
import { getPredictionById } from '../../api/predictionApi';

/**
 * PredictionDetails Page: Comprehensive AI Assessment, Evidence & Verification Timeline
 * Route: /predictions/:id
 */
export default function PredictionDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await getPredictionById(id);
        if (isMounted && res) {
          // Backend returns: { prediction, predictionCycle, assignedOfficer, assignment, verification, evaluation, feedback }
          setData(res);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load prediction assessment details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PageTransition>
        <div className="predictions-detail-page">
          <div className="skeleton-box" style={{ height: '40px', width: '200px', marginBottom: '20px' }} />
          <div className="skeleton-box" style={{ height: '120px', width: '100%', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
            <div className="skeleton-box" style={{ height: '400px', width: '100%' }} />
            <div className="skeleton-box" style={{ height: '400px', width: '100%' }} />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <div className="predictions-detail-page">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <div className="error-title">UNABLE TO LOAD PREDICTION DETAIL</div>
            <div className="error-subtitle">{error || 'Prediction record not found.'}</div>
            <Link to="/predictions" className="btn-back-link" style={{ marginTop: '16px' }}>
              ← BACK TO PREDICTIONS
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Extract data from backend response structure
  const prediction = data.prediction;
  const predictionCycle = data.predictionCycle;
  const assignedOfficer = data.assignedOfficer;
  const assignment = data.assignment;
  const verification = data.verification;
  const evaluation = data.evaluation;
  const feedback = data.feedback;

  // Transform to frontend expected format
  const displayPrediction = {
    id: prediction.predictionId || prediction.id,
    complaintType: prediction.complaintType,
    department: prediction.department,
    riskLevel: prediction.riskLevel,
    riskScore: prediction.riskScore,
    probability: prediction.probability,
    confidence: prediction.confidence,
    predictionDate: prediction.predictionDate,
    predictionWindow: {
      start: prediction.predictionWindowStart,
      end: prediction.predictionWindowEnd,
      display: predictionCycle?.predictionWindowStart && predictionCycle?.predictionWindowEnd
        ? `${new Date(predictionCycle.predictionWindowStart).toLocaleDateString()} – ${new Date(predictionCycle.predictionWindowEnd).toLocaleDateString()}`
        : 'Next 7 days',
      horizonDays: 7,
    },
    location: prediction.location,
    area: {
      communityArea: prediction.communityArea,
      communityAreaName: prediction.communityArea,
      ward: prediction.ward,
    },
    historicalEvidence: {
      historicalCount: prediction.historicalCount,
      recentCount: prediction.recentCount,
      trendChange: prediction.trend === 'INCREASING' ? 24 : 0,
    },
    explanationFactors: [
      { label: '+24%', text: 'Complaint frequency increased' },
      { label: '+8', text: 'Recent complaints' },
      { label: 'Strong', text: 'Seasonal pattern' },
      { label: 'Increasing', text: 'Recent trend' },
      { label: 'Nearby', text: 'Similar historical activity' },
    ],
    assignedOfficer: assignedOfficer ? {
      name: assignedOfficer.name,
      employeeCode: assignedOfficer.employeeCode,
      officerId: assignedOfficer.officerId,
      department: assignedOfficer.department,
      phone: assignedOfficer.phone,
      availability: assignedOfficer.availability,
      currentWorkload: assignedOfficer.currentWorkload,
    } : null,
  };

  // Transform assignment to frontend format
  const displayAssignment = assignment ? {
    status: assignment.status,
    officerName: assignment.officerId?.name,
    employeeCode: assignment.officerId?.employeeCode,
    department: assignment.department,
    distanceKm: assignment.distanceKm,
    currentWorkload: assignment.currentWorkload,
    availability: assignment.availability,
    assignedAt: assignment.assignedAt,
  } : displayPrediction.assignedOfficer ? {
    status: 'ASSIGNED',
    officerName: displayPrediction.assignedOfficer.name,
    employeeCode: displayPrediction.assignedOfficer.employeeCode,
    department: displayPrediction.assignedOfficer.department,
    distanceKm: null,
    currentWorkload: displayPrediction.assignedOfficer.currentWorkload,
    availability: displayPrediction.assignedOfficer.availability,
    assignedAt: null,
  } : {
    status: 'UNASSIGNED',
    officerName: null,
    employeeCode: null,
    department: prediction.department,
    distanceKm: null,
    currentWorkload: null,
    availability: null,
    assignedAt: null,
  };

  // Transform verification to frontend format
  const displayVerification = verification ? {
    status: verification.outcome === 'PROBLEM_CONFIRMED' ? 'VERIFIED' : 
            verification.outcome === 'PROBLEM_NOT_FOUND' ? 'NOT_FOUND' :
            verification.outcome === 'DIFFERENT_PROBLEM' ? 'DIFFERENT_PROBLEM' :
            verification.outcome === 'UNABLE_TO_VERIFY' ? 'UNABLE_TO_VERIFY' : 'PENDING',
    outcome: verification.outcome,
    notes: verification.notes,
    verifiedAt: verification.verifiedAt,
    evaluation: evaluation?.classification || 'WAITING',
  } : {
    status: 'PENDING',
    outcome: null,
    notes: null,
    verifiedAt: null,
    evaluation: 'WAITING',
  };

  return (
    <PageTransition>
      <div className="predictions-detail-page">
        {/* Stitch Dossier Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link to="/predictions" className="stitch-btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                ← PREDICTIONS LIST
              </Link>
              <div className="stitch-telemetry-badge">
                <span className="stitch-live-dot" />
                <span>ANALYTICAL DOSSIER • {displayPrediction.id}</span>
              </div>
            </div>
            <h1 className="stitch-page-title">{displayPrediction.complaintType}</h1>
            <p className="stitch-page-desc">
              {displayPrediction.area?.communityAreaName || `Area ${displayPrediction.area?.communityArea}`} • Ward {displayPrediction.area?.ward} • {displayPrediction.location?.address || 'Metro Chicago Sector'}
            </p>
          </div>

          <div className="stitch-command-actions">
            {renderRiskBadge(displayPrediction.riskLevel)}
            {renderVerificationBadge(displayVerification.status)}
            <button
              type="button"
              className="stitch-btn-secondary"
              onClick={() => alert(`Exporting incident dossier for ${displayPrediction.id}...`)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export Dossier</span>
            </button>
            <Link
              to="/assignments"
              className="stitch-btn-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <span>Dispatch Officer</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="detail-grid-layout">
          {/* Left Column: Core Info, Historical Evidence, Explanations & Map Preview */}
          <div className="detail-col-left">
            {/* Prediction Identity Information Panel */}
            <div className="info-card">
              <div className="info-card-header">
                <h3 className="info-card-title">PREDICTION IDENTITY & TIMELINE</h3>
                <span className="dashboard-panel-tag">METRIC HORIZON</span>
              </div>
              <div className="meta-grid-2col">
                <div className="meta-field">
                  <span className="meta-field-label">Prediction Identifier</span>
                  <span className="meta-field-val" style={{ color: 'var(--accent)' }}>
                    {displayPrediction.id}
                  </span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Complaint Classification</span>
                  <span className="meta-field-val">{displayPrediction.complaintType}</span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Community Area</span>
                  <span className="meta-field-val">
                    #{displayPrediction.area?.communityArea} &ndash; {displayPrediction.area?.communityAreaName}
                  </span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Municipal Ward</span>
                  <span className="meta-field-val">Ward {displayPrediction.area?.ward}</span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Predicted Date</span>
                  <span className="meta-field-val">{displayPrediction.predictionDate ? new Date(displayPrediction.predictionDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Prediction Window</span>
                  <span className="meta-field-val">
                    {displayPrediction.predictionWindow?.display || 'Next 7 days'}
                  </span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Forecast Horizon</span>
                  <span className="meta-field-val">
                    {displayPrediction.predictionWindow?.horizonDays || 7} Days
                  </span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Department</span>
                  <span className="meta-field-val">{displayPrediction.department}</span>
                </div>
              </div>
            </div>

            {/* Historical Evidence with Recharts Trend Chart */}
            <HistoricalEvidence evidence={displayPrediction.historicalEvidence} />

            {/* Explanatory Prediction Signals */}
            <PredictionExplanation factors={displayPrediction.explanationFactors} />

            {/* Leaflet Spatial Map Preview */}
            <PredictionMapPreview
              location={displayPrediction.location}
              area={displayPrediction.area}
            />
          </div>

          {/* Right Column: Probability, Risk, Assignment & Verification */}
          <div className="detail-col-right">
            {/* Probability Panel */}
            <PredictionProbability
              probability={displayPrediction.probability}
              confidence={displayPrediction.confidence}
            />

            {/* Risk Assessment Panel */}
            <div className="info-card">
              <div className="info-card-header">
                <h3 className="info-card-title">RISK ASSESSMENT</h3>
                {renderRiskBadge(displayPrediction.riskLevel)}
              </div>
              <div className="meta-grid-2col" style={{ marginBottom: '14px' }}>
                <div className="meta-field">
                  <span className="meta-field-label">Calculated Risk Score</span>
                  <span
                    className="meta-field-val"
                    style={{ fontSize: '20px', color: displayPrediction.riskScore >= 75 ? '#ff6b6b' : 'var(--text-primary)' }}
                  >
                    {displayPrediction.riskScore} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 100</span>
                  </span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Risk Severity Classification</span>
                  <span className="meta-field-val">{displayPrediction.riskLevel}</span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Historical Volume</span>
                  <span className="meta-field-val">{displayPrediction.historicalEvidence?.historicalCount} complaints</span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Recent 7-Day Frequency</span>
                  <span className="meta-field-val">{displayPrediction.historicalEvidence?.recentCount} recorded</span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Recent Trend Vector</span>
                  <span className="meta-field-val" style={{ color: 'var(--accent)' }}>
                    INCREASING (+{displayPrediction.historicalEvidence?.trendChange}%)
                  </span>
                </div>
                <div className="meta-field">
                  <span className="meta-field-label">Predicted Window</span>
                  <span className="meta-field-val">Next 7 Days</span>
                </div>
              </div>
            </div>

            {/* AI Officer Assignment */}
            <PredictionAssignment assignment={displayAssignment} />

            {/* Field Verification Multi-Stage Timeline */}
            <PredictionVerification
              prediction={displayPrediction}
              assignment={displayAssignment}
              verification={displayVerification}
            />
          </div>
        </div>

        {/* Bottom Research Loop Visualization */}
        <ResearchLoopVisual
          verification={displayVerification}
          assignment={displayAssignment}
        />
      </div>
    </PageTransition>
  );
}
