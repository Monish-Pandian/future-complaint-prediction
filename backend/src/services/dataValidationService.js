const mongoose = require('mongoose');
const { HistoricalComplaint } = require('../models/HistoricalComplaint');
const ApiError = require('../utils/apiError');

const CHICAGO_BOUNDS = {
  minLat: 41.64,
  maxLat: 42.02,
  minLon: -87.94,
  maxLon: -87.52,
};

const VALID_COMPLAINT_TYPES = [
  'Abandoned Vehicle Complaint',
  'Blue Recycling Cart',
  'Building Violation',
  'Garbage Cart Maintenance',
  'Graffiti Removal Request',
  'Pothole in Street Complaint',
  'Rodent Baiting/Rat Complaint',
  'Street Light Out Complaint',
  'Traffic Signal Out Complaint',
  'Tree Debris Clean-Up Request',
];

const VALID_COMMUNITY_AREAS = Array.from({ length: 77 }, (_, i) => String(i + 1));
const VALID_WARDS = Array.from({ length: 50 }, (_, i) => String(i + 1));

class DataValidationService {
  constructor() {
    this.report = {};
  }

  async validateHistoricalComplaints(options = {}) {
    const {
      sampleSize = 1000,
      checkDuplicates = true,
      checkBounds = true,
      checkTemporalGaps = true,
    } = options;

    console.log('[DataValidation] Starting HistoricalComplaints validation...');

    this.report = {
      timestamp: new Date().toISOString(),
      validationOptions: { sampleSize, checkDuplicates, checkBounds, checkTemporalGaps },
      summary: {},
      checks: {},
      passed: true,
      criticalFailures: [],
      warnings: [],
    };

    try {
      await this._checkTotalCount();
      await this._checkDateRange();
      await this._checkMissingFields();
      await this._checkDuplicateComplaintIds(checkDuplicates);
      await this._checkComplaintTypes();
      await this._checkCommunityAreas();
      await this._checkWards();
      await this._checkCoordinates(checkBounds);
      await this._checkTemporalGaps(checkTemporalGaps);
      await this._checkDepartmentMappingCoverage();

      this._finalizeReport();

      console.log('[DataValidation] Validation completed');
      return this.report;
    } catch (error) {
      this.report.passed = false;
      this.report.error = error.message;
      console.error('[DataValidation] Validation error:', error);
      return this.report;
    }
  }

  async _checkTotalCount() {
    const count = await HistoricalComplaint.countDocuments();
    this.report.summary.totalRecords = count;
    this.report.checks.totalCount = { count, passed: count > 0 };
    if (count === 0) {
      this.report.criticalFailures.push('No historical complaint records found');
    }
  }

  async _checkDateRange() {
    const dateRange = await HistoricalComplaint.aggregate([
      { $group: { _id: null, earliest: { $min: '$createdAt' }, latest: { $max: '$createdAt' } } }
    ]);

    if (dateRange.length > 0) {
      const { earliest, latest } = dateRange[0];
      this.report.summary.dateRange = { earliest, latest };
      this.report.checks.dateRange = { earliest, latest, passed: !!earliest && !!latest };

      if (!earliest || !latest) {
        this.report.criticalFailures.push('Invalid date range: missing earliest or latest date');
      }
    } else {
      this.report.criticalFailures.push('Could not determine date range');
    }
  }

  async _checkMissingFields() {
    const requiredFields = [
      'complaintId',
      'complaintType',
      'department',
      'communityArea',
      'ward',
      'createdAt',
    ];

    const pipeline = requiredFields.map(field => ({
      $sum: {
        $cond: [
          { $or: [
            { $eq: [`$${field}`, null] },
            { $eq: [`$${field}`, ''] },
            { $eq: [`$${field}`, []] }
          ]},
          1,
          0
        ]
      }
    }));

    const result = await HistoricalComplaint.aggregate([
      { $group: { _id: null, ...Object.fromEntries(requiredFields.map((f, i) => [`missing${f.charAt(0).toUpperCase() + f.slice(1)}`, pipeline[i]])) } }
    ]);

    const missing = result[0] || {};
    this.report.checks.missingFields = missing;

    for (const [field, count] of Object.entries(missing)) {
      if (count > 0) {
        this.report.warnings.push(`Missing ${field}: ${count} records`);
      }
    }
  }

