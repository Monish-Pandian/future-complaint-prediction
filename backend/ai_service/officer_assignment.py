import pandas as pd
import numpy as np
from math import radians, sin, cos, sqrt, atan2
import warnings
warnings.filterwarnings('ignore')

SR_TO_DEPT = {
    'Rodent Baiting/Rat Complaint': 'Vector Control',
    'Abandoned Vehicle Complaint': 'Vehicle & Traffic Operations',
    'Garbage Cart Maintenance': 'Sanitation & Recycling',
    'Graffiti Removal Request': 'Community Maintenance',
    'Traffic Signal Out Complaint': 'Electrical & Lighting',
    'Blue Recycling Cart': 'Sanitation & Recycling',
    'Building Violation': 'Building & Safety Inspections',
    'Street Light Out Complaint': 'Electrical & Lighting',
    'Pothole in Street Complaint': 'Infrastructure Repair',
    'Tree Debris Clean-Up Request': 'Community Maintenance',
}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def load_data():
    candidates = pd.read_csv('data/results/officer_assignment_candidates.csv')
    officers = pd.read_csv('data/results/simulated_officers.csv')
    centroids = pd.read_csv('data/processed/community_area_centroids.csv')
    
    officers_low = officers[officers['capacity_scenario'] == 'LOW'].copy()
    officers_low['dept_short'] = officers_low['department'].str.replace('SIMULATED DEPARTMENT COMPATIBILITY: ', '')
    
    return candidates, officers_low, centroids

def compute_distance_matrix(officers, centroids):
    officer_coords = officers[['officer_id', 'home_area']].merge(
        centroids.rename(columns={'community_area': 'home_area', 'latitude': 'off_lat', 'longitude': 'off_lon'}),
        on='home_area', how='left'
    )
    location_coords = centroids.rename(columns={'community_area': 'community_area', 'latitude': 'loc_lat', 'longitude': 'loc_lon'})
    
    dist_rows = []
    for _, off in officer_coords.iterrows():
        if pd.isna(off['off_lat']):
            continue
        for _, loc in location_coords.iterrows():
            d = haversine(off['off_lat'], off['off_lon'], loc['loc_lat'], loc['loc_lon'])
            dist_rows.append({
                'officer_id': off['officer_id'],
                'community_area': loc['community_area'],
                'distance_km': d
            })
    return pd.DataFrame(dist_rows)

