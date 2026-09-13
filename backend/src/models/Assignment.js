const mongoose = require('mongoose');

const ASSIGNMENT_STATUS = {
  AI_ASSIGNED: 'AI_ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  VERIFICATION_SUBMITTED: 'VERIFICATION_SUBMITTED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
};

const assignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      required: [true, 'Assignment ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
      required: [true, 'Prediction reference is required'],
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      required: [true, 'Officer reference is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    distanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedTravelMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentWorkload: {
      type: Number,
      default: 0,
      min: 0,
    },
    availability: {
      type: String,
      enum: ['AVAILABLE', 'BUSY', 'ON_LEAVE', 'OFF_DUTY'],
      default: 'AVAILABLE',
    },
    departmentMatch: {
      type: Boolean,
      default: true,
    },
    assignmentScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    reasoning: {
      type: String,
      required: [true, 'Assignment reasoning is required'],
      default: 'Automated heuristic decision engine assignment',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ASSIGNMENT_STATUS),
        message: '{VALUE} is not a valid assignment status',
      },
      default: ASSIGNMENT_STATUS.AI_ASSIGNED,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    isAdminOverride: {
      type: Boolean,
      default: false,
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
assignmentSchema.index({ officerId: 1, status: 1 });
assignmentSchema.index({ predictionId: 1, status: 1 });
assignmentSchema.index({ department: 1, status: 1, assignedAt: -1 });
assignmentSchema.index({ status: 1, assignedAt: -1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = {
  Assignment,
  ASSIGNMENT_STATUS,
};
