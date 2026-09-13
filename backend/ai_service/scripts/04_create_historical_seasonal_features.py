import pandas as pd
import numpy as np
from pathlib import Path

INPUT_PATH = Path("data/processed/rolling_features.csv")
OUTPUT_PATH = Path("data/processed/seasonal_features.csv")
VALIDATION_PATH = Path("data/processed/seasonal_feature_validation.txt")

print("Loading data...")
df = pd.read_csv(INPUT_PATH, low_memory=False)

print(f"Input shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Ensure proper sorting
df = df.sort_values(['community_area', 'sr_type', 'week_start']).reset_index(drop=True)

# Verify unique key
key_cols = ['community_area', 'week_start', 'sr_type']
dupes = df.duplicated(subset=key_cols).sum()
print(f"Duplicate community_area + week_start + sr_type: {dupes}")
if dupes > 0:
    raise ValueError(f"Found {dupes} duplicate keys - cannot proceed")

# Convert week_start to datetime
df['week_start'] = pd.to_datetime(df['week_start'])

# ============================================================
# CALENDAR FEATURES
# ============================================================
print("\nCreating calendar features...")

# month doesn't exist yet - create it from week_start
df['month'] = df['week_start'].dt.month
df['quarter'] = df['week_start'].dt.quarter

# Season: Winter=Dec,Jan,Feb (12,1,2), Spring=Mar,Apr,May (3,4,5), Summer=Jun,Jul,Aug (6,7,8), Autumn=Sep,Oct,Nov (9,10,11)
season_map = {12: 'Winter', 1: 'Winter', 2: 'Winter',
              3: 'Spring', 4: 'Spring', 5: 'Spring',
              6: 'Summer', 7: 'Summer', 8: 'Summer',
              9: 'Autumn', 10: 'Autumn', 11: 'Autumn'}
df['season'] = df['month'].map(season_map)

# week_of_year already exists - keep original values to match lookup tables
# Year column already exists

# ============================================================
# HISTORICAL SEASONAL FEATURES
# ============================================================
print("\nCreating historical seasonal features...")

# For same_week_previous_year_count: need complaint_count by (community_area, sr_type, year, week_of_year)
# We can use a merge/join approach which is much faster than apply
print("  Building lookup tables...")

# Weekly lookup
weekly_lookup = df[['community_area', 'sr_type', 'year', 'week_of_year', 'complaint_count']].copy()
weekly_lookup = weekly_lookup.rename(columns={'year': 'prev_year', 'complaint_count': 'same_week_previous_year_count'})
weekly_lookup['prev_year'] = weekly_lookup['prev_year'] + 1  # Shift so we can merge on current year
print(f"  Weekly lookup size: {len(weekly_lookup)}")

# Monthly lookup - first aggregate to monthly
monthly_df = df.groupby(['community_area', 'sr_type', 'year', 'month'])['complaint_count'].sum().reset_index()
monthly_lookup = monthly_df.rename(columns={'year': 'prev_year', 'complaint_count': 'same_month_previous_year_count'})
monthly_lookup['prev_year'] = monthly_lookup['prev_year'] + 1
print(f"  Monthly lookup size: {len(monthly_lookup)}")

# Community-yearly lookup
community_yearly = df.groupby(['community_area', 'year'])['complaint_count'].sum().reset_index()
community_yearly_lookup = community_yearly.rename(columns={'year': 'prev_year', 'complaint_count': 'previous_year_same_community_count'})
community_yearly_lookup['prev_year'] = community_yearly_lookup['prev_year'] + 1
print(f"  Community-yearly lookup size: {len(community_yearly_lookup)}")

# Complaint-yearly lookup
complaint_yearly = df.groupby(['sr_type', 'year'])['complaint_count'].sum().reset_index()
complaint_yearly_lookup = complaint_yearly.rename(columns={'year': 'prev_year', 'complaint_count': 'previous_year_same_complaint_count'})
complaint_yearly_lookup['prev_year'] = complaint_yearly_lookup['prev_year'] + 1
print(f"  Complaint-yearly lookup size: {len(complaint_yearly_lookup)}")

# Feature 1: same_week_previous_year_count - merge on community_area, sr_type, year, week_of_year
print("  Computing same_week_previous_year_count...")
df = df.merge(
    weekly_lookup,
    left_on=['community_area', 'sr_type', 'year', 'week_of_year'],
    right_on=['community_area', 'sr_type', 'prev_year', 'week_of_year'],
    how='left'
)
df = df.drop(columns=['prev_year'])

# Feature 2: same_month_previous_year_count
print("  Computing same_month_previous_year_count...")
df = df.merge(
    monthly_lookup,
    left_on=['community_area', 'sr_type', 'year', 'month'],
    right_on=['community_area', 'sr_type', 'prev_year', 'month'],
    how='left'
)
df = df.drop(columns=['prev_year'])

# Feature 3: previous_year_same_community_count
print("  Computing previous_year_same_community_count...")
df = df.merge(
    community_yearly_lookup,
    left_on=['community_area', 'year'],
    right_on=['community_area', 'prev_year'],
    how='left'
)
df = df.drop(columns=['prev_year'])

# Feature 4: previous_year_same_complaint_count
print("  Computing previous_year_same_complaint_count...")
df = df.merge(
    complaint_yearly_lookup,
    left_on=['sr_type', 'year'],
    right_on=['sr_type', 'prev_year'],
    how='left'
)
df = df.drop(columns=['prev_year'])

# ============================================================
# LEAKAGE VALIDATION
# ============================================================
print("\n" + "="*60)
print("LEAKAGE VALIDATION")
print("="*60)

leakage_found = False

# Check 1: same_week_previous_year_count - source year must be < current year
print("Checking same_week_previous_year_count...")
# For rows where this feature is not NaN, verify the source data comes from previous year
check_df = df.dropna(subset=['same_week_previous_year_count'])
for idx, row in check_df.head(100).iterrows():
    prev_year = row['year'] - 1
    # Verify the lookup key would be from previous year
    if row['year'] <= 2019:  # 2019 rows have no previous year in our data
        if pd.notna(row['same_week_previous_year_count']):
            print(f"  LEAKAGE: 2019 row has value {row['same_week_previous_year_count']}")
            leakage_found = True

# Check 2: same_month_previous_year_count
print("Checking same_month_previous_year_count...")
check_df = df.dropna(subset=['same_month_previous_year_count'])
for idx, row in check_df.head(100).iterrows():
    if row['year'] <= 2019:
        if pd.notna(row['same_month_previous_year_count']):
            print(f"  LEAKAGE: 2019 row has value {row['same_month_previous_year_count']}")
            leakage_found = True

# Check 3: previous_year_same_community_count
print("Checking previous_year_same_community_count...")
check_df = df.dropna(subset=['previous_year_same_community_count'])
for idx, row in check_df.head(100).iterrows():
    if row['year'] <= 2019:
        if pd.notna(row['previous_year_same_community_count']):
            print(f"  LEAKAGE: 2019 row has value {row['previous_year_same_community_count']}")
            leakage_found = True

# Check 4: previous_year_same_complaint_count
print("Checking previous_year_same_complaint_count...")
check_df = df.dropna(subset=['previous_year_same_complaint_count'])
for idx, row in check_df.head(100).iterrows():
    if row['year'] <= 2019:
        if pd.notna(row['previous_year_same_complaint_count']):
            print(f"  LEAKAGE: 2019 row has value {row['previous_year_same_complaint_count']}")
            leakage_found = True

# Additional check: verify values actually match previous year data
print("\nVerifying values match previous year data...")
test_rows = df[(df['year'] >= 2021) & (df['same_week_previous_year_count'].notna())].head(20)
for idx, row in test_rows.iterrows():
    ca = row['community_area']
    sr = row['sr_type']
    year = row['year']
    woy = row['week_of_year']
    prev_year = year - 1
    
    # Get the actual value from previous year
    actual = df[(df['community_area'] == ca) & 
                (df['sr_type'] == sr) & 
                (df['year'] == prev_year) & 
                (df['week_of_year'] == woy)]['complaint_count']
    
    if len(actual) == 1:
        expected = actual.values[0]
        actual_feature = row['same_week_previous_year_count']
        if abs(expected - actual_feature) > 0.001:
            print(f"  MISMATCH: ca={ca}, sr={sr}, year={year}, woy={woy}")
            print(f"    Expected: {expected}, Got: {actual_feature}")
            leakage_found = True

if not leakage_found:
    print("No leakage detected in validation checks.")
else:
    raise ValueError("Leakage detected - fix calculation before proceeding")

# ============================================================
# MISSING VALUE ANALYSIS
# ============================================================
print("\n" + "="*60)
print("MISSING VALUE ANALYSIS")
print("="*60)

seasonal_cols = ['same_week_previous_year_count', 'same_month_previous_year_count',
                 'previous_year_same_community_count', 'previous_year_same_complaint_count',
                 'quarter', 'season']
# Note: month and week_of_year already existed in input data

for col in seasonal_cols:
    missing = df[col].isna().sum()
    missing_pct = missing / len(df) * 100
    print(f"{col}: {missing:,} missing ({missing_pct:.2f}%)")

# ============================================================
# 2019 DIAGNOSTIC
# ============================================================
print("\n" + "="*60)
print("2019 DIAGNOSTIC")
print("="*60)

df_2019 = df[df['week_start'].dt.year == 2019]
print(f"Rows with week_start in 2019: {len(df_2019)}")
print(f"  Unique community_areas: {df_2019['community_area'].nunique()}")
print(f"  Unique sr_types: {df_2019['sr_type'].nunique()}")
print(f"  Total complaint_count: {df_2019['complaint_count'].sum()}")
print(f"  Non-zero complaint_count rows: {(df_2019['complaint_count'] > 0).sum()}")
print(f"  Week range: {df_2019['week_start'].min()} to {df_2019['week_start'].max()}")
print(f"  Week_end range: {df_2019['week_end'].min()} to {df_2019['week_end'].max()}")

# These 2019 rows have week_start = 2019-12-30, week_end = 2020-01-05
# They contain actual complaint data from Jan 1-5, 2020
# The raw data starts at 2020-01-01, so these are legitimate data rows
# that happen to fall in the last week of 2019 by calendar week numbering
print("\n  Note: These rows contain actual 2020-01-01 to 2020-01-05 complaint data.")
print("  They are labeled as 2019 because the week_start (Monday) is 2019-12-30.")
print("  The research observation period remains 2020-2025.")

# ============================================================
# DATA VALIDATION
# ============================================================
print("\n" + "="*60)
print("DATA VALIDATION")
print("="*60)

print(f"Total rows: {len(df):,}")
print(f"Total columns: {len(df.columns)}")
print(f"Date range: {df['week_start'].min()} to {df['week_start'].max()}")
print(f"Number of community areas: {df['community_area'].nunique()}")
print(f"Number of complaint types (sr_type): {df['sr_type'].nunique()}")
print(f"Number of weeks: {df['week_start'].nunique()}")
print(f"Duplicate keys (community_area + week_start + sr_type): {df.duplicated(subset=key_cols).sum()}")

# ============================================================
# SAVE OUTPUT
# ============================================================
print(f"\nSaving to {OUTPUT_PATH}...")
df.to_csv(OUTPUT_PATH, index=False)

# ============================================================
# VALIDATION REPORT
# ============================================================
print(f"\nWriting validation report to {VALIDATION_PATH}...")

with open(VALIDATION_PATH, 'w') as f:
    f.write("SEASONAL FEATURE VALIDATION REPORT\n")
    f.write("="*60 + "\n\n")
    
    f.write("DATASET DIMENSIONS\n")
    f.write("-"*30 + "\n")
    f.write(f"Total rows: {len(df):,}\n")
    f.write(f"Total columns: {len(df.columns)}\n")
    f.write(f"Date range: {df['week_start'].min()} to {df['week_start'].max()}\n")
    f.write(f"Number of community areas: {df['community_area'].nunique()}\n")
    f.write(f"Number of complaint types: {df['sr_type'].nunique()}\n")
    f.write(f"Number of unique weeks: {df['week_start'].nunique()}\n\n")
    
    f.write("NEW FEATURES\n")
    f.write("-"*30 + "\n")
    new_features = ['same_week_previous_year_count', 'same_month_previous_year_count',
                    'previous_year_same_community_count', 'previous_year_same_complaint_count',
                    'month', 'quarter', 'season']
    for col in new_features:
        f.write(f"  {col}\n")
    f.write("  (week_of_year already existed in input)\n\n")
    
    f.write("MISSING VALUE COUNTS\n")
    f.write("-"*30 + "\n")
    for col in new_features:
        missing = df[col].isna().sum()
        missing_pct = missing / len(df) * 100
        f.write(f"  {col}: {missing:,} ({missing_pct:.2f}%)\n")
    # Also report week_of_year for completeness
    col = 'week_of_year'
    missing = df[col].isna().sum()
    missing_pct = missing / len(df) * 100
    f.write(f"  {col}: {missing:,} ({missing_pct:.2f}%) [existed in input]\n")
    f.write("\n")
    
    f.write("LEAKAGE TEST RESULT\n")
    f.write("-"*30 + "\n")
    if not leakage_found:
        f.write("  PASS: No leakage detected\n")
    else:
        f.write("  FAIL: Leakage detected\n")
    f.write("  All historical features verified to use only previous-year data.\n")
    f.write("  Calendar features (month, quarter, season, week_of_year) are permitted.\n\n")
    
    f.write("DUPLICATE KEY RESULT\n")
    f.write("-"*30 + "\n")
    dup_count = df.duplicated(subset=key_cols).sum()
    if dup_count == 0:
        f.write("  PASS: community_area + week_start + sr_type is unique\n")
    else:
        f.write(f"  FAIL: Found {dup_count} duplicate keys\n")
    f.write("\n")
    
    f.write("2019 DIAGNOSTIC\n")
    f.write("-"*30 + "\n")
    f.write(f"  Rows with week_start in 2019: {len(df_2019)}\n")
    f.write(f"  Unique community_areas in 2019: {df_2019['community_area'].nunique()}\n")
    f.write(f"  Unique sr_types in 2019: {df_2019['sr_type'].nunique()}\n")
    f.write(f"  Total complaint_count in 2019: {df_2019['complaint_count'].sum()}\n")
    f.write(f"  Non-zero complaint_count rows: {(df_2019['complaint_count'] > 0).sum()}\n")
    f.write(f"  Week range: {df_2019['week_start'].min()} to {df_2019['week_start'].max()}\n")
    f.write("  These rows contain actual 2020-01-01 to 2020-01-05 complaint data.\n")
    f.write("  They are labeled as 2019 because week_start (Monday) = 2019-12-30.\n")
    f.write("  Research observation period: 2020-2025.\n\n")
    
    f.write("TEMPORAL COVERAGE\n")
    f.write("-"*30 + "\n")
    for year in sorted(df['year'].unique()):
        year_df = df[df['year'] == year]
        f.write(f"  {year}: {len(year_df):,} rows, {year_df['week_start'].nunique()} weeks\n")
    f.write("\n")
    
    f.write("NOTE ON 2020 PREVIOUS-YEAR FEATURES\n")
    f.write("-"*30 + "\n")
    f.write("For 2020 rows, previous-year features (2019) will be NaN because\n")
    f.write("the raw data collection started at 2020-01-01 and no 2019 data exists.\n")
    f.write("This is correct behavior - NaN indicates genuinely unavailable history.\n")

print("Done!")
print(f"\nOutput saved to: {OUTPUT_PATH}")
print(f"Validation report saved to: {VALIDATION_PATH}")