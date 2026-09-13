const mongoose = require('mongoose');

const CYCLE_STATUS = {
  CREATED: 'CREATED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

const predictionCycleSchema = new mongoose.Schema(
  {
    cycleId: {
      type: String,
      required: [true, 'Cycle ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    cycleNumber: {
      type: Number,
      required: [true, 'Cycle number is required'],
      unique: true,
      min: [1, 'Cycle number must be at least 1'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    predictionWindowStart: {
      type: Date,
      required: [true, 'Prediction window start is required'],
    },
    predictionWindowEnd: {
      type: Date,
      required: [true, 'Prediction window end is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(CYCLE_STATUS),
        message: '{VALUE} is not a valid prediction cycle status',
      },
      default: CYCLE_STATUS.CREATED,
    },
    predictionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    modelVersion: {
      type: String,
      trim: true,
      default: 'baseline-spatial-v1',
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
predictionCycleSchema.index({ status: 1 });
predictionCycleSchema.index({ startDate: -1 });

const PredictionCycle = mongoose.model('PredictionCycle', predictionCycleSchema);

module.exports = {
  PredictionCycle,
  CYCLE_STATUS,
};
