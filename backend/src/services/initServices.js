const { RetrainingService } = require('./retrainingService');
const { PredictionSchedulerService } = require('./predictionSchedulerService');

let retrainingService = null;
let predictionSchedulerService = null;

async function initializeServices() {
  console.log('[InitServices] Initializing application services...');

  retrainingService = new RetrainingService();
  await retrainingService.initializeScheduler();

  predictionSchedulerService = new PredictionSchedulerService();
  await predictionSchedulerService.initializeScheduler();

  console.log('[InitServices] Services initialized');
  return { retrainingService, predictionSchedulerService };
}

function getRetrainingService() {
  return retrainingService;
}

function getPredictionSchedulerService() {
  return predictionSchedulerService;
}

async function shutdownServices() {
  console.log('[InitServices] Shutting down services...');
  if (retrainingService) {
    retrainingService.stopScheduler();
  }
  if (predictionSchedulerService) {
    predictionSchedulerService.stopScheduler();
  }
  console.log('[InitServices] Services shut down');
}

module.exports = {
  initializeServices,
  getRetrainingService,
  getPredictionSchedulerService,
  shutdownServices,
};