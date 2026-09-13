require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  HistoricalComplaint,
} = require('../src/models/HistoricalComplaint');
const { Officer } = require('../src/models/Officer');
const { Prediction } = require('../src/models/Prediction');
const { PredictionCycle } = require('../src/models/PredictionCycle');
const { Assignment } = require('../src/models/Assignment');
const { VerificationCandidate } = require('../src/models/VerificationCandidate');
const { Verification } = require('../src/models/Verification');
const { Evaluation } = require('../src/models/Evaluation');
const { Feedback } = require('../src/models/Feedback');
const { ModelTrainingRun } = require('../src/models/ModelTrainingRun');

async function auditDatabase() {
  try {
    await connectDB();
    console.log('[Database] Connected successfully');

    console.log('\n===========================================');
    console.log('DATABASE PERSISTENCE AUDIT');
    console.log('===========================================\n');

    // 1. Document counts
    console.log('1. DOCUMENT COUNTS');
    console.log('-------------------');
    const counts = {
      historicalComplaints: await HistoricalComplaint.countDocuments(),
      officers: await Officer.countDocuments(),
      predictions: await Prediction.countDocuments(),
      predictionCycles: await PredictionCycle.countDocuments(),
      assignments: await Assignment.countDocuments(),
      verificationCandidates: await VerificationCandidate.countDocuments(),
      verifications: await Verification.countDocuments(),
      evaluations: await Evaluation.countDocuments(),
      feedback: await Feedback.countDocuments(),
      modelTrainingRuns: await ModelTrainingRun.countDocuments(),
    };

    for (const [collection, count] of Object.entries(counts)) {
      console.log(`  ${collection}: ${count}`);
    }

    // 2. Relationship integrity checks
    console.log('\n2. RELATIONSHIP INTEGRITY');
    console.log('--------------------------');

    // Predictions -> PredictionCycles
    const predictionsWithoutCycle = await Prediction.countDocuments({ predictionCycleId: { $exists: false } });
    const predictionsWithInvalidCycle = await Prediction.countDocuments({
      predictionCycleId: { $exists: true, $ne: null },
    });
    console.log(`  Predictions with cycle: ${predictionsWithInvalidCycle}`);
    console.log(`  Predictions without cycle: ${predictionsWithoutCycle}`);

    // VerificationCandidates -> Predictions
    const candidatesWithoutPrediction = await VerificationCandidate.countDocuments({ predictionId: { $exists: false } });
    console.log(`  VerificationCandidates without prediction: ${candidatesWithoutPrediction}`);

    // VerificationCandidates -> PredictionCycles
    const candidatesWithoutCycle = await VerificationCandidate.countDocuments({ predictionCycleId: { $exists: false } });
    console.log(`  VerificationCandidates without cycle: ${candidatesWithoutCycle}`);

    // Assignments -> Predictions
    const assignmentsWithoutPrediction = await Assignment.countDocuments({ predictionId: { $exists: false } });
    console.log(`  Assignments without prediction: ${assignmentsWithoutPrediction}`);

    // Verifications -> Predictions
    const verificationsWithoutPrediction = await Verification.countDocuments({ predictionId: { $exists: false } });
    console.log(`  Verifications without prediction: ${verificationsWithoutPrediction}`);

    // Evaluations -> Predictions & Verifications
    const evalsWithoutPrediction = await Evaluation.countDocuments({ predictionId: { $exists: false } });
    const evalsWithoutVerification = await Evaluation.countDocuments({ verificationId: { $exists: false } });
    console.log(`  Evaluations without prediction: ${evalsWithoutPrediction}`);
    console.log(`  Evaluations without verification: ${evalsWithoutVerification}`);

    // Feedback -> Predictions, Verifications, Evaluations
    const feedbackWithoutPrediction = await Feedback.countDocuments({ predictionId: { $exists: false } });
    const feedbackWithoutVerification = await Feedback.countDocuments({ verificationId: { $exists: false } });
    const feedbackWithoutEvaluation = await Feedback.countDocuments({ evaluationId: { $exists: false } });
    console.log(`  Feedback without prediction: ${feedbackWithoutPrediction}`);
    console.log(`  Feedback without verification: ${feedbackWithoutVerification}`);
    console.log(`  Feedback without evaluation: ${feedbackWithoutEvaluation}`);

    // 3. Duplicate checks
    console.log('\n3. DUPLICATE CHECKS');
    console.log('-------------------');

    const dupComplaintIds = await HistoricalComplaint.aggregate([
      { $group: { _id: '$complaintId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    console.log(`  Duplicate complaintIds: ${dupComplaintIds[0]?.total || 0}`);

    const dupOfficerIds = await Officer.aggregate([
      { $group: { _id: '$officerId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    console.log(`  Duplicate officerIds: ${dupOfficerIds[0]?.total || 0}`);

    const dupEmployeeCodes = await Officer.aggregate([
      { $group: { _id: '$employeeCode', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    console.log(`  Duplicate employeeCodes: ${dupEmployeeCodes[0]?.total || 0}`);

    const dupPredictionIds = await Prediction.aggregate([
      { $group: { _id: '$predictionId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    console.log(`  Duplicate predictionIds: ${dupPredictionIds[0]?.total || 0}`);

    const dupCandidateIds = await VerificationCandidate.aggregate([
      { $group: { _id: '$candidateId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    console.log(`  Duplicate candidateIds: ${dupCandidateIds[0]?.total || 0}`);

    // 4. Data quality checks
    console.log('\n4. DATA QUALITY');
    console.log('---------------');

    // Officers with invalid workload
    const officersOverCapacity = await Officer.countDocuments({
      $expr: { $gt: ['$currentWorkload', '$maxAssignments'] },
    });
    console.log(`  Officers over capacity: ${officersOverCapacity}`);

    const officersWithInvalidWorkload = await Officer.countDocuments({
      $or: [
        { currentWorkload: { $lt: 0 } },
        { maxAssignments: { $lt: 0 } },
      ],
    });
    console.log(`  Officers with invalid workload values: ${officersWithInvalidWorkload}`);

    // Active officers
    const activeOfficers = await Officer.countDocuments({ active: true });
    console.log(`  Active officers: ${activeOfficers}`);

    // Officers with department
    const officersWithDept = await Officer.countDocuments({ department: { $exists: true, $ne: '' } });
    console.log(`  Officers with department: ${officersWithDept}`);

    // Predictions without modelVersion
    const predsWithoutModelVersion = await Prediction.countDocuments({ modelVersion: { $exists: false } });
    console.log(`  Predictions without modelVersion: ${predsWithoutModelVersion}`);

    // Completed verification candidates without verification records
    const completedCandidates = await VerificationCandidate.countDocuments({ status: 'COMPLETED' });
    const candidatesWithVerification = await VerificationCandidate.countDocuments({
      status: 'COMPLETED',
      assignedOfficer: { $exists: true, $ne: null },
    });
    console.log(`  Completed verification candidates: ${completedCandidates}`);
    console.log(`  Completed candidates with assigned officer: ${candidatesWithVerification}`);

    // 5. Model training runs
    console.log('\n5. MODEL TRAINING RUNS');
    console.log('----------------------');

    const activeModels = await ModelTrainingRun.countDocuments({ isActive: true });
    console.log(`  Active models: ${activeModels}`);

    const modelStatuses = await ModelTrainingRun.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    for (const ms of modelStatuses) {
      console.log(`  ${ms._id}: ${ms.count}`);
    }

    const modelTriggerSources = await ModelTrainingRun.aggregate([
      { $group: { _id: '$triggerSource', count: { $sum: 1 } } },
    ]);
    for (const mts of modelTriggerSources) {
      console.log(`  Trigger ${mts._id}: ${mts.count}`);
    }

    // 6. Verification workflow completeness
    console.log('\n6. VERIFICATION WORKFLOW');
    console.log('-------------------------');

    const candidateStatuses = await VerificationCandidate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    for (const cs of candidateStatuses) {
      console.log(`  Candidate ${cs._id}: ${cs.count}`);
    }

    const verificationOutcomes = await Verification.aggregate([
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]);
    for (const vo of verificationOutcomes) {
      console.log(`  Verification ${vo._id}: ${vo.count}`);
    }

    const evaluationClassifications = await Evaluation.aggregate([
      { $group: { _id: '$classification', count: { $sum: 1 } } },
    ]);
    for (const ec of evaluationClassifications) {
      console.log(`  Evaluation ${ec._id}: ${ec.count}`);
    }

    const feedbackTypes = await Feedback.aggregate([
      { $group: { _id: '$feedbackType', count: { $sum: 1 } } },
    ]);
    for (const ft of feedbackTypes) {
      console.log(`  Feedback ${ft._id}: ${ft.count}`);
    }

    const feedbackStatuses = await Feedback.aggregate([
      { $group: { _id: '$feedbackStatus', count: { $sum: 1 } } },
    ]);
    for (const fs of feedbackStatuses) {
      console.log(`  Feedback ${fs._id}: ${fs.count}`);
    }

    // 7. Assignment checks
    console.log('\n7. ASSIGNMENT CHECKS');
    console.log('---------------------');

    const assignmentStatuses = await Assignment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    for (const ast of assignmentStatuses) {
      console.log(`  Assignment ${ast._id}: ${ast.count}`);
    }

    // 8. Orphaned references
    console.log('\n8. ORPHANED REFERENCES CHECK');
    console.log('-----------------------------');

    // Check for predictions referencing non-existent cycles
    const predCycles = await Prediction.distinct('predictionCycleId');
    let orphanedPredCycles = 0;
    for (const cid of predCycles) {
      if (cid) {
        const exists = await PredictionCycle.findById(cid);
        if (!exists) orphanedPredCycles++;
      }
    }
    console.log(`  Predictions with orphaned cycle references: ${orphanedPredCycles}`);

    // Check for candidates referencing non-existent predictions
    const candPreds = await VerificationCandidate.distinct('predictionId');
    let orphanedCandPreds = 0;
    for (const pid of candPreds) {
      if (pid) {
        const exists = await Prediction.findById(pid);
        if (!exists) orphanedCandPreds++;
      }
    }
    console.log(`  Candidates with orphaned prediction references: ${orphanedCandPreds}`);

    // Check for verifications referencing non-existent predictions
    const verPreds = await Verification.distinct('predictionId');
    let orphanedVerPreds = 0;
    for (const pid of verPreds) {
      if (pid) {
        const exists = await Prediction.findById(pid);
        if (!exists) orphanedVerPreds++;
      }
    }
    console.log(`  Verifications with orphaned prediction references: ${orphanedVerPreds}`);

    console.log('\n===========================================');
    console.log('AUDIT COMPLETE');
    console.log('===========================================\n');

  } catch (error) {
    console.error('Audit error:', error);
  } finally {
    await disconnectDB();
  }
}

auditDatabase();