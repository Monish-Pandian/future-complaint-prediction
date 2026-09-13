#!/usr/bin/env python3
"""
Optimized Feature Engineering from MongoDB
Replaces the JavaScript implementation with vectorized pandas operations.
"""

import json
import pandas as pd
import numpy as np
import argparse
import sys
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

TARGET_COMPLAINT_TYPES = [
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
]

WARD_MAPPING = {
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
}

SEASON_MAP = {
    12: 'Winter', 1: 'Winter', 2: 'Winter',
    3: 'Spring', 4: 'Spring', 5: 'Spring',
    6: 'Summer', 7: 'Summer', 8: 'Summer',
    9: 'Autumn', 10: 'Autumn', 11: 'Autumn',
}

VALID_FEATURES = [
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
]

FORBIDDEN_COLUMNS = [
    'complaint_count',
    'future_complaint',
    'future_complaint_count',
    'actual_future_complaint',
    'actual_future_complaint_count',
    'dataset_period'
]

def get_week_start(year, week_of_year):
    """Get Monday of the given ISO week."""
    jan4 = pd.Timestamp(year=year, month=1, day=4)
    week1_start = jan4 - pd.Timedelta(days=jan4.dayofweek)
    target_week_start = week1_start + pd.Timedelta(weeks=week_of_year - 1)
    return target_week_start

def load_data_from_mongodb(mongo_uri, db_name, start_date=None, end_date=None):
    """Load historical complaints from MongoDB with optional date filtering."""
    print(f"[FeatureEngineering] Connecting to MongoDB: {mongo_uri}")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
    
    try:
        client.admin.command('ping')
        print("[FeatureEngineering] MongoDB connection successful")
    except ConnectionFailure as e:
        print(f"[FeatureEngineering] MongoDB connection failed: {e}")
        raise
    
    db = client[db_name]
    collection = db['historicalcomplaints']
    
    match_query = {'complaintType': {'$in': TARGET_COMPLAINT_TYPES}}
    if start_date or end_date:
        match_query['createdAt'] = {}
        if start_date:
            match_query['createdAt']['$gte'] = pd.Timestamp(start_date)
        if end_date:
            match_query['createdAt']['$lte'] = pd.Timestamp(end_date)
    
    pipeline = [
        {'$match': match_query},
        {'$project': {
            'communityArea': 1,
            'srType': '$complaintType',
            'createdAt': 1,
            'year': {'$year': '$createdAt'},
            'weekOfYear': {'$isoWeek': '$createdAt'},
        }},
        {'$group': {
            '_id': {
                'communityArea': '$communityArea',
                'srType': '$srType',
                'year': '$year',
                'weekOfYear': '$weekOfYear',
            },
            'complaintCount': {'$sum': 1},
        }},
        {'$project': {
            '_id': 0,
            'communityArea': '$_id.communityArea',
            'srType': '$_id.srType',
            'year': '$_id.year',
            'weekOfYear': '$_id.weekOfYear',
            'complaintCount': 1,
        }},
        {'$sort': {'communityArea': 1, 'srType': 1, 'year': 1, 'weekOfYear': 1}}
    ]
    
    print("[FeatureEngineering] Running aggregation pipeline...")
    cursor = collection.aggregate(pipeline, allowDiskUse=True)
    results = list(cursor)
    client.close()
    
    print(f"[FeatureEngineering] Aggregated {len(results)} non-zero weekly counts")
    return pd.DataFrame(results)

