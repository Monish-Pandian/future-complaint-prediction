import pandas as pd
import numpy as np
from pathlib import Path

RAW_DIR = Path("data/raw")
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

YEARS = [2020, 2021, 2022, 2023, 2024, 2025]

def main():
    print("=" * 60)
    print("STEP 1: LOAD AND COMBINE RAW DATA")
    print("=" * 60)
    
    all_dfs = []
    
    for year in YEARS:
        filepath = RAW_DIR / f"chicago_311_{year}.csv"
        print(f"Loading {year} from {filepath}...")
        df = pd.read_csv(filepath, low_memory=False)
        df['created_date'] = pd.to_datetime(df['created_date'], errors='coerce')
        all_dfs.append(df)
        print(f"  Loaded {len(df):,} records")
    
    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\nCombined: {len(combined):,} records")
    
    # Sort chronologically
    combined = combined.sort_values('created_date').reset_index(drop=True)
    
    # Remove duplicate sr_number
    before_dedup = len(combined)
    combined = combined.drop_duplicates(subset='sr_number', keep='first')
    after_dedup = len(combined)
    print(f"Removed {before_dedup - after_dedup} duplicate sr_number records")
    print(f"After deduplication: {after_dedup:,} records")
    
    # Filter to target complaint types
    combined = combined[combined['sr_type'].isin(TARGET_COMPLAINT_TYPES)].copy()
    print(f"After filtering to 10 target complaint types: {len(combined):,} records")
    
    # Remove rows where community_area is missing
    before_comm = len(combined)
    combined = combined.dropna(subset=['community_area'])
    after_comm = len(combined)
    print(f"Removed {before_comm - after_comm} records with missing community_area")
    print(f"After removing missing community_area: {after_comm:,} records")
    
    # Create temporal features
    combined['year'] = combined['created_date'].dt.year
    combined['month'] = combined['created_date'].dt.month
    combined['week_of_year'] = combined['created_date'].dt.isocalendar().week.astype(int)
    
    # Ensure community_area is integer
    combined['community_area'] = combined['community_area'].astype(int)
    
    # Save
    output_path = PROCESSED_DIR / "base_dataset.csv"
    combined.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total rows: {len(combined):,}")
    print(f"Date range: {combined['created_date'].min()} to {combined['created_date'].max()}")
    print(f"Years covered: {sorted(combined['year'].unique())}")
    print(f"Weeks covered: {combined['week_of_year'].min()} to {combined['week_of_year'].max()}")
    
    print("\nComplaint type counts:")
    for ct in TARGET_COMPLAINT_TYPES:
        count = (combined['sr_type'] == ct).sum()
        print(f"  {ct}: {count:,}")
    
    print(f"\nCommunity areas: {sorted(combined['community_area'].unique())}")
    print(f"Number of community areas: {combined['community_area'].nunique()}")
    
    print(f"\nWards present: {sorted(combined['ward'].dropna().unique())}")
    print(f"Number of wards: {combined['ward'].nunique()}")

if __name__ == "__main__":
    main()