import pandas as pd
import numpy as np
from pathlib import Path

INPUT_PATH = Path("data/processed/spatial_features.csv")
OUTPUT_PATH = Path("data/processed/target_features.csv")
VALIDATION_PATH = Path("data/processed/target_feature_validation.txt")

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
df['week_end'] = pd.to_datetime(df['week_end'])

# ============================================================
# CREATE FUTURE TARGET
# ============================================================
print("\nCreating future complaint target...")

# The dataset is a complete grid, so we can simply shift complaint_count
# within each (community_area, sr_type) group
df['future_complaint_count'] = df.groupby(['community_area', 'sr_type'])['complaint_count'].shift(-1)

# future_complaint is binary: 1 if future_complaint_count >= 1, else 0
df['future_complaint'] = (df['future_complaint_count'] >= 1).astype(int)

# For rows where future_complaint_count is NaN (last week of each series),
# future_complaint will be 0 because NaN >= 1 is False, but we should set it to NaN
# to indicate unknown target
df.loc[df['future_complaint_count'].isna(), 'future_complaint'] = np.nan

print(f"Future complaint count NaN (last week): {df['future_complaint_count'].isna().sum()}")
print(f"Future complaint NaN (last week): {df['future_complaint'].isna().sum()}")

# ============================================================
# VALIDATION
# ============================================================
print("\n" + "="*60)
print("TARGET VALIDATION")
print("="*60)

# 1. Unique key
dup_count = df.duplicated(subset=key_cols).sum()
print(f"1. Unique key check: {'PASS' if dup_count == 0 else 'FAIL'} ({dup_count} duplicates)")

# 2. future_complaint == 1 ONLY when future_complaint_count >= 1
mask = (df['future_complaint'] == 1) & (df['future_complaint_count'] < 1)
leak1 = mask.sum()
print(f"2. future_complaint=1 only when count>=1: {'PASS' if leak1 == 0 else 'FAIL'} ({leak1} violations)")

# 3. future_complaint == 0 ONLY when future_complaint_count == 0
mask = (df['future_complaint'] == 0) & (df['future_complaint_count'] != 0) & (df['future_complaint_count'].notna())
leak2 = mask.sum()
print(f"3. future_complaint=0 only when count==0: {'PASS' if leak2 == 0 else 'FAIL'} ({leak2} violations)")

# 4. Manual verification for 10 random rows
print("\n4. Manual verification (10 random rows):")
np.random.seed(42)
valid_rows = df[df['future_complaint_count'].notna()]
sample_indices = np.random.choice(valid_rows.index, size=min(10, len(valid_rows)), replace=False)

manual_pass = True
for idx in sample_indices:
    row = df.loc[idx]
    ca = row['community_area']
    sr = row['sr_type']
    week = row['week_start']
    next_week = week + pd.Timedelta(weeks=1)
    
    # Look up the actual next week complaint_count
    actual_next = df[(df['community_area'] == ca) & 
                     (df['sr_type'] == sr) & 
                     (df['week_start'] == next_week)]['complaint_count']
    
    if len(actual_next) == 1:
        expected_count = actual_next.values[0]
        actual_count = row['future_complaint_count']
        expected_binary = 1 if expected_count >= 1 else 0
        actual_binary = row['future_complaint']
        
        match_count = abs(expected_count - actual_count) < 0.001
        match_binary = expected_binary == actual_binary
        
        status = "OK" if (match_count and match_binary) else "FAIL"
        if not (match_count and match_binary):
            manual_pass = False
        print(f"  Row {idx}: ca={ca}, sr={sr[:30]}..., week={week.date()}, next_week={next_week.date()}")
        print(f"    Expected count={expected_count}, got={actual_count} ({status})")
        print(f"    Expected binary={expected_binary}, got={actual_binary} ({status})")
    else:
        print(f"  Row {idx}: ca={ca}, sr={sr[:30]}..., week={week.date()} - NO NEXT WEEK FOUND")

print(f"\n  Manual verification: {'PASS' if manual_pass else 'FAIL'}")

# 5. Target distribution
print("\n5. Target distribution:")
valid_targets = df[df['future_complaint'].notna()]
total = len(valid_targets)
positive = (valid_targets['future_complaint'] == 1).sum()
negative = (valid_targets['future_complaint'] == 0).sum()
pct = positive / total * 100
print(f"  Total rows with target: {total:,}")
print(f"  Positive (1): {positive:,} ({pct:.2f}%)")
print(f"  Negative (0): {negative:,} ({100-pct:.2f}%)")
print(f"  Rows without target (last week): {df['future_complaint'].isna().sum():,}")

# 6. Target distribution by sr_type
print("\n6. Target distribution by sr_type:")
for sr in sorted(df['sr_type'].unique()):
    sr_df = df[df['sr_type'] == sr]
    sr_valid = sr_df[sr_df['future_complaint'].notna()]
    if len(sr_valid) > 0:
        pos = (sr_valid['future_complaint'] == 1).sum()
        tot = len(sr_valid)
        pct = pos / tot * 100
        print(f"  {sr}: {pos:,}/{tot:,} ({pct:.2f}%)")

# 7. Target distribution by year
print("\n7. Target distribution by year:")
for year in sorted(df['year'].unique()):
    yr_df = df[df['year'] == year]
    yr_valid = yr_df[yr_df['future_complaint'].notna()]
    if len(yr_valid) > 0:
        pos = (yr_valid['future_complaint'] == 1).sum()
        tot = len(yr_valid)
        pct = pos / tot * 100
        print(f"  {year}: {pos:,}/{tot:,} ({pct:.2f}%)")

