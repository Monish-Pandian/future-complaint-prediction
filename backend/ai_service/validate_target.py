import pandas as pd
import numpy as np
from pathlib import Path

# Load target_features which appears to be the comprehensive merged dataset
target = pd.read_csv('data/processed/target_features.csv')

print("Target shape:", target.shape)
print("Columns:", list(target.columns))

# Check for duplicates on primary key
key_cols = ['community_area', 'week_start', 'sr_type']
dup = target[key_cols].duplicated().sum()
print(f"Duplicate primary keys: {dup}")

# Check date range
target['week_start'] = pd.to_datetime(target['week_start'])
print(f"Date range: {target['week_start'].min()} to {target['week_start'].max()}")

# Check target distribution
print(f"\nTarget distribution:")
print(target['future_complaint'].value_counts())
print(target['future_complaint'].value_counts(normalize=True))

# Check future_complaint_count vs future_complaint
print(f"\nFuture complaint count distribution:")
print(target['future_complaint_count'].value_counts().head(20))

# Verify target logic: future_complaint == 1 iff future_complaint_count >= 1
check = ((target['future_complaint_count'] >= 1) == (target['future_complaint'] == 1)).all()
print(f"\nTarget validation (future_complaint == 1 iff count >= 1): {check}")

# Check for NaN values
print(f"\nMissing values per column:")
missing = target.isnull().sum()
print(missing[missing > 0])

# Check unique community areas, sr_types, weeks
print(f"\nUnique community_areas: {target['community_area'].nunique()}")
print(f"Unique sr_types: {target['sr_type'].nunique()}")
print(f"Unique weeks: {target['week_start'].nunique()}")
print(f"Years: {sorted(target['year'].unique())}")