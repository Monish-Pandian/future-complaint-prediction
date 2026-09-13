const {
  User,
  Officer,
  PredictionCycle,
  Prediction,
  Assignment,
  Verification,
  Evaluation,
  Feedback,
} = require('../models');

/**
 * Diagnostic Service: Comprehensive Database Consistency and Integrity Check
 * Detects orphan records, invalid foreign references, negative workloads, and duplicates without mutating data.
 */
const checkDatabaseConsistency = async () => {
  const issues = [];

  const [
    officers,
    predictions,
    assignments,
    verifications,
    evaluations,
    feedbackList,
    cycles,
  ] = await Promise.all([
    Officer.find(),
    Prediction.find(),
    Assignment.find(),
    Verification.find(),
    Evaluation.find(),
    Feedback.find(),
    PredictionCycle.find(),
  ]);

  const officerMap = new Map(officers.map((o) => [o._id.toString(), o]));
  const predictionMap = new Map(predictions.map((p) => [p._id.toString(), p]));
  const assignmentMap = new Map(assignments.map((a) => [a._id.toString(), a]));
  const verificationMap = new Map(verifications.map((v) => [v._id.toString(), v]));
  const evaluationMap = new Map(evaluations.map((e) => [e._id.toString(), e]));
  const cycleMap = new Map(cycles.map((c) => [c._id.toString(), c]));

  // 1. Check Negative or Corrupt Officer Workloads
  for (const off of officers) {
    if (off.currentWorkload < 0) {
      issues.push({
        type: 'NEGATIVE_OFFICER_WORKLOAD',
        severity: 'CRITICAL',
        entityId: off.officerId,
        message: `Officer ${off.name} (${off.officerId}) has negative workload: ${off.currentWorkload}`,
      });
    }
  }

  // 2. Check Assignments for Orphan / Inactive References
  for (const asgn of assignments) {
    if (!asgn.predictionId || !predictionMap.has(asgn.predictionId.toString())) {
      issues.push({
        type: 'ORPHAN_ASSIGNMENT_NO_PREDICTION',
        severity: 'HIGH',
        entityId: asgn.assignmentId,
        message: `Assignment ${asgn.assignmentId} references non-existent prediction: ${asgn.predictionId}`,
      });
    }

    if (!asgn.officerId || !officerMap.has(asgn.officerId.toString())) {
      issues.push({
        type: 'ORPHAN_ASSIGNMENT_NO_OFFICER',
        severity: 'HIGH',
        entityId: asgn.assignmentId,
        message: `Assignment ${asgn.assignmentId} references non-existent officer: ${asgn.officerId}`,
      });
    } else {
      const officer = officerMap.get(asgn.officerId.toString());
      if (
        !officer.active &&
        asgn.status !== 'COMPLETED' &&
        asgn.status !== 'REJECTED'
      ) {
        issues.push({
          type: 'ACTIVE_ASSIGNMENT_INACTIVE_OFFICER',
          severity: 'HIGH',
          entityId: asgn.assignmentId,
          message: `Active assignment ${asgn.assignmentId} (status: ${asgn.status}) references inactive officer: ${officer.officerId}`,
        });
      }
    }
  }

  // 3. Check Verifications for Orphan References
  const seenVerifKeys = new Set();
  for (const verif of verifications) {
    if (!verif.predictionId || !predictionMap.has(verif.predictionId.toString())) {
      issues.push({
        type: 'ORPHAN_VERIFICATION_NO_PREDICTION',
        severity: 'HIGH',
        entityId: verif.verificationId,
        message: `Verification ${verif.verificationId} references non-existent prediction: ${verif.predictionId}`,
      });
    }

    if (!verif.officerId || !officerMap.has(verif.officerId.toString())) {
      issues.push({
        type: 'ORPHAN_VERIFICATION_NO_OFFICER',
        severity: 'HIGH',
        entityId: verif.verificationId,
        message: `Verification ${verif.verificationId} references non-existent officer: ${verif.officerId}`,
      });
    }

    // Duplicate verification detection
    const duplicateKey = `${verif.predictionId?.toString()}_${verif.officerId?.toString()}`;
    if (seenVerifKeys.has(duplicateKey)) {
      issues.push({
        type: 'DUPLICATE_VERIFICATION_RECORD',
        severity: 'HIGH',
        entityId: verif.verificationId,
        message: `Multiple verification records found for prediction ${verif.predictionId} and officer ${verif.officerId}`,
      });
    }
    seenVerifKeys.add(duplicateKey);
  }

  // 4. Check Evaluations for Orphan References
  for (const ev of evaluations) {
    if (!ev.verificationId || !verificationMap.has(ev.verificationId.toString())) {
      issues.push({
        type: 'ORPHAN_EVALUATION_NO_VERIFICATION',
        severity: 'HIGH',
        entityId: ev.evaluationId,
        message: `Evaluation ${ev.evaluationId} references non-existent verification: ${ev.verificationId}`,
      });
    }
    if (!ev.predictionId || !predictionMap.has(ev.predictionId.toString())) {
      issues.push({
        type: 'ORPHAN_EVALUATION_NO_PREDICTION',
        severity: 'HIGH',
        entityId: ev.evaluationId,
        message: `Evaluation ${ev.evaluationId} references non-existent prediction: ${ev.predictionId}`,
      });
    }
  }

  // 5. Check Feedback for Orphan References
  for (const fb of feedbackList) {
    if (!fb.evaluationId || !evaluationMap.has(fb.evaluationId.toString())) {
      issues.push({
        type: 'ORPHAN_FEEDBACK_NO_EVALUATION',
        severity: 'HIGH',
        entityId: fb.feedbackId,
        message: `Feedback ${fb.feedbackId} references non-existent evaluation: ${fb.evaluationId}`,
      });
    }
  }

  return {
    healthy: issues.length === 0,
    totalRecordsChecked: {
      officers: officers.length,
      predictions: predictions.length,
      assignments: assignments.length,
      verifications: verifications.length,
      evaluations: evaluations.length,
      feedback: feedbackList.length,
      predictionCycles: cycles.length,
    },
    totalIssuesFound: issues.length,
    issues,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  checkDatabaseConsistency,
};
