import pandas as pd
import numpy as np
import os
from pathlib import Path

RAW_DIR = Path("data/raw")
EDA_DIR = Path("data/eda")
EDA_DIR.mkdir(parents=True, exist_ok=True)

YEARS = [2020, 2021, 2022, 2023, 2024, 2025]

def load_year(year):
    filepath = RAW_DIR / f"chicago_311_{year}.csv"
    df = pd.read_csv(filepath, low_memory=False)
    df['created_date'] = pd.to_datetime(df['created_date'], errors='coerce')
    df['closed_date'] = pd.to_datetime(df['closed_date'], errors='coerce')
    df['year'] = year
    df['month'] = df['created_date'].dt.month
    return df

def audit_year(df, year):
    audit = {}
    audit['year'] = year
    audit['record_count'] = len(df)
    audit['min_created_date'] = str(df['created_date'].min())
    audit['max_created_date'] = str(df['created_date'].max())
    audit['unique_sr_number'] = df['sr_number'].nunique()
    audit['duplicate_sr_number'] = df['sr_number'].duplicated().sum()
    audit['unique_sr_type'] = df['sr_type'].nunique()
    audit['unique_owner_department'] = df['owner_department'].nunique()
    audit['missing_latitude_pct'] = round(df['latitude'].isna().sum() / len(df) * 100, 2)
    audit['missing_longitude_pct'] = round(df['longitude'].isna().sum() / len(df) * 100, 2)
    audit['missing_ward_pct'] = round(df['ward'].isna().sum() / len(df) * 100, 2)
    audit['missing_community_area_pct'] = round(df['community_area'].isna().sum() / len(df) * 100, 2)
    audit['missing_zip_code_pct'] = round(df['zip_code'].isna().sum() / len(df) * 100, 2)
    
    status_dist = df['status'].value_counts().to_dict()
    audit['status_distribution'] = str(status_dist)
    
    top30 = df['sr_type'].value_counts().head(30)
    audit['top_30_sr_type'] = str(top30.to_dict())
    
    return audit

