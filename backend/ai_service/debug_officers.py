import pandas as pd
officers = pd.read_csv('data/results/simulated_officers.csv')
low = officers[officers['capacity_scenario']=='LOW']
print('Total LOW:', len(low))
print('Available:', low['available'].sum())
print('Max assignments stats:', low['max_assignments'].describe())
print('Current workload stats:', low['current_workload'].describe())
avail = low[low['available']]
print('Available capacity:', (avail['max_assignments'] - avail['current_workload']).sum())
print()
print('By department:')
for dept in low['department'].unique():
    d = low[low['department']==dept]
    a = d[d['available']]
    cap = (a['max_assignments'] - a['current_workload']).sum()
    print(f'  {dept}: {len(d)} officers, {d["available"].sum()} available, capacity={cap}')