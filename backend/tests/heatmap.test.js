const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../src/models/Prediction');

describe('Heatmap & Geospatial API Module Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminUser;
  let adminToken;

  let officerAUser;
  let officerADoc;
  let officerAToken;

  let officerBUser;
  let officerBDoc;
  let officerBToken;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Cleanup previous test artifacts
    await User.deleteMany({ email: /@testmap\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-MAP-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-MAP-PRED-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Admin
    adminUser = await User.create({
      name: 'Heatmap Admin',
      email: 'admin@testmap.civic',
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Officer A (Streets & Sanitation - Center Downtown: [77.5945, 12.9716])
    officerAUser = await User.create({
      name: 'Officer Map Sanitation',
      email: 'sanitation@testmap.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-MAP-OFF-A',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    officerADoc = await Officer.create({
      officerId: 'TEST-MAP-OFF-A',
      userId: officerAUser._id,
      employeeCode: 'TEST-MAP-EMP-A',
      name: 'Officer Map Sanitation',
      department: 'Streets & Sanitation',
      location: { type: 'Point', coordinates: [77.5945, 12.9716] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 1,
      active: true,
    });
    officerAToken = jwt.sign(
      { userId: officerAUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-MAP-OFF-A' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Officer B (Water & Drainage)
    officerBUser = await User.create({
      name: 'Officer Map Water',
      email: 'water@testmap.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-MAP-OFF-B',
      department: 'Water & Drainage',
      isActive: true,
    });
    officerBDoc = await Officer.create({
      officerId: 'TEST-MAP-OFF-B',
      userId: officerBUser._id,
      employeeCode: 'TEST-MAP-EMP-B',
      name: 'Officer Map Water',
      department: 'Water & Drainage',
      location: { type: 'Point', coordinates: [77.58, 12.99] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 0,
      active: true,
    });
    officerBToken = jwt.sign(
      { userId: officerBUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-MAP-OFF-B' },
      secret,
      { expiresIn: '1h' }
    );

    // 4. Create Predictions with GeoJSON coordinates
    // Pred 1: Downtown Bangalore ([77.595, 12.972]) - Streets & Sanitation - HIGH
    await Prediction.create({
      predictionId: 'TEST-MAP-PRED-001',
      complaintType: 'Pothole Risk Cluster',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown Central',
      ward: 'Ward 101',
      location: { type: 'Point', coordinates: [77.595, 12.972] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.93,
      riskScore: 91.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerADoc._id,
    });

    // Pred 2: Near Downtown ([77.597, 12.974]) - Streets & Sanitation - CRITICAL
    await Prediction.create({
      predictionId: 'TEST-MAP-PRED-002',
      complaintType: 'Solid Waste Accumulation Wave',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown East',
      ward: 'Ward 102',
      location: { type: 'Point', coordinates: [77.597, 12.974] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      probability: 0.96,
      riskScore: 94.0,
      riskLevel: RISK_LEVELS.CRITICAL,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerADoc._id,
    });

    // Pred 3: North Bangalore ([77.581, 12.991]) - Water & Drainage - HIGH (~3 km away)
    await Prediction.create({
      predictionId: 'TEST-MAP-PRED-003',
      complaintType: 'Water Main Leak Surge',
      department: 'Water & Drainage',
      communityArea: 'North Hills',
      ward: 'Ward 501',
      location: { type: 'Point', coordinates: [77.581, 12.991] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      probability: 0.89,
      riskScore: 86.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerBDoc._id,
    });

    // Pred 4: Far Outlying Area ([77.75, 13.15]) - Electricity - LOW (~25 km away)
    await Prediction.create({
      predictionId: 'TEST-MAP-PRED-004',
      complaintType: 'Transformer Overload',
      department: 'Electricity',
      communityArea: 'Far Outpost',
      ward: 'Ward 901',
      location: { type: 'Point', coordinates: [77.75, 13.15] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      probability: 0.40,
      riskScore: 38.0,
      riskLevel: RISK_LEVELS.LOW,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@testmap\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-MAP-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-MAP-PRED-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // ADMIN HEATMAP TESTS
  // ----------------------------------------------------
  it('Admin can retrieve global heatmap as GeoJSON FeatureCollection', async () => {
    const res = await fetch(`${baseUrl}/admin/heatmap`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.type, 'FeatureCollection');
    assert.ok(Array.isArray(data.data.features));
    assert.ok(Array.isArray(data.data.points));
    assert.ok(data.data.totalFeatures >= 4);

    // Verify properties of first feature
    const feature = data.data.features[0];
    assert.strictEqual(feature.type, 'Feature');
    assert.strictEqual(feature.geometry.type, 'Point');
    assert.strictEqual(feature.geometry.coordinates.length, 2);
    assert.strictEqual(typeof feature.geometry.coordinates[0], 'number'); // longitude
    assert.strictEqual(typeof feature.geometry.coordinates[1], 'number'); // latitude

    // Verify required response schema fields
    const prop = feature.properties;
    assert.ok(prop.predictionId);
    assert.strictEqual(typeof prop.latitude, 'number');
    assert.strictEqual(typeof prop.longitude, 'number');
    assert.ok(prop.communityArea);
    assert.ok(prop.ward);
    assert.ok(prop.department);
    assert.ok(prop.complaintType);
    assert.strictEqual(typeof prop.riskScore, 'number');
    assert.ok(prop.riskLevel);
    assert.strictEqual(typeof prop.probability, 'number');
    assert.ok(prop.predictionWindow);
    assert.ok(prop.predictionWindow.start);
    assert.ok(prop.verificationStatus);
  });

  it('Admin heatmap filters by department, riskLevel, and ward', async () => {
    const res = await fetch(
      `${baseUrl}/admin/heatmap?department=Streets%20%26%20Sanitation&riskLevel=CRITICAL&ward=Ward%20102`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.features.length, 1);
    assert.strictEqual(data.data.features[0].properties.predictionId, 'TEST-MAP-PRED-002');
    assert.strictEqual(data.data.features[0].properties.riskLevel, 'CRITICAL');
  });

  it('Admin heatmap rejects Officer access (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/heatmap`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
  });

  it('Admin heatmap rejects unauthenticated access (401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/admin/heatmap`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  // ----------------------------------------------------
  // OFFICER HEATMAP TESTS (DEPARTMENT ISOLATION)
  // ----------------------------------------------------
  it('Officer A receives only Streets & Sanitation heatmap points', async () => {
    const res = await fetch(`${baseUrl}/officer/heatmap`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.type, 'FeatureCollection');

    for (const f of data.data.features) {
      assert.strictEqual(f.properties.department, 'Streets & Sanitation');
    }
  });

  it('Officer A cannot view other departments by tampering with query parameter', async () => {
    const res = await fetch(
      `${baseUrl}/officer/heatmap?department=Water%20%26%20Drainage`,
      {
        headers: { Authorization: `Bearer ${officerAToken}` },
      }
    );
    const data = await res.json();

    // Must be either forbidden by middleware or locked strictly to officer's own department
    if (res.status === 200) {
      for (const f of data.data.features) {
        assert.strictEqual(f.properties.department, 'Streets & Sanitation');
      }
    } else {
      assert.strictEqual(res.status, 403);
    }
  });

  it('Officer B receives only Water & Drainage heatmap points', async () => {
    const res = await fetch(`${baseUrl}/officer/heatmap`, {
      headers: { Authorization: `Bearer ${officerBToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    for (const f of data.data.features) {
      assert.strictEqual(f.properties.department, 'Water & Drainage');
    }
  });

  // ----------------------------------------------------
  // NEARBY GEOSPATIAL HEATMAP TESTS
  // ----------------------------------------------------
  it('GET /api/v1/heatmap/nearby returns nearby predictions within radius', async () => {
    // Center Downtown: lat=12.9716, lon=77.5945, radius=2 km
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=12.9716&longitude=77.5945&radius=2`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.type, 'FeatureCollection');
    assert.ok(data.data.meta.radiusKm, 2);

    // Nearby should include Pred 1 and Pred 2, but NOT Pred 4 (25 km away)
    const predIds = data.data.features.map((f) => f.properties.predictionId);
    assert.ok(predIds.includes('TEST-MAP-PRED-001'));
    assert.ok(predIds.includes('TEST-MAP-PRED-002'));
    assert.ok(!predIds.includes('TEST-MAP-PRED-004'));
  });

  it('GET /api/v1/heatmap/nearby with larger radius returns all predictions in radius', async () => {
    // Radius 30 km includes far outpost Pred 4
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=12.9716&longitude=77.5945&radius=30`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    const predIds = data.data.features.map((f) => f.properties.predictionId);
    assert.ok(predIds.includes('TEST-MAP-PRED-004'));
  });

  // ----------------------------------------------------
  // COORDINATE & RADIUS VALIDATION (ERROR HANDLING)
  // ----------------------------------------------------
  it('Nearby query rejects invalid latitude > 90 (400 Bad Request)', async () => {
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=95.5&longitude=77.5945`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid latitude'));
  });

  it('Nearby query rejects invalid latitude < -90 (400 Bad Request)', async () => {
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=-95.5&longitude=77.5945`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid latitude'));
  });

  it('Nearby query rejects invalid longitude > 180 (400 Bad Request)', async () => {
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=12.97&longitude=195.2`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid longitude'));
  });

  it('Nearby query rejects invalid longitude < -180 (400 Bad Request)', async () => {
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=12.97&longitude=-195.2`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid longitude'));
  });

  it('Nearby query rejects non-numeric coordinates (400 Bad Request)', async () => {
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=invalid_lat&longitude=invalid_lon`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Valid latitude parameter is required'));
  });

  it('Nearby query rejects missing coordinates (400 Bad Request)', async () => {
    const res = await fetch(`${baseUrl}/heatmap/nearby`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  it('Nearby query rejects excessive radius exceeding 50 km (400 Bad Request)', async () => {
    const res = await fetch(
      `${baseUrl}/heatmap/nearby?latitude=12.97&longitude=77.59&radius=100`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('exceeds the maximum allowed search limit'));
  });
});
