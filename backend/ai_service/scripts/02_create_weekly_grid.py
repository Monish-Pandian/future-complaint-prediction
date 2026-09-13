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
    print("CREATE WEEKLY COMMUNITY AREA COUNTS")
    print("=" * 60)
    
    # Load base dataset
    df = pd.read_csv(PROCESSED_DIR / "base_dataset.csv", low_memory=False)
    df['created_date'] = pd.to_datetime(df['created_date'])
    print(f"Loaded {len(df):,} records")
    
    # Create consistent Monday-based week
    # week_start = Monday of the week containing the date
    df['week_start'] = df['created_date'] - pd.to_timedelta(df['created_date'].dt.dayofweek, unit='D')
    df['week_start'] = df['week_start'].dt.normalize()
    df['week_end'] = df['week_start'] + pd.Timedelta(days=6)
    
    # Year and week number based on week_start (not created_date)
    # This ensures consistency at year boundaries
    df['year'] = df['week_start'].dt.year
    
    # Compute week number within year based on week_start
    # First Monday of the year = week 1
    df['week_of_year'] = ((df['week_start'] - df['week_start'].dt.to_period('Y').dt.to_timestamp()).dt.days // 7) + 1
    
    # year_week identifier
    df['year_week'] = df['year'].astype(str) + '-W' + df['week_of_year'].astype(str).str.zfill(2)
    
    print(f"Date range: {df['week_start'].min()} to {df['week_start'].max()}")
    print(f"Year-weeks: {df['year_week'].nunique()}")
    print(f"Years: {sorted(df['year'].unique())}")
    print(f"Week range per year: {df.groupby('year')['week_of_year'].max()}")
    
    # Aggregate by community_area, week_start, complaint_type
    agg = df.groupby(['community_area', 'week_start', 'week_end', 'year', 'week_of_year', 'year_week', 'sr_type']).size().reset_index(name='complaint_count')
    
    print(f"Aggregated rows (non-zero only): {len(agg):,}")
    
    # Check for duplicates in aggregation
    dup_agg = agg.duplicated(subset=['community_area', 'week_start', 'sr_type']).sum()
    print(f"Duplicates in aggregation: {dup_agg}")
    if dup_agg > 0:
        agg = agg.drop_duplicates(subset=['community_area', 'week_start', 'sr_type'], keep='first')
        print(f"After deduplication: {len(agg):,}")
    
    # Create complete grid: all community_areas × all weeks × all complaint_types
    all_communities = sorted(df['community_area'].unique())
    all_weeks = sorted(df[['week_start', 'week_end', 'year', 'week_of_year', 'year_week']].drop_duplicates().values.tolist())
    all_types = TARGET_COMPLAINT_TYPES
    
    print(f"Communities: {len(all_communities)}")
    print(f"Weeks: {len(all_weeks)}")
    print(f"Complaint types: {len(all_types)}")
    print(f"Full grid size: {len(all_communities) * len(all_weeks) * len(all_types):,}")
    
    # Build complete grid
    grid_rows = []
    for week_info in all_weeks:
        week_start, week_end, year, week_of_year, year_week = week_info
        for comm in all_communities:
            for ctype in all_types:
                grid_rows.append({
                    'community_area': comm,
                    'week_start': week_start,
                    'week_end': week_end,
                    'year': year,
                    'week_of_year': week_of_year,
                    'year_week': year_week,
                    'sr_type': ctype
                })
    
    grid = pd.DataFrame(grid_rows)
    print(f"Grid created: {len(grid):,} rows")
    
    # Merge with aggregated counts
    grid = grid.merge(
        agg[['community_area', 'week_start', 'sr_type', 'complaint_count']],
        on=['community_area', 'week_start', 'sr_type'],
        how='left'
    )
    
    # Fill missing counts with 0
    grid['complaint_count'] = grid['complaint_count'].fillna(0).astype(int)
    
    # Sort
    grid = grid.sort_values(['community_area', 'sr_type', 'week_start']).reset_index(drop=True)
    
    # Verify uniqueness
    dup_check = grid.duplicated(subset=['community_area', 'week_start', 'sr_type']).sum()
    print(f"\nDuplicate community_area + week_start + sr_type: {dup_check}")
    if dup_check > 0:
        grid = grid.drop_duplicates(subset=['community_area', 'week_start', 'sr_type'], keep='first')
        print(f"After deduplication: {len(grid):,}")
    
    # Save
    output_path = PROCESSED_DIR / "weekly_community_area_counts.csv"
    grid.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")
    
    # Print dimensions
    print("\n" + "=" * 60)
    print("DATASET DIMENSIONS")
    print("=" * 60)
    print(f"Total rows: {len(grid):,}")
    print(f"Total columns: {len(grid.columns)}")
    print(f"Columns: {list(grid.columns)}")
    print(f"Community areas: {grid['community_area'].nunique()}")
    print(f"Weeks: {grid['week_start'].nunique()}")
    print(f"Complaint types: {grid['sr_type'].nunique()}")
    print(f"Year range: {grid['year'].min()} - {grid['year'].max()}")
    print(f"Week range: {grid['week_of_year'].min()} - {grid['week_of_year'].max()}")
    
    # Count distribution
    print("\nComplaint count distribution:")
    print(grid['complaint_count'].value_counts().head(20))
    
    print(f"\nZero-count rows: {(grid['complaint_count'] == 0).sum():,}")
    print(f"Non-zero rows: {(grid['complaint_count'] > 0).sum():,}")
    
    # Per complaint type stats
    print("\nPer complaint type:")
    for ct in TARGET_COMPLAINT_TYPES:
        sub = grid[grid['sr_type'] == ct]
        print(f"  {ct}: {len(sub):,} rows, {sub['complaint_count'].sum():,} total, {(sub['complaint_count']==0).sum():,} zeros")
    
    # Verify grid completeness
    expected_rows = len(all_communities) * len(all_weeks) * len(all_types)
    print(f"\nExpected grid size: {expected_rows:,}")
    print(f"Actual grid size: {len(grid):,}")
    print(f"Match: {len(grid) == expected_rows}")

if __name__ == "__main__":
    main()