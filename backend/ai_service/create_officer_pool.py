import pandas as pd
import numpy as np

# Set seed for reproducibility
np.random.seed(42)

# Read candidate data to understand sr_types and community_areas
candidates = pd.read_csv('data/results/officer_assignment_candidates.csv')

# Get unique sr_types and community_areas
sr_types = sorted(candidates['sr_type'].unique())
community_areas = sorted(candidates['community_area'].unique())

print("Service Request Types:", sr_types)
print("Number of community areas:", len(community_areas))

# Map sr_types to simulated operational categories (SIMULATED DEPARTMENT COMPATIBILITY)
# These are synthetic categories for backtesting only - NOT real municipal departments
sr_type_to_category = {
    'Abandoned Vehicle Complaint': 'SIMULATED DEPARTMENT COMPATIBILITY: Vehicle & Traffic Operations',
    'Blue Recycling Cart': 'SIMULATED DEPARTMENT COMPATIBILITY: Sanitation & Recycling',
    'Building Violation': 'SIMULATED DEPARTMENT COMPATIBILITY: Building & Safety Inspections',
    'Garbage Cart Maintenance': 'SIMULATED DEPARTMENT COMPATIBILITY: Sanitation & Recycling',
    'Graffiti Removal Request': 'SIMULATED DEPARTMENT COMPATIBILITY: Community Maintenance',
    'Pothole in Street Complaint': 'SIMULATED DEPARTMENT COMPATIBILITY: Infrastructure Repair',
    'Rodent Baiting/Rat Complaint': 'SIMULATED DEPARTMENT COMPATIBILITY: Vector Control',
    'Street Light Out Complaint': 'SIMULATED DEPARTMENT COMPATIBILITY: Electrical & Lighting',
    'Traffic Signal Out Complaint': 'SIMULATED DEPARTMENT COMPATIBILITY: Vehicle & Traffic Operations',
    'Tree Debris Clean-Up Request': 'SIMULATED DEPARTMENT COMPATIBILITY: Community Maintenance',
}

categories = sorted(set(sr_type_to_category.values()))
print("\nSimulated Categories:", categories)

# Capacity scenarios
# LOW: ~1 officer per 2 community areas per category
# MEDIUM: ~1 officer per community area per category  
# HIGH: ~2 officers per community area per category
# These are synthetic assumptions for backtesting only

scenarios = {
    'LOW': {'officers_per_area_per_category': 0.5, 'max_assignments_base': 5, 'availability_prob': 0.8},
    'MEDIUM': {'officers_per_area_per_category': 1.0, 'max_assignments_base': 10, 'availability_prob': 0.85},
    'HIGH': {'officers_per_area_per_category': 2.0, 'max_assignments_base': 15, 'availability_prob': 0.9},
}

all_officers = []

for scenario_name, params in scenarios.items():
    officers_per_area_per_category = params['officers_per_area_per_category']
    max_assignments_base = params['max_assignments_base']
    availability_prob = params['availability_prob']
    
    for category in categories:
        # Determine how many officers for this category
        # Distribute across community areas
        n_areas = len(community_areas)
        n_officers_category = int(np.ceil(n_areas * officers_per_area_per_category))
        
        # Assign home areas to officers (some may cover multiple areas)
        for i in range(n_officers_category):
            officer_id = f"SIM_{scenario_name}_{category.replace(' ', '_').replace(':', '').replace(',', '').replace('/', '_')}_{i+1:03d}"
            home_area = np.random.choice(community_areas)
            max_assignments = max_assignments_base + np.random.randint(-2, 3)  # Some variation
            max_assignments = max(1, max_assignments)  # At least 1
            current_workload = np.random.randint(0, max_assignments + 1)
            available = np.random.random() < availability_prob
            
            all_officers.append({
                'officer_id': officer_id,
                'department': category,
                'home_area': home_area,
                'max_assignments': max_assignments,
                'current_workload': current_workload,
                'available': available,
                'capacity_scenario': scenario_name
            })

