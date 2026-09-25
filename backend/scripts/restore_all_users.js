require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../src/models/User');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');
const { CommunityAreaCentroid } = require('../src/models/CommunityAreaCentroid');
const { SystemSetting } = require('../src/models/SystemSetting');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';

const DEPARTMENTS = [
  'Vector Control',
  'Vehicle & Traffic Operations',
  'Sanitation & Recycling',
  'Community Maintenance',
  'Electrical & Lighting',
  'Building & Safety Inspections',
  'Infrastructure Repair',
];

const COMMUNITY_AREAS = Array.from({ length: 77 }, (_, i) => String(i + 1));

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph',
  'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy',
  'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna',
  'Joshua', 'Michelle', 'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda',
  'George', 'Melissa', 'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca',
  'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen',
  'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen',
  'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole',
  'Brandon', 'Emma', 'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine',
  'Frank', 'Debra', 'Alexander', 'Rachel', 'Raymond', 'Carolyn', 'Patrick', 'Janet',
  'Jack', 'Maria', 'Dennis', 'Heather', 'Jerry', 'Diane', 'Tyler', 'Ruth',
  'Aaron', 'Virginia', 'Jose', 'Olivia', 'Henry', 'Joyce', 'Adam', 'Victoria',
  'Douglas', 'Lauren', 'Nathan', 'Christina', 'Peter', 'Joan', 'Zachary', 'Evelyn',
  'Walter', 'Kelly', 'Kyle', 'Lauren', 'Noah', 'Judith', 'Jeremy', 'Megan',
  'Ethan', 'Cheryl', 'Nathaniel', 'Andrea', 'Arthur', 'Hannah', 'Harold', 'Martha',
  'Christian', 'Jacqueline', 'Keith', 'Frances', 'Roger', 'Ann', 'Gerald', 'Jean',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
  'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales',
  'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
  'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward',
  'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray',
  'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel',
  'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry',
  'Russell', 'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales',
];

function getRandomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

