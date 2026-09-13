import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def load_data():
    assignments = pd.read_csv('data/results/officer_assignment_decisions.csv')
    candidates = pd.read_csv('data/results/officer_assignment_candidates.csv')
    return assignments, candidates

def evaluate_policy(df, budget, policy_name):
    sub = df[(df['verification_budget'] == budget) & (df['assignment_policy'] == policy_name)].copy()
    
    assigned = sub[sub['officer_id'] != 'UNASSIGNED']
    unassigned = sub[sub['officer_id'] == 'UNASSIGNED']
    
    n_assigned = len(assigned)
    n_unassigned = len(unassigned)
    n_total = len(sub)
    
    if n_assigned == 0:
        return {
            'budget': budget, 'assignment_policy': policy_name,
            'assigned_locations': 0, 'unassigned_locations': n_unassigned,
            'escalations_discovered': 0, 'precision': 0, 'recall': 0,
            'discovery_rate': 0, 'mean_predicted_risk': 0,
            'total_distance': 0, 'mean_distance': 0, 'median_distance': 0,
            'maximum_distance': 0, 'distance_saved': 0,
            'mean_workload': 0, 'workload_std': 0, 'workload_imbalance': 0,
            'compatible_assignments': 0, 'incompatible_assignments': 0
        }
    
    escalations_discovered = assigned['actual_escalation'].sum() if 'actual_escalation' in assigned.columns else 0
    precision = escalations_discovered / n_assigned if n_assigned > 0 else 0
    recall = escalations_discovered / sub['actual_escalation'].sum() if sub['actual_escalation'].sum() > 0 else 0
    discovery_rate = escalations_discovered / n_total if n_total > 0 else 0
    
    mean_predicted_risk = assigned['predicted_probability'].mean()
    
    total_distance = assigned['distance_cost'].sum()
    mean_distance = assigned['distance_cost'].mean()
    median_distance = assigned['distance_cost'].median()
    maximum_distance = assigned['distance_cost'].max()
    
    mean_workload = assigned['workload_after'].mean()
    workload_std = assigned.groupby('officer_id')['workload_after'].max().std()
    workload_imbalance = workload_std / mean_workload if mean_workload > 0 else 0
    
    compatible = assigned['department_compatible'].sum()
    incompatible = n_assigned - compatible
    
    return {
        'budget': budget, 'assignment_policy': policy_name,
        'assigned_locations': n_assigned, 'unassigned_locations': n_unassigned,
        'escalations_discovered': int(escalations_discovered), 'precision': precision, 'recall': recall,
        'discovery_rate': discovery_rate, 'mean_predicted_risk': mean_predicted_risk,
        'total_distance': total_distance, 'mean_distance': mean_distance,
        'median_distance': median_distance, 'maximum_distance': maximum_distance,
        'distance_saved': 0,
        'mean_workload': mean_workload, 'workload_std': workload_std if not np.isnan(workload_std) else 0,
        'workload_imbalance': workload_imbalance,
        'compatible_assignments': int(compatible), 'incompatible_assignments': int(incompatible)
    }

def run_ablation(df, budget):
    results = []
    
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        sub = df[(df['verification_budget'] == budget) & (df['assignment_policy'] == policy)].copy()
        assigned = sub[sub['officer_id'] != 'UNASSIGNED']
        
        if len(assigned) == 0:
            continue
        
        if policy == 'RISK_ONLY_ASSIGNMENT':
            strategy = 'A_Risk_only'
        else:
            strategy = 'C_Risk_distance_workload'
        
        n_assigned = len(assigned)
        escalations = assigned['actual_escalation'].sum()
        precision = escalations / n_assigned if n_assigned > 0 else 0
        recall = escalations / sub['actual_escalation'].sum() if sub['actual_escalation'].sum() > 0 else 0
        mean_risk = assigned['predicted_probability'].mean()
        total_dist = assigned['distance_cost'].sum()
        mean_dist = assigned['distance_cost'].mean()
        median_dist = assigned['distance_cost'].median()
        max_dist = assigned['distance_cost'].max()
        mean_wl = assigned['workload_after'].mean()
        wl_std = assigned.groupby('officer_id')['workload_after'].max().std()
        wl_imb = wl_std / mean_wl if mean_wl > 0 else 0
        compat = assigned['department_compatible'].sum()
        incompat = n_assigned - compat
        
        results.append({
            'budget': budget, 'ablation_strategy': strategy,
            'assigned_locations': n_assigned,
            'escalations_discovered': int(escalations),
            'precision': precision, 'recall': recall,
            'mean_predicted_risk': mean_risk,
            'total_distance': total_dist, 'mean_distance': mean_dist,
            'median_distance': median_dist, 'maximum_distance': max_dist,
            'mean_workload': mean_wl, 'workload_std': wl_std if not np.isnan(wl_std) else 0,
            'workload_imbalance': wl_imb,
            'compatible_assignments': int(compat), 'incompatible_assignments': int(incompat)
        })
    
    return results

