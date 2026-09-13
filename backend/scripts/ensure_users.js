const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES, Officer, AVAILABILITY_STATUS } = require('../src/models');

async function ensurePermanentUsers() {
  console.log('====================================================');
  console.log('[Security] Ensuring Permanent Admin & Officer Accounts');
  console.log('====================================================');

  await connectDB();

  try {
    const salt = await bcrypt.genSalt(10);

    // 1. Ensure Admin: monish@gmail.com / Monish
    const monishHash = await bcrypt.hash('Monish', salt);
    let monishUser = await User.findOne({ email: 'monish@gmail.com' });

    if (!monishUser) {
      monishUser = await User.create({
        name: 'Monish',
        email: 'monish@gmail.com',
        passwordHash: monishHash,
        role: ROLES.ADMIN,
        isActive: true,
      });
      console.log('✓ Created Admin user: monish@gmail.com');
    } else {
      monishUser.passwordHash = monishHash;
      monishUser.role = ROLES.ADMIN;
      monishUser.isActive = true;
      await monishUser.save();
      console.log('✓ Verified & Updated Admin user: monish@gmail.com');
    }

    // Verify bcrypt comparison for Monish
    const isMonishMatch = await bcrypt.compare('Monish', monishUser.passwordHash);
    console.log(`  Password verification ('Monish'): ${isMonishMatch ? 'MATCH (SUCCESS)' : 'FAILED'}`);

    // 2. Ensure Officer: sanjay@gmail.com / Sanjay
    const sanjayHash = await bcrypt.hash('Sanjay', salt);
    let sanjayUser = await User.findOne({ email: 'sanjay@gmail.com' });

    if (!sanjayUser) {
      sanjayUser = await User.create({
        name: 'Officer Sanjay',
        email: 'sanjay@gmail.com',
        passwordHash: sanjayHash,
        role: ROLES.OFFICER,
        officerId: 'OFF-SANJAY',
        department: 'Streets & Sanitation',
        isActive: true,
      });
      console.log('✓ Created Officer user: sanjay@gmail.com');
    } else {
      sanjayUser.passwordHash = sanjayHash;
      sanjayUser.role = ROLES.OFFICER;
      sanjayUser.officerId = 'OFF-SANJAY';
      sanjayUser.department = 'Streets & Sanitation';
      sanjayUser.isActive = true;
      await sanjayUser.save();
      console.log('✓ Verified & Updated Officer user: sanjay@gmail.com');
    }

    // Verify bcrypt comparison for Sanjay
    const isSanjayMatch = await bcrypt.compare('Sanjay', sanjayUser.passwordHash);
    console.log(`  Password verification ('Sanjay'): ${isSanjayMatch ? 'MATCH (SUCCESS)' : 'FAILED'}`);

    // 3. Ensure Officer Document for Sanjay
    let sanjayOfficer = await Officer.findOne({ officerId: 'OFF-SANJAY' });
    if (!sanjayOfficer) {
      sanjayOfficer = await Officer.create({
        officerId: 'OFF-SANJAY',
        userId: sanjayUser._id,
        employeeCode: 'EMP-SANJAY',
        name: 'Officer Sanjay',
        department: 'Streets & Sanitation',
        phone: '+1-312-555-0199',
        skills: ['Pothole Repair', 'Asphalt Assessment', 'Sanitation Inspection'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 2,
        location: {
          type: 'Point',
          coordinates: [-87.6545, 41.8818],
        },
        active: true,
      });
      console.log('✓ Created linked Officer profile: OFF-SANJAY');
    } else {
      sanjayOfficer.userId = sanjayUser._id;
      sanjayOfficer.name = 'Officer Sanjay';
      sanjayOfficer.department = 'Streets & Sanitation';
      sanjayOfficer.active = true;
      await sanjayOfficer.save();
      console.log('✓ Verified linked Officer profile: OFF-SANJAY');
    }

    console.log('====================================================');
    console.log('Permanent Accounts Successfully Configured & Locked');
    console.log('====================================================');
  } catch (error) {
    console.error('Error ensuring accounts:', error);
  } finally {
    await disconnectDB();
  }
}

ensurePermanentUsers();