async function restoreUsersAndOfficers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] Connected successfully to', mongoose.connection.name);

    // 1. Remove temporary test artifacts created during factory test execution
    console.log('[Cleanup] Removing any leftover @test.civic.gov users and OFF-TEST-* officers...');
    const deletedTestUsers = await User.deleteMany({ email: { $regex: /@test\.civic\.gov$/i } });
    const deletedTestOfficers = await Officer.deleteMany({ officerId: { $regex: /^OFF-TEST-/i } });
    console.log(`[Cleanup] Removed ${deletedTestUsers.deletedCount} test users and ${deletedTestOfficers.deletedCount} test officers.`);

    const salt = await bcrypt.genSalt(10);
    const monishHash = await bcrypt.hash('Monish', salt);
    const adminPassHash = await bcrypt.hash('AdminPass123!', salt);
    const sanjayHash = await bcrypt.hash('Sanjay', salt);
    const officerPassHash = await bcrypt.hash('OfficerPass@123', salt);

    // 2. Restore Core Admins
    console.log('[Restore] Restoring Admin accounts...');
    await User.findOneAndUpdate(
      { email: 'monish@gmail.com' },
      {
        name: 'Monish',
        email: 'monish@gmail.com',
        passwordHash: monishHash,
        role: ROLES.ADMIN,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log('✓ Admin monish@gmail.com verified / restored.');

    await User.findOneAndUpdate(
      { email: 'admin@civic.gov' },
      {
        name: 'Central Admin Director',
        email: 'admin@civic.gov',
        passwordHash: adminPassHash,
        role: ROLES.ADMIN,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log('✓ Admin admin@civic.gov verified / restored.');

    // 3. Restore Sanjay
    console.log('[Restore] Restoring Sanjay officer account...');
    let sanjayUser = await User.findOneAndUpdate(
      { email: 'sanjay@gmail.com' },
      {
        name: 'Sanjay',
        email: 'sanjay@gmail.com',
        passwordHash: sanjayHash,
        role: ROLES.OFFICER,
        officerId: 'OFF-SANJAY',
        department: 'Streets & Sanitation',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    await Officer.findOneAndUpdate(
      { officerId: 'OFF-SANJAY' },
      {
        officerId: 'OFF-SANJAY',
        userId: sanjayUser._id,
        employeeCode: 'EMP-SANJAY',
        name: 'Sanjay',
        department: 'Streets & Sanitation',
        phone: '+1-312-555-0199',
        skills: ['Pothole Repair', 'Asphalt Assessment', 'Sanitation Inspection'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 0,
        maxAssignments: 10,
        location: { type: 'Point', coordinates: [-87.6545, 41.8818] },
        active: true,
      },
      { upsert: true, new: true }
    );
    console.log('✓ Officer sanjay@gmail.com (OFF-SANJAY) verified / restored.');

    // 4. Restore Core Demo Officers
    console.log('[Restore] Restoring Core Demo Officers...');
    const demoOfficers = [
      {
        name: 'Officer Marcus Vance',
        email: 'marcus.vance@civic.gov',
        employeeCode: 'EMP-301',
        officerId: 'OFF-1001',
        department: 'Streets & Sanitation',
        phone: '+1-312-555-0101',
        skills: ['Pothole Repair', 'Asphalt Assessment', 'Debris Clearance'],
        coordinates: [-87.6298, 41.8781],
      },
      {
        name: 'Officer Elena Rostova',
        email: 'elena.rostova@civic.gov',
        employeeCode: 'EMP-302',
        officerId: 'OFF-1002',
        department: 'Water & Drainage',
        phone: '+1-312-555-0102',
        skills: ['Hydraulic Pressure', 'Catch Basin Inspection', 'Leak Detection'],
        coordinates: [-87.6244, 41.8955],
      },
      {
        name: 'Officer Kwame Mensah',
        email: 'kwame.mensah@civic.gov',
        employeeCode: 'EMP-303',
        officerId: 'OFF-1003',
        department: 'Electricity & Lighting',
        phone: '+1-312-555-0103',
        skills: ['Grid Inspection', 'Transformer Diagnostics', 'Wiring Repair'],
        coordinates: [-87.6547, 41.8906],
      },
      {
        name: 'Officer Carlos Rivera',
        email: 'carlos.rivera@civic.gov',
        employeeCode: 'EMP-304',
        officerId: 'OFF-1004',
        department: 'Traffic & Infrastructure',
        phone: '+1-312-555-0104',
        skills: ['Signal Calibration', 'Intersection Safety', 'Signage Repair'],
        coordinates: [-87.5975, 41.7943],
      },
      {
        name: 'Officer Sarah Jenkins',
        email: 'sarah.jenkins@civic.gov',
        employeeCode: 'EMP-305',
        officerId: 'OFF-1005',
        department: 'Municipal',
        phone: '+1-312-555-0105',
        skills: ['Public Safety', 'Bylaw Enforcement', 'Sanitation Inspection'],
        coordinates: [-87.7077, 41.9288],
      },
    ];

    for (const demo of demoOfficers) {
      const user = await User.findOneAndUpdate(
        { email: demo.email },
        {
          name: demo.name,
          email: demo.email,
          passwordHash: officerPassHash,
          role: ROLES.OFFICER,
          officerId: demo.officerId,
          department: demo.department,
          isActive: true,
        },
        { upsert: true, new: true }
      );

      await Officer.findOneAndUpdate(
        { officerId: demo.officerId },
        {
          officerId: demo.officerId,
          userId: user._id,
          employeeCode: demo.employeeCode,
          name: demo.name,
          department: demo.department,
          phone: demo.phone,
          skills: demo.skills,
          availability: AVAILABILITY_STATUS.AVAILABLE,
          currentWorkload: 0,
          maxAssignments: 10,
          location: { type: 'Point', coordinates: demo.coordinates },
          active: true,
        },
        { upsert: true, new: true }
      );
    }
    console.log('✓ Core demo officers restored.');

    // 5. Restore 500 Operational Officers pool
    console.log('[Restore] Checking 500 field officers pool...');
    const centroids = await CommunityAreaCentroid.find({}).lean();
    const centroidMap = new Map();
    for (const c of centroids) {
      centroidMap.set(c.communityArea, { lat: c.latitude, lon: c.longitude });
    }

    const existingOfficerCount = await Officer.countDocuments({
      officerId: { $regex: /^OFF-\d{5}$/ },
    });
    console.log(`[Restore] Currently existing OFF-xxxxx officers: ${existingOfficerCount}`);

    const targetPoolCount = 500;
    const deptSkills = {
      'Vector Control': ['Rodent Control', 'Pest Management', 'Public Health'],
      'Vehicle & Traffic Operations': ['Traffic Management', 'Vehicle Enforcement', 'Accident Response'],
      'Sanitation & Recycling': ['Waste Collection', 'Recycling Operations', 'Cart Maintenance'],
      'Community Maintenance': ['Graffiti Removal', 'Street Cleaning', 'Property Maintenance'],
      'Electrical & Lighting': ['Street Light Repair', 'Electrical Systems', 'Traffic Signal Maintenance'],
      'Building & Safety Inspections': ['Building Code Enforcement', 'Safety Inspections', 'Permit Review'],
      'Infrastructure Repair': ['Pothole Repair', 'Street Maintenance', 'Sidewalk Repair'],
    };

    if (existingOfficerCount < targetPoolCount) {
      console.log(`[Restore] Creating officers up to ${targetPoolCount}...`);
      const existingOfficerIds = new Set((await Officer.distinct('officerId')).map(String));
      const existingEmployeeCodes = new Set((await Officer.distinct('employeeCode')).map(String));
      const existingEmails = new Set((await User.distinct('email')).map(String));

      for (let i = 1; i <= targetPoolCount; i++) {
        const officerId = `OFF-${String(i).padStart(5, '0')}`;
        const employeeCode = `EMP${String(i).padStart(6, '0')}`;
        const userEmail = `${officerId.toLowerCase()}@civic.gov`;

        if (existingOfficerIds.has(officerId) && existingEmails.has(userEmail)) {
          continue;
        }

        const dept = DEPARTMENTS[(i - 1) % DEPARTMENTS.length];
        const homeArea = COMMUNITY_AREAS[(i - 1) % COMMUNITY_AREAS.length];
        const centroid = centroidMap.get(homeArea);
        let location = { type: 'Point', coordinates: [-87.6298, 41.8781] };
        if (centroid) {
          const latOffset = (Math.random() - 0.5) * 0.05;
          const lonOffset = (Math.random() - 0.5) * 0.05;
          location = {
            type: 'Point',
            coordinates: [centroid.lon + lonOffset, centroid.lat + latOffset],
          };
        }

        const officerName = i === 1 ? 'Anthony Mendoza' : getRandomName();

        let userDoc = await User.findOne({ email: userEmail });
        if (!userDoc) {
          userDoc = await User.create({
            name: officerName,
            email: userEmail,
            passwordHash: officerPassHash,
            role: ROLES.OFFICER,
            officerId: officerId,
            department: dept,
            isActive: true,
          });
        }

        let officerDoc = await Officer.findOne({ officerId: officerId });
        if (!officerDoc) {
          await Officer.create({
            officerId,
            employeeCode,
            name: officerName,
            userId: userDoc._id,
            department: dept,
            phone: `312-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
            skills: deptSkills[dept] || ['General Inspection'],
            availability: AVAILABILITY_STATUS.AVAILABLE,
            currentWorkload: 0,
            maxAssignments: 10,
            homeCommunityArea: homeArea,
            active: true,
            location,
          });
        }
      }
      console.log('✓ 500 Field officers ensured.');
    }

    // 6. Ensure SystemSettings
    const settingsCount = await SystemSetting.countDocuments();
    if (settingsCount === 0) {
      console.log('[Restore] Restoring system settings...');
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
          value: 0.38,
          description: 'Minimum probability threshold to trigger automated high risk alerts',
        },
        {
          key: 'supported_departments',
          value: DEPARTMENTS,
          description: 'Authorized municipal service departments participating in the forecasting platform',
        },
      ]);
      console.log('✓ System settings restored.');
    }

    // Final verification
    const totalUsers = await User.countDocuments();
    const totalOfficers = await Officer.countDocuments();
    console.log('==================================================');
    console.log(`[COMPLETED] Total Users in DB: ${totalUsers}`);
    console.log(`[COMPLETED] Total Officers in DB: ${totalOfficers}`);
    console.log('Key Logins Verified:');
    console.log('  Admin 1: monish@gmail.com / Monish');
    console.log('  Admin 2: admin@civic.gov / AdminPass123!');
    console.log('  Officer 1: off-00001@civic.gov / OfficerPass@123');
    console.log('  Officer 2: sanjay@gmail.com / Sanjay');
    console.log('  Officer 3: marcus.vance@civic.gov / OfficerPass@123');
    console.log('==================================================');

  } catch (err) {
    console.error('[Error] Restoration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

restoreUsersAndOfficers();
