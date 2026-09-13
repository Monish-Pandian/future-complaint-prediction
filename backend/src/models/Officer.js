const mongoose = require('mongoose');

const AVAILABILITY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  ON_LEAVE: 'ON_LEAVE',
  OFF_DUTY: 'OFF_DUTY',
};

const officerSchema = new mongoose.Schema(
  {
    officerId: {
      type: String,
      required: [true, 'Officer ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Officer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      enum: {
        values: Object.values(AVAILABILITY_STATUS),
        message: '{VALUE} is not a valid availability status',
      },
      default: AVAILABILITY_STATUS.AVAILABLE,
    },
    currentWorkload: {
      type: Number,
      default: 0,
      min: [0, 'Workload cannot be negative'],
    },
    maxAssignments: {
      type: Number,
      default: 5,
      min: [0, 'Max assignments cannot be negative'],
    },
    homeCommunityArea: {
      type: String,
      trim: true,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
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
          message: 'Coordinates must be [longitude (-180 to 180), latitude (-90 to 90)]',
        },
      },
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
officerSchema.index({ userId: 1 });
officerSchema.index({ department: 1, active: 1, availability: 1 });
officerSchema.index({ location: '2dsphere' });
officerSchema.index({ name: 'text', employeeCode: 'text', officerId: 'text' });

const Officer = mongoose.model('Officer', officerSchema);

module.exports = {
  Officer,
  AVAILABILITY_STATUS,
};
