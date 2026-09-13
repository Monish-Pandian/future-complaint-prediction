require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');

const seedRequestedUsers = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to MongoDB database.');

    const salt = await bcrypt.genSalt(10);

    // 1. Create or Update Admin: monish@gmail.com / Monish
    const adminEmail = 'monish@gmail.com';
    const adminPassword = 'Monish';
    const adminHash = await bcrypt.hash(adminPassword, salt);

    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      admin.name = 'Monish';
      admin.passwordHash = adminHash;
      admin.role = ROLES.ADMIN;
      admin.isActive = true;
      await admin.save();
      console.log(`[Seed] Updated existing Admin user: ${adminEmail} (Role: ADMIN)`);
    } else {
      admin = await User.create({
        name: 'Monish',
        email: adminEmail,
        passwordHash: adminHash,
        role: ROLES.ADMIN,
        isActive: true,
      });
      console.log(`[Seed] Created new Admin user: ${adminEmail} (ID: ${admin._id})`);
    }

    // 2. Create or Update Officer: sanjay@gmail.com / Sanjay
    const officerEmail = 'sanjay@gmail.com';
    const officerPassword = 'Sanjay';
    const officerHash = await bcrypt.hash(officerPassword, salt);
    const officerDept = 'Public Works';

    let officerUser = await User.findOne({ email: officerEmail });
    if (officerUser) {
      officerUser.name = 'Sanjay';
      officerUser.passwordHash = officerHash;
      officerUser.role = ROLES.OFFICER;
      officerUser.department = officerDept;
      officerUser.isActive = true;
      await officerUser.save();
      console.log(`[Seed] Updated existing Officer user: ${officerEmail} (Role: OFFICER)`);
    } else {
      officerUser = await User.create({
        name: 'Sanjay',
        email: officerEmail,
        passwordHash: officerHash,
        role: ROLES.OFFICER,
        department: officerDept,
        isActive: true,
      });
      console.log(`[Seed] Created new Officer user: ${officerEmail} (ID: ${officerUser._id})`);
    }

    // Ensure corresponding Officer record in Officer collection for assignment operations
    let officerRecord = await Officer.findOne({ employeeCode: 'OFF-SANJAY' });
    if (!officerRecord) {
      officerRecord = await Officer.create({
        officerId: 'OFF-' + officerUser._id.toString().slice(-6).toUpperCase(),
        userId: officerUser._id,
        employeeCode: 'OFF-SANJAY',
        name: 'Sanjay',
        department: officerDept,
        skills: ['ROADS', 'SANITATION', 'INFRASTRUCTURE'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        location: {
          type: 'Point',
          coordinates: [80.2707, 13.0827], // Default city center coordinates
        },
        maxCapacity: 10,
        currentWorkload: 0,
      });
      console.log(`[Seed] Linked Officer profile created: ${officerRecord.officerId}`);
    } else {
      officerRecord.userId = officerUser._id;
      officerRecord.name = 'Sanjay';
      officerRecord.department = officerDept;
      await officerRecord.save();
      console.log(`[Seed] Linked Officer profile updated: ${officerRecord.officerId}`);
    }

    officerUser.officerId = officerRecord.officerId;
    await officerUser.save();

    console.log('---------------------------------------------------------');
    console.log('[Seed] Credentials successfully inserted into database:');
    console.log('  1. ADMIN:   Email: monish@gmail.com | Password: Monish');
    console.log('  2. OFFICER: Email: sanjay@gmail.com | Password: Sanjay');
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.error(`[Seed] Error inserting users: ${error.message}`);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  seedRequestedUsers();
}

module.exports = seedRequestedUsers;
