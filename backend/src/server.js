require('dotenv').config();

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const { initializeServices, shutdownServices } = require('./services/initServices');

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
let server;

const startServer = async () => {
  try {
    // Initialize Database Connection
    await connectDB();

    // Initialize Application Services (retraining scheduler, etc.)
    await initializeServices();

    // Start Express Server
    server = app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` Civic Complaint Forecasting Backend API`);
      console.log(` Server running in [${process.env.NODE_ENV || 'development'}] mode`);
      console.log(` Local URL: http://localhost:${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/v1/health`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  // Shutdown application services first
  await shutdownServices();

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      console.log('[Server] Graceful shutdown completed.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }

  // Force shutdown if taking too long
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[Server] Unhandled Promise Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});

startServer();
