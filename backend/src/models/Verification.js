const mongoose = require('mongoose');

const VERIFICATION_OUTCOMES = {
  PROBLEM_CONFIRMED: 'PROBLEM_CONFIRMED',
  PROBLEM_NOT_FOUND: 'PROBLEM_NOT_FOUND',
  DIFFERENT_PROBLEM: 'DIFFERENT_PROBLEM',
  DUPLICATE: 'DUPLICATE',
  UNABLE_TO_VERIFY: 'UNABLE_TO_VERIFY',
};

const VERIFICATION_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const verificationSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: [true, 'Verification ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
      required: [true, 'Prediction reference is required'],
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      required: [true, 'Officer reference is required'],
    },
    outcome: {
      type: String,
      required: [true, 'Verification outcome is required'],
      enum: {
        values: Object.values(VERIFICATION_OUTCOMES),
        message: 'Invalid verification outcome: {VALUE}',
      },
    },
    severity: {
      type: String,
      enum: {
        values: Object.values(VERIFICATION_SEVERITY),
        message: 'Invalid verification severity: {VALUE}',
      },
      default: VERIFICATION_SEVERITY.MEDIUM,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    evidenceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    gpsAvailable: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
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
verificationSchema.index({ predictionId: 1, officerId: 1 }, { unique: true });
verificationSchema.index({ officerId: 1, verifiedAt: -1 });
verificationSchema.index({ outcome: 1, severity: 1 });
verificationSchema.index({ location: '2dsphere' });

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = {
  Verification,
  VERIFICATION_OUTCOMES,
  VERIFICATION_SEVERITY,
};
