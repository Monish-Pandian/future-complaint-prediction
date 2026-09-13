require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/database');
const { Prediction } = require('../src/models/Prediction');
const { Assignment } = require('../src/models/Assignment');
const { assignPrediction } = require('../src/services/assignmentService');

const seedAssignments = async () => {
  try {
    await connectDB();

    console.log('[Seed] Auto-assigning unassigned Predicted Problems to officers...');

    const unassignedPredictions = await Prediction.find({
      $or: [{ assignedOfficer: null }, { verificationStatus: 'UNASSIGNED' }],
    });

    for (const pred of unassignedPredictions) {
      try {
        const assignment = await assignPrediction(pred._id);
        console.log(
          `[Seed] Assigned Predicted Problem '${pred.predictionId}' -> Assignment '${assignment.assignmentId}'`
        );
      } catch (err) {
        console.warn(`[Seed] Could not auto-assign ${pred.predictionId}: ${err.message}`);
      }
    }

    const totalAssignments = await Assignment.countDocuments();
    console.log(`[Seed] Total assignments in database: ${totalAssignments}`);
    console.log('[Seed] Assignment seeding completed.');
  } catch (error) {
    console.error(`[Seed] Failed to seed assignments: ${error.message}`);
  } finally {
    if (require.main === module) {
      await disconnectDB();
    }
  }
};

if (require.main === module) {
  seedAssignments();
}

module.exports = seedAssignments;