def run_assignment(candidates, officers, distances, policy_name, weight_risk=1.0, weight_dist=0.0, weight_workload=0.0):
    officers_state = officers.copy()
    officers_state['workload'] = officers_state['current_workload'].astype(float)
    officers_state['available'] = officers_state['available'].astype(bool)
    officers_state['capacity'] = officers_state['max_assignments'].astype(float)
    
    candidates = candidates.sort_values(['week_start', 'prediction_rank']).copy()
    
    results = []
    unassigned_count = 0
    unassigned_reasons = []
    
    for _, loc in candidates.iterrows():
        week = loc['week_start']
        ca = loc['community_area']
        sr = loc['sr_type']
        risk = loc['predicted_probability']
        rank = loc['prediction_rank']
        policy = loc['policy']
        budget = loc['budget']
        sel_type = loc['selection_type']
        
        required_dept = SR_TO_DEPT.get(sr, '')
        dept_prefix = f'SIMULATED DEPARTMENT COMPATIBILITY: {required_dept}'
        
        eligible = officers_state[
            (officers_state['available']) &
            (officers_state['workload'] < officers_state['capacity']) &
            (officers_state['department'] == dept_prefix)
        ].copy()
        
        if len(eligible) == 0:
            unassigned_count += 1
            reason = 'no_eligible_officer'
            if not any(officers_state['available'] & (officers_state['department'] == dept_prefix)):
                reason = 'no_compatible_dept'
            elif not any(officers_state['available']):
                reason = 'no_available_officer'
            elif not any(officers_state['workload'] < officers_state['capacity']):
                reason = 'all_at_capacity'
            unassigned_reasons.append({'week_start': week, 'community_area': ca, 'sr_type': sr, 'reason': reason})
            results.append({
                'week_start': week, 'community_area': ca, 'sr_type': sr,
                'predicted_probability': risk, 'prediction_rank': rank,
                'verification_policy': policy, 'exploration_ratio': budget,
                'verification_budget': budget, 'selection_type': sel_type,
                'assignment_policy': policy_name,
                'officer_id': 'UNASSIGNED', 'officer_department': '',
                'distance_cost': np.nan, 'workload_before': np.nan,
                'workload_after': np.nan, 'department_compatible': False,
                'assignment_score': np.nan, 'unassigned_reason': reason
            })
            continue
        
        eligible = eligible.merge(distances[distances['community_area'] == ca][['officer_id', 'distance_km']], 
                                  on='officer_id', how='left')
        eligible['distance_km'] = eligible['distance_km'].fillna(eligible['distance_km'].max() * 2 if not eligible['distance_km'].isna().all() else 100)
        
        if weight_dist > 0 or weight_workload > 0:
            risk_norm = (risk - candidates['predicted_probability'].min()) / (candidates['predicted_probability'].max() - candidates['predicted_probability'].min() + 1e-9)
            dist_norm = (eligible['distance_km'] - eligible['distance_km'].min()) / (eligible['distance_km'].max() - eligible['distance_km'].min() + 1e-9)
            workload_norm = (eligible['workload'] - eligible['workload'].min()) / (eligible['workload'].max() - eligible['workload'].min() + 1e-9)
            
            eligible['score'] = (weight_risk * (1 - risk_norm) + 
                                 weight_dist * dist_norm + 
                                 weight_workload * workload_norm)
            best = eligible.loc[eligible['score'].idxmin()]
            score_val = best['score']
        else:
            best = eligible.loc[eligible['workload'].idxmin()]
            tied = eligible[eligible['workload'] == best['workload']]
            if len(tied) > 1:
                best = tied.loc[tied['distance_km'].idxmin()]
            score_val = 0.0
        
        officer_id = best['officer_id']
        officer_dept = best['dept_short']
        distance_cost = best['distance_km']
        workload_before = best['workload']
        
        officers_state.loc[officers_state['officer_id'] == officer_id, 'workload'] += 1
        workload_after = workload_before + 1
        
        results.append({
            'week_start': week, 'community_area': ca, 'sr_type': sr,
            'predicted_probability': risk, 'prediction_rank': rank,
            'verification_policy': policy, 'exploration_ratio': budget,
            'verification_budget': budget, 'selection_type': sel_type,
            'assignment_policy': policy_name,
            'officer_id': officer_id, 'officer_department': officer_dept,
            'distance_cost': distance_cost, 'workload_before': workload_before,
            'workload_after': workload_after, 'department_compatible': True,
            'assignment_score': score_val, 'unassigned_reason': ''
        })
    
    return pd.DataFrame(results), unassigned_count, unassigned_reasons

def generate_report(results_df, unassigned_count, unassigned_reasons, policy_name, weights):
    assigned = results_df[results_df['officer_id'] != 'UNASSIGNED']
    total = len(results_df)
    n_assigned = len(assigned)
    avg_dist = assigned['distance_cost'].mean() if n_assigned > 0 else 0
    compat_rate = assigned['department_compatible'].mean() if n_assigned > 0 else 0
    
    workloads = assigned.groupby('officer_id')['workload_after'].max()
    workload_dist = {
        'min': workloads.min() if n_assigned > 0 else 0,
        'max': workloads.max() if n_assigned > 0 else 0,
        'mean': workloads.mean() if n_assigned > 0 else 0,
        'std': workloads.std() if n_assigned > 0 else 0
    }
    
    capacity_violations = 0
    for _, row in assigned.iterrows():
        if row['workload_after'] > row.get('capacity', 999):
            capacity_violations += 1
    
    reason_counts = pd.Series([r['reason'] for r in unassigned_reasons]).value_counts().to_dict() if unassigned_reasons else {}
    
    w_str = f"risk={weights[0]}, distance={weights[1]}, workload={weights[2]}"
    
    report = f"""OFFICER ASSIGNMENT REPORT — {policy_name}
============================================================

ASSIGNMENT POLICY: {policy_name}
WEIGHTS: {w_str}

SUMMARY:
  Total locations: {total}
  Assigned: {n_assigned}
  Unassigned: {unassigned_count}
  Assignment rate: {n_assigned/total*100:.1f}%

DISTANCE:
  Average distance (km): {avg_dist:.2f}

WORKLOAD DISTRIBUTION:
  Min: {workload_dist['min']}
  Max: {workload_dist['max']}
  Mean: {workload_dist['mean']:.2f}
  Std: {workload_dist['std']:.2f}

COMPATIBILITY:
  Department compatible rate: {compat_rate*100:.1f}%

CAPACITY:
  Capacity violations: {capacity_violations}

UNASSIGNED REASONS:
"""
    for reason, count in reason_counts.items():
        report += f"  {reason}: {count}\n"
    
    report += """
ASSIGNMENT ASSUMPTIONS:
  - Synthetic officer pool (LOW capacity scenario)
  - Department compatibility via SR type mapping
  - Distance = haversine between officer home_area and community_area centroids
  - Workload tracked per officer, max_assignments = capacity
  - Officers static availability (available=True/False)
  - No future outcomes used in assignment
  - Risk normalized across all candidates
  - Distance normalized per-location across eligible officers
  - Workload normalized per-location across eligible officers
"""
    return report

