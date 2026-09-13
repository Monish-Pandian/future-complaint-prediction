import requests
import pandas as pd
import time
import os
import sys
from datetime import datetime
from pathlib import Path

API_URL = "https://data.cityofchicago.org/resource/v6vf-nfxy.json"
FIELDS = "sr_number,sr_type,owner_department,status,created_date,closed_date,zip_code,ward,community_area,latitude,longitude"
PAGE_SIZE = 50000
MAX_RETRIES = 5
BASE_TIMEOUT = 30
RETRY_DELAY = 5

RAW_DIR = Path("data/raw")
EDA_DIR = Path("data/eda")
RAW_DIR.mkdir(parents=True, exist_ok=True)
EDA_DIR.mkdir(parents=True, exist_ok=True)

DOWNLOAD_LOG = RAW_DIR / "download_log.txt"
YEARLY_SUMMARY = EDA_DIR / "yearly_data_summary.csv"

YEARS = list(range(2020, 2026))

def log_message(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {msg}"
    print(log_entry)
    with open(DOWNLOAD_LOG, "a") as f:
        f.write(log_entry + "\n")

def log_error(year, msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] ERROR [{year}]: {msg}"
    print(log_entry, file=sys.stderr)
    with open(DOWNLOAD_LOG, "a") as f:
        f.write(log_entry + "\n")

def get_total_count(year):
    """Get total record count for a year."""
    params = {
        "$select": "count(*)",
        "$where": f"created_date >= '{year}-01-01T00:00:00' AND created_date <= '{year}-12-31T23:59:59'",
        "$limit": 1
    }
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(API_URL, params=params, timeout=BASE_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            return int(data[0]["count"])
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                log_error(year, f"Failed to get total count after {MAX_RETRIES} attempts: {e}")
                return None
    return None

def fetch_page(year, offset, limit=PAGE_SIZE):
    """Fetch a single page of data."""
    params = {
        "$select": FIELDS,
        "$where": f"created_date >= '{year}-01-01T00:00:00' AND created_date <= '{year}-12-31T23:59:59'",
        "$limit": limit,
        "$offset": offset,
        "$order": "created_date ASC"
    }
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(API_URL, params=params, timeout=BASE_TIMEOUT)
            if resp.status_code == 429:
                wait = RETRY_DELAY * (attempt + 1) * 2
                log_message(f"Rate limited (429), waiting {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                log_message(f"Timeout, retry {attempt + 1}/{MAX_RETRIES} after {wait}s...")
                time.sleep(wait)
            else:
                raise
        except requests.exceptions.ConnectionError:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                log_message(f"Connection error, retry {attempt + 1}/{MAX_RETRIES} after {wait}s...")
                time.sleep(wait)
            else:
                raise
        except requests.exceptions.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                log_message(f"HTTP error {e.response.status_code}, retry {attempt + 1}/{MAX_RETRIES} after {wait}s...")
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                log_message(f"Error: {e}, retry {attempt + 1}/{MAX_RETRIES} after {wait}s...")
                time.sleep(wait)
            else:
                raise
    return None

def validate_year_file(year, filepath):
    """Validate a downloaded year file."""
    try:
        df = pd.read_csv(filepath, low_memory=False)
        log_message(f"  Validation: {len(df)} records, {len(df.columns)} columns")
        
        # Check for required columns
        required = ['sr_number', 'sr_type', 'owner_department', 'status', 
                    'created_date', 'closed_date', 'zip_code', 'ward', 
                    'community_area', 'latitude', 'longitude']
        missing_cols = [c for c in required if c not in df.columns]
        if missing_cols:
            log_error(year, f"Missing columns: {missing_cols}")
            return False
        
        # Convert dates
        df['created_date'] = pd.to_datetime(df['created_date'], errors='coerce')
        df['closed_date'] = pd.to_datetime(df['closed_date'], errors='coerce')
        
        # Validation checks
        dup_sr = df['sr_number'].duplicated().sum()
        min_date = df['created_date'].min()
        max_date = df['created_date'].max()
        unique_types = df['sr_type'].nunique()
        unique_depts = df['owner_department'].nunique()
        unique_wards = df['ward'].nunique()
        unique_comm = df['community_area'].nunique()
        
        missing_lat = df['latitude'].isna().sum() / len(df) * 100
        missing_lon = df['longitude'].isna().sum() / len(df) * 100
        missing_ward = df['ward'].isna().sum() / len(df) * 100
        missing_comm = df['community_area'].isna().sum() / len(df) * 100
        
        log_message(f"  Duplicate sr_number: {dup_sr}")
        log_message(f"  Date range: {min_date} to {max_date}")
        log_message(f"  Unique sr_type: {unique_types}")
        log_message(f"  Unique departments: {unique_depts}")
        log_message(f"  Unique wards: {unique_wards}")
        log_message(f"  Unique community areas: {unique_comm}")
        log_message(f"  Missing lat: {missing_lat:.2f}%, lon: {missing_lon:.2f}%")
        log_message(f"  Missing ward: {missing_ward:.2f}%, community_area: {missing_comm:.2f}%")
        
        # Check date range is correct for the year
        expected_min = pd.Timestamp(f"{year}-01-01")
        expected_max = pd.Timestamp(f"{year}-12-31 23:59:59")
        if pd.notna(min_date) and min_date < expected_min:
            log_error(year, f"WARNING: min_created_date {min_date} before {year}")
        if pd.notna(max_date) and max_date > expected_max:
            log_error(year, f"WARNING: max_created_date {max_date} after {year}")
        
        return {
            'year': year,
            'record_count': len(df),
            'unique_sr_numbers': df['sr_number'].nunique(),
            'unique_sr_types': unique_types,
            'unique_departments': unique_depts,
            'unique_wards': unique_wards,
            'unique_community_areas': unique_comm,
            'missing_latitude_pct': round(missing_lat, 2),
            'missing_longitude_pct': round(missing_lon, 2),
            'missing_ward_pct': round(missing_ward, 2),
            'missing_community_area_pct': round(missing_comm, 2),
            'min_created_date': str(min_date) if pd.notna(min_date) else None,
            'max_created_date': str(max_date) if pd.notna(max_date) else None,
            'file_size_mb': round(os.path.getsize(filepath) / (1024*1024), 2)
        }
    except Exception as e:
        log_error(year, f"Validation failed: {e}")
        return False

def download_year(year):
    """Download all data for a given year."""
    filepath = RAW_DIR / f"chicago_311_{year}.csv"
    
    # Check if file already exists and validate it
    if filepath.exists():
        log_message(f"File exists for {year}, validating...")
        validation = validate_year_file(year, filepath)
        if validation:
            log_message(f"  Existing file for {year} is valid, skipping download")
            return validation
        else:
            log_message(f"  Existing file for {year} failed validation, re-downloading...")
    
    log_message(f"Starting download for {year}...")
    start_time = datetime.now()
    
    # Get total count
    total_count = get_total_count(year)
    if total_count is not None:
        log_message(f"  Total records for {year}: {total_count:,}")
    else:
        log_message(f"  Could not get total count for {year}, proceeding anyway")
    
    all_records = []
    offset = 0
    total_downloaded = 0
    errors = 0
    retries = 0
    
    while True:
        try:
            data = fetch_page(year, offset)
            if not data:
                log_message(f"  No more data at offset {offset}")
                break
            
            all_records.extend(data)
            total_downloaded += len(data)
            
            # Progress
            if total_count:
                pct = (total_downloaded / total_count) * 100
                log_message(f"  Year {year} | Offset {offset:,} | Downloaded {total_downloaded:,} | {pct:.1f}%")
            else:
                log_message(f"  Year {year} | Offset {offset:,} | Downloaded {total_downloaded:,}")
            
            if len(data) < PAGE_SIZE:
                log_message(f"  Last page reached ({len(data)} records)")
                break
            
            offset += PAGE_SIZE
            
        except Exception as e:
            errors += 1
            log_error(year, f"Failed at offset {offset}: {e}")
            if errors >= 10:
                log_error(year, "Too many errors, stopping")
                break
            time.sleep(RETRY_DELAY * 2)
            continue
    
    if not all_records:
        log_error(year, "No records downloaded!")
        return None
    
    # Save to CSV
    df = pd.DataFrame(all_records)
    df.to_csv(filepath, index=False)
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    file_size_mb = os.path.getsize(filepath) / (1024*1024)
    
    log_message(f"  Download complete: {len(df):,} records in {duration:.1f}s ({file_size_mb:.2f} MB)")
    log_message(f"  Errors: {errors}, Retries: {retries}")
    
    # Validate
    validation = validate_year_file(year, filepath)
    if validation:
        validation['download_duration_sec'] = round(duration, 1)
        validation['errors'] = errors
        validation['retries'] = retries
        validation['file_size_mb'] = round(file_size_mb, 2)
    
    return validation

def main():
    log_message("=" * 60)
    log_message("CHICAGO 311 HISTORICAL DATA DOWNLOAD")
    log_message("Years: 2020-2025")
    log_message("=" * 60)
    
    all_summaries = []
    
    for year in YEARS:
        log_message(f"\n{'='*60}")
        log_message(f"PROCESSING YEAR {year}")
        log_message(f"{'='*60}")
        
        try:
            summary = download_year(year)
            if summary:
                all_summaries.append(summary)
                # Save incremental summary
                summary_df = pd.DataFrame(all_summaries)
                summary_df.to_csv(YEARLY_SUMMARY, index=False)
                log_message(f"  Summary saved to {YEARLY_SUMMARY}")
            else:
                log_error(year, "Download failed, continuing to next year")
        except Exception as e:
            log_error(year, f"Unexpected error: {e}")
            continue
    
    # Final summary
    log_message(f"\n{'='*60}")
    log_message("DATA COLLECTION COMPLETE")
    log_message(f"{'='*60}")
    
    if all_summaries:
        summary_df = pd.DataFrame(all_summaries)
        print("\nYEARLY SUMMARY:")
        print(summary_df.to_string(index=False))
        
        print(f"\nSaved to: {YEARLY_SUMMARY}")
        print(f"Download log: {DOWNLOAD_LOG}")
    else:
        log_error("ALL", "No years downloaded successfully!")

if __name__ == "__main__":
    main()