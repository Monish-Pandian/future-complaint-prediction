const mongoose = require('mongoose');

const HISTORICAL_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
};

const historicalComplaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: [true, 'Complaint ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
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
              typeof val[0] === 'number' &&
              typeof val[1] === 'number' &&
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
    status: {
      type: String,
      enum: Object.values(HISTORICAL_STATUS),
      default: HISTORICAL_STATUS.CLOSED,
    },
    source: {
      type: String,
      trim: true,
      default: '311_CALL',
    },
    createdAt: {
      type: Date,
      required: [true, 'Creation date is required'],
      default: Date.now,
    },
    closedAt: {
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
historicalComplaintSchema.index({ complaintType: 1 });
historicalComplaintSchema.index({ department: 1 });
historicalComplaintSchema.index({ communityArea: 1, ward: 1 });
historicalComplaintSchema.index({ createdAt: -1 });
historicalComplaintSchema.index({ location: '2dsphere' });

const HistoricalComplaint = mongoose.model('HistoricalComplaint', historicalComplaintSchema);

module.exports = {
  HistoricalComplaint,
  HISTORICAL_STATUS,
};
