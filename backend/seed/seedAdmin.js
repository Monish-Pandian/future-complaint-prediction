require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');

/**
 * Provision default Admin user
 */
const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@civic.gov').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || 'Municipal System Administrator';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`[Seed] Admin user (${adminEmail}) already exists. Ensuring ADMIN role.`);
      existingAdmin.role = ROLES.ADMIN;
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('[Seed] Admin user verified.');
      await disconnectDB();
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });

    console.log(`[Seed] Successfully provisioned Admin user: ${adminUser.email} (ID: ${adminUser._id})`);
    console.log(`[Seed] Temporary Credentials: Email: ${adminEmail} | Password: ${adminPassword}`);
  } catch (error) {
    console.error(`[Seed] Failed to seed admin user: ${error.message}`);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
