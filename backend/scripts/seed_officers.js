require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');
const { CommunityAreaCentroid } = require('../src/models/CommunityAreaCentroid');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';

// Department mapping from assignmentUtils.js
const DEPARTMENTS = [
  'Vector Control',
  'Vehicle & Traffic Operations',
  'Sanitation & Recycling',
  'Community Maintenance',
  'Electrical & Lighting',
  'Building & Safety Inspections',
  'Infrastructure Repair',
];

// Chicago community areas (1-77)
const COMMUNITY_AREAS = Array.from({ length: 77 }, (_, i) => String(i + 1));

// Chicago wards (1-50)
const WARDS = Array.from({ length: 50 }, (_, i) => `Ward ${i + 1}`);

// First names for realistic names
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

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOfficerId(index) {
  return `OFF-${String(index).padStart(5, '0')}`;
}

function generateEmployeeCode(index) {
  return `EMP${String(index).padStart(6, '0')}`;
}

async function seedOfficers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] Connected successfully');

    // Get centroids for geographic distribution
    const centroids = await CommunityAreaCentroid.find({}).lean();
    const centroidMap = new Map();
    for (const c of centroids) {
      centroidMap.set(c.communityArea, { lat: c.latitude, lon: c.longitude });
    }
    console.log(`[Seed] Loaded ${centroids.length} community area centroids`);

    // Check existing officers
    const existingCount = await Officer.countDocuments();
    console.log(`[Seed] Existing officers: ${existingCount}`);

    const targetCount = 500;
    const additionalNeeded = Math.max(0, targetCount - existingCount);
    console.log(`[Seed] Need to create: ${additionalNeeded} additional officers`);

    if (additionalNeeded === 0) {
      console.log('[Seed] Already have 500+ officers. Skipping seed.');
      await mongoose.connection.close();
      return;
    }

    // Get existing officer IDs and employee codes to avoid duplicates
    const existingOfficerIds = new Set((await Officer.distinct('officerId')).map(String));
    const existingEmployeeCodes = new Set((await Officer.distinct('employeeCode')).map(String));

    // Prepare officers for insertion
    const officersToCreate = [];
    let index = existingCount + 1;

    // Distribute across departments evenly
    const officersPerDept = Math.ceil(additionalNeeded / DEPARTMENTS.length);
    
    for (const dept of DEPARTMENTS) {
      const deptCount = Math.min(officersPerDept, additionalNeeded - officersToCreate.length);
      if (deptCount <= 0) break;

      for (let i = 0; i < deptCount; i++) {
        // Generate unique IDs
        let officerId, employeeCode;
        do {
          officerId = generateOfficerId(index);
          index++;
        } while (existingOfficerIds.has(officerId));
        
        do {
          employeeCode = generateEmployeeCode(index);
        } while (existingEmployeeCodes.has(employeeCode));

        existingOfficerIds.add(officerId);
        existingEmployeeCodes.add(employeeCode);

        // Assign home community area (distribute evenly)
        const homeArea = COMMUNITY_AREAS[Math.floor(Math.random() * COMMUNITY_AREAS.length)];
        const centroid = centroidMap.get(homeArea);
        
        // Random location near home area centroid
        let location = { type: 'Point', coordinates: [-87.6298, 41.8781] }; // Default Chicago center
        if (centroid) {
          // Add small random offset (±0.05 degrees ≈ ±5km)
          const latOffset = (Math.random() - 0.5) * 0.1;
          const lonOffset = (Math.random() - 0.5) * 0.1;
          location = {
            type: 'Point',
            coordinates: [
              Math.max(-180, Math.min(180, centroid.lon + lonOffset)),
              Math.max(-90, Math.min(90, centroid.lat + latOffset))
            ],
          };
        }

        const maxAssignments = 5 + Math.floor(Math.random() * 11); // 5-15
        const currentWorkload = Math.floor(Math.random() * (maxAssignments + 1)); // 0 to max
        
        const availabilityRoll = Math.random();
        let availability;
        if (availabilityRoll < 0.7) availability = AVAILABILITY_STATUS.AVAILABLE;
        else if (availabilityRoll < 0.85) availability = AVAILABILITY_STATUS.BUSY;
        else if (availabilityRoll < 0.95) availability = AVAILABILITY_STATUS.ON_LEAVE;
        else availability = AVAILABILITY_STATUS.OFF_DUTY;

        // Skills based on department
        const deptSkills = {
          'Vector Control': ['Rodent Control', 'Pest Management', 'Public Health'],
          'Vehicle & Traffic Operations': ['Traffic Management', 'Vehicle Enforcement', 'Accident Response'],
          'Sanitation & Recycling': ['Waste Collection', 'Recycling Operations', 'Cart Maintenance'],
          'Community Maintenance': ['Graffiti Removal', 'Street Cleaning', 'Property Maintenance'],
          'Electrical & Lighting': ['Street Light Repair', 'Electrical Systems', 'Traffic Signal Maintenance'],
          'Building & Safety Inspections': ['Building Code Enforcement', 'Safety Inspections', 'Permit Review'],
          'Infrastructure Repair': ['Pothole Repair', 'Street Maintenance', 'Sidewalk Repair'],
        };

        const officer = {
          officerId,
          employeeCode,
          name: getRandomName(),
          department: dept,
          phone: `312-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          skills: deptSkills[dept] || [],
          availability,
          currentWorkload,
          maxAssignments,
          homeCommunityArea: homeArea,
          active: true,
          location,
        };

        officersToCreate.push(officer);
      }
    }

    console.log(`[Seed] Prepared ${officersToCreate.length} officers for insertion`);

    // Insert in batches
    const BATCH_SIZE = 100;
    let inserted = 0;
    
    for (let i = 0; i < officersToCreate.length; i += BATCH_SIZE) {
      const batch = officersToCreate.slice(i, i + BATCH_SIZE);
      try {
        await Officer.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`[Seed] Inserted ${inserted}/${officersToCreate.length} officers...`);
      } catch (err) {
        if (err.writeErrors) {
          inserted += batch.length - err.writeErrors.length;
          console.log(`[Seed] Batch partial success: ${batch.length - err.writeErrors.length}/${batch.length}`);
        } else {
          console.error(`[Seed] Batch error: ${err.message}`);
        }
      }
    }

    const finalCount = await Officer.countDocuments();
    console.log(`\n[Seed] Complete!`);
    console.log(`[Seed] Officers before: ${existingCount}`);
    console.log(`[Seed] Officers added: ${inserted}`);
    console.log(`[Seed] Total officers now: ${finalCount}`);

    // Distribution report
    const deptDist = await Officer.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('\n[Seed] Department Distribution:');
    deptDist.forEach(d => console.log(`  ${d._id}: ${d.count}`));

    const areaDist = await Officer.aggregate([
      { $match: { homeCommunityArea: { $ne: null, $ne: '' } } },
      { $group: { _id: '$homeCommunityArea', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('\n[Seed] Community Area Distribution (top 15):');
    areaDist.slice(0, 15).forEach(a => console.log(`  Area ${a._id}: ${a.count}`));

    const workloadStats = await Officer.aggregate([
      { $group: {
        _id: null,
        avgWorkload: { $avg: '$currentWorkload' },
        maxWorkload: { $max: '$currentWorkload' },
        avgMaxAssignments: { $avg: '$maxAssignments' },
        overCapacity: { $sum: { $cond: [{ $gt: ['$currentWorkload', '$maxAssignments'] }, 1, 0] } },
        available: { $sum: { $cond: [{ $eq: ['$availability', 'AVAILABLE'] }, 1, 0] } },
        busy: { $sum: { $cond: [{ $eq: ['$availability', 'BUSY'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$availability', 'ON_LEAVE'] }, 1, 0] } },
        offDuty: { $sum: { $cond: [{ $eq: ['$availability', 'OFF_DUTY'] }, 1, 0] } },
      }}
    ]);
    console.log('\n[Seed] Workload & Availability Stats:');
    console.log(JSON.stringify(workloadStats[0] || {}, null, 2));

    const uniqueOfficerIds = await Officer.distinct('officerId');
    console.log(`\n[Seed] Unique officerIds: ${uniqueOfficerIds.length}`);
    
    const uniqueEmployeeCodes = await Officer.distinct('employeeCode');
    console.log(`[Seed] Unique employeeCodes: ${uniqueEmployeeCodes.length}`);

  } catch (error) {
    console.error('[Seed] Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('[Database] Connection closed');
  }
}

seedOfficers();