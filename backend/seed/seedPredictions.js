require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/database');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS, TRENDS } = require('../src/models/Prediction');
const { Officer } = require('../src/models/Officer');

const demoPredictions = [
  {
    predictionId: 'PRED-2026-0001',
    complaintType: 'Pothole Cluster',
    department: 'Streets & Sanitation',
    communityArea: 'Downtown Central',
    ward: 'Ward 1',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
    },
    predictionDate: new Date(),
    predictionWindowStart: new Date(),
    predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    probability: 0.92,
    riskScore: 94.5,
    riskLevel: RISK_LEVELS.CRITICAL,
    historicalCount: 42,
    recentCount: 14,
    trend: TRENDS.INCREASING,
    confidence: 0.89,
    verificationStatus: VERIFICATION_STATUS.ASSIGNED,
  },
  {
    predictionId: 'PRED-2026-0002',
    complaintType: 'Water Main Leakage Risk',
    department: 'Water',
    communityArea: 'North District',
    ward: 'Ward 4',
    location: {
      type: 'Point',
      coordinates: [77.5806, 12.9916],
    },
    predictionDate: new Date(),
    predictionWindowStart: new Date(),
    predictionWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    probability: 0.81,
    riskScore: 82.0,
    riskLevel: RISK_LEVELS.HIGH,
    historicalCount: 28,
    recentCount: 9,
    trend: TRENDS.INCREASING,
    confidence: 0.85,
    verificationStatus: VERIFICATION_STATUS.PENDING_VERIFICATION,
  },
  {
    predictionId: 'PRED-2026-0003',
    complaintType: 'Street Lighting Grid Failure',
    department: 'Electricity',
    communityArea: 'West Hills',
    ward: 'Ward 8',
    location: {
      type: 'Point',
      coordinates: [77.5501, 12.9602],
    },
    predictionDate: new Date(),
    predictionWindowStart: new Date(),
    predictionWindowEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    probability: 0.65,
    riskScore: 61.2,
    riskLevel: RISK_LEVELS.MEDIUM,
    historicalCount: 15,
    recentCount: 4,
    trend: TRENDS.STABLE,
    confidence: 0.78,
    verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
  },
  {
    predictionId: 'PRED-2026-0004',
    complaintType: 'Traffic Signal Delay Pattern',
    department: 'Traffic',
    communityArea: 'South Corridor',
    ward: 'Ward 12',
    location: {
      type: 'Point',
      coordinates: [77.6105, 12.9304],
    },
    predictionDate: new Date(),
    predictionWindowStart: new Date(),
    predictionWindowEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    probability: 0.42,
    riskScore: 38.0,
    riskLevel: RISK_LEVELS.LOW,
    historicalCount: 8,
    recentCount: 2,
    trend: TRENDS.DECREASING,
    confidence: 0.72,
    verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
  },
  {
    predictionId: 'PRED-2026-0005',
    complaintType: 'Garbage Disposal Overflow Risk',
    department: 'Streets & Sanitation',
    communityArea: 'East Industrial Zone',
    ward: 'Ward 6',
    location: {
      type: 'Point',
      coordinates: [77.6322, 12.9811],
    },
    predictionDate: new Date(),
    predictionWindowStart: new Date(),
    predictionWindowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    probability: 0.88,
    riskScore: 89.0,
    riskLevel: RISK_LEVELS.HIGH,
    historicalCount: 35,
    recentCount: 12,
    trend: TRENDS.INCREASING,
    confidence: 0.88,
    verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
  },
];

const seedPredictions = async () => {
  try {
    await connectDB();

    console.log('[Seed] Seeding sample Predicted Problems...');

    // Optionally assign first prediction to any existing officer
    const sampleOfficer = await Officer.findOne({ active: true });

    for (const pred of demoPredictions) {
      const existing = await Prediction.findOne({ predictionId: pred.predictionId });
      if (!existing) {
        if (pred.verificationStatus === VERIFICATION_STATUS.ASSIGNED && sampleOfficer) {
          pred.assignedOfficer = sampleOfficer._id;
        }
        await Prediction.create(pred);
        console.log(`[Seed] Created Predicted Problem: ${pred.predictionId} (${pred.complaintType})`);
      } else {
        console.log(`[Seed] Predicted Problem ${pred.predictionId} already exists.`);
      }
    }

    console.log('[Seed] Prediction seeding completed.');
  } catch (error) {
    console.error(`[Seed] Failed to seed predictions: ${error.message}`);
  } finally {
    if (require.main === module) {
      await disconnectDB();
    }
  }
};

if (require.main === module) {
  seedPredictions();
}

module.exports = seedPredictions;
