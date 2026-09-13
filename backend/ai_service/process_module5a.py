import pandas as pd
import numpy as np

# Read the verification decisions file
df = pd.read_csv('data/results/verification_decisions.csv')

# Filter for EXPLOIT_EXPLORE policy and budgets 5%, 10%, 20%
filtered = df[(df['policy'] == 'EXPLOIT_EXPLORE') & (df['budget'].isin([0.05, 0.1, 0.2]))]

# Add assignment_candidate
filtered['assignment_candidate'] = 1
filtered.to_csv('data/results/officer_assignment_candidates.csv', index=False)

# Generate report
report_lines = []
report_lines.append("OFFICER ASSIGNMENT INPUT REPORT")
report_lines.append("=" * 50)
report_lines.append("")
report_lines.append("SOURCE FILES:")
report_lines.append("  - data/results/verification_decisions.csv")
report_lines.append("  - data/results/verification_policy_comparison.csv")
report_lines.append("  - data/results/exploration_ratio_comparison.csv")
report_lines.append("")
report_lines.append("ROW COUNTS:")
report_lines.append(f"  Total rows in verification_decisions.csv: {len(df)}")
report_lines.append(f"  Rows after filtering (policy=EXPLOIT_EXPLORE, budgets=5%,10%,20%): {len(filtered)}")
report_lines.append("")
report_lines.append("BUDGETS:")
for budget in sorted(filtered['budget'].unique()):
    count = len(filtered[filtered['budget'] == budget])
    report_lines.append(f"  {budget*100:.0f}%: {count} locations")
report_lines.append("")
report_lines.append("NUMBER OF CANDIDATE LOCATIONS:")
report_lines.append(f"  Total: {len(filtered)}")
report_lines.append("")
report_lines.append("EXPLOITATION COUNT:")
exploit_count = len(filtered[filtered['selection_type'] == 'EXPLOIT'])
report_lines.append(f"  EXPLOIT: {exploit_count}")
report_lines.append("")
report_lines.append("EXPLORATION COUNT:")
explore_count = len(filtered[filtered['selection_type'] == 'EXPLORE'])
report_lines.append(f"  EXPLORE: {explore_count}")
report_lines.append("")
report_lines.append("MISSING VALUES:")
required_cols = ['week_start', 'community_area', 'sr_type', 'predicted_probability', 
                 'prediction_rank', 'selection_type', 'budget', 'policy']
for col in required_cols:
    if col in filtered.columns:
        missing = filtered[col].isnull().sum()
        report_lines.append(f"  {col}: {missing}")
    else:
        report_lines.append(f"  {col}: MISSING FROM DATA")
report_lines.append("")
report_lines.append("DUPLICATE COUNT:")
report_lines.append(f"  Exact duplicate rows: {filtered.duplicated().sum()}")
report_lines.append(f"  Duplicate location/week/sr_type combinations: {filtered.duplicated(subset=['week_start', 'community_area', 'sr_type']).sum()}")
report_lines.append("  (Note: duplicates across budgets are expected - each budget is a separate scenario)")
report_lines.append("")
report_lines.append("VALIDATION PROBLEMS:")
# Invalid probabilities
invalid_prob = ((filtered['predicted_probability'] < 0) | (filtered['predicted_probability'] > 1)).sum()
report_lines.append(f"  Invalid probabilities (<0 or >1): {invalid_prob}")
# Invalid budgets
invalid_budget = (~filtered['budget'].isin([0.05, 0.1, 0.2])).sum()
report_lines.append(f"  Invalid budgets (not 5%, 10%, 20%): {invalid_budget}")
# Check exploration ratio per budget
report_lines.append("")
report_lines.append("EXPLORATION RATIO VALIDATION (per budget):")
for budget in sorted(filtered['budget'].unique()):
    subset = filtered[filtered['budget'] == budget]
    exploit_n = len(subset[subset['selection_type'] == 'EXPLOIT'])
    explore_n = len(subset[subset['selection_type'] == 'EXPLORE'])
    total = len(subset)
    ratio = explore_n / total * 100 if total > 0 else 0
    report_lines.append(f"  Budget {budget*100:.0f}%: EXPLOIT={exploit_n}, EXPLORE={explore_n}, Total={total}, Exploration Ratio={ratio:.1f}%")

report_lines.append("")
report_lines.append("OFFICER ASSIGNMENT INPUT READY")

report_text = "\n".join(report_lines)
print(report_text)

with open('data/results/officer_assignment_input_report.txt', 'w') as f:
    f.write(report_text)

print("\nReport saved to data/results/officer_assignment_input_report.txt")