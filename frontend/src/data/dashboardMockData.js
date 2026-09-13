/**
 * Mock Data for Urban Civic Intelligence Admin Dashboard
 * 
 * IMPORTANT:
 * These values are DEMO DATA representing simulated predictive civic intelligence
 * and operational resource allocation workflows. They do NOT represent real Chicago statistics.
 */

export const dashboardMockData = {
  metadata: {
    datasetLabel: 'DEMO DATA',
    workflowLabel: 'DEMO WORKFLOW DATA',
    systemStatus: 'ONLINE',
    generatedAt: '2026-08-28T12:00:00Z',
    scope: 'URBAN_CIVIC_OPERATIONS',
  },

  // 1. KPI Intelligence Panels
  kpis: [
    {
      id: 'predicted-complaints',
      label: 'PREDICTED COMPLAINTS',
      value: 248,
      supportingText: 'Next 7 days',
      change: '+12.4%',
      trendDirection: 'up',
      status: 'warning',
    },
    {
      id: 'high-risk-zones',
      label: 'HIGH-RISK ZONES',
      value: 17,
      supportingText: 'Risk ≥ 75%',
      change: '+3 zones',
      trendDirection: 'up',
      status: 'critical',
    },
    {
      id: 'pending-verifications',
      label: 'PENDING VERIFICATIONS',
      value: 42,
      supportingText: 'Awaiting field outcome',
      change: '18 assigned',
      trendDirection: 'neutral',
      status: 'info',
    },
    {
      id: 'verified-problems',
      label: 'VERIFIED PROBLEMS',
      value: 126,
      supportingText: 'Confirmed observations',
      change: '77.8% accuracy',
      trendDirection: 'up',
      status: 'success',
    },
  ],

  // 2. Future Complaint Trend (Historical vs Predicted vs Observed) - 18 Days
  futureTrend: [
    { date: 'Aug 14', historical: 34, predicted: null, actual: 36 },
    { date: 'Aug 15', historical: 38, predicted: null, actual: 39 },
    { date: 'Aug 16', historical: 42, predicted: null, actual: 40 },
    { date: 'Aug 17', historical: 39, predicted: null, actual: 41 },
    { date: 'Aug 18', historical: 45, predicted: 44, actual: 46 },
    { date: 'Aug 19', historical: 48, predicted: 47, actual: 49 },
    { date: 'Aug 20', historical: 44, predicted: 46, actual: 43 },
    { date: 'Aug 21', historical: 50, predicted: 52, actual: 51 },
    { date: 'Aug 22', historical: 53, predicted: 55, actual: 54 },
    { date: 'Aug 23', historical: 51, predicted: 54, actual: 52 },
    { date: 'Aug 24', historical: 58, predicted: 60, actual: 57 },
    { date: 'Aug 25', historical: null, predicted: 62, actual: 61 },
    { date: 'Aug 26', historical: null, predicted: 67, actual: 64 },
    { date: 'Aug 27', historical: null, predicted: 71, actual: null },
    { date: 'Aug 28', historical: null, predicted: 76, actual: null },
    { date: 'Aug 29', historical: null, predicted: 80, actual: null },
    { date: 'Aug 30', historical: null, predicted: 74, actual: null },
    { date: 'Aug 31', historical: null, predicted: 69, actual: null },
  ],

  // 3. Risk Distribution (Horizontal fast-interpretation bars)
  riskDistribution: [
    {
      level: 'CRITICAL',
      label: 'Critical',
      count: 8,
      percentage: 5.3,
      color: '#e96c6c',
      bgGlow: 'rgba(233, 108, 108, 0.15)',
      description: 'Immediate structural & safety hazard risk',
    },
    {
      level: 'HIGH',
      label: 'High',
      count: 21,
      percentage: 14.0,
      color: '#f5a623',
      bgGlow: 'rgba(245, 166, 35, 0.15)',
      description: 'High escalation probability within 72h',
    },
    {
      level: 'MEDIUM',
      label: 'Medium',
      count: 48,
      percentage: 32.0,
      color: '#ecd06f',
      bgGlow: 'rgba(236, 208, 111, 0.15)',
      description: 'Moderate civic deterioration trend',
    },
    {
      level: 'LOW',
      label: 'Low',
      count: 73,
      percentage: 48.7,
      color: '#4dd6a8',
      bgGlow: 'rgba(77, 214, 168, 0.15)',
      description: 'Routine maintenance & low variance',
    },
  ],

  // 4. Actionable Complaint Types (Focused on actionable civic problems)
  complaintDistribution: [
    { category: 'Pothole & Road Hazard', shortName: 'Pothole', count: 68, highRisk: 14, color: '#4dd6c7' },
    { category: 'Garbage & Sanitation Accumulation', shortName: 'Garbage Accumulation', count: 54, highRisk: 11, color: '#5ec9db' },
    { category: 'Rodent & Vector Infestation', shortName: 'Rodent Complaint', count: 45, highRisk: 12, color: '#68b3e8' },
    { category: 'Street Light Infrastructure Outage', shortName: 'Street Light Outage', count: 38, highRisk: 6, color: '#7ba0f0' },
    { category: 'Illegal Waste Dumping', shortName: 'Illegal Dumping', count: 26, highRisk: 7, color: '#978ef3' },
    { category: 'Water Service & Pressure Disruption', shortName: 'Water Service Issue', count: 17, highRisk: 4, color: '#b97cf0' },
  ],

  // 5. Field Verification Status & Operational Pipeline Flow
  verificationStatus: {
    summary: [
      { status: 'Pending', key: 'PENDING', count: 42, percentage: 19.3, color: '#ecd06f', indicator: 'amber' },
      { status: 'Assigned', key: 'ASSIGNED', count: 18, percentage: 8.3, color: '#68b3e8', indicator: 'blue' },
      { status: 'In Progress', key: 'IN_PROGRESS', count: 11, percentage: 5.0, color: '#a78bfa', indicator: 'purple' },
      { status: 'Verified', key: 'VERIFIED', count: 126, percentage: 57.8, color: '#4dd6a8', indicator: 'green' },
      { status: 'Not Found', key: 'NOT_FOUND', count: 21, percentage: 9.6, color: '#94a3b8', indicator: 'slate' },
    ],
    // Operational Pipeline: Forecast -> Assigned -> Inspected -> Confirmed True
    pipeline: {
      predicted: 248,
      assigned: 176,
      verified: 126,
      confirmed: 98,
      confirmationRate: '77.8%',
      avgResponseHours: '4.8 hrs',
    },
  },

  // 6. Recent Prediction Activity
  recentPredictions: [
    {
      id: 'PRED-5701',
      area: 'Community Area 57 (Archer Heights)',
      ward: 'Ward 14',
      complaintType: 'Pothole & Asphalt Break',
      riskScore: 87,
      riskLevel: 'CRITICAL',
      predictionWindow: 'Aug 25–27',
      assignment: 'Officer Assigned',
      officerName: 'Off. J. Martinez',
      verification: 'PENDING',
    },
    {
      id: 'PRED-1402',
      area: 'Community Area 14 (Albany Park)',
      ward: 'Ward 33',
      complaintType: 'Garbage Accumulation',
      riskScore: 79,
      riskLevel: 'HIGH',
      predictionWindow: 'Aug 26–29',
      assignment: 'Officer Assigned',
      officerName: 'Off. D. Chen',
      verification: 'IN PROGRESS',
    },
    {
      id: 'PRED-3203',
      area: 'Community Area 32 (Loop)',
      ward: 'Ward 42',
      complaintType: 'Street Light Outage',
      riskScore: 68,
      riskLevel: 'MEDIUM',
      predictionWindow: 'Aug 28–31',
      assignment: 'Unassigned',
      officerName: null,
      verification: 'PENDING',
    },
    {
      id: 'PRED-2404',
      area: 'Community Area 24 (West Town)',
      ward: 'Ward 1',
      complaintType: 'Rodent Complaint',
      riskScore: 92,
      riskLevel: 'CRITICAL',
      predictionWindow: 'Aug 24–27',
      assignment: 'Officer Assigned',
      officerName: 'Off. S. Davis',
      verification: 'VERIFIED',
    },
    {
      id: 'PRED-6105',
      area: 'Community Area 61 (New City)',
      ward: 'Ward 20',
      complaintType: 'Illegal Dumping',
      riskScore: 74,
      riskLevel: 'HIGH',
      predictionWindow: 'Aug 27–30',
      assignment: 'Officer Assigned',
      officerName: 'Off. R. Wilson',
      verification: 'NOT FOUND',
    },
    {
      id: 'PRED-0306',
      area: 'Community Area 03 (Uptown)',
      ward: 'Ward 46',
      complaintType: 'Water Service Issue',
      riskScore: 45,
      riskLevel: 'LOW',
      predictionWindow: 'Aug 29–Sep 02',
      assignment: 'Unassigned',
      officerName: null,
      verification: 'PENDING',
    },
    {
      id: 'PRED-2807',
      area: 'Community Area 28 (Near West Side)',
      ward: 'Ward 27',
      complaintType: 'Pothole & Asphalt Break',
      riskScore: 83,
      riskLevel: 'HIGH',
      predictionWindow: 'Aug 26–28',
      assignment: 'Officer Assigned',
      officerName: 'Off. A. Torres',
      verification: 'ASSIGNED',
    },
  ],
};

export default dashboardMockData;
