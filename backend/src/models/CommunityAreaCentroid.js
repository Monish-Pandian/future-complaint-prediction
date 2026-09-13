const mongoose = require('mongoose');

const communityAreaCentroidSchema = new mongoose.Schema(
  {
    communityArea: {
      type: String,
      required: [true, 'Community area is required'],
      unique: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
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

// communityArea unique index is created by field-level unique: true

const CommunityAreaCentroid = mongoose.model('CommunityAreaCentroid', communityAreaCentroidSchema);

module.exports = {
  CommunityAreaCentroid,
};