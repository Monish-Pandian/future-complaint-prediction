const mongoose = require('mongoose');
require('./PredictionCycle');
require('./Officer');

const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const VERIFICATION_STATUS = {
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  VERIFIED_TRUE: 'VERIFIED_TRUE',
  VERIFIED_FALSE: 'VERIFIED_FALSE',
  UNABLE_TO_VERIFY: 'UNABLE_TO_VERIFY',
  RESOLVED: 'RESOLVED',
};

const TRENDS = {
  INCREASING: 'INCREASING',
  STABLE: 'STABLE',
  DECREASING: 'DECREASING',
};

const predictionSchema = new mongoose.Schema(
  {
    predictionId: {
      type: String,
      required: [true, 'Prediction ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    predictionCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PredictionCycle',
      default: null,
    },
    complaintType: {
      type: String,
      required: [true, 'Complaint type is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    communityArea: {
      type: String,
      required: [true, 'Community area is required'],
      trim: true,
    },
    ward: {
      type: String,
      required: [true, 'Ward is required'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [0, 0],
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              typeof val[0] === 'number' && // longitude (-180 to 180)
              typeof val[1] === 'number' && // latitude (-90 to 90)
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: 'Coordinates must be GeoJSON [longitude (-180 to 180), latitude (-90 to 90)]',
        },
      },
    },
    predictionDate: {
      type: Date,
      required: [true, 'Prediction date is required'],
      default: Date.now,
    },
    predictionWindowStart: {
      type: Date,
      required: [true, 'Prediction window start is required'],
      default: Date.now,
    },
    predictionWindowEnd: {
      type: Date,
      required: [true, 'Prediction window end is required'],
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    probability: {
      type: Number,
      required: [true, 'Prediction probability is required'],
      min: [0, 'Probability cannot be less than 0'],
      max: [1, 'Probability cannot exceed 1'],
    },
    riskScore: {
      type: Number,
      required: [true, 'Risk score is required'],
      min: [0, 'Risk score cannot be less than 0'],
      max: [100, 'Risk score cannot exceed 100'],
    },
    riskLevel: {
      type: String,
      required: [true, 'Risk level is required'],
      enum: {
        values: Object.values(RISK_LEVELS),
        message: '{VALUE} is not a valid risk level (LOW, MEDIUM, HIGH, CRITICAL)',
      },
    },
    historicalCount: {
      type: Number,
      default: 0,
      min: [0, 'Historical count cannot be negative'],
    },
    recentCount: {
      type: Number,
      default: 0,
      min: [0, 'Recent count cannot be negative'],
    },
    trend: {
      type: String,
      enum: Object.values(TRENDS),
      default: TRENDS.INCREASING,
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence cannot be less than 0'],
      max: [1, 'Confidence cannot exceed 1'],
      default: 0.85,
    },
    verificationStatus: {
      type: String,
      enum: {
        values: Object.values(VERIFICATION_STATUS),
        message: '{VALUE} is not a valid verification status',
      },
      default: VERIFICATION_STATUS.UNASSIGNED,
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
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

// Pre-save hook to synchronize assignedOfficer and assignedOfficerId
predictionSchema.pre('save', function (next) {
  if (this.assignedOfficer && !this.assignedOfficerId) {
    this.assignedOfficerId = this.assignedOfficer;
  } else if (this.assignedOfficerId && !this.assignedOfficer) {
    this.assignedOfficer = this.assignedOfficerId;
  }
  next();
});

// Indexes
predictionSchema.index({ predictionCycleId: 1 });
predictionSchema.index({ department: 1, complaintType: 1 });
predictionSchema.index({ communityArea: 1, ward: 1 });
predictionSchema.index({ riskLevel: 1, verificationStatus: 1 });
predictionSchema.index({ assignedOfficer: 1, verificationStatus: 1 });
predictionSchema.index({ predictionDate: -1, riskScore: -1 });
predictionSchema.index({ location: '2dsphere' });

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = {
  Prediction,
  RISK_LEVELS,
  VERIFICATION_STATUS,
  TRENDS,
};
