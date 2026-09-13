require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { HistoricalComplaint, HISTORICAL_STATUS } = require('../src/models/HistoricalComplaint');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';
const CSV_PATH = path.resolve(__dirname, '../../backend/ai_service/data/processed/base_dataset.csv');

async function importHistoricalComplaints() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] Connected successfully');

    // Check existing count
    const existingCount = await HistoricalComplaint.countDocuments();
    console.log(`[Import] Existing HistoricalComplaints: ${existingCount}`);

    // Remove ONLY demo seed records (source: "DEMO_SEED_311")
    const demoCount = await HistoricalComplaint.countDocuments({ source: 'DEMO_SEED_311' });
    console.log(`[Import] Demo records to remove: ${demoCount}`);
    
    if (demoCount > 0) {
      const result = await HistoricalComplaint.deleteMany({ source: 'DEMO_SEED_311' });
      console.log(`[Import] Removed ${result.deletedCount} demo records`);
    }

    // Read CSV
    console.log(`[Import] Reading CSV from ${CSV_PATH}...`);
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    console.log(`[Import] Total lines: ${lines.length} (${lines.length - 1} data rows)`);
    console.log(`[Import] Headers: ${headers.join(', ')}`);

    // Status mapping from CSV to model
    const statusMap = {
      'Completed': HISTORICAL_STATUS.CLOSED,
      'Open': HISTORICAL_STATUS.OPEN,
      'In Progress': HISTORICAL_STATUS.INVESTIGATING,
      'Investigating': HISTORICAL_STATUS.INVESTIGATING,
      'Resolved': HISTORICAL_STATUS.RESOLVED,
      'Closed': HISTORICAL_STATUS.CLOSED,
    };

    // Process in batches
    const BATCH_SIZE = 5000;
    let imported = 0;
    let errors = 0;
    const batch = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (simple split - handles basic cases)
      const values = line.split(',');
      if (values.length < headers.length) continue;

      const record = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx]?.trim() || '';
      });

      // Skip if missing required fields
      if (!record.sr_number || !record.sr_type || !record.owner_department || 
          !record.community_area || !record.ward || !record.created_date ||
          !record.latitude || !record.longitude) {
        errors++;
        continue;
      }

      const lat = parseFloat(record.latitude);
      const lon = parseFloat(record.longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        errors++;
        continue;
      }

      const createdAt = new Date(record.created_date);
      if (isNaN(createdAt.getTime())) {
        errors++;
        continue;
      }

      let closedAt = null;
      if (record.closed_date && record.closed_date !== '') {
        closedAt = new Date(record.closed_date);
        if (isNaN(closedAt.getTime())) closedAt = null;
      }

      const status = statusMap[record.status] || HISTORICAL_STATUS.CLOSED;

      // Community area and ward as strings
      const communityArea = String(record.community_area).replace('.0', '');
      const ward = String(record.ward).replace('.0', '');

      const doc = {
        complaintId: record.sr_number.toUpperCase().trim(),
        complaintType: record.sr_type.trim(),
        department: record.owner_department.trim(),
        communityArea: communityArea,
        ward: ward,
        location: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        status: status,
        source: '311_CALL',
        createdAt: createdAt,
        closedAt: closedAt,
      };

      batch.push(doc);

      if (batch.length >= BATCH_SIZE) {
        try {
          await HistoricalComplaint.insertMany(batch, { ordered: false });
          imported += batch.length;
          console.log(`[Import] Imported ${imported} records...`);
          batch.length = 0;
        } catch (err) {
          // Handle duplicate key errors
          if (err.writeErrors) {
            imported += batch.length - err.writeErrors.length;
            errors += err.writeErrors.length;
          } else {
            errors += batch.length;
          }
          console.log(`[Import] Batch error: ${err.message}`);
          batch.length = 0;
        }
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      try {
        await HistoricalComplaint.insertMany(batch, { ordered: false });
        imported += batch.length;
      } catch (err) {
        if (err.writeErrors) {
          imported += batch.length - err.writeErrors.length;
          errors += err.writeErrors.length;
        } else {
          errors += batch.length;
        }
      }
    }

    console.log(`\n[Import] Complete!`);
    console.log(`[Import] Successfully imported: ${imported}`);
    console.log(`[Import] Errors: ${errors}`);

    // Verify
    const finalCount = await HistoricalComplaint.countDocuments();
    console.log(`[Import] Final count in MongoDB: ${finalCount}`);

    // Quick stats
    const stats = await HistoricalComplaint.aggregate([
      { $group: { 
        _id: null, 
        earliest: { $min: '$createdAt' }, 
        latest: { $max: '$createdAt' },
        types: { $addToSet: '$complaintType' },
        departments: { $addToSet: '$department' },
        areas: { $addToSet: '$communityArea' },
        wards: { $addToSet: '$ward' },
        withCoords: { $sum: { $cond: [{ $ne: ['$location.coordinates', [0, 0]] }, 1, 0] } }
      }}
    ]);
    
    if (stats.length > 0) {
      const s = stats[0];
      console.log(`\n[Import] Statistics:`);
      console.log(`  Date range: ${s.earliest} to ${s.latest}`);
      console.log(`  Complaint types (${s.types.length}): ${s.types.slice(0, 10).join(', ')}${s.types.length > 10 ? '...' : ''}`);
      console.log(`  Departments (${s.departments.length}): ${s.departments.join(', ')}`);
      console.log(`  Community areas: ${s.areas.length}`);
      console.log(`  Wards: ${s.wards.length}`);
      console.log(`  Records with valid coordinates: ${s.withCoords}/${finalCount}`);
    }

    // Check for duplicates
    const dupCheck = await HistoricalComplaint.aggregate([
      { $group: { _id: '$complaintId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 10 }
    ]);
    console.log(`\n[Import] Duplicate complaintIds: ${dupCheck.length}`);
    if (dupCheck.length > 0) {
      console.log(`  Examples: ${JSON.stringify(dupCheck.slice(0,5))}`);
    }

  } catch (error) {
    console.error('[Import] Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('[Database] Connection closed');
  }
}

importHistoricalComplaints();