def main():
    print("Loading data...")
    candidates, officers, centroids = load_data()
    print(f"Candidates: {len(candidates)}, Officers (LOW): {len(officers)}, Centroids: {len(centroids)}")
    
    print("Computing distance matrix...")
    distances = compute_distance_matrix(officers, centroids)
    print(f"Distance pairs: {len(distances)}")
    
    print("\nRunning RISK_ONLY_ASSIGNMENT...")
    results_risk, unassigned_risk, reasons_risk = run_assignment(
        candidates, officers, distances, 'RISK_ONLY_ASSIGNMENT',
        weight_risk=1.0, weight_dist=0.0, weight_workload=0.0
    )
    
    print("\nRunning RISK_DISTANCE_WORKLOAD_ASSIGNMENT...")
    results_rdw, unassigned_rdw, reasons_rdw = run_assignment(
        candidates, officers, distances, 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT',
        weight_risk=0.4, weight_dist=0.3, weight_workload=0.3
    )
    
    all_results = pd.concat([results_risk, results_rdw], ignore_index=True)
    
    output_cols = ['week_start', 'community_area', 'sr_type', 'predicted_probability',
                   'prediction_rank', 'verification_policy', 'exploration_ratio',
                   'verification_budget', 'selection_type', 'assignment_policy',
                   'officer_id', 'officer_department', 'distance_cost',
                   'workload_before', 'workload_after', 'department_compatible',
                   'assignment_score']
    
    all_results[output_cols].to_csv('data/results/officer_assignment_decisions.csv', index=False)
    print(f"\nSaved decisions: {len(all_results)} rows")
    
    report_risk = generate_report(results_risk, unassigned_risk, reasons_risk, 'RISK_ONLY_ASSIGNMENT', (1.0, 0.0, 0.0))
    report_rdw = generate_report(results_rdw, unassigned_rdw, reasons_rdw, 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT', (0.4, 0.3, 0.3))
    
    full_report = report_risk + "\n\n" + report_rdw
    with open('data/results/officer_assignment_report.txt', 'w') as f:
        f.write(full_report)
    
    print("Saved report")
    
    print("\n" + "="*60)
    print("ASSIGNMENT SUMMARY")
    print("="*60)
    for policy, res, unassigned in [('RISK_ONLY', results_risk, unassigned_risk), 
                                     ('RISK_DIST_WL', results_rdw, unassigned_rdw)]:
        assigned = res[res['officer_id'] != 'UNASSIGNED']
        print(f"\n{policy}:")
        print(f"  Assigned: {len(assigned)}/{len(res)} ({len(assigned)/len(res)*100:.1f}%)")
        print(f"  Avg distance: {assigned['distance_cost'].mean():.2f} km")
        print(f"  Compat rate: {assigned['department_compatible'].mean()*100:.1f}%")
        print(f"  Workload mean: {assigned.groupby('officer_id')['workload_after'].max().mean():.2f}")

if __name__ == '__main__':
    main()