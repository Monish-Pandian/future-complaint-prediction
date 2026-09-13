const mongoose = require('mongoose');

const SELECTION_TYPES = {
  EXPLOITATION: 'EXPLOITATION',
  EXPLORATION: 'EXPLORATION',
};

const SELECTION_POLICIES = {
  EXPLOITATION_EXPLORATION_90_10: '90_10_EXPLOITATION_EXPLORATION',
};

const VERIFICATION_CANDIDATE_STATUS = {
  PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT',
  ASSIGNED: 'ASSIGNED',
  VERIFICATION_SUBMITTED: 'VERIFICATION_SUBMITTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const verificationCandidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: [true, 'Candidate ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    predictionCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PredictionCycle',
      required: [true, 'Prediction cycle reference is required'],
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
      required: [true, 'Prediction reference is required'],
    },
    selectionType: {
      type: String,
      required: [true, 'Selection type is required'],
      enum: {
        values: Object.values(SELECTION_TYPES),
        message: '{VALUE} is not a valid selection type',
      },
    },
    selectionPolicy: {
      type: String,
      required: [true, 'Selection policy is required'],
      enum: {
        values: Object.values(SELECTION_POLICIES),
        message: '{VALUE} is not a valid selection policy',
      },
    },
    selectionRank: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(VERIFICATION_CANDIDATE_STATUS),
        message: '{VALUE} is not a valid candidate status',
      },
      default: VERIFICATION_CANDIDATE_STATUS.PENDING_ASSIGNMENT,
    },
    budgetPct: {
      type: Number,
      required: [true, 'Budget percentage is required'],
      min: [0, 'Budget percentage cannot be negative'],
      max: [1, 'Budget percentage cannot exceed 1'],
    },
    weekStart: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    communityArea: {
      type: String,
      required: [true, 'Community area is required'],
      trim: true,
    },
    srType: {
      type: String,
      required: [true, 'Service request type is required'],
      trim: true,
    },
    ward: {
      type: String,
      trim: true,
      default: null,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    probability: {
      type: Number,
      min: [0, 'Probability cannot be less than 0'],
      max: [1, 'Probability cannot exceed 1'],
    },
    riskScore: {
      type: Number,
      min: [0, 'Risk score cannot be less than 0'],
      max: [100, 'Risk score cannot exceed 100'],
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    selectionMetadata: {
      exploitationBudget: Number,
      explorationBudget: Number,
      totalBudget: Number,
      totalCandidates: Number,
      randomSeed: Number,
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    assignedAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
verificationCandidateSchema.index({ predictionCycleId: 1, status: 1 });
verificationCandidateSchema.index({ predictionId: 1 }, { unique: true });
verificationCandidateSchema.index({ predictionCycleId: 1, selectionType: 1 });
verificationCandidateSchema.index({ communityArea: 1, weekStart: 1 });
verificationCandidateSchema.index({ assignedOfficer: 1, status: 1 });
verificationCandidateSchema.index({ srType: 1 });
verificationCandidateSchema.index({ status: 1, assignedOfficer: 1 });

const VerificationCandidate = mongoose.model('VerificationCandidate', verificationCandidateSchema);

module.exports = {
  VerificationCandidate,
  SELECTION_TYPES,
  SELECTION_POLICIES,
  VERIFICATION_CANDIDATE_STATUS,
};