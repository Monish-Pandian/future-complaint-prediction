import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

robustness = pd.read_csv('data/results/officer_assignment_robustness_raw.csv')
comparison = pd.read_csv('data/results/officer_assignment_comparison.csv')
ablation = pd.read_csv('data/results/officer_assignment_ablation.csv')
weekly = pd.read_csv('data/results/officer_assignment_weekly.csv')

plot_dir = 'data/results/plots/officer_assignment/'

# 1. Distance comparison
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    data = []
    labels = []
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        vals = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]['total_distance'].values
        data.append(vals)
        labels.append('Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL')
    ax.boxplot(data, tick_labels=labels)
    ax.set_title(f'Budget {budget*100:.0f}%')
    if i == 0:
        ax.set_ylabel('Total Distance (km)')
plt.suptitle('Total Travel Distance by Policy and Budget (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}distance_comparison.png', dpi=150)
plt.close()

# 2. Workload imbalance
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    data = []
    labels = []
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        vals = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]['workload_imbalance'].values
        data.append(vals)
        labels.append('Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL')
    ax.boxplot(data, tick_labels=labels)
    ax.set_title(f'Budget {budget*100:.0f}%')
    if i == 0:
        ax.set_ylabel('Workload Imbalance (CV)')
plt.suptitle('Workload Imbalance by Policy and Budget (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}workload_imbalance.png', dpi=150)
plt.close()

# 3. Escalation discovery
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    data = []
    labels = []
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        vals = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]['escalations_discovered'].values
        data.append(vals)
        labels.append('Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL')
    ax.boxplot(data, tick_labels=labels)
    ax.set_title(f'Budget {budget*100:.0f}%')
    if i == 0:
        ax.set_ylabel('Escalations Discovered')
plt.suptitle('Escalation Discovery by Policy and Budget (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}escalation_discovery.png', dpi=150)
plt.close()

# 4. Precision vs Distance
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        sub = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]
        label = 'Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL'
        ax.scatter(sub['total_distance'], sub['precision'], label=label, alpha=0.7, s=50)
    ax.set_xlabel('Total Distance (km)')
    ax.set_ylabel('Precision')
    ax.set_title(f'Budget {budget*100:.0f}%')
    ax.legend()
plt.suptitle('Precision vs Total Distance (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}precision_vs_distance.png', dpi=150)
plt.close()

# 5. Recall vs Distance
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        sub = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]
        label = 'Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL'
        ax.scatter(sub['total_distance'], sub['recall'], label=label, alpha=0.7, s=50)
    ax.set_xlabel('Total Distance (km)')
    ax.set_ylabel('Recall')
    ax.set_title(f'Budget {budget*100:.0f}%')
    ax.legend()
plt.suptitle('Recall vs Total Distance (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}recall_vs_distance.png', dpi=150)
plt.close()

# 6. Ablation comparison (main experiment)
fig, axes = plt.subplots(3, 3, figsize=(15, 15))
metrics = [('total_distance', 'Total Distance (km)'), ('workload_imbalance', 'Workload Imbalance'), ('escalations_discovered', 'Escalations Discovered')]
for row, (metric, ylabel) in enumerate(metrics):
    for i, budget in enumerate([0.05, 0.10, 0.20]):
        ax = axes[row, i]
        data = []
        labels = []
        for strat in ['A_Risk_only', 'C_Risk_distance_workload']:
            vals = ablation[(ablation['budget'] == budget) & (ablation['ablation_strategy'] == strat)][metric].values
            data.append(vals[0])
            labels.append('Risk Only' if 'A_' in strat else 'Risk+Dist+WL')
        ax.bar(labels, data)
        ax.set_title(f'Budget {budget*100:.0f}%')
        ax.set_ylabel(ylabel)
plt.suptitle('Ablation: Main Experiment (Single Seed)')
plt.tight_layout()
plt.savefig(f'{plot_dir}ablation_comparison.png', dpi=150)
plt.close()

# 7. Mean distance comparison
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    data = []
    labels = []
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        vals = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]['mean_distance'].values
        data.append(vals)
        labels.append('Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL')
    ax.boxplot(data, tick_labels=labels)
    ax.set_title(f'Budget {budget*100:.0f}%')
    if i == 0:
        ax.set_ylabel('Mean Distance (km)')
plt.suptitle('Mean Travel Distance by Policy and Budget (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}mean_distance_comparison.png', dpi=150)
plt.close()

# 8. Discovery rate
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for i, budget in enumerate([0.05, 0.10, 0.20]):
    ax = axes[i]
    data = []
    labels = []
    for policy in ['RISK_ONLY_ASSIGNMENT', 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT']:
        vals = robustness[(robustness['budget'] == budget) & (robustness['assignment_policy'] == policy)]['discovery_rate'].values
        data.append(vals)
        labels.append('Risk Only' if 'RISK_ONLY' in policy else 'Risk+Dist+WL')
    ax.boxplot(data, tick_labels=labels)
    ax.set_title(f'Budget {budget*100:.0f}%')
    if i == 0:
        ax.set_ylabel('Discovery Rate')
plt.suptitle('Discovery Rate by Policy and Budget (4 seeds)')
plt.tight_layout()
plt.savefig(f'{plot_dir}discovery_rate.png', dpi=150)
plt.close()

print("All plots saved to", plot_dir)