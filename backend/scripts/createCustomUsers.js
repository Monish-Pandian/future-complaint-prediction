const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');

async function createCustomUsers() {
  await connectDB();

  try {
    const salt = await bcrypt.genSalt(10);

    // 1. Create / Update Admin: monish@gmail.com / Monish
    const monishPasswordHash = await bcrypt.hash('Monish', salt);
    let adminUser = await User.findOne({ email: 'monish@gmail.com' });
    if (adminUser) {
      adminUser.passwordHash = monishPasswordHash;
      adminUser.role = ROLES.ADMIN;
      adminUser.name = 'Monish';
      adminUser.isActive = true;
      await adminUser.save();
      console.log('✅ Admin monish@gmail.com updated successfully.');
    } else {
      adminUser = await User.create({
        name: 'Monish',
        email: 'monish@gmail.com',
        passwordHash: monishPasswordHash,
        role: ROLES.ADMIN,
        isActive: true,
      });
      console.log('✅ Admin monish@gmail.com created successfully.');
    }

    // 2. Create / Update Officer: sanjay@gmail.com / Sanjay
    const sanjayPasswordHash = await bcrypt.hash('Sanjay', salt);
    let officerUser = await User.findOne({ email: 'sanjay@gmail.com' });
    if (officerUser) {
      officerUser.passwordHash = sanjayPasswordHash;
      officerUser.role = ROLES.OFFICER;
      officerUser.name = 'Sanjay';
      officerUser.officerId = 'OFF-SANJAY';
      officerUser.department = 'Streets & Sanitation';
      officerUser.isActive = true;
      await officerUser.save();
      console.log('✅ Officer user sanjay@gmail.com updated successfully.');
    } else {
      officerUser = await User.create({
        name: 'Sanjay',
        email: 'sanjay@gmail.com',
        passwordHash: sanjayPasswordHash,
        role: ROLES.OFFICER,
        officerId: 'OFF-SANJAY',
        department: 'Streets & Sanitation',
        isActive: true,
      });
      console.log('✅ Officer user sanjay@gmail.com created successfully.');
    }

    // Link or create Officer profile
    let officerDoc = await Officer.findOne({ officerId: 'OFF-SANJAY' });
    if (officerDoc) {
      officerDoc.userId = officerUser._id;
      officerDoc.name = 'Sanjay';
      officerDoc.department = 'Streets & Sanitation';
      officerDoc.active = true;
      await officerDoc.save();
      console.log('✅ Officer profile OFF-SANJAY updated.');
    } else {
      await Officer.create({
        officerId: 'OFF-SANJAY',
        userId: officerUser._id,
        employeeCode: 'EMP-SANJAY',
        name: 'Sanjay',
        department: 'Streets & Sanitation',
        phone: '+1-312-555-0199',
        skills: ['Pothole Repair', 'Asphalt Assessment', 'Sanitation Inspection'],
        availability: AVAILABILITY_STATUS.AVAILABLE,
        currentWorkload: 0,
        location: {
          type: 'Point',
          coordinates: [-87.6298, 41.8781],
        },
        active: true,
      });
      console.log('✅ Officer profile OFF-SANJAY created.');
    }

    console.log('==============================================');
    console.log('CREATION COMPLETE:');
    console.log('Admin:   monish@gmail.com / Monish');
    console.log('Officer: sanjay@gmail.com / Sanjay');
    console.log('==============================================');
  } catch (error) {
    console.error('Error creating custom users:', error);
  } finally {
    await disconnectDB();
  }
}

createCustomUsers();
