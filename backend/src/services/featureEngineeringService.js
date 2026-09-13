const mongoose = require('mongoose');
const { HistoricalComplaint } = require('../models/HistoricalComplaint');
const { CommunityAreaCentroid } = require('../models/CommunityAreaCentroid');

const TARGET_COMPLAINT_TYPES = [
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

const WARD_MAPPING = {
  1: 40, 2: 16, 3: 40, 4: 39, 5: 1, 6: 32, 7: 1, 8: 2,
  9: 41, 10: 39, 11: 39, 12: 39, 13: 33, 14: 33, 15: 23, 16: 30,
  17: 29, 18: 29, 19: 26, 20: 26, 21: 30, 22: 1, 23: 1, 24: 1,
  25: 24, 26: 24, 27: 24, 28: 3, 29: 12, 30: 12, 31: 11, 32: 3,
  33: 3, 34: 3, 35: 3, 36: 4, 37: 3, 38: 3, 39: 4, 40: 3,
  41: 4, 42: 5, 43: 5, 44: 6, 45: 5, 46: 7, 47: 8, 48: 7,
  49: 6, 50: 7, 51: 7, 52: 9, 53: 9, 54: 9, 55: 10, 56: 13,
  57: 14, 58: 12, 59: 11, 60: 11, 61: 3, 62: 13, 63: 14, 64: 13,
  65: 13, 66: 14, 67: 6, 68: 3, 69: 5, 70: 13, 71: 6, 72: 18,
  73: 9, 74: 19, 75: 19, 76: 38, 77: 32,
};

const SEASON_MAP = {
  12: 'Winter', 1: 'Winter', 2: 'Winter',
  3: 'Spring', 4: 'Spring', 5: 'Spring',
  6: 'Summer', 7: 'Summer', 8: 'Summer',
  9: 'Autumn', 10: 'Autumn', 11: 'Autumn',
};

const VALID_FEATURES = [
  'community_area', 'week_start', 'week_end', 'year', 'week_of_year', 'year_week',
  'sr_type', 'complaints_last_1_week', 'complaints_last_2_week', 'complaints_last_4_week',
  'complaints_last_8_week', 'complaints_last_12_week', 'rolling_mean_4_weeks',
  'rolling_max_4_weeks', 'rolling_std_4_weeks', 'rolling_mean_8_weeks',
  'rolling_max_8_weeks', 'rolling_std_8_weeks', 'rolling_mean_12_weeks',
  'rolling_max_12_weeks', 'rolling_std_12_weeks', 'month', 'quarter', 'season',
  'same_week_previous_year_count', 'same_month_previous_year_count',
  'previous_year_same_community_count', 'previous_year_same_complaint_count',
  'ward', 'total_complaints_all_types_last_1_week', 'total_complaints_all_types_last_4_weeks',
  'total_complaints_all_types_last_8_weeks', 'total_complaints_all_types_last_12_weeks',
  'distinct_complaint_types_last_4_weeks', 'distinct_complaint_types_last_8_weeks',
  'distinct_complaint_types_last_12_weeks'
];

const FORBIDDEN_COLUMNS = [
  'complaint_count',
  'future_complaint',
  'future_complaint_count',
  'actual_future_complaint',
  'actual_future_complaint_count',
  'dataset_period'
];

const MODEL_FEATURES = VALID_FEATURES.filter(f => !['week_start', 'week_end', 'year_week'].includes(f));

class FeatureEngineeringService {
  constructor() {
    this.centroidCache = new Map();
    this.weeklyGrid = null;
  }

  async loadCentroids() {
    if (this.centroidCache.size > 0) return this.centroidCache;

    const centroids = await CommunityAreaCentroid.find({}).lean();
    for (const c of centroids) {
      this.centroidCache.set(c.communityArea, { lat: c.latitude, lon: c.longitude });
    }
    console.log(`[FeatureEngineering] Loaded ${centroids.length} community area centroids`);
    return this.centroidCache;
  }

  async computeChronologicalSplits() {
    console.log('[FeatureEngineering] Computing chronological splits from MongoDB...');

    const dateRange = await HistoricalComplaint.aggregate([
      { $match: { complaintType: { $in: TARGET_COMPLAINT_TYPES } } },
      { $group: { _id: null, earliest: { $min: '$createdAt' }, latest: { $max: '$createdAt' } } }
    ]);

    if (!dateRange.length) {
      throw new Error('No historical complaints found for target types');
    }

    const earliest = new Date(dateRange[0].earliest);
    const latest = new Date(dateRange[0].latest);

    const earliestYear = earliest.getFullYear();
    const latestYear = latest.getFullYear();

    console.log(`[FeatureEngineering] Data range: ${earliestYear} - ${latestYear}`);

    let trainEndYear, valEndYear, testEndYear;

    if (latestYear >= 2025) {
      trainEndYear = 2023;
      valEndYear = 2024;
      testEndYear = 2025;
    } else if (latestYear === 2024) {
      trainEndYear = 2022;
      valEndYear = 2023;
      testEndYear = 2024;
    } else if (latestYear === 2023) {
      trainEndYear = 2021;
      valEndYear = 2022;
      testEndYear = 2023;
    } else {
      const totalYears = latestYear - earliestYear + 1;
      const trainYears = Math.max(1, Math.floor(totalYears * 0.7));
      const valYears = Math.max(1, Math.floor(totalYears * 0.15));
      trainEndYear = earliestYear + trainYears - 1;
      valEndYear = trainEndYear + valYears;
      testEndYear = latestYear;
    }

    const trainStart = new Date(`${earliestYear}-01-01`);
    const trainEnd = new Date(`${trainEndYear}-12-31T23:59:59`);
    const valStart = new Date(`${trainEndYear + 1}-01-01`);
    const valEnd = new Date(`${valEndYear}-12-31T23:59:59`);
    const testStart = new Date(`${valEndYear + 1}-01-01`);
    const testEnd = new Date(`${testEndYear}-12-31T23:59:59`);

    const splits = {
      train: { start: trainStart, end: trainEnd },
      validation: { start: valStart, end: valEnd },
      test: { start: testStart, end: testEnd },
    };

    console.log('[FeatureEngineering] Chronological splits:');
    Object.entries(splits).forEach(([name, range]) => {
      console.log(`  ${name}: ${range.start.toISOString().split('T')[0]} to ${range.end.toISOString().split('T')[0]}`);
    });

    return splits;
  }

  async buildWeeklyGrid() {
    console.log('[FeatureEngineering] Building weekly grid from MongoDB...');

    const pipeline = [
      { $match: { complaintType: { $in: TARGET_COMPLAINT_TYPES } } },
      {
        $project: {
          communityArea: 1,
          srType: '$complaintType',
          createdAt: 1,
          year: { $year: '$createdAt' },
          weekOfYear: { $isoWeek: '$createdAt' },
        }
      },
      {
        $group: {
          _id: {
            communityArea: '$communityArea',
            srType: '$srType',
            year: '$year',
            weekOfYear: '$weekOfYear',
          },
          complaintCount: { $sum: 1 },
        }
      },
      {
        $project: {
          _id: 0,
          communityArea: '$_id.communityArea',
          srType: '$_id.srType',
          year: '$_id.year',
          weekOfYear: '$_id.weekOfYear',
          complaintCount: 1,
        }
      },
      { $sort: { communityArea: 1, srType: 1, year: 1, weekOfYear: 1 } }
    ];

    const results = await HistoricalComplaint.aggregate(pipeline);
    console.log(`[FeatureEngineering] Aggregated ${results.length} non-zero weekly counts`);

    const allCommunities = Array.from({ length: 77 }, (_, i) => String(i + 1));
    const years = [...new Set(results.map(r => r.year))].sort((a, b) => a - b);
    const maxWeek = 52;

    const grid = [];
    for (const year of years) {
      for (let week = 1; week <= maxWeek; week++) {
        const weekStart = this._getWeekStart(year, week);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const yearWeek = `${year}-W${String(week).padStart(2, '0')}`;

        for (const communityArea of allCommunities) {
          for (const srType of TARGET_COMPLAINT_TYPES) {
            const match = results.find(r =>
              r.communityArea === communityArea &&
              r.srType === srType &&
              r.year === year &&
              r.weekOfYear === week
            );

            grid.push({
              community_area: parseInt(communityArea),
              week_start: weekStart,
              week_end: weekEnd,
              year,
              week_of_year: week,
              year_week: yearWeek,
              sr_type: srType,
              complaint_count: match ? match.complaintCount : 0,
            });
          }
        }
      }
    }

    this.weeklyGrid = grid;
    console.log(`[FeatureEngineering] Weekly grid created: ${grid.length} rows`);
    return grid;
  }

  _getWeekStart(year, weekOfYear) {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay();
    const week1Start = new Date(jan4);
    week1Start.setDate(jan4.getDate() - jan4Day + (jan4Day === 0 ? -6 : 1));
    const targetWeekStart = new Date(week1Start);
    targetWeekStart.setDate(week1Start.getDate() + (weekOfYear - 1) * 7);
    return targetWeekStart;
  }

  async createLagFeatures(grid) {
    console.log('[FeatureEngineering] Creating lag features...');

    const lagPeriods = [1, 2, 4, 8, 12];
    const df = grid;

    for (const lag of lagPeriods) {
      const colName = `complaints_last_${lag}_week`;
      const shifted = new Map();

      for (const row of df) {
        const key = `${row.community_area}|${row.sr_type}|${row.year}|${row.week_of_year}`;
        const prevWeek = row.week_of_year - lag;
        let prevYear = row.year;
        let prevWeekNum = prevWeek;

        if (prevWeek <= 0) {
          prevYear = row.year - 1;
          prevWeekNum = 52 + prevWeek;
        }

        const prevKey = `${row.community_area}|${row.sr_type}|${prevYear}|${prevWeekNum}`;
        shifted.set(key, prevKey);
      }

      for (const row of df) {
        const key = `${row.community_area}|${row.sr_type}|${row.year}|${row.week_of_year}`;
        const prevKey = shifted.get(key);
        const prevRow = df.find(r =>
          r.community_area === row.community_area &&
          r.sr_type === row.sr_type &&
          `${r.year}|${r.week_of_year}` === prevKey?.split('|').slice(2).join('|')
        );
        row[colName] = prevRow ? prevRow.complaint_count : 0;
      }
    }

    return df;
  }

  async createRollingFeatures(grid) {
    console.log('[FeatureEngineering] Creating rolling features...');

    const windows = [4, 8, 12];
    const df = grid;

    for (const w of windows) {
      for (const row of df) {
        const priorRows = df.filter(r =>
          r.community_area === row.community_area &&
          r.sr_type === row.sr_type &&
          ((r.year < row.year) ||
            (r.year === row.year && r.week_of_year < row.week_of_year))
        ).slice(-w);

        if (priorRows.length === w) {
          const counts = priorRows.map(r => r.complaint_count);
          row[`rolling_mean_${w}_weeks`] = counts.reduce((a, b) => a + b, 0) / w;
          row[`rolling_max_${w}_weeks`] = Math.max(...counts);
          const mean = row[`rolling_mean_${w}_weeks`];
          row[`rolling_std_${w}_weeks`] = Math.sqrt(counts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / w);
        } else {
          row[`rolling_mean_${w}_weeks`] = 0;
          row[`rolling_max_${w}_weeks`] = 0;
          row[`rolling_std_${w}_weeks`] = 0;
        }
      }
    }

    return df;
  }

  async createSeasonalFeatures(grid) {
    console.log('[FeatureEngineering] Creating seasonal features...');

    const df = grid;

    for (const row of df) {
      row.month = new Date(row.week_start).getMonth() + 1;
      row.quarter = Math.ceil(row.month / 3);
      row.season = SEASON_MAP[row.month];
    }

    const weeklyLookup = new Map();
    const monthlyLookup = new Map();
    const communityYearlyLookup = new Map();
    const complaintYearlyLookup = new Map();

    for (const row of df) {
      const weekKey = `${row.community_area}|${row.sr_type}|${row.year}|${row.week_of_year}`;
      weeklyLookup.set(weekKey, row.complaint_count);

      const monthKey = `${row.community_area}|${row.sr_type}|${row.year}|${row.month}`;
      if (!monthlyLookup.has(monthKey)) monthlyLookup.set(monthKey, 0);
      monthlyLookup.set(monthKey, monthlyLookup.get(monthKey) + row.complaint_count);

      const commYearKey = `${row.community_area}|${row.year}`;
      if (!communityYearlyLookup.has(commYearKey)) communityYearlyLookup.set(commYearKey, 0);
      communityYearlyLookup.set(commYearKey, communityYearlyLookup.get(commYearKey) + row.complaint_count);

      const srYearKey = `${row.sr_type}|${row.year}`;
      if (!complaintYearlyLookup.has(srYearKey)) complaintYearlyLookup.set(srYearKey, 0);
      complaintYearlyLookup.set(srYearKey, complaintYearlyLookup.get(srYearKey) + row.complaint_count);
    }

    for (const row of df) {
      const prevYear = row.year - 1;

      const prevWeekKey = `${row.community_area}|${row.sr_type}|${prevYear}|${row.week_of_year}`;
      row.same_week_previous_year_count = weeklyLookup.get(prevWeekKey) || 0;

      const prevMonthKey = `${row.community_area}|${row.sr_type}|${prevYear}|${row.month}`;
      row.same_month_previous_year_count = monthlyLookup.get(prevMonthKey) || 0;

      const prevCommYearKey = `${row.community_area}|${prevYear}`;
      row.previous_year_same_community_count = communityYearlyLookup.get(prevCommYearKey) || 0;

      const prevSrYearKey = `${row.sr_type}|${prevYear}`;
      row.previous_year_same_complaint_count = complaintYearlyLookup.get(prevSrYearKey) || 0;
    }

    return df;
  }

  async createSpatialFeatures(grid) {
    console.log('[FeatureEngineering] Creating spatial features...');

    const df = grid;

    for (const row of df) {
      row.ward = WARD_MAPPING[row.community_area] || 0;
    }

    const communityWeekly = new Map();
    const communityWeeklyDistinct = new Map();

    for (const row of df) {
      const key = `${row.community_area}|${row.year}|${row.week_of_year}`;
      if (!communityWeekly.has(key)) communityWeekly.set(key, 0);
      communityWeekly.set(key, communityWeekly.get(key) + row.complaint_count);

      if (row.complaint_count > 0) {
        const distinctKey = `${row.community_area}|${row.year}|${row.week_of_year}|${row.sr_type}`;
        communityWeeklyDistinct.set(distinctKey, true);
      }
    }

    const communityWeeklyFull = new Map();
    for (const [key, total] of communityWeekly) {
      const [ca, year, week] = key.split('|').map(v => isNaN(v) ? v : parseInt(v));
      const distinctCount = [...communityWeeklyDistinct.keys()].filter(k => {
        const [dca, dyear, dweek] = k.split('|').map(v => isNaN(v) ? v : parseInt(v));
        return dca === ca && dyear === year && dweek === week;
      }).length;
      communityWeeklyFull.set(key, { total, distinct: distinctCount });
    }

    const windows = [1, 4, 8, 12];
    for (const w of windows) {
      const colName = w === 1 ? 'total_complaints_all_types_last_1_week' : `total_complaints_all_types_last_${w}_weeks`;

      for (const row of df) {
        const priorWeeks = [];
        for (let offset = 1; offset <= w; offset++) {
          let prevWeek = row.week_of_year - offset;
          let prevYear = row.year;
          if (prevWeek <= 0) {
            prevYear = row.year - 1;
            prevWeek = 52 + prevWeek;
          }
          priorWeeks.push(`${row.community_area}|${prevYear}|${prevWeek}`);
        }

        if (w === 1) {
          const prior = communityWeeklyFull.get(priorWeeks[0]);
          row[colName] = prior ? prior.total : 0;
        } else {
          let sum = 0;
          for (const pw of priorWeeks) {
            const prior = communityWeeklyFull.get(pw);
            if (prior) sum += prior.total;
          }
          row[colName] = sum;
        }
      }
    }

    const activeComplaints = new Set();
    for (const row of df) {
      if (row.complaint_count > 0) {
        activeComplaints.add(`${row.community_area}|${row.sr_type}|${row.year}|${row.week_of_year}`);
      }
    }

    for (const w of [4, 8, 12]) {
      const colName = `distinct_complaint_types_last_${w}_weeks`;

      for (const row of df) {
        const priorWeeks = [];
        for (let offset = 1; offset <= w; offset++) {
          let prevWeek = row.week_of_year - offset;
          let prevYear = row.year;
          if (prevWeek <= 0) {
            prevYear = row.year - 1;
            prevWeek = 52 + prevWeek;
          }
          priorWeeks.push(`${row.community_area}|${prevYear}|${prevWeek}`);
        }

        const distinctTypes = new Set();
        for (const pw of priorWeeks) {
          for (const srType of TARGET_COMPLAINT_TYPES) {
            if (activeComplaints.has(`${row.community_area}|${srType}|${pw.split('|')[1]}|${pw.split('|')[2]}`)) {
              distinctTypes.add(srType);
            }
          }
        }
        row[colName] = distinctTypes.size;
      }
    }

    return df;
  }

  async createFutureTarget(grid) {
    console.log('[FeatureEngineering] Creating future target...');

    const df = grid;
    const lookup = new Map();

    for (const row of df) {
      const key = `${row.community_area}|${row.sr_type}|${row.year}|${row.week_of_year}`;
      lookup.set(key, row.complaint_count);
    }

    for (const row of df) {
      let nextWeek = row.week_of_year + 1;
      let nextYear = row.year;
      if (nextWeek > 52) {
        nextYear = row.year + 1;
        nextWeek = 1;
      }

      const nextKey = `${row.community_area}|${row.sr_type}|${nextYear}|${nextWeek}`;
      const nextCount = lookup.get(nextKey);

      if (nextCount !== undefined) {
        row.future_complaint_count = nextCount;
        row.future_complaint = nextCount >= 1 ? 1 : 0;
      } else {
        row.future_complaint_count = NaN;
        row.future_complaint = NaN;
      }
    }

    return df;
  }

  async buildFullFeatureDataset() {
    console.log('[FeatureEngineering] Building full feature dataset from MongoDB...');

    await this.loadCentroids();
    await this.buildWeeklyGrid();
    let grid = [...this.weeklyGrid];

    grid = await this.createLagFeatures(grid);
    grid = await this.createRollingFeatures(grid);
    grid = await this.createSeasonalFeatures(grid);
    grid = await this.createSpatialFeatures(grid);
    grid = await this.createFutureTarget(grid);

    console.log(`[FeatureEngineering] Full dataset built: ${grid.length} rows, ${Object.keys(grid[0] || {}).length} columns`);

    return grid;
  }

  async filterFeaturesForPrediction(predictionWeek, filters = {}) {
    const grid = await this.buildFullFeatureDataset();

    const predWeekStart = new Date(predictionWeek);
    const predWeekEnd = new Date(predWeekStart);
    predWeekEnd.setDate(predWeekEnd.getDate() + 6);

    let df = grid.filter(row => {
      const weekStart = new Date(row.week_start);
      return weekStart >= predWeekStart && weekStart <= predWeekEnd;
    });

    if (filters.communityAreas && filters.communityAreas.length > 0) {
      const areas = filters.communityAreas.map(a => parseInt(a));
      df = df.filter(row => areas.includes(row.community_area));
    }

    if (filters.srTypes && filters.srTypes.length > 0) {
      df = df.filter(row => filters.srTypes.includes(row.sr_type));
    }

    return df;
  }

  prepareFeaturesForModel(df) {
    const X = df.map(row => {
      const features = {};
      for (const feature of VALID_FEATURES) {
        features[feature] = row[feature] !== undefined ? row[feature] : 0;
      }
      return features;
    });

    return X;
  }

  prepareFeaturesForModelPrediction(df) {
    const X = df.map(row => {
      const features = {};
      for (const feature of MODEL_FEATURES) {
        features[feature] = row[feature] !== undefined ? row[feature] : 0;
      }
      return features;
    });

    return X;
  }

  getValidFeatures() {
    return VALID_FEATURES;
  }

  getModelFeatures() {
    return MODEL_FEATURES;
  }

  getForbiddenColumns() {
    return FORBIDDEN_COLUMNS;
  }
}

module.exports = {
  FeatureEngineeringService,
  TARGET_COMPLAINT_TYPES,
  VALID_FEATURES,
  FORBIDDEN_COLUMNS,
  WARD_MAPPING,
  SEASON_MAP,
  MODEL_FEATURES,
};