# 8. Final week handling
print("\n8. Final week handling:")
last_week = df['week_start'].max()
print(f"  Last week in dataset: {last_week}")
last_week_rows = df[df['week_start'] == last_week]
print(f"  Rows in last week: {len(last_week_rows)}")
print(f"  future_complaint NaN in last week: {last_week_rows['future_complaint'].isna().sum()}")
print(f"  future_complaint_count NaN in last week: {last_week_rows['future_complaint_count'].isna().sum()}")

# Check that no rows have future_complaint_count from beyond the dataset
print("\n9. Critical leakage test - verify future_week is exactly next week:")
leakage_found = False
for idx in sample_indices[:5]:
    row = df.loc[idx]
    ca = row['community_area']
    sr = row['sr_type']
    week = row['week_start']
    future_count = row['future_complaint_count']
    
    if pd.isna(future_count):
        continue
        
    next_week = week + pd.Timedelta(weeks=1)
    # Verify the source is exactly next week
    source = df[(df['community_area'] == ca) & 
                (df['sr_type'] == sr) & 
                (df['week_start'] == next_week)]
    
    if len(source) == 1:
        source_count = source['complaint_count'].values[0]
        if abs(source_count - future_count) > 0.001:
            print(f"  LEAKAGE: ca={ca}, sr={sr}, week={week.date()}")
            print(f"    future_complaint_count={future_count}, but next week has {source_count}")
            leakage_found = True
    else:
        print(f"  LEAKAGE: ca={ca}, sr={sr}, week={week.date()}")
        print(f"    future_complaint_count={future_count}, but NO next week found!")
        leakage_found = True

print(f"  Leakage test: {'PASS' if not leakage_found else 'FAIL'}")

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
    f.write("TARGET FEATURE VALIDATION REPORT\n")
    f.write("="*60 + "\n\n")
    
    f.write("A. DATASET DIMENSIONS\n")
    f.write("-"*30 + "\n")
    f.write(f"Total rows: {len(df):,}\n")
    f.write(f"Total columns: {len(df.columns)}\n")
    f.write(f"Date range: {df['week_start'].min()} to {df['week_start'].max()}\n")
    f.write(f"Number of community areas: {df['community_area'].nunique()}\n")
    f.write(f"Number of complaint types: {df['sr_type'].nunique()}\n")
    f.write(f"Number of unique weeks: {df['week_start'].nunique()}\n\n")
    
    f.write("B. POSITIVE/NEGATIVE TARGET DISTRIBUTION\n")
    f.write("-"*30 + "\n")
    f.write(f"Total rows with target: {total:,}\n")
    f.write(f"Positive (future_complaint=1): {positive:,} ({pct:.2f}%)\n")
    f.write(f"Negative (future_complaint=0): {negative:,} ({100-pct:.2f}%)\n")
    f.write(f"Rows without target (final week): {df['future_complaint'].isna().sum():,}\n\n")
    
    f.write("C. TARGET DISTRIBUTION BY COMPLAINT TYPE\n")
    f.write("-"*30 + "\n")
    for sr in sorted(df['sr_type'].unique()):
        sr_df = df[df['sr_type'] == sr]
        sr_valid = sr_df[sr_df['future_complaint'].notna()]
        if len(sr_valid) > 0:
            pos = (sr_valid['future_complaint'] == 1).sum()
            tot = len(sr_valid)
            pct = pos / tot * 100
            f.write(f"  {sr}: {pos:,}/{tot:,} ({pct:.2f}%)\n")
    f.write("\n")
    
    f.write("D. TARGET DISTRIBUTION BY YEAR\n")
    f.write("-"*30 + "\n")
    for year in sorted(df['year'].unique()):
        yr_df = df[df['year'] == year]
        yr_valid = yr_df[yr_df['future_complaint'].notna()]
        if len(yr_valid) > 0:
            pos = (yr_valid['future_complaint'] == 1).sum()
            tot = len(yr_valid)
            pct = pos / tot * 100
            f.write(f"  {year}: {pos:,}/{tot:,} ({pct:.2f}%)\n")
    f.write("\n")
    
    f.write("E. FINAL WEEK HANDLING\n")
    f.write("-"*30 + "\n")
    f.write(f"Last week in dataset: {last_week}\n")
    f.write(f"Rows in last week: {len(last_week_rows)}\n")
    f.write(f"Target set to NaN for last week (no future data available)\n")
    f.write("Decision: Removed final week from modeling by setting target=NaN\n\n")
    
    f.write("F. DUPLICATE KEY VALIDATION\n")
    f.write("-"*30 + "\n")
    f.write(f"Duplicate community_area + week_start + sr_type: {dup_count}\n")
    f.write(f"Result: {'PASS' if dup_count == 0 else 'FAIL'}\n\n")
    
    f.write("G. TARGET CORRECTNESS VALIDATION\n")
    f.write("-"*30 + "\n")
    f.write(f"future_complaint=1 only when future_complaint_count>=1: {'PASS' if leak1 == 0 else 'FAIL'}\n")
    f.write(f"future_complaint=0 only when future_complaint_count==0: {'PASS' if leak2 == 0 else 'FAIL'}\n")
    f.write(f"Manual verification (10 random rows): {'PASS' if manual_pass else 'FAIL'}\n\n")
    
    f.write("H. LEAKAGE VALIDATION\n")
    f.write("-"*30 + "\n")
    f.write(f"Future target uses ONLY next week (week+7 days): {'PASS' if not leakage_found else 'FAIL'}\n")
    f.write("No historical features modified - all lag/rolling/seasonal/spatial features unchanged\n\n")
    
    f.write("I. OUTPUT FILE\n")
    f.write("-"*30 + "\n")
    f.write(f"  {OUTPUT_PATH}\n")

print("Done!")
print(f"\nOutput saved to: {OUTPUT_PATH}")
print(f"Validation report saved to: {VALIDATION_PATH}")