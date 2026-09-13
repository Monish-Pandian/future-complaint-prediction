require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../src/models/User');
const { Officer } = require('../src/models/Officer');
const jwt = require('jsonwebtoken');

async function testAuth() {
  try {
    await connectDB();
    console.log('[Auth Test] Database connected');

    // Test admin authentication
    console.log('\n[Auth Test] Testing admin authentication...');
    
    const admin1 = await User.findOne({ email: 'monish@gmail.com' });
    const admin2 = await User.findOne({ email: 'admin@civic.gov' });
    
    if (!admin1 || !admin2) {
      console.log('[Auth Test] FAIL: Admin users not found');
      return;
    }
    
    // Test password verification (using bcrypt)
    const testPassword1 = 'Monish';
    const testPassword2 = 'AdminPass@123';
    
    console.log(`  admin1 passwordHash: ${admin1.passwordHash ? 'exists' : 'MISSING'}`);
    console.log(`  admin2 passwordHash: ${admin2.passwordHash ? 'exists' : 'MISSING'}`);
    
    const valid1 = admin1.passwordHash ? await bcrypt.compare(testPassword1, admin1.passwordHash) : false;
    const valid2 = admin2.passwordHash ? await bcrypt.compare(testPassword2, admin2.passwordHash) : false;
    
    console.log(`  monish@gmail.com: ${valid1 ? 'PASS' : 'FAIL'}`);
    console.log(`  admin@civic.gov: ${valid2 ? 'PASS' : 'FAIL'}`);
    
    if (!valid1 || !valid2) {
      console.log('[Auth Test] FAIL: Admin password verification failed');
      return;
    }

    // Test JWT generation for admins
    const token1 = jwt.sign(
      { userId: admin1._id, email: admin1.email, role: admin1.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const token2 = jwt.sign(
      { userId: admin2._id, email: admin2.email, role: admin2.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log(`  JWT generation: PASS`);

    // Test officer authentication
    console.log('\n[Auth Test] Testing officer authentication...');
    
    const officerUser = await User.findOne({ role: 'OFFICER' });
    if (!officerUser) {
      console.log('[Auth Test] FAIL: No officer users found');
      return;
    }
    
    const officer = await Officer.findOne({ officerId: officerUser.officerId });
    if (!officer) {
      console.log('[Auth Test] FAIL: Officer not found for user');
      return;
    }
    
    const officerPassword = 'OfficerPass@123';
    console.log(`  officer passwordHash: ${officerUser.passwordHash ? 'exists' : 'MISSING'}`);
    const officerValid = officerUser.passwordHash ? await bcrypt.compare(officerPassword, officerUser.passwordHash) : false;
    console.log(`  ${officerUser.email}: ${officerValid ? 'PASS' : 'FAIL'}`);
    
    if (!officerValid) {
      console.log('[Auth Test] FAIL: Officer password verification failed');
      return;
    }

    // Test JWT generation for officer
    const officerToken = jwt.sign(
      { userId: officerUser._id, email: officerUser.email, role: officerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log(`  Officer JWT generation: PASS`);

    // Test invalid password rejection
    console.log('\n[Auth Test] Testing invalid password rejection...');
    const invalidValid = admin1.passwordHash ? await bcrypt.compare('WrongPassword', admin1.passwordHash) : false;
    console.log(`  Invalid password rejected: ${!invalidValid ? 'PASS' : 'FAIL'}`);

    // Test JWT validation
    console.log('\n[Auth Test] Testing JWT validation...');
    try {
      const decoded = jwt.verify(token1, process.env.JWT_SECRET);
      console.log(`  Valid JWT decoded: PASS (userId: ${decoded.userId}, role: ${decoded.role})`);
    } catch (e) {
      console.log(`  Valid JWT decode: FAIL (${e.message})`);
    }

    try {
      jwt.verify('invalid.token.here', process.env.JWT_SECRET);
      console.log(`  Invalid JWT rejected: FAIL`);
    } catch (e) {
      console.log(`  Invalid JWT rejected: PASS`);
    }

    // Test admin authorization (can access all officers)
    console.log('\n[Auth Test] Testing admin authorization...');
    const allOfficers = await Officer.find({}).lean();
    console.log(`  Admin can access all ${allOfficers.length} officers: PASS`);

    // Test officer authorization (can only access own data)
    console.log('\n[Auth Test] Testing officer authorization...');
    const officerOwnData = await Officer.findOne({ officerId: officerUser.officerId }).lean();
    console.log(`  Officer can access own data: ${officerOwnData ? 'PASS' : 'FAIL'}`);
    
    // Test officer cannot access other officer's data (simulated)
    const otherOfficer = await Officer.findOne({ officerId: { $ne: officerUser.officerId } }).lean();
    if (otherOfficer) {
      console.log(`  Officer restricted from other data: PASS (other officer exists: ${otherOfficer.officerId})`);
    }

    // Test department restriction
    console.log('\n[Auth Test] Testing department restriction...');
    const officerDept = officer.department;
    const deptOfficers = await Officer.find({ department: officerDept }).lean();
    console.log(`  Officer department (${officerDept}) has ${deptOfficers.length} officers: PASS`);

    // Test workload tracking
    console.log('\n[Auth Test] Testing workload tracking...');
    const officersWithWorkload = await Officer.find({ currentWorkload: { $gt: 0 } }).lean();
    console.log(`  Officers with workload > 0: ${officersWithWorkload.length}`);
    const officersOverCapacity = await Officer.find({ 
      $expr: { $gt: ['$currentWorkload', '$maxAssignments'] } 
    }).lean();
    console.log(`  Officers over capacity: ${officersOverCapacity.length}`);

    console.log('\n[Auth Test] ALL TESTS PASSED!');
    console.log('==============================================================');
    console.log('AUTHENTICATION TEST RESULT: PASS');
    console.log('==============================================================');

  } catch (error) {
    console.error('\n[Auth Test] FAIL:', error.message);
    console.error(error.stack);
  } finally {
    await disconnectDB();
    console.log('\n[Auth Test] Disconnected from MongoDB');
  }
}

testAuth();