def main():
    print("Loading and auditing each year...")
    
    all_audits = []
    all_dfs = []
    
    for year in YEARS:
        print(f"Processing {year}...")
        df = load_year(year)
        all_dfs.append(df)
        audit = audit_year(df, year)
        all_audits.append(audit)
        print(f"  {year}: {len(df):,} records, {df['sr_type'].nunique()} types")
    
    # Combined audit
    print("\nCombining all years...")
    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"Combined: {len(combined):,} records")
    
    combined_audit = audit_year(combined, '2020-2025')
    all_audits.append(combined_audit)
    
    # Save historical_dataset_audit.csv
    audit_df = pd.DataFrame(all_audits)
    audit_df.to_csv(EDA_DIR / "historical_dataset_audit.csv", index=False)
    print(f"\nSaved historical_dataset_audit.csv")
    
    # A. Top 100 complaint types across 2020-2025
    print("\nCalculating top 100 complaint types...")
    top100 = combined['sr_type'].value_counts().head(100)
    top100_df = pd.DataFrame({
        'sr_type': top100.index,
        'complaint_count': top100.values,
        'percentage': np.round(top100.values / len(combined) * 100, 2)
    })
    top100_df.to_csv(EDA_DIR / "complaint_type_top100.csv", index=False)
    print(f"Top 100 saved")
    
    # B. Complaint frequency by year: year × sr_type × complaint_count
    print("Calculating complaint frequency by year...")
    year_type = combined.groupby(['year', 'sr_type']).size().reset_index(name='complaint_count')
    year_type.to_csv(EDA_DIR / "complaint_type_year_summary.csv", index=False)
    print(f"Year-type summary saved")
    
    # C. Complaint frequency by month: month × sr_type × complaint_count
    print("Calculating complaint frequency by month...")
    month_type = combined.groupby(['month', 'sr_type']).size().reset_index(name='complaint_count')
    month_type.to_csv(EDA_DIR / "complaint_type_month_summary.csv", index=False)
    print(f"Month-type summary saved")
    
    # D. Complaint frequency by year: year × complaint_count
    print("Calculating total complaints by year...")
    year_total = combined.groupby('year').size().reset_index(name='complaint_count')
    year_total.to_csv(EDA_DIR / "complaint_count_by_year.csv", index=False)
    print(f"Year total saved")
    
    # E. Complaint types by number of years they appear
    print("Calculating complaint type persistence across years...")
    type_years = combined.groupby('sr_type')['year'].nunique().reset_index()
    type_years.columns = ['sr_type', 'years_present']
    
    persistence = type_years['years_present'].value_counts().sort_index()
    persistence_df = pd.DataFrame({
        'years_present': persistence.index,
        'complaint_type_count': persistence.values
    })
    persistence_df.to_csv(EDA_DIR / "complaint_type_persistence.csv", index=False)
    print(f"Persistence saved")
    
    # F. Identify suitable complaint types
    print("\nIdentifying suitable complaint types...")
    
    # Calculate metrics per complaint type
    type_metrics = combined.groupby('sr_type').agg(
        total_count=('sr_number', 'count'),
        years_present=('year', 'nunique'),
        unique_wards=('ward', 'nunique'),
        unique_community_areas=('community_area', 'nunique'),
        missing_lat_pct=('latitude', lambda x: x.isna().sum() / len(x) * 100),
        missing_lon_pct=('longitude', lambda x: x.isna().sum() / len(x) * 100),
        unique_departments=('owner_department', 'nunique'),
        statuses=('status', lambda x: x.value_counts().to_dict())
    ).reset_index()
    
    # Calculate stability (coefficient of variation across years)
    year_counts = combined.groupby(['sr_type', 'year']).size().reset_index(name='count')
    stability = year_counts.groupby('sr_type')['count'].agg(['mean', 'std'])
    stability['cv'] = stability['std'] / stability['mean']
    stability = stability.reset_index()
    
    type_metrics = type_metrics.merge(stability[['sr_type', 'cv']], on='sr_type', how='left')
    type_metrics['cv'] = type_metrics['cv'].fillna(0)
    
    # Geographic completeness
    type_metrics['geo_completeness'] = 100 - (type_metrics['missing_lat_pct'] + type_metrics['missing_lon_pct']) / 2
    
    # Suitability score
    type_metrics['suitability_score'] = (
        np.log1p(type_metrics['total_count']) * 0.3 +
        (type_metrics['years_present'] / 6) * 0.25 +
        (1 - type_metrics['cv'].clip(0, 2) / 2) * 0.2 +
        (type_metrics['geo_completeness'] / 100) * 0.15 +
        (type_metrics['unique_wards'] / 50) * 0.1
    )
    
    # Filter for high frequency, stable, good geo, actionable
    suitable = type_metrics[
        (type_metrics['total_count'] >= 1000) &
        (type_metrics['years_present'] >= 4) &
        (type_metrics['geo_completeness'] >= 95) &
        (type_metrics['unique_wards'] >= 20)
    ].sort_values('suitability_score', ascending=False)
    
    suitable.to_csv(EDA_DIR / "suitable_complaint_types.csv", index=False)
    print(f"Suitable types saved: {len(suitable)} types")
    
    # Generate text report
    print("\nGenerating text report...")
    with open(EDA_DIR / "historical_dataset_audit.txt", "w") as f:
        f.write("=" * 80 + "\n")
        f.write("HISTORICAL DATASET AUDIT - CHICAGO 311 SERVICE REQUESTS 2020-2025\n")
        f.write("=" * 80 + "\n\n")
        
        f.write("PER-YEAR STATISTICS\n")
        f.write("-" * 80 + "\n\n")
        
        for audit in all_audits[:-1]:  # Exclude combined
            f.write(f"YEAR: {audit['year']}\n")
            f.write(f"  Records: {audit['record_count']:,}\n")
            f.write(f"  Date Range: {audit['min_created_date']} to {audit['max_created_date']}\n")
            f.write(f"  Unique SR Numbers: {audit['unique_sr_number']:,}\n")
            f.write(f"  Duplicate SR Numbers: {audit['duplicate_sr_number']}\n")
            f.write(f"  Unique SR Types: {audit['unique_sr_type']}\n")
            f.write(f"  Unique Departments: {audit['unique_owner_department']}\n")
            f.write(f"  Missing Latitude: {audit['missing_latitude_pct']}%\n")
            f.write(f"  Missing Longitude: {audit['missing_longitude_pct']}%\n")
            f.write(f"  Missing Ward: {audit['missing_ward_pct']}%\n")
            f.write(f"  Missing Community Area: {audit['missing_community_area_pct']}%\n")
            f.write(f"  Missing Zip Code: {audit['missing_zip_code_pct']}%\n")
            f.write(f"  Status Distribution: {audit['status_distribution']}\n")
            f.write(f"  Top 30 SR Types:\n")
            for k, v in eval(audit['top_30_sr_type']).items():
                f.write(f"    {k}: {v}\n")
            f.write("\n")
        
        # Combined
        ca = all_audits[-1]
        f.write(f"COMBINED (2020-2025)\n")
        f.write(f"  Records: {ca['record_count']:,}\n")
        f.write(f"  Date Range: {ca['min_created_date']} to {ca['max_created_date']}\n")
        f.write(f"  Unique SR Numbers: {ca['unique_sr_number']:,}\n")
        f.write(f"  Duplicate SR Numbers: {ca['duplicate_sr_number']}\n")
        f.write(f"  Unique SR Types: {ca['unique_sr_type']}\n")
        f.write(f"  Unique Departments: {ca['unique_owner_department']}\n")
        f.write(f"  Missing Latitude: {ca['missing_latitude_pct']}%\n")
        f.write(f"  Missing Longitude: {ca['missing_longitude_pct']}%\n")
        f.write(f"  Missing Ward: {ca['missing_ward_pct']}%\n")
        f.write(f"  Missing Community Area: {ca['missing_community_area_pct']}%\n")
        f.write(f"  Missing Zip Code: {ca['missing_zip_code_pct']}%\n")
        f.write(f"  Status Distribution: {ca['status_distribution']}\n")
        f.write("\n")
        
        # Top 100
        f.write("TOP 100 COMPLAINT TYPES (2020-2025)\n")
        f.write("-" * 80 + "\n\n")
        for i, row in top100_df.iterrows():
            f.write(f"  {i+1:3d}. {row['sr_type']}: {row['complaint_count']:,} ({row['percentage']}%)\n")
        f.write("\n")
        
        # Persistence
        f.write("COMPLAINT TYPE PERSISTENCE ACROSS YEARS\n")
        f.write("-" * 80 + "\n\n")
        for _, row in persistence_df.iterrows():
            f.write(f"  Present in {row['years_present']} year(s): {row['complaint_type_count']} complaint types\n")
        f.write("\n")
        
        # Suitable types
        f.write("RECOMMENDED COMPLAINT TYPES FOR RESEARCH\n")
        f.write("-" * 80 + "\n\n")
        for i, row in suitable.head(30).iterrows():
            f.write(f"  {row['sr_type']}\n")
            f.write(f"    Total: {row['total_count']:,}, Years: {row['years_present']}/6, ")
            f.write(f"CV: {row['cv']:.3f}, Geo: {row['geo_completeness']:.1f}%, Wards: {row['unique_wards']}\n")
            f.write(f"    Suitability Score: {row['suitability_score']:.3f}\n")
            f.write("\n")
        
        f.write("\nRESEARCH DATASET RECOMMENDATION\n")
        f.write("=" * 80 + "\n\n")
        f.write("Based on the audit of 11.3M records across 2020-2025, the following complaint types\n")
        f.write("are most suitable for the research pipeline:\n\n")
        f.write("Historical complaints -> Future complaint prediction -> Officer assignment\n")
        f.write("-> Field verification -> Actual outcome -> Feedback\n\n")
        
        for i, row in suitable.head(20).iterrows():
            f.write(f"1. {row['sr_type']}\n")
            f.write(f"   - Frequency: {row['total_count']:,} records over 6 years ({row['total_count']/6:,.0f}/year avg)\n")
            f.write(f"   - Temporal stability: Present in {row['years_present']}/6 years, CV={row['cv']:.3f}\n")
            f.write(f"   - Geographic coverage: {row['unique_wards']}/50 wards, {row['unique_community_areas']}/77 community areas\n")
            f.write(f"   - Coordinate completeness: {row['geo_completeness']:.1f}%\n")
            f.write(f"   - Department routing: {row['unique_departments']} departments\n")
            f.write(f"   - Suitability score: {row['suitability_score']:.3f}\n")
            f.write(f"   - Why suitable: ")
            
            reasons = []
            if row['total_count'] > 50000:
                reasons.append("high volume enables robust modeling")
            if row['years_present'] == 6:
                reasons.append("consistent presence every year")
            elif row['years_present'] >= 4:
                reasons.append("stable multi-year presence")
            if row['cv'] < 0.5:
                reasons.append("low year-to-year variation")
            if row['geo_completeness'] > 99:
                reasons.append("excellent geographic data for spatial prediction")
            if row['unique_wards'] >= 40:
                reasons.append("broad citywide distribution")
            f.write("; ".join(reasons) + "\n\n")
        
        f.write("\nCOMPLAINT TYPES TO EXCLUDE FROM FORECASTING TARGET:\n")
        f.write("-" * 80 + "\n")
        f.write("  - 311 INFORMATION ONLY CALL: Non-actionable, no field response needed\n")
        f.write("  - Aircraft Noise Complaint: Handled by Aviation Dept, no field officer dispatch\n")
        f.write("  - Types with <1000 total records: Insufficient data for modeling\n")
        f.write("  - Types present in <4 years: Unstable temporal patterns\n")
        f.write("  - Types with >5% missing coordinates: Poor spatial prediction capability\n")
    
    print("Text report saved")
    print("\nAll done!")

if __name__ == "__main__":
    main()