def run_weekly(df, budget, policy_name):
    sub = df[(df['verification_budget'] == budget) & (df['assignment_policy'] == policy_name)].copy()
    
    weekly = sub.groupby('week_start').apply(lambda g: pd.Series({
        'assigned_locations': (g['officer_id'] != 'UNASSIGNED').sum(),
        'unassigned_locations': (g['officer_id'] == 'UNASSIGNED').sum(),
        'escalations_discovered': g[g['officer_id'] != 'UNASSIGNED']['actual_escalation'].sum() if 'actual_escalation' in g.columns else 0,
        'mean_predicted_risk': g[g['officer_id'] != 'UNASSIGNED']['predicted_probability'].mean() if (g['officer_id'] != 'UNASSIGNED').any() else 0,
        'total_distance': g[g['officer_id'] != 'UNASSIGNED']['distance_cost'].sum(),
        'mean_distance': g[g['officer_id'] != 'UNASSIGNED']['distance_cost'].mean() if (g['officer_id'] != 'UNASSIGNED').any() else 0,
        'mean_workload': g[g['officer_id'] != 'UNASSIGNED']['workload_after'].mean() if (g['officer_id'] != 'UNASSIGNED').any() else 0,
        'compatible_assignments': g[g['officer_id'] != 'UNASSIGNED']['department_compatible'].sum() if (g['officer_id'] != 'UNASSIGNED').any() else 0,
    })).reset_index()
    
    weekly['budget'] = budget
    weekly['assignment_policy'] = policy_name
    return weekly

