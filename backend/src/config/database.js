const mongoose = require('mongoose');

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

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';

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
};