officers_df = pd.DataFrame(all_officers)
print(f"\nTotal simulated officers: {len(officers_df)}")
print(f"Per scenario:")
for scenario in scenarios:
    count = len(officers_df[officers_df['capacity_scenario'] == scenario])
    print(f"  {scenario}: {count}")

# Save to CSV
officers_df.to_csv('data/results/simulated_officers.csv', index=False)
print("\nSaved simulated_officers.csv")

# Create report
report_lines = []
report_lines.append("SIMULATED OFFICER POOL REPORT")
report_lines.append("=" * 60)
report_lines.append("")
report_lines.append("IMPORTANT LIMITATIONS:")
report_lines.append("  - This is a SYNTHETIC officer pool for HISTORICAL BACKTESTING ONLY")
report_lines.append("  - Officer identities, availability, and workload are SIMULATED")
report_lines.append("  - These do NOT represent real Chicago personnel or departments")
report_lines.append("  - Department compatibility is labeled as SIMULATED DEPARTMENT COMPATIBILITY")
report_lines.append("  - Do not use for operational decision-making")
report_lines.append("")
report_lines.append("RANDOM SEED: 42")
report_lines.append("")
report_lines.append("NUMBER OF SIMULATED OFFICERS:")
for scenario in scenarios:
    count = len(officers_df[officers_df['capacity_scenario'] == scenario])
    report_lines.append(f"  {scenario}: {count}")
report_lines.append(f"  TOTAL: {len(officers_df)}")
report_lines.append("")
report_lines.append("DEPARTMENTS / CATEGORIES (SIMULATED DEPARTMENT COMPATIBILITY):")
for cat in categories:
    count = len(officers_df[officers_df['department'] == cat])
    report_lines.append(f"  {cat}: {count} officers")
report_lines.append("")
report_lines.append("CAPACITY ASSUMPTIONS (synthetic, for backtesting):")
report_lines.append("  LOW: ~0.5 officers per community area per category")
report_lines.append("    - max_assignments base: 5 (±2)")
report_lines.append("    - availability probability: 80%")
report_lines.append("  MEDIUM: ~1.0 officers per community area per category")
report_lines.append("    - max_assignments base: 10 (±2)")
report_lines.append("    - availability probability: 85%")
report_lines.append("  HIGH: ~2.0 officers per community area per category")
report_lines.append("    - max_assignments base: 15 (±2)")
report_lines.append("    - availability probability: 90%")
report_lines.append("")
report_lines.append("AVAILABILITY ASSUMPTIONS:")
report_lines.append("  - Each officer has independent availability probability per scenario")
report_lines.append("  - Availability is static in this simulation (does not vary by week)")
report_lines.append("  - Current workload randomly assigned between 0 and max_assignments")
report_lines.append("")
report_lines.append("WORKLOAD ASSUMPTIONS:")
report_lines.append("  - max_assignments: maximum concurrent assignments an officer can handle")
report_lines.append("  - current_workload: current active assignments (randomly initialized)")
report_lines.append("  - Available capacity = max_assignments - current_workload (if available=True)")
report_lines.append("")
report_lines.append("HOME AREA ASSIGNMENT:")
report_lines.append(f"  - Officers randomly assigned to one of {len(community_areas)} community areas")
report_lines.append("  - Home area does not restrict assignment in this simulation")
report_lines.append("")
report_lines.append("LIMITATIONS:")
report_lines.append("  1. No real officer data used - all synthetic")
report_lines.append("  2. No union rules, shift schedules, or qualifications modeled")
report_lines.append("  3. Availability is static, not time-varying")
report_lines.append("  4. Home area proximity not enforced in assignment")
report_lines.append("  5. Department compatibility is simulated mapping only")
report_lines.append("  6. Three capacity scenarios provided - no recommendation on which to use")
report_lines.append("  7. Workload does not update dynamically in this module")

report_text = "\n".join(report_lines)
print("\n" + report_text)

with open('data/results/officer_pool_report.txt', 'w') as f:
    f.write(report_text)

print("\nReport saved to data/results/officer_pool_report.txt")