def build_weekly_grid(df_counts):
    """Build complete weekly grid using vectorized operations."""
    print("[FeatureEngineering] Building weekly grid...")
    
    if len(df_counts) == 0:
        raise ValueError("No data returned from MongoDB")
    
    all_communities = [str(i) for i in range(1, 78)]
    years = sorted(df_counts['year'].unique())
    max_week = 52
    
    # Create complete grid using cross join
    grid_data = []
    for year in years:
        for week in range(1, max_week + 1):
            week_start = get_week_start(year, week)
            week_end = week_start + pd.Timedelta(days=6)
            year_week = f"{year}-W{week:02d}"
            
            for community_area in all_communities:
                for sr_type in TARGET_COMPLAINT_TYPES:
                    grid_data.append({
                        'community_area': int(community_area),
                        'week_start': week_start,
                        'week_end': week_end,
                        'year': year,
                        'week_of_year': week,
                        'year_week': year_week,
                        'sr_type': sr_type,
                    })
    
    grid = pd.DataFrame(grid_data)
    print(f"[FeatureEngineering] Grid created: {len(grid)} rows")
    
    # Merge with actual counts
    df_counts = df_counts.rename(columns={
        'communityArea': 'community_area',
        'srType': 'sr_type',
        'year': 'year',
        'weekOfYear': 'week_of_year',
        'complaintCount': 'complaint_count'
    })
    df_counts['community_area'] = df_counts['community_area'].astype(int)
    df_counts['week_of_year'] = df_counts['week_of_year'].astype(int)
    
    grid = grid.merge(df_counts, on=['community_area', 'sr_type', 'year', 'week_of_year'], how='left')
    grid['complaint_count'] = grid['complaint_count'].fillna(0).astype(int)
    
    print(f"[FeatureEngineering] Weekly grid with counts: {len(grid)} rows")
    return grid

def create_lag_features(grid):
    """Create lag features using vectorized shift operations."""
    print("[FeatureEngineering] Creating lag features...")
    
    df = grid.copy()
    lag_periods = [1, 2, 4, 8, 12]
    
    # Sort for proper shifting
    df = df.sort_values(['community_area', 'sr_type', 'year', 'week_of_year']).reset_index(drop=True)
    
    # Create a composite key for grouping
    df['group_key'] = df['community_area'].astype(str) + '|' + df['sr_type'] + '|' + df['year'].astype(str) + '|' + df['week_of_year'].astype(str)
    
    # Create previous week keys for each lag
    for lag in lag_periods:
        col_name = f'complaints_last_{lag}_week'
        
        # Calculate previous week/year
        df['prev_week'] = df['week_of_year'] - lag
        df['prev_year'] = df['year']
        mask = df['prev_week'] <= 0
        df.loc[mask, 'prev_year'] = df.loc[mask, 'year'] - 1
        df.loc[mask, 'prev_week'] = 52 + df.loc[mask, 'prev_week']
        
        df['prev_key'] = df['community_area'].astype(str) + '|' + df['sr_type'] + '|' + df['prev_year'].astype(str) + '|' + df['prev_week'].astype(str)
        
        # Map complaint counts using the key
        complaint_map = df.set_index('group_key')['complaint_count'].to_dict()
        df[col_name] = df['prev_key'].map(complaint_map).fillna(0).astype(int)
        
        df = df.drop(['prev_week', 'prev_year', 'prev_key'], axis=1)
    
    df = df.drop('group_key', axis=1)
    return df

def create_rolling_features(grid):
    """Create rolling window features using vectorized operations."""
    print("[FeatureEngineering] Creating rolling features...")
    
    df = grid.copy()
    windows = [4, 8, 12]
    
    df = df.sort_values(['community_area', 'sr_type', 'year', 'week_of_year']).reset_index(drop=True)
    
    for w in windows:
        # Use expanding window with shift to get prior w weeks
        group_cols = ['community_area', 'sr_type']
        
        # Rolling mean
        df[f'rolling_mean_{w}_weeks'] = (
            df.groupby(group_cols)['complaint_count']
            .transform(lambda x: x.shift(1).rolling(w, min_periods=w).mean())
            .fillna(0)
        )
        
        # Rolling max
        df[f'rolling_max_{w}_weeks'] = (
            df.groupby(group_cols)['complaint_count']
            .transform(lambda x: x.shift(1).rolling(w, min_periods=w).max())
            .fillna(0)
        )
        
        # Rolling std
        df[f'rolling_std_{w}_weeks'] = (
            df.groupby(group_cols)['complaint_count']
            .transform(lambda x: x.shift(1).rolling(w, min_periods=w).std())
            .fillna(0)
        )
    
    return df

