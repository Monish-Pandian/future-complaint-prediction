const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { CommunityAreaCentroid } = require('../models/CommunityAreaCentroid');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';

async function importCentroids() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const csvPath = path.resolve(__dirname, '../../ai_service/data/processed/community_area_centroids.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    const centroids = [];
    for (let i = 1; i < lines.length; i++) {
      const [communityArea, latitude, longitude] = lines[i].split(',');
      centroids.push({
        communityArea: communityArea.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
    }

    console.log(`Read ${centroids.length} centroids from CSV`);

    await CommunityAreaCentroid.deleteMany({});
    console.log('Cleared existing centroids');

    const result = await CommunityAreaCentroid.insertMany(centroids);
    console.log(`Inserted ${result.length} centroids`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error importing centroids:', error);
    process.exit(1);
  }
}

importCentroids();