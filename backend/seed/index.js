const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  User,
  ROLES,
  Officer,
  AVAILABILITY_STATUS,
  HistoricalComplaint,
  HISTORICAL_STATUS,
  PredictionCycle,
  CYCLE_STATUS,
  Prediction,
  RISK_LEVELS,
  VERIFICATION_STATUS,
  TRENDS,
  Assignment,
  ASSIGNMENT_STATUS,
  Verification,
  VERIFICATION_OUTCOMES,
  VERIFICATION_SEVERITY,
  Evaluation,
  EVALUATION_CLASSIFICATION,
  Feedback,
  FEEDBACK_TYPES,
  FEEDBACK_STATUS,
  SystemSetting,
} = require('../src/models');

/**
 * Master Seed Script for Proactive Civic Complaint Forecasting
 * Populates all 10 MongoDB collections with realistic, consistent synthetic demo data.
 */
const seedDatabase = async () => {
  console.log('====================================================');
  console.log('[Seed] Starting Full Database Seeding Process (DEMO DATA)');
  console.log('====================================================');

  await connectDB();

  try {
    // ----------------------------------------------------
    // 1. CLEAR COLLECTIONS
    // ----------------------------------------------------
    console.log('[Seed] 1/10 Clearing development/demo collections...');
    await Promise.all([
      User.deleteMany({}),
      Officer.deleteMany({}),
      HistoricalComplaint.deleteMany({}),
      PredictionCycle.deleteMany({}),
      Prediction.deleteMany({}),
      Assignment.deleteMany({}),
      Verification.deleteMany({}),
      Evaluation.deleteMany({}),
      Feedback.deleteMany({}),
      SystemSetting.deleteMany({}),
    ]);

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('OfficerPass@123', salt);
    const adminPasswordHash = await bcrypt.hash('AdminPass@123', salt);
    const monishPasswordHash = await bcrypt.hash('Monish', salt);
    const sanjayPasswordHash = await bcrypt.hash('Sanjay', salt);

    // ----------------------------------------------------
    // 2. SYSTEM SETTINGS
    // ----------------------------------------------------
    console.log('[Seed] 2/10 Seeding system settings...');
    await SystemSetting.insertMany([
      {
        key: 'prediction_window_days',
        value: 7,
        description: 'Forecast time horizon window in days for predicted problem clustering',
      },
      {
        key: 'max_assignment_radius_km',
        value: 50,
        description: 'Maximum allowable dispatch travel radius for officer assignment in km',
      },
      {
        key: 'default_risk_threshold',
        value: 0.7,
        description: 'Minimum probability threshold to trigger automated high risk alerts',
      },
      {
        key: 'supported_departments',
        value: [
          'Streets & Sanitation',
          'Water & Drainage',
          'Electricity & Lighting',
          'Traffic & Infrastructure',
          'Municipal',
        ],
        description: 'Authorized municipal service departments participating in the forecasting platform',
      },
      {
        key: 'supported_complaint_types',
        value: [
          'Pothole & Asphalt Break',
          'Solid Waste Accumulation',
          'Water Main Leak',
          'Streetlight Outage',
          'Traffic Signal Fault',
        ],
        description: 'Municipal complaint classifications supported by the forecasting engine',
      },
    ]);

    // ----------------------------------------------------
    // 3. USERS & OFFICER PROFILES
    // ----------------------------------------------------
    console.log('[Seed] 3/10 Seeding Admin & Officer users...');

    // Permanent Master Admin User: Monish
    await User.create({
      name: 'Monish',
      email: 'monish@gmail.com',
      passwordHash: monishPasswordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });

    // Central Admin Director
    const adminUser = await User.create({
      name: 'Central Admin Director',
      email: 'admin@civic.gov',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });

    // Officer User Data (Chicago Civic Geographic Coordinates)
    const officerDefinitions = [
      {
        name: 'Officer Marcus Vance',
        email: 'marcus.vance@civic.gov',
        employeeCode: 'EMP-301',
        officerId: 'OFF-1001',
        department: 'Streets & Sanitation',
        phone: '+1-312-555-0101',
        skills: ['Pothole Repair', 'Asphalt Assessment', 'Debris Clearance'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 1,
        coordinates: [-87.6298, 41.8781], // The Loop, Chicago
      },
      {
        name: 'Officer Elena Rostova',
        email: 'elena.rostova@civic.gov',
        employeeCode: 'EMP-302',
        officerId: 'OFF-1002',
        department: 'Water & Drainage',
        phone: '+1-312-555-0102',
        skills: ['Hydraulic Pressure', 'Catch Basin Inspection', 'Leak Detection'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 1,
        coordinates: [-87.6244, 41.8955], // Near North Side, Chicago
      },
      {
        name: 'Officer Kwame Mensah',
        email: 'kwame.mensah@civic.gov',
        employeeCode: 'EMP-303',
        officerId: 'OFF-1003',
        department: 'Electricity & Lighting',
        phone: '+1-312-555-0103',
        skills: ['Grid Inspection', 'Transformer Diagnostics', 'Wiring Repair'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 1,
        coordinates: [-87.6547, 41.8906], // West Town, Chicago
      },
      {
        name: 'Officer Carlos Rivera',
        email: 'carlos.rivera@civic.gov',
        employeeCode: 'EMP-304',
        officerId: 'OFF-1004',
        department: 'Traffic & Infrastructure',
        phone: '+1-312-555-0104',
        skills: ['Signal Calibration', 'Intersection Safety', 'Signage Repair'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 0,
        coordinates: [-87.5975, 41.7943], // Hyde Park, Chicago
      },
      {
        name: 'Officer Sarah Jenkins',
        email: 'sarah.jenkins@civic.gov',
        employeeCode: 'EMP-305',
        officerId: 'OFF-1005',
        department: 'Municipal',
        phone: '+1-312-555-0105',
        skills: ['Public Safety', 'Bylaw Enforcement', 'Sanitation Inspection'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 0,
        coordinates: [-87.7077, 41.9288], // Logan Square, Chicago
      },
      {
        name: 'Officer Sanjay',
        email: 'sanjay@gmail.com',
        employeeCode: 'EMP-SANJAY',
        officerId: 'OFF-SANJAY',
        department: 'Streets & Sanitation',
        phone: '+1-312-555-0199',
        skills: ['Pothole Repair', 'Asphalt Assessment', 'Sanitation Inspection'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 2,
        coordinates: [-87.6545, 41.8818], // Near West Side, Chicago
        passwordHash: sanjayPasswordHash,
      },
    ];

    const officerDocs = [];
    for (const def of officerDefinitions) {
      const userDoc = await User.create({
        name: def.name,
        email: def.email,
        passwordHash: def.passwordHash || defaultPasswordHash,
        role: ROLES.OFFICER,
        officerId: def.officerId,
        department: def.department,
        isActive: true,
      });

      const officerDoc = await Officer.create({
        officerId: def.officerId,
        userId: userDoc._id,
        employeeCode: def.employeeCode,
        name: def.name,
        department: def.department,
        phone: def.phone,
        skills: def.skills,
        availability: def.availability,
        currentWorkload: def.currentWorkload,
        location: {
          type: 'Point',
          coordinates: def.coordinates,
        },
        active: true,
      });

      officerDocs.push(officerDoc);
    }

    const [officerSanitation, officerWater, officerElectricity, officerTraffic, officerMunicipal] =
      officerDocs;

    // ----------------------------------------------------
    // 4. HISTORICAL COMPLAINTS (PAST ACTUAL OBSERVATIONS)
    // ----------------------------------------------------
    console.log('[Seed] 4/10 Seeding historical complaints (past observations)...');
    await HistoricalComplaint.insertMany([
      {
        complaintId: 'HIST-2025-00101',
        complaintType: 'Pothole & Asphalt Break',
        department: 'Streets & Sanitation',
        communityArea: 'The Loop',
        ward: 'Ward 42',
        location: { type: 'Point', coordinates: [-87.6285, 41.8795] },
        status: HISTORICAL_STATUS.CLOSED,
        source: 'DEMO_SEED_311',
        createdAt: new Date('2025-11-15T08:30:00Z'),
        closedAt: new Date('2025-11-17T14:00:00Z'),
      },
      {
        complaintId: 'HIST-2025-00102',
        complaintType: 'Solid Waste Accumulation',
        department: 'Streets & Sanitation',
        communityArea: 'Near North Side',
        ward: 'Ward 43',
        location: { type: 'Point', coordinates: [-87.6322, 41.8988] },
        status: HISTORICAL_STATUS.CLOSED,
        source: 'DEMO_SEED_311',
        createdAt: new Date('2025-11-20T10:15:00Z'),
        closedAt: new Date('2025-11-21T16:45:00Z'),
      },
      {
        complaintId: 'HIST-2025-00103',
        complaintType: 'Water Main Leak',
        department: 'Water & Drainage',
        communityArea: 'West Town',
        ward: 'Ward 1',
        location: { type: 'Point', coordinates: [-87.6591, 41.8923] },
        status: HISTORICAL_STATUS.RESOLVED,
        source: 'DEMO_SEED_311',
        createdAt: new Date('2025-12-05T09:00:00Z'),
        closedAt: new Date('2025-12-06T18:00:00Z'),
      },
      {
        complaintId: 'HIST-2025-00104',
        complaintType: 'Streetlight Outage',
        department: 'Electricity & Lighting',
        communityArea: 'Hyde Park',
        ward: 'Ward 5',
        location: { type: 'Point', coordinates: [-87.5992, 41.7951] },
        status: HISTORICAL_STATUS.CLOSED,
        source: 'DEMO_SEED_311',
        createdAt: new Date('2025-12-18T19:20:00Z'),
        closedAt: new Date('2025-12-20T11:30:00Z'),
      },
      {
        complaintId: 'HIST-2026-00105',
        complaintType: 'Traffic Signal Fault',
        department: 'Traffic & Infrastructure',
        communityArea: 'Logan Square',
        ward: 'Ward 32',
        location: { type: 'Point', coordinates: [-87.7088, 41.9295] },
        status: HISTORICAL_STATUS.RESOLVED,
        source: 'DEMO_SEED_311',
        createdAt: new Date('2026-01-10T14:10:00Z'),
        closedAt: new Date('2026-01-11T12:00:00Z'),
      },
    ]);

    // ----------------------------------------------------
    // 5. PREDICTION CYCLES
    // ----------------------------------------------------
    console.log('[Seed] 5/10 Seeding prediction cycles...');
    const pastCycle = await PredictionCycle.create({
      cycleId: 'CYCLE-2026-001',
      cycleNumber: 1,
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2026-08-15T00:00:00Z'),
      predictionWindowStart: new Date('2026-08-01T00:00:00Z'),
      predictionWindowEnd: new Date('2026-08-08T00:00:00Z'),
      status: CYCLE_STATUS.COMPLETED,
      predictionCount: 3,
      verificationCount: 3,
      completedAt: new Date('2026-08-15T23:59:59Z'),
    });

    const activeCycle = await PredictionCycle.create({
      cycleId: 'CYCLE-2026-002',
      cycleNumber: 2,
      startDate: new Date('2026-08-16T00:00:00Z'),
      endDate: new Date('2026-08-30T00:00:00Z'),
      predictionWindowStart: new Date('2026-08-26T00:00:00Z'),
      predictionWindowEnd: new Date('2026-09-02T00:00:00Z'),
      status: CYCLE_STATUS.RUNNING,
      predictionCount: 3,
      verificationCount: 0,
    });

    // ----------------------------------------------------
    // 6. PREDICTIONS (PREDICTED PROBLEMS)
    // ----------------------------------------------------
    console.log('[Seed] 6/10 Seeding predicted problems with scenarios...');

    // SCENARIO 1: Pothole -> Verified True (PROBLEM_CONFIRMED) -> TRUE_POSITIVE -> VERIFIED_OBSERVATION
    const pred1 = await Prediction.create({
      predictionId: 'PRED-2026-0001',
      predictionCycleId: pastCycle._id,
      complaintType: 'Pothole & Asphalt Break',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 42',
      location: { type: 'Point', coordinates: [-87.6295, 41.8789] },
      predictionDate: new Date('2026-08-02T08:00:00Z'),
      predictionWindowStart: new Date('2026-08-02T00:00:00Z'),
      predictionWindowEnd: new Date('2026-08-09T00:00:00Z'),
      probability: 0.87,
      riskScore: 88.5,
      riskLevel: RISK_LEVELS.HIGH,
      historicalCount: 14,
      recentCount: 5,
      trend: TRENDS.INCREASING,
      confidence: 0.91,
      verificationStatus: VERIFICATION_STATUS.VERIFIED_TRUE,
      assignedOfficer: officerSanitation._id,
      assignedOfficerId: officerSanitation._id,
    });

    // SCENARIO 2: Solid Waste -> False Positive (PROBLEM_NOT_FOUND) -> FALSE_POSITIVE -> FALSE_POSITIVE_SIGNAL
    const pred2 = await Prediction.create({
      predictionId: 'PRED-2026-0002',
      predictionCycleId: pastCycle._id,
      complaintType: 'Solid Waste Accumulation',
      department: 'Streets & Sanitation',
      communityArea: 'Near North Side',
      ward: 'Ward 43',
      location: { type: 'Point', coordinates: [-87.6335, 41.8972] },
      predictionDate: new Date('2026-08-03T09:00:00Z'),
      predictionWindowStart: new Date('2026-08-03T00:00:00Z'),
      predictionWindowEnd: new Date('2026-08-10T00:00:00Z'),
      probability: 0.82,
      riskScore: 81.0,
      riskLevel: RISK_LEVELS.HIGH,
      historicalCount: 9,
      recentCount: 3,
      trend: TRENDS.STABLE,
      confidence: 0.86,
      verificationStatus: VERIFICATION_STATUS.VERIFIED_FALSE,
      assignedOfficer: officerSanitation._id,
      assignedOfficerId: officerSanitation._id,
    });

    // SCENARIO 3: Water Leakage -> Verified DIFFERENT_PROBLEM -> UNDETERMINED
    const pred3 = await Prediction.create({
      predictionId: 'PRED-2026-0003',
      predictionCycleId: pastCycle._id,
      complaintType: 'Water Main Leak',
      department: 'Water & Drainage',
      communityArea: 'West Town',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [-87.6582, 41.8918] },
      predictionDate: new Date('2026-08-04T11:00:00Z'),
      predictionWindowStart: new Date('2026-08-04T00:00:00Z'),
      predictionWindowEnd: new Date('2026-08-11T00:00:00Z'),
      probability: 0.78,
      riskScore: 76.5,
      riskLevel: RISK_LEVELS.MEDIUM,
      historicalCount: 6,
      recentCount: 2,
      trend: TRENDS.INCREASING,
      confidence: 0.83,
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      assignedOfficer: officerWater._id,
      assignedOfficerId: officerWater._id,
    });

    // SCENARIO 4: Active Cycle Prediction with verificationStatus = PENDING_VERIFICATION (No verification yet)
    const pred4 = await Prediction.create({
      predictionId: 'PRED-2026-0004',
      predictionCycleId: activeCycle._id,
      complaintType: 'Streetlight Outage',
      department: 'Electricity & Lighting',
      communityArea: 'Hyde Park',
      ward: 'Ward 5',
      location: { type: 'Point', coordinates: [-87.5988, 41.7947] },
      predictionDate: new Date('2026-08-26T06:00:00Z'),
      predictionWindowStart: new Date('2026-08-26T00:00:00Z'),
      predictionWindowEnd: new Date('2026-09-02T00:00:00Z'),
      probability: 0.94,
      riskScore: 92.0,
      riskLevel: RISK_LEVELS.CRITICAL,
      historicalCount: 18,
      recentCount: 7,
      trend: TRENDS.INCREASING,
      confidence: 0.94,
      verificationStatus: VERIFICATION_STATUS.PENDING_VERIFICATION,
      assignedOfficer: officerElectricity._id,
      assignedOfficerId: officerElectricity._id,
    });

    // Prediction 5: Unassigned Low Risk Prediction
    const pred5 = await Prediction.create({
      predictionId: 'PRED-2026-0005',
      predictionCycleId: activeCycle._id,
      complaintType: 'Traffic Signal Fault',
      department: 'Traffic & Infrastructure',
      communityArea: 'Logan Square',
      ward: 'Ward 32',
      location: { type: 'Point', coordinates: [-87.7082, 41.9291] },
      predictionDate: new Date('2026-08-26T07:00:00Z'),
      predictionWindowStart: new Date('2026-08-26T00:00:00Z'),
      predictionWindowEnd: new Date('2026-09-02T00:00:00Z'),
      probability: 0.45,
      riskScore: 42.0,
      riskLevel: RISK_LEVELS.LOW,
      historicalCount: 3,
      recentCount: 1,
      trend: TRENDS.STABLE,
      confidence: 0.8,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    });

    // ----------------------------------------------------
    // 7. ASSIGNMENTS
    // ----------------------------------------------------
    console.log('[Seed] 7/10 Seeding automated AI assignments...');

    const asgn1 = await Assignment.create({
      assignmentId: 'ASGN-2026-0001',
      predictionId: pred1._id,
      officerId: officerSanitation._id,
      department: 'Streets & Sanitation',
      distanceKm: 0.85,
      estimatedTravelMinutes: 6,
      currentWorkload: 1,
      departmentMatch: true,
      assignmentScore: 94.5,
      reasoning: 'Optimal proximity (0.85 km) and matching department skill profile for pothole inspection.',
      status: ASSIGNMENT_STATUS.COMPLETED,
      assignedAt: new Date('2026-08-02T08:15:00Z'),
      acceptedAt: new Date('2026-08-02T08:30:00Z'),
      completedAt: new Date('2026-08-02T11:45:00Z'),
    });

    const asgn2 = await Assignment.create({
      assignmentId: 'ASGN-2026-0002',
      predictionId: pred2._id,
      officerId: officerSanitation._id,
      department: 'Streets & Sanitation',
      distanceKm: 1.4,
      estimatedTravelMinutes: 9,
      currentWorkload: 1,
      departmentMatch: true,
      assignmentScore: 89.2,
      reasoning: 'Available officer within 1.4 km sector radius with solid waste clearance equipment.',
      status: ASSIGNMENT_STATUS.VERIFICATION_SUBMITTED,
      assignedAt: new Date('2026-08-03T09:15:00Z'),
      acceptedAt: new Date('2026-08-03T09:30:00Z'),
      completedAt: new Date('2026-08-03T13:00:00Z'),
    });

    const asgn3 = await Assignment.create({
      assignmentId: 'ASGN-2026-0003',
      predictionId: pred3._id,
      officerId: officerWater._id,
      department: 'Water & Drainage',
      distanceKm: 1.1,
      estimatedTravelMinutes: 8,
      currentWorkload: 1,
      departmentMatch: true,
      assignmentScore: 92.0,
      reasoning: 'Direct department match and hydraulic inspection capability.',
      status: ASSIGNMENT_STATUS.VERIFICATION_SUBMITTED,
      assignedAt: new Date('2026-08-04T11:15:00Z'),
      acceptedAt: new Date('2026-08-04T11:30:00Z'),
      completedAt: new Date('2026-08-04T14:30:00Z'),
    });

    const asgn4 = await Assignment.create({
      assignmentId: 'ASGN-2026-0004',
      predictionId: pred4._id,
      officerId: officerElectricity._id,
      department: 'Electricity & Lighting',
      distanceKm: 0.9,
      estimatedTravelMinutes: 7,
      currentWorkload: 1,
      departmentMatch: true,
      assignmentScore: 95.8,
      reasoning: 'Critical risk prediction assigned to nearest electrical field officer.',
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      assignedAt: new Date('2026-08-26T06:15:00Z'),
    });

    // ----------------------------------------------------
    // 8. VERIFICATIONS (ACTUAL OBSERVATIONS)
    // ----------------------------------------------------
    console.log('[Seed] 8/10 Seeding field verification observations...');

    // Verif 1: Scenario 1
    const verif1 = await Verification.create({
      verificationId: 'VERIF-2026-0001',
      predictionId: pred1._id,
      assignmentId: asgn1._id,
      officerId: officerSanitation._id,
      outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
      severity: VERIFICATION_SEVERITY.HIGH,
      notes: 'Confirmed 2 deep potholes with fractured asphalt edge at intersection. Asphalt patch scheduled.',
      evidenceUrl: 'https://storage.civic.gov/demo-evidence/pothole_loop_001.jpg',
      location: { type: 'Point', coordinates: [-87.6295, 41.8789] },
      gpsAvailable: true,
      verifiedAt: new Date('2026-08-02T11:45:00Z'),
    });

    // Verif 2: Scenario 2
    const verif2 = await Verification.create({
      verificationId: 'VERIF-2026-0002',
      predictionId: pred2._id,
      assignmentId: asgn2._id,
      officerId: officerSanitation._id,
      outcome: VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND,
      severity: VERIFICATION_SEVERITY.LOW,
      notes: 'Alleyway thoroughly inspected; no waste overflow observed. Area is clean and clear.',
      evidenceUrl: 'https://storage.civic.gov/demo-evidence/clean_alley_002.jpg',
      location: { type: 'Point', coordinates: [-87.6335, 41.8972] },
      gpsAvailable: true,
      verifiedAt: new Date('2026-08-03T13:00:00Z'),
    });

    // Verif 3: Scenario 3
    const verif3 = await Verification.create({
      verificationId: 'VERIF-2026-0003',
      predictionId: pred3._id,
      assignmentId: asgn3._id,
      officerId: officerWater._id,
      outcome: VERIFICATION_OUTCOMES.DIFFERENT_PROBLEM,
      severity: VERIFICATION_SEVERITY.MEDIUM,
      notes: 'No pipe burst found; however, storm drain grate was clogged with construction silt and debris.',
      evidenceUrl: 'https://storage.civic.gov/demo-evidence/drain_clog_003.jpg',
      location: { type: 'Point', coordinates: [-87.6582, 41.8918] },
      gpsAvailable: true,
      verifiedAt: new Date('2026-08-04T14:30:00Z'),
    });

    // ----------------------------------------------------
    // 9. EVALUATIONS (PREDICTION VS OBSERVATION COMPARISON)
    // ----------------------------------------------------
    console.log('[Seed] 9/10 Seeding evaluation records...');

    // Eval 1: Scenario 1 -> TRUE_POSITIVE
    const eval1 = await Evaluation.create({
      evaluationId: 'EVAL-2026-0001',
      predictionId: pred1._id,
      verificationId: verif1._id,
      predictionOutcome: 'HIGH_RISK_PREDICTED',
      actualOutcome: 'PROBLEM_CONFIRMED',
      classification: EVALUATION_CLASSIFICATION.TRUE_POSITIVE,
      evaluatedAt: new Date('2026-08-02T12:00:00Z'),
    });

    // Eval 2: Scenario 2 -> FALSE_POSITIVE
    const eval2 = await Evaluation.create({
      evaluationId: 'EVAL-2026-0002',
      predictionId: pred2._id,
      verificationId: verif2._id,
      predictionOutcome: 'HIGH_RISK_PREDICTED',
      actualOutcome: 'PROBLEM_NOT_FOUND',
      classification: EVALUATION_CLASSIFICATION.FALSE_POSITIVE,
      evaluatedAt: new Date('2026-08-03T13:15:00Z'),
    });

    // Eval 3: Scenario 3 -> UNDETERMINED
    const eval3 = await Evaluation.create({
      evaluationId: 'EVAL-2026-0003',
      predictionId: pred3._id,
      verificationId: verif3._id,
      predictionOutcome: 'MEDIUM_RISK_PREDICTED',
      actualOutcome: 'DIFFERENT_PROBLEM',
      classification: EVALUATION_CLASSIFICATION.UNDETERMINED,
      evaluatedAt: new Date('2026-08-04T14:45:00Z'),
    });

    // ----------------------------------------------------
    // 10. FEEDBACK (LEARNING SIGNALS)
    // ----------------------------------------------------
    console.log('[Seed] 10/10 Seeding feedback learning signals...');

    // Feedback 1: Verified observation learning signal
    await Feedback.create({
      feedbackId: 'FDBK-2026-0001',
      predictionId: pred1._id,
      verificationId: verif1._id,
      evaluationId: eval1._id,
      predictionCycleId: pastCycle._id,
      feedbackType: FEEDBACK_TYPES.VERIFIED_OBSERVATION,
      feedbackStatus: FEEDBACK_STATUS.READY_FOR_MODEL_UPDATE,
      createdAt: new Date('2026-08-02T12:05:00Z'),
    });

    // Feedback 2: False positive signal
    await Feedback.create({
      feedbackId: 'FDBK-2026-0002',
      predictionId: pred2._id,
      verificationId: verif2._id,
      evaluationId: eval2._id,
      predictionCycleId: pastCycle._id,
      feedbackType: FEEDBACK_TYPES.FALSE_POSITIVE_SIGNAL,
      feedbackStatus: FEEDBACK_STATUS.READY_FOR_MODEL_UPDATE,
      createdAt: new Date('2026-08-03T13:20:00Z'),
    });

    // Feedback 3: Data quality / different problem signal
    await Feedback.create({
      feedbackId: 'FDBK-2026-0003',
      predictionId: pred3._id,
      verificationId: verif3._id,
      evaluationId: eval3._id,
      predictionCycleId: pastCycle._id,
      feedbackType: FEEDBACK_TYPES.DATA_QUALITY_ISSUE,
      feedbackStatus: FEEDBACK_STATUS.PENDING,
      createdAt: new Date('2026-08-04T14:50:00Z'),
    });

    console.log('====================================================');
    console.log('[Seed] Database successfully seeded with 10 collections!');
    console.log('  - users:', await User.countDocuments());
    console.log('  - officers:', await Officer.countDocuments());
    console.log('  - historical_complaints:', await HistoricalComplaint.countDocuments());
    console.log('  - prediction_cycles:', await PredictionCycle.countDocuments());
    console.log('  - predictions:', await Prediction.countDocuments());
    console.log('  - assignments:', await Assignment.countDocuments());
    console.log('  - verifications:', await Verification.countDocuments());
    console.log('  - evaluations:', await Evaluation.countDocuments());
    console.log('  - feedback:', await Feedback.countDocuments());
    console.log('  - system_settings:', await SystemSetting.countDocuments());
    console.log('====================================================');
  } catch (error) {
    console.error('[Seed Error] Database seeding failed:', error);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async () => {
      await disconnectDB();
      process.exit(1);
    });
}

module.exports = seedDatabase;