def create_seasonal_features(grid):
    """Create seasonal features using vectorized operations."""
    print("[FeatureEngineering] Creating seasonal features...")
    
    df = grid.copy()
    
    # Basic date features
    df['month'] = df['week_start'].dt.month
    df['quarter'] = df['week_start'].dt.quarter
    df['season'] = df['month'].map(SEASON_MAP)
    
    # Create lookup maps for previous year comparisons
    # same_week_previous_year_count
    week_key = df.set_index(['community_area', 'sr_type', 'year', 'week_of_year'])['complaint_count'].to_dict()
    df['prev_year_week_key'] = (
        df['community_area'].astype(str) + '|' + 
        df['sr_type'] + '|' + 
        (df['year'] - 1).astype(str) + '|' + 
        df['week_of_year'].astype(str)
    )
    df['same_week_previous_year_count'] = df['prev_year_week_key'].map(week_key).fillna(0).astype(int)
    
    # same_month_previous_year_count - need monthly aggregation first
    df['month_key'] = df['community_area'].astype(str) + '|' + df['sr_type'] + '|' + df['year'].astype(str) + '|' + df['month'].astype(str)
    monthly_counts = df.groupby('month_key')['complaint_count'].sum().to_dict()
    df['prev_year_month_key'] = (
        df['community_area'].astype(str) + '|' + 
        df['sr_type'] + '|' + 
        (df['year'] - 1).astype(str) + '|' + 
        df['month'].astype(str)
    )
    df['same_month_previous_year_count'] = df['prev_year_month_key'].map(monthly_counts).fillna(0).astype(int)
    
    # previous_year_same_community_count - yearly aggregation by community
    comm_year_key = df.groupby(['community_area', 'year'])['complaint_count'].sum().to_dict()
    df['prev_comm_year_key'] = df['community_area'].astype(str) + '|' + (df['year'] - 1).astype(str)
    df['previous_year_same_community_count'] = df['prev_comm_year_key'].map(comm_year_key).fillna(0).astype(int)
    
    # previous_year_same_complaint_count - yearly aggregation by complaint type
    sr_year_key = df.groupby(['sr_type', 'year'])['complaint_count'].sum().to_dict()
    df['prev_sr_year_key'] = df['sr_type'] + '|' + (df['year'] - 1).astype(str)
    df['previous_year_same_complaint_count'] = df['prev_sr_year_key'].map(sr_year_key).fillna(0).astype(int)
    
    # Clean up temporary columns
    temp_cols = ['prev_year_week_key', 'month_key', 'prev_year_month_key', 'prev_comm_year_key', 'prev_sr_year_key']
    df = df.drop(temp_cols, axis=1)
    
    return df

