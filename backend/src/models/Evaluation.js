const mongoose = require('mongoose');

const EVALUATION_CLASSIFICATION = {
  TRUE_POSITIVE: 'TRUE_POSITIVE',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  FALSE_NEGATIVE: 'FALSE_NEGATIVE',
  TRUE_NEGATIVE: 'TRUE_NEGATIVE',
  UNDETERMINED: 'UNDETERMINED',
};

const evaluationSchema = new mongoose.Schema(
  {
    evaluationId: {
      type: String,
      required: [true, 'Evaluation ID is required'],
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
    predictionOutcome: {
      type: String,
      default: 'PROBLEM_PREDICTED',
      trim: true,
    },
    actualOutcome: {
      type: String,
      required: [true, 'Actual outcome is required'],
      trim: true,
    },
    classification: {
      type: String,
      required: [true, 'Evaluation classification is required'],
      enum: {
        values: Object.values(EVALUATION_CLASSIFICATION),
        message: '{VALUE} is not a valid evaluation classification',
      },
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
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
evaluationSchema.index({ predictionId: 1 });
evaluationSchema.index({ verificationId: 1 });
evaluationSchema.index({ classification: 1 });

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

module.exports = {
  Evaluation,
  EVALUATION_CLASSIFICATION,
};
