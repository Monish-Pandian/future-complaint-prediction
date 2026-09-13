import pandas as pd
import numpy as np
from pathlib import Path

PROCESSED_DIR = Path("data/processed")
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

TARGET_COMPLAINT_TYPES = [
    "Graffiti Removal Request",
    "Rodent Baiting/Rat Complaint",
    "Garbage Cart Maintenance",
    "Pothole in Street Complaint",
    "Street Light Out Complaint",
    "Abandoned Vehicle Complaint",
    "Tree Debris Clean-Up Request",
    "Traffic Signal Out Complaint",
    "Building Violation",
    "Blue Recycling Cart"
]

def main():
    print("=" * 60)
    print("CREATE LAG FEATURES")
    print("=" * 60)
    
    # Load weekly grid
    df = pd.read_csv(PROCESSED_DIR / "weekly_community_area_counts.csv", low_memory=False)
    df['week_start'] = pd.to_datetime(df['week_start'])
    df['week_end'] = pd.to_datetime(df['week_end'])
    print(f"Loaded {len(df):,} rows")
    
    # Sort for proper lag computation
    df = df.sort_values(['community_area', 'sr_type', 'week_start']).reset_index(drop=True)
    
    # Create lag features - shifted by 1 week
    # We group by community_area and sr_type, then shift the complaint_count
    lag_periods = [1, 2, 4, 8, 12]
    
    for lag in lag_periods:
        col_name = f'complaints_last_{lag}_week'
        df[col_name] = df.groupby(['community_area', 'sr_type'])['complaint_count'].shift(lag)
        print(f"Created {col_name}")
    
    # Fill NaN with 0 (no historical data means zero complaints)
    lag_cols = [f'complaints_last_{lag}_week' for lag in lag_periods]
    for col in lag_cols:
        df[col] = df[col].fillna(0).astype(int)
    
    # Verify no future leakage - check that lag values only use past weeks
    # For each row, the lag features should correspond to strictly earlier weeks
    # We can verify by checking a few rows manually
    print("\nVerifying lag correctness...")
    sample = df[df['community_area'] == 1].head(20)
    print(sample[['community_area', 'sr_type', 'week_start', 'complaint_count'] + lag_cols].to_string())
    
    # Save
    output_path = PROCESSED_DIR / "lag_features.csv"
    df.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")
    
    # Summary
    print("\n" + "=" * 60)
    print("LAG FEATURE SUMMARY")
    print("=" * 60)
    print(f"Total rows: {len(df):,}")
    print(f"Features created: {lag_cols}")
    print(f"Missing values per feature:")
    for col in lag_cols:
        missing = df[col].isna().sum()
        print(f"  {col}: {missing}")
    
    print(f"\nValue ranges:")
    for col in lag_cols:
        print(f"  {col}: min={df[col].min()}, max={df[col].max()}, mean={df[col].mean():.2f}")

if __name__ == "__main__":
    main()