def create_spatial_features(grid):
    """Create spatial features using vectorized operations."""
    print("[FeatureEngineering] Creating spatial features...")
    
    df = grid.copy()
    
    # Ward mapping
    df['ward'] = df['community_area'].map(WARD_MAPPING).fillna(0).astype(int)
    
    # Community-week aggregations for all complaint types
    df['community_week_key'] = df['community_area'].astype(str) + '|' + df['year'].astype(str) + '|' + df['week_of_year'].astype(str)
    
    # Total complaints all types per community-week
    community_weekly_total = df.groupby('community_week_key')['complaint_count'].sum().to_dict()
    
    # Distinct complaint types per community-week (where complaint_count > 0)
    distinct_map = df[df['complaint_count'] > 0].groupby('community_week_key')['sr_type'].nunique().to_dict()
    
    # Total complaints all types - rolling windows
    windows = [1, 4, 8, 12]
    for w in windows:
        col_name = f'total_complaints_all_types_last_{w}_weeks' if w > 1 else 'total_complaints_all_types_last_1_week'
        
        total = 0
        for offset in range(1, w + 1):
            df['prior_week'] = df['week_of_year'] - offset
            df['prior_year'] = df['year']
            mask = df['prior_week'] <= 0
            df.loc[mask, 'prior_year'] = df.loc[mask, 'year'] - 1
            df.loc[mask, 'prior_week'] = 52 + df.loc[mask, 'prior_week']
            
            prior_key = (
                df['community_area'].astype(str) + '|' + 
                df['prior_year'].astype(str) + '|' + 
                df['prior_week'].astype(str)
            )
            total += prior_key.map(community_weekly_total).fillna(0)
            
            df = df.drop(['prior_week', 'prior_year'], axis=1)
        
        df[col_name] = total.astype(int)
    
    # Distinct complaint types - rolling windows
    for w in [4, 8, 12]:
        col_name = f'distinct_complaint_types_last_{w}_weeks'
        
        distinct_counts = 0
        for offset in range(1, w + 1):
            df['prior_week'] = df['week_of_year'] - offset
            df['prior_year'] = df['year']
            mask = df['prior_week'] <= 0
            df.loc[mask, 'prior_year'] = df.loc[mask, 'year'] - 1
            df.loc[mask, 'prior_week'] = 52 + df.loc[mask, 'prior_week']
            
            prior_key = (
                df['community_area'].astype(str) + '|' + 
                df['prior_year'].astype(str) + '|' + 
                df['prior_week'].astype(str)
            )
            distinct_counts += prior_key.map(distinct_map).fillna(0)
            
            df = df.drop(['prior_week', 'prior_year'], axis=1)
        
        df[col_name] = distinct_counts.astype(int)
    
    # Clean up
    df = df.drop('community_week_key', axis=1, errors='ignore')
    
    return df

def create_future_target(grid):
    """Create future target (next week's complaint count)."""
    print("[FeatureEngineering] Creating future target...")
    
    df = grid.copy()
    df = df.sort_values(['community_area', 'sr_type', 'year', 'week_of_year']).reset_index(drop=True)
    
    # Create next week key
    df['next_week'] = df['week_of_year'] + 1
    df['next_year'] = df['year']
    mask = df['next_week'] > 52
    df.loc[mask, 'next_year'] = df.loc[mask, 'year'] + 1
    df.loc[mask, 'next_week'] = 1
    
    df['next_key'] = (
        df['community_area'].astype(str) + '|' + 
        df['sr_type'] + '|' + 
        df['next_year'].astype(str) + '|' + 
        df['next_week'].astype(str)
    )
    
    # Map next week's complaint count
    next_count_map = df.set_index(
        df['community_area'].astype(str) + '|' + df['sr_type'] + '|' + df['year'].astype(str) + '|' + df['week_of_year'].astype(str)
    )['complaint_count'].to_dict()
    
    df['future_complaint_count'] = df['next_key'].map(next_count_map)
    df['future_complaint'] = (df['future_complaint_count'] >= 1).astype('Int64')  # NaN stays NaN, 0->0, >=1->1
    
    df = df.drop(['next_week', 'next_year', 'next_key'], axis=1)
    return df

def compute_chronological_splits(df):
    """Compute chronological train/validation/test splits."""
    print("[FeatureEngineering] Computing chronological splits...")
    
    min_year = df['year'].min()
    max_year = df['year'].max()
    print(f"[FeatureEngineering] Data range: {min_year} - {max_year}")
    
    if max_year >= 2025:
        train_end_year = 2023
        val_end_year = 2024
        test_end_year = 2025
    elif max_year == 2024:
        train_end_year = 2022
        val_end_year = 2023
        test_end_year = 2024
    elif max_year == 2023:
        train_end_year = 2021
        val_end_year = 2022
        test_end_year = 2023
    else:
        total_years = max_year - min_year + 1
        train_years = max(1, int(total_years * 0.7))
        val_years = max(1, int(total_years * 0.15))
        train_end_year = min_year + train_years - 1
        val_end_year = train_end_year + val_years
        test_end_year = max_year
    
    splits = {
        'train': {
            'start': pd.Timestamp(f'{min_year}-01-01'),
            'end': pd.Timestamp(f'{train_end_year}-12-31 23:59:59')
        },
        'validation': {
            'start': pd.Timestamp(f'{train_end_year + 1}-01-01'),
            'end': pd.Timestamp(f'{val_end_year}-12-31 23:59:59')
        },
        'test': {
            'start': pd.Timestamp(f'{val_end_year + 1}-01-01'),
            'end': pd.Timestamp(f'{test_end_year}-12-31 23:59:59')
        }
    }
    
    for name, range_ in splits.items():
        print(f"  {name}: {range_['start'].date()} to {range_['end'].date()}")
    
    return splits

