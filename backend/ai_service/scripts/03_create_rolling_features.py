import pandas as pd
import numpy as np
from pathlib import Path

INPUT_PATH = Path("data/processed/lag_features.csv")
OUTPUT_PATH = Path("data/processed/rolling_features.csv")

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

# The complaint_count column contains the current week's count
# We need to shift by 1 week before computing rolling stats to avoid leakage
# Create a shifted version of complaint_count
df['complaint_count_shifted'] = df.groupby(['community_area', 'sr_type'])['complaint_count'].shift(1)

# Verify the shift worked correctly
print("\nVerification of shift:")
sample = df[df['community_area'] == 1][df['sr_type'] == 'Abandoned Vehicle Complaint'].head(10)
print(sample[['week_start', 'complaint_count', 'complaint_count_shifted']].to_string())

# Rolling window calculations
# For each group (community_area, sr_type), compute rolling stats on the shifted complaint_count
windows = [4, 8, 12]

for w in windows:
    # Rolling mean
    df[f'rolling_mean_{w}_weeks'] = (
        df.groupby(['community_area', 'sr_type'])['complaint_count_shifted']
        .rolling(window=w, min_periods=w)
        .mean()
        .reset_index(level=[0,1], drop=True)
    )
    
    # Rolling max
    df[f'rolling_max_{w}_weeks'] = (
        df.groupby(['community_area', 'sr_type'])['complaint_count_shifted']
        .rolling(window=w, min_periods=w)
        .max()
        .reset_index(level=[0,1], drop=True)
    )
    
    # Rolling std
    df[f'rolling_std_{w}_weeks'] = (
        df.groupby(['community_area', 'sr_type'])['complaint_count_shifted']
        .rolling(window=w, min_periods=w)
        .std()
        .reset_index(level=[0,1], drop=True)
    )

# Drop the helper column
df = df.drop(columns=['complaint_count_shifted'])

# Validation: Check for leakage
print("\n" + "="*60)
print("LEAKAGE VALIDATION")
print("="*60)

# For a few sample groups, verify that rolling features don't use current week
test_groups = df.groupby(['community_area', 'sr_type']).head(1).groupby(['community_area', 'sr_type'])
test_indices = df.groupby(['community_area', 'sr_type']).apply(lambda x: x.index[min(12, len(x)-1)]).values

leakage_found = False
for idx in test_indices[:5]:  # Check first 5 groups with sufficient history
    row = df.loc[idx]
    ca = row['community_area']
    sr = row['sr_type']
    week = row['week_start']
    
    # Get the 4 weeks prior to this week
    prior_weeks = df[
        (df['community_area'] == ca) & 
        (df['sr_type'] == sr) & 
        (df['week_start'] < week)
    ].tail(4)
    
    if len(prior_weeks) == 4:
        expected_mean = prior_weeks['complaint_count'].mean()
        actual_mean = row['rolling_mean_4_weeks']
        if pd.notna(actual_mean) and abs(actual_mean - expected_mean) > 0.001:
            print(f"LEAKAGE DETECTED: community_area={ca}, sr_type={sr}, week={week}")
            print(f"  Expected mean of prior 4 weeks: {expected_mean}")
            print(f"  Actual rolling_mean_4_weeks: {actual_mean}")
            leakage_found = True

if not leakage_found:
    print("No leakage detected in validation checks.")
else:
    raise ValueError("Leakage detected - fix calculation before proceeding")

# Missing value analysis
print("\n" + "="*60)
print("MISSING VALUE ANALYSIS")
print("="*60)

rolling_cols = [c for c in df.columns if c.startswith('rolling_')]
for col in rolling_cols:
    missing = df[col].isna().sum()
    missing_pct = missing / len(df) * 100
    print(f"{col}: {missing:,} missing ({missing_pct:.2f}%)")

# Final output
print("\n" + "="*60)
print("OUTPUT SUMMARY")
print("="*60)
print(f"Rows: {len(df):,}")
print(f"Columns: {len(df.columns)}")
print(f"New rolling features: {rolling_cols}")
print(f"Min week: {df['week_start'].min()}")
print(f"Max week: {df['week_start'].max()}")
print(f"Duplicate keys: {df.duplicated(subset=key_cols).sum()}")

# Save
df.to_csv(OUTPUT_PATH, index=False)
print(f"\nSaved to: {OUTPUT_PATH}")

# Verify unique key in output
output_dupes = df.duplicated(subset=key_cols).sum()
if output_dupes == 0:
    print("OK community_area + week_start + sr_type is unique")
else:
    print(f"ERROR Found {output_dupes} duplicate keys in output!")