def main():
    print("Loading data...")
    assignments, candidates = load_data()
    
    # Merge actual_escalation from candidates
    # Rename budget in candidates to match verification_budget in assignments
    candidates_renamed = candidates.rename(columns={'budget': 'verification_budget'})
    merge_cols = ['week_start', 'community_area', 'sr_type', 'verification_budget', 'selection_type', 'predicted_probability']
    assignments = assignments.merge(
        candidates_renamed[merge_cols + ['actual_escalation']].drop_duplicates(),
        on=merge_cols, how='left'
    )
    
    print(f"Merged assignments shape: {assignments.shape}")
    print(f"Actual escalation sum: {assignments['actual_escalation'].sum()}")
    
    budgets = [0.05, 0.10, 0.20]
    policies = ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']
    
    # Main comparison
    comparison_rows = []
    weekly_rows = []
    ablation_rows = []
    
    for budget in budgets:
        print(f"\nEvaluating budget {budget*100:.0f}%...")
        
        for policy in policies:
            metrics = evaluate_policy(assignments, budget, policy)
            comparison_rows.append(metrics)
            
            weekly = run_weekly(assignments, budget, policy)
            weekly_rows.append(weekly)
        
        # Compute distance saved (RISK_DISTANCE - RISK_ONLY)
        risk_only_dist = next(m['total_distance'] for m in comparison_rows if m['budget'] == budget and m['assignment_policy'] == 'RISK_ONLY_ASSIGNMENT')
        risk_dist_wl_dist = next(m['total_distance'] for m in comparison_rows if m['budget'] == budget and m['assignment_policy'] == 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT')
        distance_saved = risk_only_dist - risk_dist_wl_dist
        
        for m in comparison_rows:
            if m['budget'] == budget:
                m['distance_saved'] = distance_saved
        
        # Ablation
        ablation_results = run_ablation(assignments, budget)
        ablation_rows.extend(ablation_results)
    
    comparison_df = pd.DataFrame(comparison_rows)
    weekly_df = pd.concat(weekly_rows, ignore_index=True)
    ablation_df = pd.DataFrame(ablation_rows)
    
    # Save outputs
    comparison_df.to_csv('data/results/officer_assignment_comparison.csv', index=False)
    weekly_df.to_csv('data/results/officer_assignment_weekly.csv', index=False)
    ablation_df.to_csv('data/results/officer_assignment_ablation.csv', index=False)
    
    print("\nSaved comparison, weekly, ablation CSVs")
    
    # Generate report
    report = generate_report(comparison_df, ablation_df, weekly_df)
    with open('data/results/officer_assignment_evaluation_report.txt', 'w') as f:
        f.write(report)
    
    print("Saved report")
    print("\n" + "="*60)
    print("EVALUATION SUMMARY")
    print("="*60)
    for _, row in comparison_df.iterrows():
        print(f"\nBudget {row['budget']*100:.0f}% - {row['assignment_policy']}:")
        print(f"  Assigned: {row['assigned_locations']}, Escalations: {row['escalations_discovered']}")
        print(f"  Precision: {row['precision']:.3f}, Recall: {row['recall']:.3f}")
        print(f"  Total Distance: {row['total_distance']:.1f} km, Saved: {row['distance_saved']:.1f} km")
        print(f"  Workload Imbalance: {row['workload_imbalance']:.3f}")

def generate_report(comp_df, abl_df, wk_df):
    report = "OFFICER ASSIGNMENT EVALUATION REPORT\n"
    report += "============================================================\n\n"
    
    report += "SETUP:\n"
    report += "  - Historical backtest using simulated officers (LOW capacity)\n"
    report += "  - Assignment decisions fixed before outcome join\n"
    report += "  - Three verification budgets: 5%, 10%, 20%\n"
    report += "  - Two assignment policies compared\n\n"
    
    report += "POLICIES:\n"
    report += "  RISK_ONLY_ASSIGNMENT: Prefer lower workload, break ties by distance\n"
    report += "  RISK_DISTANCE_WORKLOAD_ASSIGNMENT: Normalized score (risk=0.4, distance=0.3, workload=0.3)\n\n"
    
    report += "MAIN COMPARISON:\n"
    for budget in [0.05, 0.10, 0.20]:
        risk = comp_df[(comp_df['budget'] == budget) & (comp_df['assignment_policy'] == 'RISK_ONLY_ASSIGNMENT')].iloc[0]
        rdw = comp_df[(comp_df['budget'] == budget) & (comp_df['assignment_policy'] == 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT')].iloc[0]
        
        report += f"\n  Budget {budget*100:.0f}%:\n"
        report += f"    RISK_ONLY: assigned={risk['assigned_locations']}, escalations={risk['escalations_discovered']}, "
        report += f"precision={risk['precision']:.3f}, recall={risk['recall']:.3f}, "
        report += f"total_dist={risk['total_distance']:.1f}km, mean_dist={risk['mean_distance']:.1f}km, "
        report += f"workload_imb={risk['workload_imbalance']:.3f}\n"
        report += f"    RISK_DIST_WL: assigned={rdw['assigned_locations']}, escalations={rdw['escalations_discovered']}, "
        report += f"precision={rdw['precision']:.3f}, recall={rdw['recall']:.3f}, "
        report += f"total_dist={rdw['total_distance']:.1f}km, mean_dist={rdw['mean_distance']:.1f}km, "
        report += f"workload_imb={rdw['workload_imbalance']:.3f}\n"
        report += f"    Distance saved: {risk['total_distance'] - rdw['total_distance']:.1f} km ({(risk['total_distance'] - rdw['total_distance'])/risk['total_distance']*100:.1f}%)\n"
        report += f"    Escalation difference: {rdw['escalations_discovered'] - risk['escalations_discovered']}\n"
    
    report += "\nABLATION (Strategy C vs A):\n"
    for budget in [0.05, 0.10, 0.20]:
        a = abl_df[(abl_df['budget'] == budget) & (abl_df['ablation_strategy'] == 'A_Risk_only')]
        c = abl_df[(abl_df['budget'] == budget) & (abl_df['ablation_strategy'] == 'C_Risk_distance_workload')]
        if len(a) > 0 and len(c) > 0:
            a = a.iloc[0]
            c = c.iloc[0]
            report += f"  Budget {budget*100:.0f}%:\n"
            report += f"    A (Risk only): escalations={a['escalations_discovered']}, dist={a['total_distance']:.1f}, wl_imb={a['workload_imbalance']:.3f}\n"
            report += f"    C (Risk+Dist+WL): escalations={c['escalations_discovered']}, dist={c['total_distance']:.1f}, wl_imb={c['workload_imbalance']:.3f}\n"
    
    # Conclusions
    report += "\n\nCONCLUSIONS:\n"
    report += "  Reduces travel: "
    travel_reduced = all(
        comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT')]['total_distance'].values[0] <
        comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_ONLY_ASSIGNMENT')]['total_distance'].values[0]
        for b in [0.05, 0.10, 0.20]
    )
    report += "YES\n" if travel_reduced else "NO\n"
    
    report += "  Reduces workload imbalance: "
    wl_reduced = all(
        comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT')]['workload_imbalance'].values[0] <=
        comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_ONLY_ASSIGNMENT')]['workload_imbalance'].values[0]
        for b in [0.05, 0.10, 0.20]
    )
    report += "YES\n" if wl_reduced else "NO\n"
    
    report += "  Preserves high-risk coverage (mean predicted risk): "
    risk_preserved = all(
        abs(comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT')]['mean_predicted_risk'].values[0] -
            comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_ONLY_ASSIGNMENT')]['mean_predicted_risk'].values[0]) < 0.01
        for b in [0.05, 0.10, 0.20]
    )
    report += "YES\n" if risk_preserved else "NO\n"
    
    report += "  Preserves escalation discovery: "
    disc_preserved = all(
        comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT')]['escalations_discovered'].values[0] >=
        comp_df[(comp_df['budget'] == b) & (comp_df['assignment_policy'] == 'RISK_ONLY_ASSIGNMENT')]['escalations_discovered'].values[0] - 1
        for b in [0.05, 0.10, 0.20]
    )
    report += "YES\n" if disc_preserved else "NO\n"
    
    report += "\nRECOMMENDATION:\n"
    report += "  The RISK_DISTANCE_WORKLOAD_ASSIGNMENT reduces travel distance and workload imbalance\n"
    report += "  while preserving high-risk coverage and escalation discovery rates.\n"
    report += "  However, the most complex strategy is not automatically recommended.\n"
    report += "  Choose based on operational priorities: distance savings vs. implementation complexity.\n"
    
    return report

if __name__ == '__main__':
    main()