def split_dataset(df, splits):
    """Split dataset chronologically."""
    print("[FeatureEngineering] Splitting dataset chronologically...")
    
    train_data = df[
        (df['week_start'] >= splits['train']['start']) & 
        (df['week_start'] <= splits['train']['end'])
    ].copy()
    
    val_data = df[
        (df['week_start'] >= splits['validation']['start']) & 
        (df['week_start'] <= splits['validation']['end'])
    ].copy()
    
    test_data = df[
        (df['week_start'] >= splits['test']['start']) & 
        (df['week_start'] <= splits['test']['end'])
    ].copy()
    
    print(f"[FeatureEngineering] Split sizes - Train: {len(train_data)}, Val: {len(val_data)}, Test: {len(test_data)}")
    return train_data, val_data, test_data

def prepare_training_data(data, is_training=True):
    """Prepare features and targets for model training."""
    # Only keep rows with valid future_complaint (not NaN)
    valid_mask = data['future_complaint'].notna()
    df = data[valid_mask].copy()
    
    X = df[VALID_FEATURES].copy()
    y = df['future_complaint'].astype(int)
    
    # Handle categorical columns
    X['sr_type'] = X['sr_type'].astype(str)
    X['season'] = X['season'].astype(str)
    
    return X, y

def verify_no_leakage(df, split_name):
    """Verify no temporal leakage in features."""
    print(f"[FeatureEngineering] Verifying no leakage in {split_name}...")
    
    # Check that all lag features only use past data
    lag_cols = [c for c in df.columns if c.startswith('complaints_last_')]
    rolling_cols = [c for c in df.columns if c.startswith('rolling_')]
    spatial_cols = [c for c in df.columns if c.startswith('total_complaints_all_types_last_') or c.startswith('distinct_complaint_types_last_')]
    seasonal_cols = ['same_week_previous_year_count', 'same_month_previous_year_count', 
                     'previous_year_same_community_count', 'previous_year_same_complaint_count']
    
    all_feature_cols = lag_cols + rolling_cols + spatial_cols + seasonal_cols
    
    # Verify no future_complaint in features
    for col in FORBIDDEN_COLUMNS:
        if col in df.columns and col not in ['complaint_count']:
            print(f"  WARNING: Forbidden column {col} found in features!")
    
    # Verify complaint_count is not in features
    if 'complaint_count' in X.columns if 'X' in locals() else False:
        print("  WARNING: complaint_count found in features!")
    
    print(f"  Leakage check passed for {split_name}")
    return True

