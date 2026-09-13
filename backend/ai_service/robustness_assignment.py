import pandas as pd
import numpy as np
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
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def load_base_data():
    candidates = pd.read_csv('data/results/officer_assignment_candidates.csv')
    centroids = pd.read_csv('data/processed/community_area_centroids.csv')
    return candidates, centroids

def simulate_officers(seed):
    np.random.seed(seed)
    n_per_dept = 39
    depts = [
        'Building & Safety Inspections', 'Community Maintenance', 'Electrical & Lighting',
        'Infrastructure Repair', 'Sanitation & Recycling', 'Vector Control', 'Vehicle & Traffic Operations'
    ]
    areas = list(range(1, 78))
    
    officers = []
    for dept in depts:
        for i in range(n_per_dept):
            max_assignments = np.random.randint(3, 8)
            current_workload = np.random.randint(0, max_assignments + 1)
            available = np.random.rand() < 0.8
            home_area = np.random.choice(areas)
            officers.append({
                'officer_id': f'SIM_SEED{seed}_{dept.replace(" ", "_").replace("&", "").replace(".", "")}_{i:03d}',
                'department': f'SIMULATED DEPARTMENT COMPATIBILITY: {dept}',
                'dept_short': dept,
                'home_area': home_area,
                'max_assignments': max_assignments,
                'current_workload': current_workload,
                'available': available,
                'capacity_scenario': 'LOW'
            })
    return pd.DataFrame(officers)

def compute_distances(officers, centroids):
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
            results.append({
                'week_start': week, 'community_area': ca, 'sr_type': sr,
                'predicted_probability': risk, 'prediction_rank': rank,
                'verification_policy': policy, 'exploration_ratio': budget,
                'verification_budget': budget, 'selection_type': sel_type,
                'assignment_policy': policy_name,
                'officer_id': 'UNASSIGNED', 'officer_department': '',
                'distance_cost': np.nan, 'workload_before': np.nan,
                'workload_after': np.nan, 'department_compatible': False,
                'assignment_score': np.nan
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
            'assignment_score': score_val
        })
    
    return pd.DataFrame(results)

def evaluate_results(assignments, candidates):
    merge_cols = ['week_start', 'community_area', 'sr_type', 'verification_budget', 'selection_type', 'predicted_probability']
    candidates_renamed = candidates.rename(columns={'budget': 'verification_budget'})
    assignments = assignments.merge(
        candidates_renamed[merge_cols + ['actual_escalation']].drop_duplicates(),
        on=merge_cols, how='left'
    )
    
    budgets = [0.05, 0.10, 0.20]
    policies = ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']
    
    all_metrics = []
    
    for budget in budgets:
        for policy in policies:
            sub = assignments[(assignments['verification_budget'] == budget) & (assignments['assignment_policy'] == policy)].copy()
            assigned = sub[sub['officer_id'] != 'UNASSIGNED']
            unassigned = sub[sub['officer_id'] == 'UNASSIGNED']
            
            n_assigned = len(assigned)
            n_total = len(sub)
            
            if n_assigned == 0:
                all_metrics.append({
                    'seed': None, 'budget': budget, 'assignment_policy': policy,
                    'precision': 0, 'recall': 0, 'discovery_rate': 0,
                    'total_distance': 0, 'mean_distance': 0, 'workload_imbalance': 0
                })
                continue
            
            escalations = assigned['actual_escalation'].sum()
            precision = escalations / n_assigned if n_assigned > 0 else 0
            recall = escalations / sub['actual_escalation'].sum() if sub['actual_escalation'].sum() > 0 else 0
            discovery_rate = escalations / n_total if n_total > 0 else 0
            
            total_distance = assigned['distance_cost'].sum()
            mean_distance = assigned['distance_cost'].mean()
            
            wl_max = assigned.groupby('officer_id')['workload_after'].max()
            mean_workload = wl_max.mean()
            wl_std = wl_max.std()
            workload_imbalance = wl_std / mean_workload if mean_workload > 0 else 0
            
            all_metrics.append({
                'budget': budget, 'assignment_policy': policy,
                'precision': precision, 'recall': recall, 'discovery_rate': discovery_rate,
                'total_distance': total_distance, 'mean_distance': mean_distance,
                'workload_imbalance': workload_imbalance,
                'assigned_locations': n_assigned, 'escalations_discovered': int(escalations)
            })
    
    return pd.DataFrame(all_metrics)

def run_seed(seed):
    print(f"  Running seed {seed}...")
    candidates, centroids = load_base_data()
    officers = simulate_officers(seed)
    distances = compute_distances(officers, centroids)
    
    results_risk = run_assignment(candidates, officers, distances, 'RISK_ONLY_ASSIGNMENT',
                                  weight_risk=1.0, weight_dist=0.0, weight_workload=0.0)
    results_rdw = run_assignment(candidates, officers, distances, 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT',
                                  weight_risk=0.4, weight_dist=0.3, weight_workload=0.3)
    
    all_results = pd.concat([results_risk, results_rdw], ignore_index=True)
    metrics = evaluate_results(all_results, candidates)
    metrics['seed'] = seed
    return metrics

def main():
    seeds = [42, 123, 2024, 999]
    all_metrics = []
    
    print("Running robustness analysis...")
    for seed in seeds:
        metrics = run_seed(seed)
        all_metrics.append(metrics)
    
    robustness_df = pd.concat(all_metrics, ignore_index=True)
    
    # Save raw per-seed results
    robustness_df.to_csv('data/results/officer_assignment_robustness_raw.csv', index=False)
    print("\nSaved robustness_raw.csv")
    
    # Compute mean ± std
    summary = robustness_df.groupby(['budget', 'assignment_policy']).agg(
        precision_mean=('precision', 'mean'),
        precision_std=('precision', 'std'),
        recall_mean=('recall', 'mean'),
        recall_std=('recall', 'std'),
        discovery_rate_mean=('discovery_rate', 'mean'),
        discovery_rate_std=('discovery_rate', 'std'),
        total_distance_mean=('total_distance', 'mean'),
        total_distance_std=('total_distance', 'std'),
        mean_distance_mean=('mean_distance', 'mean'),
        mean_distance_std=('mean_distance', 'std'),
        workload_imbalance_mean=('workload_imbalance', 'mean'),
        workload_imbalance_std=('workload_imbalance', 'std'),
        assigned_locations_mean=('assigned_locations', 'mean'),
        assigned_locations_std=('assigned_locations', 'std'),
        escalations_discovered_mean=('escalations_discovered', 'mean'),
        escalations_discovered_std=('escalations_discovered', 'std'),
    ).reset_index()
    
    summary.to_csv('data/results/officer_assignment_robustness.csv', index=False)
    print("\nSaved robustness.csv")
    
    return robustness_df, summary

if __name__ == '__main__':
    robustness_df, summary = main()
    print("\nRobustness Summary:")
    print(summary.to_string())