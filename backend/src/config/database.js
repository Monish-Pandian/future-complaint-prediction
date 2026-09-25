const mongoose = require('mongoose');

// Detect if process was invoked in test mode
if (!process.env.NODE_ENV && (
  process.execArgv.includes('--test') ||
  (process.argv && process.argv.some((arg) => typeof arg === 'string' && arg.includes('test')))
)) {
  process.env.NODE_ENV = 'test';
}

/**
 * Asserts that the currently connected database is safe for destructive test operations.
 * Aborts immediately if connected to production 'civic_forecasting'.
 */
const assertTestDatabase = () => {
  const dbName = mongoose.connection?.name || mongoose.connection?.db?.databaseName;
  if (!dbName || dbName === 'civic_forecasting') {
    throw new Error(
      `[CRITICAL SAFETY VIOLATION] Destructive operation rejected! Connected database is "${dbName}". Destructive cleanup is strictly prohibited on the operational database.`
    );
  }
  if (dbName !== 'civic_forecasting_test') {
    throw new Error(
      `[CRITICAL SAFETY VIOLATION] Destructive operation rejected! Current database is "${dbName}", expected "civic_forecasting_test".`
    );
  }
};

/**
 * Connect to MongoDB database safely
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    return mongoose.connection;
  }

  let mongoUri;
  if (process.env.NODE_ENV === 'test') {
    mongoUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting_test';
    // Extra safety guarantee: Never allow test environment to point to operational civic_forecasting
    if (mongoUri.endsWith('/civic_forecasting') || mongoUri.includes('/civic_forecasting?')) {
      mongoUri = mongoUri.replace('/civic_forecasting', '/civic_forecasting_test');
    }
  } else {
    mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(
      `[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`
    );

    // Listen for database runtime events
    mongoose.connection.on('error', (err) => {
      console.error(`[Database] Runtime connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] Connection lost / disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] Reconnected to MongoDB');
    });

    return conn;
  } catch (error) {
    console.error(`[Database] Initial MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Graceful MongoDB disconnection
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('[Database] MongoDB connection closed gracefully.');
    }
  } catch (error) {
    console.error(`[Database] Error during MongoDB disconnection: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  assertTestDatabase,
};