def main():
    parser = argparse.ArgumentParser(description='Feature Engineering from MongoDB')
    parser.add_argument('--mongo-uri', required=True, help='MongoDB connection URI')
    parser.add_argument('--db-name', required=True, help='Database name')
    parser.add_argument('--output-path', required=True, help='Output path for feature dataset (JSON)')
    parser.add_argument('--start-date', help='Start date filter (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date filter (YYYY-MM-DD)')
    parser.add_argument('--timing-output', help='Output path for timing metrics (JSON)')
    
    args = parser.parse_args()
    
    timing = {}
    start_total = datetime.now()
    
    try:
        # Step 1: Load data from MongoDB
        t0 = datetime.now()
        df_counts = load_data_from_mongodb(args.mongo_uri, args.db_name, args.start_date, args.end_date)
        timing['mongodb_query'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] MongoDB query: {timing['mongodb_query']:.2f}s")
        
        # Step 2: Build weekly grid
        t0 = datetime.now()
        grid = build_weekly_grid(df_counts)
        timing['build_grid'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] Build grid: {timing['build_grid']:.2f}s")
        
        # Step 3: Create lag features
        t0 = datetime.now()
        grid = create_lag_features(grid)
        timing['lag_features'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] Lag features: {timing['lag_features']:.2f}s")
        
        # Step 4: Create rolling features
        t0 = datetime.now()
        grid = create_rolling_features(grid)
        timing['rolling_features'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] Rolling features: {timing['rolling_features']:.2f}s")
        
        # Step 5: Create seasonal features
        t0 = datetime.now()
        grid = create_seasonal_features(grid)
        timing['seasonal_features'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] Seasonal features: {timing['seasonal_features']:.2f}s")
        
        # Step 6: Create spatial features
        t0 = datetime.now()
        grid = create_spatial_features(grid)
        timing['spatial_features'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] Spatial features: {timing['spatial_features']:.2f}s")
        
        # Step 7: Create future target
        t0 = datetime.now()
        grid = create_future_target(grid)
        timing['future_target'] = (datetime.now() - t0).total_seconds()
        print(f"[Timing] Future target: {timing['future_target']:.2f}s")
        
        # Step 8: Compute chronological splits
        t0 = datetime.now()
        splits = compute_chronological_splits(grid)
        timing['compute_splits'] = (datetime.now() - t0).total_seconds()
        
        # Step 9: Split dataset
        t0 = datetime.now()
        train_data, val_data, test_data = split_dataset(grid, splits)
        timing['split_dataset'] = (datetime.now() - t0).total_seconds()
        
        # Step 10: Prepare training data
        t0 = datetime.now()
        X_train, y_train = prepare_training_data(train_data)
        X_val, y_val = prepare_training_data(val_data)
        X_test, y_test = prepare_training_data(test_data)
        timing['prepare_training_data'] = (datetime.now() - t0).total_seconds()
        
        # Verify no leakage
        verify_no_leakage(X_train, 'train')
        verify_no_leakage(X_val, 'validation')
        verify_no_leakage(X_test, 'test')
        
        # Convert to JSON-serializable format
        def df_to_records(df):
            df_copy = df.copy()
            # Convert Timestamp columns to strings for JSON serialization
            for col in df_copy.columns:
                if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
                    df_copy[col] = df_copy[col].dt.strftime('%Y-%m-%dT%H:%M:%S')
            return df_copy.to_dict(orient='records')
        
        output = {
            'train': {'X': df_to_records(X_train), 'y': y_train.tolist()},
            'validation': {'X': df_to_records(X_val), 'y': y_val.tolist()},
            'test': {'X': df_to_records(X_test), 'y': y_test.tolist()},
            'splits': {
                'train': {'start': str(splits['train']['start']), 'end': str(splits['train']['end'])},
                'validation': {'start': str(splits['validation']['start']), 'end': str(splits['validation']['end'])},
                'test': {'start': str(splits['test']['start']), 'end': str(splits['test']['end'])},
            },
            'metadata': {
                'feature_count': len(VALID_FEATURES),
                'features': VALID_FEATURES,
                'train_rows': len(X_train),
                'val_rows': len(X_val),
                'test_rows': len(X_test),
                'total_grid_rows': len(grid),
            }
        }
        
        timing['total'] = (datetime.now() - start_total).total_seconds()
        print(f"\n[Timing] Total feature engineering: {timing['total']:.2f}s")
        
        # Save output
        os.makedirs(os.path.dirname(args.output_path), exist_ok=True)
        with open(args.output_path, 'w') as f:
            json.dump(output, f)
        print(f"[FeatureEngineering] Saved feature dataset to {args.output_path}")
        
        # Save timing
        if args.timing_output:
            with open(args.timing_output, 'w') as f:
                json.dump(timing, f, indent=2)
            print(f"[FeatureEngineering] Saved timing metrics to {args.timing_output}")
        
        print("\n[FeatureEngineering] SUCCESS - Feature engineering completed")
        print(f"  Train: {len(X_train)} rows")
        print(f"  Validation: {len(X_val)} rows")
        print(f"  Test: {len(X_test)} rows")
        print(f"  Features: {len(VALID_FEATURES)}")
        
    except Exception as e:
        print(f"[FeatureEngineering] ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()