require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { HistoricalComplaint } = require('../src/models/HistoricalComplaint');
const { Officer } = require('../src/models/Officer');
const { Prediction } = require('../src/models/Prediction');
const { PredictionCycle } = require('../src/models/PredictionCycle');
const { Assignment } = require('../src/models/Assignment');
const { VerificationCandidate } = require('../src/models/VerificationCandidate');
const { Verification } = require('../src/models/Verification');
const { Evaluation } = require('../src/models/Evaluation');
const { Feedback } = require('../src/models/Feedback');

async function audit() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('[Database] Connected successfully');
    
    const collections = [
      { name: 'HistoricalComplaints', model: HistoricalComplaint },
      { name: 'Officers', model: Officer },
      { name: 'Predictions', model: Prediction },
      { name: 'PredictionCycles', model: PredictionCycle },
      { name: 'Assignments', model: Assignment },
      { name: 'VerificationCandidates', model: VerificationCandidate },
      { name: 'Verifications', model: Verification },
      { name: 'Evaluations', model: Evaluation },
      { name: 'Feedback', model: Feedback },
    ];
    
    console.log('\n===========================================');
    console.log('DATABASE COLLECTION AUDIT');
    console.log('===========================================\n');
    
    for (const coll of collections) {
      const count = await coll.model.countDocuments();
      console.log(`${coll.name}`);
      console.log(`  Count: ${count}`);
      
      if (count > 0) {
        const sample = await coll.model.findOne().lean();
        console.log(`  Fields: ${Object.keys(sample).join(', ')}`);
      }
      
      console.log('');
    }
    
    // Detailed Historical Complaints Analysis
    console.log('===========================================');
    console.log('HISTORICAL COMPLAINT DETAILED ANALYSIS');
    console.log('===========================================\n');
    
    const hcCount = await HistoricalComplaint.countDocuments();
    console.log(`Total Historical Complaints: ${hcCount}`);
    
    if (hcCount > 0) {
      const dateRange = await HistoricalComplaint.aggregate([
        { $group: { _id: null, earliest: { $min: '$createdAt' }, latest: { $max: '$createdAt' } } }
      ]);
      console.log(`Date Range: ${dateRange[0]?.earliest} to ${dateRange[0]?.latest}`);
      
      const complaintTypes = await HistoricalComplaint.distinct('complaintType');
      console.log(`Unique Complaint Types (${complaintTypes.length}): ${complaintTypes.join(', ')}`);
      
      const typeCounts = await HistoricalComplaint.aggregate([
        { $group: { _id: '$complaintType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      console.log('\nComplaint Type Counts:');
      typeCounts.forEach(t => console.log(`  ${t._id}: ${t.count}`));
      
      const communityAreas = await HistoricalComplaint.distinct('communityArea');
      console.log(`\nUnique Community Areas (${communityAreas.length}): ${communityAreas.slice(0, 20).join(', ')}${communityAreas.length > 20 ? '...' : ''}`);
      
      const wards = await HistoricalComplaint.distinct('ward');
      console.log(`Unique Wards (${wards.length}): ${wards.slice(0, 20).join(', ')}${wards.length > 20 ? '...' : ''}`);
      
      const departments = await HistoricalComplaint.distinct('department');
      console.log(`Unique Departments (${departments.length}): ${departments.join(', ')}`);
      
      // Check for lat/long
      const hasLocation = await HistoricalComplaint.countDocuments({
        'location.coordinates': { $ne: [0, 0] }
      });
      console.log(`\nRecords with valid coordinates: ${hasLocation}/${hcCount}`);
      
      // Check for duplicates
      const duplicates = await HistoricalComplaint.aggregate([
        { $group: { _id: '$complaintId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
      ]);
      console.log(`Duplicate complaintIds: ${duplicates.length}`);
      
      // Missing values check
      const missingFields = await HistoricalComplaint.aggregate([
        { $project: {
          complaintId: 1,
          complaintType: 1,
          department: 1,
          communityArea: 1,
          ward: 1,
          location: 1,
          createdAt: 1
        }},
        { $group: {
          _id: null,
          missingComplaintType: { $sum: { $cond: [{ $eq: ['$complaintType', ''] }, 1, 0] } },
          missingDepartment: { $sum: { $cond: [{ $eq: ['$department', ''] }, 1, 0] } },
          missingCommunityArea: { $sum: { $cond: [{ $eq: ['$communityArea', ''] }, 1, 0] } },
          missingWard: { $sum: { $cond: [{ $eq: ['$ward', ''] }, 1, 0] } },
          missingLocation: { $sum: { $cond: [{ $eq: ['$location.coordinates', [0, 0]] }, 1, 0] } },
          missingCreatedAt: { $sum: { $cond: [{ $eq: ['$createdAt', null] }, 1, 0] } }
        }}
      ]);
      console.log('\nMissing Values:');
      console.log(JSON.stringify(missingFields[0] || {}, null, 2));
    }
    
    // Officer Analysis
    console.log('\n===========================================');
    console.log('OFFICER DETAILED ANALYSIS');
    console.log('===========================================\n');
    
    const officerCount = await Officer.countDocuments();
    console.log(`Total Officers: ${officerCount}`);
    
    if (officerCount > 0) {
      const deptDist = await Officer.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      console.log('\nDepartment Distribution:');
      deptDist.forEach(d => console.log(`  ${d._id}: ${d.count}`));
      
      const areaDist = await Officer.aggregate([
        { $match: { homeCommunityArea: { $ne: null, $ne: '' } } },
        { $group: { _id: '$homeCommunityArea', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      console.log(`\nCommunity Area Distribution (top 20):`);
      areaDist.slice(0, 20).forEach(a => console.log(`  ${a._id}: ${a.count}`));
      
      const workloadStats = await Officer.aggregate([
        { $group: {
          _id: null,
          avgWorkload: { $avg: '$currentWorkload' },
          maxWorkload: { $max: '$currentWorkload' },
          avgMaxAssignments: { $avg: '$maxAssignments' },
          overCapacity: { $sum: { $cond: [{ $gt: ['$currentWorkload', '$maxAssignments'] }, 1, 0] } }
        }}
      ]);
      console.log('\nWorkload Stats:');
      console.log(JSON.stringify(workloadStats[0] || {}, null, 2));
      
      const activeCount = await Officer.countDocuments({ active: true });
      console.log(`Active Officers: ${activeCount}/${officerCount}`);
      
      const uniqueOfficerIds = await Officer.distinct('officerId');
      console.log(`Unique officerIds: ${uniqueOfficerIds.length}`);
      
      const uniqueEmployeeCodes = await Officer.distinct('employeeCode');
      console.log(`Unique employeeCodes: ${uniqueEmployeeCodes.length}`);
    }
    
    // Prediction Analysis
    console.log('\n===========================================');
    console.log('PREDICTION ANALYSIS');
    console.log('===========================================\n');
    
    const predCount = await Prediction.countDocuments();
    console.log(`Total Predictions: ${predCount}`);
    
    if (predCount > 0) {
      const predCycleCount = await PredictionCycle.countDocuments();
      console.log(`Prediction Cycles: ${predCycleCount}`);
      
      const predWithCycle = await Prediction.countDocuments({ predictionCycleId: { $ne: null } });
      console.log(`Predictions linked to cycles: ${predWithCycle}`);
      
      const modelVersions = await Prediction.distinct('modelVersion');
      console.log(`Model Versions: ${modelVersions.join(', ')}`);
      
      const samplePred = await Prediction.findOne().populate('predictionCycleId').lean();
      console.log('\nSample Prediction:');
      console.log(JSON.stringify(samplePred, null, 2));
    }
    
    // Verification Candidate Analysis
    console.log('\n===========================================');
    console.log('VERIFICATION CANDIDATE ANALYSIS');
    console.log('===========================================\n');
    
    const vcCount = await VerificationCandidate.countDocuments();
    console.log(`Total Verification Candidates: ${vcCount}`);
    
    if (vcCount > 0) {
      const vcStatus = await VerificationCandidate.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      console.log('Status Distribution:');
      vcStatus.forEach(s => console.log(`  ${s._id}: ${s.count}`));
      
      const vcAssigned = await VerificationCandidate.countDocuments({ assignedOfficer: { $ne: null } });
      console.log(`Candidates with assigned officer: ${vcAssigned}`);
    }
    
    // Verification Analysis
    console.log('\n===========================================');
    console.log('VERIFICATION ANALYSIS');
    console.log('===========================================\n');
    
    const vCount = await Verification.countDocuments();
    console.log(`Total Verifications: ${vCount}`);
    
    if (vCount > 0) {
      const vOutcomes = await Verification.aggregate([
        { $group: { _id: '$outcome', count: { $sum: 1 } } }
      ]);
      console.log('Outcome Distribution:');
      vOutcomes.forEach(o => console.log(`  ${o._id}: ${o.count}`));
    }
    
    // Evaluation Analysis
    console.log('\n===========================================');
    console.log('EVALUATION ANALYSIS');
    console.log('===========================================\n');
    
    const eCount = await Evaluation.countDocuments();
    console.log(`Total Evaluations: ${eCount}`);
    
    if (eCount > 0) {
      const eClassification = await Evaluation.aggregate([
        { $group: { _id: '$classification', count: { $sum: 1 } } }
      ]);
      console.log('Classification Distribution:');
      eClassification.forEach(c => console.log(`  ${c._id}: ${c.count}`));
    }
    
    // Feedback Analysis
    console.log('\n===========================================');
    console.log('FEEDBACK ANALYSIS');
    console.log('===========================================\n');
    
    const fCount = await Feedback.countDocuments();
    console.log(`Total Feedback: ${fCount}`);
    
    if (fCount > 0) {
      const fTypes = await Feedback.aggregate([
        { $group: { _id: '$feedbackType', count: { $sum: 1 } } }
      ]);
      console.log('Feedback Type Distribution:');
      fTypes.forEach(t => console.log(`  ${t._id}: ${t.count}`));
      
      const fStatus = await Feedback.aggregate([
        { $group: { _id: '$feedbackStatus', count: { $sum: 1 } } }
      ]);
      console.log('Feedback Status Distribution:');
      fStatus.forEach(s => console.log(`  ${s._id}: ${s.count}`));
    }
    
  } catch (error) {
    console.error('Audit error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n[Database] Connection closed');
    process.exit(0);
  }
}

audit();