  async _checkDuplicateComplaintIds(enabled) {
    if (!enabled) {
      this.report.checks.duplicateComplaintIds = { checked: false };
      return;
    }

    const duplicates = await HistoricalComplaint.aggregate([
      { $group: { _id: '$complaintId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 10 }
    ]);

    const dupCount = duplicates.length;
    this.report.checks.duplicateComplaintIds = {
      checked: true,
      duplicateCount: dupCount,
      samples: duplicates.map(d => ({ complaintId: d._id, count: d.count })),
      passed: dupCount === 0,
    };

    if (dupCount > 0) {
      this.report.criticalFailures.push(`Found ${dupCount} duplicate complaintId values`);
    }
  }

  async _checkComplaintTypes() {
    const types = await HistoricalComplaint.distinct('complaintType');
    const invalidTypes = types.filter(t => !VALID_COMPLAINT_TYPES.includes(t));
    const missingTypes = VALID_COMPLAINT_TYPES.filter(t => !types.includes(t));

    this.report.checks.complaintTypes = {
      foundTypes: types.length,
      validTypes: types.filter(t => VALID_COMPLAINT_TYPES.includes(t)).length,
      invalidTypes,
      missingTypes,
      passed: invalidTypes.length === 0,
    };

    if (invalidTypes.length > 0) {
      this.report.warnings.push(`Found ${invalidTypes.length} invalid complaint types: ${invalidTypes.join(', ')}`);
    }
    if (missingTypes.length > 0) {
      this.report.warnings.push(`Missing expected complaint types: ${missingTypes.join(', ')}`);
    }
  }

  async _checkCommunityAreas() {
    const areas = await HistoricalComplaint.distinct('communityArea');
    const invalidAreas = areas.filter(a => !VALID_COMMUNITY_AREAS.includes(String(a)));
    const missingAreas = VALID_COMMUNITY_AREAS.filter(a => !areas.includes(a));

    this.report.checks.communityAreas = {
      foundAreas: areas.length,
      validAreas: areas.filter(a => VALID_COMMUNITY_AREAS.includes(String(a))).length,
      invalidAreas: invalidAreas.slice(0, 20),
      missingAreas: missingAreas.slice(0, 20),
      passed: invalidAreas.length === 0,
    };

    if (invalidAreas.length > 0) {
      this.report.warnings.push(`Found ${invalidAreas.length} invalid community areas`);
    }
  }

  async _checkWards() {
    const wards = await HistoricalComplaint.distinct('ward');
    const invalidWards = wards.filter(w => !VALID_WARDS.includes(String(w)));

    this.report.checks.wards = {
      foundWards: wards.length,
      invalidWards: invalidWards.slice(0, 20),
      passed: invalidWards.length === 0,
    };

    if (invalidWards.length > 0) {
      this.report.warnings.push(`Found ${invalidWards.length} invalid wards`);
    }
  }

  async _checkCoordinates(enabled) {
    if (!enabled) {
      this.report.checks.coordinates = { checked: false };
      return;
    }

    const total = await HistoricalComplaint.countDocuments();
    const validCoords = await HistoricalComplaint.countDocuments({
      'location.coordinates': {
        $ne: [0, 0],
        $exists: true,
      },
      'location.coordinates.0': { $gte: CHICAGO_BOUNDS.minLon, $lte: CHICAGO_BOUNDS.maxLon },
      'location.coordinates.1': { $gte: CHICAGO_BOUNDS.minLat, $lte: CHICAGO_BOUNDS.maxLat },
    });

    const invalidCoords = total - validCoords;
    const zeroCoords = await HistoricalComplaint.countDocuments({ 'location.coordinates': [0, 0] });

    this.report.checks.coordinates = {
      checked: true,
      total,
      validCoords,
      invalidCoords,
      zeroCoords,
      pctValid: total > 0 ? (validCoords / total * 100).toFixed(2) : 0,
      passed: invalidCoords === 0,
    };

    if (invalidCoords > 0) {
      this.report.warnings.push(`${invalidCoords} records have invalid or out-of-bounds coordinates`);
    }
  }

  async _checkTemporalGaps(enabled) {
    if (!enabled) {
      this.report.checks.temporalGaps = { checked: false };
      return;
    }

    const years = await HistoricalComplaint.aggregate([
      { $group: { _id: { $year: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const yearCounts = {};
    years.forEach(y => { yearCounts[y._id] = y.count; });

    const yearRange = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
    const expectedYears = Array.from({ length: yearRange[yearRange.length - 1] - yearRange[0] + 1 }, (_, i) => yearRange[0] + i);
    const missingYears = expectedYears.filter(y => !yearCounts[y]);

    this.report.checks.temporalGaps = {
      checked: true,
      yearsPresent: yearRange,
      yearCounts,
      missingYears,
      passed: missingYears.length === 0,
    };

    if (missingYears.length > 0) {
      this.report.warnings.push(`Missing years in data: ${missingYears.join(', ')}`);
    }
  }

  async _checkDepartmentMappingCoverage() {
    const deptCounts = await HistoricalComplaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    this.report.checks.departmentMapping = {
      departments: deptCounts.map(d => ({ department: d._id, count: d.count })),
      totalDepartments: deptCounts.length,
    };
  }

  _finalizeReport() {
    this.report.passed = this.report.criticalFailures.length === 0;
    this.report.summary.criticalFailures = this.report.criticalFailures.length;
    this.report.summary.warnings = this.report.warnings.length;

    const checkResults = Object.entries(this.report.checks).filter(([_, v]) => v.passed !== undefined);
    this.report.summary.checksPassed = checkResults.filter(([_, v]) => v.passed).length;
    this.report.summary.checksTotal = checkResults.length;
  }

  async getDataQualityMetadata() {
    const validation = await this.validateHistoricalComplaints({ checkDuplicates: false });
    return {
      validatedAt: validation.timestamp,
      passed: validation.passed,
      totalRecords: validation.summary.totalRecords,
      dateRange: validation.summary.dateRange,
      checksPassed: validation.summary.checksPassed,
      checksTotal: validation.summary.checksTotal,
      criticalFailures: validation.criticalFailures,
      warnings: validation.warnings,
    };
  }
}

module.exports = {
  DataValidationService,
  CHICAGO_BOUNDS,
  VALID_COMPLAINT_TYPES,
  VALID_COMMUNITY_AREAS,
  VALID_WARDS,
};