const mongoose = require('mongoose');

const TRAINING_STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  VALIDATING: 'VALIDATING',
  TESTING: 'TESTING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  ACTIVATED: 'ACTIVATED',
  REJECTED: 'REJECTED',
};

const modelTrainingRunSchema = new mongoose.Schema(
  {
    modelVersion: {
      type: String,
      required: [true, 'Model version is required'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TRAINING_STATUS),
        message: '{VALUE} is not a valid training status',
      },
      default: TRAINING_STATUS.QUEUED,
    },
    algorithm: {
      type: String,
      default: 'XGBClassifier',
      trim: true,
    },
    featureVersion: {
      type: String,
      trim: true,
    },

    // Training data range
    trainingStartDate: {
      type: Date,
    },
    trainingEndDate: {
      type: Date,
    },

    // Validation data range
    validationStartDate: {
      type: Date,
    },
    validationEndDate: {
      type: Date,
    },

    // Test data range
    testStartDate: {
      type: Date,
    },
    testEndDate: {
      type: Date,
    },

    // Record counts
    trainingRecordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    validationRecordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    testRecordCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Ground truth feedback used
    verifiedFeedbackCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metrics
    trainingMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    validationMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    testMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Timestamps
    trainingStartedAt: {
      type: Date,
    },
    trainingCompletedAt: {
      type: Date,
    },
    activatedAt: {
      type: Date,
    },

    // Active flag - only one model can be active
    isActive: {
      type: Boolean,
      default: false,
    },

    // Error message if failed
    errorMessage: {
      type: String,
      trim: true,
    },

    // Trigger source
    triggerSource: {
      type: String,
      enum: ['scheduled', 'threshold', 'manual', 'initial'],
      default: 'manual',
    },

    // Preprocessor and model file paths
    modelFilePath: {
      type: String,
      trim: true,
    },
    preprocessorFilePath: {
      type: String,
      trim: true,
    },

    // Data quality report for this training run
    dataQualityReport: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Feature engineering metadata
    featureEngineeringMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
modelTrainingRunSchema.index({ status: 1 });
modelTrainingRunSchema.index({ isActive: 1 });
modelTrainingRunSchema.index({ createdAt: -1 });
// modelVersion unique index is created by field-level unique: true

// Ensure only one active model
modelTrainingRunSchema.pre('save', async function (next) {
  if (this.isActive && this.isModified('isActive')) {
    // Deactivate all other models
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { $set: { isActive: false } }
    );
  }
  next();
});

const ModelTrainingRun = mongoose.model('ModelTrainingRun', modelTrainingRunSchema);

module.exports = {
  ModelTrainingRun,
  TRAINING_STATUS,
};