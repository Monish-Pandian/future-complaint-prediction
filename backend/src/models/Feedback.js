const mongoose = require('mongoose');

const FEEDBACK_TYPES = {
  VERIFIED_OBSERVATION: 'VERIFIED_OBSERVATION',
  FALSE_POSITIVE_SIGNAL: 'FALSE_POSITIVE_SIGNAL',
  FALSE_NEGATIVE_SIGNAL: 'FALSE_NEGATIVE_SIGNAL',
  DATA_QUALITY_ISSUE: 'DATA_QUALITY_ISSUE',
};

const FEEDBACK_STATUS = {
  PENDING: 'PENDING',
  READY_FOR_MODEL_UPDATE: 'READY_FOR_MODEL_UPDATE',
  PROCESSED: 'PROCESSED',
  REJECTED: 'REJECTED',
};

const feedbackSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: String,
      required: [true, 'Feedback ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
      required: [true, 'Prediction reference is required'],
    },
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verification',
      required: [true, 'Verification reference is required'],
    },
    evaluationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evaluation',
      required: [true, 'Evaluation reference is required'],
    },
    predictionCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PredictionCycle',
      default: null,
    },
    feedbackType: {
      type: String,
      required: [true, 'Feedback type is required'],
      enum: {
        values: Object.values(FEEDBACK_TYPES),
        message: '{VALUE} is not a valid feedback type',
      },
    },
    feedbackStatus: {
      type: String,
      required: [true, 'Feedback status is required'],
      enum: {
        values: Object.values(FEEDBACK_STATUS),
        message: '{VALUE} is not a valid feedback status',
      },
      default: FEEDBACK_STATUS.PENDING,
    },
    processedAt: {
      type: Date,
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
feedbackSchema.index({ predictionId: 1 });
feedbackSchema.index({ verificationId: 1 });
feedbackSchema.index({ evaluationId: 1 });
feedbackSchema.index({ predictionCycleId: 1 });
feedbackSchema.index({ feedbackStatus: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = {
  Feedback,
  FEEDBACK_TYPES,
  FEEDBACK_STATUS,
};
